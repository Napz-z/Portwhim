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
    pub scope: String,
    pub can_stop: bool,
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
    if pid.as_u32() <= 4 || pid == own || sys.process(own).and_then(|p| p.parent()) == Some(pid) {
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
                let origin = origins
                    .entry(pid)
                    .or_insert_with(|| provenance(id, &self.sys, &mut cache))
                    .clone();
                listeners.push(Listener {
                    id: uuid::Uuid::new_v4().to_string(),
                    pid,
                    name,
                    port,
                    protocol: protocol.into(),
                    address: address.clone(),
                    started: if birth > 0 {
                        chrono::DateTime::from_timestamp(birth as i64, 0).map(|d| d.to_rfc3339())
                    } else {
                        None
                    },
                    cpu: if self.sampled {
                        p.map(|p| {
                            p.cpu_usage()
                                / std::thread::available_parallelism()
                                    .map(|n| n.get())
                                    .unwrap_or(1) as f32
                        })
                    } else {
                        None
                    },
                    memory: p.map(|p| p.memory()),
                    service,
                    confidence,
                    category,
                    scope: scope(&address),
                    can_stop: birth > 0 && !protected(id, &self.sys),
                    provenance: origin,
                    birth,
                });
            }
        }
        self.sampled = true;
        listeners.sort_by_key(|l| (l.port, l.pid));
        let mut warnings = Vec::new();
        if listeners.iter().any(|l| l.birth == 0) {
            warnings.push("Some process details are unavailable. Protected or unidentified processes cannot be stopped.".into())
        }
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
    if !row.can_stop || row.pid <= 4 || row.birth == 0 || row.pid == std::process::id() {
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
