use std::sync::Mutex;
use tauri::State;
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
pub mod scanner;
use scanner::{Listener, Scanner, Snapshot};
#[derive(Default)]
struct Backend {
    scanner: Scanner,
    latest: Option<Snapshot>,
    stopping: bool,
}
type Store = Mutex<Backend>;
fn selected(store: &Store, id: &str) -> Result<Listener, String> {
    store
        .lock()
        .map_err(|e| e.to_string())?
        .latest
        .as_ref()
        .and_then(|s| s.listeners.iter().find(|l| l.id == id))
        .cloned()
        .ok_or("Selection expired. Refresh and select again.".into())
}
#[tauri::command]
async fn scan(state: State<'_, Store>) -> Result<Snapshot, String> {
    let mut data = state.lock().map_err(|e| e.to_string())?;
    if data.stopping {
        return data.latest.clone().ok_or("Stop in progress".into());
    }
    let snapshot = data.scanner.scan()?;
    data.latest = Some(snapshot.clone());
    Ok(snapshot)
}
#[tauri::command]
fn copy(
    app: tauri::AppHandle,
    state: State<'_, Store>,
    id: String,
    field: String,
) -> Result<(), String> {
    let row = selected(&state, &id)?;
    let value = match field.as_str() {
        "pid" => row.pid.to_string(),
        "port" => row.port.to_string(),
        _ => return Err("Invalid field".into()),
    };
    app.clipboard().write_text(value).map_err(|e| e.to_string())
}
#[tauri::command]
fn open(app: tauri::AppHandle, state: State<'_, Store>, id: String) -> Result<(), String> {
    let row = selected(&state, &id)?;
    if row.protocol != "TCP" {
        return Err("Only TCP listeners can be opened".into());
    }
    app.opener()
        .open_url(
            format!(
                "http://{}:{}",
                if row.address == "::1" {
                    "[::1]"
                } else {
                    "localhost"
                },
                row.port
            ),
            None::<&str>,
        )
        .map_err(|e| e.to_string())
}
#[tauri::command]
async fn stop(
    app: tauri::AppHandle,
    state: State<'_, Store>,
    id: String,
) -> Result<serde_json::Value, String> {
    let row = selected(&state, &id)?;
    {
        let mut data = state.lock().map_err(|e| e.to_string())?;
        if data.stopping {
            return Err("Another stop action is in progress".into());
        }
        data.stopping = true;
    }
    let result = (|| {
        scanner::verify(&row)?;
        let confirmed=app.dialog().message(format!("Stop {} (PID {})?\nThis closes every port owned by this process, including :{}. Unsaved work may be lost. {}",row.name,row.pid,row.port,if cfg!(windows){"Windows terminates the process immediately."}else{"SIGTERM will be sent."})).title("Stop process?").kind(MessageDialogKind::Warning).buttons(MessageDialogButtons::OkCancelCustom("Stop process".into(),"Cancel".into())).blocking_show();
        if !confirmed {
            return Ok(serde_json::json!({"cancelled":true}));
        }
        scanner::terminate(&row)?;
        Ok(
            serde_json::json!({"message":if cfg!(windows){"Process terminated."}else{"SIGTERM sent. Refresh to check whether the process has exited."}}),
        )
    })();
    state.lock().map_err(|e| e.to_string())?.stopping = false;
    result
}
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Store::default())
        .invoke_handler(tauri::generate_handler![scan, copy, open, stop])
        .run(tauri::generate_context!())
        .expect("Failed to run Portwhim");
}
