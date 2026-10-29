import { ButtonView, ContextualBalloon, FormRowView, Plugin, type LinkFormView, type ViewCollection } from 'ckeditor5'

/**
 * `tel:` href for a value that is only a phone number: digits with common
 * separators (space . - parentheses), optionally a leading +, 7 to 15 digits
 * (E.164 caps at 15), then an optional extension (x123, ext. 123,
 * extension 123) which becomes RFC 3966's ;ext=123. Spaces become dashes since
 * RFC 3966 only allows - . ( ) as visual separators. Anything else, including
 * values that already have a protocol, returns undefined.
 */
export function phoneToTel (value: string) {
  const m = /^(\+?[\d\s().-]+?)(?:[\s,]*(?:x|ext\.?|extension)\s*(\d+))?$/i.exec(value.trim())
  if (!m) return undefined
  const number = m[1].trim()
  const digits = number.replace(/\D/g, '').length
  if (digits < 7 || digits > 15) return undefined
  return 'tel:' + number.replace(/\s+/g, '-') + (m[2] ? ';ext=' + m[2] : '')
}

/**
 * Corrections to a URL typed into the link form, made before stock adds its
 * own protocol: phone numbers become tel: links (see phoneToTel), and a
 * protocol-less URL with a / before its first @ gets `defaultProtocol`, since
 * stock's email check would otherwise take www.threads.net/@texas.state for an
 * address and make it mailto:. Returns undefined when stock can handle it.
 */
export function fixTypedLink (value: string, defaultProtocol = 'https://') {
  const tel = phoneToTel(value)
  if (tel) return tel
  const trimmed = value.trim()
  if (/^(?!\w+:)\w[^@]*\/[^@]*@/.test(trimmed)) return defaultProtocol + trimmed
  return undefined
}

/**
 * Adds a "Browse pages & assets" button to the stock link form, wired to the
 * host's `config.assetBrowser.browseLink(currentUrl, cb)` (see assetbrowser.ts
 * for the contract). Replaces the old dosgato-ckeditor Link/ fork: 48.x's
 * revamped LinkUI has no sanctioned hook for a modal browser (its
 * registerLinksListProvider only renders static link lists), so we decorate
 * the lazily-created form view instead — still far smaller than re-subclassing
 * LinkUI and its form views. Also corrects typed URLs (see fixTypedLink),
 * with or without the browse hook.
 */
export default class LinkBrowser extends Plugin {
  static get requires () {
    return ['LinkUI'] as const
  }

  static get pluginName () {
    return 'LinkBrowser' as const
  }

  afterInit () {
    const editor = this.editor
    const config = editor.config.get('assetBrowser')
    const balloon = editor.plugins.get(ContextualBalloon)
    // LinkUI builds its form view lazily on first show, so watch the balloon
    // and decorate the form the first time it appears.
    let decorated = false
    this.listenTo(balloon, 'change:visibleView', () => {
      const linkUI = editor.plugins.get('LinkUI')
      const formView = linkUI.formView
      if (decorated || !formView || balloon.visibleView !== formView) return
      decorated = true
      this._addTypedLinkFixes(formView)
      if (config?.browseLink) this._addBrowseButton(formView)
    })
  }

  /**
   * Apply fixTypedLink before LinkUI's own submit listener reads the field.
   */
  _addTypedLinkFixes (formView: LinkFormView) {
    const defaultProtocol = this.editor.config.get('link.defaultProtocol')
    this.listenTo(formView, 'submit', () => {
      const input = formView.urlInputView.fieldView.element
      if (!input) return
      const fixed = fixTypedLink(input.value, defaultProtocol)
      if (fixed) input.value = fixed
    }, { priority: 'high' })
  }

  _addBrowseButton (formView: LinkFormView) {
    const editor = this.editor
    const config = editor.config.get('assetBrowser')!
    const balloon = editor.plugins.get(ContextualBalloon)

    const button = new ButtonView(editor.locale)
    button.set({
      label: 'Browse',
      withText: true,
      tooltip: 'Browse pages & assets'
    })

    button.on('execute', () => {
      // The chooser modal steals focus, which closes the balloon, so capture
      // the selection now and restore it before re-opening the form.
      const ranges = Array.from(editor.model.document.selection.getRanges())
      const currentUrl = formView.urlInputView.fieldView.element?.value ?? ''
      void config.browseLink!(currentUrl, linkUrl => {
        editor.model.change(writer => { writer.setSelection(ranges) })
        const linkUI = editor.plugins.get('LinkUI') as any
        linkUI._showUI(true)
        if (!balloon.hasView(formView)) linkUI._addFormView()
        // reset first so the observable fires even when re-picking the same url
        formView.urlInputView.fieldView.value = ''
        formView.urlInputView.fieldView.value = linkUrl
      })
    })

    // The stock form packs the primary action into the URL row (Displayed
    // text, then URL + Insert, then the links providers). Browsing is our
    // primary path, so swap: Browse sits next to the URL input where Insert
    // was, and Insert gets its own bottom-right row (flex-end via editor.css)
    // so the confirm action reads last.
    const urlRow = Array.from(formView.children).find((row): row is FormRowView =>
      row instanceof FormRowView && Array.from(row.children).includes(formView.urlInputView))
    if (urlRow) {
      urlRow.children.remove(formView.saveButtonView)
      urlRow.children.add(button)
      formView.children.add(new FormRowView(editor.locale, {
        children: [formView.saveButtonView],
        class: ['ck-form__row_with-submit', 'ck-form__row_large-bottom-padding', 'dg-link-form-save']
      }))
    } else {
      // upstream rearranged the form; fall back to appending a labeled row
      formView.children.add(new FormRowView(editor.locale, { children: [button] }))
    }

    // The form's focus cycler collected its focusables at render time; slot
    // Browse in where Insert was and move Insert to the end to match the new
    // visual order.
    const focusables = (formView as any)._focusables as ViewCollection
    const saveIndex = focusables.getIndex(formView.saveButtonView)
    if (urlRow && saveIndex >= 0) {
      focusables.remove(formView.saveButtonView)
      focusables.add(button, saveIndex)
      focusables.add(formView.saveButtonView)
    } else {
      focusables.add(button)
    }
    formView.focusTracker.add(button.element!)
  }
}
