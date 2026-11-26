import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell, NotFoundState, Page } from '@/shared/layout';
import { nav } from './nav';

/* AppShell wraps the outlet in Suspense, so lazy pages need nothing extra here. */
const DashboardPage = lazy(() => import('./console/pages/DashboardPage'));
const TenantsPage = lazy(() => import('./console/pages/TenantsPage'));
const TenantDetailPage = lazy(() => import('./console/pages/TenantDetailPage'));
const TenantWizardPage = lazy(() => import('./console/pages/TenantWizardPage'));
const AgentFlowAdminPage = lazy(() => import('./console/pages/AgentFlowAdminPage'));
const DialFlowAdminPage = lazy(() => import('./console/pages/DialFlowAdminPage'));
const BusinessPulseAdminPage = lazy(() => import('./console/pages/BusinessPulseAdminPage'));
const UltraChatAdminPage = lazy(() => import('./console/pages/UltraChatAdminPage'));
const CreditsPage = lazy(() => import('./console/pages/CreditsPage'));
const UsagePage = lazy(() => import('./console/pages/UsagePage'));
const DncPage = lazy(() => import('./console/pages/DncPage'));
const VoiceLabPage = lazy(() => import('./console/pages/VoiceLabPage'));
const SpamCheckPage = lazy(() => import('./console/pages/SpamCheckPage'));
const NumberHealthPage = lazy(() => import('./console/pages/NumberHealthPage'));

function ConsoleNotFound() {
  return (
    <Page>
      <NotFoundState productId="commons" homeTo="/admin" homeLabel="Back to dashboard" description="The link may be old. Pick a page from the sidebar." />
    </Page>
  );
}

export default function AdminConsoleApp() {
  return (
    <Routes>
      <Route element={<AppShell productId="commons" nav={nav} />}>
        <Route index element={<DashboardPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="tenants/new" element={<TenantWizardPage />} />
        <Route path="tenants/:id" element={<TenantDetailPage />} />
        <Route path="agentflow" element={<AgentFlowAdminPage />} />
        <Route path="dialflow" element={<DialFlowAdminPage />} />
        <Route path="businesspulse" element={<BusinessPulseAdminPage />} />
        <Route path="ultrachat" element={<UltraChatAdminPage />} />
        <Route path="credits" element={<CreditsPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="dnc" element={<DncPage />} />
        <Route path="voice-lab" element={<VoiceLabPage />} />
        <Route path="spam-check" element={<SpamCheckPage />} />
        <Route path="number-health" element={<NumberHealthPage />} />
        <Route path="*" element={<ConsoleNotFound />} />
      </Route>
    </Routes>
  );
}
