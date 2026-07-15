const PREFIX = '#code:'
const MAX_ENCODED_LENGTH = 100_000
const MAX_DECODED_BYTES = 1_000_000

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_DECODED_BYTES) {
      await reader.cancel()
      throw new Error('Decompressed payload exceeds limit')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(text: string): Uint8Array {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function isSharePayload(value: unknown): value is { n: string; c: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).n === 'string' &&
    typeof (value as Record<string, unknown>).c === 'string'
  )
}

export async function encodeShare(chart: { name: string; code: string }): Promise<string> {
  const json = JSON.stringify({ n: chart.name, c: chart.code })
  const compressed = await deflateRaw(encoder.encode(json))
  return PREFIX + bytesToBase64Url(compressed)
}

export async function decodeShare(hash: string): Promise<{ name: string; code: string } | null> {
  try {
    if (!hash.startsWith(PREFIX)) return null
    const payload = hash.slice(PREFIX.length)
    if (!payload || payload.length > MAX_ENCODED_LENGTH) return null
    const inflated = await inflateRaw(base64UrlToBytes(payload))
    const parsed: unknown = JSON.parse(decoder.decode(inflated))
    if (!isSharePayload(parsed)) return null
    return { name: parsed.n, code: parsed.c }
  } catch {
    return null
  }
}
