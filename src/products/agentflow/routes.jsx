import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/shared/layout';
import { nav } from './nav';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignWizardPage = lazy(() => import('./pages/CampaignWizardPage'));
const CampaignWorkspacePage = lazy(() => import('./pages/CampaignWorkspacePage'));
const TestCallPage = lazy(() => import('./pages/TestCallPage'));
const InboundPage = lazy(() => import('./pages/InboundPage'));
const CallHistoryPage = lazy(() => import('./pages/CallHistoryPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const DispositionsPage = lazy(() => import('./pages/DispositionsPage'));
const VoicesPage = lazy(() => import('./pages/VoicesPage'));
const DncPage = lazy(() => import('./pages/DncPage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function AgentFlowApp() {
  return (
    <Routes>
      <Route element={<AppShell productId="agentflow" nav={nav} />}>
        <Route index element={<OverviewPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/new" element={<CampaignWizardPage />} />
        <Route path="campaigns/:id/edit" element={<CampaignWizardPage />} />
        <Route path="campaigns/:id" element={<CampaignWorkspacePage />} />
        <Route path="test-call" element={<TestCallPage />} />
        <Route path="inbound" element={<InboundPage />} />
        <Route path="calls" element={<CallHistoryPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="dispositions" element={<DispositionsPage />} />
        <Route path="voices" element={<VoicesPage />} />
        <Route path="dnc" element={<DncPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="integrations/:id" element={<IntegrationsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
