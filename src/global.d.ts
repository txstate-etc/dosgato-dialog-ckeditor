import '@sveltejs/kit'

declare module '@ckeditor/ckeditor5-core' {
  interface EditorConfig {
    assetBrowser?: {
      browseImage?: (next: (imageUrl: string, name?: string) => void) => void | Promise<void>
      browseLink?: (linkUrl: string, next: (linkUrl: string, name?: string) => void) => void | Promise<void>
    }
  }
}
