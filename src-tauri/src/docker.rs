use serde::Serialize;
use std::{
    io::Read,
    process::{Command, Stdio},
    time::{Duration, Instant},
};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Mapping {
    name: String,
    project: Option<String>,
    address: String,
    host_port: u16,
    container_port: u16,
    protocol: String,
}
pub fn parse(text: &str) -> Result<Vec<Mapping>, String> {
    let re = regex::Regex::new(r"([^ ,]+):(\d+)(?:-(\d+))?->(\d+)(?:-(\d+))?/(tcp|udp)").unwrap();
    let mut mappings = Vec::new();
    for line in text.lines().filter(|l| !l.trim().is_empty()) {
        let row: serde_json::Value =
            serde_json::from_str(line).map_err(|_| "Docker returned unreadable data")?;
        let name = row["Names"]
            .as_str()
            .unwrap_or("Unnamed container")
            .to_owned();
        let project = row["Labels"]
            .as_str()
            .unwrap_or("")
            .split(',')
            .find_map(|s| s.strip_prefix("com.docker.compose.project="))
            .map(str::to_owned);
        for c in re.captures_iter(row["Ports"].as_str().unwrap_or("")) {
            let number = |index: usize| -> Result<u16, String> {
                c[index]
                    .parse()
                    .map_err(|_| "Invalid published port".into())
            };
            let host_start = number(2)?;
            let host_end = if c.get(3).is_some() {
                number(3)?
            } else {
                host_start
            };
            let container_start = number(4)?;
            let container_end = if c.get(5).is_some() {
                number(5)?
            } else {
                container_start
            };
            if host_start == 0
                || container_start == 0
                || host_end < host_start
                || container_end < container_start
                || host_end - host_start != container_end - container_start
            {
                return Err("Unsupported Docker port range".into());
            }
            for offset in 0..=host_end - host_start {
                if mappings.len() >= 4096 {
                    return Err("Docker mappings exceed the inspection limit.".into());
                }
                mappings.push(Mapping {
                    name: name.clone(),
                    project: project.clone(),
                    address: c[1].into(),
                    host_port: host_start + offset,
                    container_port: container_start + offset,
                    protocol: c[6].to_uppercase(),
                });
            }
        }
    }
    Ok(mappings)
}
pub fn scan() -> Result<Vec<Mapping>, String> {
    // Explicit local endpoint: never inherit a remote Docker context or DOCKER_HOST.
    #[cfg(windows)]
    let host = "npipe:////./pipe/docker_engine".to_owned();
    #[cfg(not(windows))]
    let host = {
        let desktop = std::env::var_os("HOME")
            .map(std::path::PathBuf::from)
            .map(|p| p.join(".docker/run/docker.sock"));
        let path = desktop
            .filter(|p| p.exists())
            .unwrap_or_else(|| "/var/run/docker.sock".into());
        format!("unix://{}", path.display())
    };
    let mut command = Command::new("docker");
    command
        .args(["--host", &host, "ps", "--format", "{{json .}}"])
        .env_remove("DOCKER_CONTEXT")
        .env_remove("DOCKER_HOST")
        .env_remove("DOCKER_TLS_VERIFY")
        .env_remove("DOCKER_CERT_PATH")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn().map_err(|_| {
        "Docker CLI unavailable. Install Docker Desktop to inspect local containers."
    })?;
    let stdout = child.stdout.take().ok_or("Docker output unavailable")?;
    let reader = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        stdout
            .take(1_048_577)
            .read_to_end(&mut bytes)
            .map(|_| bytes)
    });
    let deadline = Instant::now() + Duration::from_secs(4);
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                if !status.success() {
                    return Err(
                        "Cannot read the local Docker engine. Start Docker Desktop and try again."
                            .into(),
                    );
                }
                break;
            }
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(40)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(
                    "Local Docker inspection timed out. Try again after Docker is ready.".into(),
                );
            }
        }
    }
    let bytes = reader
        .join()
        .map_err(|_| "Docker reader failed")?
        .map_err(|_| "Docker output unavailable")?;
    if bytes.len() > 1_048_576 {
        return Err("Docker output exceeds the inspection limit.".into());
    }
    parse(&String::from_utf8(bytes).map_err(|_| "Docker output is not UTF-8")?)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn published_ranges() {
        let rows =
            parse(r#"{"Names":"range","Ports":"0.0.0.0:8000-8002->9000-9002/tcp"}"#).unwrap();
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[2].host_port, 8002);
        assert_eq!(rows[2].container_port, 9002);
        assert!(parse(r#"{"Ports":"0.0.0.0:8002-8000->9000/tcp"}"#).is_err());
    }
    #[test]
    fn published_ports_only() {
        let rows=parse(r#"{"Names":"api","Labels":"com.docker.compose.project=shop,other=x","Ports":"0.0.0.0:8080->80/tcp, [::]:5353->53/udp, 9000/tcp"}"#).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].host_port, 8080);
        assert_eq!(rows[0].project.as_deref(), Some("shop"));
        assert_eq!(rows[1].protocol, "UDP");
        assert!(parse("not json").is_err());
        assert!(parse("").unwrap().is_empty());
    }
}
