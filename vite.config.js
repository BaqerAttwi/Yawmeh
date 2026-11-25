import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

// A change to the offline HTML or any of its hashed assets must update the worker.
const offlineBuild={
  name:'offline-build',
  async writeBundle({dir}){
    const page=await readFile(resolve(dir,'offline.html'));
    const workerPath=resolve(dir,'sw.js');
    const worker=await readFile(workerPath,'utf8');
    const build=createHash('sha256').update(page).digest('hex').slice(0,16);
    await writeFile(workerPath,worker.replace('__OFFLINE_BUILD__',build));
  },
};
// Preserve the browser-facing Host so the API can enforce same-origin mutations.
// Vite's string shorthand enables changeOrigin, which breaks that comparison.
export default defineConfig({publicDir:'client/public',plugins:[react(),offlineBuild],server:{proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false}}},build:{outDir:'dist',rollupOptions:{input:{main:'index.html',offline:'offline.html'}}}});
