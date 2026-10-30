# FitTrack

App personal local-first para registrar entrenamientos. Sin backend: datos en IndexedDB (Dexie). Uso principal en móvil.

- Comandos: `npm run dev` · `typecheck` · `lint` (oxlint) · `test` (Vitest) · `e2e` (Playwright, build + preview en :4173) · `build`.
- Capas: `src/domain` (tipos, esquemas Zod, cálculos puros con tests) → `src/db` (único acceso a IndexedDB) → `src/features/<área>` (UI). `src/ui` solo para componentes compartidos.
- Cargas siempre en kg en datos; la conversión a lb solo en la vista. Instantes (inicio de sesión, series) en ISO UTC; días naturales (peso corporal) como fecha local `YYYY-MM-DD`, leída con `localDate()` de `domain/dates.ts`, nunca con `new Date('YYYY-MM-DD')`.
- Toda importación de datos (JSON) se valida con Zod antes de escribir; si falla, no se escribe nada.
- Cambios de esquema Dexie: nueva `version()` con migración y test; nunca editar una versión publicada.
- Nota del proyecto: Obsidian `01 Proyectos/FitTrack.md`.
