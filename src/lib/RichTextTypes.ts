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
      'horizontalLine',
      'blockQuote',
      'removeFormat',
      'specialCharacters',
      '|',
      'link',
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
      'imageTextAlternative'
    ]
  },
  table: {
    contentToolbar: ['customTableColumn', 'customTableRow', 'mergeTableCells', 'tableCellProperties', 'tableProperties'],
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
      'horizontalLine',
      'blockQuote',
      'removeFormat',
      'specialCharacters',
      '|',
      'link',
      '|',
      'undo',
      'redo',
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

export const tiConfig = {
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
      '|',
      'numberedList',
      'bulletedList',
      '|',
      'sourceEditing'
    ]
  }
}

export function getConfig (configType: ConfigType, options: TemplateProperties) {
  let presetConfig
  if (!configType) presetConfig = defaultConfig
  else if (configType === 'min') presetConfig = minimalConfig
  else if (configType === 'minwithlist') presetConfig = minimalConfigWithLists
  else if (configType === 'ti') presetConfig = tiConfig
  else presetConfig = defaultConfig

  if (configType === 'min' || configType === 'ti') return presetConfig

  const fontColor = {
    colors: options.definitionColors ?? defaultDefinitionColors
  }

  presetConfig.fontColor = fontColor

  if (configType === 'minwithlist') return presetConfig

  const tableCellProperties = {
    backgroundColors: options.templateColors ?? defaultTemplateColors
  }

  presetConfig.table.tableProperties.tableHeaderColors = options.tableHeaderColors ?? defaultHeaderColors
  presetConfig.table.tableCellProperties = tableCellProperties

  return presetConfig
}

