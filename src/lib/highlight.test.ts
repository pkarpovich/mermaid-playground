import { describe, expect, it } from 'vitest'
import { highlight } from './highlight'

describe('highlight', () => {
  it('escapes & < > and neutralizes script payloads', () => {
    const out = highlight('<script>alert(1) & "x" </script>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
    expect(out).toContain('&amp;')
  })

  it('wraps keywords in tk-key spans, word-bounded', () => {
    const out = highlight('flowchart TD')
    expect(out).toBe('<span class="tk-key">flowchart</span> <span class="tk-key">TD</span>')
  })

  it('does not match keywords inside longer words', () => {
    expect(highlight('endpoint')).toBe('endpoint')
  })

  it('matches arrows against escaped text', () => {
    expect(highlight('A --> B')).toBe('A <span class="tk-arrow">--&gt;</span> B')
    expect(highlight('A -->> B')).toBe('A <span class="tk-arrow">--&gt;&gt;</span> B')
  })

  it('wraps bracketed groups in tk-str spans', () => {
    expect(highlight('A[Start]')).toBe('A<span class="tk-str">[Start]</span>')
    expect(highlight('B{Signed in?}')).toBe('B<span class="tk-str">{Signed in?}</span>')
    expect(highlight('C([Ready])')).toContain('tk-str')
  })

  it('nests a tk-key span inside a tk-str bracket span', () => {
    const out = highlight('A[end]')
    expect(out).toBe('A<span class="tk-str">[<span class="tk-key">end</span>]</span>')
  })

  it('short-circuits %% comment lines with no other passes', () => {
    const out = highlight('  %% arrow --> and [bracket]')
    expect(out).toBe('<span class="tk-comment">  %% arrow --&gt; and [bracket]</span>')
    expect(out).not.toContain('tk-arrow')
    expect(out).not.toContain('tk-str')
  })

  it('turns an empty line into a single space', () => {
    expect(highlight('')).toBe(' ')
  })

  it('joins multiple lines with newline', () => {
    const out = highlight('flowchart TD\n\nA --> B')
    expect(out.split('\n')).toHaveLength(3)
    expect(out).toBe(
      '<span class="tk-key">flowchart</span> <span class="tk-key">TD</span>\n \nA <span class="tk-arrow">--&gt;</span> B',
    )
  })
})
