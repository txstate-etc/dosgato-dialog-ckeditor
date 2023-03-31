<script lang="ts">
  import alertOutline from '@iconify-icons/mdi/alert-outline.js'
  import type { EditorConfig } from '@ckeditor/ckeditor5-core/src/editor/editorconfig'
  import type ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
  import { CHOOSER_API_CONTEXT, ChooserStore, Chooser, FieldStandard, Icon, type Client, type AnyUIItem, type Folder, type AnyItem } from '@dosgato/dialog'
  import { FORM_CONTEXT, FORM_INHERITED_PATH, nullableDeserialize, nullableSerialize, type FormStore } from '@txstate-mws/svelte-forms'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { Cache, isNotBlank, randomid } from 'txstate-utils'
  import { getParserElement } from './util'
  import { type TemplateProperties, type ConfigType, getConfig } from './RichTextTypes'

  export let id: string | undefined = undefined
  export let path: string
  export let label: string = ''
  export let maxlength: number|undefined = undefined
  export let required = false
  export let configType: ConfigType = 'full'
  export let templateProperties: TemplateProperties = {}
  export let config: EditorConfig|undefined = undefined
  export let helptext: string | undefined = undefined
  export let findByIdCache: Cache<string, AnyItem | undefined>
  export let findByUrlCache: Cache<string, AnyItem | undefined>

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
  let editor: ClassicEditor
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
    editor.model.document.on('change:data', () => {
      skipReaction = true
      formStore.setField(finalPath, nullableDeserialize(editor.getData()))
      tick().then(() => { skipReaction = false })
    })
    await reactToValue()
    const modalz = getComputedStyle(element).getPropertyValue('--modal-z')
    document.documentElement.style.setProperty('--ck-z-default', modalz || '1')
    document.documentElement.style.setProperty('--ck-z-modal', String(Number(modalz) + 1 || '1'))

    const editorWrapper = document.getElementById(editorId)
    if (editorWrapper) {
      const editorLabel = editorWrapper.querySelector('label')
      if (editorLabel) {
        if (required) label = label += ' *'
        editorLabel.textContent = label
        editorLabel.classList.remove('ck-voice-label')
        editorLabel.classList.add('dialog-field-label')
      }
      if (helptext) {
        const helpTextId = randomid()
        const ed = editorWrapper.querySelector('.ck-editor')

        if (ed) {
          ed.setAttribute('aria-describedby', helpTextId)
          editorLabel?.insertAdjacentHTML('afterend', `<div id="${helpTextId}" class="dialog-field-help">${helptext}</div>`)
        }
      }
    }
  })
  onDestroy(() => {
    // onDestroy runs in SSR but we don't create editor in SSR
    editor?.destroy()
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
    const item: Exclude<AnyUIItem, Folder> = e.detail
    findByIdCache.set(item.id, item)
    findByUrlCache.set(item.url, item)
    modaltoshow = undefined
    await tick()
    await tick()
    latestChooserCB(item.url, item.name)
  }
  let charlength: number = 0
  let reactionVersion = 0

  async function reactToValue (..._: any) {
    if (skipReaction) return
    let serialized = nullableSerialize($value)
    if (mounted && serialized.trim().length > 0) {
      const testEl = getParserElement()
      testEl.innerHTML = serialized
      charlength = testEl.innerText.trim().length
      const links = testEl.querySelectorAll('[href]')
      const images = testEl.querySelectorAll('[src]')
      const saveReactionVersion = ++reactionVersion
      await Promise.all([
        ...Array.from(links).map(async link => {
          const itm = await findByIdCache.get(link.getAttribute('href')!)
          if (itm) link.setAttribute('href', itm.url)
        }),
        ...Array.from(images).map(async image => {
          const itm = await findByIdCache.get(image.getAttribute('src')!)
          if (itm) image.setAttribute('src', itm.url)
        })
      ])
      if (reactionVersion === saveReactionVersion) serialized = testEl.innerHTML
    }
    if (editor && editor.getData() !== serialized) editor.setData(serialized)
  }
  $: reactToValue($value).catch(e => console.error(e))
  $: exceeded = maxlength && maxlength > 0 && charlength > maxlength
</script>

<div id={editorId}>
  <div {id} class="dialog-rich-ckeditor" bind:this={element}></div>
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
