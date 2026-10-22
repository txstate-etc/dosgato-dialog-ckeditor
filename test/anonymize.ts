/**
 * Replaces the copy in a sample of production HTML while keeping everything the
 * editor actually reacts to: markup, classes, styles, ids, urls, whitespace,
 * punctuation. Every word becomes a lorem word of the same length and
 * capitalization, every digit a different digit, so the output has the same
 * shape character for character (import.test.ts relies on that to prove the
 * anonymized sample tests exactly what the original did). Also covers alt text
 * and the like, mailto:/tel: addresses, and embedded data: images, some of
 * which were screenshots.
 */

const LOREM = 'a e lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc pulvinar sapien ligula ornare'.split(' ')

const byLength = new Map<number, string[]>()
for (const w of LOREM) byLength.set(w.length, [...(byLength.get(w.length) ?? []), w])

const TEXT_ATTRIBUTES = ['alt', 'title', 'aria-label', 'summary', 'label', 'placeholder', 'o:title']
const SKIP_ELEMENTS = new Set(['STYLE', 'SCRIPT'])
const PLACEHOLDER_IMAGES: Record<string, string> = {
  'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'image/svg+xml': 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4='
}

export function anonymize (html: string, seed: number) {
  // mulberry32, so re-running the import produces the same files
  let state = seed >>> 0
  function random () {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = <T>(arr: T[]) => arr[Math.floor(random() * arr.length)]

  function loremOfLength (length: number) {
    let out = ''
    while (out.length < length) {
      const remaining = length - out.length
      out += pick(byLength.get(remaining) ?? byLength.get(Math.min(remaining, 11))!)
    }
    return out.slice(0, length)
  }

  function text (value: string) {
    return value
      .replace(/\p{L}+/gu, word => {
        // eslint-disable-next-line @typescript-eslint/no-misused-spread -- code points on purpose, to line up with import.test.ts's per-code-point \p{L} mask
        const chars = [...word]
        const lorem = loremOfLength(chars.length)
        return chars.map((c, i) => c === c.toLowerCase() ? lorem[i] : lorem[i].toUpperCase()).join('')
      })
      .replace(/\d/g, d => String((Number(d) + 1 + Math.floor(random() * 9)) % 10))
  }

  function link (value: string) {
    return value
      .replace(/(mailto:)([^"'&?\s,;]+)/gi, (_, scheme: string, address: string) => scheme + text(address))
      .replace(/(tel:)([^"'&?\s,;]+)/gi, (_, scheme: string, number: string) => scheme + text(number))
  }

  const body = new DOMParser().parseFromString('<body>' + html, 'text/html').body
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!SKIP_ELEMENTS.has(node.parentElement?.tagName ?? '')) node.nodeValue = text(node.nodeValue ?? '')
      continue
    }
    const el = node as Element
    for (const name of TEXT_ATTRIBUTES) {
      const value = el.getAttribute(name)
      if (value != null) el.setAttribute(name, text(value))
    }
    const href = el.getAttribute('href')
    if (href != null) el.setAttribute('href', link(href))
    for (const name of ['src', 'srcset']) {
      const value = el.getAttribute(name)
      if (value?.includes('data:')) el.setAttribute(name, placeholderImages(value))
    }
  }
  return body.innerHTML
}

export function placeholderImages (value: string) {
  return value.replace(/data:([\w/+.-]+);base64,[A-Za-z0-9+/=]+/g, (match, mime: string) => {
    const placeholder = PLACEHOLDER_IMAGES[mime]
    return placeholder ? `data:${mime};base64,${placeholder}` : match
  })
}
