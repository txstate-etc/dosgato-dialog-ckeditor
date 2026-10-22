export type ConfigType = 'full' | 'min' | 'minwithlist' | 'ti'

export interface RichTextConfig {
  toolbar: { items: string[], shouldNotGroupWhenFull?: boolean }
  [key: string]: any
}

export interface ColorClasses {
  label: string
  value: string
  default?: boolean
}

interface Colors {
  label: string
  color: string
}

export interface TemplateProperties {
  tableHeaderColors?: ColorClasses[]
  templateColors?: Colors[]
  definitionColors?: string[]
  fontFamilies?: string[]
  headingOptions?: {
    title: string
    model: string
    view?: { name: string, classes: string } | string
    class: string
    converterPriority?: string
  }[]
}

// Header colors are class names the site's CSS styles, so without a site
// palette offer only no header color vs the site's default one. Font and cell
// background colors fall back to CKEditor's stock palette.
const defaultHeaderColors: ColorClasses[] = [
  { label: 'None', value: 'header-color-none' },
  { label: 'Default', value: 'header-color-default', default: true }
]

const listConfig = {
  list: {
    properties: {
      styles: false,
      startIndex: true
    }
  }
}

// The large text option is available but should not be part of the default configuration
const headingConfig = {
  heading: {
    options: [
      { title: 'Paragraph', model: 'paragraph', class: 'ck-heading_paragraph' },
      { title: 'Title', view: 'h2', model: 'heading2', class: 'ck-heading_heading2' },
      { title: 'Subtitle', view: 'h3', model: 'heading3', class: 'ck-heading_heading3' },
      { title: 'Subsubtitle', view: 'h4', model: 'heading4', class: 'ck-heading_heading4' },
      { title: 'Preformatted Text', view: 'pre', model: 'preformattedText', class: 'ck-heading-preformattedText' }
    ]
  }
}

export const defaultConfig: RichTextConfig = {
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
  image: {
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
  table: {
    contentToolbar: ['tableProperties', 'tableColumn', 'tableRow', 'mergeTableCells', 'tableCellProperties'],
    tableProperties: {
      tableWidth: [
        { label: '100%', value: 'full-width' },
        { label: 'Auto', value: 'auto-width' }
      ],
      tableHeaders: [
        { label: 'None', value: 'none' },
        { label: 'First Row', value: 'row' },
        { label: 'First Column', value: 'column' },
        { label: 'Both', value: 'both' }
      ]
    }
  },
  ...listConfig,
  ...headingConfig
}

export const minimalConfig: RichTextConfig = {
  toolbar: {
    items: [
      'bold',
      'italic',
      'removeFormat',
      'specialCharacters',
      '|',
      'link'
    ]
  }
}

export const minimalConfigWithLists: RichTextConfig = {
  toolbar: {
    items: [
      'bold',
      'italic',
      'removeFormat',
      'specialCharacters',
      '|',
      'link',
      '|',
      'undo',
      'redo',
      'numberedList',
      'bulletedList',
      '|',
      'sourceEditing'
    ],
    shouldNotGroupWhenFull: true
  },
  ...listConfig
}

export const tiConfig: RichTextConfig = {
  toolbar: {
    items: [
      'bold',
      'italic',
      'strikethrough',
      'superscript',
      'subscript',
      'code',
      'removeFormat',
      'specialCharacters',
      '|',
      'horizontalLine',
      'blockQuote',
      '|',
      'link',
      'bookmark',
      '|',
      'undo',
      'redo',
      '|',
      'sourceEditing',
      '-',
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
  ...listConfig,
  ...headingConfig
}

export function getConfig (configType: ConfigType, options: TemplateProperties) {
  let config: RichTextConfig
  if (!configType) config = defaultConfig
  else if (configType === 'min') config = minimalConfig
  else if (configType === 'minwithlist') config = minimalConfigWithLists
  else if (configType === 'ti') config = tiConfig
  else config = defaultConfig
  // presets are shared across editors, don't let one editor's options leak into the next
  config = structuredClone(config)

  if (configType === 'min' || configType === 'minwithlist') return config

  if (options.definitionColors) config.fontColor = { colors: options.definitionColors }

  if (options.fontFamilies?.length) {
    config.fontFamily = {
      options: ['default', ...options.fontFamilies]
    }
    if (!config.toolbar.items.includes('fontFamily')) {
      config.toolbar.items.push('fontFamily')
    }
  } else {
    const fontFamilyIndex = config.toolbar.items.indexOf('fontFamily')
    if (fontFamilyIndex !== -1) {
      config.toolbar.items.splice(fontFamilyIndex, 1)
    }
    delete config.fontFamily
  }

  if (options.headingOptions?.length) {
    config.heading = {
      options: options.headingOptions
    }
    if (!config.toolbar.items.includes('heading')) {
      config.toolbar.items.push('heading')
    }
  } else {
    config = { ...config, ...headingConfig }
  }

  if (configType === 'ti') return config

  if (options.templateColors) config.table.tableCellProperties = { backgroundColors: options.templateColors }
  config.table.tableProperties.tableHeaderColors = options.tableHeaderColors ?? defaultHeaderColors

  return config
}
