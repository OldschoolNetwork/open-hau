use crate::{connection,validate,Storage};
use rusqlite::{Connection,OpenFlags};
use serde_json::{Value,json};
use std::{fs,path::PathBuf,time::{SystemTime,UNIX_EPOCH}};

fn organization_name(reader:impl std::io::Read)->Option<String>{
    use serde::de::{IgnoredAny,MapAccess,Visitor,Error};
    use serde::Deserializer;
    struct NameVisitor<'a>(&'a mut Option<String>);
    impl<'de> Visitor<'de> for NameVisitor<'_> {
        type Value=();
        fn expecting(&self,f:&mut std::fmt::Formatter)->std::fmt::Result{f.write_str("database metadata")}
        fn visit_map<M:MapAccess<'de>>(self,mut map:M)->Result<Self::Value,M::Error>{
            while let Some(key)=map.next_key::<String>()? {
                if key=="format" {if map.next_value::<String>()?!="openhau" {return Err(M::Error::custom("protected metadata"));}}
                else if key=="organization" {
                    let value:Value=map.next_value()?;
                    *self.0=value["name"].as_str().filter(|name|!name.trim().is_empty()).map(str::to_owned);
                    // Stop the parser here instead of reading the remaining financial history.
                    return Err(M::Error::custom("metadata complete"));
                }
                else {map.next_value::<IgnoredAny>()?;}
            }
            Ok(())
        }
    }
    let mut name=None;
    let _=serde_json::Deserializer::from_reader(reader).deserialize_map(NameVisitor(&mut name));
    name
}

fn refresh_names(root:&PathBuf,mut value:Value)->Value{
    if let Some(rows)=value["databases"].as_array_mut(){for row in rows {
        let name=if let Some(path)=row["path"].as_str(){fs::File::open(path).ok().and_then(|file|organization_name(std::io::BufReader::new(file)))}
        else {row["id"].as_str().and_then(|id|root_for(root,id).ok()).and_then(|dir|Connection::open_with_flags(dir.join("openhau.sqlite"),OpenFlags::SQLITE_OPEN_READ_ONLY).ok()).and_then(|conn|conn.query_row("SELECT json FROM project_sections WHERE name='organization'",[],|r|r.get::<_,String>(0)).ok()).and_then(|text|serde_json::from_str::<Value>(&text).ok()).and_then(|org|org["name"].as_str().map(str::to_owned))};
        if let Some(name)=name {row["name"]=json!(name);}
    }}
    value
}

#[cfg(test)]mod metadata_names{
    use super::*;
    #[test]fn chooser_reads_name_without_loading_financial_sections(){
        let source=b"{\"format\":\"openhau\",\"organization\":{\"name\":\"Sample Association\"},\"meter_values\":[";
        let mut reader=std::io::Cursor::new(source);
        assert_eq!(organization_name(&mut reader).as_deref(),Some("Sample Association"));
        assert!(reader.position()<(source.len() as u64));
    }
    #[test]fn protected_or_invalid_metadata_keeps_the_cached_label(){
        assert!(organization_name(&b"{\"format\":\"openhau-encrypted\",\"payload\":\""[..]).is_none());
        assert!(organization_name(&b"not-json"[..]).is_none());
    }
}

fn id_ok(id:&str)->bool{let value=id.strip_prefix("file:").unwrap_or(id);!value.is_empty()&&id.len()<=64&&value.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-'||b==b'_')}
pub fn root_for(root:&PathBuf,id:&str)->Result<PathBuf,String>{if !id_ok(id){return Err("Invalid database identifier".into());}Ok(if id=="default"{root.clone()}else{root.join("databases").join(id.strip_prefix("file:").map(|value|format!("file-{value}")).unwrap_or_else(||id.to_string()))})}
pub fn current(storage:&Storage)->Result<PathBuf,String>{root_for(&storage.root,&storage.active.lock().map_err(|e|e.to_string())?)}
pub fn linked_path(storage:&Storage)->Result<Option<PathBuf>,String>{let id=storage.active.lock().map_err(|e|e.to_string())?.clone();file_for(&storage.root,&id)}
fn file_for(root:&PathBuf,id:&str)->Result<Option<PathBuf>,String>{let c=catalog(root)?;Ok(c["databases"].as_array().ok_or("Invalid catalog")?.iter().find(|r|r["id"].as_str()==Some(id)).and_then(|r|r["path"].as_str()).map(PathBuf::from))}
#[tauri::command]
pub fn register_database_file(path:String,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;register(&storage,path)}
fn register(storage:&Storage,path:String)->Result<String,String>{let path=PathBuf::from(path).canonicalize().map_err(|e|e.to_string())?;let (value,_)=crate::portable::read(&path)?;let text=path.display().to_string();let mut c=catalog(&storage.root)?;if let Some(existing)=c["databases"].as_array().unwrap().iter().find(|r|r["path"].as_str().is_some_and(|p|if cfg!(windows){p.eq_ignore_ascii_case(&text)}else{p==text})){return Ok(existing["id"].as_str().ok_or("Invalid catalog id")?.to_string());}let id=format!("file:{}",SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());c["databases"].as_array_mut().unwrap().push(json!({"id":id,"name":value["organization"]["name"].as_str().unwrap_or("OpenHaU"),"path":text}));write(&storage.root,&c)?;Ok(id)}
#[tauri::command]
pub fn create_database_file(path:String,value:Value,password:Option<String>,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;if let Some(password)=password{crate::portable::create_protected(&PathBuf::from(&path),&value,password)?;}else{crate::portable::create(&PathBuf::from(&path),&value)?;}register(&storage,path)}
fn catalog(root:&PathBuf)->Result<Value,String>{let path=root.join("database-catalog.json");if !path.exists(){return Ok(json!({"databases":[{"id":"default","name":"OpenHaU"}],"auto":null,"last":"default"}));}let value:Value=serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;if !value["databases"].is_array(){return Err("Invalid database catalog".into());}Ok(value)}
fn write(root:&PathBuf,value:&Value)->Result<(),String>{fs::create_dir_all(root).map_err(|e|e.to_string())?;let path=root.join("database-catalog.json");let stage=root.join("database-catalog.pending.json");fs::write(&stage,serde_json::to_vec_pretty(value).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;fs::rename(stage,path).map_err(|e|e.to_string())}
fn known(root:&PathBuf,id:&str)->Result<(),String>{let c=catalog(root)?;if !id_ok(id)||!c["databases"].as_array().unwrap().iter().any(|r|r["id"].as_str()==Some(id)){return Err("Database not found".into());}Ok(())}
fn read(root:&PathBuf)->Result<Option<Value>,String>{let path=root.join("openhau.sqlite");if !path.exists(){return Ok(None);}let conn=Connection::open_with_flags(path,OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e|e.to_string())?;let mut stmt=conn.prepare("SELECT name,json FROM project_sections").map_err(|e|e.to_string())?;let rows=stmt.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).map_err(|e|e.to_string())?;let mut map=serde_json::Map::new();for row in rows{let (key,text)=row.map_err(|e|e.to_string())?;map.insert(key,serde_json::from_str(&text).map_err(|e|e.to_string())?);}if map.is_empty(){Ok(None)}else{let value=Value::Object(map);validate(&value)?;Ok(Some(value))}}
#[tauri::command]
pub fn database_catalog(storage:tauri::State<Storage>)->Result<Value,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;Ok(refresh_names(&storage.root,catalog(&storage.root)?))}
#[tauri::command]
pub fn create_database(name:String,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;let name=name.trim();if name.is_empty()||name.chars().count()>120{return Err("Invalid database name".into());}let mut c=catalog(&storage.root)?;let id=format!("db-{}",SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos());let root=root_for(&storage.root,&id)?;connection(&root)?;c["databases"].as_array_mut().unwrap().push(json!({"id":id,"name":name}));write(&storage.root,&c)?;Ok(id)}
#[tauri::command]
pub fn read_database(id:String,storage:tauri::State<Storage>)->Result<Option<Value>,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;known(&storage.root,&id)?;if let Some(path)=file_for(&storage.root,&id)?{let (value,hash)=crate::portable::read(&path)?;storage.file_versions.lock().map_err(|e|e.to_string())?.insert(path,hash);return Ok(Some(value));}read(&root_for(&storage.root,&id)?)}
#[tauri::command]
pub fn activate_database(id:String,storage:tauri::State<Storage>)->Result<String,String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;known(&storage.root,&id)?;let path=root_for(&storage.root,&id)?;let linked=file_for(&storage.root,&id)?;if let Some(file)=&linked{let (_,hash)=crate::portable::read(file)?;let mut versions=storage.file_versions.lock().map_err(|e|e.to_string())?;if versions.get(file).is_some_and(|expected|*expected!=hash){return Err("Database changed while opening; open it again".into());}versions.insert(file.clone(),hash);}let mut c=catalog(&storage.root)?;c["last"]=json!(id);write(&storage.root,&c)?;*storage.active.lock().map_err(|e|e.to_string())?=id;Ok(linked.unwrap_or(path).display().to_string())}
#[tauri::command]
pub fn set_database_auto(id:Option<String>,storage:tauri::State<Storage>)->Result<(),String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;if let Some(id)=&id{known(&storage.root,id)?;}let mut c=catalog(&storage.root)?;c["auto"]=json!(id);write(&storage.root,&c)}

fn without_entry(mut value:Value,id:&str)->Result<Value,String>{let rows=value["databases"].as_array_mut().ok_or("Invalid database catalog")?;rows.retain(|row|row["id"].as_str()!=Some(id));let fallback=rows.first().and_then(|r|r["id"].as_str()).unwrap_or("").to_string();if value["auto"].as_str()==Some(id){value["auto"]=Value::Null;}if value["last"].as_str()==Some(id){value["last"]=json!(fallback);}Ok(value)}
#[tauri::command]
pub fn forget_database(id:String,storage:tauri::State<Storage>)->Result<(),String>{let _guard=storage.lock.lock().map_err(|e|e.to_string())?;forget(&storage,&id)}
fn forget(storage:&Storage,id:&str)->Result<(),String>{known(&storage.root,id)?;let updated=without_entry(catalog(&storage.root)?,id)?;write(&storage.root,&updated)?;let mut active=storage.active.lock().map_err(|e|e.to_string())?;if active.as_str()==id{active.clear();}Ok(())}

#[cfg(test)]mod tests{use super::*;#[test]fn profile_paths_reject_traversal_and_preserve_original_database(){let base=PathBuf::from("workspace");assert_eq!(root_for(&base,"default").unwrap(),base);assert_eq!(root_for(&base,"db-1").unwrap(),base.join("databases").join("db-1"));assert_eq!(root_for(&base,"file:123").unwrap(),base.join("databases").join("file-123"));for bad in ["file:","file:../x","../x","a/b","a\\b","","a:b"]{assert!(root_for(&base,bad).is_err());}}}

#[cfg(test)]mod forget_tests{
 use super::*;
 #[test]fn forgetting_a_database_preserves_files_and_clears_automatic_open(){
  let root=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tmp").join(format!("forget-db-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));fs::create_dir_all(&root).unwrap();
  let database=root.join("example.json");fs::write(&database,b"fictional database contents").unwrap();
  let internal=root_for(&root,"db-example").unwrap();fs::create_dir_all(&internal).unwrap();fs::write(internal.join("openhau.sqlite"),b"fictional internal database").unwrap();
  let storage=Storage{root:root.clone(),active:std::sync::Mutex::new("file:1".into()),lock:std::sync::Mutex::new(()),file_versions:std::sync::Mutex::new(std::collections::HashMap::new())};
  write(&root,&json!({"databases":[{"id":"file:1","name":"Example","path":database},{"id":"db-example","name":"Internal"}],"auto":"file:1","last":"file:1"})).unwrap();
  forget(&storage,"file:1").unwrap();assert_eq!(fs::read(&database).unwrap(),b"fictional database contents");assert_eq!(catalog(&root).unwrap()["auto"],Value::Null);assert_eq!(catalog(&root).unwrap()["last"],json!("db-example"));assert!(storage.active.lock().unwrap().is_empty());
  forget(&storage,"db-example").unwrap();assert_eq!(fs::read(internal.join("openhau.sqlite")).unwrap(),b"fictional internal database");assert!(catalog(&root).unwrap()["databases"].as_array().unwrap().is_empty());
 }
}
