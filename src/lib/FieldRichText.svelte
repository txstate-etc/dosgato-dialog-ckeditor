<script lang="ts">
  import alertOutline from '@iconify-icons/mdi/alert-outline.js'
  import { FORM_CONTEXT, nullableDeserialize, nullableSerialize, type FormStore } from '@txstate-mws/svelte-forms'
  import type { EditorConfig } from '@ckeditor/ckeditor5-core/src/editor/editorconfig'
  import type ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
  import { getContext, onMount, tick } from 'svelte'
  import { CHOOSER_API_CONTEXT, ChooserStore, Chooser, FieldStandard, Icon, type Client, type AnyUIItem, type UIFolder } from '@dosgato/dialog'

  export let id: string | undefined = undefined
  export let path: string
  export let label: string = ''
  export let maxlength: number|undefined = undefined
  export let conditional: boolean|undefined = undefined
  export let required = false
  export let config: EditorConfig|undefined = undefined

  const formStore = getContext<FormStore>(FORM_CONTEXT)
  const value = formStore.getField<string>(path)
  const chooserClient = getContext<Client>(CHOOSER_API_CONTEXT)

  const linkStore = new ChooserStore(chooserClient)
  const imageStore = new ChooserStore(chooserClient)
  let element: HTMLElement
  let editor: ClassicEditor
  let latestChooserCB: Function
  onMount(async () => {
    testEl = document.createElement('div')
    const Editor = (await import('@dosgato/ckeditor')).default as typeof ClassicEditor
    editor = await Editor.create(element, {
      ...config,
      assetBrowser: {
        browseImage: async (next: (imageUrl: string) => void) => {
          imageStore.update(v => ({ ...v, preview: undefined }))
          latestChooserCB = next
          show('image')
        },
        browseLink: async (linkUrl, next: (linkUrl: string) => void) => {
          if (chooserClient.findByUrl) {
            const item = await chooserClient.findByUrl(linkUrl)
            if (item) linkStore.preview(item)
          }
          latestChooserCB = next
          show('link')
        }
      }
    } as any)
    editor.model.document.on('change:data', () => formStore.setField(path, nullableDeserialize(editor.getData())))
    reactToValue()
  })

  let modaltoshow: 'link'|'image'|undefined = undefined
  let saveselection
  function show (toshow: 'link'|'image') {
    saveselection = editor.model.document.selection
    modaltoshow = toshow
  }
  async function hide () {
    modaltoshow = undefined
    await tick()
    await tick()
    if (saveselection) {
      editor.model.change(writer => {
        writer.setSelection(saveselection)
      })
    }
  }
  async function chooserComplete (e: any) {
    const item: Exclude<AnyUIItem, UIFolder> = e.detail
    modaltoshow = undefined
    await tick()
    await tick()
    latestChooserCB(item.url, item.name)
  }
  let charlength: number = 0
  let testEl: HTMLDivElement
  function reactToValue (..._: any) {
    const serialized = nullableSerialize($value)
    if (testEl && serialized.trim().length > 0) {
      testEl.innerHTML = serialized
      charlength = testEl.innerText.trim().length
    }
    if (editor && editor.getData() !== serialized) editor.setData(serialized)
  }
  $: reactToValue($value)
  $: exceeded = maxlength > 0 && charlength > maxlength
</script>

<FieldStandard bind:id {label} {path} {required} {conditional} let:id let:onBlur>
  <div {id} class="dialog-rich-ckeditor" bind:this={element}></div>
  {#if maxlength}
    <div class="dialog-rich-charcount">
      <span class="dialog-rich-count" class:exceeded>
        {#if exceeded}<Icon icon={alertOutline} inline />{/if}
        {charlength}
      </span>
      /
      <span class="dialog-rich-max">{maxlength}</span>
    </div>
  {/if}
  {#if modaltoshow === 'image'}
    <Chooser store={imageStore} images label="Insert Image" on:change={chooserComplete} on:escape={hide} />
  {:else if modaltoshow === 'link'}
    <Chooser store={linkStore} pages assets label="Browse for Link" on:change={chooserComplete} on:escape={hide} />
  {/if}
</FieldStandard>

<style>
  .dialog-rich-charcount {
    text-align: right;
  }
  .dialog-rich-count.exceeded {
    color: #9a3332;
  }
  .dialog-rich-ckeditor + :global(.ck-editor .ck-content) {
    min-height: 100px;
    max-height: 75vh;
    overflow: auto;
  }
</style>
