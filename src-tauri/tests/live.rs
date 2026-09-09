use portwhim::scanner::{terminate, verify, Scanner};
use std::{
    fs,
    net::{TcpListener, UdpSocket},
    process::{Command, Stdio},
    time::{Duration, Instant},
};
#[test]
#[ignore = "test-owned fixture subprocess"]
fn fixture() {
    let Ok(file) = std::env::var("PORTWHIM_FIXTURE_READY") else {
        return;
    };
    let tcp = TcpListener::bind("127.0.0.1:0").unwrap();
    let udp = UdpSocket::bind("127.0.0.1:0").unwrap();
    fs::write(
        file,
        format!(
            "{} {} {}",
            std::process::id(),
            tcp.local_addr().unwrap().port(),
            udp.local_addr().unwrap().port()
        ),
    )
    .unwrap();
    loop {
        std::thread::sleep(Duration::from_secs(1));
    }
}
#[test]
#[ignore = "test-owned probe subprocess"]
fn probe() {
    let Ok(file) = std::env::var("PORTWHIM_PROBE_READY") else {
        return;
    };
    let values: Vec<u32> = fs::read_to_string(file)
        .unwrap()
        .split_whitespace()
        .map(|s| s.parse().unwrap())
        .collect();
    let mut scanner = Scanner::default();
    let snapshot = scanner.scan().unwrap();
    let tcp = snapshot
        .listeners
        .iter()
        .find(|l| l.pid == values[0] && l.port == values[1] as u16 && l.protocol == "TCP")
        .expect("owned TCP fixture visible");
    assert!(snapshot
        .listeners
        .iter()
        .any(|l| l.pid == values[0] && l.port == values[2] as u16 && l.protocol == "UDP"));
    assert_eq!(
        tcp.provenance.project.as_ref().unwrap().name,
        "portwhim-live-fixture"
    );
    assert!(tcp.provenance.parent.is_some());
    let mut wrong = tcp.clone();
    wrong.birth += 1;
    assert!(verify(&wrong).is_err());
    wrong = tcp.clone();
    wrong.pid = std::process::id();
    assert!(verify(&wrong).is_err());
    wrong = tcp.clone();
    wrong.can_stop = false;
    assert!(verify(&wrong).is_err());
    let serialized = serde_json::to_value(tcp).unwrap();
    assert!(serialized.get("birth").is_none());
    assert!(serialized.get("command").is_none());
    terminate(tcp).unwrap();
    let deadline = Instant::now() + Duration::from_secs(10);
    while scanner
        .scan()
        .unwrap()
        .listeners
        .iter()
        .any(|l| l.pid == values[0])
    {
        assert!(Instant::now() < deadline);
        std::thread::sleep(Duration::from_millis(100));
    }
}
#[test]
#[ignore = "requires unrestricted local process access"]
fn real_scan_and_stop() {
    let root = std::env::temp_dir().join(format!("portwhim-live-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    fs::write(
        root.join("package.json"),
        r#"{"name":"portwhim-live-fixture"}"#,
    )
    .unwrap();
    let ready = root.join("ready.txt");
    let fixture_exe = root.join(if cfg!(windows) {
        "fixture.exe"
    } else {
        "fixture"
    });
    fs::copy(std::env::current_exe().unwrap(), &fixture_exe).unwrap();
    let mut fixture = Command::new(fixture_exe)
        .args(["--ignored", "--exact", "fixture", "--nocapture"])
        .env("PORTWHIM_FIXTURE_READY", &ready)
        .current_dir(&root)
        .stdout(Stdio::null())
        .spawn()
        .unwrap();
    let result = std::panic::catch_unwind(|| {
        let deadline = Instant::now() + Duration::from_secs(10);
        while !ready.exists() {
            assert!(Instant::now() < deadline);
            std::thread::sleep(Duration::from_millis(100));
        }
        let status = Command::new(std::env::current_exe().unwrap())
            .args(["--ignored", "--exact", "probe", "--nocapture"])
            .env("PORTWHIM_PROBE_READY", &ready)
            .status()
            .unwrap();
        assert!(status.success());
    });
    let _ = fixture.kill();
    let _ = fixture.wait();
    fs::remove_dir_all(root).unwrap();
    result.unwrap();
}
