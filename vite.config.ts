import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import fs from 'node:fs';
import path from 'node:path';

// Check if node_modules/web-demuxer has the wasm files, fallback to public/wasm-files if already copied
const wasmSrc = fs.existsSync(
  path.resolve(__dirname, 'node_modules/web-demuxer/dist/wasm-files/web-demuxer.wasm')
)
  ? 'node_modules/web-demuxer/dist/wasm-files/*'
  : 'public/wasm-files/*';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: wasmSrc,
          dest: 'wasm-files',
        },
      ],
    }),
  ],
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
