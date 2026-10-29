#[cfg(target_os="windows")]
pub async fn render(app:tauri::AppHandle,html:String,path:String,landscape:bool)->Result<(),String>{
    use std::{fs,path::PathBuf,sync::{Arc,atomic::{AtomicBool,Ordering},mpsc},time::{Duration,SystemTime,UNIX_EPOCH}};
    use tauri::{WebviewWindowBuilder,WebviewUrl,webview::PageLoadEvent};
    use windows::core::{HSTRING,Interface};
    use webview2_com::{PrintToPdfCompletedHandler,Microsoft::Web::WebView2::Win32::{ICoreWebView2_7,ICoreWebView2Environment6,COREWEBVIEW2_PRINT_ORIENTATION_LANDSCAPE,COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT}};
    if html.len()>128*1024*1024{return Err("PDF document exceeds the size limit".into());}
    let output=PathBuf::from(path);if !output.is_absolute()||output.extension().and_then(|s|s.to_str()).map(|s|!s.eq_ignore_ascii_case("pdf")).unwrap_or(true){return Err("Select an absolute PDF destination".into());}
    let stamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
    let temporary=std::env::temp_dir().join(format!("openhau-pdf-{stamp}.html"));
    let staged=output.with_file_name(format!(".openhau-pdf-{stamp}.pdf"));
    let csp="<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'\">";
    let secured=if html.contains("<head>"){html.replacen("<head>",&format!("<head>{csp}"),1)}else{format!("{csp}{html}")};
    fs::write(&temporary,secured).map_err(|e|e.to_string())?;
    let url=tauri::Url::from_file_path(&temporary).map_err(|_|"Invalid temporary PDF path")?;
    let (tx,rx)=mpsc::channel::<Result<(),String>>();let started=Arc::new(AtomicBool::new(false));let pdf_path=staged.clone();
    let window=WebviewWindowBuilder::new(&app,format!("pdf-{stamp}"),WebviewUrl::External(url)).visible(false).skip_taskbar(true).inner_size(1100.0,900.0).on_page_load(move |window,payload|{
        if !matches!(payload.event(),PageLoadEvent::Finished)||started.swap(true,Ordering::SeqCst){return;}
        let tx=tx.clone();let failure=tx.clone();let pdf_path=pdf_path.clone();
        if let Err(e)=window.with_webview(move |webview|unsafe{
            let begin=(||->windows::core::Result<()>{
                let core=webview.controller().CoreWebView2()?.cast::<ICoreWebView2_7>()?;
                let environment=webview.environment().cast::<ICoreWebView2Environment6>()?;
                let settings=environment.CreatePrintSettings()?;
                settings.SetOrientation(if landscape{COREWEBVIEW2_PRINT_ORIENTATION_LANDSCAPE}else{COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT})?;
                settings.SetShouldPrintBackgrounds(true)?;
                settings.SetShouldPrintHeaderAndFooter(false)?;
                settings.SetMarginTop(0.0)?;
                settings.SetMarginBottom(0.0)?;
                settings.SetMarginLeft(0.0)?;
                settings.SetMarginRight(0.0)?;
                settings.SetPageWidth(210.0/25.4)?;
                settings.SetPageHeight(297.0/25.4)?;
                let completed=tx.clone();
                core.PrintToPdf(&HSTRING::from(pdf_path.to_string_lossy().as_ref()),&settings,&PrintToPdfCompletedHandler::create(Box::new(move |status,success|{let result=if success{status.map_err(|e|e.to_string())}else{Err("PDF rendering failed".into())};let _=completed.send(result);Ok(())})))?;
                Ok(())
            })();if let Err(e)=begin{let _=tx.send(Err(e.to_string()));}
        }){let _=failure.send(Err(e.to_string()));}
    }).build().map_err(|e|e.to_string());
    let window=match window{Ok(window)=>window,Err(e)=>{let _=fs::remove_file(&temporary);return Err(e);}};
    let result=tauri::async_runtime::spawn_blocking(move||rx.recv_timeout(Duration::from_secs(120)).map_err(|e|e.to_string()).and_then(|v|v)).await.map_err(|e|e.to_string()).and_then(|v|v);
    let _=window.destroy();let _=fs::remove_file(&temporary);
    if result.is_ok(){let bytes=fs::read(&staged).map_err(|e|e.to_string())?;if !bytes.starts_with(b"%PDF-"){let _=fs::remove_file(&staged);return Err("Invalid generated PDF document".into());}fs::rename(&staged,&output).map_err(|e|e.to_string())?;}else{let _=fs::remove_file(&staged);}
    result
}
#[cfg(not(target_os="windows"))]
pub async fn render(_app:tauri::AppHandle,_html:String,_path:String,_landscape:bool)->Result<(),String>{Err("Direct PDF export is not available on this platform yet".into())}
