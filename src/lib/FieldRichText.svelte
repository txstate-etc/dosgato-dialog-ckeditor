<script lang="ts">
  import alertOutline from '@iconify-icons/mdi/alert-outline.js'
  import type { EditorConfig } from '@ckeditor/ckeditor5-core/src/editor/editorconfig'
  import type ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
  import { CHOOSER_API_CONTEXT, ChooserStore, Chooser, FieldStandard, Icon, type Client, type AnyUIItem, type Folder } from '@dosgato/dialog'
  import { FORM_CONTEXT, nullableDeserialize, nullableSerialize, type FormStore } from '@txstate-mws/svelte-forms'
  import { getContext, onMount, tick } from 'svelte'
  import { Cache } from 'txstate-utils'
  import { getParserElement } from './util'
  import { defaultConfig, minimalConfig, minimalConfigWithLists, tiConfig } from './RichTextTypes'

  export let id: string | undefined = undefined
  export let path: string
  export let label: string = ''
  export let maxlength: number|undefined = undefined
  export let conditional: boolean|undefined = undefined
  export let required = false
  export let configType: 'full' | 'min' | 'minwithlist' | 'ti' | undefined
  export let config: EditorConfig|undefined = undefined
  export let minimal = false

  const formStore = getContext<FormStore>(FORM_CONTEXT)
  const value = formStore.getField<string>(path)
  const chooserClient = getContext<Client>(CHOOSER_API_CONTEXT)

  if (!configType) configType = defaultConfig
  else if (configType === 'min') configType = minimalConfig
  else if (configType === 'minwithlist') configType = minimalConfigWithLists
  else if (configType === 'ti') configType = tiConfig
  else configType = defaultConfig

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
      ...configType,
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
      formStore.setField(path, nullableDeserialize(editor.getData()))
      tick().then(() => { skipReaction = false })
    })
    await reactToValue()
  })

  const findByIdCache = new Cache(async (id: string) => {
    const item = await chooserClient?.findById(id)
    if (item) findByUrlCache.set(item.url, item)
    return item
  })
  const findByUrlCache = new Cache(async (url: string) => {
    const item = await chooserClient?.findByUrl?.(url)
    if (item) findByIdCache.set(item.id, item)
    return item
  })
  async function finalize (data: string) {
    const testEl = getParserElement()
    testEl.innerHTML = data
    const links = testEl.querySelectorAll('[href]')
    const images = testEl.querySelectorAll('[src]')
    await Promise.all([
      ...Array.from(links).map(async link => {
        const itm = await findByUrlCache.get(link.getAttribute('href')!)
        if (itm) link.setAttribute('href', itm.id)
      }),
      ...Array.from(images).map(async image => {
        const itm = await findByUrlCache.get(image.getAttribute('src')!)
        if (itm) image.setAttribute('src', itm.id)
      })
    ])
    return testEl.innerHTML
  }

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

<FieldStandard bind:id {label} {path} {required} {conditional} {finalize} let:id let:onBlur>
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
  .dialog-rich-ckeditor {
    --ck-z-default: var(--modal-z, 1);
	  --ck-z-modal: calc( var(--ck-z-default) + 999 );
  }
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
</style>
