export type ConfigType = 'full' | 'min' | 'minwithlist' | 'ti'

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
  tableHeaderColors?: Colors[]
  templateColors?: Colors[]
  definitionColors?: string[]
}

const defaultHeaderColors: ColorClasses[] = [
  { label: 'None', value: 'header-color-none' },
  { label: 'Default (Gold)', value: 'header-color-gold', default: true },
  { label: 'Maroon', value: 'header-color-maroon' },
  { label: 'Charcoal', value: 'header-color-charcoal' },
  { label: 'Deep Blue', value: 'header-color-blue' },
  { label: 'River', value: 'header-color-river' },
  { label: 'Sandstone', value: 'header-color-sandstone' },
  { label: 'Old Gold', value: 'header-color-oldgold' }
]

const defaultTemplateColors: Colors[] = [
  { label: 'Maroon', color: '#501214' },
  { label: 'Gold', color: '#6A5638' },
  { label: 'Charcoal', color: '#363534' },
  { label: 'Deep Blue', color: '#005481' },
  { label: 'River', color: '#8BAEA1' },
  { label: 'Sandstone', color: '#E8E3DB' },
  { label: 'Old Gold', color: '#DEB407' }
]

const defaultDefinitionColors: string[] = ['#222222', '#501214', '#6a5638', '#363534', '#b30e1b']

export const defaultConfig = {
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
      'anchor',
      '|',
      'insertTable',
      '|',
      'assetBrowserImage',
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
      'imageTxtAlternative'
    ]
  },
  table: {
    contentToolbar: ['tableProperties', 'customTableColumn', 'customTableRow', 'mergeTableCells', 'tableCellProperties'],
    tableProperties: {
      tableHeaderColors: [
        { label: 'None', value: 'header-color-none' },
        { label: 'Default (Gold)', value: 'header-color-gold' },
        { label: 'Maroon', value: 'header-color-maroon' },
        { label: 'Charcoal', value: 'header-color-charcoal' },
        { label: 'Deep Blue', value: 'header-color-blue' },
        { label: 'River', value: 'header-color-river' },
        { label: 'Sandstone', value: 'header-color-sandstone' },
        { label: 'Old Gold', value: 'header-color-oldgold' }
      ],
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
  }
}

export const minimalConfig = {
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

export const minimalConfigWithLists = {
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
  }
}

export const tiConfig = {
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
      'anchor',
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
  }
}

export function getConfig (configType: ConfigType, options: TemplateProperties) {
  let config
  if (!configType) config = defaultConfig
  else if (configType === 'min') config = minimalConfig
  else if (configType === 'minwithlist') config = minimalConfigWithLists
  else if (configType === 'ti') config = tiConfig
  else config = defaultConfig

  if (configType === 'min' || configType === 'minwithlist') return config

  const fontColor = {
    colors: options.definitionColors ?? defaultDefinitionColors
  }
  config.fontColor = fontColor

  if (configType === 'ti') return config

  const tableCellProperties = {
    backgroundColors: options.templateColors ?? defaultTemplateColors
  }

  config.table.tableCellProperties = tableCellProperties
  config.table.tableProperties.tableHeaderColors = options.tableHeaderColors ?? defaultHeaderColors

  return config
}

