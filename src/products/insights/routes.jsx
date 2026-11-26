import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell, NotFoundState, Page } from '@/shared/layout';
import { nav } from './nav';

const AskPage = lazy(() => import('./pages/AskPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const PinnedPage = lazy(() => import('./pages/PinnedPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ConnectPage = lazy(() => import('./pages/ConnectPage'));

export default function InsightsApp() {
  return (
    <Routes>
      <Route element={<AppShell productId="insights" nav={nav} />}>
        <Route index element={<AskPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="pinned" element={<PinnedPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="connect" element={<ConnectPage />} />
        <Route path="*" element={<Page><NotFoundState productId="insights" homeLabel="Ask a question" /></Page>} />
      </Route>
    </Routes>
  );
}
