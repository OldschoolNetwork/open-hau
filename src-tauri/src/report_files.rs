use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const FORMATS: [&str; 3] = ["csv", "xml", "html"];

pub fn settings(root: &Path) -> Result<Value, String> {
    let path = root.join("report-export-settings.json");
    if !path.exists() {
        return Ok(json!({"directory":null,"trigger":"close","formats":["csv"]}));
    }
    let value: Value = serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    validate(&value)?;
    Ok(value)
}
fn validate(value: &Value) -> Result<(), String> {
    if !value["directory"].is_null() && !value["directory"].is_string() {
        return Err("Invalid report folder".into());
    }
    if !matches!(value["trigger"].as_str(), Some("save" | "close")) {
        return Err("Invalid report trigger".into());
    }
    let formats = value["formats"]
        .as_array()
        .ok_or("Invalid report formats")?;
    if formats.is_empty()
        || formats.len() > 3
        || formats
            .iter()
            .any(|f| !FORMATS.contains(&f.as_str().unwrap_or("")))
    {
        return Err("Select CSV, XML or HTML".into());
    }
    let mut unique = formats.clone();
    unique.sort_by_key(|x| x.as_str().unwrap_or("").to_string());
    unique.dedup();
    if unique.len() != formats.len() {
        return Err("Duplicate report formats".into());
    }
    Ok(())
}
pub fn configure(root: &Path, mut value: Value) -> Result<Value, String> {
    validate(&value)?;
    if let Some(directory) = value["directory"].as_str() {
        let path = PathBuf::from(directory);
        if !path.is_absolute() || !path.is_dir() {
            return Err("Select an existing absolute report folder".into());
        }
        value["directory"] = json!(path
            .canonicalize()
            .map_err(|e| e.to_string())?
            .display()
            .to_string());
    }
    fs::create_dir_all(root).map_err(|e| e.to_string())?;
    let temp = root.join("report-export-settings.next.json");
    fs::write(
        &temp,
        serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, root.join("report-export-settings.json")).map_err(|e| e.to_string())?;
    Ok(value)
}

pub fn write(
    root: &Path,
    reason: &str,
    period: &str,
    files: Value,
) -> Result<Option<String>, String> {
    let config = settings(root)?;
    let Some(directory) = config["directory"].as_str() else {
        return Ok(None);
    };
    if !["save", "close", "manual"].contains(&reason) {
        return Err("Invalid report trigger".into());
    }
    if reason != "manual" && config["trigger"] == "close" && reason != "close" {
        return Ok(None);
    }
    if period.len() != 7
        || period.as_bytes()[4] != b'-'
        || !period
            .chars()
            .enumerate()
            .all(|(i, c)| i == 4 || c.is_ascii_digit())
        || !("01"..="12").contains(&&period[5..])
    {
        return Err("Invalid report period".into());
    }
    let bodies = files.as_object().ok_or("Invalid report payload")?;
    let formats = config["formats"]
        .as_array()
        .ok_or("Invalid report formats")?;
    if bodies.len() != formats.len()
        || formats
            .iter()
            .any(|f| !bodies.contains_key(f.as_str().unwrap_or("")))
    {
        return Err("Report formats changed; retry export".into());
    }
    for (format, body) in bodies {
        if !FORMATS.contains(&format.as_str())
            || body.as_str().map_or(true, |s| s.len() > 20 * 1024 * 1024)
        {
            return Err("Invalid report file content".into());
        }
    }
    let destination = PathBuf::from(directory);
    if !destination.is_dir() {
        return Err("Report destination is unavailable".into());
    }
    let last_path = root.join("report-export-last.json");
    if let Ok(bytes) = fs::read(&last_path) {
        if let Ok(last) = serde_json::from_slice::<Value>(&bytes) {
            if last["directory"] == config["directory"]
                && last["period"] == period
                && last["formats"] == config["formats"]
            {
                if let Some(folder) = last["folder"]
                    .as_str()
                    .filter(|s| s.starts_with("OpenHaU-reports-") && !s.contains(['/', '\\']))
                {
                    let path = destination.join(folder);
                    if bodies.iter().all(|(format, body)| {
                        fs::read_to_string(path.join(format!("balances-{period}.{format}")))
                            .ok()
                            .as_deref()
                            == body.as_str()
                    }) {
                        return Ok(Some(path.display().to_string()));
                    }
                }
            }
        }
    }
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let folder = format!("OpenHaU-reports-{period}-{nonce}");
    let path = destination.join(&folder);
    fs::create_dir(&path).map_err(|e| e.to_string())?;
    for (format, body) in bodies {
        let text = body.as_str().ok_or("Invalid report content")?;
        let filename = format!("balances-{period}.{format}");
        let partial = path.join(format!("{filename}.partial"));
        fs::write(&partial, text.as_bytes()).map_err(|e| e.to_string())?;
        if fs::read(&partial).map_err(|e| e.to_string())? != text.as_bytes() {
            return Err("Report verification failed".into());
        }
        fs::rename(partial, path.join(filename)).map_err(|e| e.to_string())?;
    }
    let marker = json!({"directory":config["directory"],"period":period,"formats":config["formats"],"folder":folder});
    fs::write(
        path.join("complete.json"),
        serde_json::to_vec_pretty(&marker).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let temp = root.join("report-export-last.next.json");
    fs::write(
        &temp,
        serde_json::to_vec(&marker).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(temp, last_path).map_err(|e| e.to_string())?;
    Ok(Some(path.display().to_string()))
}
