import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, DotsThreeVertical, Megaphone, Notepad, PencilSimple, Plus, Trash, Translate, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { fmtCompact, fmtPercent, fmtRelative } from '@/lib/format';
import { useQuery } from '@/lib/hooks';
import { Button, Card, EmptyState, FilterBar, FilterSelect, Menu, Skeleton, StatusBadge, Tabs, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { useSession } from '@/app/providers/SessionProvider';
import { listTemplates } from '@/services/ultrachat';
import { CategoryBadge } from '../components/wa';
import { TemplateMessage } from '../components/PhonePreview';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { role } = useSession();
  const isAdmin = role !== 'agent';
  const { data, loading, setData } = useQuery(() => listTemplates(), []);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState([]);
  const [language, setLanguage] = useState([]);

  const rows = data || [];
  const count = (s) => rows.filter((t) => t.status === s).length;
  const filtered = useMemo(
    () =>
      rows
        .filter((t) => tab === 'all' || t.status.toLowerCase() === tab)
        .filter((t) => !category.length || category.includes(t.category))
        .filter((t) => !language.length || language.includes(t.language))
        .filter((t) => !search || `${t.name} ${t.body}`.toLowerCase().includes(search.toLowerCase())),
    [rows, tab, category, language, search],
  );

  const remove = async (t) => {
    if (!(await confirm({ title: `Delete ${t.name}?`, message: 'It is removed from Meta too. Campaigns and flows using it will stop sending it. The name can’t be reused for 30 days.', tone: 'danger', confirmLabel: 'Delete template' }))) return;
    setData((all) => all.filter((x) => x.id !== t.id));
    toast(`${t.name} deleted`);
  };

  return (
    <Page>
      <PageHeader
        title="Templates"
        description="Pre-approved messages. You need one to start a conversation or to reply after the 24-hour window closes."
        actions={
          isAdmin && (
            <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/templates/new')}>
              New template
            </Button>
          )
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'all', label: 'All', count: rows.length },
            { id: 'approved', label: 'Approved', count: count('Approved') },
            { id: 'pending', label: 'Pending review', count: count('Pending') },
            { id: 'rejected', label: 'Rejected', count: count('Rejected') },
          ]}
        />
      </PageHeader>

      <FilterBar
        className="mb-5"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name or text"
        canReset={!!(search || category.length || language.length)}
        onReset={() => {
          setSearch('');
          setCategory([]);
          setLanguage([]);
        }}
      >
        <FilterSelect label="Category" options={['Marketing', 'Utility', 'Authentication']} value={category} onChange={setCategory} />
        <FilterSelect label="Language" icon={Translate} options={['English', 'Hindi']} value={language} onChange={setLanguage} />
      </FilterBar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Notepad}
            title="No templates match"
            description={tab === 'rejected' ? 'Nothing rejected. Nice.' : 'Clear the filters, or create a template and submit it to Meta. Approval usually takes a few minutes.'}
            action={
              isAdmin && (
                <Button variant="brand" icon={Plus} onClick={() => navigate('/ultrachat/templates/new')}>
                  New template
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              isAdmin={isAdmin}
              onEdit={() => navigate(`/ultrachat/templates/${t.id}/edit`)}
              onUse={() => navigate('/ultrachat/campaigns/new', { state: { templateId: t.id } })}
              onDuplicate={() => {
                setData((all) => [{ ...t, id: `${t.id}_copy`, name: `${t.name}_copy`, status: 'Pending', updatedAt: new Date(), sent: 0 }, ...all]);
                toast({ title: 'Duplicated', description: 'The copy was submitted for review.' });
              }}
              onDelete={() => remove(t)}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

function TemplateCard({ t, isAdmin, onEdit, onUse, onDuplicate, onDelete }) {
  return (
    <Card padded={false} className="group flex flex-col overflow-hidden transition hover:border-line-strong hover:shadow-pop">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px] font-semibold text-ink" title={t.name}>
            {t.name}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={t.status} />
            <CategoryBadge category={t.category} />
            <span className="text-2xs text-ink-muted">{t.language}</span>
          </div>
        </div>
        <Menu
          trigger={({ toggle }) => (
            <button onClick={toggle} aria-label="Template actions" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
              <DotsThreeVertical size={18} weight="bold" />
            </button>
          )}
          items={[
            t.status === 'Approved' && isAdmin && { label: 'Use in campaign', icon: Megaphone, onClick: onUse },
            isAdmin && { label: t.status === 'Rejected' ? 'Fix and resubmit' : 'Edit', icon: PencilSimple, onClick: onEdit },
            isAdmin && { label: 'Duplicate', icon: Copy, onClick: onDuplicate },
            isAdmin && { divider: true },
            isAdmin && { label: 'Delete', icon: Trash, tone: 'danger', onClick: onDelete },
            !isAdmin && { label: 'Copy name', icon: Copy, onClick: () => navigator.clipboard?.writeText(t.name) },
          ]}
        />
      </div>

      {/* preview: clipped at rest, expands on hover/focus */}
      <div className="relative mx-4 overflow-hidden rounded-xl bg-surface-2 p-3" style={{ backgroundImage: 'radial-gradient(rgb(var(--line)) 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
        <div className="max-h-[150px] overflow-hidden transition-[max-height] duration-300 group-hover:max-h-[480px]">
          <TemplateMessage template={t} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-2 to-transparent transition-opacity group-hover:opacity-0" />
      </div>

      {t.status === 'Rejected' && (
        <div className="mx-4 mt-3 flex gap-2 rounded-xl border border-danger/25 bg-danger/5 p-3 text-xs text-ink-2">
          <WarningCircle size={16} weight="fill" className="mt-px shrink-0 text-danger" />
          <span>
            <b className="text-ink">Why Meta rejected it: </b>
            {t.rejectReason}
          </span>
        </div>
      )}
      {t.status === 'Pending' && <div className="mx-4 mt-3 rounded-xl bg-warning/5 p-3 text-xs text-ink-2">In review with Meta. Most templates are reviewed within 15 minutes; some take up to 24 hours.</div>}

      <div className="h-3 shrink-0" />
      <div className="mt-auto flex items-center gap-4 border-t border-line px-4 py-3 text-xs text-ink-muted">
        {t.sent ? (
          <>
            <span>
              <b className="tabular text-ink">{fmtCompact(t.sent)}</b> sent
            </span>
            <span>
              <b className="tabular text-ink">{fmtPercent(t.readRate)}</b> read
            </span>
            {t.replyRate > 0 && (
              <span className="hidden sm:inline">
                <b className="tabular text-ink">{fmtPercent(t.replyRate)}</b> replied
              </span>
            )}
          </>
        ) : (
          <span>Not sent yet</span>
        )}
        <span className={cn('ml-auto shrink-0 text-ink-faint')}>{fmtRelative(t.updatedAt)}</span>
      </div>
    </Card>
  );
}
