<script lang="ts">
  import { Form } from '@dosgato/dialog'
  import type { Feedback, FormStore } from '@txstate-mws/svelte-forms'
  import { onMount } from 'svelte'
  import { demoChooserAPI } from '../demo/DemoChooserAPI'
  import { FieldRichText } from '$lib'
  let store: FormStore

  async function submit (data) {
    return {
      success: true,
      data,
      messages: []
    }
  }

  async function validate (data): Promise<Feedback[]> {
    return [{
      type: 'error',
      message: 'Nope',
      path: 'multi.0.name'
    }]
  }

  onMount(() => {
    store.setField('richtext', 'hello')
  })
</script>

<svelte:head><title>DosGato Dialog Example</title></svelte:head>
<h1>DosGato Dialog Example</h1>

<main>
<Form bind:store {submit} {validate} chooserClient={demoChooserAPI} let:saved>
  <FieldRichText path="richtext" label="Rich Text" maxlength={10} />
  {#if saved}Save successful!{/if}
</Form>
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
