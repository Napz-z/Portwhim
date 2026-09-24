use serde::Serialize;
use std::{
    net::{IpAddr, SocketAddr, TcpStream},
    time::{Duration, Instant},
};
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Report {
    pub url: String,
    pub connected: bool,
    pub status: Option<u16>,
    pub elapsed_ms: u128,
    pub message: String,
    pub checked_at: String,
}
pub fn target(
    protocol: &str,
    address: &str,
    port: u16,
    scheme: &str,
) -> Result<(SocketAddr, String), String> {
    if protocol != "TCP" || port == 0 {
        return Err("HTTP checks require a TCP socket.".into());
    }
    if !["http", "https"].contains(&scheme) {
        return Err("Choose HTTP or HTTPS.".into());
    }
    let ip: IpAddr = address.parse().map_err(|_| "Invalid local address.")?;
    let ip = if ip.is_unspecified() {
        if ip.is_ipv4() {
            "127.0.0.1".parse().unwrap()
        } else {
            "::1".parse().unwrap()
        }
    } else {
        ip
    };
    if !ip.is_loopback() {
        return Err("Checks are limited to localhost bindings.".into());
    }
    let socket = SocketAddr::new(ip, port);
    Ok((socket, format!("{scheme}://{socket}/")))
}
pub fn check(protocol: &str, address: &str, port: u16, scheme: &str) -> Result<Report, String> {
    let (socket, url) = target(protocol, address, port, scheme)?;
    let start = Instant::now();
    let connected = TcpStream::connect_timeout(&socket, Duration::from_secs(2));
    let mut report = Report {
        url: url.clone(),
        connected: connected.is_ok(),
        status: None,
        elapsed_ms: 0,
        message: String::new(),
        checked_at: chrono::Utc::now().to_rfc3339(),
    };
    if connected.is_err() {
        report.message = "TCP connection failed or timed out. The service may have stopped.".into();
    } else {
        drop(connected);
        let client = reqwest::blocking::Client::builder()
            .no_proxy()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(2))
            .timeout(Duration::from_secs(4))
            .build()
            .map_err(|e| e.to_string())?;
        match client.head(&url).send() {
            Ok(response) => {
                report.status = Some(response.status().as_u16());
                report.message = "HTTP response received. A response code does not establish application health; redirects are not followed.".into();
            }
            Err(error) => {
                report.message = if error.is_timeout() { "TCP connected, but HTTP timed out." } else { "TCP connected, but no valid HTTP response was received. Check the protocol and, for HTTPS, the certificate trust." }.into();
            }
        }
    }
    report.elapsed_ms = start.elapsed().as_millis();
    Ok(report)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_loopback_tcp_targets_are_allowed() {
        assert_eq!(
            target("TCP", "::", 8080, "http").unwrap().1,
            "http://[::1]:8080/"
        );
        assert!(target("TCP", "192.168.1.2", 8080, "http").is_err());
        assert!(target("UDP", "127.0.0.1", 8080, "http").is_err());
        assert!(target("TCP", "localhost", 8080, "http").is_err());
        assert!(target("TCP", "127.0.0.1", 8080, "file").is_err());
    }
    #[test]
    fn reports_http_error_status_and_does_not_follow_redirects() {
        use std::io::{Read, Write};
        for status in [
            "503 Service Unavailable",
            "302 Found",
            "405 Method Not Allowed",
        ] {
            let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
            let port = listener.local_addr().unwrap().port();
            let server = std::thread::spawn(move || {
                drop(listener.accept().unwrap()); // TCP probe
                let (mut stream, _) = listener.accept().unwrap();
                stream
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let mut bytes = [0; 2048];
                let n = stream.read(&mut bytes).unwrap();
                assert!(String::from_utf8_lossy(&bytes[..n]).starts_with("HEAD / "));
                write!(stream, "HTTP/1.1 {status}\r\nLocation: http://192.0.2.1/\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").unwrap();
            });
            let report = check("TCP", "127.0.0.1", port, "http").unwrap();
            assert!(report.connected);
            assert_eq!(report.status.unwrap().to_string(), &status[..3]);
            server.join().unwrap();
        }
    }
}
