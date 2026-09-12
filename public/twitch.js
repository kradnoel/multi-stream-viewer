/**
 * The Twitch pane's own script, kept in a file rather than inline.
 *
 * Tauri nonces only the script tags it can see a remote src on, so an inline
 * script in a page it serves is blocked by `script-src 'self'` with no message
 * beyond the webview's own "content is blocked". A file matches 'self'.
 */
const params = new URLSearchParams(location.search)
const channel = params.get('channel')
const parent = (params.get('parent') || '').split(',').filter(Boolean)

let player = null
// Held until the player exists, so a mute that arrives during load is applied
// rather than dropped. Panes are created muted and a focused one is unmuted
// immediately, which is exactly that race.
let pendingMuted = true

const embed = new Twitch.Embed('player', {
  channel,
  parent,
  width: '100%',
  height: '100%',
  layout: 'video',
  autoplay: true,
  muted: true,
})

embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
  player = embed.getPlayer()
  player.setMuted(pendingMuted)
  window.parent.postMessage({ source: 'msv-twitch', type: 'ready' }, '*')
})

window.addEventListener('message', (event) => {
  // Only the app embeds this page, so anything from elsewhere is not for us.
  if (event.source !== window.parent) return

  const message = event.data
  if (!message || message.source !== 'msv' || message.type !== 'set-muted') return

  pendingMuted = Boolean(message.muted)
  if (player) player.setMuted(pendingMuted)
})
