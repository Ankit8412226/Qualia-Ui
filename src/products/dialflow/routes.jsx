import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shared/layout';
import { useSession } from '@/app/providers/SessionProvider';
import { Spinner } from '@/design-system';
import { nav } from './nav';

const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));
const MyCallsPage = lazy(() => import('./pages/MyCallsPage'));
const CallbacksPage = lazy(() => import('./pages/CallbacksPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const RealtimePage = lazy(() => import('./pages/RealtimePage'));
const LiveCallsPage = lazy(() => import('./pages/LiveCallsPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignWizard = lazy(() => import('./pages/CampaignWizard'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const ListsPage = lazy(() => import('./pages/ListsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const AprPage = lazy(() => import('./pages/AprPage'));
const StatusHistoryPage = lazy(() => import('./pages/StatusHistoryPage'));
const CallHistoryPage = lazy(() => import('./pages/CallHistoryPage'));
const NumberHealthPage = lazy(() => import('./pages/NumberHealthPage'));
const DispositionsPage = lazy(() => import('./pages/SettingsPages').then((m) => ({ default: m.DispositionsPage })));
const StatusesPage = lazy(() => import('./pages/SettingsPages').then((m) => ({ default: m.StatusesPage })));
const DncPage = lazy(() => import('./pages/SettingsPages').then((m) => ({ default: m.DncPage })));
const InboundPage = lazy(() => import('./pages/InboundPage'));
const NotFound = lazy(() => import('./pages/NotFoundPage'));

/** Index: admins land on the Overview, agents on their Workspace. */
function Home() {
  const { role } = useSession();
  return role === 'agent' ? <Navigate to="workspace" replace /> : <OverviewPage />;
}

const s = (el) => (
  <Suspense
    fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={22} />
      </div>
    }
  >
    {el}
  </Suspense>
);

export default function DialFlowApp() {
  return (
    <Routes>
      <Route element={<AppShell productId="dialflow" nav={nav} />}>
        <Route path="workspace" element={s(<WorkspacePage />)} />
        <Route path="my-calls" element={s(<MyCallsPage />)} />
        <Route path="callbacks" element={s(<CallbacksPage />)} />
        <Route index element={s(<Home />)} />
        <Route path="realtime" element={s(<RealtimePage />)} />
        <Route path="live-calls" element={s(<LiveCallsPage />)} />
        <Route path="campaigns" element={s(<CampaignsPage />)} />
        <Route path="campaigns/new" element={s(<CampaignWizard />)} />
        <Route path="campaigns/:id" element={s(<CampaignDetailPage />)} />
        <Route path="lists" element={s(<ListsPage />)} />
        <Route path="agents" element={s(<AgentsPage />)} />
        <Route path="groups" element={s(<GroupsPage />)} />
        <Route path="reports/apr" element={s(<AprPage />)} />
        <Route path="reports/status" element={s(<StatusHistoryPage />)} />
        <Route path="calls" element={s(<CallHistoryPage />)} />
        <Route path="number-health" element={s(<NumberHealthPage />)} />
        <Route path="dispositions" element={s(<DispositionsPage />)} />
        <Route path="statuses" element={s(<StatusesPage />)} />
        <Route path="inbound" element={s(<InboundPage />)} />
        <Route path="dnc" element={s(<DncPage />)} />
        <Route path="*" element={s(<NotFound />)} />
      </Route>
    </Routes>
  );
}
