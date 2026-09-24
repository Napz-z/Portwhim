use crate::scanner::{Listener, Scanner};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeSet, HashMap},
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
#[derive(Clone, Deserialize, PartialEq)]
pub struct Favorite {
    pub port: u16,
    pub protocol: String,
    pub label: String,
    #[serde(default)]
    pub watch: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub port: u16,
    pub protocol: String,
    pub message: String,
    pub at: String,
}
#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub alerts: Vec<Alert>,
    pub error: Option<String>,
    pub notification_error: Option<String>,
    pub scanned_at: Option<String>,
}
#[derive(Default)]
pub struct Watcher {
    favorites: Vec<Favorite>,
    states: HashMap<String, Track>,
    pub status: Status,
    generation: u64,
}
#[derive(Default)]
struct Track {
    stable: Option<String>,
    pending: Option<(String, u64)>,
    last_sent: Option<u64>,
}
impl Track {
    fn observe(&mut self, signature: String, now: u64) -> bool {
        let Some(stable) = &self.stable else {
            self.stable = Some(signature);
            return false;
        };
        if *stable == signature {
            self.pending = None;
            return false;
        }
        if self
            .pending
            .as_ref()
            .is_none_or(|(value, _)| *value != signature)
        {
            self.pending = Some((signature.clone(), now));
            return false;
        }
        if now.saturating_sub(self.pending.as_ref().unwrap().1) < 10
            || self
                .last_sent
                .is_some_and(|last| now.saturating_sub(last) < 60)
        {
            return false;
        }
        self.stable = Some(signature);
        self.pending = None;
        self.last_sent = Some(now);
        true
    }
}
fn key(f: &Favorite) -> String {
    format!("{}:{}", f.protocol, f.port)
}
fn owner_identity(project: Option<&str>, name: &str, pid: u32, started: &Option<String>) -> String {
    match project {
        Some(directory) => format!("project:{directory}:{name}"),
        None => format!("process:{name}:{pid}:{started:?}"),
    }
}
fn signature(rows: &[Listener], f: &Favorite) -> String {
    rows.iter()
        .filter(|l| l.port == f.port && l.protocol == f.protocol)
        .map(|l| {
            owner_identity(
                l.provenance.project.as_ref().map(|p| p.directory.as_str()),
                &l.name,
                l.pid,
                &l.started,
            )
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>()
        .join("\n")
}
impl Watcher {
    pub fn configure(&mut self, favorites: Vec<Favorite>) -> Result<(), String> {
        if favorites.len() > 32
            || favorites.iter().any(|f| {
                f.port == 0
                    || !["TCP", "UDP"].contains(&f.protocol.as_str())
                    || f.label.chars().count() > 60
            })
        {
            return Err("Invalid watch configuration.".into());
        }
        let active: Vec<_> = favorites.into_iter().filter(|f| f.watch).collect();
        if self.favorites != active {
            self.generation += 1;
        }
        self.states
            .retain(|k, _| active.iter().any(|f| key(f) == *k));
        self.favorites = active;
        if self.favorites.is_empty() {
            self.status.error = None;
            self.status.scanned_at = None;
        }
        Ok(())
    }
}
pub fn start(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let mut scanner = Scanner::default();
        let clock = Instant::now();
        loop {
            std::thread::sleep(Duration::from_secs(5));
            let state = app.state::<Mutex<Watcher>>();
            let Ok(watcher) = state.lock() else { continue };
            if watcher.favorites.is_empty() {
                continue;
            }
            let generation = watcher.generation;
            drop(watcher);
            // A separate scanner leaves the main window's selected socket IDs intact.
            let result = scanner.scan();
            let Ok(mut watcher) = state.lock() else {
                continue;
            };
            if watcher.generation != generation {
                continue;
            }
            match result {
                Err(_) => {
                    watcher.status.error = Some("Port watch scan failed. No missing-service alerts are generated from failed scans.".into());
                    for track in watcher.states.values_mut() {
                        track.pending = None;
                    }
                }
                Ok(snapshot) => {
                    watcher.status.error = None;
                    watcher.status.scanned_at = Some(snapshot.scanned_at.clone());
                    for favorite in watcher.favorites.clone() {
                        let value = signature(&snapshot.listeners, &favorite);
                        if watcher
                            .states
                            .entry(key(&favorite))
                            .or_default()
                            .observe(value.clone(), clock.elapsed().as_secs())
                        {
                            let name = if favorite.label.is_empty() {
                                format!("{} :{}", favorite.protocol, favorite.port)
                            } else {
                                format!(
                                    "{} ({} :{})",
                                    favorite.label, favorite.protocol, favorite.port
                                )
                            };
                            let message = if value.is_empty() {
                                format!("{name}: no listener observed for at least 10 seconds.")
                            } else {
                                format!("{name}: listener appeared or its observed owner changed. Open Portwhim to inspect.")
                            };
                            let alert = Alert {
                                port: favorite.port,
                                protocol: favorite.protocol,
                                message: message.clone(),
                                at: snapshot.scanned_at.clone(),
                            };
                            if app.notification().permission_state().ok()
                                != Some(tauri_plugin_notification::PermissionState::Granted)
                                || app
                                    .notification()
                                    .builder()
                                    .title("Portwhim · Port watch")
                                    .body(message)
                                    .show()
                                    .is_err()
                            {
                                watcher.status.notification_error = Some("A desktop notification could not be delivered. Check system notification settings; alerts remain here.".into());
                            } else {
                                watcher.status.notification_error = None;
                            }
                            watcher.status.alerts.insert(0, alert);
                            watcher.status.alerts.truncate(20);
                        }
                    }
                }
            }
            let _ = app.emit("watch-status", &watcher.status);
        }
    });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn same_project_hot_reload_is_quiet_but_unknown_identity_changes_are_distinct() {
        assert_eq!(
            owner_identity(Some("/shop"), "node", 10, &Some("a".into())),
            owner_identity(Some("/shop"), "node", 20, &Some("b".into()))
        );
        assert_ne!(
            owner_identity(Some("/shop"), "node", 10, &None),
            owner_identity(Some("/other"), "node", 10, &None)
        );
        assert_ne!(
            owner_identity(None, "node", 10, &Some("a".into())),
            owner_identity(None, "node", 10, &Some("b".into()))
        );
    }
    #[test]
    fn debounce_recovery_and_cooldown_preserve_pending_alerts() {
        let mut track = Track::default();
        assert!(!track.observe("app".into(), 0));
        assert!(!track.observe("".into(), 5));
        assert!(!track.observe("app".into(), 10)); // brief hot reload
        assert!(!track.observe("".into(), 15));
        assert!(!track.observe("".into(), 20));
        assert!(track.observe("".into(), 25));
        assert!(!track.observe("other".into(), 30));
        assert!(!track.observe("other".into(), 50));
        assert!(track.observe("other".into(), 85));
        assert!(!track.observe("other".into(), 150));
    }
    #[test]
    fn enabling_an_empty_port_is_a_silent_baseline_and_disabling_resets_it() {
        let mut track = Track::default();
        assert!(!track.observe("".into(), 0));
        let mut watcher = Watcher::default();
        watcher.states.insert("TCP:3000".into(), track);
        watcher.configure(vec![]).unwrap();
        assert!(watcher.states.is_empty());
        assert!(watcher
            .configure(vec![Favorite {
                port: 0,
                protocol: "TCP".into(),
                label: "".into(),
                watch: true
            }])
            .is_err());
    }
}
