/**
 * DosGato's class-based semantic table properties (PLAN.md chunk 5), the last
 * genuine fork ported from dosgato-ckeditor (Table/ + Table/Commands/). Where
 * upstream's TableProperties styles tables with inline CSS, DosGato records
 * semantics as CSS classes on the `<figure class="table">` wrapper — width
 * (`full-width`/`auto-width`), `border`, `alternate-row-color` and
 * `header-color-*` — so sites can restyle content without touching it. The
 * form also offers stock TablePropertiesEditing's alignment, which already
 * writes classes (`table-style-align-*`). Header rows and columns are left to
 * the stock row/column toolbar dropdowns.
 *
 * The classes live in a `class` attribute on the model table (like the 35.4
 * fork), upcast from the wrapping figure when there is one, else from the
 * `<table>` element itself (where CKEditor 4 content had them; `border="1"`
 * counts as the `border` class). Inline-style round-tripping stays with stock
 * TablePropertiesEditing — this feature deliberately registers only the
 * `tableProperties` toolbar component (a balloon form, see
 * tablepropertiesview.ts), replacing stock TablePropertiesUI.
 */
import {
  ButtonView, Command, ContextualBalloon, IconTableProperties, Plugin, clickOutsideHandler,
  _getBalloonTablePositionData, _getTableWidgetAncestor, _repositionTableContextualBalloon,
  type Batch, type Editor, type ModelDocumentSelection, type ModelElement, type ViewElement
} from 'ckeditor5'
import TablePropertiesView, { type TableClassOption, type TableClassPropertiesConfig } from './tablepropertiesview.js'

// Give hosts types for the custom keys presets pass under
// `table.tableProperties` (they coexist with stock keys like
// defaultProperties, which stock TablePropertiesEditing still reads).
declare module '@ckeditor/ckeditor5-table' {
  interface TablePropertiesConfig {
    tableWidth?: TableClassOption[]
    tableHeaderColors?: TableClassOption[]
  }
}

interface TablePropertyCommandOptions {
  value?: string
  oldValue?: string
  batch?: Batch
}

// View property -> command name. Ours except tableAlignment, which is stock
// TablePropertiesEditing's, and tableWidthClass, renamed because stock already
// registers an (inline-style) tableWidth.
const propertyToCommandMap = {
  tableHeaderColors: 'tableHeaderColors',
  tableWidth: 'tableWidthClass',
  tableAlignment: 'tableAlignment',
  tableBorder: 'tableBorder',
  tableAltBGColor: 'tableAltBGColor'
} as const

// Black or white text for a header background, whichever reads better. Colors
// it can't parse (named colors, var()) get the editor's text color.
function contrastingText (background: string) {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(background.trim())?.[1]
  if (!hex) return 'inherit'
  const full = hex.length === 3 ? hex.replace(/./g, '$&$&') : hex
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000' : '#fff'
}

// nothing but empty paragraphs, whitespace (nbsp included) and line breaks,
// the same rule dosgato-render uses for the corner
function isBlankCell (cell: ModelElement) {
  for (const block of cell.getChildren()) {
    if (!block.is('element', 'paragraph')) return false
    for (const child of block.getChildren()) {
      if (child.is('$text') ? /\S/.test(child.data) : !child.is('element', 'softBreak')) return false
    }
  }
  return true
}

function getSelectionAffectedTable (selection: ModelDocumentSelection): ModelElement | null {
  const selectedElement = selection.getSelectedElement()
  // selected from the table toolbar vs a cursor inside a cell
  if (selectedElement?.is('element', 'table')) return selectedElement
  return selection.getFirstPosition()?.findAncestor('table') ?? null
}

function getClasses (table: ModelElement | null) {
  const attr = table?.getAttribute('class') as string | undefined
  return attr?.split(/\s+/).filter(Boolean) ?? []
}

/**
 * Manages one group of mutually exclusive classes (or a single toggled class)
 * inside the model table's `class` attribute. `value` reflects which of the
 * group's classes the selected table currently has. The option marked default
 * is how the site renders a table with none of the group's classes, so picking
 * it clears the group instead of writing its class.
 */
class TableClassCommand extends Command {
  declare value: string
  readonly values: string[]
  readonly defaultValue?: string

  constructor (editor: Editor, values: TableClassOption[] | string | undefined) {
    super(editor)
    this.values = typeof values === 'string' ? [values] : (values ?? []).map(v => v.value)
    if (typeof values !== 'string') this.defaultValue = values?.find(v => v.default)?.value
  }

  override refresh () {
    const table = getSelectionAffectedTable(this.editor.model.document.selection)
    const classes = getClasses(table)
    this.isEnabled = !!table
    this.value = this.values.find(v => classes.includes(v)) ?? ''
  }

  override execute (options: TablePropertyCommandOptions = {}) {
    const { oldValue, batch } = options
    const value = options.value === this.defaultValue ? '' : (options.value ?? '')
    const model = this.editor.model
    const table = getSelectionAffectedTable(model.document.selection)
    if (!table) return

    const classes = getClasses(table)
    if (value && classes.includes(value)) return

    // drop everything this command owns (plus the view's idea of the previous
    // value) before adding the new class, so the group stays exclusive
    const next = classes.filter(c => !this.values.includes(c) && c !== oldValue)
    if (value) next.push(value)

    model.enqueueChange(batch ?? model.createBatch(), writer => {
      if (next.length) writer.setAttribute('class', next.join(' '), table)
      else writer.removeAttribute('class', table)
    })
  }
}

export default class TableClassProperties extends Plugin {
  static get requires () {
    return [ContextualBalloon, 'TableEditing', 'TablePropertiesEditing'] as const
  }

  static get pluginName () {
    return 'TableClassProperties' as const
  }

  view: TablePropertiesView | null = null
  protected _balloon!: ContextualBalloon
  protected _undoStepBatch!: Batch
  protected tableProperties!: TableClassPropertiesConfig
  protected _defaultValues!: Record<string, string>
  protected _previewStyle?: HTMLStyleElement
  // false while the form is being filled from the selected table, so the
  // fill's own change events don't execute commands
  protected _isReady = false

  init () {
    const editor = this.editor
    const t = editor.t

    this._balloon = editor.plugins.get(ContextualBalloon)
    this.tableProperties = editor.config.get('table.tableProperties') ?? {}
    // What the form shows for a table with none of a group's classes: the
    // option marked default (how the site renders a classless table), else the
    // first.
    this._defaultValues = Object.fromEntries(
      (['tableHeaderColors', 'tableWidth'] as const).map(key => {
        const options = this.tableProperties[key] ?? []
        return [key, (options.find(o => o.default) ?? options[0])?.value ?? '']
      })
    )
    this._defaultValues.tableAlignment = 'center'

    editor.commands.add('tableHeaderColors', new TableClassCommand(editor, this.tableProperties.tableHeaderColors))
    editor.commands.add('tableWidthClass', new TableClassCommand(editor, this.tableProperties.tableWidth))
    editor.commands.add('tableBorder', new TableClassCommand(editor, 'border'))
    editor.commands.add('tableAltBGColor', new TableClassCommand(editor, 'alternate-row-color'))

    editor.model.schema.extend('table', { allowAttributes: ['class', 'htmlBorder'] })

    // Keep stock Table(Cell)PropertiesEditing away from the legacy border and
    // cellpadding attributes. 48 upcasts them into border-width/padding inline
    // styles on the table and every cell, and inline styles beat site CSS —
    // where as attributes they lost to it. On dosgato-txstate that would strip
    // the `border` class's cell borders from Word pastes carrying border="0"
    // and replace the theme's cell padding with the cellpadding value. Claiming
    // them first makes the stock converters skip them (they test consumable);
    // border still round-trips verbatim via htmlBorder below, and cellpadding
    // is dropped, which renders the same since the themes set cell padding.
    editor.conversion.for('upcast').add(dispatcher => {
      dispatcher.on<any>('element:table', (evt, data, conversionApi) => {
        const viewTable = data.viewItem as ViewElement
        for (const attr of ['border', 'cellpadding']) {
          if (viewTable.hasAttribute(attr)) conversionApi.consumable.consume(viewTable, { attributes: [attr] })
        }
      }, { priority: 'highest' })
    })

    // model class attribute -> classes on the figure wrapper, in both the data
    // and editing pipelines (the mapped view element for a table is the figure)
    editor.conversion.for('downcast').attributeToAttribute({
      model: { name: 'table', key: 'class' },
      view: modelValue => ({ key: 'class', value: modelValue as string })
    })

    // Classes -> model class attribute. Runs after the stock table converter
    // (registration order) so data.modelRange is set. A wrapping
    // figure.table's classes win over the table element's own — matching what
    // 35.4 produced — and only bare tables map border="1" to the border class.
    editor.conversion.for('upcast').add(dispatcher => {
      dispatcher.on<any>('element:table', (evt, data, conversionApi) => {
        if (!data.modelRange) return
        const viewTable = data.viewItem as ViewElement
        const parent = viewTable.parent
        const figure = parent?.is('element', 'figure') && parent.hasClass('table') ? parent : null

        let classes: string[]
        if (figure) {
          classes = [...figure.getClassNames()].filter(c => c !== 'table')
        } else {
          classes = [...viewTable.getClassNames()].filter(c => c !== 'table')
          if (classes.length && viewTable.getAttribute('border') === '1') classes.push('border')
        }
        // header-color-* classes are the host's palette; without one they're
        // meaningless, and there's no dropdown to take them off again
        if (!this.tableProperties.tableHeaderColors?.length) classes = classes.filter(c => !c.startsWith('header-color-'))
        if (classes.length) conversionApi.writer.setAttribute('class', classes.join(' '), data.modelRange)

        // Keep the legacy border attribute verbatim (htmlBorder in the model).
        // Stock TablePropertiesEditing consumes it into tableBorderWidth alone,
        // which downcasts to a border-width style with no border-style — so a
        // Word-paste table whose only border signal was border="1" would lose
        // its rendered border on resave. 35.4 kept the attribute; so do we.
        const border = viewTable.getAttribute('border')
        if (border !== undefined) conversionApi.writer.setAttribute('htmlBorder', border, data.modelRange)
      })
    })

    // htmlBorder goes back onto the <table> itself — the mapped view element
    // for a model table is the figure wrapper, so this needs a custom
    // dispatcher rather than attributeToAttribute (which the class attribute
    // above uses precisely because its classes belong on the figure).
    editor.conversion.for('downcast').add(dispatcher => {
      dispatcher.on<any>('attribute:htmlBorder:table', (evt, data, conversionApi) => {
        if (!conversionApi.consumable.consume(data.item, evt.name)) return
        const figure = conversionApi.mapper.toViewElement(data.item)
        const viewTable = figure && [...figure.getChildren()].find(c => c.is('element', 'table'))
        if (!viewTable) return
        if (data.attributeNewValue != null) conversionApi.writer.setAttribute('border', data.attributeNewValue as string, viewTable)
        else conversionApi.writer.removeAttribute('border', viewTable)
      })
    })

    editor.ui.componentFactory.add('tableProperties', locale => {
      const view = new ButtonView(locale)
      view.set({
        label: t('Table Properties'),
        icon: IconTableProperties,
        tooltip: true
      })
      view.bind('isEnabled').to(editor.commands.get('tableBorder')!, 'isEnabled')
      this.listenTo(view, 'execute', () => { this._showView() })
      return view
    })

    this._addHeaderColorPreview()

    // After the editing downcast (which runs on the same event at low
    // priority), so cells it just re-rendered get the class back.
    this.listenTo(editor.model.document, 'change:data', () => { this._markEmptyCorners() }, { priority: 'lowest' })
    editor.on('ready', () => { this._markEmptyCorners() })
  }

  protected _markedCorners = new Set<ViewElement>()

  /**
   * An empty top-left cell in a table with both a header row and a header
   * column is a `th` labeling nothing, which accessibility checkers flag;
   * dosgato-render turns it into a `td` when rendering. Mark it in the editing
   * view (never in data) so editor.css can show it the way the site will: as
   * a plain cell, without the header background.
   */
  protected _markEmptyCorners () {
    const editor = this.editor
    const corners = new Set<ViewElement>()
    for (const root of editor.model.document.getRoots()) {
      for (const item of editor.model.createRangeIn(root).getItems()) {
        if (!item.is('element', 'table')) continue
        if (!item.getAttribute('headingRows') || !item.getAttribute('headingColumns')) continue
        const firstRow = item.getChild(0)
        const corner = firstRow?.is('element', 'tableRow') ? firstRow.getChild(0) : undefined
        if (!corner?.is('element', 'tableCell') || !isBlankCell(corner)) continue
        const viewCell = editor.editing.mapper.toViewElement(corner)
        if (viewCell) corners.add(viewCell)
      }
    }
    editor.editing.view.change(writer => {
      for (const el of this._markedCorners) if (!corners.has(el)) writer.removeClass('dg-table-corner', el)
      for (const el of corners) writer.addClass('dg-table-corner', el)
    })
    this._markedCorners = corners
  }

  override destroy () {
    super.destroy()
    this.view?.destroy()
    this._previewStyle?.remove()
  }

  /**
   * Header color classes only mean something to the site's CSS, which the
   * editor doesn't load. Hosts can give each option the color its header cells
   * get on the site, and the editing view previews it (editor.css covers the
   * other classes, which don't depend on the site palette).
   */
  protected _addHeaderColorPreview () {
    const rules = (this.tableProperties.tableHeaderColors ?? [])
      .filter(o => o.color && /^[\w-]+$/.test(o.value))
      .map(o => {
        // the default is also what a table with no header color class gets
        const tables = [`figure.table.${o.value}`, ...(o.default ? ['figure.table:not([class*="header-color-"])'] : [])]
        const selector = tables.map(t => `.ck.ck-editor__editable ${t} > table th`).join(', ')
        return `${selector} { background: ${o.color}; color: ${contrastingText(o.color!)}; }`
      })
    if (!rules.length) return
    this._previewStyle = document.createElement('style')
    this._previewStyle.textContent = rules.join('\n')
    document.head.appendChild(this._previewStyle)
  }

  get _isViewVisible () {
    return !!this.view && this._balloon.visibleView === this.view
  }

  get _isViewInBalloon () {
    return !!this.view && this._balloon.hasView(this.view)
  }

  protected _createPropertiesView () {
    const editor = this.editor
    const view = new TablePropertiesView(editor.locale, this.tableProperties)
    view.render()

    this.listenTo(view, 'submit', () => { this._hideView() })
    this.listenTo(view, 'cancel', () => {
      if (this._undoStepBatch.operations.length) editor.execute('undo', this._undoStepBatch)
      this._hideView()
    })

    view.keystrokes.set('Esc', (data, cancel) => {
      this._hideView()
      cancel()
    })

    clickOutsideHandler({
      emitter: view,
      activator: () => this._isViewInBalloon,
      contextElements: [this._balloon.view.element!],
      callback: () => { this._hideView() }
    })

    for (const property of Object.keys(propertyToCommandMap) as (keyof typeof propertyToCommandMap)[]) {
      view.on<any>(`change:${property}`, (evt: unknown, propertyName: string, newValue: string, oldValue: string) => {
        if (!this._isReady) return
        editor.execute(propertyToCommandMap[property], {
          value: newValue,
          oldValue,
          batch: this._undoStepBatch
        })
      })
    }

    return view
  }

  protected _fillViewFormFromCommandValues () {
    const commands = this.editor.commands
    this._isReady = false
    for (const [property, commandName] of Object.entries(propertyToCommandMap)) {
      const value = (commands.get(commandName)!.value as string) || this._defaultValues[property] || ''
      this.view!.set(property as any, value)
    }
    this._isReady = true
  }

  protected _showView () {
    const editor = this.editor
    this.view ??= this._createPropertiesView()

    this.listenTo(editor.ui, 'update', () => { this._updateView() })

    this._fillViewFormFromCommandValues()

    this._balloon.add({
      view: this.view,
      position: _getBalloonTablePositionData(editor)
    })

    // one undo step for everything done while the form is open; Cancel undoes it
    this._undoStepBatch = editor.model.createBatch()

    this.view.focus()
  }

  protected _hideView () {
    const editor = this.editor
    this.stopListening(editor.ui, 'update')
    this._isReady = false
    // move focus out of the form before detaching it from the DOM
    this.view!.saveButtonView.focus()
    this._balloon.remove(this.view!)
    editor.editing.view.focus()
  }

  protected _updateView () {
    const editor = this.editor
    if (!_getTableWidgetAncestor(editor.editing.view.document.selection)) this._hideView()
    else if (this._isViewVisible) _repositionTableContextualBalloon(editor, 'table')
  }
}
