import { useEffect, useState } from 'react'
import './App.css'
import { RideSearchPage } from './carona/pages/RideSearchPage/RideSearchPage'
import { NewTripPage } from './travel/pages/NewTripPage/NewTripPage'

type AppView = 'newTrip' | 'rides'

function getViewFromPath(): AppView {
  return window.location.pathname === '/caronas' ? 'rides' : 'newTrip'
}

function App() {
  const [view, setView] = useState<AppView>(() => getViewFromPath())

  useEffect(() => {
    function handlePopState() {
      setView(getViewFromPath())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function navigateTo(path: string, nextView: AppView) {
    window.history.pushState({}, '', path)
    setView(nextView)
  }

  return (
    <>
      <nav className="app-navigation" aria-label="Navegação principal">
        <button
          type="button"
          className={view === 'newTrip' ? 'app-navigation__item active' : 'app-navigation__item'}
          onClick={() => navigateTo('/', 'newTrip')}
        >
          Cadastrar viagem
        </button>
        <button
          type="button"
          className={view === 'rides' ? 'app-navigation__item active' : 'app-navigation__item'}
          onClick={() => navigateTo('/caronas', 'rides')}
        >
          Buscar caronas
        </button>
      </nav>

      {view === 'rides' ? <RideSearchPage /> : <NewTripPage />}
    </>
  )
}

export default App
