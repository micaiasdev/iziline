import { useEffect, useState } from 'react'
import './App.css'
import { RideSearchPage } from './carona/pages/RideSearchPage/RideSearchPage'
import { NewTripPage } from './travel/pages/NewTripPage/NewTripPage'
import { MyTripsPage } from './agenda/pages/MyTripsPage/MyTripsPage'

type AppView = 'newTrip' | 'rides' | 'myTrips'

function getViewFromPath(): AppView {
  if (window.location.pathname === '/caronas') {
    return 'rides'
  }

  if (window.location.pathname === '/minhas-viagens') {
    return 'myTrips'
  }

  return 'newTrip'
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
      <nav className="app-navigation" aria-label="Navegacao principal">
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
        <button
          type="button"
          className={view === 'myTrips' ? 'app-navigation__item active' : 'app-navigation__item'}
          onClick={() => navigateTo('/minhas-viagens', 'myTrips')}
        >
          Minhas viagens
        </button>
      </nav>

      {view === 'rides' && <RideSearchPage />}
      {view === 'myTrips' && <MyTripsPage />}
      {view === 'newTrip' && <NewTripPage />}
    </>
  )
}

export default App
