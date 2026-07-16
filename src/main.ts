import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { loadState } from './lib/state.svelte'
import { initRoute } from './lib/route'

const target = document.getElementById('app')
if (!target) throw new Error('Missing #app mount target')

loadState()

const instance = mount(App, { target })

void initRoute()

export default instance
