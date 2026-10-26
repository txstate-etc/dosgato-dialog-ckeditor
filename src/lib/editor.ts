/**
 * The DosGato CKEditor build, written against the single `ckeditor5` package
 * (PLAN.md chunk 3). Stock plugins plus four custom ones: AssetBrowser and
 * LinkBrowser (the host browse hooks), TableClassProperties (class-based
 * semantic table properties, PLAN.md chunk 5) and TableCellPropertiesTrimmedUI
 * (stock cell properties cut down to background color and text alignment). Import this module
 * dynamically so the editor stays code-split.
 */
import {
  Alignment, Autoformat, BlockQuote, Bold, Bookmark, ClassicEditor, Code, Essentials,
  FontBackgroundColor, FontColor, FontFamily, FontSize, GeneralHtmlSupport, Heading, HorizontalLine, Image, ImageCaption, ImageResize,
  ImageStyle, ImageTextAlternative, ImageToolbar, Indent, IndentBlock, Italic,
  Link, LinkImage, List, ListProperties, Paragraph, PasteFromOffice, RemoveFormat,
  SourceEditing, SpecialCharacters, SpecialCharactersEssentials, Strikethrough,
  Subscript, Superscript, Table, TableCellPropertiesEditing, TablePropertiesEditing,
  TableToolbar, TextTransformation,
  type Editor as CKEditor, type EditorConfig, type PluginConstructor
} from 'ckeditor5'
import AssetBrowser from './assetbrowser.js'
import LinkBrowser from './linkbrowser.js'
import TableClassProperties from './tableproperties.js'
import TableCellPropertiesTrimmedUI from './tablecellproperties.js'
import { htmlSupport } from './htmlsupport.js'
import 'ckeditor5/ckeditor5.css'
import './editor.css'

// 48's List writes a random data-list-item-id onto every <li> in getData()
// unless asked not to. Stored, they'd litter live content and make every load
// look like an edit (fresh ids each time). data.get is decorated, so defaulting
// the option here covers getData() and SourceEditing's source view alike.
function OmitListItemIds (editor: CKEditor) {
  editor.data.on('get', (evt, args: [Record<string, unknown>?]) => {
    args[0] = { skipListItemIds: true, ...args[0] }
  }, { priority: 'high' })
}

export default class Editor extends ClassicEditor {
  static override builtinPlugins = [
    Alignment,
    AssetBrowser,
    Autoformat,
    BlockQuote,
    Bold,
    Bookmark,
    Code,
    Essentials,
    // the parts of Font, listed separately so strictHtml can drop the ones
    // without a toolbar item
    FontBackgroundColor,
    FontColor,
    FontFamily,
    FontSize,
    GeneralHtmlSupport,
    Heading,
    HorizontalLine,
    Image,
    ImageCaption,
    ImageResize,
    ImageStyle,
    ImageTextAlternative,
    ImageToolbar,
    Indent,
    IndentBlock,
    Italic,
    Link,
    LinkBrowser,
    LinkImage,
    List,
    ListProperties,
    OmitListItemIds,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SourceEditing,
    SpecialCharacters,
    SpecialCharactersEssentials,
    Strikethrough,
    Subscript,
    Superscript,
    Table,
    // stock inline-style table/cell round-trip fidelity. Both are editing-only:
    // TableClassProperties supplies the tableProperties toolbar component (the
    // class-based balloon) in place of stock TablePropertiesUI, and
    // TableCellPropertiesTrimmedUI the tableCellProperties one.
    TableCellPropertiesTrimmedUI,
    TableCellPropertiesEditing,
    TableClassProperties,
    TablePropertiesEditing,
    TableToolbar,
    TextTransformation
  ]

  static override defaultConfig: EditorConfig = {
    licenseKey: 'GPL',
    language: 'en',
    link: {
      // bare domains typed into the link form (www.txstate.edu) get a real
      // protocol; emails get mailto: automatically regardless of this setting
      defaultProtocol: 'https://'
    },
    toolbar: {
      items: [
        'bold',
        'italic',
        'strikethrough',
        'superscript',
        'subscript',
        'code',
        'removeFormat',
        '|',
        'horizontalLine',
        'blockQuote',
        'specialCharacters',
        '|',
        'link',
        'bookmark',
        '|',
        'insertTable',
        '|',
        'insertImage',
        '|',
        'undo',
        'redo',
        '-',
        'sourceEditing',
        '|',
        'alignment',
        'numberedList',
        'bulletedList',
        'indent',
        'outdent',
        '|',
        'heading',
        '|',
        'fontColor'
      ],
      shouldNotGroupWhenFull: true
    },
    heading: {
      options: [
        { title: 'Paragraph', model: 'paragraph', class: 'ck-heading_paragraph' },
        {
          title: 'Paragraph - Large Text',
          model: 'paragraphLarge' as any,
          view: {
            name: 'p',
            classes: 'large-text'
          },
          class: 'ck-heading_paragraph_large',
          converterPriority: 'high'
        },
        { title: 'Title', view: 'h2', model: 'heading2', class: 'ck-heading_heading2' },
        { title: 'Subtitle', view: 'h3', model: 'heading3', class: 'ck-heading_heading3' },
        { title: 'Subsubtitle', view: 'h4', model: 'heading4', class: 'ck-heading_heading4' },
        { title: 'Preformatted Text', view: 'pre', model: 'preformattedText' as any, class: 'ck-heading-preformattedText' }
      ]
    },
    image: {
      // the host's asset browser (see assetbrowser.ts) is the only way to
      // insert images, and always as block images (35.4 behavior)
      insert: {
        integrations: ['assetManager'],
        type: 'block'
      },
      toolbar: [
        'imageStyle:inline',
        'imageStyle:wrapText',
        'imageStyle:breakText',
        '|',
        'toggleImageCaption',
        'imageTextAlternative',
        '|',
        'linkImage'
      ]
    },
    // font colors come from the palette (the host's definitionColors), not a
    // free-form picker; hosts' fontColor config merges over this
    fontColor: {
      colorPicker: false
    },
    list: {
      // 48 marks <li>s whose whole content is bold/colored/etc. with
      // ck-list-marker-* classes (plus --ck-content-list-marker-* styles) so
      // CKEditor's content CSS can style the bullet to match. No DosGato theme
      // has that CSS, so it would only add inert markup to stored content.
      enableListItemMarkerFormatting: false,
      properties: {
        styles: false,
        startIndex: true
      }
    },
    table: {
      contentToolbar: ['mergeTableCells'],
      // Values matching defaultProperties are silently omitted from getData(),
      // which destroys the Word-paste borders all over production content
      // (border: 1px solid ... matches the stock cell defaults). Use border
      // values that never occur in real content so everything round-trips.
      tableProperties: {
        defaultProperties: { borderStyle: 'dotted', borderWidth: '1234px', borderColor: 'hsl(135, 66%, 33%)' }
      },
      tableCellProperties: {
        defaultProperties: { borderStyle: 'dotted', borderWidth: '1234px', borderColor: 'hsl(135, 66%, 33%)' },
        // cell backgrounds come from the palette (the host's templateColors),
        // not a free-form picker
        colorPicker: false
      }
    },
    htmlSupport: {
      allow: htmlSupport
    }
  }
}

// What strictHtml keeps no matter the toolbar: typing, undo, paragraphs, and
// helpers that only act through features that are loaded.
const alwaysLoaded: PluginConstructor[] = [Autoformat, Essentials, OmitListItemIds, Paragraph, PasteFromOffice, TextTransformation]

// The plugins behind each toolbar item (main toolbar, image toolbar, table
// content toolbar). Their requirements are kept too, see strictRemovePlugins.
const toolbarPlugins: Record<string, PluginConstructor[]> = {
  alignment: [Alignment],
  assetBrowserImage: [AssetBrowser, Image, ImageResize, ImageToolbar],
  blockQuote: [BlockQuote],
  bold: [Bold],
  bookmark: [Bookmark],
  bulletedList: [List],
  code: [Code],
  fontBackgroundColor: [FontBackgroundColor],
  fontColor: [FontColor],
  fontFamily: [FontFamily],
  fontSize: [FontSize],
  heading: [Heading],
  horizontalLine: [HorizontalLine],
  imageStyle: [ImageStyle],
  imageTextAlternative: [ImageTextAlternative],
  indent: [Indent, IndentBlock],
  // the resize handles show on every image
  insertImage: [AssetBrowser, Image, ImageResize, ImageToolbar],
  imageInsert: [AssetBrowser, Image, ImageResize, ImageToolbar],
  insertTable: [Table, TableToolbar],
  italic: [Italic],
  link: [Link, LinkBrowser],
  linkImage: [LinkImage, LinkBrowser],
  numberedList: [List, ListProperties],
  outdent: [Indent, IndentBlock],
  removeFormat: [RemoveFormat],
  sourceEditing: [SourceEditing],
  specialCharacters: [SpecialCharacters, SpecialCharactersEssentials],
  strikethrough: [Strikethrough],
  subscript: [Subscript],
  superscript: [Superscript],
  tableCellProperties: [TableCellPropertiesTrimmedUI, TableCellPropertiesEditing],
  tableProperties: [TableClassProperties, TablePropertiesEditing],
  toggleImageCaption: [ImageCaption]
}

type ToolbarItem = string | { items?: ToolbarItem[] }

function* toolbarItems (items: ToolbarItem[] | { items?: ToolbarItem[] } | undefined): Generator<string> {
  for (const item of (Array.isArray(items) ? items : items?.items) ?? []) {
    // imageStyle:wrapText and friends all come from ImageStyle
    if (typeof item === 'string') yield item.split(':')[0]
    else yield* toolbarItems(item.items)
  }
}

/**
 * For strictHtml: the builtin plugins that no visible toolbar item needs, to
 * pass as removePlugins. Without them their markup is dropped from content
 * too, so the editor only holds what its toolbars can produce. That includes
 * GeneralHtmlSupport, which no toolbar item needs. The image and table
 * toolbars count only when their insert button is visible. Toolbar items with
 * no entry in toolbarPlugins keep nothing loaded.
 */
export function strictRemovePlugins (config: EditorConfig) {
  const items = new Set(toolbarItems(config.toolbar ?? Editor.defaultConfig.toolbar))
  if (items.has('insertImage') || items.has('imageInsert') || items.has('assetBrowserImage')) {
    for (const item of toolbarItems(config.image?.toolbar ?? Editor.defaultConfig.image!.toolbar)) items.add(item)
  }
  if (items.has('insertTable')) {
    for (const item of toolbarItems(config.table?.contentToolbar ?? Editor.defaultConfig.table!.contentToolbar)) items.add(item)
  }
  const byName = new Map(Editor.builtinPlugins.map(p => [(p as { pluginName?: string }).pluginName, p]))
  const keep = new Set<PluginConstructor>()
  // removing a plugin something else requires fails editor creation
  const visit = (plugin: PluginConstructor | undefined) => {
    if (!plugin || keep.has(plugin)) return
    keep.add(plugin)
    for (const required of (plugin as { requires?: (PluginConstructor | string)[] }).requires ?? []) {
      visit(typeof required === 'string' ? byName.get(required) : required)
    }
  }
  for (const plugin of alwaysLoaded) visit(plugin)
  // a host's own plugins may build on builtin ones
  for (const plugin of config.extraPlugins ?? []) visit(plugin)
  for (const item of items) for (const plugin of toolbarPlugins[item] ?? []) visit(plugin)
  return Editor.builtinPlugins.filter(p => !keep.has(p))
}
