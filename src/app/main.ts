import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles.css'
import { initializeLocale } from '@/shared/i18n/i18n.service'

initializeLocale()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
