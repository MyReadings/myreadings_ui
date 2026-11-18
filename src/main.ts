import './assets/main.css'
import config from './utils/config'
import { initTracing } from './utils/tracing'
import { vueKeycloak } from '@josempgon/vue-keycloak'

initTracing(config.otelEndpoint)

import 'vuetify/styles'
import { createVuetify, type ThemeDefinition } from 'vuetify'
import { VAlert, VApp, VAppBar, VAppBarTitle, VAvatar, VBottomNavigation, VBtn, VCard, VCardActions, VCardText, VCardTitle, VChip, VCol, VContainer, VDataTable, VDialog, VDivider, VIcon, VImg, VLayout, VList, VListItem, VListItemSubtitle, VListItemTitle, VMain, VPagination, VProgressCircular, VProgressLinear, VRating, VRow, VSelect, VSpacer, VTextField, VTextarea, VToolbar, VToolbarTitle } from 'vuetify/components'
const components = { VAlert, VApp, VAppBar, VAppBarTitle, VAvatar, VBottomNavigation, VBtn, VCard, VCardActions, VCardText, VCardTitle, VChip, VCol, VContainer, VDataTable, VDialog, VDivider, VIcon, VImg, VLayout, VList, VListItem, VListItemSubtitle, VListItemTitle, VMain, VPagination, VProgressCircular, VProgressLinear, VRating, VRow, VSelect, VSpacer, VTextField, VTextarea, VToolbar, VToolbarTitle }
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import { register } from 'swiper/element/bundle'

import { createApp } from 'vue'
import App from './App.vue'
import initRouter from './router'

register()
const initApp = async () => {
  const app = createApp(App)

  await vueKeycloak.install(app, {
    config: {
      url: config.keycloakUrl,
      realm: config.keycloakRealm,
      clientId: config.keycloakClientId,
    },
  })

  const myCustomTheme: ThemeDefinition = {
    dark: false,
    colors: {
      background: '#FFFFFF',
      surface: '#FFFFFF',
      primary: '#5ba352',
      secondary: '#c8eb79',
      error: '#B00020',
      info: '#2196F3',
      success: '#4CAF50',
      warning: '#FB8C00',
    },
  }

  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'myCustomTheme',
      themes: {
        myCustomTheme,
      },
    },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
    components,
  })

  const router = initRouter()

  app.use(router)
  app.use(vuetify)
  app.mount('#app')
}

initApp().catch((error) => {
  console.error('Application startup failed:', error)
  const root = document.getElementById('app')
  if (!root) return
  const message = document.createElement('p')
  message.setAttribute('role', 'alert')
  message.textContent = 'Could not start MyReadings. Check your connection and try again.'
  const retry = document.createElement('button')
  retry.textContent = 'Try again'
  retry.addEventListener('click', () => window.location.reload())
  root.replaceChildren(message, retry)
})
