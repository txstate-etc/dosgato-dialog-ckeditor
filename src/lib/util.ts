import type { AnyItem } from '@dosgato/dialog'
import type { Editor } from 'ckeditor5'
import { isNotBlank } from 'txstate-utils'

let doc: Document
export function getParserElement () {
  doc ??= document.implementation.createHTMLDocument()
  return doc.createElement('div')
}

export function getUrl (item: AnyItem) {
  return ('image' in item && isNotBlank(item.image?.previewUrl)) ? item.image.previewUrl : item.url
}

// strictHtml may leave SourceEditing out, and plugins.get throws for a missing plugin
export function isSourceEditing (editor: Editor | undefined) {
  return !!editor?.plugins.has('SourceEditing') && editor.plugins.get('SourceEditing').isSourceEditingMode
}
