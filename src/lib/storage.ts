import { isBlank } from 'txstate-utils'
import { getParserElement } from './util'

export type StoredValueResolver = (value: string, kind: 'href' | 'src') => Promise<string | undefined>

/**
 * Everything that runs between CMS storage and the editor: resolve DosGato's
 * JSON link descriptors on every [href]/[src] to real urls, then convert
 * CKEditor4-era image markup to CKEditor 5 figure form. `resolve` supplies the
 * descriptor resolution — chooser client lookups in production
 * (FieldRichText.svelte), deterministic mocks in the round-trip tests
 * (test/roundtrip.ts).
 */
export async function resolveStoredHtml (html: string, resolve: StoredValueResolver) {
  const testEl = getParserElement()
  testEl.innerHTML = html
  const links = testEl.querySelectorAll('[href]')
  const images = testEl.querySelectorAll<HTMLImageElement>('[src]')
  await Promise.all([
    ...Array.from(links).map(async link => {
      const href = link.getAttribute('href')!
      // no need to process data URLs
      if (href.startsWith('data:')) return
      const url = await resolve(href, 'href')
      if (url) link.setAttribute('href', url)
    }),
    ...Array.from(images).map(async image => {
      const src = image.getAttribute('src')!
      // no need to process data URLs
      if (src.startsWith('data:')) return
      const url = await resolve(src, 'src')
      if (url) image.setAttribute('src', url)

      // convert from CKEditor4
      const up = image.parentElement
      if (up?.tagName !== 'FIGURE' || !up.classList.contains('image') || ['left', 'right'].includes(image.style.float) || ['left', 'right'].includes(up.style.float)) {
        let figure = up
        let taggedElement = figure
        if (up?.tagName !== 'FIGURE') {
          figure = document.createElement('figure')
          taggedElement = image
          if (up?.tagName === 'P') {
            up.parentElement?.insertBefore(figure, up)
            figure.append(image)
            if (isBlank(up.innerText)) up.remove()
          } else {
            up?.insertBefore(figure, image)
            figure.append(image)
          }
        }
        figure!.classList.add('image', 'image_resized')
        const float = taggedElement!.style.float
        if (float) {
          if (float === 'left') figure!.classList.add('image-style-align-left')
          if (float === 'right') figure!.classList.add('image-style-align-right')
        }
        const width = parseInt(image.getAttribute('width') ?? '1000', 10)
        const newWidth = String(Math.round(1000 * Math.min(width, 800) / 800) / 10) + '%'
        figure!.style.width ||= newWidth

        image.removeAttribute('width')
        image.removeAttribute('height')
        image.removeAttribute('hspace')
        image.style.float = ''

        figure?.removeAttribute('height')
      }
    })
  ])
  return testEl.innerHTML
}
