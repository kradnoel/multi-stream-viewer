#!/usr/bin/env node
/**
 * Runs vue-tsc, and refuses to run it under anything but Node.
 *
 * vue-tsc's Volar layer does not register the `.vue` extension under Bun:
 * TypeScript then drops every component from the program and the check passes
 * while checking nothing. That is a failure with no symptom, which is how it
 * survived several green CI runs.
 *
 * `bun run` shims `node` with Bun itself, so naming the runtime in a
 * package.json script is not enough — the shim answers. Hence this file, which
 * asks what it is actually running under and says so.
 *
 *   node scripts/typecheck.mjs
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

if (process.versions.bun) {
  console.error(
    [
      'The type check has to run under Node, and this is Bun.',
      '',
      'vue-tsc does not see inside .vue files under Bun, so it would report',
      'success having checked none of the components. Run it directly:',
      '',
      '  node scripts/typecheck.mjs',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

const vueTsc = createRequire(import.meta.url).resolve('vue-tsc/bin/vue-tsc.js')
const { status } = spawnSync(process.execPath, [vueTsc, '--noEmit', ...process.argv.slice(2)], {
  stdio: 'inherit',
})

process.exit(status ?? 1)
