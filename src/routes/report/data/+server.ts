// Serves the round-trip test files to the /report viewer. They live outside
// src/, where vite's fs.allow won't let the browser import them, but
// server-side module loading isn't subject to it. Lazy globs so a missing
// (gitignored) report just comes back undefined instead of breaking the build.
import { json } from '@sveltejs/kit'

const report = import.meta.glob<string>('/test/last-report.json', { query: '?raw', import: 'default' })
const samples = import.meta.glob<string>('/test/samples/*.html', { query: '?raw', import: 'default' })
const expected = import.meta.glob<string>('/test/expected/*.html', { query: '?raw', import: 'default' })

async function byName (files: Record<string, () => Promise<string>>) {
  return Object.fromEntries(await Promise.all(Object.entries(files).map(async ([path, load]) => [path.match(/(\d+)\.html$/)![1], await load()])))
}

export async function GET () {
  const load = report['/test/last-report.json']
  return json({
    failures: load ? JSON.parse(await load()).failures : undefined,
    samples: await byName(samples),
    expected: await byName(expected)
  })
}
