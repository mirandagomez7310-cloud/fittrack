import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Solo en build: en dev, React Refresh necesita un script inline que esta política bloquearía.
// Los `style={{…}}` de React no los afecta: se aplican por CSSOM, no como atributo.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/** CSP en el HTML y service worker con la lista de archivos de esta build. */
function offline(): Plugin {
  return {
    name: 'fittrack-offline',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }],
    generateBundle(_, bundle) {
      const files = [
        '/',
        '/favicon.svg',
        ...Object.keys(bundle)
          .filter((f) => f !== 'index.html')
          .map((f) => `/${f}`),
      ]
      const version = createHash('sha256').update(files.join()).digest('hex').slice(0, 12)
      const template = readFileSync('src/sw.js', 'utf8')
      const source = template.replaceAll('__VERSION__', version).replaceAll('__PRECACHE__', JSON.stringify(files))
      if (source.includes('__')) throw new Error('sw.js: quedan marcadores sin sustituir')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offline()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
