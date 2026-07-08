import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RideSearchPage } from './carona/pages/RideSearchPage/RideSearchPage'
import { NewTripPage } from './travel/pages/NewTripPage/NewTripPage'
import { TripRequestsPage } from './travel/pages/TripRequestsPage/TripRequestsPage'
import { TripsListPage } from './travel/pages/TripsListPage/TripsListPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/viagens" replace />} />
        <Route path="viagens" element={<TripsListPage />} />
        <Route path="viagens/nova" element={<NewTripPage />} />
        <Route path="viagens/:tripId/solicitacoes" element={<TripRequestsPage />} />
        <Route path="caronas" element={<RideSearchPage />} />
        <Route path="*" element={<Navigate to="/viagens" replace />} />
      </Route>
    </Routes>
  )
}

export default App
