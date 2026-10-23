/**
 * Header color semantics of the class-based table properties
 * (src/lib/tableproperties.ts): the palette's default entry is what a classless
 * table already looks like, so picking it clears the class, while None is a
 * class like any other color. Without a palette, header-color-* classes go.
 * Preview colors default from the cell background palette by label.
 */
import { expect, test } from 'vitest'
import type { Editor } from 'ckeditor5'
import { getConfig } from '../src/lib/RichTextTypes'
import { createEditor } from './roundtrip'

const table = (classes: string) => `<figure class="table${classes ? ' ' + classes : ''}"><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table></figure>`

function selectFirstTable (editor: Editor) {
  editor.model.change(writer => {
    const modelTable = editor.model.document.getRoot()!.getChild(0)!
    writer.setSelection(modelTable, 'on')
  })
}

test('picking None writes header-color-none', async () => {
  const editor = await createEditor()
  editor.setData(table(''))
  selectFirstTable(editor)
  editor.execute('tableHeaderColors', { value: 'header-color-none' })
  expect(editor.getData()).toBe(table('header-color-none'))
})

test('picking the default clears the header color class', async () => {
  const editor = await createEditor()
  editor.setData(table('border header-color-maroon'))
  selectFirstTable(editor)
  editor.execute('tableHeaderColors', { value: 'header-color-gold' })
  expect(editor.getData()).toBe(table('border'))
})

test('without a palette, header color classes are dropped on load', async () => {
  const editor = await createEditor({})
  editor.setData(table('border header-color-maroon'))
  expect(editor.getData()).toBe(table('border'))
})

test('header color previews come from templateColors with the same label', () => {
  const config = getConfig('full', {
    tableHeaderColors: [
      { label: 'None', value: 'header-color-none' },
      { label: 'Default (Gold)', value: 'header-color-gold', default: true },
      { label: 'Deep Blue', value: 'header-color-blue' },
      { label: 'Maroon', value: 'header-color-maroon', color: '#000000' }
    ],
    templateColors: [{ label: 'Gold', color: '#6A5638' }, { label: 'Deep Blue', color: '#005481' }, { label: 'Maroon', color: '#501214' }]
  })
  expect(config.table.tableProperties.tableHeaderColors.map((c: { color?: string }) => c.color)).toEqual([undefined, '#6A5638', '#005481', '#000000'])
})

const twoHeaders = (corner: string) => `<figure class="table"><table><thead><tr><th>${corner}</th><th>B</th></tr></thead><tbody><tr><th>1</th><td>2</td></tr></tbody></table></figure>`
const markedCorners = () => document.querySelectorAll('.ck-editor__editable th.dg-table-corner').length

test('an empty corner of a two-header table is marked in the editing view only', async () => {
  const editor = await createEditor()
  editor.setData(twoHeaders('&nbsp;'))
  expect(markedCorners()).toBe(1)
  expect(editor.getData()).not.toContain('dg-table-corner')

  // typing into the corner makes it a real header again
  editor.model.change(writer => {
    const corner = editor.model.document.getRoot()!.getNodeByPath([0, 0, 0, 0])!
    writer.insertText('Course', corner as any, 0)
  })
  expect(markedCorners()).toBe(0)
})

test('corners with content, and single-header tables, are not marked', async () => {
  const editor = await createEditor()
  editor.setData(twoHeaders('Course'))
  expect(markedCorners()).toBe(0)
  editor.setData(table(''))
  expect(markedCorners()).toBe(0)
})
