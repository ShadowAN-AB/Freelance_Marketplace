import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, RoleRoute, GuestRoute } from './components/layout/Guards'
import { AppShell } from './layouts/Layouts'
import HomePage from './pages/public/HomePage'
import BrowseProjectsPage from './pages/public/BrowseProjectsPage'
import BrowseFreelancersPage from './pages/public/BrowseFreelancersPage'
import ProjectDetailsPage from './pages/public/ProjectDetailsPage'
import FreelancerProfilePage from './pages/public/FreelancerProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/shared/DashboardPage'
import ProfilePage from './pages/shared/ProfilePage'
import SettingsPage from './pages/shared/SettingsPage'
import MessagesPage from './pages/shared/MessagesPage'
import WorkPage from './pages/shared/WorkPage'
import PostProjectPage from './pages/client/PostProjectPage'
import MyProjectsPage from './pages/client/MyProjectsPage'
import ProjectProposalsPage from './pages/client/ProjectProposalsPage'
import MyProposalsPage from './pages/freelancer/MyProposalsPage'
import EarningsPage from './pages/freelancer/EarningsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminProjectsPage from './pages/admin/AdminProjectsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'

const queryClient = new QueryClient()

function AppLayout() {
  return (
    <ProtectedRoute>
      <AppRoutes />
    </ProtectedRoute>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return (
    <AppShell>
      <Routes>
        <Route path="/app/dashboard" element={<DashboardPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/messages" element={<MessagesPage />} />
        <Route path="/app/messages/:conversationId" element={<MessagesPage />} />
        <Route path="/app/work" element={<WorkPage />} />
        <Route
          path="/app/projects/new"
          element={
            <RoleRoute roles={['client']}>
              <PostProjectPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/projects"
          element={
            <RoleRoute roles={['client']}>
              <MyProjectsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/projects/:id/proposals"
          element={
            <RoleRoute roles={['client']}>
              <ProjectProposalsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/proposals"
          element={
            <RoleRoute roles={['freelancer']}>
              <MyProposalsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/earnings"
          element={
            <RoleRoute roles={['freelancer']}>
              <EarningsPage />
            </RoleRoute>
          }
        />
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

function AdminLayout() {
  return (
    <ProtectedRoute>
      <RoleRoute roles={['admin']}>
        <AppShell>
          <Routes>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/projects" element={<AdminProjectsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AppShell>
      </RoleRoute>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/projects" element={<BrowseProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/freelancers" element={<BrowseFreelancersPage />} />
            <Route path="/freelancers/:id" element={<FreelancerProfilePage />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/app/*" element={<AppLayout />} />
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
