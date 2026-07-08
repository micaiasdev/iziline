import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RideSearchPage } from './viagens/passageiro/pages/RideSearchPage/RideSearchPage'
import { TripDetailPage as PassengerTripDetailPage } from './viagens/passageiro/pages/TripDetailPage/TripDetailPage'
import { MyTripsPage } from './viagens/passageiro/pages/MyTripsPage/MyTripsPage'
import { NewTripPage } from './viagens/motorista/pages/NewTripPage/NewTripPage'
import { TripRequestsPage } from './viagens/motorista/pages/TripRequestsPage/TripRequestsPage'
import { TripsListPage } from './viagens/motorista/pages/TripsListPage/TripsListPage'
import { TripDetailPage as DriverTripDetailPage } from './viagens/motorista/pages/TripDetailPage/TripDetailPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/viagens" replace />} />
        <Route path="viagens" element={<TripsListPage />} />
        <Route path="viagens/nova" element={<NewTripPage />} />
        <Route path="viagens/:tripId" element={<DriverTripDetailPage />} />
        <Route path="viagens/:tripId/solicitacoes" element={<TripRequestsPage />} />
        <Route path="caronas" element={<RideSearchPage />} />
        <Route path="caronas/:tripId" element={<PassengerTripDetailPage />} />
        <Route path="minhas-viagens" element={<MyTripsPage />} />
        <Route path="*" element={<Navigate to="/viagens" replace />} />
      </Route>
    </Routes>
  )
}

export default App
