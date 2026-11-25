import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

async function brandColors(){
  const css=await readFile(new URL('./client/src/styles/tokens.css',import.meta.url),'utf8');
  const color=name=>{
    const match=css.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{6})\\s*;`,'i'));
    if(!match)throw new Error(`Missing brand color token: ${name}`);
    return match[1];
  };
  return {theme_color:color('navy'),background_color:color('pwa-background')};
}

const brandMetadata={
  name:'brand-metadata',
  async transformIndexHtml(html){
    const {theme_color}=await brandColors();
    return html.replace('content="__BRAND_THEME_COLOR__"',`content="${theme_color}"`);
  },
  configureServer(server){
    server.middlewares.use('/manifest.webmanifest',async(_req,res,next)=>{
      try{
        const template=JSON.parse(await readFile(resolve(server.config.publicDir,'manifest.webmanifest'),'utf8'));
        res.setHeader('Content-Type','application/manifest+json');
        res.end(JSON.stringify({...template,...await brandColors()}));
      }catch(error){next(error);}
    });
  },
  async writeBundle({dir}){
    const path=resolve(dir,'manifest.webmanifest');
    const manifest=JSON.parse(await readFile(path,'utf8'));
    await writeFile(path,JSON.stringify({...manifest,...await brandColors()},null,2)+'\n');
  },
};

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
export default defineConfig({publicDir:'client/public',plugins:[react(),brandMetadata,offlineBuild],server:{proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false}}},build:{outDir:'dist',rollupOptions:{input:{main:'index.html',offline:'offline.html'}}}});
