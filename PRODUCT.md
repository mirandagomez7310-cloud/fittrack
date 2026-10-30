# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Una sola persona (la dueña del proyecto), nivel intermedio: conoce los ejercicios y la técnica, no necesita explicaciones. Registra en el gimnasio, de pie, con el móvil en una mano, entre series y con poco tiempo.

## Product Purpose
Registrar entrenamientos (ejercicios, series, repeticiones, cargas) y ver historial y progreso. Éxito: registrar una sesión de 3 ejercicios en menos de un minuto de interacción total y no perder nunca un dato.

## Positioning
Herramienta personal, local-first y sin cuenta: los datos viven en el navegador del usuario, sin servidor, sin anuncios ni red social.

## Operating Context
- Móvil, luz variable de gimnasio, interrupciones constantes (descanso entre series).
- Una mano, a menudo con sudor o guantes: objetivos táctiles grandes, poca escritura.
- Puede cerrar la pestaña en cualquier momento: cada serie se guarda al instante.

## Capabilities and Constraints
- Fase 2: catálogo de ejercicios (con carga / peso corporal), sesión en curso, series con reps y kg.
- Cargas siempre en kg en los datos. Acepta coma decimal.
- Sin backend en v1 (IndexedDB). Pendiente: rutinas, historial, exportar/importar, progreso (fases 3–4).
- Interfaz en español.

## Brand Commitments
- Nombre: FitTrack.
- Voz: sobria y directa. Etiquetas cortas, sin frases motivacionales ni emojis.
- Sin logo ni paleta obligatoria (delegado).

## Evidence on Hand
Ninguna. No inventar usuarios, cifras ni testimonios.

## Product Principles
1. Registrar va antes que mirar: la acción de añadir una serie siempre a un toque.
2. Nunca perder datos: guardar al instante, deshacer en lugar de confirmar.
3. Rellenar por defecto con lo último hecho; teclear es el último recurso.
4. Nada que no se use entre series.

## Accessibility & Inclusion
WCAG 2.2 AA. Objetivos táctiles ≥ 44 px, foco visible, navegación por teclado, `prefers-reduced-motion`.
