import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './styles.css'
import { trackEvent } from '@/shared/analytics/analytics.service'
import { initializeLocale, registerLocale } from '@/shared/i18n/i18n.service'
import { swbMessages } from '@/shared/i18n/locales/swb'
import { initializeTheme } from '@/shared/theme/theme.service'

registerLocale({ code: 'swb', label: swbMessages.language.shimaore, messages: swbMessages })
initializeLocale()
initializeTheme()

const app = createApp(App)

app.config.errorHandler = () => {
  trackEvent('technical_error')
}

app.use(createPinia())
app.use(router)

app.mount('#app')

window.addEventListener('error', () => {
  trackEvent('technical_error')
})

window.addEventListener('unhandledrejection', () => {
  trackEvent('technical_error')
})
