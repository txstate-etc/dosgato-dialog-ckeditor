<script lang="ts">
  import type { ClassicEditor, EditorConfig } from 'ckeditor5'
  import { CHOOSER_API_CONTEXT, type Client, FieldStandard } from '@dosgato/dialog'
  import { nullableSerialize } from '@txstate-mws/svelte-forms'
  import { getContext } from 'svelte'
  import { Cache, isNotBlank } from 'txstate-utils'
  import RichTextEditor from './RichTextEditor.svelte'
  import type { ConfigType, TemplateProperties } from './RichTextTypes'
  import { resolveStoredHtml } from './storage'
  import { getParserElement, getUrl } from './util'

  export let id: string | undefined = undefined
  export let path: string
  export let label = ''
  export let maxlength: number | undefined = undefined
  export let conditional: boolean | undefined = undefined
  export let required = false
  export let configType: ConfigType = 'full'
  export let templateProperties: TemplateProperties = {}
  export let config: EditorConfig | undefined = undefined
  export let helptext: string | undefined = undefined
  export let editor: ClassicEditor | undefined = undefined
  export let compact: boolean = !maxlength || maxlength < 400
  /** Drop GeneralHtmlSupport so only markup a dedicated editor feature understands survives. */
  export let strictHtml = false

  const chooserClient = getContext<Client>(CHOOSER_API_CONTEXT)

  const findByIdCache = new Cache(async (id: string) => {
    if (!id) return
    const item = await chooserClient?.findById(id)
    if (item) {
      void findByUrlCache.set(item.url, item)
      if ('image' in item && isNotBlank(item.image?.previewUrl)) void findByUrlCache.set(item.image.previewUrl, item)
    }
    return item
  })

  const findByUrlCache = new Cache(async (url: string) => {
    if (!url) return
    const item = await chooserClient?.findByUrl?.(url)
    if (item) void findByIdCache.set(item.id, item)
    return item
  })

  const urlToValueCache: Record<string, string> = {}

  async function finalize (data: string) {
    // typing in the source view doesn't touch the model, so the store is stale until something
    // calls getData(), which flushes the source textarea into the model first (and so fires the
    // change:data that syncs the store)
    if ((editor?.plugins.get('SourceEditing') as any)?.isSourceEditingMode) data = editor!.getData()
    const testEl = getParserElement()
    testEl.innerHTML = nullableSerialize(data)
    const links = testEl.querySelectorAll('[href]')
    const images = testEl.querySelectorAll('[src]')
    await Promise.all([
      ...Array.from(links).map(async link => {
        const href = link.getAttribute('href')!
        // no need to process data URLs
        if (href.startsWith('data:')) return
        const itm = await findByUrlCache.get(href)
        if (itm) link.setAttribute('href', itm.id)
        else {
          const value = urlToValueCache[href] ?? chooserClient.urlToValue?.(href)
          if (value) link.setAttribute('href', value)
        }
      }),
      ...Array.from(images).map(async image => {
        const src = image.getAttribute('src')!
        // no need to process data URLs
        if (src.startsWith('data:')) return
        const itm = await findByUrlCache.get(src)
        if (itm) image.setAttribute('src', itm.id)
        else {
          const value = urlToValueCache[src] ?? chooserClient.urlToValue?.(src)
          if (value) image.setAttribute('src', value)
        }
      })
    ])
    return testEl.innerHTML
  }

  async function initialize (data: string) {
    return await resolveStoredHtml(nullableSerialize(data), async value => {
      const itm = await findByIdCache.get(value)
      if (itm) return getUrl(itm)
      const url = chooserClient.valueToUrl?.(value)
      if (url) urlToValueCache[url] = value
      return url
    })
  }

  const ssr = typeof document === 'undefined'
</script>

{#if !ssr}
  <FieldStandard bind:id {label} {helptext} {path} {required} {conditional} {finalize} {initialize} let:id>
    <RichTextEditor bind:editor {id} {path} {maxlength} {configType} {templateProperties} {config} {strictHtml} {findByIdCache} {findByUrlCache} {compact} />
  </FieldStandard>
{/if}
