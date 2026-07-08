import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { RideSearchPage } from './carona/pages/RideSearchPage/RideSearchPage'
import { NewTripPage } from './travel/pages/NewTripPage/NewTripPage'
import { TripRequestsPage } from './travel/pages/TripRequestsPage/TripRequestsPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Fase 1: a lista de viagens chega na Fase 2; por ora a aba Viagens leva ao cadastro. */}
        <Route index element={<Navigate to="/viagens/nova" replace />} />
        <Route path="viagens" element={<Navigate to="/viagens/nova" replace />} />
        <Route path="viagens/nova" element={<NewTripPage />} />
        <Route path="viagens/:tripId/solicitacoes" element={<TripRequestsPage />} />
        <Route path="caronas" element={<RideSearchPage />} />
        <Route path="*" element={<Navigate to="/viagens/nova" replace />} />
      </Route>
    </Routes>
  )
}

export default App
