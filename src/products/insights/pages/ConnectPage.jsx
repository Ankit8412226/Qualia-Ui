import { useState } from 'react';
import { CheckCircle, Key, PlugsConnected, ShieldCheck, Trash } from '@phosphor-icons/react';
import { fmtDate, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Avatar, Button, Callout, Card, CardHeader, CopyField, DataTable, Segmented, Stepper, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { insightsService } from '@/services/insights';

const STEPS = {
  chatgpt: [
    { id: 1, label: 'Open ChatGPT settings', description: 'Settings → Connectors → Add custom connector.' },
    { id: 2, label: 'Paste the server URL', description: 'Use the URL below. Authentication: OAuth.' },
    { id: 3, label: 'Sign in with Qualia', description: 'Approve access with your Qualia login.' },
  ],
  claude: [
    { id: 1, label: 'Open Claude settings', description: 'Settings → Connectors → Add custom connector.' },
    { id: 2, label: 'Paste the server URL', description: 'Name it “Qualia”.' },
    { id: 3, label: 'Sign in with Qualia', description: 'Approve access with your Qualia login.' },
  ],
};

/** Connect ChatGPT or Claude to the same Insights service (one MCP connector). */
export default function ConnectPage() {
  const [client, setClient] = useState('chatgpt');
  const { data = [], loading, setData } = useQuery(() => insightsService.listConnections(), []);
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <Page>
      <PageHeader title="ChatGPT & Claude" description="Ask about your calls and chats from the assistant your team already uses. Same answers, same permissions." icon={PlugsConnected} />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Connect an assistant" subtitle="Takes about a minute" actions={<Segmented size="sm" value={client} onChange={setClient} options={[{ value: 'chatgpt', label: 'ChatGPT' }, { value: 'claude', label: 'Claude' }]} />} />
          <Stepper steps={STEPS[client]} current={1} orientation="vertical" />
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-2">Server URL</span>
            <CopyField value="https://mcp.qualiabits.com/insights/rrparko" />
          </div>
          <Button variant="primary" className="mt-5" onClick={() => toast({ title: 'Waiting for sign-in', description: 'Finish the steps in ' + (client === 'chatgpt' ? 'ChatGPT' : 'Claude') + '.', tone: 'info' })}>
            I’ve added it
          </Button>
        </Card>
        <div className="flex flex-col gap-4">
          <Callout tone="success" title="What the assistant can see" icon={ShieldCheck}>
            Only the products on your account and only what your role allows. Agents can’t connect.
          </Callout>
          <Card>
            <CardHeader title="What it can do" icon={CheckCircle} />
            <ul className="flex flex-col gap-2 text-[13px] text-ink-2">
              {['Answer questions with real numbers', 'Quote calls word-for-word', 'Build Excel reports', 'Take actions only after you confirm'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle size={15} weight="fill" className="text-success" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-base font-bold">Connected assistants</h2>
      <Card padded={false}>
        <DataTable
          loading={loading}
          rows={data}
          columns={[
            { key: 'client', header: 'Assistant', render: (r) => <span className="font-semibold text-ink">{r.client}</span> },
            { key: 'user', header: 'Connected by', render: (r) => <span className="flex items-center gap-2"><Avatar name={r.user} size="xs" />{r.user}</span> },
            { key: 'connectedAt', header: 'Since', hideBelow: 'md', render: (r) => fmtDate(r.connectedAt) },
            { key: 'lastUsed', header: 'Last used', render: (r) => fmtRelative(r.lastUsed) },
            { key: 'calls', header: 'Questions', align: 'right' },
            {
              key: 'x',
              header: '',
              align: 'right',
              render: (r) => (
                <Button
                  size="sm"
                  variant="danger-soft"
                  icon={Trash}
                  onClick={async () => {
                    if (await confirm({ title: `Disconnect ${r.client}?`, message: `${r.user} will need to connect again.`, tone: 'danger', confirmLabel: 'Disconnect' })) setData((all) => all.filter((x) => x.id !== r.id));
                  }}
                >
                  Disconnect
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <Key size={12} /> Tokens rotate every 30 days. Disconnecting revokes access at once.
      </p>
    </Page>
  );
}
