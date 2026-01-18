import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/main.scss'

createApp(App).use(createApp).mount('#app')