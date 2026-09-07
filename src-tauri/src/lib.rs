use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

/// Whether the frontend has attached its listener for `show-exit-dialog`.
///
/// Until it has, a close request must be allowed through: preventing a close
/// that nothing can answer leaves the window impossible to shut, because the
/// dialog that would offer to quit never appears.
struct CloseHandlerReady(AtomicBool);

/// Called by the exit dialog once it is listening. Only after this does a close
/// request get intercepted on Windows and Linux.
#[tauri::command]
fn close_handler_ready(state: tauri::State<'_, CloseHandlerReady>) {
    state.0.store(true, Ordering::Relaxed);
}

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

/// Decides what a close request does.
///
/// macOS hides the window and keeps the process alive, which is the platform
/// convention and needs nothing from the frontend; the tray brings it back.
/// Everywhere else the frontend is asked to confirm — but only if it is
/// listening, so a failed subscription degrades to an ordinary close rather
/// than to a window that cannot be shut.
fn handle_close_requested(window: &tauri::Window, api: &tauri::CloseRequestApi) {
    if cfg!(target_os = "macos") {
        api.prevent_close();
        let _ = window.hide();
        return;
    }

    let ready = window
        .state::<CloseHandlerReady>()
        .0
        .load(Ordering::Relaxed);

    if ready {
        api.prevent_close();
        let _ = window.emit("show-exit-dialog", ());
    }
}

/// Starts the application. This is the process's only Tauri builder.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(CloseHandlerReady(AtomicBool::new(false)))
        .invoke_handler(tauri::generate_handler![close_handler_ready])
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                handle_close_requested(window, api);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
