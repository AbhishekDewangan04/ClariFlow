import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BackendStatusProvider } from './context/BackendStatusContext'
import AppShell from './layouts/AppShell'
import Overview from './pages/Overview'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Support from './pages/Support'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <BackendStatusProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderNumber" element={<OrderDetail />} />
            <Route path="support" element={<Support />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BackendStatusProvider>
    </BrowserRouter>
  )
}
