use serde::Deserialize;
use std::{
    collections::{HashMap, HashSet},
    sync::Mutex,
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

#[derive(Default)]
pub struct NativeMenuState(pub Mutex<HashMap<String, String>>);
#[derive(Deserialize)]
pub struct Entry {
    label: String,
    action: Option<String>,
    accelerator: Option<String>,
    #[serde(default)]
    children: Vec<Entry>,
}

fn append(
    app: &tauri::AppHandle,
    parent: &Submenu<tauri::Wry>,
    entries: &[Entry],
    map: &mut HashMap<String, String>,
    used: &mut HashSet<String>,
    depth: usize,
) -> tauri::Result<()> {
    if depth > 8 {
        return Ok(());
    }
    for entry in entries.iter().take(200) {
        if !entry.children.is_empty() {
            let child = Submenu::new(app, &entry.label, true)?;
            append(app, &child, &entry.children, map, used, depth + 1)?;
            parent.append(&child)?;
        } else {
            let id = format!("openhau-native-{}", map.len());
            let action = entry.action.clone().unwrap_or_default();
            let accelerator = entry
                .accelerator
                .as_deref()
                .filter(|key| used.insert(key.to_string()));
            let item = MenuItem::with_id(
                app,
                id.clone(),
                &entry.label,
                !action.is_empty(),
                accelerator,
            )?;
            map.insert(id, action);
            parent.append(&item)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn configure_native_menu(
    app: tauri::AppHandle,
    state: tauri::State<NativeMenuState>,
    menus: Vec<Entry>,
    language: String,
    workspace: bool,
) -> Result<bool, String> {
    if !cfg!(target_os = "macos") {
        return Ok(false);
    }
    if menus.len() > 24 {
        return Err("Too many menus".into());
    }
    let choose = |ru: &str, ro: &str, en: &str| match language.as_str() {
        "ru" => ru.to_string(),
        "ro" => ro.to_string(),
        _ => en.to_string(),
    };
    let build = || -> tauri::Result<()> {
        let menu = Menu::new(&app)?;
        let mut map = HashMap::new();
        let mut used = HashSet::new();
        let app_menu = Submenu::new(&app, "OpenHaU", true)?;
        append(
            &app,
            &app_menu,
            &[
                Entry {
                    label: choose("О программе OpenHaU", "Despre OpenHaU", "About OpenHaU"),
                    action: Some("about".into()),
                    accelerator: None,
                    children: vec![],
                },
                Entry {
                    label: choose("Настройки…", "Preferințe…", "Preferences…"),
                    action: workspace.then(|| "settings".into()),
                    accelerator: Some("Cmd+,".into()),
                    children: vec![],
                },
            ],
            &mut map,
            &mut used,
            0,
        )?;
        app_menu.append(&PredefinedMenuItem::separator(&app)?)?;
        app_menu.append(&PredefinedMenuItem::services(&app, None)?)?;
        app_menu.append(&PredefinedMenuItem::separator(&app)?)?;
        app_menu.append(&PredefinedMenuItem::hide(&app, None)?)?;
        app_menu.append(&PredefinedMenuItem::hide_others(&app, None)?)?;
        app_menu.append(&PredefinedMenuItem::show_all(&app, None)?)?;
        app_menu.append(&PredefinedMenuItem::separator(&app)?)?;
        append(
            &app,
            &app_menu,
            &[Entry {
                label: choose("Завершить OpenHaU", "Închide OpenHaU", "Quit OpenHaU"),
                action: Some("file:exit".into()),
                accelerator: Some("Cmd+Q".into()),
                children: vec![],
            }],
            &mut map,
            &mut used,
            0,
        )?;
        menu.append(&app_menu)?;
        for root in &menus {
            let submenu = Submenu::new(&app, &root.label, true)?;
            if root.action.as_deref() == Some("native-edit") {
                submenu.append_items(&[
                    &PredefinedMenuItem::undo(&app, None)?,
                    &PredefinedMenuItem::redo(&app, None)?,
                    &PredefinedMenuItem::separator(&app)?,
                    &PredefinedMenuItem::cut(&app, None)?,
                    &PredefinedMenuItem::copy(&app, None)?,
                    &PredefinedMenuItem::paste(&app, None)?,
                    &PredefinedMenuItem::select_all(&app, None)?,
                ])?;
            } else {
                append(&app, &submenu, &root.children, &mut map, &mut used, 0)?;
            }
            menu.append(&submenu)?;
        }
        app.set_menu(menu)?;
        *state.0.lock().unwrap_or_else(|e| e.into_inner()) = map;
        Ok(())
    };
    build().map(|_| true).map_err(|e| e.to_string())
}

pub fn dispatch(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    let state = app.state::<NativeMenuState>();
    let action = state
        .0
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(event.id().as_ref())
        .cloned();
    if let Some(action) = action.filter(|value| !value.is_empty()) {
        let _ = app.emit("openhau:native-command", action);
    }
}
