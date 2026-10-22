import { ButtonView, IconImage, ImageInsertUI, ImageUtils, MenuBarMenuListItemButtonView, Plugin } from 'ckeditor5'

// Augment the config so hosts get types for the assetBrowser contract. The
// augmentation targets @ckeditor/ckeditor5-core because that's where
// EditorConfig is declared; ckeditor5 re-exports it.
declare module '@ckeditor/ckeditor5-core' {
  interface EditorConfig {
    assetBrowser?: {
      browseImage?: (imageUrl: string | undefined, next: (imageUrl: string, name?: string) => void) => void | Promise<void>
      browseLink?: (linkUrl: string, next: (linkUrl: string, name?: string) => void) => void | Promise<void>
    }
  }
}

/**
 * Plugs the host's image browser (`config.assetBrowser.browseImage`, see the
 * augmentation above) into the stock image insert UI as the sanctioned
 * `assetManager` integration — the same slot CKBox/CKFinder use. With it as
 * the only integration (editor.ts sets `image.insert.integrations`), the stock
 * `insertImage` toolbar item renders as a single button that opens the browser
 * directly.
 */
export default class AssetBrowser extends Plugin {
  static get requires () {
    return [ImageInsertUI, ImageUtils] as const
  }

  static get pluginName () {
    return 'AssetBrowser' as const
  }

  init () {
    // The stock `insertImage` item replaced this component name; keep it
    // working for any host that passes a custom toolbar list.
    this.editor.ui.componentFactory.add('assetBrowserImage', () => this.editor.ui.componentFactory.create('insertImage'))
  }

  afterInit () {
    const editor = this.editor
    const imageInsertUI = editor.plugins.get('ImageInsertUI')
    const imageUtils = editor.plugins.get('ImageUtils')

    const browse = () => {
      const config = editor.config.get('assetBrowser')
      // when replacing, hand the host the current src so its browser can preselect it
      const selectedImage = imageUtils.getClosestSelectedImageElement(editor.model.document.selection)
      const currentUrl = selectedImage?.getAttribute('src') as string | undefined
      void config?.browseImage?.(currentUrl, imageUrl => {
        // replaceImageSource keeps the figure but clears sizing/alt for the
        // new image; insertImage handles placement (block per image.insert.type)
        if (imageInsertUI.isImageSelected) editor.execute('replaceImageSource', { source: imageUrl })
        else editor.execute('insertImage', { source: imageUrl })
      })
    }

    const createButton = <T extends ButtonView>(ButtonClass: new (locale?: any) => T): T => {
      const button = new ButtonClass(editor.locale)
      button.icon = IconImage
      button.on('execute', browse)
      return button
    }

    imageInsertUI.registerIntegration({
      name: 'assetManager',
      observable: () => editor.commands.get('insertImage')!,
      buttonViewCreator: () => {
        const button = createButton(ButtonView)
        button.tooltip = true
        button.bind('label').to(imageInsertUI, 'isImageSelected', isImageSelected => isImageSelected ? 'Replace image' : 'Insert image')
        return button
      },
      formViewCreator: () => {
        const button = createButton(ButtonView)
        button.withText = true
        button.bind('label').to(imageInsertUI, 'isImageSelected', isImageSelected => isImageSelected ? 'Replace with asset' : 'Insert from assets')
        return button
      },
      menuBarButtonViewCreator: () => {
        const button = createButton(MenuBarMenuListItemButtonView)
        button.withText = true
        button.label = 'Image'
        return button
      }
    })
  }
}
