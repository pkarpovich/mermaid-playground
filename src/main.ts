import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { app, loadState, applyShared } from './lib/state.svelte'
import { decodeShare } from './lib/share'

const target = document.getElementById('app')
if (!target) throw new Error('Missing #app mount target')

loadState()

const instance = mount(App, { target })

async function importShared(): Promise<void> {
  const hash = location.hash
  if (!hash.startsWith('#code:')) return
  const shared = await decodeShare(hash)
  if (shared) applyShared(shared)
  else app.error = 'Broken share link'
  history.replaceState(null, '', location.pathname + location.search)
}

void importShared()

export default instance
