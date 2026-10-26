/**
 * strictHtml (strictRemovePlugins in src/lib/editor.ts) loads only the
 * features behind the preset's visible toolbar items, so content that no
 * visible tool could produce is dropped.
 */
import { expect, test } from 'vitest'
import { getConfig, type ConfigType } from '../src/lib/RichTextTypes'
import { createEditor } from './roundtrip'

async function strictEditor (configType: ConfigType) {
  const { strictRemovePlugins } = await import('../src/lib/editor')
  const config = getConfig(configType, {})
  return await createEditor({ ...config, removePlugins: strictRemovePlugins(config) })
}

const content = '<h2>Title</h2><p><strong>bold</strong> <s>struck</s> <span style="color:#501214;">red</span></p><ul><li>item</li></ul><figure class="table"><table><tbody><tr><td>cell</td></tr></tbody></table></figure><section><p>wrapped</p></section>'

test.each(['full', 'min', 'minwithlist', 'ti'] as ConfigType[])('every preset creates a strict editor: %s', async configType => {
  const editor = await strictEditor(configType)
  expect(editor.plugins.has('GeneralHtmlSupport')).toBe(false)
})

test('min keeps only bold, italic, and links', async () => {
  const editor = await strictEditor('min')
  editor.setData(content)
  expect(editor.getData()).toBe('<p>Title</p><p><strong>bold</strong> struck red</p><p>item</p><p>cell</p><p>wrapped</p>')
})

test('minwithlist adds lists', async () => {
  const editor = await strictEditor('minwithlist')
  editor.setData(content)
  expect(editor.getData()).toBe('<p>Title</p><p><strong>bold</strong> struck red</p><ul><li>item</li></ul><p>cell</p><p>wrapped</p>')
})

test('ti has no tables', async () => {
  const editor = await strictEditor('ti')
  editor.setData(content)
  expect(editor.getData()).toBe('<h2>Title</h2><p><strong>bold</strong> <s>struck</s> <span style="color:#501214;">red</span></p><ul><li>item</li></ul><p>cell</p><p>wrapped</p>')
})

test('full keeps tables but still drops markup only GeneralHtmlSupport understood', async () => {
  const editor = await strictEditor('full')
  editor.setData(content)
  expect(editor.getData()).toBe('<h2>Title</h2><p><strong>bold</strong> <s>struck</s> <span style="color:#501214;">red</span></p><ul><li>item</li></ul><figure class="table"><table><tbody><tr><td>cell</td></tr></tbody></table></figure><p>wrapped</p>')
})

test('a custom toolbar in config replaces the preset toolbar', async () => {
  const { strictRemovePlugins } = await import('../src/lib/editor')
  const config = { ...getConfig('min', {}), toolbar: ['heading', { label: 'More', items: ['imageInsert'] }] }
  const editor = await createEditor({ ...config, removePlugins: strictRemovePlugins(config) })
  editor.setData('<h2>Title</h2><p><strong>bold</strong></p><figure class="image"><img src="/a.jpg" alt="a"></figure>')
  expect(editor.getData()).toBe('<h2>Title</h2><p>bold</p><figure class="image"><img src="/a.jpg" alt="a"></figure>')
})
