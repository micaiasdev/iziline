import { useEffect, useState } from 'react'
import './App.css'
import { RideSearchPage } from './carona/pages/RideSearchPage/RideSearchPage'
import { NewTripPage } from './travel/pages/NewTripPage/NewTripPage'
import { TripRequestsPage } from './travel/pages/TripRequestsPage/TripRequestsPage'
import { listBookingRequests } from './travel/service/tripRequestsService'

type AppView = 'newTrip' | 'rides' | 'tripRequests'

const tripRequestsPathPattern = /^\/viagens\/(\d+)\/solicitacoes$/
const lastCreatedTripIdKey = 'iziline:lastCreatedTripId'

function readStoredTripId(): number | null {
  const stored = window.sessionStorage.getItem(lastCreatedTripIdKey)
  const parsed = stored ? Number(stored) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function getRouteFromPath(): { view: AppView; tripId: number | null } {
  const { pathname } = window.location
  const tripRequestsMatch = pathname.match(tripRequestsPathPattern)

  if (tripRequestsMatch) {
    return { view: 'tripRequests', tripId: Number(tripRequestsMatch[1]) }
  }

  if (pathname === '/caronas') {
    return { view: 'rides', tripId: null }
  }

  return { view: 'newTrip', tripId: null }
}

function App() {
  const [{ view, tripId }, setRoute] = useState(() => getRouteFromPath())
  const [lastCreatedTripId, setLastCreatedTripId] = useState<number | null>(() =>
    readStoredTripId()
  )
  const [hasRequestsToShow, setHasRequestsToShow] = useState(false)

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteFromPath())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (lastCreatedTripId === null) {
      return
    }

    let shouldIgnore = false

    async function checkForRequests() {
      try {
        const requests = await listBookingRequests(lastCreatedTripId as number, 'all')
        if (!shouldIgnore) {
          setHasRequestsToShow(requests.length > 0)
        }
      } catch {
        if (!shouldIgnore) {
          setHasRequestsToShow(false)
        }
      }
    }

    void checkForRequests()

    return () => {
      shouldIgnore = true
    }
  }, [lastCreatedTripId])

  function navigateTo(path: string, nextView: AppView, nextTripId: number | null = null) {
    window.history.pushState({}, '', path)
    setRoute({ view: nextView, tripId: nextTripId })
  }

  function navigateToTripRequests(nextTripId: number) {
    navigateTo(`/viagens/${nextTripId}/solicitacoes`, 'tripRequests', nextTripId)
  }

  function handleTripCreated(nextTripId: number) {
    window.sessionStorage.setItem(lastCreatedTripIdKey, String(nextTripId))
    setLastCreatedTripId(nextTripId)
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
        {hasRequestsToShow && lastCreatedTripId !== null && (
          <button
            type="button"
            className={view === 'tripRequests' ? 'app-navigation__item active' : 'app-navigation__item'}
            onClick={() => navigateToTripRequests(lastCreatedTripId)}
          >
            Solicitações de reserva
          </button>
        )}
      </nav>

      {view === 'rides' && <RideSearchPage />}
      {view === 'tripRequests' && tripId !== null && <TripRequestsPage tripId={tripId} />}
      {view === 'newTrip' && (
        <NewTripPage onTripCreated={handleTripCreated} onViewRequests={navigateToTripRequests} />
      )}
    </>
  )
}

export default App
