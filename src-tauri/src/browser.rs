use crate::scanner::Listener;

pub fn open_target(row: &Listener) -> Result<String, String> {
    candidate(
        &row.protocol,
        row.port,
        &row.address,
        &row.category,
        &row.service,
        &row.confidence,
    )
}

fn candidate(
    protocol: &str,
    port: u16,
    address: &str,
    category: &str,
    service: &str,
    confidence: &str,
) -> Result<String, String> {
    if protocol != "TCP" {
        return Err("UDP cannot be opened in a browser.".into());
    }
    if category == "database"
        || [
            21, 22, 23, 25, 53, 110, 135, 139, 143, 445, 465, 587, 993, 995, 1433, 1521, 3306,
            3389, 5432, 5672, 6379, 27017,
        ]
        .contains(&port)
    {
        return Err("This service is not an HTTP browser candidate.".into());
    }
    let loopback = address
        .parse::<std::net::Ipv4Addr>()
        .is_ok_and(|a| a.is_loopback());
    if !["0.0.0.0", "::", "::1"].contains(&address) && !loopback {
        return Err("This binding does not listen on localhost.".into());
    }
    let web_service = confidence == "process" && ["Vite", "Next.js", "Laravel"].contains(&service);
    if ![80, 443, 8080, 8443].contains(&port) && !web_service {
        return Err("No reliable HTTP or HTTPS hint for this port.".into());
    }
    let scheme = if [443, 8443].contains(&port) {
        "https"
    } else {
        "http"
    };
    let host = if address.contains(':') {
        "[::1]"
    } else if address == "0.0.0.0" {
        "127.0.0.1"
    } else {
        address
    };
    Ok(format!("{scheme}://{host}:{port}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn browser_policy_matches_shared_cases() {
        let cases: serde_json::Value =
            serde_json::from_str(include_str!("../../tests/open-cases.json")).unwrap();
        for case in cases.as_array().unwrap() {
            let row = &case["row"];
            let result = candidate(
                row["protocol"].as_str().unwrap(),
                row["port"].as_u64().unwrap() as u16,
                row["address"].as_str().unwrap(),
                row["category"].as_str().unwrap(),
                row["service"].as_str().unwrap(),
                row["confidence"].as_str().unwrap(),
            );
            if let Some(url) = case["url"].as_str() {
                assert_eq!(result.unwrap(), url);
            } else {
                assert_eq!(result.unwrap_err(), case["reason"].as_str().unwrap());
            }
        }
    }
}
