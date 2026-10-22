<script lang="ts">
  // Viewer for the round-trip tests (./test.sh): pick a sample and see its
  // expected output (test/expected) rendered next to what the editor produced
  // on the last run, or diff their sources. Only failing samples are in
  // test/last-report.json; for the rest, current output is the expected file.
  import { onMount } from 'svelte'
  import { replaceState } from '$app/navigation'
  import contentCss from 'ckeditor5/ckeditor5-content.css?url'

  type Status = 'fail' | 'ok'
  interface Entry {
    name: string
    status: Status
    expected?: string
    current?: string
    input?: string
  }

  const statusLabel: Record<Status, string> = { fail: 'Failed', ok: 'Passed' }
  const statusOrder: Status[] = ['fail', 'ok']

  let entries: Entry[] = []
  let loadError = ''
  const filter: Record<Status, boolean> = { fail: true, ok: false }
  let selected: string | undefined
  let view: 'rendered' | 'source' = 'rendered'
  let showInput = false
  // 'live' renders with the txst theme's CSS compiled from ../dosgato-txstate
  // (./livecss); 'ckeditor' with CKEditor's own content styles.
  let styles: 'live' | 'ckeditor' = 'live'
  let liveCssAvailable = true

  onMount(async () => {
    fetch('/report/livecss', { method: 'HEAD' }).then(r => { if (!r.ok) { liveCssAvailable = false; styles = 'ckeditor' } }).catch(() => { liveCssAvailable = false; styles = 'ckeditor' })
    const { failures, samples, expected }: { failures?: Record<string, string>, samples: Record<string, string>, expected: Record<string, string> } = await (await fetch('/report/data')).json()
    if (!failures) loadError = 'test/last-report.json not found, run ./test.sh first. Showing expected output only.'
    entries = Object.keys(samples).sort().map((name): Entry => {
      const failed = failures?.[name] != null
      return { name, status: failed ? 'fail' : 'ok', expected: expected[name], current: failed ? failures[name] : expected[name], input: samples[name] }
    })
    if (!entries.some(e => e.status === 'fail')) filter.ok = true
    const fromHash = location.hash.slice(1)
    const fromEntry = entries.find(e => e.name === fromHash)
    if (fromEntry) {
      selected = fromHash
      filter[fromEntry.status] = true
    } else selected = visible[0]?.name
  })

  $: visible = entries.filter(e => filter[e.status])
  $: counts = Object.fromEntries(statusOrder.map(s => [s, entries.filter(e => e.status === s).length])) as Record<Status, number>
  $: entry = entries.find(e => e.name === selected)
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- hash-only update of this same page, not a navigation
  $: if (selected != null && typeof location !== 'undefined') replaceState('#' + selected, {})
  $: diff = view === 'source' && entry ? diffLines(splitTags(entry.expected ?? ''), splitTags(entry.current ?? '')) : []
  let expanded: Record<number, boolean> = {}
  $: if (entry) expanded = {}
  $: hunks = collapse(diff, expanded)

  function select (name: string) {
    selected = name
    document.getElementById('sample-' + name)?.scrollIntoView({ block: 'nearest' })
  }

  function onKeydown (e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    if ((e.target as HTMLElement).closest('input, textarea')) return
    const idx = visible.findIndex(v => v.name === selected)
    const next = visible[idx + (e.key === 'ArrowDown' ? 1 : -1)]
    if (next) { e.preventDefault(); select(next.name) }
  }

  // The tests' mock asset urls (/assets/...) and the stored input's JSON
  // asset descriptors don't resolve here; point them all at the demo image.
  function fakeAssets (html: string) {
    return html.replace(/(<img\b[^>]*?\ssrc=")(\/assets\/|\{)[^"]*"/g, '$1/demo-full.png"')
  }

  function srcdoc (html: string | undefined, mode: typeof styles) {
    const content = html ? fakeAssets(html) : '<p style="color:#999">(no output)</p>'
    // live: the same wrappers render puts around rich text on a txst page
    // (the theme's variables are scoped to body.template-txst)
    if (mode === 'live') {
      return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/report/livecss"><style>
        body { margin: 0; padding: 12px; background: #fff }
      </style></head><body class="template-txst"><main class="contentcolumn"><div class="column_paragraph"><div class="txst-rich-text gato-rich-editor">${content}</div></div></main></body></html>`
    }
    return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${contentCss}"><style>
      body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; font-size: 15px; line-height: 1.4 }
    </style></head><body class="ck-content">${content}</body></html>`
  }

  // Grow each iframe to its content so both panes scroll with the page.
  function autosize (iframe: HTMLIFrameElement) {
    let observer: ResizeObserver | undefined
    function fit () {
      const doc = iframe.contentDocument
      if (!doc?.body) return
      iframe.style.height = doc.documentElement.scrollHeight + 'px'
      observer?.disconnect()
      observer = new ResizeObserver(() => { iframe.style.height = doc.documentElement.scrollHeight + 'px' })
      observer.observe(doc.body)
    }
    iframe.addEventListener('load', fit)
    return { destroy () { observer?.disconnect(); iframe.removeEventListener('load', fit) } }
  }

  // One tag or text run per line, so a line diff lines up structurally.
  function splitTags (html: string) {
    return html.replace(/>\s*</g, '>\n<').replace(/>([^<\n]+)</g, '>\n$1\n<').split('\n').filter(l => l.trim() !== '')
  }

  interface DiffLine { kind: 'same' | 'del' | 'add', text: string }
  // Fold unchanged runs down to CONTEXT lines around each change; `start`
  // (the fold's first index into the diff) keys the expand toggle.
  const CONTEXT = 3
  type Hunk = { line: DiffLine } | { fold: number, start: number }
  function collapse (lines: DiffLine[], open: Record<number, boolean>): Hunk[] {
    const near = lines.map(() => false)
    lines.forEach((l, i) => {
      if (l.kind === 'same') return
      for (let k = Math.max(0, i - CONTEXT); k <= Math.min(lines.length - 1, i + CONTEXT); k += 1) near[k] = true
    })
    const out: Hunk[] = []
    let i = 0
    while (i < lines.length) {
      if (near[i]) { out.push({ line: lines[i] }); i += 1; continue }
      let j = i
      while (j < lines.length && !near[j]) j += 1
      if (open[i] || j - i <= 2) for (let k = i; k < j; k += 1) out.push({ line: lines[k] })
      else out.push({ fold: j - i, start: i })
      i = j
    }
    return out
  }

  function diffLines (a: string[], b: string[]): DiffLine[] {
    const n = a.length
    const m = b.length
    const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
    const out: DiffLine[] = []
    let i = 0
    let j = 0
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) {
        out.push({ kind: 'same', text: a[i] })
        i += 1
        j += 1
      } else if (j >= m || (i < n && lcs[i + 1][j] >= lcs[i][j + 1])) {
        out.push({ kind: 'del', text: a[i] })
        i += 1
      } else {
        out.push({ kind: 'add', text: b[j] })
        j += 1
      }
    }
    return out
  }
</script>

<svelte:head><title>Round-trip report</title></svelte:head>
<svelte:window on:keydown={onKeydown} />

<div class="layout">
  <aside>
    <h1>Round-trip report</h1>
    <div class="filters">
      {#each statusOrder as s (s)}
        <label class="chip {s}">
          <input type="checkbox" bind:checked={filter[s]}> {statusLabel[s]} <span class="count">{counts[s] ?? 0}</span>
        </label>
      {/each}
    </div>
    {#if loadError}
      <p class="error">{loadError}</p>
    {/if}
    <ul>
      {#each visible as e (e.name)}
        <li>
          <button id="sample-{e.name}" class:active={e.name === selected} on:click={() => select(e.name)}>
            <span class="dot {e.status}"></span>
            <span class="idx">#{e.name}</span>
            <span class="summary">{statusLabel[e.status]}</span>
          </button>
        </li>
      {/each}
    </ul>
  </aside>

  <main>
    {#if entry}
      <header>
        <h2>Sample #{entry.name} <span class="badge {entry.status}">{statusLabel[entry.status]}</span></h2>
        <div class="toggles">
          <div class="segmented">
            <button class:on={view === 'rendered'} on:click={() => { view = 'rendered' }}>Rendered</button>
            <button class:on={view === 'source'} on:click={() => { view = 'source' }}>Source diff</button>
          </div>
          {#if view === 'rendered'}
            <div class="segmented" title={liveCssAvailable ? '' : 'dosgato-txstate checkout not found next to this repo'}>
              <button class:on={styles === 'live'} disabled={!liveCssAvailable} on:click={() => { styles = 'live' }}>Live (txst)</button>
              <button class:on={styles === 'ckeditor'} on:click={() => { styles = 'ckeditor' }}>CKEditor</button>
            </div>
            <label><input type="checkbox" bind:checked={showInput}> Show stored input</label>
          {/if}
        </div>
      </header>

      {#if view === 'rendered'}
        <div class="panes" class:three={showInput}>
          {#if showInput}
            <div class="pane"><h3>Stored input (unresolved links)</h3>{#key `${entry.name}-${styles}`}<iframe title="input" srcdoc={srcdoc(entry.input, styles)} use:autosize></iframe>{/key}</div>
          {/if}
          <div class="pane"><h3>Expected</h3>{#key `${entry.name}-${styles}`}<iframe title="expected" srcdoc={srcdoc(entry.expected, styles)} use:autosize></iframe>{/key}</div>
          <div class="pane"><h3>Current</h3>{#key `${entry.name}-${styles}`}<iframe title="current" srcdoc={srcdoc(entry.current, styles)} use:autosize></iframe>{/key}</div>
        </div>
      {:else}
        <div class="diff">
          {#each hunks as h, idx (idx)}
            {#if 'fold' in h}
              <button class="fold" on:click={() => { expanded[h.start] = true }}>⋯ {h.fold} unchanged lines</button>
            {:else}
              <div class="line {h.line.kind}"><span class="sign">{h.line.kind === 'del' ? '−' : h.line.kind === 'add' ? '+' : ' '}</span>{h.line.text}</div>
            {/if}
          {/each}
          {#if !diff.some(l => l.kind !== 'same')}<p class="nodiff">Sources are byte-identical.</p>{/if}
        </div>
      {/if}
    {:else if !loadError}
      <p class="empty">Select a sample.</p>
    {/if}
  </main>
</div>

<style>
  :global(body) { margin: 0; font-family: system-ui, sans-serif; color: #1f2328; background: #f6f7f9 }
  .layout { display: grid; grid-template-columns: 320px 1fr; min-height: 100vh }
  aside { position: sticky; top: 0; height: 100vh; overflow-y: auto; background: #fff; border-right: 1px solid #d8dee4; padding: 12px; box-sizing: border-box }
  h1 { font-size: 16px; margin: 4px 0 12px }
  .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 3px 8px; border-radius: 12px; border: 1px solid #d8dee4; cursor: pointer }
  .chip input { margin: 0 }
  .count { color: #656d76 }
  ul { list-style: none; margin: 0; padding: 0 }
  li button { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left; border: 0; background: none; padding: 5px 6px; border-radius: 4px; cursor: pointer; font: inherit; font-size: 13px }
  li button:hover { background: #f0f2f4 }
  li button.active { background: #ddf4ff }
  .idx { font-variant-numeric: tabular-nums; font-weight: 600; min-width: 36px }
  .summary { color: #656d76; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none }
  .dot.fail, .badge.fail { background: #cf222e }
  .dot.ok, .badge.ok { background: #1a7f37 }
  .badge { color: #fff; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 10px; vertical-align: middle }
  main { padding: 16px 20px; min-width: 0 }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap }
  h2 { font-size: 18px; margin: 0 }
  .toggles { display: flex; align-items: center; gap: 16px; font-size: 13px }
  .segmented { display: inline-flex; border: 1px solid #d8dee4; border-radius: 6px; overflow: hidden }
  .segmented button { border: 0; background: #fff; padding: 5px 12px; font: inherit; cursor: pointer }
  .segmented button.on { background: #1f2328; color: #fff }
  .segmented button:disabled { opacity: .4; cursor: not-allowed }
  .panes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; align-items: start }
  .panes.three { grid-template-columns: 1fr 1fr 1fr }
  .pane { background: #fff; border: 1px solid #d8dee4; border-radius: 6px; min-width: 0; overflow: hidden }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #656d76; margin: 0; padding: 8px 12px; border-bottom: 1px solid #d8dee4; background: #f6f8fa }
  iframe { display: block; width: 100%; border: 0; min-height: 60px }
  .diff { margin-top: 12px; background: #fff; border: 1px solid #d8dee4; border-radius: 6px; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; overflow-x: auto; padding: 6px 0 }
  .line { white-space: pre-wrap; word-break: break-all; padding: 0 12px 0 28px; text-indent: -16px }
  .line .sign { display: inline-block; width: 16px; text-indent: 0; color: #656d76 }
  .line.del { background: #ffebe9 }
  .line.add { background: #dafbe1 }
  .fold { display: block; width: 100%; text-align: left; border: 0; border-block: 1px solid #eaeef2; background: #f6f8fa; color: #656d76; font: inherit; padding: 2px 12px; cursor: pointer; margin: 2px 0 }
  .fold:hover { background: #ddf4ff; color: #0969da }
  .nodiff, .empty { color: #656d76; padding: 0 12px }
  .error { color: #cf222e; font-size: 13px }
</style>
