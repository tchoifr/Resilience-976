import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles.css'
import { initializeLocale, registerLocale } from '@/shared/i18n/i18n.service'
import { swbMessages } from '@/shared/i18n/locales/swb'

registerLocale({ code: 'swb', label: swbMessages.language.shimaore, messages: swbMessages })
initializeLocale()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
