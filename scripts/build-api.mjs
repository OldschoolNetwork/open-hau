import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('resources',{recursive:true});
await build({entryPoints:['tools/database-api.ts'],outfile:'resources/OpenHaU-API.mjs',bundle:true,platform:'node',format:'esm',target:'node24',minify:true});
console.log('Built optional local API companion.');
