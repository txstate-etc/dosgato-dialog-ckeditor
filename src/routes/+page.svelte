<script lang="ts">
  import { FormDialog } from '@dosgato/dialog'
  import type { Feedback, FormStore } from '@txstate-mws/svelte-forms'
  import { onMount } from 'svelte'
  import { demoChooserAPI } from '../demo/DemoChooserAPI'
  import { FieldRichText } from '$lib'
  import '../styles.scss?inline'
  let store: FormStore

  let showdialog = true

  async function submit (data) {
    return {
      success: true,
      data,
      messages: []
    }
  }

  async function validate (data): Promise<Feedback[]> {
    console.log(data)
    return [{
      type: 'error',
      message: 'Nope',
      path: 'multi.0.name'
    }]
  }

  function escape () {
    showdialog = false
  }

  onMount(() => {
    store.setField('richtext', '<p><a href="page-2">hello</a></p>')
  })
</script>

<svelte:head><title>DosGato Dialog Example</title></svelte:head>
<h1>DosGato Dialog Example</h1>
<button on:click={() => { showdialog = true }}>Show Dialog</button>

<main>
{#if showdialog}
  <FormDialog bind:store {submit} {validate} chooserClient={demoChooserAPI} let:saved on:escape={escape}>
    <FieldRichText path="richtext" label="Rich Text" maxlength={10} />
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
