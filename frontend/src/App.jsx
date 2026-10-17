import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BackendStatusProvider } from './context/BackendStatusContext'
import { AuthProvider } from './context/AuthContext.jsx'
import AppShell from './layouts/AppShell'
import ProtectedRoute from './components/ui/ProtectedRoute.jsx'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Support from './pages/Support'
import Team from './pages/Team'
import AuditLogs from './pages/AuditLogs'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BackendStatusProvider>
          <Routes>
            {/* Public: login page — no shell, no auth required */}
            <Route path="/login" element={<Login />} />

            {/* AppShell: public pages (Overview, Orders, OrderDetail, Support) + protected admin pages */}
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderNumber" element={<OrderDetail />} />
              <Route path="support" element={<Support />} />
              {/* Team page: authenticated, admin-only */}
              <Route
                path="team"
                element={
                  <ProtectedRoute role="admin">
                    <Team />
                  </ProtectedRoute>
                }
              />
              {/* Audit logs: authenticated, admin-only */}
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute role="admin">
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BackendStatusProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
