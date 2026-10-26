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

struct Storage {
    root: PathBuf,
    lock: Mutex<()>,
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
            Some(1 | 2)
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
    let conn = connection(&storage.root)?;
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
    save_with_copy(value, &storage.root)
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
    backups::settings(&storage.root)
}
#[tauri::command]
fn configure_backups(
    directory: Option<String>,
    storage: tauri::State<Storage>,
) -> Result<Value, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    backups::configure(&storage.root, directory)
}
#[tauri::command]
fn backup_now(storage: tauri::State<Storage>) -> Result<Option<String>, String> {
    let _guard = storage.lock.lock().map_err(|e| e.to_string())?;
    backups::copy(&storage.root)
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
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > 20 * 1024 * 1024 {
        return Err("Файл больше 20 МБ".into());
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
fn storage_path(storage: tauri::State<Storage>) -> String {
    storage.root.display().to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let root = std::env::var_os("OPENHAU_DATA_DIR")
                .map(PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?);
            app.manage(Storage {
                root,
                lock: Mutex::new(()),
            });
            let window =
                tauri::WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?;
            // WebView2: preserve the PDF destination but suppress Edge's download flyout.
            #[cfg(target_os = "windows")]
            let window = window.on_download(|_, _| true);
            window.build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_project,
            save_project,
            read_json_file,
            write_text_file,
            storage_path,
            backup_settings,
            configure_backups,
            backup_now
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
