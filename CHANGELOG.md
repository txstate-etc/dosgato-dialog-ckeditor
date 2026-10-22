# Changelog

## 2.0.0

CKEditor 35 → 48. The editor used to come prebuilt from `@dosgato/ckeditor`; it's now built in this package from the `ckeditor5` package, with stock plugins wherever they exist. `FieldRichText`'s props are unchanged apart from the new `strictHtml`, but there are a few things to know before upgrading a host.

### Breaking

- **Texas State palettes are no longer the defaults.** Font colors, table cell background colors, and table header colors used to fall back to the gold/maroon palettes. Now they fall back to CKEditor's stock palette, and header colors to `header-color-none`/`header-color-default`. Hosts that relied on the fallback must pass `templateProperties` (see the README). `templateColorLabel` is gone; nothing ever read it.
- **`tableHeaderColors` entries are `{ label, value, default? }`**, where `value` is the CSS class. The type used to claim `{ label, color }`, which never matched what the code read.
- **Node 22 or later.**
- **Toolbar names in custom `config`:** the old fork names are gone. Use `bookmark` instead of `anchor`, `insertImage` instead of `assetBrowserImage` (still accepted as an alias), `imageTextAlternative` instead of `imageTxtAlternative`, and `tableColumn`/`tableRow` instead of `customTableColumn`/`customTableRow`. CKEditor warns about and skips names it doesn't know.

### Content changes on re-save

Content is not rewritten until someone opens and saves it, and all of these were checked against 112 production samples to make sure nothing renders differently in ways that matter:

- Anchors are written as `<a id="x">` instead of `<a name="x">`. Browsers treat both as link targets. Anchors that wrap text (`<a name="x"><h2>Title</h2></a>`), which 1.x destroyed on save, now survive.
- Legacy `<table align="left|right">` becomes a `table-style-align-*` class. The Texas State theme has no CSS for those classes, so a table that used to float beside text will stop floating. `align="center"` is dropped, which was already a no-op on the site.
- `cellpadding` on tables is dropped, so theme padding applies. The `border` attribute is kept as-is.
- An explicit `border-style:none` on a pasted table is dropped, so it picks up the theme's table borders like any other table.
- A table whose whole first row is `<th>` gains a `<thead>`. It renders the same.
- `<label>` elements are kept, where 1.x unwrapped them (which made `<label hidden>` text visible).
- Some links that 1.x silently dropped (`<a href="">` wrappers, for instance) are kept.

### Editor changes

- The link form is CKEditor's new one, plus a Browse button for the Chooser. The URL/email/phone/anchor type dropdown is gone: email addresses get `mailto:` automatically, anchors on the same page are picked from the Bookmarks list, and phone links have to be typed as `tel:...`.
- The image button relabels to "Replace image" when an image is selected, and preselects that image in the Chooser.
- Table properties keep the class-based width/border/alternate-row/header-color options. Header rows and columns are now set through CKEditor's own table API.
- New `strictHtml` prop removes GeneralHtmlSupport, so markup that no editor feature understands is stripped.
- `getConfig` copies the preset before changing it, so two editors on one page with different `templateProperties` no longer leak options into each other.
