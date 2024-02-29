<script lang="ts">
  import type { EditorConfig } from '@ckeditor/ckeditor5-core/src/editor/editorconfig'
  import type ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor'
  import { CHOOSER_API_CONTEXT, type Client, FieldStandard } from '@dosgato/dialog'
  import { nullableSerialize } from '@txstate-mws/svelte-forms'
  import { getContext } from 'svelte'
  import { Cache, isBlank, isNotBlank } from 'txstate-utils'
  import RichTextEditor from './RichTextEditor.svelte'
  import type { ConfigType, TemplateProperties } from './RichTextTypes'
  import { getParserElement, getUrl } from './util'

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
  export let editor: ClassicEditor = undefined
  export let compact: boolean = false

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

  const urlToValueCache: Record<string, string> = {}

  async function finalize (data: string, isSubmit: boolean) {
    if (isSubmit && editor?.plugins.get('SourceEditing')?.isSourceEditingMode) throw new Error('You cannot save while editing source in a rich editor. Click the Source button again to return to regular editing mode.')
    const testEl = getParserElement()
    testEl.innerHTML = nullableSerialize(data)
    const links = testEl.querySelectorAll('[href]')
    const images = testEl.querySelectorAll('[src]')
    await Promise.all([
      ...Array.from(links).map(async link => {
        const href = link.getAttribute('href')!
        const itm = await findByUrlCache.get(href)
        if (itm) link.setAttribute('href', itm.id)
        else {
          const value = urlToValueCache[href] ?? chooserClient.urlToValue?.(href)
          if (value) link.setAttribute('href', value)
        }
      }),
      ...Array.from(images).map(async image => {
        const src = image.getAttribute('src')!
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
    const testEl = getParserElement()
    testEl.innerHTML = nullableSerialize(data)
    const links = testEl.querySelectorAll('[href]')
    const images = testEl.querySelectorAll('[src]')
    await Promise.all([
      ...Array.from(links).map(async link => {
        const href = link.getAttribute('href')!
        const itm = await findByIdCache.get(href)
        if (itm) link.setAttribute('href', getUrl(itm))
        else {
          const url = chooserClient.valueToUrl?.(href)
          if (url) {
            urlToValueCache[url] = href
            link.setAttribute('href', url)
          }
        }
      }),
      ...Array.from(images).map(async (image: HTMLImageElement) => {
        const src = image.getAttribute('src')!
        const itm = await findByIdCache.get(src)
        if (itm) image.setAttribute('src', getUrl(itm))
        else {
          const url = chooserClient.valueToUrl?.(src)
          if (url) {
            urlToValueCache[url] = src
            image.setAttribute('src', url)
          }
        }

        // convert from CKEditor4
        const up = image.parentElement
        if (up?.tagName !== 'FIGURE' || !up.classList.contains('image') || ['left', 'right'].includes(image.style.float) || ['left', 'right'].includes(up.style.float)) {
          let figure = up
          let taggedElement = figure
          if (up?.tagName !== 'FIGURE') {
            figure = document.createElement('figure')
            taggedElement = image
            if (up?.tagName === 'P') {
              up.parentElement?.insertBefore(figure, up)
              figure.append(image)
              if (isBlank(up.innerText)) up.remove()
            } else {
              up?.insertBefore(figure, image)
              figure.append(image)
            }
          }
          figure!.classList.add('image', 'image_resized')
          const float = taggedElement!.style.float
          if (float) {
            if (float === 'left') figure!.classList.add('image-style-align-left')
            if (float === 'right') figure!.classList.add('image-style-align-right')
          }
          const width = parseInt(image.getAttribute('width') ?? '1000', 10)
          const newWidth = String(Math.round(1000 * Math.min(width, 800) / 800) / 10) + '%'
          figure!.style.width ||= newWidth

          image.removeAttribute('width')
          image.removeAttribute('height')
          image.removeAttribute('hspace')
          image.style.float = ''

          figure?.removeAttribute('height')
        }
      })
    ])
    return testEl.innerHTML
  }

  const ssr = typeof document === 'undefined'
</script>

{#if !ssr}
  <FieldStandard bind:id {label} {helptext} {path} {required} {conditional} {finalize} {initialize} let:id>
    <RichTextEditor bind:editor {id} {path} {maxlength} {configType} {templateProperties} {config} {findByIdCache} {findByUrlCache} {compact} />
  </FieldStandard>
{/if}
