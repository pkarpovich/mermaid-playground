<script lang="ts">
  import { app, persistState } from './lib/state.svelte'
  import Sidebar from './components/Sidebar.svelte'
  import Topbar from './components/Topbar.svelte'
  import Canvas from './components/Canvas.svelte'
  import EditorPanel from './components/EditorPanel.svelte'

  $effect(() => {
    document.documentElement.dataset.theme = app.theme
  })

  $effect(() => {
    persistState()
  })
</script>

<div class="app">
  <Sidebar />
  <div class="main">
    <Topbar />
    <div class="workspace">
      <Canvas />
      <EditorPanel />
    </div>
  </div>
</div>
