declare module '@dosgato/ckeditor' {
  import type { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic'
  const Editor: typeof ClassicEditor
  export default Editor
}
