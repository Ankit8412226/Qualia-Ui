import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@/design-system';
import { AppShell, NoAccess } from '@/shared/layout';
import { useSession } from '@/app/providers/SessionProvider';
import { nav } from './nav';
import { ProcessPicker, ProcessProvider } from './components/ProcessContext';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const CallsPage = lazy(() => import('./pages/CallsPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));
const CoachingHistoryPage = lazy(() => import('./pages/CoachingHistoryPage'));
const MetricsPage = lazy(() => import('./pages/MetricsPage'));
const QualityDeltaPage = lazy(() => import('./pages/QualityDeltaPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const GhostLeadsPage = lazy(() => import('./pages/GhostLeadsPage'));
const ProcessesPage = lazy(() => import('./pages/ProcessesPage'));
const ProcessEditorPage = lazy(() => import('./pages/ProcessEditorPage'));
const ParametersPage = lazy(() => import('./pages/ParametersPage'));
const ParameterSetEditorPage = lazy(() => import('./pages/ParameterSetEditorPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AgentDetailPage = lazy(() => import('./pages/AgentDetailPage'));
const SyncPage = lazy(() => import('./pages/SyncPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Loading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Spinner size={24} />
    </div>
  );
}

/** Lazy page inside the shell, so the sidebar stays put while a page loads. */
const page = (Component) => (
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
);

/** Agents only see their own screens (nav.js hides the rest; the app shell also guards direct links). */
function AdminOnly({ children }) {
  const { role } = useSession();
  return role === 'agent' ? <NoAccess productId="businesspulse" backTo="/businesspulse" backLabel="Go to your overview" /> : children;
}
const admin = (Component) => <AdminOnly>{page(Component)}</AdminOnly>;

export default function BusinessPulseApp() {
  return (
    <ProcessProvider>
      <Routes>
        <Route element={<AppShell productId="businesspulse" nav={nav} sidebarFooter={<ProcessPicker />} />}>
          <Route index element={page(OverviewPage)} />
          <Route path="upload" element={admin(UploadPage)} />
          <Route path="calls" element={page(CallsPage)} />
          <Route path="coach" element={page(CoachPage)} />
          <Route path="coaching" element={page(CoachingHistoryPage)} />
          <Route path="metrics" element={admin(MetricsPage)} />
          <Route path="quality-delta" element={admin(QualityDeltaPage)} />
          <Route path="compare" element={admin(ComparePage)} />
          <Route path="ghost-leads" element={admin(GhostLeadsPage)} />
          <Route path="processes" element={admin(ProcessesPage)} />
          <Route path="processes/new" element={admin(ProcessEditorPage)} />
          <Route path="processes/:id" element={admin(ProcessEditorPage)} />
          <Route path="parameters" element={admin(ParametersPage)} />
          <Route path="parameters/new" element={admin(ParameterSetEditorPage)} />
          <Route path="parameters/:id" element={admin(ParameterSetEditorPage)} />
          <Route path="agents" element={admin(AgentsPage)} />
          <Route path="agents/:id" element={admin(AgentDetailPage)} />
          <Route path="sync" element={admin(SyncPage)} />
          <Route path="*" element={page(NotFoundPage)} />
        </Route>
      </Routes>
    </ProcessProvider>
  );
}
