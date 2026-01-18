use tauri::{Emitter, Manager};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if cfg!(target_os = "macos") {
                    let _ = window.hide();
                    return;
                } else {
                    let _ = window.emit("show-exit-dialog", ());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
