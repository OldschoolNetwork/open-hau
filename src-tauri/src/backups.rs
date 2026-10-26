use rusqlite::{Connection, OpenFlags};
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

pub fn settings(root: &Path) -> Result<Value, String> {
    let path = root.join("backup-settings.json");
    if !path.exists() {
        return Ok(json!({"directory":null}));
    }
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let value: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    if !value["directory"].is_null() && !value["directory"].is_string() {
        return Err("Invalid backup destination settings".into());
    }
    Ok(json!({"directory":value["directory"]}))
}

pub fn configure(root: &Path, directory: Option<String>) -> Result<Value, String> {
    let directory = if let Some(value) = directory {
        let path = PathBuf::from(value);
        if !path.is_absolute() || !path.is_dir() {
            return Err("Select an existing absolute destination folder".into());
        }
        Some(
            path.canonicalize()
                .map_err(|e| e.to_string())?
                .display()
                .to_string(),
        )
    } else {
        None
    };
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let value = json!({"directory":directory});
    let temp = root.join("backup-settings.next.json");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, root.join("backup-settings.json")).map_err(|e| e.to_string())?;
    Ok(value)
}

pub fn copy(root: &Path) -> Result<Option<String>, String> {
    let config = settings(root)?;
    let Some(directory) = config["directory"].as_str() else {
        return Ok(None);
    };
    let destination = PathBuf::from(directory);
    // Do not recreate a missing removable/network destination as a misleading local folder.
    if !destination.is_dir() {
        return Err("Backup destination is unavailable".into());
    }
    let source = root.join("openhau.sqlite");
    let conn = Connection::open_with_flags(&source, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| e.to_string())?;
    let count: i64 = conn
        .query_row("SELECT count(*) FROM project_sections", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        return Err("Save a project before creating an external backup".into());
    }
    let stamp: String = conn
        .query_row("SELECT strftime('%Y-%m-%dT%H-%M-%SZ','now')", [], |r| {
            r.get(0)
        })
        .map_err(|e| e.to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let folder = destination.join(format!("OpenHaU-{stamp}-{nonce}"));
    // A new directory owns this attempt. Existing backups are never overwritten or removed.
    fs::create_dir(&folder).map_err(|e| e.to_string())?;
    let partial = folder.join("openhau.sqlite.partial");
    conn.backup(rusqlite::DatabaseName::Main, &partial, None)
        .map_err(|e| e.to_string())?;
    let backup = Connection::open_with_flags(&partial, OpenFlags::SQLITE_OPEN_READ_WRITE)
        .map_err(|e| e.to_string())?;
    // Finish WAL state on our new copy so the verified deliverable is one standalone file.
    backup
        .execute_batch("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;")
        .map_err(|e| e.to_string())?;
    let check: String = backup
        .query_row("PRAGMA quick_check", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if check != "ok" {
        return Err("Backup integrity check failed".into());
    }
    fn sections(conn: &Connection) -> Result<Vec<(String, String)>, String> {
        let mut statement = conn
            .prepare("SELECT name,json FROM project_sections ORDER BY name")
            .map_err(|e| e.to_string())?;
        let rows = statement
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
    if sections(&conn)? != sections(&backup)? {
        return Err("Backup content verification failed".into());
    }
    drop(backup);
    let final_path = folder.join("openhau.sqlite");
    fs::rename(partial, &final_path).map_err(|e| e.to_string())?;
    Ok(Some(final_path.display().to_string()))
}
