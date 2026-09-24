use netstat2::*;
use serde::Serialize;
use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};
use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub directory: String,
    pub marker: String,
    pub evidence: String,
    pub inferred: bool,
    pub git: Option<crate::project::GitInfo>,
}
#[derive(Clone, Serialize, Debug)]
pub struct Parent {
    pub pid: u32,
    pub name: String,
}
#[derive(Clone, Serialize, Debug)]
pub struct Provenance {
    pub project: Option<Project>,
    pub parent: Option<Parent>,
    pub ancestors: Vec<Parent>,
    pub source: Option<String>,
    pub manager: Option<String>,
}
#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Listener {
    pub id: String,
    pub pid: u32,
    pub name: String,
    pub port: u16,
    pub protocol: String,
    pub address: String,
    pub started: Option<String>,
    pub cpu: Option<f32>,
    pub memory: Option<u64>,
    pub service: String,
    pub confidence: String,
    pub category: String,
    pub system_managed: bool,
    pub scope: String,
    pub can_stop: bool,
    pub stop_reason: Option<String>,
    pub provenance: Provenance,
    #[serde(skip)]
    pub birth: u64,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub listeners: Vec<Listener>,
    pub scanned_at: String,
    pub hostname: String,
    pub platform: String,
    pub warnings: Vec<String>,
}

pub fn scope(address: &str) -> String {
    if address == "::1" || address.starts_with("127.") {
        "loopback"
    } else if ["0.0.0.0", "::", "*", ""].contains(&address) {
        "all interfaces"
    } else {
        "network"
    }
    .into()
}
fn stop_reason(pid: u32, birth: u64, present: bool, is_protected: bool) -> Option<String> {
    if pid > 0 && pid <= 4 {
        Some("System process: stopping is disabled to protect system stability.".into())
    } else if pid == 0 || !present {
        Some("Process owner unavailable. The process may have exited or its details could not be read. Refresh and try again.".into())
    } else if is_protected {
        Some("Application protection: Portwhim, its child processes, and its parent process cannot be stopped here.".into())
    } else if birth == 0 {
        Some("Start time unavailable, usually due to access restrictions. Stopping is disabled because this process cannot be verified. Other processes are unaffected.".into())
    } else {
        None
    }
}
fn resource_memory(_birth: u64, memory: Option<u64>) -> Option<u64> {
    // sysinfo uses zero when Windows cannot query the process; this is not a measurement.
    memory.filter(|value| *value != 0)
}
fn scan_warnings(listeners: &[Listener]) -> Vec<String> {
    if listeners.iter().any(|l| l.pid > 4)
        && listeners.iter().filter(|l| l.pid > 4).all(|l| l.birth == 0)
    {
        vec!["Ports were scanned, but no non-system process start times could be verified. Access restrictions may limit process details. Stopping is disabled.".into()]
    } else {
        Vec::new()
    }
}
pub fn detect(name: &str, command: &str, port: u16) -> (String, String, String) {
    let text = format!("{name} {command}").to_lowercase();
    static RULES: std::sync::OnceLock<Vec<(regex::Regex, &'static str, &'static str)>> =
        std::sync::OnceLock::new();
    let rules = RULES.get_or_init(|| {
        [
            (r"\bnext(?:\.js|-server)?\b", "Next.js", "app"),
            (r"\bvite\b", "Vite", "app"),
            (r"\bartisan\b|\blaravel\b", "Laravel", "app"),
            (r"\bpostgres(?:ql)?\b", "PostgreSQL", "database"),
            (r"\bredis(?:-server)?\b", "Redis", "database"),
            (r"\bdocker\b|com\.docker", "Docker", "container"),
            (r"\bnode(?:\.exe)?\b", "Node.js", "app"),
            (r"\bmysql(?:d)?\b", "MySQL", "database"),
            (r"\bpython(?:3)?\b", "Python", "app"),
        ]
        .into_iter()
        .map(|(pattern, service, category)| {
            (regex::Regex::new(pattern).unwrap(), service, category)
        })
        .collect()
    });
    for (pattern, service, category) in rules {
        if pattern.is_match(&text) {
            return ((*service).into(), (*category).into(), "process".into());
        }
    }
    let hint = match port {
        5432 => Some("PostgreSQL"),
        6379 => Some("Redis"),
        3306 => Some("MySQL"),
        _ => None,
    };
    if let Some(h) = hint {
        (h.into(), "database".into(), "port hint".into())
    } else {
        (name.into(), "system".into(), "unknown".into())
    }
}
pub fn project_at(candidate: &Path) -> Option<Project> {
    if !candidate.is_absolute() || candidate.to_string_lossy().starts_with("\\\\") {
        return None;
    }
    let mut dir = if candidate.is_dir() {
        candidate.to_path_buf()
    } else {
        if !candidate.is_file() {
            return None;
        }
        candidate.parent()?.to_path_buf()
    };
    let mut prefix = PathBuf::new();
    let original_dir = dir.clone();
    for component in original_dir.components() {
        if component.as_os_str() == "node_modules" {
            dir = prefix;
            break;
        }
        prefix.push(component)
    }
    for _ in 0..10 {
        for marker in [
            "package.json",
            "pyproject.toml",
            "Cargo.toml",
            "go.mod",
            "composer.json",
            ".git",
        ] {
            let file = dir.join(marker);
            if !file.exists() {
                continue;
            }
            let mut name = dir.file_name()?.to_string_lossy().to_string();
            if marker == "package.json" && file.metadata().ok()?.len() < 262144 {
                if let Ok(text) = std::fs::read_to_string(&file) {
                    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(n) = v["name"].as_str().filter(|n| n.len() < 160) {
                            name = n.into()
                        }
                    }
                }
            }
            return Some(Project {
                name,
                directory: dir.to_string_lossy().into(),
                marker: marker.into(),
                evidence: String::new(),
                inferred: true,
                git: crate::project::git_info(&dir),
            });
        }
        if !dir.pop() {
            break;
        }
    }
    None
}
pub fn ancestry(pid: Pid, sys: &System) -> Vec<Parent> {
    let mut result = Vec::new();
    let mut seen = HashSet::from([pid]);
    let mut current = sys.process(pid);
    while let Some(p) = current {
        if result.len() >= 12 {
            break;
        }
        let Some(id) = p.parent() else { break };
        if !seen.insert(id) {
            break;
        }
        let Some(parent) = sys.process(id) else { break };
        if parent.start_time() > p.start_time() {
            break;
        }
        result.push(Parent {
            pid: id.as_u32(),
            name: parent.name().to_string_lossy().into(),
        });
        current = Some(parent);
    }
    result
}
fn protected(pid: Pid, sys: &System) -> bool {
    let own = Pid::from_u32(std::process::id());
    // Missing paths must not make a potentially critical Windows process stoppable.
    // This precaution does not grant a System managed badge without path evidence.
    if cfg!(windows)
        && sys
            .process(pid)
            .is_some_and(|p| critical_windows_name(&p.name().to_string_lossy()))
    {
        return true;
    }
    if pid.as_u32() <= 4
        || system_managed(pid, sys)
        || pid == own
        || sys.process(own).and_then(|p| p.parent()) == Some(pid)
    {
        return true;
    }
    // UI ancestry is bounded; protection must cover the entire descendant tree.
    let mut seen = HashSet::new();
    let mut current = Some(pid);
    while let Some(id) = current {
        if !seen.insert(id) {
            break;
        }
        if id == own {
            return true;
        }
        current = sys.process(id).and_then(|p| p.parent());
    }
    false
}
fn critical_windows_name(name: &str) -> bool {
    [
        "system",
        "smss.exe",
        "csrss.exe",
        "wininit.exe",
        "services.exe",
        "lsass.exe",
        "winlogon.exe",
        "svchost.exe",
        "lsaiso.exe",
        "fontdrvhost.exe",
        "dwm.exe",
    ]
    .contains(&name.to_ascii_lowercase().as_str())
}
// Name alone, missing metadata, and the legacy "system" category are not evidence.
fn windows_system_identity(pid: u32, name: &str, exe: Option<&str>, root: &str) -> bool {
    if pid == 4 {
        return true;
    }
    let name = name.to_ascii_lowercase();
    let known = [
        "smss.exe",
        "csrss.exe",
        "wininit.exe",
        "services.exe",
        "lsass.exe",
        "winlogon.exe",
        "svchost.exe",
        "lsaiso.exe",
        "fontdrvhost.exe",
        "dwm.exe",
    ];
    if !known.contains(&name.as_str()) {
        return false;
    }
    let Some(exe) = exe else {
        return false;
    };
    let root = root
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase();
    if root.is_empty() {
        return false;
    }
    let exe = exe.replace('/', "\\").to_ascii_lowercase();
    exe == format!("{root}\\system32\\{name}") || exe == format!("{root}\\syswow64\\{name}")
}
fn system_managed(pid: Pid, sys: &System) -> bool {
    if !cfg!(windows) {
        return false;
    }
    let root = std::env::var("SystemRoot").unwrap_or_default();
    let p = sys.process(pid);
    windows_system_identity(
        pid.as_u32(),
        &p.map(|p| p.name().to_string_lossy().into_owned())
            .unwrap_or_default(),
        p.and_then(|p| p.exe()).and_then(|p| p.to_str()),
        &root,
    )
}
fn restart_manager(signature: &str) -> Option<String> {
    static RULE: std::sync::OnceLock<regex::Regex> = std::sync::OnceLock::new();
    let rule = RULE.get_or_init(|| regex::Regex::new(r"(?i)\b(nodemon|pm2|supervisord|systemd|launchd|docker|com\.docker\.backend)\b|\bnode(?:\.exe)?\s+--watch\b").unwrap());
    rule.find(signature).map(|m| m.as_str().to_lowercase())
}
fn provenance(pid: Pid, sys: &System, cache: &mut HashMap<PathBuf, Option<Project>>) -> Provenance {
    let chain = ancestry(pid, sys);
    let source = chain
        .iter()
        .find_map(|p| {
            let n = p.name.to_lowercase();
            let n = n.trim_end_matches(".exe");
            let kind = if ["code", "code-insiders", "cursor", "windsurf"].contains(&n) {
                "editor ancestor"
            } else if ["services", "systemd", "launchd", "pm2", "supervisord"].contains(&n) {
                "service manager ancestor"
            } else if [
                "powershell",
                "pwsh",
                "cmd",
                "bash",
                "zsh",
                "fish",
                "sh",
                "windowsterminal",
            ]
            .contains(&n)
            {
                "shell ancestor"
            } else {
                return None;
            };
            Some(format!("{} ({kind})", p.name))
        })
        .or_else(|| {
            chain
                .first()
                .map(|p| format!("{} (parent process)", p.name))
        });
    let mut result = Provenance {
        project: None,
        parent: chain.first().cloned(),
        ancestors: chain.clone(),
        source,
        manager: std::iter::once(pid)
            .chain(chain.iter().map(|p| Pid::from_u32(p.pid)))
            .find_map(|id| {
                let p = sys.process(id)?;
                let signature = format!(
                    "{} {}",
                    p.name().to_string_lossy(),
                    p.cmd()
                        .iter()
                        .take(16)
                        .map(|v| v.to_string_lossy())
                        .collect::<Vec<_>>()
                        .join(" ")
                );
                restart_manager(&signature)
            }),
    };
    for (index, id) in std::iter::once(pid)
        .chain(chain.first().map(|p| Pid::from_u32(p.pid)))
        .enumerate()
    {
        let Some(p) = sys.process(id) else { continue };
        let candidates = p
            .cwd()
            .map(|p| (p.to_path_buf(), "working directory"))
            .into_iter()
            .chain(
                p.cmd()
                    .iter()
                    .take(16)
                    .map(|a| (PathBuf::from(a), "absolute command path")),
            );
        for (candidate, kind) in candidates {
            let found = cache
                .entry(candidate.clone())
                .or_insert_with(|| project_at(&candidate));
            if let Some(mut project) = found.clone() {
                project.evidence = format!(
                    "{} {kind} + {}",
                    if index == 0 { "Process" } else { "Parent" },
                    project.marker
                );
                result.project = Some(project);
                return result;
            }
        }
    }
    result
}
#[derive(Default)]
pub struct Scanner {
    sys: System,
    sampled: bool,
}
impl Scanner {
    pub fn scan(&mut self) -> Result<Snapshot, String> {
        let sockets = get_sockets_info(
            AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6,
            ProtocolFlags::TCP | ProtocolFlags::UDP,
        )
        .map_err(|e| e.to_string())?;
        self.sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing()
                .with_memory()
                .with_cpu()
                .with_exe(UpdateKind::OnlyIfNotSet)
                .with_cmd(UpdateKind::Always)
                .with_cwd(UpdateKind::Always),
        );
        let mut listeners = Vec::new();
        let mut seen = HashSet::new();
        let mut cache = HashMap::new();
        let mut origins = HashMap::new();
        for socket in sockets {
            let (protocol, address, port) = match socket.protocol_socket_info {
                ProtocolSocketInfo::Tcp(t) if t.state == TcpState::Listen => {
                    ("TCP", t.local_addr.to_string(), t.local_port)
                }
                ProtocolSocketInfo::Udp(u) => ("UDP", u.local_addr.to_string(), u.local_port),
                _ => continue,
            };
            if port == 0 {
                continue;
            }
            let pids = if socket.associated_pids.is_empty() {
                vec![0]
            } else {
                socket.associated_pids
            };
            for pid in pids {
                if !seen.insert((pid, protocol, address.clone(), port)) {
                    continue;
                }
                let id = Pid::from_u32(pid);
                let p = self.sys.process(id);
                let name = p
                    .map(|p| p.name().to_string_lossy().to_string())
                    .unwrap_or("Unknown".into());
                let birth = p.map(|p| p.start_time()).unwrap_or(0);
                let command = p
                    .map(|p| {
                        p.cmd()
                            .iter()
                            .map(|x| x.to_string_lossy())
                            .collect::<Vec<_>>()
                            .join(" ")
                    })
                    .unwrap_or_default();
                let (service, category, confidence) = detect(&name, &command, port);
                let system_managed = system_managed(id, &self.sys);
                let origin = origins
                    .entry(pid)
                    .or_insert_with(|| provenance(id, &self.sys, &mut cache))
                    .clone();
                listeners.push(Listener {
                    id: uuid::Uuid::new_v4().to_string(),
                    pid,
                    name: name.clone(),
                    port,
                    protocol: protocol.into(),
                    address: address.clone(),
                    started: if birth > 0 {
                        chrono::DateTime::from_timestamp(birth as i64, 0).map(|d| d.to_rfc3339())
                    } else {
                        None
                    },
                    cpu: if self.sampled && birth > 0 {
                        p.map(|p| {
                            p.cpu_usage()
                                / std::thread::available_parallelism()
                                    .map(|n| n.get())
                                    .unwrap_or(1) as f32
                        })
                    } else {
                        None
                    },
                    memory: resource_memory(birth, p.map(|p| p.memory())),
                    service,
                    confidence,
                    category,
                    system_managed,
                    scope: scope(&address),
                    can_stop: birth > 0 && !protected(id, &self.sys),
                    stop_reason: if system_managed {
                        Some("System-managed process. Stopping is disabled to protect Windows services.".into())
                    } else if cfg!(windows) && critical_windows_name(&name) {
                        Some("Potential Windows system process. Stopping is disabled for safety.".into())
                    } else { stop_reason(pid, birth, p.is_some(), protected(id, &self.sys)) },
                    provenance: origin,
                    birth,
                });
            }
        }
        self.sampled = true;
        listeners.sort_by_key(|l| (l.port, l.pid));
        let warnings = scan_warnings(&listeners);
        Ok(Snapshot {
            listeners,
            scanned_at: chrono::Utc::now().to_rfc3339(),
            hostname: System::host_name().unwrap_or("Your computer".into()),
            platform: match std::env::consts::OS {
                "windows" => "win32",
                "macos" => "darwin",
                other => other,
            }
            .into(),
            warnings,
        })
    }
}
pub fn verify(row: &Listener) -> Result<System, String> {
    if !row.can_stop
        || row.system_managed
        || row.pid <= 4
        || row.birth == 0
        || row.pid == std::process::id()
    {
        return Err("Protected process or identity unavailable.".into());
    }
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let id = Pid::from_u32(row.pid);
    let p = sys
        .process(id)
        .ok_or("Process exited. Refresh before trying again.")?;
    if p.start_time() != row.birth || p.name().to_string_lossy() != row.name {
        return Err("Process identity changed. Refresh before trying again.".into());
    }
    if protected(id, &sys) {
        return Err("Protected process.".into());
    }
    Ok(sys)
}
pub fn terminate(row: &Listener) -> Result<(), String> {
    let sys = verify(row)?;
    let p = sys
        .process(Pid::from_u32(row.pid))
        .ok_or("Process exited")?;
    #[cfg(windows)]
    let stopped = p.kill();
    #[cfg(not(windows))]
    let stopped = p.kill_with(sysinfo::Signal::Term).unwrap_or(false);
    if stopped {
        Ok(())
    } else {
        Err("The OS refused to stop this process.".into())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn system_classification_requires_evidence() {
        let root = r"C:\Windows";
        assert!(windows_system_identity(4, "", None, root));
        for name in ["svchost.exe", "lsass.exe", "services.exe", "csrss.exe"] {
            assert!(windows_system_identity(
                800,
                name,
                Some(&format!(r"C:\Windows\System32\{name}")),
                root
            ));
            assert!(!windows_system_identity(800, name, None, root));
            assert!(!windows_system_identity(
                800,
                name,
                Some(&format!(r"C:\Users\user\{name}")),
                root
            ));
            assert!(critical_windows_name(name));
        }
        assert!(windows_system_identity(
            800,
            "SVCHOST.EXE",
            Some("c:/windows/SYSTEM32/SVCHOST.EXE"),
            root
        ));
        assert!(!windows_system_identity(800, "System", None, root));
        assert!(!windows_system_identity(
            800,
            "node.exe",
            Some(r"C:\Windows\System32\node.exe"),
            root
        ));
        assert!(!windows_system_identity(
            800,
            "svchost.exe",
            Some(r"C:\Windows\System32\..\svchost.exe"),
            root
        ));
        assert!(!windows_system_identity(0, "Unknown", None, root));
    }
    #[test]
    fn restricted_metadata_is_not_zero_usage() {
        assert_eq!(resource_memory(0, Some(0)), None);
        assert_eq!(resource_memory(100, Some(0)), None);
        assert_eq!(resource_memory(0, Some(1024)), Some(1024));
        assert_eq!(resource_memory(100, None), None);
        assert!(stop_reason(4, 0, true, true)
            .unwrap()
            .contains("System process"));
        assert!(stop_reason(500, 0, true, false)
            .unwrap()
            .contains("Start time"));
        assert!(stop_reason(500, 100, true, true)
            .unwrap()
            .contains("Application protection"));
        assert!(stop_reason(500, 0, false, false)
            .unwrap()
            .contains("Process owner unavailable"));
        assert!(stop_reason(500, 100, true, false).is_none());
    }
    #[test]
    fn one_restricted_process_does_not_warn_for_the_entire_scan() {
        let make = |pid, birth| Listener {
            id: String::new(),
            pid,
            birth,
            name: String::new(),
            port: 80,
            protocol: "TCP".into(),
            address: "127.0.0.1".into(),
            started: None,
            cpu: None,
            memory: None,
            service: String::new(),
            confidence: String::new(),
            category: String::new(),
            system_managed: false,
            scope: String::new(),
            can_stop: false,
            stop_reason: None,
            provenance: Provenance {
                project: None,
                parent: None,
                ancestors: vec![],
                source: None,
                manager: None,
            },
        };
        assert!(scan_warnings(&[make(4, 0), make(100, 123), make(200, 0)]).is_empty());
        assert!(scan_warnings(&[make(4, 0)]).is_empty());
        assert!(scan_warnings(&[]).is_empty());
        assert_eq!(scan_warnings(&[make(100, 0), make(200, 0)]).len(), 1);
        // Neither UI classification nor forged canStop can bypass backend checks.
        for pid in [4, std::process::id()] {
            let mut row = make(pid, 123);
            row.can_stop = true;
            row.system_managed = false;
            assert!(verify(&row).is_err());
        }
        let mut row = make(100, 123);
        row.can_stop = true;
        row.system_managed = true;
        assert!(verify(&row).is_err());
        row.system_managed = false;
        row.birth = 0;
        assert!(verify(&row).is_err());
        // Re-read real process protection rather than trusting serialized flags.
        let mut sys = System::new_all();
        sys.refresh_all();
        let own = Pid::from_u32(std::process::id());
        if let Some(parent) = sys
            .process(own)
            .and_then(|p| p.parent())
            .and_then(|id| sys.process(id))
        {
            let mut row = make(parent.pid().as_u32(), parent.start_time());
            row.name = parent.name().to_string_lossy().into_owned();
            row.can_stop = true;
            assert!(verify(&row).is_err());
        }
    }
    #[test]
    fn service_signatures() {
        assert_eq!(
            detect(
                "node.exe",
                "node C:/app/node_modules/vite/bin/vite.js",
                3000
            )
            .0,
            "Vite"
        );
        assert_eq!(detect("mystery", "", 3000).2, "unknown");
        assert_eq!(detect("mystery", "", 5432).2, "port hint");
    }
    #[test]
    fn binding_scope() {
        assert_eq!(scope("127.0.0.2"), "loopback");
        assert_eq!(scope("::1"), "loopback");
        assert_eq!(scope("::"), "all interfaces");
        assert_eq!(scope("192.168.1.2"), "network");
    }
    #[test]
    fn project_marker() {
        let root = std::env::temp_dir().join(format!("portwhim-test-{}", uuid::Uuid::new_v4()));
        let bin = root.join("my app/node_modules/vite/bin");
        std::fs::create_dir_all(&bin).unwrap();
        std::fs::write(root.join("my app/package.json"), r#"{"name":"fixture"}"#).unwrap();
        std::fs::write(bin.join("vite.js"), "").unwrap();
        assert_eq!(project_at(&bin.join("vite.js")).unwrap().name, "fixture");
        assert!(project_at(Path::new("./relative.js")).is_none());
        std::fs::remove_dir_all(root).unwrap();
    }
}
