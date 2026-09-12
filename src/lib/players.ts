/**
 * What a pane can do with a stream, once it is on screen.
 *
 * The three sources agree on almost nothing here: an HLS manifest plays in a
 * <video> and mutes through a property, YouTube takes documented postMessage
 * commands, and Twitch takes a message this app's own wrapper page turns into a
 * call on the embed API. Naming the operations once is what keeps a fourth
 * source from becoming a fourth branch in a component.
 */
export interface Player {
  /** Silences or unsilences this pane. Exactly one pane is unmuted at a time. */
  setMuted(muted: boolean): void
  /** Releases whatever the pane was holding: sockets, buffers, decoders. */
  destroy(): void
}

/**
 * Plays a manifest in a <video>, with hls.js where the webview needs it.
 *
 * Safari plays HLS natively, so on macOS the manifest is set as the src
 * directly. WebView2 and WebKitGTK do not, and need hls.js driving Media Source
 * Extensions. The library is imported dynamically so its 592KB chunk only loads
 * for panes that play a manifest.
 */
export async function hlsPlayer(
  video: HTMLVideoElement,
  src: string,
  onError: (message: string) => void,
): Promise<Player> {
  video.muted = true

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src
    return {
      setMuted: (muted) => {
        video.muted = muted
      },
      destroy: () => {
        video.removeAttribute('src')
        video.load()
      },
    }
  }

  const { default: Hls } = await import('hls.js')

  if (!Hls.isSupported()) {
    onError('This webview cannot play HLS.')
    return { setMuted: () => {}, destroy: () => {} }
  }

  const instance = new Hls({ enableWorker: true })

  instance.on(Hls.Events.ERROR, (_event, data) => {
    // Non-fatal errors are recovered by hls.js on its own; surfacing them would
    // flicker a message during ordinary network hiccups.
    if (data.fatal) onError(`Playback failed: ${data.details}`)
  })

  instance.loadSource(src)
  instance.attachMedia(video)

  return {
    setMuted: (muted) => {
      video.muted = muted
    },
    destroy: () => instance.destroy(),
  }
}

/**
 * Controls the YouTube player through its IFrame API.
 *
 * The API is a postMessage protocol, so the player answers without this app
 * loading any YouTube script. It ignores commands until the player is ready and
 * there is no ready signal without the script, so the command is sent again on
 * a short delay — cheap, and it makes the first unmute after adding a pane land
 * rather than disappear.
 */
export function youtubePlayer(frame: HTMLIFrameElement): Player {
  const send = (muted: boolean): void => {
    const command = JSON.stringify({
      event: 'command',
      func: muted ? 'mute' : 'unMute',
      args: [],
    })
    frame.contentWindow?.postMessage(command, 'https://www.youtube-nocookie.com')
  }

  let retry: ReturnType<typeof setTimeout> | undefined

  return {
    setMuted: (muted) => {
      clearTimeout(retry)
      send(muted)
      retry = setTimeout(() => send(muted), 1000)
    },
    destroy: () => clearTimeout(retry),
  }
}

/**
 * Controls Twitch through the wrapper page in `public/twitch.html`.
 *
 * player.twitch.tv has no public postMessage API, so the wrapper runs Twitch's
 * embed script and this sends it the one message it understands. The wrapper
 * queues a mute that arrives before the player is ready, so nothing is dropped
 * and nothing needs retrying here.
 */
export function twitchPlayer(frame: HTMLIFrameElement): Player {
  return {
    setMuted: (muted) => {
      // The wrapper is served from this app's own origin, and checks that the
      // sender is its parent before acting on anything.
      frame.contentWindow?.postMessage({ source: 'msv', type: 'set-muted', muted }, '*')
    },
    destroy: () => {},
  }
}
