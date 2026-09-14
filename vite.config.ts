import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { yjsSignalingPlugin } from './src/server/signalingPlugin'

function removePrefersColorSchemeDark(css: string): string {
  const target = '@media (prefers-color-scheme: dark)'
  let result = ''
  let pos = 0
  while (true) {
    const idx = css.indexOf(target, pos)
    if (idx === -1) {
      result += css.slice(pos)
      break
    }
    result += css.slice(pos, idx)
    const openBrace = css.indexOf('{', idx)
    if (openBrace === -1) {
      pos = idx + target.length
      continue
    }
    let depth = 1
    let i = openBrace + 1
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') depth--
      i++
    }
    pos = i
  }
  return result
}

const devTailwindDarkModeFix = () => ({
  name: 'fix-tailwind-dev-dark-mode',
  enforce: 'post' as const,
  transform(code: string, _id: string) {
    if (code.includes('@media (prefers-color-scheme: dark)')) {
      return {
        code: removePrefersColorSchemeDark(code),
        map: null,
      }
    }
  },
})

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
    devTailwindDarkModeFix(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    yjsSignalingPlugin(),
  ],
})

export default config
