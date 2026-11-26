import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatsTeardrop, Plus } from '@phosphor-icons/react';
import { fmtRelative } from '@/lib/format';
import { useFilteredRows, useQuery } from '@/lib/hooks';
import { Badge, Button, Card, DataTable, EmptyState, FilterBar, FilterSelect } from '@/design-system';
import { Page, PageHeader, ProductMark } from '@/shared/layout';
import { productById } from '@/app/products';
import { insightsService } from '@/services/insights';
import { SCOPES } from '@/mocks/insights';

export default function HistoryPage() {
  const { data = [], loading } = useQuery(() => insightsService.listSessions(), []);
  const [search, setSearch] = useState('');
  const [product, setProduct] = useState([]);
  const navigate = useNavigate();
  const rows = useFilteredRows(data, { search, fields: ['title'], filters: { product } });
  return (
    <Page>
      <PageHeader
        title="Conversations"
        description="Every question you asked, across all products."
        actions={
          <Button variant="brand" icon={Plus} onClick={() => navigate('/insights')}>
            New conversation
          </Button>
        }
      />
      <Card padded={false}>
        <div className="p-4">
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search conversations" canReset={!!(search || product.length)} onReset={() => { setSearch(''); setProduct([]); }}>
            <FilterSelect label="Product" options={SCOPES} value={product} onChange={setProduct} />
          </FilterBar>
        </div>
        <DataTable
          loading={loading}
          rows={rows}
          onRowClick={() => navigate('/insights')}
          empty={<EmptyState icon={ChatsTeardrop} title="No conversations yet" description="Ask your first question to start one." compact />}
          columns={[
            { key: 'title', header: 'Conversation', render: (r) => <span className="font-medium text-ink">{r.title}</span> },
            {
              key: 'product',
              header: 'Product',
              render: (r) =>
                r.product === 'all' ? (
                  <Badge>All products</Badge>
                ) : (
                  <span className="inline-flex items-center gap-2 text-[13px]">
                    <ProductMark id={r.product} size="xs" />
                    {productById(r.product)?.name}
                  </span>
                ),
            },
            { key: 'pinned', header: '', hideBelow: 'md', render: (r) => r.pinned && <Badge tone="brand">Has pinned answer</Badge> },
            { key: 'updatedAt', header: 'Last activity', sortable: true, sortValue: (r) => +new Date(r.updatedAt), render: (r) => fmtRelative(r.updatedAt) },
          ]}
        />
      </Card>
    </Page>
  );
}
