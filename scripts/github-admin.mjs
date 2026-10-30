// Uses the existing local Git Credential Manager session. Never logs credentials.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const repository='OldschoolNetwork/open-hau';
const credentials=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'}});
const token=credentials.split(/\r?\n/).find(l=>l.startsWith('password='))?.slice(9);
if(!token)throw Error('No existing Git Credential Manager sign-in.');
async function api(route,options={}){
 const response=await fetch(`https://api.github.com/repos/${repository}${route}`,{...options,headers:{Accept:'application/vnd.github+json','Content-Type':'application/json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...options.headers}});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(`GitHub ${response.status}: ${body.message||response.statusText}`)}
 return response.status===204?null:response.json();
}
const command=process.argv[2];
if(command==='metadata'){
 await api('',{method:'PATCH',body:JSON.stringify({description:'OpenHaU · House & Utilities — offline accounting for small housing associations. Russian and Romanian. Windows + macOS.',homepage:'https://oldschoolnetwork.online/'})});
 await api('/topics',{method:'PUT',body:JSON.stringify({names:['tauri','svelte','sqlite','offline-first','desktop-app','housing','romanian','russian','windows','macos']})});
 console.log('Repository description and topics updated.');
}else if(command==='presentation'){
 await api('',{method:'PATCH',body:JSON.stringify({description:'OpenHaU · House & Utilities — offline accounting for small housing associations. Russian and Romanian. Windows + macOS.'})});
 const release=await api('/releases/tags/v26.1.0-preview.1');
 await api(`/releases/${release.id}`,{method:'PATCH',body:JSON.stringify({body:await fs.readFile('docs/releases/26.1-preview.md','utf8')})});
 console.log('Updated English repository description and preview release notes.');
}else if(command==='build'){
 await api('/actions/workflows/build.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main'})});
 console.log('Windows + macOS build workflow dispatched.');
}else if(command==='status'){
 const data=await api('/actions/runs?per_page=5');console.log(JSON.stringify(data.workflow_runs.map(r=>({id:r.id,event:r.event,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha})),null,2));
}else if(command==='jobs'||command==='download-mac'){
 const data=await api('/actions/runs?event=workflow_dispatch&per_page=5');
 const run=data.workflow_runs[0];if(!run)throw Error('No dispatched build');
 if(command==='jobs'){const jobs=await api(`/actions/runs/${run.id}/jobs`);console.log(JSON.stringify(jobs.jobs.map(j=>({id:j.id,name:j.name,status:j.status,conclusion:j.conclusion,steps:j.steps?.filter(s=>s.conclusion==='failure').map(s=>s.name)})),null,2));}
 else {
   const artifacts=await api(`/actions/runs/${run.id}/artifacts`);
   const artifact=artifacts.artifacts.find(a=>a.name.includes('macos-universal'));
   if(!artifact)throw Error(`macOS artifact not ready (run ${run.id}: ${run.status}/${run.conclusion})`);
   const response=await fetch(artifact.archive_download_url,{headers:{Authorization:`Bearer ${token}`}});
   if(!response.ok)throw Error(`Download failed: ${response.status}`);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(artifact.digest?.startsWith('sha256:')&&crypto.createHash('sha256').update(bytes).digest('hex')!==artifact.digest.slice(7))throw Error('Artifact checksum mismatch');
   const dir=path.resolve('../tmp/ci');await fs.mkdir(dir,{recursive:true});const file=path.join(dir,`macos-${run.id}.zip`);await fs.writeFile(file,bytes);console.log(file);
 }
}else if(command==='release'){
 const tag='v26.1.0-preview.1';
 const releases=await api('/releases');
 let release=releases.find(r=>r.tag_name===tag);
 if(!release)release=await api('/releases',{method:'POST',body:JSON.stringify({tag_name:tag,target_commitish:'main',name:'OpenHaU 26.1 · First Preview',prerelease:true,body:await fs.readFile('docs/releases/26.1-preview.md','utf8')})});
 const directories=[path.resolve('../builds/26.1.0-preview.1/windows-x64'),path.resolve('../builds/26.1.0-preview.1/macos-universal')];
 for(const directory of directories){for(const name of await fs.readdir(directory).catch(()=>[])){
   if(!/\.(exe|txt|dmg)$/.test(name)||release.assets.some(a=>a.name===name))continue;
   const bytes=await fs.readFile(path.join(directory,name));
   const response=await fetch(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(name),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':/\.(exe|dmg)$/.test(name)?'application/octet-stream':'text/plain'},body:bytes});
   if(!response.ok)throw Error(`Asset upload failed (${response.status}): ${name}`);
   console.log(`Uploaded: ${name}`);
 }}
 console.log(release.html_url);
}else throw Error('Use metadata, presentation, build, status, jobs, download-mac, or release.');
