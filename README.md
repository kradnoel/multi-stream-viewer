# Multi Stream Viewer

A desktop app for watching several live streams at once: paste in a Twitch,
YouTube Live or direct HLS URL, arrange the panes, hear the one you want, and
reopen the same set tomorrow.

**Status: several panes play, and you hear one of them.** The window, tray and
exit dialog work; any number of Twitch channels, YouTube videos or direct
`.m3u8` URLs can be pasted in, and the grid arranges them squarest-first.
Clicking a pane makes it the only audible one. A set of streams can be named and
reopened later. There is no chat yet, and no rearranging panes by hand.

It is not a recorder, clipper or restreamer, not a browser, not mobile, and not
a moderation tool. Chat, when it arrives, will be read-only.

## Window behaviour

Closing does two different things, because the platforms mean different things
by it:

- **macOS** — the window hides and the process keeps running, which is the
  platform convention. The tray icon brings it back; Quit in the tray menu ends
  it. Streams keep playing while hidden.
- **Windows and Linux** — a dialog asks whether to exit, and Exit ends the
  process. If the frontend never attached its listener the dialog cannot appear,
  so the close is allowed through rather than blocking a window nobody can shut.

Launching a second time focuses the window that is already open instead of
starting a rival process — two instances would be two grids writing over each
other's presets. The window's position and size are restored on the next start.

Twitch and YouTube are embedded in each service's own player; a direct manifest
is played in a `<video>` element, via [hls.js](https://github.com/video-dev/hls.js)
on the Windows and Linux webviews and natively on macOS. Panes start muted,
because a browser blocks autoplay that is not.

## Prerequisites

- [Bun](https://bun.sh) 1.4 or newer
- A Rust toolchain (`rustup`), 1.75 or newer
- Node 22 or newer, for the type check only — `vue-tsc` does not register `.vue`
  files when run under Bun, so the `typecheck` script invokes Node by name and
  fails without it
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
node scripts/typecheck.mjs   # vue-tsc, under Node
bun run build                # Vite; must run before cargo check
cargo check --manifest-path src-tauri/Cargo.toml
```

The type check is invoked with `node` rather than through `bun run`, and the
script refuses to run under anything else. `bun run` shims `node` with Bun, and
under Bun `vue-tsc` silently drops every `.vue` file from the program — so the
check would pass having inspected none of the components.

`src/components.assert.ts` guards the same thing from the other side: it states
mistakes the compiler must catch, so if the components ever become `any` again
the unused `@ts-expect-error` directives turn the check red. A guard nobody has
seen fail is not known to work.

`generate_context!` reads `frontendDist`, so `bun run build` has to come first
or the Rust check panics.

## Licence

MIT. See [LICENSE](LICENSE).
