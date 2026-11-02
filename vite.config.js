import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Preserve the browser-facing Host so the API can enforce same-origin mutations.
// Vite's string shorthand enables changeOrigin, which breaks that comparison.
export default defineConfig({publicDir:'client/public',plugins:[react()],server:{proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false}}},build:{outDir:'dist'}});
