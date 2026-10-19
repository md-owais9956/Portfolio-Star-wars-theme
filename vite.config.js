import { defineConfig } from 'vite';
// base './' → the built site works from any sub-path (GitHub Pages, Netlify, file hosting)
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 900 } });
