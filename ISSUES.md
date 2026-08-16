# Issues to address later

## getConfig mutates the shared config objects

`getConfig` in [RichTextTypes.ts](src/lib/RichTextTypes.ts) writes directly into the module-level `defaultConfig` and `tiConfig` objects (`config.fontColor = ...`, `config.toolbar.items.push('fontFamily')`, `config.table.tableCellProperties = ...`). Every editor on the page shares those objects, so two editors with different `templateProperties` will fight over them — the last one mounted wins, and the earlier editor silently gets the wrong fonts, colors, or headings. Most of the mutations happen to be self-correcting because each call overwrites the same keys, which is why nobody has noticed, but the `push`/`splice` on `toolbar.items` and the heading swap are genuinely order-dependent. The fix is to have `getConfig` deep-clone its starting config before touching it.

Related: the heading-restore branch had a real bug (`{ ...config, headingConfig }` instead of `{ ...config, ...headingConfig }`) that was fixed during the 2026-08 lint/TS update, so the default heading options now actually get restored. If anything downstream was accidentally relying on custom headings surviving into later editors, that behavior changed.

## Type packages don't match the runtime editor

The runtime editor comes from `@dosgato/ckeditor`, a prebuilt bundle of CKEditor **35** that ships no types. Our `@ckeditor/ckeditor5-core` and `@ckeditor/ckeditor5-editor-classic` devDependencies are pinned to **41** because 35 never published declarations at all (CKEditor added them in 37). The APIs we touch are stable across that range, so this works, but it means the compiler is checking us against an editor four majors newer than the one that actually runs. The real fix is upstream: rebuild dosgato-ckeditor on a modern, typed CKEditor and then align these packages with it.

## SourceEditing checks are cast to any

Both [RichTextEditor.svelte](src/lib/RichTextEditor.svelte) and [FieldRichText.svelte](src/lib/FieldRichText.svelte) do `(editor.plugins.get('SourceEditing') as any)?.isSourceEditingMode`. `plugins.get` by string name returns a bare `Plugin`, which doesn't know about `isSourceEditingMode`. Installing `@ckeditor/ckeditor5-source-editing` as a types-only devDependency and importing the plugin class would make this properly typed, but it drags in more of the version-mismatch problem above, so it stays a cast until the runtime build is modernized.

## Components are still Svelte 3/4 style

Everything uses `export let` and `$:` even though Svelte 5 is what's installed and what the demo runs on. That's fine for now — Svelte 5 supports the old syntax — but it's why the eslint config keeps `@typescript-eslint/no-deprecated` off. A runes migration would let us turn that rule back on and drop the `^3.55.1 || ^4.0.0` halves of the svelte peer range.

## No test suite

The model repo (dosgato-dialog) runs vitest; this package has nothing. The `initialize`/`finalize` HTML rewriting in FieldRichText (link/image id-to-url translation, the CKEditor 4 figure conversion) is exactly the kind of string-munging that deserves unit tests — it's pure DOM-in, DOM-out and would be easy to cover without mounting an editor.
