use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{Emitter, Manager, WindowEvent};

static IS_CLOSING: AtomicBool = AtomicBool::new(false);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent multiple competing tasks if user spams Alt+F4 or window close button
                if IS_CLOSING.swap(true, Ordering::SeqCst) {
                    api.prevent_close();
                    return;
                }

                // Prevent immediate OS termination to allow webview flush
                api.prevent_close();
                let window_clone = window.clone();
                let app_handle = window.app_handle().clone();

                // Emit event to notify webview to flush pending states and IndexedDB writes
                let _ = window.emit("tauri-app-close-requested", ());

                // Spawn non-blocking async task to allow webview flush before window destruction
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_millis(350)).await;
                    let _ = window_clone.destroy();

                    // Hard timeout fail-safe: Forcefully terminate process after 250ms extra grace period
                    // to prevent unkillable zombie processes if webview hangs
                    tokio::time::sleep(Duration::from_millis(250)).await;
                    app_handle.exit(0);
                });
            }
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
