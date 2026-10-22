// Compiles the txst theme's content CSS straight from a dosgato-txstate
// checkout next to this repo, so the /report viewer can render samples the way
// the live site does instead of with CKEditor's own content styles. 404s when
// the checkout isn't there; the viewer then falls back to CKEditor's CSS.
import { error } from '@sveltejs/kit'
import * as sass from 'sass'

const RENDER = '../dosgato-txstate/render/src/'

// The blocks a txst page with rich text loads, in render's cascade order:
// the reset, theme colors/variables/content styles, then the rich-editor
// blocks every rich-text template pulls in (richeditor, richeditortable).
const FILES = [
  'common/css/normalize.css',
  'txst/css/txstcolors.css',
  'txst/css/txstvariables.css',
  'txst/css/contenttypes.css',
  'txst/css/general.scss',
  'txst/css/styledcontent.scss',
  'txst/css/paragraphs.scss',
  'common/css/richeditor.scss',
  'common/css/richeditortable.scss'
]

// `gatovariables` isn't a file: render's common provider registers it as an
// inline scss block. Lift it out of the provider source so it stays in sync.
const providerSource = import.meta.glob('../../../../../dosgato-txstate/render/src/common/provider.ts', { query: '?raw', import: 'default' })

async function gatovariables () {
  const load = Object.values(providerSource)[0]
  const src = load ? await load() : ''
  return /\['gatovariables',\s*\{\s*scss:\s*`([\s\S]*?)`/.exec(src)?.[1]
}

export async function GET () {
  const vars = await gatovariables()
  if (vars == null) error(404, 'dosgato-txstate checkout not found next to this repo')
  const importer: sass.Importer<'async'> = {
    canonicalize: url => url === 'gatovariables' ? new URL('gatovariables:') : null,
    load: () => ({ contents: vars, syntax: 'scss' })
  }
  const css = await Promise.all(FILES.map(async file => {
    const result = await sass.compileAsync(RENDER + file, { loadPaths: [RENDER + 'common/css'], importers: [importer], logger: sass.Logger.silent })
    return `/* ${file} */\n${result.css}`
  }))
  return new Response(css.join('\n'), { headers: { 'content-type': 'text/css' } })
}
