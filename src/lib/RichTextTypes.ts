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

