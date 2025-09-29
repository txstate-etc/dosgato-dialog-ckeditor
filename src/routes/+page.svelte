<script lang="ts">
  import { FormDialog } from '@dosgato/dialog'
  import type { Feedback, FormStore } from '@txstate-mws/svelte-forms'
  import { demoChooserAPI } from '../demo/DemoChooserAPI'
  import { FieldRichText } from '$lib'
  import '../styles.scss?inline'
  let store: FormStore

  let showdialog = true

  async function submit (data) {
    return {
      success: false,
      data,
      messages: [{ type: 'error' as const, message: 'Nope', path: 'richtext' }]
    }
  }

  async function validate (data): Promise<Feedback[]> {
    return [{
      type: 'error',
      message: 'Nope',
      path: 'richtext'
    }]
  }

  function escape () {
    showdialog = false
  }

  const preload = {
    richtext: `
    <p><img alt="An Age to Work, Book Cover" height="250" hspace="7" src="asset-3" style="float:right" width="165">Congratulations to Miranda Sachs on the publication of her new book, <a href="https://global.oup.com/academic/product/an-age-to-work-9780197638453?cc=us&amp;lang=en&amp;#"><em>An Age to Work: Working-Class Childhood in Third Republic Paris</em></a> now available from Oxford University Press.&nbsp;</p>
    <p><a href="page-2">hello</a></p><p><a href="{&quot;type&quot;:&quot;url&quot;,&quot;url&quot;:&quot;https://www.google.com&quot;}">hello</a></p>
    <figure class="caption"><img alt="jlkj" height="362" src="asset-3" width="480" />
      <figcaption>My great caption</figcaption>
    </figure>
    <img alt="An Age to Work, Book Cover" height="250" hspace="7" src="asset-3" style="float:left" width="165">Congratulations to Miranda Sachs on the publication of her new book, <a href="https://global.oup.com/academic/product/an-age-to-work-9780197638453?cc=us&amp;lang=en&amp;#"><em>An Age to Work: Working-Class Childhood in Third Republic Paris</em></a> now available from Oxford University Press.&nbsp;
    <figure class="image image-style-align-left image_resized" style="width:15%;">
      <img src="asset-3" alt="An Age to Work, Book Cover" width="500" height="500">
    </figure>
  `
  }

  const templateProperties = {
    fontFamilies: ['"Comic Sans MS", "Comic Sans", cursive']
  }
</script>

<svelte:head><title>DosGato Dialog Example</title></svelte:head>
<h1>DosGato Dialog Example</h1>
<button on:click={() => { showdialog = true }}>Show Dialog</button>

<main>
{#if showdialog}
  <FormDialog bind:store {preload} {submit} {validate} chooserClient={demoChooserAPI} let:saved on:escape={escape}>
    <FieldRichText path="richtext" label="Rich Text" maxlength={10} {templateProperties}/>
    {#if saved}Save successful!{/if}
    <FieldRichText path="richtext2" conditional={false} label="Rich Text" maxlength={10} />
  </FormDialog>
{/if}
</main>
<aside>
  <pre>{JSON.stringify($store?.data, null, 2)}</pre>
</aside>

<style>
  main {
    padding-right: max(30%,10em);
  }
  aside {
    position: absolute;
    top: 3.7em;
    right: 0;
    width: 30%;
    min-width: 10em;
    overflow-x: scroll;
  }
  aside pre {
    font-size: 0.75em;
  }
</style>
