#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{Map, Value};
use std::{
    fs,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;
mod backups;
mod report_files;
mod databases;
mod portable;
mod pdf_export;
#[cfg(test)]
mod report_files_tests;

struct Storage {
    root: PathBuf,
    active: Mutex<String>,
    file_versions: Mutex<std::collections::HashMap<PathBuf,u64>>,
    lock: Mutex<()>,
}
#[derive(Default)]
struct WorkspaceSize(Mutex<Option<(tauri::Size,bool)>>);

#[tauri::command]
fn set_workspace_mode(app:tauri::AppHandle,state:tauri::State<WorkspaceSize>,welcome:bool)->Result<(),String>{
    let window=app.get_webview_window("main").ok_or("Main window unavailable")?;
    let mut saved=state.0.lock().map_err(|e|e.to_string())?;
    window.set_resizable(!welcome).map_err(|e|e.to_string())?;
    window.set_maximizable(!welcome).map_err(|e|e.to_string())?;
    if welcome&&saved.is_none(){
        let size=window.inner_size().map_err(|e|e.to_string())?;
        let maximized=window.is_maximized().map_err(|e|e.to_string())?;
        let logical=size.to_logical::<f64>(window.scale_factor().map_err(|e|e.to_string())?);
        *saved=Some((size.into(),maximized));
        if maximized{window.unmaximize().map_err(|e|e.to_string())?;}
        window.set_min_size(Some(tauri::LogicalSize::new(600.0,400.0))).map_err(|e|e.to_string())?;
        window.set_size(tauri::LogicalSize::new((logical.width/2.0).clamp(600.0,900.0),(logical.height/2.0).clamp(420.0,600.0))).map_err(|e|e.to_string())?;
        window.center().map_err(|e|e.to_string())?;
    }else if !welcome{
        window.set_min_size(Some(tauri::LogicalSize::new(980.0,680.0))).map_err(|e|e.to_string())?;
        if let Some((size,maximized))=saved.take(){window.set_size(size).map_err(|e|e.to_string())?;window.center().map_err(|e|e.to_string())?;if maximized{window.maximize().map_err(|e|e.to_string())?;}}
    }
    Ok(())
}

fn connection(root: &PathBuf) -> Result<Connection, String> {
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let conn = Connection::open(root.join("openhau.sqlite")).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
        CREATE TABLE IF NOT EXISTS project_sections (name TEXT PRIMARY KEY, json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS save_log (id INTEGER PRIMARY KEY, saved_at TEXT NOT NULL);",
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

fn validate(value: &Value) -> Result<(), String> {
    if value.get("format").and_then(Value::as_str) != Some("openhau")
        || !matches!(
            value.get("schema_version").and_then(Value::as_u64),
            Some(1 | 2 | 3)
        )
    {
        return Err("Неподдерживаемый формат или версия данных OpenHaU".into());
    }
    if !value.get("accounts").is_some_and(Value::is_array)
        || !value.get("organization").is_some_and(Value::is_object)
    {
        return Err("В файле отсутствуют счета или организация".into());
    }
    Ok(())
}

#[tauri::command]
fn load_project(storage: tauri::State<Storage>) -> Result<Option<Value>, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    if let Some(path)=databases::linked_path(&storage)?{let (value,hash)=portable::read(&path)?;storage.file_versions.lock().map_err(|e|e.to_string())?.insert(path,hash);return Ok(Some(value));}
    let conn = connection(&databases::current(&storage)?)?;
    let mut stmt = conn
        .prepare("SELECT name, json FROM project_sections")
        .map_err(|e| e.to_string())?;
    let mut result = Map::new();
    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;
    for row in rows {
        let (key, text) = row.map_err(|e| e.to_string())?;
        result.insert(key, serde_json::from_str(&text).map_err(|e| e.to_string())?);
    }
    Ok(if result.is_empty() {
        None
    } else {
        Some(Value::Object(result))
    })
}

#[tauri::command]
fn save_project(value: Value, storage: tauri::State<Storage>) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    if let Some(path)=databases::linked_path(&storage)?{return portable::save(&storage,&path,value,&databases::current(&storage)?);}
    save_with_copy(value, &databases::current(&storage)?)
}

fn save_with_copy(value: Value, root: &PathBuf) -> Result<Value, String> {
    let path = save_value(value, root)?;
    // The transaction has committed. An external-copy failure must not claim the save failed.
    let (backup_path, backup_warning) = match backups::copy(root) {
        Ok(path) => (path, None),
        Err(error) => (None, Some(error)),
    };
    Ok(serde_json::json!({"path":path,"backup_path":backup_path,"backup_warning":backup_warning}))
}

#[tauri::command]
fn backup_settings(storage: tauri::State<Storage>) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    backups::settings(&databases::current(&storage)?)
}
#[tauri::command]
fn configure_backups(
    directory: Option<String>,
    storage: tauri::State<Storage>,
) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    backups::configure(&databases::current(&storage)?, directory)
}
#[tauri::command]
fn backup_now(storage: tauri::State<Storage>) -> Result<Option<String>, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    if let Some(path)=databases::linked_path(&storage)?{return portable::backup(&path,&databases::current(&storage)?);}
    backups::copy(&databases::current(&storage)?)
}

#[tauri::command]
fn report_export_settings(storage: tauri::State<Storage>) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    report_files::settings(&databases::current(&storage)?)
}
#[tauri::command]
fn configure_report_exports(value: Value, storage: tauri::State<Storage>) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    report_files::configure(&databases::current(&storage)?, value)
}
#[tauri::command]
fn write_report_exports(
    reason: String,
    period: String,
    files: Value,
    storage: tauri::State<Storage>,
) -> Result<Option<String>, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    report_files::write(&databases::current(&storage)?, &reason, &period, files)
}

fn save_value(value: Value, root: &PathBuf) -> Result<String, String> {
    validate(&value)?;
    let mut conn = connection(root)?;
    let stored_version: Option<String> = conn
        .query_row(
            "SELECT json FROM project_sections WHERE name='schema_version'",
            [],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if let Some(stored) = stored_version {
        let version: u64 = serde_json::from_str(&stored).map_err(|e| e.to_string())?;
        if version
            > value["schema_version"]
                .as_u64()
                .ok_or("Invalid schema version")?
        {
            return Err("Нельзя перезаписать базу более нового формата".into());
        }
    }
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos()
        .to_string();
    let count: i64 = conn
        .query_row("SELECT count(*) FROM project_sections", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count > 0 {
        let backups = root.join("backups");
        fs::create_dir_all(&backups).map_err(|e| e.to_string())?;
        conn.backup(
            rusqlite::DatabaseName::Main,
            backups.join(format!("openhau-{now}.sqlite")),
            None,
        )
        .map_err(|e| e.to_string())?;
    }
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute("DELETE FROM project_sections", [])
        .map_err(|e| e.to_string())?;
    for (key, section) in value.as_object().ok_or("Некорректный документ")? {
        tx.execute(
            "INSERT INTO project_sections (name,json) VALUES (?1,?2)",
            params![
                key,
                serde_json::to_string(section).map_err(|e| e.to_string())?
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.execute("INSERT INTO save_log(saved_at) VALUES (?1)", [&now])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(root.join("openhau.sqlite").display().to_string())
}

#[tauri::command]
fn read_json_file(path: String) -> Result<Value, String> {
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 64 * 1024 * 1024 {
        return Err("Файл больше 64 МБ".into());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let value: Value =
        serde_json::from_str(content.trim_start_matches('\u{feff}')).map_err(|e| e.to_string())?;
    validate(&value)?;
    Ok(value)
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, content: Vec<u8>) -> Result<(), String> {
    if content.len() > 128 * 1024 * 1024 { return Err("Export exceeds 128 MiB".into()); }
    if !std::path::Path::new(&path).is_absolute() || !path.to_lowercase().ends_with(".xlsx") { return Err("An absolute XLSX path is required".into()); }
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn storage_path(storage: tauri::State<Storage>) -> Result<String,String> {
    if let Some(path)=databases::linked_path(&storage)?{return Ok(path.display().to_string());}
    Ok(databases::current(&storage)?.display().to_string())
}

#[tauri::command]
fn runtime_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn launch_action() -> String {
    let args:Vec<String>=std::env::args().collect();
    args.windows(2).find(|w|w[0]=="--open").map(|w|w[1].clone()).unwrap_or_default()
}

fn database_argument(args:impl Iterator<Item=String>)->Option<String>{
    let mut args=args.skip(1);
    while let Some(arg)=args.next(){
        if arg=="--open" { args.next(); continue; }
        if arg.starts_with('-'){continue;}
        if std::path::Path::new(&arg).extension().and_then(|e|e.to_str()).is_some_and(|e|e.eq_ignore_ascii_case("odb")||e.eq_ignore_ascii_case("json")) {return Some(arg);}
    }
    None
}
#[tauri::command]
fn launch_database_path()->Option<String>{database_argument(std::env::args())}

#[tauri::command]
fn create_desktop_shortcut(action:String,title:String)->Result<(),String>{
    if action.is_empty()||action.len()>120||!action.bytes().all(|c|c.is_ascii_alphanumeric()||b":-_".contains(&c)){return Err("Invalid shortcut action".into());}
    #[cfg(target_os="windows")]
    {
        use std::os::windows::process::CommandExt;
        let name:String=title.chars().filter(|c|!c.is_control()&&!"<>:\"/\\|?*".contains(*c)).take(80).collect();
        if name.trim().is_empty(){return Err("Invalid shortcut title".into());}
        let script=r#"$ErrorActionPreference='Stop'; $taskDesktop=[Environment]::GetFolderPath('Desktop'); $taskPath=Join-Path $taskDesktop ('OpenHaU - '+$env:OPENHAU_SHORTCUT_NAME+'.lnk'); if(Test-Path -LiteralPath $taskPath){throw 'Shortcut already exists'}; $taskShell=New-Object -ComObject WScript.Shell; $taskLink=$taskShell.CreateShortcut($taskPath); $taskLink.TargetPath=$env:OPENHAU_SHORTCUT_EXE; $taskLink.Arguments='--open '+$env:OPENHAU_SHORTCUT_ACTION; $taskLink.IconLocation=$env:OPENHAU_SHORTCUT_EXE+',0'; $taskLink.Save()"#;
        let status=std::process::Command::new("powershell.exe").args(["-NoProfile","-NonInteractive","-Command",script]).env("OPENHAU_SHORTCUT_EXE",std::env::current_exe().map_err(|e|e.to_string())?).env("OPENHAU_SHORTCUT_ACTION",action).env("OPENHAU_SHORTCUT_NAME",name).creation_flags(0x08000000).output().map_err(|e|e.to_string())?;
        if !status.status.success(){return Err("Не удалось создать ярлык: проверьте папку рабочего стола и наличие одноимённого ярлыка.".into());}
        return Ok(());
    }
    #[cfg(not(target_os="windows"))]
    {let _=(action,title);Err("Windows desktop shortcuts are only available on Windows".into())}
}

#[tauri::command]
fn notification_sound() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    unsafe {
        use windows::Win32::UI::WindowsAndMessaging::MB_OK;
        use windows::Win32::System::Diagnostics::Debug::MessageBeep;
        use windows::Win32::Media::Audio::{PlaySoundW,SND_ALIAS,SND_ASYNC,SND_SYSTEM};
        if !PlaySoundW(windows::core::w!("Notification.Default"),None,SND_ALIAS|SND_ASYNC|SND_SYSTEM).as_bool(){MessageBeep(MB_OK).map_err(|e|e.to_string())?;}
    }
    #[cfg(target_os = "macos")]
    std::process::Command::new("/usr/bin/afplay")
        .arg("/System/Library/Sounds/Glass.aiff")
        .spawn().map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
async fn export_pdf(app:tauri::AppHandle,html:String,path:String,landscape:bool)->Result<(),String>{pdf_export::render(app,html,path,landscape).await}

#[cfg(target_os = "windows")]
fn suppress_download_flyout(window: &tauri::WebviewWindow) {
    let _ = window.with_webview(|webview| unsafe {
        use windows::core::Interface;
        use webview2_com::{IsDefaultDownloadDialogOpenChangedEventHandler, Microsoft::Web::WebView2::Win32::ICoreWebView2_9};
        if let Ok(core) = webview.controller().CoreWebView2() {
            if let Ok(core9) = core.cast::<ICoreWebView2_9>() {
                let mut token = 0i64;
                let _ = core9.add_IsDefaultDownloadDialogOpenChanged(
                    &IsDefaultDownloadDialogOpenChangedEventHandler::create(Box::new(|sender, _| {
                        if let Some(sender) = sender {
                            if let Ok(core9) = sender.cast::<ICoreWebView2_9>() {let _ = core9.CloseDefaultDownloadDialog();}
                        }
                        Ok(())
                    })), &mut token);
                let _ = core9.CloseDefaultDownloadDialog();
            }
        }
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window_config=&app.config().app.windows[0];
            app.manage(WorkspaceSize(Mutex::new(Some((tauri::LogicalSize::new(window_config.width,window_config.height).into(),false)))));
            let root = std::env::var_os("OPENHAU_DATA_DIR")
                .map(PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?);
            app.manage(Storage {
                root,
                active: Mutex::new("default".to_string()),
                file_versions: Mutex::new(std::collections::HashMap::new()),
                lock: Mutex::new(()),
            });
            let window =
                tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
                    .inner_size(640.0,420.0).min_inner_size(600.0,400.0)
                    .resizable(false).maximizable(false).center();
            // WebView2: preserve the PDF destination but suppress Edge's download flyout.
            #[cfg(target_os = "windows")]
            let window = window.on_download(|_, _| true);
            let built = window.build()?;
            #[cfg(target_os = "windows")]
            suppress_download_flyout(&built);
            #[cfg(debug_assertions)]
            if let Some(path) = std::env::var_os("OPENHAU_PDF_QA") {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    let path = PathBuf::from(path);
                    let html = "<!doctype html><html><head><meta charset=\"utf-8\"><style>th{background:#e7edf3;font-weight:bold}td,th{padding:12px;border:1px solid #999}table{border-collapse:collapse}</style></head><body><h1>OpenHaU · Demonstration</h1><p>Оборотно-сальдовая ведомость · Balanță</p><table><tr><th>Service</th><th>MDL</th></tr><tr><td>Example water</td><td>123.45</td></tr></table></body></html>";
                    let result = pdf_export::render(handle.clone(),html.into(),path.to_string_lossy().into(),true).await;
                    let _ = fs::write(path.with_extension("result.json"),serde_json::to_vec(&serde_json::json!({"success":result.is_ok(),"error":result.err()})).unwrap_or_default());
                    handle.exit(0);
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_project,
            save_project,
            read_json_file,
            write_text_file,
            write_binary_file,
            storage_path,
            runtime_platform,
            launch_action,
            launch_database_path,
            create_desktop_shortcut,
            set_workspace_mode,
            notification_sound,
            export_pdf,
            databases::database_catalog,
            databases::register_database_file,
            databases::create_database_file,
            databases::create_database,
            databases::read_database,
            databases::activate_database,
            databases::set_database_auto,
            databases::forget_database,
            backup_settings,
            configure_backups,
            backup_now,
            report_export_settings,
            configure_report_exports,
            write_report_exports
        ])
        .run(tauri::generate_context!())
        .expect("Не удалось запустить OpenHaU");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn saves_sections_and_backs_up_previous_database() {
        let root = std::env::temp_dir().join(format!(
            "openhau-storage-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let first = serde_json::json!({"format":"openhau","schema_version":1,"accounts":[],"organization":{"name":"Demo 1"}});
        save_value(first.clone(), &root).unwrap();
        let conn = connection(&root).unwrap();
        let value: String = conn
            .query_row(
                "SELECT json FROM project_sections WHERE name='organization'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&value).unwrap()["name"],
            "Demo 1"
        );
        drop(conn);
        let mut second = first;
        second["schema_version"] = serde_json::json!(2);
        second["meters"] = serde_json::json!([]);
        second["meter_values"] = serde_json::json!([]);
        second["organization"]["name"] = serde_json::json!("Demo 2");
        save_value(second.clone(), &root).unwrap();
        let mut downgrade = second;
        downgrade["schema_version"] = serde_json::json!(1);
        assert!(save_value(downgrade, &root).is_err());
        let current = connection(&root).unwrap();
        let stored_version: String = current
            .query_row(
                "SELECT json FROM project_sections WHERE name='schema_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(stored_version, "2");
        drop(current);
        let backup = fs::read_dir(root.join("backups"))
            .unwrap()
            .next()
            .unwrap()
            .unwrap()
            .path();
        let old = Connection::open(&backup).unwrap();
        let old_version: String = old
            .query_row(
                "SELECT json FROM project_sections WHERE name='schema_version'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(old_version, "1");
        let old_text: String = old
            .query_row(
                "SELECT json FROM project_sections WHERE name='organization'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&old_text).unwrap()["name"],
            "Demo 1"
        );
        // Keep isolated test artifacts for diagnosis; never touch user databases.
    }
    #[test]
    fn rejects_newer_schema_before_opening_database() {
        assert!(validate(&serde_json::json!({"format":"openhau","schema_version":99})).is_err());
    }

    fn backup_test_root() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "openhau-external-backup-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&root).unwrap();
        root
    }

    #[test]
    fn external_backup_is_opt_in_and_restore_retains_sections() {
        let root = backup_test_root();
        let project = serde_json::json!({"format":"openhau","schema_version":2,"accounts":[],"organization":{"name":"Fictional association"},"meters":[],"meter_values":[]});
        let result = save_with_copy(project.clone(), &root).unwrap();
        assert!(result["backup_path"].is_null());
        let destination = root.join("external");
        fs::create_dir(&destination).unwrap();
        backups::configure(&root, Some(destination.display().to_string())).unwrap();
        let first = save_with_copy(project.clone(), &root).unwrap();
        assert!(first["backup_warning"].is_null());
        let copied = PathBuf::from(first["backup_path"].as_str().unwrap());
        let old_bytes = fs::read(&copied).unwrap();
        assert_eq!(fs::read_dir(copied.parent().unwrap()).unwrap().count(), 1);
        let second = save_with_copy(project, &root).unwrap();
        assert_ne!(first["backup_path"], second["backup_path"]);
        assert_eq!(fs::read(&copied).unwrap(), old_bytes);
        let restored = root.join("restored");
        fs::create_dir(&restored).unwrap();
        fs::copy(copied, restored.join("openhau.sqlite")).unwrap();
        let conn = connection(&restored).unwrap();
        let org: String = conn
            .query_row(
                "SELECT json FROM project_sections WHERE name='organization'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&org).unwrap()["name"],
            "Fictional association"
        );
        backups::configure(&root, None).unwrap();
        assert!(backups::copy(&root).unwrap().is_none());
    }

    #[test]
    fn unavailable_backup_destination_does_not_undo_a_successful_save() {
        let root = backup_test_root();
        let destination = root.join("external");
        fs::create_dir(&destination).unwrap();
        backups::configure(&root, Some(destination.display().to_string())).unwrap();
        // Remove only the empty directory owned by this isolated test.
        fs::remove_dir(&destination).unwrap();
        let result=save_with_copy(serde_json::json!({"format":"openhau","schema_version":2,"accounts":[],"organization":{"name":"Still saved"}}),&root).unwrap();
        assert!(result["backup_warning"].is_string());
        assert!(!destination.exists());
        let conn = connection(&root).unwrap();
        let org: String = conn
            .query_row(
                "SELECT json FROM project_sections WHERE name='organization'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            serde_json::from_str::<Value>(&org).unwrap()["name"],
            "Still saved"
        );
    }
}
