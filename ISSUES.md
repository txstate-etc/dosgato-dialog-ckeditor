# Issues to address later

## Linking to anchors elsewhere on the page

A long-standing feature request: when an editor links to an anchor, it can only see anchors inside its own rich text — but a page is usually assembled from many components, and the anchor you want is often in a different one. The host knows the full set (it rendered the page), so what's missing is a way to hand that list to the editor.

CKEditor 48's link form has a sanctioned extension point that fits this exactly: `LinkUI.registerLinksListProvider` (the same API that puts the stock "Bookmarks" row in the link form — that row already covers same-editor anchors). A provider is a labeled button that opens a flat list of links; its `getListItems()` must return the complete list synchronously, which is what disqualified it for the pages/assets Chooser but is no obstacle here — a list of anchor names is small, flat, and known before the dialog opens.

Where the list comes from matters more than how the editor displays it. Template developers write the dialog themselves and drop `<FieldRichText>` into it; they shouldn't have to go find the other anchors on the page and pass them in. Collecting them is the CMS's job, so the list should arrive through context that the admin already provides.

The existing chooser client is the natural carrier. dosgato-admin builds a `ChooserClient` per page (`new ChooserClient(page.pagetree.id)` in `routes/pages/[id]/+page.svelte`), hands it to `FormDialog`, and `Form` puts it in `CHOOSER_API_CONTEXT`, which FieldRichText already reads. So the only change in `@dosgato/dialog` is a new optional method on its `Client` interface, something like `getAnchors?: () => Promise<{ anchor: string, label: string }[]>`. Because it's optional, it doesn't break anyone, and hosts that don't implement it just don't get the button. No new context key is needed, and other link-producing fields in dialog (FieldChooserLink, say) could call the same method later. The name "chooser client" is a bit of a stretch for this, but in practice it's already the per-page services object that dialogs get.

It can be async, even though `getListItems()` has to be synchronous: FieldRichText's `initialize` is already async, so it can await the anchors before the editor is created and pass the resolved list into the config. That leaves the admin free to get anchor names however it likes, whether from page data or from the rendered iframe.

A prop is still worth having alongside it, something like `pageAnchors: [{ anchor: 'contact', label: 'Contact Us (Footer component)' }]`. It covers anchors the core can't know about: ones a template creates at render time, or targets that only make sense for one particular field. FieldRichText merges the two lists, dedupes by anchor name (the prop's label wins, since it's the more specific source), and sorts alphabetically by label. It uses a prop rather than `templateProperties` because the anchor list is per-page-instance data, while templateProperties is static template config.

The merged list flows through RichTextEditor into the editor config, and a few lines in [linkbrowser.ts](src/lib/linkbrowser.ts) register a provider (label it something like "On this page") that maps each entry to `{ id, href: '#' + anchor, label }`. Only register it when the list is non-empty, so the button doesn't appear for hosts that provide neither. The optional `getItem` callback would also let the link preview show the anchor's label instead of a bare `#contact`.

One wrinkle: a list built from the saved page will include the anchors in the component being edited. Those go out of date as soon as the user edits them, and they already appear in the stock Bookmarks row. The client is page-scoped rather than dialog-scoped, so it doesn't automatically know which component is open. It can read `$editorStore.editing.path` to leave that component out, or the editor can filter out any names its own bookmarks already cover. The editor-side filter is the more robust of the two, because it also handles anchors the user adds or removes during the edit.

The editor-side work is small. The real work is in dosgato-admin: implementing `getAnchors` on `ChooserClient` by collecting anchor names from the other components on the page.

## Phone links lost their helper in the CKEditor 48 upgrade

The old link form had a type dropdown (URL / email / phone / anchor) that prefixed the protocol for you. The 48 upgrade dropped it: stock CKEditor now auto-prefixes `mailto:` when you type an email, and `https://` on bare domains via `link.defaultProtocol`, and anchors are picked from the Bookmarks list — but there is no `tel:` detection anywhere in the link package, so a user creating a phone link has to know to type `tel:512-245-1111` themselves.

If this generates complaints, [linkbrowser.ts](src/lib/linkbrowser.ts) already owns the link form and could rewrite the field on submit: a high-priority listener on the form's `submit` event that sees a digits-and-punctuation-only value and prefixes `tel:` before LinkUI reads it. Maybe ten lines. It's a heuristic, but a value like `512-245-1111` is never anything else in practice.



## SourceEditing checks are cast to any

Both [RichTextEditor.svelte](src/lib/RichTextEditor.svelte) and [FieldRichText.svelte](src/lib/FieldRichText.svelte) do `(editor.plugins.get('SourceEditing') as any)?.isSourceEditingMode`. `plugins.get` by string name returns a bare `Plugin`, which doesn't know about `isSourceEditingMode`. Now that types come from `ckeditor5` itself, `plugins.get('SourceEditing')` is typed through its `PluginsMap` augmentation and the casts could go. The catch is that `plugins.get` throws when the plugin isn't loaded, so if a host's `config.removePlugins` ever drops SourceEditing these calls would need an `editor.plugins.has('SourceEditing')` guard rather than the `?.` they lean on today.

## Components are still Svelte 3/4 style

Everything uses `export let` and `$:` even though Svelte 5 is what's installed and what the demo runs on. That's fine for now — Svelte 5 supports the old syntax — but it's why the eslint config keeps `@typescript-eslint/no-deprecated` off. A runes migration would let us turn that rule back on and drop the `^3.55.1 || ^4.0.0` halves of the svelte peer range.

## No unit tests for finalize

`./test.sh` covers the editor and the storage→editor half (`initialize`, via [storage.ts](src/lib/storage.ts)) against real production content, but the editor→storage half, `finalize` in [FieldRichText.svelte](src/lib/FieldRichText.svelte) (url-to-id translation), has no coverage at all. It's pure DOM-in, DOM-out with an injected lookup, so extracting it next to `resolveStoredHtml` would make it testable in the existing vitest setup without mounting an editor.

## Link translation ignores srcset

The `initialize`/`finalize` pair only looks at `[href]` and `[src]` (in [storage.ts](src/lib/storage.ts) on the way in, in [FieldRichText.svelte](src/lib/FieldRichText.svelte) on the way out). A `srcset` attribute, on an `<img>` or on a `<source>` inside `<picture>`, passes through untouched in both directions. So an image whose `src` gets turned into an asset id on save still has its `srcset` pointing at hard-coded URLs, and those break if the asset is moved, renamed, or deleted. That means a responsive image quietly rots in exactly the way the id translation exists to prevent.

It isn't hypothetical: one sample in production (test/samples/075.html) already has a `srcset` full of `docs.gato.txst.edu/.../w/401/...` resize URLs.

The fix is a little more than adding `[srcset]` to the selectors, because the value is a comma-separated list of `url descriptor` candidates (`a.jpg 400w, b.jpg 800w`), and each URL has to be split out, translated, and put back with its descriptor. The harder question is what to translate them *to*. Those URLs are usually resize variants of one asset, not the asset itself, so a lookup that maps the original asset URL to its id won't necessarily recognize `/w/401/` URLs. The options are to teach the chooser client's `findByUrl`/`urlToValue` to recognize resize URLs, or to drop `srcset` on save and have the render side generate it from the asset id. If the render side can already produce resized variants for an asset, the second option is probably the cleaner one.

## dosgato-txstate follow-up for table alignment and header color previews

The table properties form now offers alignment (center, or floated left/right with text wrapping), written as CKEditor's `table-style-align-left`/`-right`/`-center` classes on `figure.table`. The `richEditorTable` mixin in dosgato-txstate has no rules for those, so an aligned table floats in the editor but not on the live site. Adding them (float plus a side margin, like CKEditor's content CSS) also brings back the float that legacy `align="left|right"` tables lost in 2.0.0, since those now carry the same classes. A floated table only wraps text if it's narrower than the column, so the rules probably belong next to `auto-width`.

Separately, the editor previews each header color using the `templateColors` entry with the same label. That covers every dosgato-txstate template today, but some of those palette hexes drift from what the theme CSS actually paints: on txst, Deep Blue, River, Sandstone and Old Gold in `templateColors` don't match `--blue`, `--river`, `--sandstone` and `--oldgold` in `txstcolors.css`. The preview is close, not exact. Bringing the palettes in line would fix both the preview and the cell background swatches, which really are meant to match the theme. A `color` on a `tableHeaderColors` entry overrides the lookup if a template ever needs that.
