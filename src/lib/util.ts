import type { AnyItem } from '@dosgato/dialog'
import { isNotBlank } from 'txstate-utils'

let doc: Document
export function getParserElement () {
  doc ??= document.implementation.createHTMLDocument()
  return doc.createElement('div')
}

export function getUrl (item: AnyItem) {
  return ('image' in item && isNotBlank(item.image?.previewUrl)) ? item.image!.previewUrl : item.url
}
