import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BackendStatusProvider } from './context/BackendStatusContext'
import { AuthProvider } from './context/AuthContext.jsx'
import AppShell from './layouts/AppShell'
import ProtectedRoute from './components/ui/ProtectedRoute.jsx'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Support from './pages/Support'
import Team from './pages/Team'
import AuditLogs from './pages/AuditLogs'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BackendStatusProvider>
          <Routes>
            {/* Public: Landing page */}
            <Route path="/" element={<Landing />} />

            {/* Public: Login page — no shell */}
            <Route path="/login" element={<Login />} />

            {/* Protected Workspace Pages under AppShell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="overview" element={<Overview />} />
              <Route path="dashboard" element={<Navigate to="/overview" replace />} />
              <Route path="app" element={<Navigate to="/overview" replace />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderNumber" element={<OrderDetail />} />
              <Route path="support" element={<Support />} />
              <Route path="profile" element={<Profile />} />
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
