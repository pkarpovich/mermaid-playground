import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare } from './share'

function buildLargeDiagram(): string {
  const entities = [
    'Customer', 'Order', 'Product', 'Invoice', 'Payment', 'Shipment', 'Category',
    'Supplier', 'Warehouse', 'Review', 'ShoppingCart', 'Coupon', 'Address',
  ]
  const fields = [
    'identifier PK', 'display_name', 'status_code', 'description_text',
    'created_at', 'updated_at', 'external_reference',
  ]
  const lines = ['erDiagram']
  for (const entity of entities) {
    lines.push(`    ${entity} {`)
    for (const field of fields) lines.push(`        string ${entity.toLowerCase()}_${field}`)
    lines.push('    }')
  }
  for (let i = 0; i < entities.length - 1; i++) {
    lines.push(`    ${entities[i]} ||--o{ ${entities[i + 1]} : contains`)
  }
  return lines.join('\n')
}

describe('encodeShare / decodeShare', () => {
  it('roundtrips ASCII code and name', async () => {
    const input = { name: 'App login flow', code: 'flowchart TD\n    A --> B\n    B --> C' }
    const fragment = await encodeShare(input)
    expect(fragment.startsWith('#code:')).toBe(true)
    expect(await decodeShare(fragment)).toEqual(input)
  })

  it('roundtrips Cyrillic and emoji in both name and code', async () => {
    const input = { name: 'Схема входа 🚀', code: 'flowchart LR\n    Старт --> Готово 🎉' }
    const fragment = await encodeShare(input)
    expect(await decodeShare(fragment)).toEqual(input)
  })

  it('produces base64url payload with no + / = characters', async () => {
    const fragment = await encodeShare({ name: 'x'.repeat(120), code: 'y {} [] () |z|'.repeat(40) })
    const payload = fragment.slice('#code:'.length)
    expect(payload).not.toMatch(/[+/=]/)
  })

  it('returns null for a wrong prefix', async () => {
    expect(await decodeShare('#other:abc')).toBeNull()
    expect(await decodeShare('code:abc')).toBeNull()
  })

  it('returns null for an empty string', async () => {
    expect(await decodeShare('')).toBeNull()
    expect(await decodeShare('#code:')).toBeNull()
  })

  it('returns null for corrupt base64', async () => {
    expect(await decodeShare('#code:@@@not-valid-base64@@@')).toBeNull()
  })

  it('returns null for a truncated payload', async () => {
    const fragment = await encodeShare({ name: 'name', code: 'flowchart TD\n    A --> B --> C --> D' })
    expect(await decodeShare(fragment.slice(0, fragment.length - 6))).toBeNull()
  })

  it('returns null when base64 decodes but is not a deflate stream', async () => {
    expect(await decodeShare('#code:aGVsbG8')).toBeNull()
  })

  it('returns null when the decompressed payload exceeds the size cap', async () => {
    const fragment = await encodeShare({ name: 'bomb', code: 'A'.repeat(2_000_000) })
    expect(await decodeShare(fragment)).toBeNull()
  })

  it('encodes a ~4KB realistic diagram to a fragment under 2500 chars', async () => {
    const code = buildLargeDiagram()
    expect(code.length).toBeGreaterThan(3800)
    const fragment = await encodeShare({ name: 'Large ER schema', code })
    expect(fragment.length).toBeLessThan(2500)
    expect((await decodeShare(fragment))?.code).toBe(code)
  })
})
