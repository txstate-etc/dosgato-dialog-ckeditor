/**
 * Every sample in test/samples (anonymized production content, see
 * import.test.ts) goes through FieldRichText's storage conversion and the real
 * editor, and must come out exactly as recorded in test/expected. When a change
 * is intended, `npm test -- -u` accepts it and the git diff of test/expected
 * is the review. Failing samples are also written to test/last-report.json for
 * the /report page on the dev server, which renders expected and actual side
 * by side with the site's CSS.
 */
import { afterAll, expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import { formatOutput, roundtrip } from './roundtrip'

const samples = import.meta.glob<string>('./samples/*.html', { query: '?raw', import: 'default', eager: true })
const failures: Record<string, string> = {}

for (const [path, stored] of Object.entries(samples)) {
  const name = path.match(/(\d+)\.html$/)![1]
  test(`sample ${name}`, async () => {
    const output = formatOutput((await roundtrip(stored)).output)
    try {
      await expect(output).toMatchFileSnapshot(`./expected/${name}.html`)
    } catch (e) {
      failures[name] = output
      throw e
    }
  })
}

afterAll(async () => {
  await commands.writeFile('test/last-report.json', JSON.stringify({ failures }))
})
