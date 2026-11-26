import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Waveform as WaveIcon } from '@phosphor-icons/react';
import { useQuery } from '@/lib/hooks';
import { Button, EmptyState, FilterBar, FilterSelect, Skeleton } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listVoices, ref } from '@/services/agentflow';
import { VoiceCard, usePreview } from '../components/VoiceCard';

export default function VoicesPage() {
  const { data, loading } = useQuery(listVoices, []);
  const [search, setSearch] = useState('');
  const [langs, setLangs] = useState([]);
  const [genders, setGenders] = useState([]);
  const [engines, setEngines] = useState([]);
  const [playing, play] = usePreview();
  const navigate = useNavigate();

  const q = search.trim().toLowerCase();
  const rows = (data || []).filter(
    (v) =>
      (!q || [v.name, v.accent, v.style].join(' ').toLowerCase().includes(q)) &&
      (!langs.length || v.languages.some((l) => langs.includes(l))) &&
      (!genders.length || genders.includes(v.gender)) &&
      (!engines.length || v.engines.some((e) => engines.includes(e))),
  );
  const reset = () => {
    setSearch('');
    setLangs([]);
    setGenders([]);
    setEngines([]);
  };
  const filtered = !!q || langs.length + genders.length + engines.length > 0;

  return (
    <Page>
      <PageHeader title="Voices" description={`${data?.length ?? '…'} voices across ${ref.languages.length} languages. Press play to hear a sample.`} />
      <FilterBar className="mb-5" search={search} onSearch={setSearch} searchPlaceholder="Search name, accent or style" onReset={reset} canReset={filtered} actions={<span className="text-xs text-ink-muted">{rows.length} voices</span>}>
        <FilterSelect label="Language" options={ref.languages} value={langs} onChange={setLangs} searchable />
        <FilterSelect label="Gender" options={['Female', 'Male']} value={genders} onChange={setGenders} />
        <FilterSelect label="Engine" options={ref.engines.map((e) => ({ value: e.value, label: e.label }))} value={engines} onChange={setEngines} />
      </FilterBar>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map((v) => (
            <VoiceCard
              key={v.id}
              voice={v}
              playing={playing === v.id}
              onPlay={() => play(v.id)}
              footer={
                <Button size="xs" variant="soft" iconRight={ArrowRight} onClick={() => navigate(`/agentflow/campaigns/new?voice=${v.id}`)}>
                  Use in campaign
                </Button>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={WaveIcon} title="No voice matches these filters" description="Try another language or engine." action={<Button onClick={reset}>Clear filters</Button>} />
      )}
    </Page>
  );
}
