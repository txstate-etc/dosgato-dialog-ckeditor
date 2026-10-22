/**
 * DosGato's class-based semantic table properties (PLAN.md chunk 5), the last
 * genuine fork ported from dosgato-ckeditor (Table/ + Table/Commands/). Where
 * upstream's TableProperties styles tables with inline CSS, DosGato records
 * semantics as CSS classes on the `<figure class="table">` wrapper — width
 * (`full-width`/`auto-width`), `border`, `alternate-row-color` and
 * `header-color-*` — so sites can restyle content without touching it. Header
 * row/column choices map to the stock `headingRows`/`headingColumns` model
 * attributes.
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
  _getBalloonTablePositionData, _getHorizontallyOverlappingTableCells, _getTableWidgetAncestor,
  _getVerticallyOverlappingTableCells, _repositionTableContextualBalloon,
  _splitTableCellHorizontally, _splitTableCellVertically,
  type Batch, type Editor, type ModelDocumentSelection, type ModelElement, type ViewElement
} from 'ckeditor5'
import TablePropertiesView, { type TableClassOption, type TableClassPropertiesConfig } from './tablepropertiesview.js'

// Give hosts types for the custom keys presets pass under
// `table.tableProperties` (they coexist with stock keys like
// defaultProperties, which stock TablePropertiesEditing still reads).
declare module '@ckeditor/ckeditor5-table' {
  interface TablePropertiesConfig {
    tableWidth?: TableClassOption[]
    tableHeaders?: TableClassOption[]
    tableHeaderColors?: TableClassOption[]
  }
}

interface TablePropertyCommandOptions {
  value?: string
  oldValue?: string
  batch?: Batch
}

// View property -> command name. Ours except tableWidthClass, renamed because
// stock TablePropertiesEditing already registers an (inline-style) tableWidth.
const propertyToCommandMap = {
  tableHeaders: 'tableHeaders',
  tableHeaderColors: 'tableHeaderColors',
  tableWidth: 'tableWidthClass',
  tableBorder: 'tableBorder',
  tableAltBGColor: 'tableAltBGColor'
} as const

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
 * group's classes the selected table currently has.
 */
class TableClassCommand extends Command {
  declare value: string
  readonly values: string[]

  constructor (editor: Editor, values: TableClassOption[] | string | undefined) {
    super(editor)
    this.values = typeof values === 'string' ? [values] : (values ?? []).map(v => v.value)
  }

  override refresh () {
    const table = getSelectionAffectedTable(this.editor.model.document.selection)
    const classes = getClasses(table)
    this.isEnabled = !!table
    this.value = this.values.find(v => classes.includes(v)) ?? ''
  }

  override execute (options: TablePropertyCommandOptions = {}) {
    const { value = '', oldValue, batch } = options
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

/**
 * Sets headers to exactly none/first row/first column/both. Unlike stock
 * setTableRowHeader (which extends the heading section to the selected row),
 * this always toggles just the first row/column — splitting any
 * rowspan/colspan cells the new boundary would cut through, same as stock
 * does. Goes through TableUtils.setHeading*Count because 48's scopedHeaders
 * feature derives headingRows/headingColumns from per-cell tableCellType
 * attributes via a post-fixer: a bare headingRows write on a table of plain
 * td cells gets immediately reverted.
 */
class TableHeadersCommand extends Command {
  declare value: string

  override refresh () {
    const table = getSelectionAffectedTable(this.editor.model.document.selection)
    this.isEnabled = !!table
    if (!table) return

    const rows = table.getAttribute('headingRows') as number | undefined
    const columns = table.getAttribute('headingColumns') as number | undefined
    this.value = rows && columns ? 'both' : rows ? 'row' : columns ? 'column' : 'none'
  }

  override execute (options: TablePropertyCommandOptions = {}) {
    const { value, batch } = options
    if (!value || value === this.value) return

    const model = this.editor.model
    const tableUtils = this.editor.plugins.get('TableUtils')
    const table = getSelectionAffectedTable(model.document.selection)
    if (!table) return

    const headingColumnsToSet = ['both', 'column'].includes(value) ? 1 : 0
    const headingRowsToSet = ['both', 'row'].includes(value) ? 1 : 0
    const currentHeadingRows = (table.getAttribute('headingRows') as number | undefined) ?? 0

    model.enqueueChange(batch ?? model.createBatch(), writer => {
      if (headingColumnsToSet) {
        for (const { cell, column } of _getHorizontallyOverlappingTableCells(table, headingColumnsToSet)) {
          _splitTableCellVertically(cell, column, headingColumnsToSet, writer)
        }
      }

      if (headingRowsToSet) {
        const startRow = headingRowsToSet > currentHeadingRows ? currentHeadingRows : 0
        for (const { cell } of _getVerticallyOverlappingTableCells(table, headingRowsToSet, startRow)) {
          _splitTableCellHorizontally(cell, headingRowsToSet, writer)
        }
      }

      tableUtils.setHeadingColumnsCount(writer, table, headingColumnsToSet)
      tableUtils.setHeadingRowsCount(writer, table, headingRowsToSet)
    })
  }
}

export default class TableClassProperties extends Plugin {
  static get requires () {
    return [ContextualBalloon, 'TableEditing'] as const
  }

  static get pluginName () {
    return 'TableClassProperties' as const
  }

  view: TablePropertiesView | null = null
  protected _balloon!: ContextualBalloon
  protected _undoStepBatch!: Batch
  protected tableProperties!: TableClassPropertiesConfig
  protected _defaultValues!: Record<string, string>

  init () {
    const editor = this.editor
    const t = editor.t

    this._balloon = editor.plugins.get(ContextualBalloon)
    this.tableProperties = editor.config.get('table.tableProperties') ?? {}
    // first option of each dropdown doubles as its default, so the initial
    // form fill doesn't count as a change
    this._defaultValues = Object.fromEntries(
      (['tableHeaders', 'tableHeaderColors', 'tableWidth'] as const)
        .map(key => [key, this.tableProperties[key]?.[0]?.value ?? ''])
    )

    editor.commands.add('tableHeaders', new TableHeadersCommand(editor))
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
      view.bind('isEnabled').to(editor.commands.get('tableHeaders')!, 'isEnabled')
      this.listenTo(view, 'execute', () => { this._showView() })
      return view
    })
  }

  override destroy () {
    super.destroy()
    this.view?.destroy()
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
        // ignore the initial form fill landing on the default value
        if (!oldValue && this._defaultValues[property] === newValue) return
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
    for (const [property, commandName] of Object.entries(propertyToCommandMap)) {
      const value = (commands.get(commandName)!.value as string) || this._defaultValues[property] || ''
      this.view!.set(property as any, value)
    }
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
