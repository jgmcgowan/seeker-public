#!/usr/bin/env node
// MapLibre runs its tile parsing in a Web Worker loaded by URL. The bundler copies
// the worker but not the shared chunk it imports, so the map renders blank.
// Serve both files from /public instead (see setWorkerUrl in church-map.tsx).
// Runs before `dev` and `build`, so the copy always matches the installed version.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const dist = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'))
const out = path.join(import.meta.dirname, '..', 'public', 'maplibre')
fs.mkdirSync(out, { recursive: true })
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(dist, file), path.join(out, file))
}
