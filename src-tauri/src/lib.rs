use std::sync::Mutex;
use tauri::{Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
mod browser;
mod health;
mod project;
mod watch;
use tauri_plugin_notification::NotificationExt;
mod docker;
mod tray;
#[tauri::command]
fn tray_update(
    app: tauri::AppHandle,
    state: State<'_, Store>,
    favorites: Vec<tray::Favorite>,
) -> Result<(), String> {
    let snapshot = state.lock().map_err(|e| e.to_string())?.latest.clone();
    tray::update(&app, &favorites, snapshot.as_ref()).map_err(|e| e.to_string())
}
#[tauri::command]
fn hide_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Window unavailable")?
        .hide()
        .map_err(|e| e.to_string())
}
#[tauri::command]
async fn docker_ports() -> Result<Vec<docker::Mapping>, String> {
    tauri::async_runtime::spawn_blocking(docker::scan)
        .await
        .map_err(|e| e.to_string())?
}
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
        "projectPath" => row
            .provenance
            .project
            .as_ref()
            .ok_or("No project directory was identified.")?
            .directory
            .clone(),
        _ => return Err("Invalid field".into()),
    };
    app.clipboard().write_text(value).map_err(|e| e.to_string())
}
#[tauri::command]
fn open(app: tauri::AppHandle, state: State<'_, Store>, id: String) -> Result<(), String> {
    let row = selected(&state, &id)?;
    let url = browser::open_target(&row)?;
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}
fn existing_directory(directory: &str) -> Result<std::path::PathBuf, String> {
    let path = std::path::Path::new(directory);
    if !path.is_absolute() {
        return Err("Project directory must be an absolute path.".into());
    }
    let path = path
        .canonicalize()
        .map_err(|_| "Project directory is unavailable or no longer exists.".to_string())?;
    if !path.is_dir() {
        return Err("Project path is no longer a directory.".into());
    }
    Ok(path)
}
#[tauri::command]
fn open_project(app: tauri::AppHandle, state: State<'_, Store>, id: String) -> Result<(), String> {
    let row = selected(&state, &id)?;
    let project = row
        .provenance
        .project
        .as_ref()
        .ok_or("No project directory was identified.")?;
    let path = existing_directory(&project.directory)?;
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
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

#[tauri::command]
async fn check_health(
    state: State<'_, Store>,
    id: String,
    scheme: String,
) -> Result<health::Report, String> {
    let row = selected(&state, &id)?;
    tauri::async_runtime::spawn_blocking(move || {
        health::check(&row.protocol, &row.address, row.port, &scheme)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn watch_config(
    state: State<'_, Mutex<watch::Watcher>>,
    favorites: Vec<watch::Favorite>,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .configure(favorites)
}
#[tauri::command]
fn watch_status(state: State<'_, Mutex<watch::Watcher>>) -> Result<watch::Status, String> {
    Ok(state.lock().map_err(|e| e.to_string())?.status.clone())
}
#[tauri::command]
fn notification_permission(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(app
        .notification()
        .request_permission()
        .map_err(|e| e.to_string())?
        == tauri_plugin_notification::PermissionState::Granted)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(Mutex::new(watch::Watcher::default()))
        .manage(Store::default())
        .setup(|app| {
            tray::setup(app.handle())?;
            watch::start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan,
            copy,
            open,
            open_project,
            stop,
            docker_ports,
            tray_update,
            hide_to_tray,
            check_health,
            watch_config,
            watch_status,
            notification_permission
        ])
        .run(tauri::generate_context!())
        .expect("Failed to run Portwhim");
}

#[cfg(test)]
mod project_tests {
    use super::existing_directory;
    #[test]
    fn project_directory_must_be_existing_absolute_directory() {
        assert!(existing_directory("relative/path").is_err());
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
        assert!(existing_directory(root.to_str().unwrap()).is_ok());
        assert!(existing_directory(root.join("Cargo.toml").to_str().unwrap()).is_err());
        assert!(
            existing_directory(root.join("missing-project-directory").to_str().unwrap()).is_err()
        );
    }
}
