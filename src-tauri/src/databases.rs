use crate::{connection,validate,Storage};
use rusqlite::{Connection,OpenFlags};
use serde_json::{Value,json};
use std::{fs,path::PathBuf,time::{SystemTime,UNIX_EPOCH}};

fn id_ok(id:&str)->bool{!id.is_empty()&&id.len()<=64&&id.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-'||b==b'_')}
pub fn root_for(root:&PathBuf,id:&str)->Result<PathBuf,String>{if !id_ok(id){return Err("Invalid database identifier".into());}Ok(if id=="default"{root.clone()}else{root.join("databases").join(id)})}
pub fn current(storage:&Storage)->Result<PathBuf,String>{root_for(&storage.root,&storage.active.lock().map_err(|e|e.to_string())?)}
fn catalog(root:&PathBuf)->Result<Value,String>{let path=root.join("database-catalog.json");if !path.exists(){return Ok(json!({"databases":[{"id":"default","name":"OpenHaU"}],"auto":null,"last":"default"}));}let value:Value=serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;if !value["databases"].is_array(){return Err("Invalid database catalog".into());}Ok(value)}
fn write(root:&PathBuf,value:&Value)->Result<(),String>{fs::create_dir_all(root).map_err(|e|e.to_string())?;let path=root.join("database-catalog.json");let stage=root.join("database-catalog.pending.json");fs::write(&stage,serde_json::to_vec_pretty(value).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;fs::rename(stage,path).map_err(|e|e.to_string())}
fn known(root:&PathBuf,id:&str)->Result<(),String>{let c=catalog(root)?;if !id_ok(id)||!c["databases"].as_array().unwrap().iter().any(|r|r["id"].as_str()==Some(id)){return Err("Database not found".into());}Ok(())}
fn read(root:&PathBuf)->Result<Option<Value>,String>{let path=root.join("openhau.sqlite");if !path.exists(){return Ok(None);}let conn=Connection::open_with_flags(path,OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e|e.to_string())?;let mut stmt=conn.prepare("SELECT name,json FROM project_sections").map_err(|e|e.to_string())?;let rows=stmt.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).map_err(|e|e.to_string())?;let mut map=serde_json::Map::new();for row in rows{let (key,text)=row.map_err(|e|e.to_string())?;map.insert(key,serde_json::from_str(&text).map_err(|e|e.to_string())?);}if map.is_empty(){Ok(None)}else{let value=Value::Object(map);validate(&value)?;Ok(Some(value))}}
#[tauri::command]
pub fn database_catalog(storage:tauri::State<Storage>)->Result<Value,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;catalog(&storage.root)}
#[tauri::command]
pub fn create_database(name:String,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;let name=name.trim();if name.is_empty()||name.chars().count()>120{return Err("Invalid database name".into());}let mut c=catalog(&storage.root)?;let id=format!("db-{}",SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());let root=root_for(&storage.root,&id)?;connection(&root)?;c["databases"].as_array_mut().unwrap().push(json!({"id":id,"name":name}));write(&storage.root,&c)?;Ok(id)}
#[tauri::command]
pub fn read_database(id:String,storage:tauri::State<Storage>)->Result<Option<Value>,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;known(&storage.root,&id)?;read(&root_for(&storage.root,&id)?)}
#[tauri::command]
pub fn activate_database(id:String,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;known(&storage.root,&id)?;let path=root_for(&storage.root,&id)?;let mut c=catalog(&storage.root)?;c["last"]=json!(id);write(&storage.root,&c)?;*storage.active.lock().map_err(|e|e.to_string())?=id;Ok(path.display().to_string())}
#[tauri::command]
pub fn set_database_auto(id:Option<String>,storage:tauri::State<Storage>)->Result<(),String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;if let Some(id)=&id{known(&storage.root,id)?;}let mut c=catalog(&storage.root)?;c["auto"]=json!(id);write(&storage.root,&c)}

#[cfg(test)]mod tests{use super::*;#[test]fn profile_paths_reject_traversal_and_preserve_original_database(){let base=PathBuf::from("workspace");assert_eq!(root_for(&base,"default").unwrap(),base);assert_eq!(root_for(&base,"db-1").unwrap(),base.join("databases").join("db-1"));for bad in ["../x","a/b","a\\b","","a:b"]{assert!(root_for(&base,bad).is_err());}}}
