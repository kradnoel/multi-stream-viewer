import { createApp } from 'vue'
import OpenVue from 'openvue/config'
import { carbonless } from '@mudix-mz/carbonless'
import App from './App.vue'

// Component styles are required; the shared element styles are scoped to
// .carbonless, which index.html puts on <body>.
import '@mudix-mz/carbonless/carbonless.css'
import '@mudix-mz/carbonless/styles.css'
import './assets/styles/main.scss'

createApp(App)
  .use(OpenVue, { theme: { preset: carbonless, options: { darkModeSelector: 'system' } } })
  .mount('#app')
