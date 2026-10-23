import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './store/Store'
import App from './App'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'
import { modelAssetUrl } from './lib/model-assets'
import { readModelAsset } from './lib/model-cache'

// Começa a baixar e decodificar o 3D junto da abertura do site, não ao rolar.
const heroModel = modelAssetUrl(['iphone-17-pro'])
if (heroModel) {
  void readModelAsset(heroModel).catch(() => {})
  void import('./components/Phone3D').then(({ preloadPhoneModel }) => preloadPhoneModel(heroModel)).catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)

// Service worker: quando sai uma versão nova, ela assume e a página recarrega sozinha.
// Também procura atualização ao voltar para a aba e a cada 15 minutos.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
    setInterval(check, 15 * 60 * 1000)
  },
})
