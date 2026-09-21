import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute, RoleRoute, GuestRoute } from './components/layout/Guards'
import { AppShell } from './layouts/Layouts'
import HomePage from './pages/public/HomePage'
import NotFoundPage from './pages/public/NotFoundPage'
import BrowseProjectsPage from './pages/public/BrowseProjectsPage'
import BrowseFreelancersPage from './pages/public/BrowseFreelancersPage'
import ProjectDetailsPage from './pages/public/ProjectDetailsPage'
import FreelancerProfilePage from './pages/public/FreelancerProfilePage'
import ClientProfilePage from './pages/public/ClientProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import VerifyEmailPage, { ForgotPasswordPage, ResetPasswordPage } from './pages/auth/VerifyEmailPage'
import DashboardPage from './pages/shared/DashboardPage'
import ProfilePage from './pages/shared/ProfilePage'
import SettingsPage from './pages/shared/SettingsPage'
import SavedPage from './pages/shared/SavedPage'
import MessagesPage from './pages/shared/MessagesPage'
import WorkPage from './pages/shared/WorkPage'
import NotificationsPage from './pages/shared/NotificationsPage'
import InvoicePage from './pages/shared/InvoicePage'
import PostProjectPage from './pages/client/PostProjectPage'
import MyProjectsPage from './pages/client/MyProjectsPage'
import ProjectProposalsPage from './pages/client/ProjectProposalsPage'
import MyProposalsPage from './pages/freelancer/MyProposalsPage'
import EarningsPage from './pages/freelancer/EarningsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminProjectsPage from './pages/admin/AdminProjectsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AdminContractsPage, { AdminAuditPage } from './pages/admin/AdminContractsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

function SignedInLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/projects" element={<BrowseProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailsPage />} />
              <Route path="/freelancers" element={<BrowseFreelancersPage />} />
              <Route path="/freelancers/:id" element={<FreelancerProfilePage />} />
              <Route path="/clients/:id" element={<ClientProfilePage />} />
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<SignedInLayout />}>
                <Route path="/app/dashboard" element={<DashboardPage />} />
                <Route path="/app/profile" element={<ProfilePage />} />
                <Route path="/app/settings" element={<SettingsPage />} />
                <Route path="/app/saved" element={<SavedPage />} />
                <Route path="/app/messages" element={<MessagesPage />} />
                <Route path="/app/messages/:conversationId" element={<MessagesPage />} />
                <Route path="/app/notifications" element={<NotificationsPage />} />
                <Route path="/app/work/:id/invoice" element={<InvoicePage />} />
                <Route path="/app/work" element={<WorkPage />} />
                <Route path="/app/projects/new" element={<RoleRoute roles={['client']}><PostProjectPage /></RoleRoute>} />
                <Route path="/app/projects/:id/edit" element={<RoleRoute roles={['client']}><PostProjectPage /></RoleRoute>} />
                <Route path="/app/projects" element={<RoleRoute roles={['client']}><MyProjectsPage /></RoleRoute>} />
                <Route path="/app/projects/:id/proposals" element={<RoleRoute roles={['client']}><ProjectProposalsPage /></RoleRoute>} />
                <Route path="/app/proposals" element={<RoleRoute roles={['freelancer']}><MyProposalsPage /></RoleRoute>} />
                <Route path="/app/earnings" element={<RoleRoute roles={['freelancer']}><EarningsPage /></RoleRoute>} />
                <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminDashboardPage /></RoleRoute>} />
                <Route path="/admin/users" element={<RoleRoute roles={['admin']}><AdminUsersPage /></RoleRoute>} />
                <Route path="/admin/projects" element={<RoleRoute roles={['admin']}><AdminProjectsPage /></RoleRoute>} />
                <Route path="/admin/reports" element={<RoleRoute roles={['admin']}><AdminReportsPage /></RoleRoute>} />
                <Route path="/admin/contracts" element={<RoleRoute roles={['admin']}><AdminContractsPage /></RoleRoute>} />
                <Route path="/admin/audit" element={<RoleRoute roles={['admin']}><AdminAuditPage /></RoleRoute>} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
