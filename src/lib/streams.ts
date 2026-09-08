/**
 * Turns a pasted URL into something a pane can render.
 *
 * Twitch and YouTube are embedded in an iframe using each service's own player;
 * a direct .m3u8 is played in a <video> element. These are genuinely different
 * render paths, which is why the kind travels with the parsed result instead of
 * being re-derived in the component.
 */
export type StreamKind = 'twitch' | 'youtube' | 'hls'

export interface ParsedStream {
  kind: StreamKind
  /** Channel name, video id, or the manifest URL. Identifies the stream to the user. */
  id: string
  /** iframe src for twitch/youtube; the manifest URL for hls. */
  src: string
}

/**
 * Hosts Twitch will accept as the embedding page.
 *
 * Twitch rejects an embed whose `parent` does not match the page's hostname, and
 * that hostname differs per platform: Tauri serves the app from
 * `http://tauri.localhost` on Windows and `tauri://localhost` elsewhere, while
 * `bun tauri dev` serves it from `http://localhost:3000`. The live hostname is
 * sent first and the known Tauri hosts follow, so a build on any platform has a
 * matching parent without hardcoding one.
 */
function twitchParents(): string[] {
  const hosts = new Set<string>()
  if (typeof window !== 'undefined' && window.location.hostname) {
    hosts.add(window.location.hostname)
  }
  hosts.add('tauri.localhost')
  hosts.add('localhost')
  return [...hosts]
}

/** Extracts a YouTube video id from the several URL shapes YouTube hands out. */
function youtubeVideoId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    return url.pathname.slice(1) || null
  }

  const v = url.searchParams.get('v')
  if (v) return v

  // /live/<id> and /embed/<id> both carry the id as the last path segment.
  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length === 2 && (segments[0] === 'live' || segments[0] === 'embed')) {
    return segments[1]
  }

  return null
}

/**
 * Parses a pasted URL, or returns null if it is not a stream this app can play.
 *
 * Returning null rather than throwing keeps the caller's job to showing a
 * message: a typo in a pasted URL is an ordinary thing for a user to do, not an
 * exceptional one.
 */
export function parseStreamUrl(input: string): ParsedStream | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'twitch.tv' || host === 'm.twitch.tv') {
    const channel = url.pathname.split('/').filter(Boolean)[0]
    if (!channel) return null

    const parents = twitchParents().map((p) => `parent=${encodeURIComponent(p)}`).join('&')
    // Muted so several panes can autoplay at once; the user unmutes the one
    // they want to hear. Autoplay is blocked outright when it is not muted.
    return {
      kind: 'twitch',
      id: channel,
      src: `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&${parents}&autoplay=true&muted=true`,
    }
  }

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    const id = youtubeVideoId(url)
    if (!id) return null

    return {
      kind: 'youtube',
      id,
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1`,
    }
  }

  // Anything else is only playable if it is a manifest we can hand to hls.js.
  if (url.pathname.endsWith('.m3u8')) {
    return { kind: 'hls', id: trimmed, src: trimmed }
  }

  return null
}
