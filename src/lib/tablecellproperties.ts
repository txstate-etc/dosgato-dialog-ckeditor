/**
 * Stock TableCellPropertiesUI cut down to background color and text alignment
 * (horizontal and vertical). The rest of the stock form (borders, cell type,
 * width/height, padding) writes inline styles that fight the site's table CSS,
 * and header cells are set through the stock row/column toolbar dropdowns
 * instead. Stock TableCellPropertiesEditing stays loaded, so inline cell
 * styles already in content still round-trip.
 *
 * Keeps the stock plugin name: it registers the same `tableCellProperties`
 * toolbar component, so it replaces stock TableCellPropertiesUI rather than
 * sitting beside it.
 */
import { TableCellPropertiesUI } from 'ckeditor5'

export default class TableCellPropertiesTrimmedUI extends TableCellPropertiesUI {
  // The stock view is built privately and lazily (one per table type), so trim
  // it whenever it's shown. Hidden rows drop out of the Tab cycle too, since
  // the focus cycler skips invisible views.
  protected override _showView () {
    super._showView()
    const view = this.view!
    view.element!.classList.add('dg-table-cell-properties-trimmed')
    // stock focused the (now hidden) border style dropdown
    view.focus()
  }
}
