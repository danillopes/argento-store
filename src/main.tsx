import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { StoreProvider } from './store/Store'
import App from './App'
import './styles.css'
import { modelAssetUrl } from './lib/model-assets'
import { readModelAsset } from './lib/model-cache'

// Começa a baixar e decodificar o 3D junto da abertura do site, não ao rolar.
const heroModel = modelAssetUrl(['iphone-18-pro']) // mesmo modelo da abertura (Scrolly)
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

// O site deixou de ser instalável: nada de app na tela inicial, só navegador. Quem visitou antes ainda tem
// o service worker antigo guardado no aparelho, e ele continuaria servindo a versão velha para sempre — então
// aqui ele é removido e os caches que ele criou são apagados, uma vez, na primeira visita depois desta mudança.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .then((removidos) => {
      if (!removidos.some(Boolean) || !('caches' in window)) return
      return caches.keys().then((nomes) => Promise.all(nomes.map((n) => caches.delete(n))))
    })
    .catch(() => {})
}
