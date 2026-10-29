import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Athletes from './pages/Athletes'
import AthleteDetail from './pages/AthleteDetail'
import ProgramBuilder from './pages/ProgramBuilder'
import Library from './pages/Library'
import PublicProgram from './pages/PublicProgram'
import InstallGuide from './pages/InstallGuide'
import InstallPrompt from './components/InstallPrompt'
import ChangePassword from './pages/ChangePassword'
import PendingCoaches from './pages/PendingCoaches'
import SystemAdminPanel from './pages/SystemAdminPanel'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" />
  if (user?.must_change_password) return <Navigate to="/change-password" />
  return <>{children}</>
}

function AppRoutes() {
  const { token } = useAuth()
  
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/install" element={<InstallGuide />} />
        <Route path="/public/program/:token" element={<PublicProgram />} />
        <Route path="/change-password" element={token ? <ChangePassword /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/athletes" element={<PrivateRoute><Layout><Athletes /></Layout></PrivateRoute>} />
        <Route path="/athletes/:id" element={<PrivateRoute><Layout><AthleteDetail /></Layout></PrivateRoute>} />
        <Route path="/programs/builder/:athleteId" element={<PrivateRoute><Layout><ProgramBuilder /></Layout></PrivateRoute>} />
        <Route path="/library" element={<PrivateRoute><Layout><Library /></Layout></PrivateRoute>} />
        <Route path="/pending-coaches" element={<PrivateRoute><Layout><PendingCoaches /></Layout></PrivateRoute>} />
        <Route path="/system-admin" element={<PrivateRoute><Layout><SystemAdminPanel /></Layout></PrivateRoute>} />
      </Routes>
      <InstallPrompt />
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
