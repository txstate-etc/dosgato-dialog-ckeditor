import { ButtonView, ContextualBalloon, FormRowView, Plugin, type LinkFormView, type ViewCollection } from 'ckeditor5'

/**
 * Adds a "Browse pages & assets" button to the stock link form, wired to the
 * host's `config.assetBrowser.browseLink(currentUrl, cb)` (see assetbrowser.ts
 * for the contract). Replaces the old dosgato-ckeditor Link/ fork: 48.x's
 * revamped LinkUI has no sanctioned hook for a modal browser (its
 * registerLinksListProvider only renders static link lists), so we decorate
 * the lazily-created form view instead — still far smaller than re-subclassing
 * LinkUI and its form views.
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
    if (!config?.browseLink) return
    const balloon = editor.plugins.get(ContextualBalloon)
    // LinkUI builds its form view lazily on first show, so watch the balloon
    // and decorate the form the first time it appears.
    let decorated = false
    this.listenTo(balloon, 'change:visibleView', () => {
      const linkUI = editor.plugins.get('LinkUI')
      const formView = linkUI.formView
      if (decorated || !formView || balloon.visibleView !== formView) return
      decorated = true
      this._addBrowseButton(formView)
    })
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
