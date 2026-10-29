/**
 * Phone numbers typed into the link form become tel: links, and typed URLs
 * with @handles don't become mailto: (phoneToTel and fixTypedLink in
 * src/lib/linkbrowser.ts); stock already handles emails.
 */
import { expect, test } from 'vitest'
import { fixTypedLink, phoneToTel } from '../src/lib/linkbrowser'
import { createEditor } from './roundtrip'

test.each([
  ['512.245.5555', 'tel:512.245.5555'],
  ['512-245-5555', 'tel:512-245-5555'],
  ['5122455555', 'tel:5122455555'],
  ['(512) 245-5555', 'tel:(512)-245-5555'],
  ['245-5555', 'tel:245-5555'],
  [' 1 512 245 5555 ', 'tel:1-512-245-5555'],
  ['+1 512 245 5555', 'tel:+1-512-245-5555'],
  ['+44 20 7946 0958', 'tel:+44-20-7946-0958'],
  ['+33 (0)1 23 45 67 89', 'tel:+33-(0)1-23-45-67-89'],
  ['+861012345678', 'tel:+861012345678'],
  ['512-245-5555 x123', 'tel:512-245-5555;ext=123'],
  ['512-245-5555x123', 'tel:512-245-5555;ext=123'],
  ['512.245.5555, ext. 4', 'tel:512.245.5555;ext=4'],
  ['(512) 245-5555 Ext 12', 'tel:(512)-245-5555;ext=12'],
  ['+1 512 245 5555 extension 123', 'tel:+1-512-245-5555;ext=123']
])('%s is a phone number', (value, href) => {
  expect(phoneToTel(value)).toBe(href)
})

test.each([
  'tel:512-245-5555', '2024', '245-555', '+1234567890123456', 'https://txstate.edu', '/about', '#contact',
  'jane@txstate.edu', '1.2.3.4.5.6.7.8.example', '512-245-5555 x', 'x123', '245-555 x123', '512-245-5555 ext 12a'
])('%s is not a phone number', value => {
  expect(phoneToTel(value)).toBeUndefined()
})

async function submitLink (url: string) {
  const editor = await createEditor({})
  editor.setData('<p>call us</p>')
  editor.model.change(writer => {
    writer.setSelection(writer.createRangeIn(editor.model.document.getRoot()!.getChild(0) as any))
  })
  const linkUI = editor.plugins.get('LinkUI') as any
  linkUI._showUI(true)
  linkUI.formView.urlInputView.fieldView.element.value = url
  linkUI.formView.fire('submit')
  return editor.getData()
}

test('the link form turns a phone number into a tel: link', async () => {
  expect(await submitLink('512.245.5555')).toBe('<p><a href="tel:512.245.5555">call us</a></p>')
  expect(await submitLink('+1 512 245 5555')).toBe('<p><a href="tel:+1-512-245-5555">call us</a></p>')
  expect(await submitLink('512-245-5555 x123')).toBe('<p><a href="tel:512-245-5555;ext=123">call us</a></p>')
})

test('the link form still gives emails mailto: and domains https://', async () => {
  expect(await submitLink('jane@txstate.edu')).toBe('<p><a href="mailto:jane@txstate.edu">call us</a></p>')
  expect(await submitLink('www.txstate.edu')).toBe('<p><a href="https://www.txstate.edu">call us</a></p>')
})

test.each([
  ['www.threads.net/@texas.state', 'https://www.threads.net/@texas.state'],
  ['medium.com/@jane.doe/my.post', 'https://medium.com/@jane.doe/my.post']
])('a typed URL with an @ handle is not taken for an email: %s', (value, href) => {
  expect(fixTypedLink(value)).toBe(href)
})

test.each([
  'jane@txstate.edu', 'jane.doe+news@txstate.edu', 'https://www.threads.net/@texas.state', '/pages/@foo.bar', 'mailto:jane@txstate.edu', 'www.txstate.edu'
])('fixTypedLink leaves %s to stock', value => {
  expect(fixTypedLink(value)).toBeUndefined()
})

test('the link form gives a handle URL https:// rather than mailto:', async () => {
  expect(await submitLink('www.threads.net/@texas.state')).toBe('<p><a href="https://www.threads.net/@texas.state">call us</a></p>')
})
