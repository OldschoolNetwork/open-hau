use crate::{validate, Storage};
use serde_json::{json, Value};
use std::{fs::{self,OpenOptions},io::Write,path::{Path,PathBuf},hash::{Hash,Hasher},collections::hash_map::DefaultHasher,time::{SystemTime,UNIX_EPOCH}};

fn fingerprint(bytes:&[u8])->u64{let mut h=DefaultHasher::new();bytes.hash(&mut h);h.finish()}
struct SaveLock { _file:fs::File, #[cfg(not(windows))] path:PathBuf }
#[cfg(not(windows))]impl Drop for SaveLock{fn drop(&mut self){let _=fs::remove_file(&self.path);}}
fn lock_file(path:&Path)->Result<SaveLock,String>{
 let name=path.file_name().ok_or("Invalid database filename")?.to_string_lossy();let lock=path.with_file_name(format!(".{name}.openhau-lock"));
 let mut options=OpenOptions::new();options.write(true);
 #[cfg(windows)]{use std::os::windows::fs::OpenOptionsExt;options.create(true).share_mode(0);}
 #[cfg(not(windows))]{options.create_new(true);}
 let file=options.open(&lock).map_err(|_|"База сохраняется другой копией программы или папка недоступна для записи.".to_string())?;
 Ok(SaveLock{_file:file,#[cfg(not(windows))]path:lock})
}
pub fn read(path:&Path)->Result<(Value,u64),String>{
 if fs::metadata(path).map_err(|e|e.to_string())?.len()>96*1024*1024{return Err("Database exceeds file size limit".into());}
 let bytes=fs::read(path).map_err(|e|e.to_string())?;
 let text=std::str::from_utf8(&bytes).map_err(|e|e.to_string())?.trim_start_matches('\u{feff}');
 let value:Value=serde_json::from_str(text).map_err(|e|e.to_string())?;let value=crate::encrypted::decode(path,value)?;validate(&value)?;Ok((value,fingerprint(&bytes)))
}
fn stamp()->Result<u128,String>{Ok(SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos())}
fn bytes(value:&Value)->Result<Vec<u8>,String>{validate(value)?;let data=serde_json::to_vec_pretty(value).map_err(|e|e.to_string())?;if data.len()>96*1024*1024{return Err("Database exceeds file size limit".into());}Ok(data)}
fn stage(path:&Path,data:&[u8])->Result<PathBuf,String>{let name=path.file_name().ok_or("Invalid database filename")?.to_string_lossy();let staged=path.with_file_name(format!(".{name}.{}.pending",stamp()?));let mut file=OpenOptions::new().write(true).create_new(true).open(&staged).map_err(|e|e.to_string())?;file.write_all(data).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;Ok(staged)}
pub fn create(path:&Path,value:&Value)->Result<(),String>{
 if !path.is_absolute(){return Err("Select an absolute database path".into());}
 let data=bytes(value)?;
 let mut file=OpenOptions::new().write(true).create_new(true).open(path).map_err(|e|format!("Cannot create database; choose a new filename: {e}"))?;
 file.write_all(&data).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;Ok(())
}
#[cfg(test)]
pub fn remember(storage:&Storage,path:&Path)->Result<(),String>{let (_,hash)=read(path)?;storage.file_versions.lock().map_err(|e|e.to_string())?.insert(path.to_path_buf(),hash);Ok(())}
pub fn backup(path:&Path,settings_root:&PathBuf)->Result<Option<String>,String>{let config=crate::backups::settings(settings_root)?;let Some(folder)=config["directory"].as_str()else{return Ok(None)};let folder=PathBuf::from(folder);if !folder.is_dir(){return Err("Backup destination is unavailable".into());}let target=folder.join(format!("OpenHaU-{}.odb",stamp()?));let bytes=fs::read(path).map_err(|e|e.to_string())?;let mut file=OpenOptions::new().create_new(true).write(true).open(&target).map_err(|e|e.to_string())?;file.write_all(&bytes).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;Ok(Some(target.display().to_string()))}
pub fn save(storage:&Storage,path:&Path,value:Value,settings_root:&PathBuf)->Result<Value,String>{
 let _file_lock=lock_file(path)?;
 let (stored,current)=read(path)?;
 let mut versions=storage.file_versions.lock().map_err(|e|e.to_string())?;
 if versions.get(path)!=Some(&current){return Err("Файл базы изменён другой программой. Откройте его заново; несохранённые изменения можно экспортировать отдельно.".into());}
 if stored["schema_version"].as_u64()>value["schema_version"].as_u64(){return Err("Cannot overwrite a newer database format".into());}
 bytes(&value)?;let data=crate::encrypted::encode(path,&value)?;
 if fingerprint(&data)==current{return Ok(json!({"path":path.display().to_string(),"backup_path":null,"backup_warning":null}));}
 let staged=stage(path,&data).map_err(|e|format!("Cannot stage database file: {e}"))?;
 let original_name=path.file_name().ok_or("Invalid database filename")?.to_string_lossy();
 let backup=path.with_file_name(format!("{original_name}.{}.bak",stamp()?));
 let mut previous=OpenOptions::new().write(true).create_new(true).open(&backup).map_err(|e|e.to_string())?;
 let old=fs::read(path).map_err(|e|e.to_string())?;
 if fingerprint(&old)!=current{return Err("Database changed during save; reopen it before saving".into());}
 previous.write_all(&old).and_then(|_|previous.sync_all()).map_err(|e|e.to_string())?;
 fs::rename(&staged,path).map_err(|e|format!("Cannot replace database file: {e}"))?;versions.insert(path.to_path_buf(),fingerprint(&data));
 let external=(||->Result<Option<String>,String>{let config=crate::backups::settings(settings_root)?;let Some(folder)=config["directory"].as_str()else{return Ok(None)};let folder=PathBuf::from(folder);if !folder.is_dir(){return Err("Backup destination is unavailable".into());}let target=folder.join(format!("OpenHaU-{}.odb",stamp()?));let mut file=OpenOptions::new().create_new(true).write(true).open(&target).map_err(|e|e.to_string())?;file.write_all(&data).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;Ok(Some(target.display().to_string()))})();
 let (backup_path,warning)=match external{Ok(Some(p))=>(p,None),Ok(None)=>(backup.display().to_string(),None),Err(e)=>(backup.display().to_string(),Some(e))};
 Ok(json!({"path":path.display().to_string(),"backup_path":backup_path,"backup_warning":warning}))
}

#[cfg(test)]mod tests{
 use super::*;use std::{sync::Mutex,collections::HashMap};
 #[test]fn portable_save_preserves_settings_and_refuses_external_changes(){
  let root=PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../tmp").join(format!("openhau-portable-{}",stamp().unwrap()));fs::create_dir_all(&root).unwrap();
  let path=root.join("association.openhau.json");let settings=root.join("profile");
  let original=json!({"format":"openhau","schema_version":2,"accounts":[],"organization":{"name":"Example"},"settings":{"date_format":"iso"}});
  create(&path,&original).unwrap();assert!(create(&path,&original).is_err());
  let storage=Storage{root:root.clone(),active:Mutex::new("default".into()),lock:Mutex::new(()),file_versions:Mutex::new(HashMap::new())};
  remember(&storage,&path).unwrap();let mut next=original.clone();next["organization"]["name"]=json!("Updated example");next["settings"]["date_format"]=json!("dmy");
  let result=save(&storage,&path,next.clone(),&settings).unwrap();assert_eq!(read(&path).unwrap().0,next);assert_eq!(read(Path::new(result["backup_path"].as_str().unwrap())).unwrap().0,original);
  let portable_copy=root.join("moved.openhau.json");fs::copy(&path,&portable_copy).unwrap();assert_eq!(read(&portable_copy).unwrap().0,next);
  let odb_copy=root.join("association.odb");create(&odb_copy,&next).unwrap();assert_eq!(read(&odb_copy).unwrap().0,next);
  let foreign=root.join("foreign.odb");fs::write(&foreign,b"PK\x03\x04not an OpenHaU JSON database").unwrap();assert!(read(&foreign).is_err());assert_eq!(fs::read(&foreign).unwrap(),b"PK\x03\x04not an OpenHaU JSON database");
  let mut external=next.clone();external["organization"]["name"]=json!("External edit");fs::write(&path,serde_json::to_vec(&external).unwrap()).unwrap();assert!(save(&storage,&path,next,&settings).is_err());assert_eq!(read(&path).unwrap().0,external);
 }
}

pub fn change_password(storage:&Storage,path:&Path,password:String)->Result<Value,String>{
 let _lock=lock_file(path)?;let (value,hash)=read(path)?;if storage.file_versions.lock().map_err(|e|e.to_string())?.get(path)!=Some(&hash){return Err("Database changed; reopen before changing its password".into());}
 let password=zeroize::Zeroizing::new(password);let data=crate::encrypted::new_password(&value,password.to_string())?;if data.len()>96*1024*1024{return Err("Encrypted database exceeds file limit".into());}let staged=stage(path,&data)?;let original=fs::read(path).map_err(|e|e.to_string())?;if fingerprint(&original)!=hash{return Err("Database changed during password update".into());}
 let backup=path.with_file_name(format!("{}.{}.before-password.bak",path.file_name().ok_or("Invalid database filename")?.to_string_lossy(),stamp()?));let mut old=OpenOptions::new().write(true).create_new(true).open(&backup).map_err(|e|e.to_string())?;old.write_all(&original).and_then(|_|old.sync_all()).map_err(|e|e.to_string())?;fs::rename(staged,path).map_err(|e|e.to_string())?;
 storage.file_versions.lock().map_err(|e|e.to_string())?.insert(path.to_path_buf(),fingerprint(&data));crate::encrypted::unlock(path,password.to_string())?;Ok(json!({"backup_path":backup.display().to_string(),"encrypted":crate::encrypted::protected(&serde_json::from_slice::<Value>(&data).map_err(|e|e.to_string())?)}))
}

pub fn create_protected(path:&Path,value:&Value,password:String)->Result<(),String>{
 if !path.is_absolute(){return Err("Select an absolute database path".into());}bytes(value)?;let password=zeroize::Zeroizing::new(password);let data=crate::encrypted::new_password(value,password.to_string())?;let mut file=OpenOptions::new().write(true).create_new(true).open(path).map_err(|e|e.to_string())?;file.write_all(&data).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;crate::encrypted::unlock(path,password.to_string())?;Ok(())
}
