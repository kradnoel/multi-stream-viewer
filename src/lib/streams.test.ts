import { describe, expect, test } from 'bun:test'
import { parseStreamUrl } from './streams'

// Every stream enters the app through this function, and a pasted URL is the
// one input a user controls completely.
describe('parseStreamUrl', () => {
  test('a Twitch channel becomes a wrapper URL carrying the channel', () => {
    const parsed = parseStreamUrl('https://twitch.tv/qtcinderella')

    expect(parsed?.kind).toBe('twitch')
    expect(parsed?.id).toBe('qtcinderella')
    expect(parsed?.src).toContain('twitch.html?channel=qtcinderella')
    expect(parsed?.src).toContain('parent=')
  })

  test('www, m and a trailing path do not change the channel', () => {
    for (const url of [
      'https://www.twitch.tv/qtcinderella',
      'https://m.twitch.tv/qtcinderella',
      'https://twitch.tv/qtcinderella/videos',
    ]) {
      expect(parseStreamUrl(url)?.id).toBe('qtcinderella')
    }
  })

  test('the four YouTube URL shapes all resolve to the video id', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      'https://youtu.be/jfKfPfyJRdk',
      'https://www.youtube.com/live/jfKfPfyJRdk',
      'https://www.youtube.com/embed/jfKfPfyJRdk',
    ]) {
      const parsed = parseStreamUrl(url)
      expect(parsed?.kind).toBe('youtube')
      expect(parsed?.id).toBe('jfKfPfyJRdk')
    }
  })

  test('the YouTube embed enables the API, which is how a pane is muted', () => {
    expect(parseStreamUrl('https://youtu.be/jfKfPfyJRdk')?.src).toContain('enablejsapi=1')
  })

  test('a manifest is played as itself', () => {
    const url = 'https://example.com/live/stream.m3u8'
    expect(parseStreamUrl(url)).toEqual({ kind: 'hls', id: url, src: url })
  })

  test('surrounding whitespace is a typo, not a different URL', () => {
    expect(parseStreamUrl('  https://twitch.tv/qtcinderella  ')?.id).toBe('qtcinderella')
  })

  test('what it refuses', () => {
    for (const url of [
      '',
      '   ',
      'not a url',
      'twitch.tv/qtcinderella', // no scheme: URL() cannot parse it
      'file:///etc/passwd', // only http(s) is playable, and this is not a stream
      'javascript:alert(1)',
      'https://twitch.tv/', // no channel
      'https://www.youtube.com/watch', // no video id
      'https://example.com/live/stream.mpd', // a manifest, but not one we play
    ]) {
      expect(parseStreamUrl(url)).toBeNull()
    }
  })
})
