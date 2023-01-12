let doc: Document
export function getParserElement () {
  doc ??= document.implementation.createHTMLDocument()
  return doc.createElement('div')
}
