import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Module Page Terminals
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory'; 
import LowStock from './pages/LowStock';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import CartCheckout from './pages/CartCheckout'; // <--- Newly wired dedicated checkout page
import SalesLedger from './pages/SalesLedger';
import CRM from './pages/CRM';
import UserManagement from './pages/UserManagement';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';

// ============================================================================
// 1. SESSION MANAGEMENT & STORAGE AUDIT
// ============================================================================

const getActiveSession = () => {
  try {
    const raw = localStorage.getItem('erp_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.id ? parsed : null;
  } catch (error) {
    console.error('[Session Retrieval Error]: Corrupted session payload detected. Purging storage.', error);
    localStorage.removeItem('erp_user');
    return null;
  }
};

// ============================================================================
// 2. ENTERPRISE ROUTE GUARDS (RBAC ENGINE)
// ============================================================================

const ProtectedRoute = ({ children }) => {
  const session = getActiveSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const session = getActiveSession();
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PermissionGuard = ({ module, adminOnly = false, children }) => {
  const session = getActiveSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.role === 'admin') {
    return children;
  }

  if (adminOnly) {
    return <Navigate to="/access-denied" replace />;
  }

  const grantedPermissions = Array.isArray(session.permissions) ? session.permissions : [];
  if (grantedPermissions.includes(module)) {
    return children;
  }

  return <Navigate to="/access-denied" replace />;
};

// ============================================================================
// 3. DYNAMIC ROOT DISPATCHER
// ============================================================================

const DynamicRootDispatcher = () => {
  const session = getActiveSession();
  if (!session) return <Navigate to="/login" replace />;

  if (session.role === 'admin' || (session.permissions && session.permissions.includes('dashboard'))) {
    return <Dashboard />;
  }

  const perms = Array.isArray(session.permissions) ? session.permissions : [];
  if (perms.includes('sales')) return <Navigate to="/sales" replace />;
  if (perms.includes('ledger')) return <Navigate to="/ledger" replace />;
  if (perms.includes('inventory')) return <Navigate to="/inventory" replace />;
  if (perms.includes('purchases')) return <Navigate to="/purchases" replace />;
  if (perms.includes('crm')) return <Navigate to="/crm" replace />;

  return <Navigate to="/profile" replace />;
};

// ============================================================================
// 4. MAIN ROUTER CONFIGURATION
// ============================================================================

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Terminal */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />

        {/* Protected Enterprise ERP Gateway Shell */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dynamic Landing: Evaluates Permissions Hierarchy */}
          <Route index element={<DynamicRootDispatcher />} />

          {/* Operational Module Terminals */}
          <Route 
            path="inventory" 
            element={
              <PermissionGuard module="inventory">
                <Inventory />
              </PermissionGuard>
            } 
          />
          <Route 
            path="low-stock" 
            element={
              <PermissionGuard module="inventory">
                <LowStock />
              </PermissionGuard>
            } 
          />
          <Route 
            path="purchases" 
            element={
              <PermissionGuard module="purchases">
                <Purchases />
              </PermissionGuard>
            } 
          />
          <Route 
            path="sales" 
            element={
              <PermissionGuard module="sales">
                <Sales />
              </PermissionGuard>
            } 
          /> 
          {/* Dedicated POS Cart & Checkout Page */}
          <Route 
            path="cart" 
            element={
              <PermissionGuard module="sales">
                <CartCheckout />
              </PermissionGuard>
            } 
          />
          <Route 
            path="ledger" 
            element={
              <PermissionGuard module="ledger">
                <SalesLedger />
              </PermissionGuard>
            } 
          />
          <Route 
            path="crm" 
            element={
              <PermissionGuard module="crm">
                <CRM />
              </PermissionGuard>
            } 
          />

          {/* Administrative Master Consoles (Super Admin Only) */}
          <Route 
            path="users" 
            element={
              <PermissionGuard adminOnly>
                <UserManagement />
              </PermissionGuard>
            } 
          />
          <Route 
            path="attendance" 
            element={
              <PermissionGuard adminOnly>
                <Attendance />
              </PermissionGuard>
            } 
          />
          <Route 
            path="payroll" 
            element={
              <PermissionGuard adminOnly>
                <Payroll />
              </PermissionGuard>
            } 
          />

          {/* Security & Access Violation Fallback */}
          <Route path="access-denied" element={<AccessDenied />} />

          {/* Self-Service Operator Profile & Security Settings */}
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Global Fallback Catch-All Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}