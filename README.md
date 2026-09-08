# Multi Stream Viewer

A desktop app for watching several live streams at once: paste in a Twitch,
YouTube Live or direct HLS URL, arrange the panes, hear the one you want, and
reopen the same set tomorrow.

**Status: pre-0.1.0.** The window, tray and exit dialog work. Nothing plays yet —
there is no video pane, no grid and no saved state. See the ship plan for what
lands when.

## Prerequisites

- [Bun](https://bun.sh) 1.4 or newer
- A Rust toolchain (`rustup`), 1.75 or newer
- Node 22 or newer, for the type check only — `vue-tsc` does not register `.vue`
  files when run under Bun
- Platform dependencies for Tauri 2: see
  [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/)

### Private registry

The UI comes from `@mudix-mz/carbonless`, which resolves from
`npmhub.mudix.co.mz` rather than npmjs.org. `bunfig.toml` maps the scope to
that registry; you supply the credential in `.npmrc`, which is gitignored:

```sh
echo "//npmhub.mudix.co.mz/:_authToken=$MUDIX_NPM_TOKEN" > .npmrc
bun install
```

A `~/.npmrc` with the same line works too, and covers every checkout on the
machine. Bun reads both; the project file wins.

**Without a token you cannot build from source.** Released binaries are
unaffected — this only applies to building the app yourself.

## Development

```sh
bun install
bun tauri dev
```

## Checks

```sh
bun run typecheck   # vue-tsc; run under Node for real component checking
bun run build       # Vite; must run before cargo check
cargo check --manifest-path src-tauri/Cargo.toml
```

`generate_context!` reads `frontendDist`, so `bun run build` has to come first
or the Rust check panics.

## Licence

MIT. See [LICENSE](LICENSE).
