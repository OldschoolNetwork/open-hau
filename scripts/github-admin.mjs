// Uses the existing local Git Credential Manager session. Never logs credentials.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
const repository='OldschoolNetwork/open-hau';
const credentials=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
const token=credentials.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);
if(!token)throw Error('No existing Git Credential Manager sign-in.');
async function api(route,options={}){
 const response=await fetch(`https://api.github.com/repos/${repository}${route}`,{...options,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...options.headers}});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(`GitHub ${response.status}: ${body.message||response.statusText}`)}
 return response.status===204?null:response.json();
}
const command=process.argv[2];
if(command==='metadata'){
 await api('',{method:'PATCH',body:JSON.stringify({description:'OpenHaU · House & Utilities — offline accounting for small housing associations. Русский / Română. Windows + macOS.',homepage:'https://oldschoolnetwork.online/'})});
 await api('/topics',{method:'PUT',body:JSON.stringify({names:['tauri','svelte','sqlite','offline-first','desktop-app','housing','romanian','russian','windows','macos']})});
 console.log('Repository description and topics updated.');
}else if(command==='build'){
 await api('/actions/workflows/build.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main'})});
 console.log('Windows + macOS build workflow dispatched.');
}else if(command==='status'){
 const data=await api('/actions/runs?per_page=5');console.log(JSON.stringify(data.workflow_runs.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha})),null,2));
}else if(command==='release'){
 const tag='v26.1.0-preview.1';
 const releases=await api('/releases');
 let release=releases.find(r=>r.tag_name===tag);
 if(!release)release=await api('/releases',{method:'POST',body:JSON.stringify({tag_name:tag,target_commitish:'main',name:'OpenHaU 26.1 · First Preview',prerelease:true,body:'Первая предварительная сборка OpenHaU.\n\nТемы: системная, светлая и тёмная. Русский / Română. Счета, услуги и тарифы, показания, оплаты, корректировки, закрытие месяца. Три шаблона квитанций, логотип организации SVG/PNG/JPEG/WebP, конфигурации оформления. SQLite с резервными копиями, JSON, CSV и HTML.\n\nWindows x64: установщик или самостоятельный EXE (нужен WebView2). Это Preview для вымышленных данных и параллельной проверки расчётов.\n\nmacOS Monterey 12.6 — целевая система; DMG требует отдельной проверки и настройки подписи. Автообновление пока не включено.\n\nСоцсети и инструкции — в README.'})});
 const directory=path.resolve('../builds/26.1.0-preview.1/windows-x64');
 for(const name of await fs.readdir(directory)){
   if(!/\.(exe|txt)$/.test(name)||release.assets.some(a=>a.name===name))continue;
   const bytes=await fs.readFile(path.join(directory,name));
   const response=await fetch(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':name.endsWith('.exe')?'application/octet-stream':'text/plain'},body:bytes});
   if(!response.ok)throw Error(`Asset upload failed (${response.status}): ${name}`);
   console.log(`Uploaded: ${name}`);
 }
 console.log(release.html_url);
}else throw Error('Use metadata, build, status, or release.');
