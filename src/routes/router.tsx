import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/layout/Layout'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExpenseFormPage } from '@/pages/ExpenseFormPage'
import { GapsPage } from '@/pages/GapsPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'

import { RequireAuth } from './RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/change-password" element={<ChangePasswordPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/gaps" element={<GapsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}