<script lang="ts">
  import alertOutline from '@iconify-icons/mdi/alert-outline.js'
  import type { EditorConfig } from '@ckeditor/ckeditor5-core'
  import type { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic'
  import { CHOOSER_API_CONTEXT, ChooserStore, Chooser, Icon, type Client, type AnyUIItem, type Folder, type AnyItem } from '@dosgato/dialog'
  import { FORM_CONTEXT, FORM_INHERITED_PATH, nullableDeserialize, nullableSerialize, type FormStore } from '@txstate-mws/svelte-forms'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { Cache, isNotBlank, randomid } from 'txstate-utils'
  import { getParserElement } from './util'
  import { type TemplateProperties, type ConfigType, getConfig } from './RichTextTypes'

  export let id: string | undefined = undefined
  export let path: string
  export let maxlength: number|undefined = undefined
  export let configType: ConfigType = 'full'
  export let templateProperties: TemplateProperties = {}
  export let config: EditorConfig|undefined = undefined
  export let findByIdCache: Cache<string, AnyItem | undefined>
  export let findByUrlCache: Cache<string, AnyItem | undefined>
  export let editor: ClassicEditor = undefined
  export let compact: boolean = false

  const formStore = getContext<FormStore>(FORM_CONTEXT)
  const inheritedPath = getContext<string>(FORM_INHERITED_PATH)
  const finalPath = [inheritedPath, path].filter(isNotBlank).join('.')
  const value = formStore.getField<string>(finalPath)
  const chooserClient = getContext<Client>(CHOOSER_API_CONTEXT)

  const editorId = randomid()

  const presetConfig = getConfig(configType, templateProperties)

  const linkStore = new ChooserStore(chooserClient)
  const imageStore = new ChooserStore(chooserClient)
  let element: HTMLElement
  let latestChooserCB: Function
  let skipReaction = false
  let mounted = false
  onMount(async () => {
    mounted = true
    const Editor = (await import('@dosgato/ckeditor')).default as typeof ClassicEditor
    editor = await Editor.create(element, {
      ...presetConfig,
      ...config,
      assetBrowser: {
        browseImage: async (next: (imageUrl: string) => void) => {
          imageStore.update(v => ({ ...v, preview: undefined }))
          latestChooserCB = next
          show('image')
        },
        browseLink: async (linkUrl, next: (linkUrl: string) => void) => {
          const item = await findByUrlCache.get(linkUrl)
          if (item) linkStore.setPreview(item)
          latestChooserCB = next
          show('link')
        }
      }
    } as any)
    editor.ui.focusTracker.on('change:isFocused', (evt, name, isFocused) => { if (!isFocused) formStore.dirtyField(finalPath) })
    editor.model.document.on('change:data', () => {
      skipReaction = true
      formStore.setField(finalPath, nullableDeserialize(editor.getData()))
      tick().then(() => { skipReaction = false })
    })
    await reactToValue()
    setModalZ()

    // removing CKEditor 5 hardcoded sr-only label
    // updating their wrapper's labeledby/describedby with our labels and helptext ID's
    const editorWrapper = document.getElementById(editorId)
    if (editorWrapper) {
      const richEditorLabel = editorWrapper.querySelector('label')

      const wrapper = richEditorLabel?.parentElement
      if (id) wrapper?.setAttribute('aria-labelledby', id)

      const helpTextID = editorWrapper.parentElement?.querySelector('.dialog-field-help')?.getAttribute('id')
      if (helpTextID) wrapper?.setAttribute('aria-describedby', helpTextID)

      richEditorLabel?.remove()
    }
  })
  onDestroy(() => {
    // onDestroy runs in SSR but we don't create editor in SSR
    editor?.destroy()
  })

  function setModalZ () {
    const modalz = getComputedStyle(element).getPropertyValue('--modal-z')
    document.documentElement.style.setProperty('--ck-z-default', modalz || '1')
    document.documentElement.style.setProperty('--ck-z-modal', String(Number(modalz) + 1 || '1'))
  }

  let modaltoshow: 'link'|'image'|undefined = undefined
  let saveselection
  function show (toshow: 'link'|'image') {
    saveselection = editor.model.document.selection
    modaltoshow = toshow
    setModalZ()
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
    const item: Exclude<AnyUIItem, Folder> = e.detail
    findByIdCache.set(item.id, item)
    findByUrlCache.set(item.url, item)
    if ('image' in item && isNotBlank(item.image?.previewUrl)) findByUrlCache.set(item.image!.previewUrl, item)
    modaltoshow = undefined
    await tick()
    await tick()
    if ('image' in item && isNotBlank(item.image?.previewUrl)) {
      latestChooserCB(item.image!.previewUrl, item.name)
    } else latestChooserCB(item.url, item.name)
  }
  let charlength: number = 0
  function reactToValue (..._: any) {
    if (!mounted) return
    const serialized = nullableSerialize($value)
    if (serialized.trim().length > 0) {
      const testEl = getParserElement()
      testEl.innerHTML = serialized
      charlength = testEl.innerText.trim().length
    } else {
      charlength = 0
    }
    if (skipReaction) return
    if (editor && !editor.plugins.get('SourceEditing')?.isSourceEditingMode && editor.getData() !== serialized) {
      editor.setData(serialized)
    }
  }
  $: reactToValue($value)
  $: exceeded = maxlength && maxlength > 0 && charlength > maxlength
</script>

<div id={editorId}>
  <div class="dialog-rich-ckeditor" class:compact bind:this={element}></div>
</div>
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

<style>
  .dialog-rich-charcount {
    text-align: right;
  }
  .dialog-rich-count.exceeded {
    color: #9a3332;
  }

  .dialog-rich-ckeditor + :global(.ck-editor .ck-content) {
    min-height: 400px;
    max-height: 75vh;
    overflow: auto;
  }

  .dialog-rich-ckeditor.compact + :global(.ck-editor .ck-content) {
    min-height: 150px;
    resize: vertical;
  }

  :global(.ck-content figure.table) {
    display: block;
  }
  :global(figure.table table) {
    width: 100%;
    overflow-x: auto;
  }
  :global(figure.table.auto-width table) {
    width: auto;
  }

  :global(figure.table.full-width table) {
    width: 100%;
  }

  :global(figure.table.ck-widget.border table, figure.table.ck-widget.border table th, figure.table.ck-widget.border table td) {
    border-width: 2px;
    border-style: solid;
  }

  :global(.ck.ck-label.dialog-field-label) {
    display: block;
    margin-bottom: 0.3em;
    font-weight: 500;
  }
  :global(.dialog-field-help) {
    font-size: 0.9em;
    color: #595959;
  }
</style>
