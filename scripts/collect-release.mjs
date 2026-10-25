import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const destination=path.resolve(root,'../builds/26.1.0-preview.1/windows-x64');
await fs.mkdir(destination,{recursive:true});
const binary=path.join(root,'src-tauri/target/release/openhau.exe');
await fs.copyFile(binary,path.join(destination,'OpenHaU-26.1-Preview.exe'));
const bundle=path.join(root,'src-tauri/target/release/bundle/nsis');
for(const file of await fs.readdir(bundle)){if(file.endsWith('.exe'))await fs.copyFile(path.join(bundle,file),path.join(destination,file))}
const hashes=[];
for(const file of await fs.readdir(destination)){if(!file.endsWith('.exe'))continue;const bytes=await fs.readFile(path.join(destination,file));hashes.push(`${crypto.createHash('sha256').update(bytes).digest('hex')}  ${file}`);console.log(file,`${(bytes.length/1024/1024).toFixed(2)} MiB`)}
await fs.writeFile(path.join(destination,'SHA256SUMS.txt'),hashes.join('\n')+'\n');
console.log(destination);
