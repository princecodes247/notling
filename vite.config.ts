import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { yjsSignalingPlugin } from './src/server/signalingPlugin'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    hmr: {
      overlay: false,
    },
  },
  optimizeDeps: {
    exclude: ['pg', 'drizzle-orm'],
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    yjsSignalingPlugin(),
  ],
})

export default config
