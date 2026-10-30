use std::collections::HashMap;

/// Symbols are rendered from the running Mac's own AppKit, never redistributed
/// as an Apple font or an asset in the Windows package.
#[tauri::command]
pub async fn macos_symbols(app:tauri::AppHandle,names:Vec<String>)->Result<HashMap<String,String>,String>{
    if names.len()>128||names.iter().any(|n|n.len()>80||!n.chars().all(|c|c.is_ascii_alphanumeric()||c=='.')){return Err("Invalid symbol request".into());}
    #[cfg(target_os="macos")]
    {
        let (tx,rx)=std::sync::mpsc::channel();
        app.run_on_main_thread(move||{let _=tx.send(render(names));}).map_err(|e|e.to_string())?;
        return tauri::async_runtime::spawn_blocking(move||rx.recv_timeout(std::time::Duration::from_secs(15)).map_err(|e|e.to_string())).await.map_err(|e|e.to_string())?;
    }
    #[cfg(not(target_os="macos"))]
    {let _=(app,names);Ok(HashMap::new())}
}

#[cfg(target_os="macos")]
fn render(names:Vec<String>)->HashMap<String,String>{
    use base64::{Engine,engine::general_purpose::STANDARD};
    use objc2::{class,msg_send,rc::{Retained,autoreleasepool},runtime::AnyObject};
    use objc2_foundation::{NSString,NSData,NSDictionary};
    autoreleasepool(|_|{
        let mut result=HashMap::new();
        for name in names {
            let symbol=NSString::from_str(&name);
            // NSImage system symbols are available since Big Sur. Unknown names
            // return nil, allowing the frontend to use its vector fallback.
            unsafe{
                let image:Option<Retained<AnyObject>>=msg_send![class!(NSImage),imageWithSystemSymbolName:&*symbol,accessibilityDescription:Option::<&NSString>::None];
                let Some(image)=image else{continue};
                let data:Option<Retained<NSData>>=msg_send![&*image,TIFFRepresentation];
                let Some(data)=data else{continue};
                let bitmap:Option<Retained<AnyObject>>=msg_send![class!(NSBitmapImageRep),imageRepWithData:&*data];
                let Some(bitmap)=bitmap else{continue};
                let properties=NSDictionary::<NSString,AnyObject>::new();
                let png:Option<Retained<NSData>>=msg_send![&*bitmap,representationUsingType:4usize,properties:&*properties];
                if let Some(png)=png{result.insert(name,format!("data:image/png;base64,{}",STANDARD.encode(png.as_bytes())));}
            }
        }
        result
    })
}
