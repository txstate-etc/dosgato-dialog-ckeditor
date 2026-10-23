# dosgato-dialog-ckeditor

Provides `FieldRichText`, a CKEditor 5 form field for [@dosgato/dialog](https://github.com/txstate-etc/dosgato-dialog). It lives in its own package because CKEditor is GPL, and I didn't want that license reaching into everything that uses `@dosgato/dialog`.

## Usage

Drop it into a dialog like any other field:

```svelte
<script>
  import { FieldRichText } from '@dosgato/dialog-ckeditor'
</script>

<FieldRichText path="text" label="Body" />
```

The editor itself (CKEditor 48, from the `ckeditor5` package) is imported dynamically, so it stays out of your main bundle and only loads when a dialog actually shows a rich text field. This package does no bundling of its own; your app's vite handles it like any other dependency, CSS included.

### Props

```ts
path: string // required, the form path to store the HTML under
label?: string
helptext?: string
required?: boolean
conditional?: boolean
maxlength?: number
configType?: 'full' | 'min' | 'minwithlist' | 'ti' // preset toolbar, defaults to 'full'
templateProperties?: TemplateProperties // site palettes, fonts, and headings, see below
config?: EditorConfig // raw CKEditor config, spread over the preset; reach for templateProperties first
compact?: boolean // shorter editor, defaults to true when maxlength is unset or under 400
strictHtml?: boolean // drop GeneralHtmlSupport, so only markup a real editor feature understands survives
editor?: ClassicEditor // bind:editor if you need the instance
```

### Site palettes

Out of the box the editor knows nothing about your site's colors. Font and table cell colors use CKEditor's stock palette. There is no fallback for table header colors: they're class names that only your site CSS styles, so without `tableHeaderColors` the table form has no header color dropdown and any `header-color-*` classes in existing content are dropped when it loads.

To offer your own, pass `templateProperties`:

```ts
const templateProperties = {
  definitionColors: ['#222222', '#501214'], // font colors
  templateColors: [{ label: 'Maroon', color: '#501214' }], // table cell background colors
  tableHeaderColors: [ // classes added to the table's figure
    { label: 'None', value: 'header-color-none' },
    { label: 'Maroon', value: 'header-color-maroon', default: true, color: '#501214' }
  ],
  fontFamilies: ['Georgia, serif'], // adds a font family dropdown
  headingOptions: [...] // replaces the heading dropdown, same shape as CKEditor's heading.options
}
```

Mark the header color your site gives a table without any header color class as `default`. The dropdown shows it for those tables, and picking it removes the header color class rather than writing its own. Every other entry writes its class, including "None" if you offer one (a site that styles header cells by default needs a class like `header-color-none` to turn that off). `color` is optional and only used to preview the header row in the editor, which doesn't load your site's CSS. Without it, the preview uses the `templateColors` entry with the same label (for a label like "Default (Gold)", the part in parentheses).

The `min` and `minwithlist` presets ignore all of this, and `ti` ignores the table options because it has no tables.

### Browsing for links and images

The link form gets a Browse button and the image button opens a browser instead of a file upload. Both open the `@dosgato/dialog` Chooser, using the chooser client that `Form` puts in context, so there's nothing to wire up beyond what your dialogs already have.

### Note about stored HTML

The HTML saved to your form is not quite the HTML the editor shows. On the way in, links and images stored as DosGato ids or JSON link descriptors (`href='{"type":"page",...}'`) are resolved to real URLs through the chooser client. On the way out, URLs the chooser client recognizes are turned back into ids, so links survive pages and assets being moved or renamed. Old CKEditor 4 image markup is also converted on the way in.

## Upgrading from 1.x

See [CHANGELOG.md](CHANGELOG.md). The short version: the field's props didn't change, but stored content does get rewritten in a few places the first time it's re-saved, and the Texas State color palettes are no longer the defaults.

## Development

- `npm run dev` starts a demo page with an editor on it.
- `./test.sh` (or `npm test`) runs 112 samples of real production content, with the text replaced by lorem ipsum, through the editor and checks that each comes out exactly like its file in `test/expected`. Run it after anything that could change content. It uses your installed Chrome.
- When a change in output is intended (a CKEditor upgrade, say), `./test.sh -u` rewrites `test/expected`, and the git diff is your review. Each block element is on its own line in those files, so the diffs are readable.
- `/report` on the dev server shows the samples that failed the last run, expected and actual output rendered side by side. It renders with the Texas State theme's content CSS, compiled from a sibling `../dosgato-txstate` checkout. Look here before you `-u`, because a lot of changes are easier to judge rendered than as markup.
- To add more samples, put real content in a `richexamples.json` (`{ "samples": [{ "html": "..." }] }`, gitignored) and run `npm run import-samples`. It anonymizes them into `test/samples`, and refuses any sample where the anonymized copy doesn't behave exactly like the original in the editor.
- `npm run check` and `npm run lint` before publishing.
