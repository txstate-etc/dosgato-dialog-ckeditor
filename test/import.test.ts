/**
 * Turns real production samples (richexamples.json, `{ samples: [{ html }] }`,
 * deliberately not in git) into anonymized test/samples/NNN.html files,
 * numbered after the ones already there. It refuses to write a sample unless
 * the anonymized version tests exactly what the original did: both go through
 * the editor, and with every letter and digit masked out the two outputs must
 * be identical. Run it with
 * `npm run import-samples`, then `npm test -- -u` to record expected output for
 * new samples and review the result in git.
 */
import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'
import { anonymize, placeholderImages } from './anonymize'
import { roundtrip } from './roundtrip'

// new samples are numbered after the existing ones, never over them
const existing = Object.keys(import.meta.glob('./samples/*.html')).map(path => Number(path.match(/(\d+)\.html$/)![1]))
const firstNumber = existing.length ? Math.max(...existing) + 1 : 0

// image contents don't matter, and the ones in style attributes (Word's spellcheck squiggles) aren't replaced
const mask = (html: string) => placeholderImages(html).replace(/\p{L}/gu, 'x').replace(/\d/g, '0')

test('import samples', async () => {
  const { samples } = JSON.parse(await commands.readFile('richexamples.json')) as { samples: { html: string }[] }
  const mismatched: number[] = []
  /* eslint-disable no-await-in-loop -- one shared editor, so one sample at a time */
  for (const [i, { html }] of samples.entries()) {
    const number = firstNumber + i
    const anonymized = anonymize(html, number + 1)
    const [original, replaced] = [await roundtrip(html), await roundtrip(anonymized)]
    if (mask(original.output) !== mask(replaced.output)) {
      mismatched.push(number)
      continue
    }
    await commands.writeFile(`test/samples/${String(number).padStart(3, '0')}.html`, anonymized)
  }
  /* eslint-enable no-await-in-loop */
  expect(mismatched, 'samples whose editor output depends on their text').toEqual([])
})
