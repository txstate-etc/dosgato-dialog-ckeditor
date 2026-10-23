import type { Editor as CKEditor, EditorConfig } from 'ckeditor5'
import { resolveStoredHtml } from '../src/lib/storage'

let editor: CKEditor | undefined

// What dosgato-txstate's templates pass (api/src/templates/defaults.ts), so
// header-color-* classes in production content survive like they do there.
// Without a palette the editor strips them, see tableproperties.ts.
export const productionConfig: EditorConfig = {
  table: {
    tableProperties: {
      tableHeaderColors: [
        { label: 'None', value: 'header-color-none' },
        { label: 'Default (Gold)', value: 'header-color-gold', default: true },
        { label: 'Maroon', value: 'header-color-maroon' },
        { label: 'Charcoal', value: 'header-color-charcoal' },
        { label: 'Deep Blue', value: 'header-color-blue' },
        { label: 'River', value: 'header-color-river' },
        { label: 'Sandstone', value: 'header-color-sandstone' },
        { label: 'Old Gold', value: 'header-color-oldgold' }
      ]
    }
  }
}

export async function createEditor (config: EditorConfig = productionConfig) {
  if (editor) { try { await editor.destroy() } catch {} }
  const Editor = (await import('../src/lib/editor')).default
  document.body.innerHTML = '<div id="editor"></div>'
  editor = await Editor.create(document.getElementById('editor')!, config)
  return editor
}

/**
 * Stored HTML through everything FieldRichText does before the editor sees it
 * (resolveStoredHtml, with deterministic stand-ins for the chooser client's
 * descriptor lookups: the same descriptor always resolves to the same url),
 * then into the editor and back out. If the editor throws, it gets recreated
 * so one bad sample can't poison the rest.
 */
export async function roundtrip (stored: string) {
  let n = 0
  const input = await resolveStoredHtml(stored, async (value, kind) => {
    n += 1
    if (!value.startsWith('{')) return undefined
    try {
      const d = JSON.parse(value)
      if (d.type === 'url' && typeof d.url === 'string') return d.url
      if (typeof d.checksum === 'string') return '/assets/' + d.checksum + (kind === 'src' ? '/w/700/image.jpg' : '/file.pdf')
      if (d.type === 'page') return '/mock-site/mock-page-' + (d.linkId ?? d.id ?? n)
      if (d.type === 'asset') return '/assets/mock-asset-' + (d.id ?? n) + '.pdf'
    } catch {}
    return undefined
  })
  editor ??= await createEditor()
  try {
    editor.setData(input)
    return { input, output: editor.getData() }
  } catch (e) {
    await createEditor()
    throw e
  }
}

/**
 * getData() emits one long line. The expected files get a newline after each
 * block-level closing tag so that a CKEditor upgrade shows up as a readable git
 * diff. Whitespace between blocks means nothing to the editor or the browser.
 */
export function formatOutput (html: string) {
  return html.replace(/(<\/(?:p|h[1-6]|li|ul|ol|dl|dd|dt|blockquote|figure|table|thead|tbody|tfoot|tr|pre|div|section|hr)>|<hr>)(?!\n)/g, '$1\n')
}
