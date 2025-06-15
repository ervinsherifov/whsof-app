import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoginForm } from "@/components/auth/LoginForm";
import { Layout } from "@/components/layout/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { TimeTracking } from "@/pages/TimeTracking";
import { TruckScheduling } from "@/pages/TruckScheduling";
import { TaskManagement } from "@/pages/TaskManagement";
import { Reports } from "@/pages/Reports";
import { TVDashboard } from "@/pages/TVDashboard";
import KPIDashboard from "@/pages/KPIDashboard";
import { UserManagement } from "@/pages/UserManagement";
import { OvertimeApproval } from "@/pages/OvertimeApproval";

import { MobileWarehouseApp } from "@/pages/MobileWarehouseApp";
import { Unauthorized } from "@/pages/Unauthorized";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes with layout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/time-tracking" element={
              <ProtectedRoute>
                <Layout>
                  <TimeTracking />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/trucks" element={
              <ProtectedRoute allowedRoles={['WAREHOUSE_STAFF', 'OFFICE_ADMIN', 'SUPER_ADMIN']}>
                <Layout>
                  <TruckScheduling />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/tasks" element={
              <ProtectedRoute allowedRoles={['OFFICE_ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_STAFF']}>
                <Layout>
                  <TaskManagement />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['OFFICE_ADMIN', 'SUPER_ADMIN']}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/kpi-dashboard" element={
              <ProtectedRoute allowedRoles={['OFFICE_ADMIN', 'SUPER_ADMIN']}>
                <Layout>
                  <KPIDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/tv-dashboard" element={
              <ProtectedRoute>
                <TVDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/overtime-approval" element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <Layout>
                  <OvertimeApproval />
                </Layout>
              </ProtectedRoute>
            } />
            
            
            <Route path="/mobile-app" element={
              <ProtectedRoute allowedRoles={['WAREHOUSE_STAFF']}>
                <MobileWarehouseApp />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
