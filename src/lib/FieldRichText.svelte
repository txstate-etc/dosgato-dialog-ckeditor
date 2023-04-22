<script lang="ts">
  import type { EditorConfig } from '@ckeditor/ckeditor5-core/src/editor/editorconfig'
  import { CHOOSER_API_CONTEXT, type Client, FieldStandard } from '@dosgato/dialog'
  import { nullableSerialize } from '@txstate-mws/svelte-forms'
  import { getContext } from 'svelte'
  import { Cache, isNotBlank } from 'txstate-utils'
  import RichTextEditor from './RichTextEditor.svelte'
  import type { ConfigType, TemplateProperties } from './RichTextTypes'
  import { getParserElement } from './util'

  export let id: string | undefined = undefined
  export let path: string
  export let label: string = ''
  export let maxlength: number|undefined = undefined
  export let conditional: boolean|undefined = undefined
  export let required = false
  export let configType: ConfigType = 'full'
  export let templateProperties: TemplateProperties = {}
  export let config: EditorConfig|undefined = undefined
  export let helptext: string | undefined = undefined

  const chooserClient = getContext<Client>(CHOOSER_API_CONTEXT)

  const findByIdCache = new Cache(async (id: string) => {
    if (!id) return
    const item = await chooserClient?.findById(id)
    if (item) {
      findByUrlCache.set(item.url, item)
      if ('image' in item && isNotBlank(item.image?.previewUrl)) findByUrlCache.set(item.image!.previewUrl, item)
    }
    return item
  })

  const findByUrlCache = new Cache(async (url: string) => {
    if (!url) return
    const item = await chooserClient?.findByUrl?.(url)
    if (item) findByIdCache.set(item.id, item)
    return item
  })

  async function finalize (data: string) {
    const testEl = getParserElement()
    testEl.innerHTML = nullableSerialize(data)
    const links = testEl.querySelectorAll('[href]')
    const images = testEl.querySelectorAll('[src]')
    await Promise.all([
      ...Array.from(links).map(async link => {
        const href = link.getAttribute('href')!
        const itm = await findByUrlCache.get(href)
        if (itm) link.setAttribute('href', itm.url)
        else {
          const value = chooserClient.urlToValue?.(href)
          if (value) link.setAttribute('href', value)
        }
      }),
      ...Array.from(images).map(async image => {
        const src = image.getAttribute('src')!
        const itm = await findByUrlCache.get(src)
        if (itm) image.setAttribute('src', itm.url)
        else {
          const value = chooserClient.urlToValue?.(src)
          if (value) image.setAttribute('src', value)
        }
      })
    ])
    return testEl.innerHTML
  }

</script>

<FieldStandard bind:id {label} {helptext} {path} {required} {conditional} {finalize} let:id>
  <RichTextEditor {id} {path} {maxlength} {configType} {templateProperties} {config} {findByIdCache} {findByUrlCache} />
</FieldStandard>
