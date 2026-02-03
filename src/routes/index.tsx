import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute, RoleGuard } from './ProtectedRoute'

// Pages d'authentification
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'

// Pages du dashboard
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

// Pages des banques
import { BanksPage } from '@/features/banks/pages/BanksPage'

// Pages des utilisateurs
import { UsersListPage } from '@/features/users/pages/UsersListPage'

// Pages des dossiers
import { CasesListPage } from '@/features/cases/pages/CasesListPage'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'

// Pages des débiteurs
import { DebtorsBankSelectionPage } from '@/features/debtors/pages/DebtorsBankSelectionPage'
import { DebtorsListPage } from '@/features/debtors/pages/DebtorsListPage'

// Pages profil
import { BankProfilePage } from '@/features/banks/pages/BankProfilePage'

// Pages des rapports
import { ReportsPage } from '@/features/reports/pages/ReportsPage'

// Pages d'import Excel
import { ImportsPage } from '@/features/imports/pages/ImportsPage'
import { ImportPreviewPage } from '@/features/imports/pages/ImportPreviewPage'

export const router = createBrowserRouter([
  // Routes publiques (authentification)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },

  // Routes protégées
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'banks',
        element: <RoleGuard allowedRoles={['admin']}><BanksPage /></RoleGuard>,
      },
      {
        path: 'users',
        element: <RoleGuard allowedRoles={['admin']}><UsersListPage /></RoleGuard>,
      },
      {
        path: 'cases',
        element: <CasesListPage />,
      },
      {
        path: 'cases/:id',
        element: <CaseDetailPage />,
      },
      {
        path: 'my-cases',
        element: <CasesListPage />, // Même composant, filtré par agent
      },
      {
        path: 'debtors',
        element: <RoleGuard allowedRoles={['admin', 'bank_user']}><DebtorsBankSelectionPage /></RoleGuard>,
      },
      {
        path: 'debtors/:bankId',
        element: <RoleGuard allowedRoles={['admin', 'bank_user']}><DebtorsListPage /></RoleGuard>,
      },
      {
        path: 'profile',
        element: <RoleGuard allowedRoles={['bank_user']}><BankProfilePage /></RoleGuard>,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'imports',
        element: <RoleGuard allowedRoles={['admin']}><ImportsPage /></RoleGuard>,
      },
      {
        path: 'imports/:id',
        element: <RoleGuard allowedRoles={['admin']}><ImportPreviewPage /></RoleGuard>,
      },
    ],
  },

  // Redirection par défaut
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
