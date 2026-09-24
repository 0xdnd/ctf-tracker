// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
fn enforce_secure_dll_search_order() {
    // Restrict dynamic link library search path strictly to %SystemRoot%\System32
    // Mitigates CWE-426 / CWE-427 (Untrusted Search Path / DLL Preloading Hijacking)
    unsafe {
        extern "system" {
            fn SetDefaultDllDirectories(directory_flags: u32) -> i32;
            fn SetDllDirectoryW(lp_path_name: *const u16) -> i32;
        }
        // LOAD_LIBRARY_SEARCH_SYSTEM32 = 0x00000800
        const LOAD_LIBRARY_SEARCH_SYSTEM32: u32 = 0x00000800;
        let _ = SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_SYSTEM32);

        // Strip current working directory from legacy DLL search path
        let empty_path: [u16; 1] = [0];
        let _ = SetDllDirectoryW(empty_path.as_ptr());
    }
}

fn main() {
    #[cfg(windows)]
    enforce_secure_dll_search_order();

    app_lib::run();
}
