// GeneralHtmlSupport allow-list, ported from dosgato-ckeditor src/utils/defaultConfigs.js.
// Elements not listed here are handled by dedicated editor features (or dropped).
const strictAllowedContent = 'address article aside button div em footer form header iframe img input label link nav noscript ol optgroup option p script section select span style table tbody td tfoot th thead tr ul'
const strictAllowedStyles = 'background, background-attachment, background-clip, background-color, background-image, background-origin, background-position, background-position-block, background-position-inline, background-position-x, background-position-y, background-repeat, background-size, border, border-bottom, border-bottom-color, border-bottom-left-radius, border-bottom-right-radius, border-bottom-style, border-bottom-width, border-boundary, border-clip, border-clip-bottom, border-clip-left, border-clip-right, border-clip-top, border-collapse, border-color, border-image, border-image-outset, border-image-repeat, border-image-slice, border-image-source, border-image-width, border-left, border-left-color, border-left-style, border-left-width, border-limit, border-radius, border-right, border-right-color, border-right-style, border-right-width, border-spacing, border-style, border-top, border-top-color, border-top-left-radius, border-top-right-radius, border-top-style, border-top-width, border-width, bottom, box-shadow, clear, clear-after, content, cursor, display, float, height, left, max-height, max-width, min-height, min-width, object-fit, object-position, opacity, overflow, overflow-x, overflow-y, padding, padding-bottom, padding-left, padding-right, padding-top, position, right, table-baseline, table-column-span, table-layout, table-row-span, text-overflow, text-transform, top, transform, width, z-index'

export const htmlSupport = strictAllowedContent.split(' ').map(name => ({
  name,
  styles: strictAllowedStyles.split(', '),
  classes: true as const,
  attributes: true as const
}))
