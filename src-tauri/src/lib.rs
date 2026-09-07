use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// Shows the main window and gives it focus.
///
/// Used by every tray path that brings the app back into view, including the
/// macOS close handler, which only hides the window.
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Hides the main window without terminating the process.
fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Builds the tray icon and its Show / Hide / Quit menu.
///
/// Called from the builder's setup hook so that it runs inside the single
/// application this crate starts. Left-clicking the icon restores the window;
/// the menu is opened with a right-click.
fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

    let icon = app
        .default_window_icon()
        .expect("bundle icons are configured in tauri.conf.json")
        .clone();

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "show" => show_main_window(app),
            "hide" => hide_main_window(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Intercepts a close request instead of letting the window be destroyed.
///
/// macOS keeps the process alive and hides the window, which is the platform
/// convention; the tray is what brings it back. Everywhere else the frontend is
/// asked to confirm, and it calls `exit` if the user agrees.
fn handle_close_requested(window: &tauri::Window) {
    if cfg!(target_os = "macos") {
        let _ = window.hide();
    } else {
        let _ = window.emit("show-exit-dialog", ());
    }
}

/// Starts the application. This is the process's only Tauri builder.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                handle_close_requested(window);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
