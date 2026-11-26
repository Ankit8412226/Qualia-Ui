import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell, Page } from '@/shared/layout';
import { SkeletonRows } from '@/design-system';
import { useSession } from '@/app/providers/SessionProvider';
import { nav } from './nav';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignWizardPage = lazy(() => import('./pages/CampaignWizardPage'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const TemplateCreatorPage = lazy(() => import('./pages/TemplateCreatorPage'));
const OptInsPage = lazy(() => import('./pages/OptInsPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const FlowsPage = lazy(() => import('./pages/FlowsPage'));
const FlowEditorPage = lazy(() => import('./pages/FlowEditorPage'));
const AiBotPage = lazy(() => import('./pages/AiBotPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Agents only work in the inbox and templates; send them straight to the inbox. */
function Home() {
  const { role } = useSession();
  return role === 'agent' ? <Navigate to="inbox" replace /> : <OverviewPage />;
}

const Loading = () => (
  <Page>
    <SkeletonRows rows={6} />
  </Page>
);

const s = (el) => <Suspense fallback={<Loading />}>{el}</Suspense>;

export default function UltraChatApp() {
  return (
    <Routes>
      <Route element={<AppShell productId="ultrachat" nav={nav} />}>
        <Route index element={s(<Home />)} />
        <Route path="inbox" element={s(<InboxPage />)} />
        <Route path="inbox/:id" element={s(<InboxPage />)} />
        <Route path="campaigns" element={s(<CampaignsPage />)} />
        <Route path="campaigns/new" element={s(<CampaignWizardPage />)} />
        <Route path="campaigns/:id" element={s(<CampaignDetailPage />)} />
        <Route path="templates" element={s(<TemplatesPage />)} />
        <Route path="templates/new" element={s(<TemplateCreatorPage />)} />
        <Route path="templates/:id/edit" element={s(<TemplateCreatorPage />)} />
        <Route path="opt-ins" element={s(<OptInsPage />)} />
        <Route path="groups" element={s(<GroupsPage />)} />
        <Route path="flows" element={s(<FlowsPage />)} />
        <Route path="flows/:id" element={s(<FlowEditorPage />)} />
        <Route path="ai-bot" element={s(<AiBotPage />)} />
        <Route path="media" element={s(<MediaPage />)} />
        <Route path="reports" element={s(<ReportsPage />)} />
        <Route path="wallet" element={s(<WalletPage />)} />
        <Route path="settings" element={s(<SettingsPage />)} />
        <Route path="*" element={s(<NotFoundPage />)} />
      </Route>
    </Routes>
  );
}
