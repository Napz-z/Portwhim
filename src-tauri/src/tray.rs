use crate::scanner::Snapshot;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};
#[derive(serde::Deserialize)]
pub struct Favorite {
    port: u16,
    protocol: String,
    label: String,
}
pub fn setup(app: &tauri::AppHandle) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::with_id("ports").tooltip("Portwhim · Local ports");
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder
        .on_menu_event(|app, event| {
            let id = event.id.as_ref();
            if id == "quit" {
                app.exit(0);
                return;
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if let Some(value) = id.strip_prefix("port:") {
                if let Some((protocol, port)) = value.split_once(':') {
                    if let Ok(port) = port.parse::<u16>() {
                        let _ = app.emit(
                            "favorite-selected",
                            serde_json::json!({"protocol":protocol,"port":port}),
                        );
                    }
                }
            }
        })
        .build(app)?;
    update(app, &[], None)
}
pub fn update(
    app: &tauri::AppHandle,
    favorites: &[Favorite],
    snapshot: Option<&Snapshot>,
) -> tauri::Result<()> {
    let menu = Menu::new(app)?;
    menu.append(&MenuItem::with_id(
        app,
        "show",
        "Open Portwhim",
        true,
        None::<&str>,
    )?)?;
    let stamp = snapshot
        .map(|s| format!("Snapshot {}", s.scanned_at))
        .unwrap_or("Awaiting scan".into());
    menu.append(&MenuItem::with_id(
        app,
        "stamp",
        stamp,
        false,
        None::<&str>,
    )?)?;
    for f in favorites
        .iter()
        .take(32)
        .filter(|f| f.port > 0 && ["TCP", "UDP"].contains(&f.protocol.as_str()))
    {
        let count = snapshot.map(|s| {
            s.listeners
                .iter()
                .filter(|l| l.port == f.port && l.protocol == f.protocol)
                .count()
        });
        let status = match count {
            Some(0) => "no listener".into(),
            Some(n) => format!("{n} bindings"),
            None => "unknown".into(),
        };
        let label: String = f
            .label
            .chars()
            .filter(|c| !c.is_control())
            .take(60)
            .collect();
        let label = label.replace('&', "&&");
        menu.append(&MenuItem::with_id(
            app,
            format!("port:{}:{}", f.protocol, f.port),
            format!("{} :{} {} · {}", f.protocol, f.port, label, status),
            true,
            None::<&str>,
        )?)?;
    }
    menu.append(&MenuItem::with_id(
        app,
        "quit",
        "Quit Portwhim",
        true,
        None::<&str>,
    )?)?;
    if let Some(tray) = app.tray_by_id("ports") {
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}
