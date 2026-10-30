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
      // La versión depende del CONTENIDO (incluidos index.html y los archivos de public/ sin hash):
      // si algo cambia, sw.js cambia, el navegador instala la versión nueva y renueva la caché.
      const hash = createHash('sha256')
      for (const output of Object.values(bundle)) hash.update(output.type === 'chunk' ? output.code : output.source)
      hash.update(readFileSync(new URL('./public/favicon.svg', import.meta.url)))
      const version = hash.digest('hex').slice(0, 12)

      const template = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
      const source = template.replaceAll('__VERSION__', version).replaceAll('__PRECACHE__', JSON.stringify(files))
      if (/__VERSION__|__PRECACHE__/.test(source)) throw new Error('sw.js: quedan marcadores sin sustituir')
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
