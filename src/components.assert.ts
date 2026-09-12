/**
 * Assertions about the components, which exist to check the type check.
 *
 * `vue-tsc` only sees inside an SFC when it runs under Node. Under Bun its
 * Volar layer never registers the `.vue` extension, TypeScript drops every
 * component from the program, and the check passes while checking nothing —
 * a failure with no symptom, which is why it survived four revisions.
 *
 * Each line below is a mistake the compiler should catch. If components ever
 * degrade to `any` again, the mistakes stop being errors and TypeScript
 * reports the unused `@ts-expect-error` directives instead. Either way the
 * check goes red, which is the only reason to trust it when it is green.
 *
 * Nothing imports this file; it is part of the type program, not the bundle.
 */
import type { ParsedStream } from './lib/streams'
import type StreamPane from './components/StreamPane.vue'

type StreamPaneProps = InstanceType<typeof StreamPane>['$props']

const stream: ParsedStream = { kind: 'hls', id: 'https://example.com/live.m3u8', src: 'https://example.com/live.m3u8' }

/** `stream` is required. */
// @ts-expect-error - missing the required prop
export const withoutStream: StreamPaneProps = {}

/** And it is a ParsedStream, not the URL it was parsed from. */
// @ts-expect-error - a string is not a ParsedStream
export const withWrongStream: StreamPaneProps = { stream: stream.src }

/** The shape the component actually takes. Fails if the prop is renamed. */
export const withStream: StreamPaneProps = { stream }
