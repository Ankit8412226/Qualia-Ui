import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ConfirmProvider, Spinner, ToastProvider } from '@/design-system';
import { ThemeProvider } from './providers/ThemeProvider';
import { SessionProvider } from './providers/SessionProvider';
import { RequireSession } from './RequireSession';

const LoginPage = lazy(() => import('@/products/commons/pages/LoginPage'));
const AdminLoginPage = lazy(() => import('@/products/commons/pages/AdminLoginPage'));
const HomePage = lazy(() => import('@/products/commons/pages/HomePage'));
const NotFound = lazy(() => import('@/products/commons/pages/NotFound'));
const AdminConsole = lazy(() => import('@/products/commons/routes'));
const AgentFlow = lazy(() => import('@/products/agentflow/routes'));
const DialFlow = lazy(() => import('@/products/dialflow/routes'));
const UltraChat = lazy(() => import('@/products/ultrachat/routes'));
const BusinessPulse = lazy(() => import('@/products/businesspulse/routes'));
const Insights = lazy(() => import('@/products/insights/routes'));

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={26} />
    </div>
  );
}

function Root() {
  return (
    <Suspense fallback={<Loading />}>
      <Outlet />
    </Suspense>
  );
}

/*
 * A data router (not <BrowserRouter>) so long forms can block in-app navigation with
 * useBlocker (see useUnsavedChanges). Products still declare their own <Routes> under "/<id>/*".
 */
const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Navigate to="/home" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/home', element: <RequireSession><HomePage /></RequireSession> },
      { path: '/admin/login', element: <AdminLoginPage /> },
      { path: '/admin/*', element: <RequireSession internal><AdminConsole /></RequireSession> },
      { path: '/agentflow/*', element: <RequireSession roles={['admin']} product="agentflow"><AgentFlow /></RequireSession> },
      { path: '/dialflow/*', element: <RequireSession product="dialflow"><DialFlow /></RequireSession> },
      { path: '/ultrachat/*', element: <RequireSession product="ultrachat"><UltraChat /></RequireSession> },
      { path: '/businesspulse/*', element: <RequireSession product="businesspulse"><BusinessPulse /></RequireSession> },
      { path: '/insights/*', element: <RequireSession roles={['admin']} product="insights"><Insights /></RequireSession> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
