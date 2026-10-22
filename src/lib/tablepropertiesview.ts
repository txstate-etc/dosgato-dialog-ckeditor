/**
 * The balloon form for DosGato's class-based table properties (see
 * tableproperties.ts for the feature itself). Ported from the dosgato-ckeditor
 * fork's Table/TablePropertiesView, rebuilt on public `ckeditor5` UI
 * primitives: two dropdowns (headers, header colors), a width dropdown and two
 * toggle buttons (border, alternating row background), all bound to observable
 * string properties that tableproperties.ts syncs with its commands.
 */
import {
  ButtonView, Collection, FocusCycler, FocusTracker, FormHeaderView, FormRowView,
  IconCancel, IconCheck, KeystrokeHandler, LabeledFieldView, UIModel, View,
  ViewCollection, addListToDropdown, createLabeledDropdown, submitHandler,
  type FocusableView, type ListDropdownItemDefinition, type Locale
} from 'ckeditor5'

export interface TableClassOption {
  label: string
  value: string
  default?: boolean
}

/** The dropdown/toggle config hosts provide under `table.tableProperties`. */
export interface TableClassPropertiesConfig {
  tableWidth?: TableClassOption[]
  tableHeaders?: TableClassOption[]
  tableHeaderColors?: TableClassOption[]
}

type DropdownKey = 'tableHeaders' | 'tableHeaderColors' | 'tableWidth'

export default class TablePropertiesView extends View {
  declare tableHeaders: string
  declare tableHeaderColors: string
  declare tableWidth: string
  declare tableBorder: string
  declare tableAltBGColor: string

  options: Required<TableClassPropertiesConfig>
  readonly focusTracker = new FocusTracker()
  readonly keystrokes = new KeystrokeHandler()
  children: ViewCollection
  saveButtonView: ButtonView
  cancelButtonView: ButtonView
  headersDropdownView: LabeledFieldView
  headerColorsDropdownView: LabeledFieldView
  widthDropdownView: LabeledFieldView
  borderButtonView: ButtonView
  altBGButtonView: ButtonView
  protected readonly _focusables = new ViewCollection<FocusableView>()
  protected readonly _focusCycler: FocusCycler

  constructor (locale: Locale, options: TableClassPropertiesConfig) {
    super(locale)

    this.set({
      tableHeaders: '',
      tableHeaderColors: '',
      tableWidth: '',
      tableBorder: '',
      tableAltBGColor: ''
    })

    this.options = {
      tableWidth: options.tableWidth ?? [],
      tableHeaders: options.tableHeaders ?? [],
      tableHeaderColors: options.tableHeaderColors ?? []
    }

    this.headersDropdownView = this._createDropdown('tableHeaders', 'Headers', this.options.tableHeaders)
    this.headerColorsDropdownView = this._createDropdown('tableHeaderColors', 'Header Colors', this.options.tableHeaderColors)
    this.widthDropdownView = this._createDropdown('tableWidth', 'Table Width', this.options.tableWidth)

    const { borderButtonView, altBGButtonView } = this._createToggleButtons()
    this.borderButtonView = borderButtonView
    this.altBGButtonView = altBGButtonView

    const { saveButtonView, cancelButtonView } = this._createActionButtons()
    this.saveButtonView = saveButtonView
    this.cancelButtonView = cancelButtonView

    this._focusCycler = new FocusCycler({
      focusables: this._focusables,
      focusTracker: this.focusTracker,
      keystrokeHandler: this.keystrokes,
      actions: {
        focusPrevious: 'shift + tab',
        focusNext: 'tab'
      }
    })

    this.children = this.createCollection()
    this.children.add(new FormHeaderView(locale, { label: this.t!('Table Properties') }))
    this.children.add(new FormRowView(locale, {
      children: [this.headersDropdownView, this.headerColorsDropdownView],
      class: 'ck-table-form__border-row'
    }))
    this.children.add(new FormRowView(locale, {
      children: [this.widthDropdownView],
      class: 'ck-table-form__border-row'
    }))
    this.children.add(new FormRowView(locale, {
      children: [this.borderButtonView, this.altBGButtonView],
      class: 'ck-table-form__border-row'
    }))
    this.children.add(new FormRowView(locale, {
      children: [this.saveButtonView, this.cancelButtonView],
      class: 'ck-table-form__action-row'
    }))

    this.setTemplate({
      tag: 'form',
      attributes: {
        class: ['ck', 'ck-form', 'ck-table-form', 'ck-table-properties-form'],
        tabindex: '-1'
      },
      children: this.children
    })

    // Keep the two header dropdowns consistent: "no headers" forces the "none"
    // color, and picking headers again while the color is "none" restores the
    // default color.
    this.on('change:tableHeaders', (evt, name, newValue: string) => {
      const colors = this.options.tableHeaderColors
      if (newValue.includes('none')) {
        const none = colors.find(({ label, value }) => value.toLowerCase().includes('none') || label.toLowerCase().includes('none'))
        this.tableHeaderColors = none?.value ?? ''
      } else if (this.tableHeaderColors.includes('none')) {
        const defaultColor = colors.find(({ label, value, default: d }) => d || value.toLowerCase().includes('default') || label.toLowerCase().includes('default'))
        if (defaultColor) this.tableHeaderColors = defaultColor.value
        else if (colors.length) this.tableHeaderColors = colors[0].value
      }
    })
  }

  override render () {
    super.render()

    // Enable the "submit" event, triggered by the save button's DOM type.
    submitHandler({ view: this })

    for (const view of [
      this.headersDropdownView,
      this.headerColorsDropdownView,
      this.widthDropdownView,
      this.borderButtonView,
      this.altBGButtonView,
      this.saveButtonView,
      this.cancelButtonView
    ]) {
      this._focusables.add(view)
      this.focusTracker.add(view.element!)
    }

    // Mainly for closing with Esc and navigating with Tab.
    this.keystrokes.listenTo(this.element!)
  }

  override destroy () {
    super.destroy()
    this.focusTracker.destroy()
    this.keystrokes.destroy()
  }

  focus () {
    this._focusCycler.focusFirst()
  }

  protected _createDropdown (key: DropdownKey, label: string, items: TableClassOption[]) {
    const t = this.t!
    const labels: Record<string, string> = {}
    for (const item of items) labels[item.value] = t(item.label)

    const dropdown = new LabeledFieldView(this.locale, createLabeledDropdown)
    dropdown.set({ label: t(label) })
    dropdown.fieldView.buttonView.set({ label: t(label), isOn: false, withText: true })
    dropdown.fieldView.buttonView.bind('label').to(this, key, (value: string) => labels[value] ?? Object.values(labels)[0])
    dropdown.fieldView.on('execute', evt => { (this as any)[key] = (evt.source as any).commandParam })
    dropdown.bind('isEmpty').to(this, key, (value: string) => !value)

    const definitions = new Collection<ListDropdownItemDefinition>()
    for (const item of items) {
      definitions.add({
        type: 'button',
        model: new UIModel({ commandParam: item.value, label: labels[item.value], withText: true })
      })
    }
    addListToDropdown(dropdown.fieldView, definitions)

    return dropdown
  }

  protected _createToggleButtons () {
    const t = this.t!
    const locale = this.locale

    const borderButtonView = new ButtonView(locale)
    borderButtonView.set({ label: t('Border'), withText: true, isToggleable: true })
    borderButtonView.bind('isOn').to(this, 'tableBorder', (value: string) => !!value)
    borderButtonView.on('execute', () => {
      this.tableBorder = borderButtonView.isOn ? '' : 'border'
    })

    const altBGButtonView = new ButtonView(locale)
    altBGButtonView.set({ label: t('Alternating Background'), withText: true, isToggleable: true })
    altBGButtonView.bind('isOn').to(this, 'tableAltBGColor', (value: string) => !!value)
    altBGButtonView.on('execute', () => {
      this.tableAltBGColor = altBGButtonView.isOn ? '' : 'alternate-row-color'
    })

    return { borderButtonView, altBGButtonView }
  }

  protected _createActionButtons () {
    const t = this.t!
    const locale = this.locale

    const saveButtonView = new ButtonView(locale)
    saveButtonView.set({
      label: t('Save'),
      icon: IconCheck,
      class: 'ck-button-save',
      type: 'submit',
      withText: true
    })

    const cancelButtonView = new ButtonView(locale)
    cancelButtonView.set({
      label: t('Cancel'),
      icon: IconCancel,
      class: 'ck-button-cancel',
      withText: true
    })
    cancelButtonView.delegate('execute').to(this, 'cancel')

    return { saveButtonView, cancelButtonView }
  }
}
