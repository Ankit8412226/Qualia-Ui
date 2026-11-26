import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarBlank, CheckCircle, CloudCheck, FloppyDisk, RocketLaunch } from '@phosphor-icons/react';
import { fmtRelative } from '@/lib/format';
import { useQuery, useTick } from '@/lib/hooks';
import { Button, Card, Field, Input, Modal, Progress, Skeleton, Stepper, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { getCampaign, getWizardDefaults } from '@/services/agentflow';
import { AnswerStep, ContactsStep, FieldsStep, ReviewStep, RulesStep, ScriptStep, STEPS, VoiceStep, estimate, stepValid } from '../components/WizardSteps';

const BODIES = [ContactsStep, AnswerStep, ScriptStep, VoiceStep, FieldsStep, RulesStep, ReviewStep];

/** Turn a saved campaign's setup into the wizard draft shape (edit mode). */
function fromCampaign(c, defaults, csv) {
  const s = c.setup;
  return {
    ...defaults,
    name: c.name,
    contacts: { fileName: s.contacts.fileName, total: s.contacts.total, invalid: 0, duplicates: s.contacts.removedDuplicates, dnc: s.contacts.removedDnc, headers: csv.headers, rows: csv.rows, mapping: Object.fromEntries(csv.headers.map((h) => [h, /name/i.test(h) ? 'name' : /mobile/i.test(h) ? 'phone' : /city/i.test(h) ? 'city' : 'var'])) },
    answeredBy: s.answeredBy,
    script: { prompt: s.script.prompt, opening: s.script.opening, closing: s.script.closing, knowledgeKind: s.script.knowledge.kind, knowledgeFiles: s.script.knowledge.files || [], knowledgeText: s.script.knowledge.text || '' },
    voice: { ...defaults.voice, ...s.voice },
    fields: s.fields.map((f) => ({ ...f })),
    rules: { ...s.rules },
  };
}

export default function CampaignWizardPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading } = useQuery(async () => {
    const d = await getWizardDefaults();
    const c = id ? await getCampaign(id) : null;
    return { ...d, campaign: c };
  }, [id]);

  const [draft, setDraft] = useState(null);
  const [step, setStep] = useState(() => Math.min(Math.max(Number(params.get('step')) || 0, 0), STEPS.length - 1));
  const [savedAt, setSavedAt] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState({ date: '2026-11-27', time: '10:00' });
  const top = useRef(null);
  useTick(15000);

  useEffect(() => {
    if (!data) return;
    let d = data.campaign ? fromCampaign(data.campaign, data.draft, data.csv) : structuredClone(data.draft);
    const v = params.get('voice');
    if (v) d = { ...d, voice: { ...d.voice, voiceId: v } };
    setDraft(d);
  }, [data, params]);

  // Autosave hint: a short pause after the last edit marks the draft as saved.
  useEffect(() => {
    if (!draft) return undefined;
    const t = setTimeout(() => setSavedAt(new Date()), 700);
    return () => clearTimeout(t);
  }, [draft]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const go = (i) => {
    setStep(i);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const isLast = step === STEPS.length - 1;
  const valid = draft && stepValid(STEPS[step].id, draft);
  const finish = (kind) => {
    const e = estimate(draft);
    if (kind === 'draft') toast({ title: 'Saved as draft', description: 'Find it under Campaigns → Draft.', tone: 'success' });
    if (kind === 'schedule') toast({ title: 'Campaign scheduled', description: `Starts ${when.date} at ${when.time}.`, tone: 'success' });
    if (kind === 'launch') toast({ title: `${draft.name} is live`, description: `Calling ${e.contacts.toLocaleString('en-IN')} contacts now.`, tone: 'success' });
    navigate(id ? `/agentflow/campaigns/${id}` : kind === 'launch' ? '/agentflow/campaigns/cmp_101' : '/agentflow/campaigns');
  };

  const Body = BODIES[step];
  const editing = !!data?.campaign;

  return (
    <Page>
      <div ref={top} className="scroll-mt-24" />
      <PageHeader
        breadcrumbs={[{ label: 'Campaigns', to: '/agentflow/campaigns' }, { label: editing ? data.campaign.name : 'New campaign' }]}
        title={editing ? 'Edit campaign' : 'New campaign'}
        meta={
          savedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <CloudCheck size={14} weight="bold" className="text-success" />
              {editing ? 'Autosaved' : 'Draft saved'} {fmtRelative(savedAt)}
            </span>
          )
        }
        actions={
          <Button variant="ghost" icon={FloppyDisk} disabled={!draft} onClick={() => finish('draft')}>
            Save and exit
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-3">
            <div className="px-3 pb-3 pt-1">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-semibold text-ink">
                  Step {step + 1} of {STEPS.length}
                </span>
                <span className="text-ink-muted">{Math.round((step / (STEPS.length - 1)) * 100)}%</span>
              </div>
              <Progress value={step} max={STEPS.length - 1} size="sm" />
            </div>
            <Stepper orientation="vertical" steps={STEPS} current={step} onStepClick={(i) => draft && go(i)} />
          </Card>
        </aside>

        <div className="min-w-0">
          <Card className="min-h-[560px] p-6 sm:p-8">{!draft || loading ? <WizardSkeleton /> : <Body draft={draft} set={set} csv={data.csv} goTo={go} />}</Card>

          <div className="sticky bottom-0 z-20 -mx-1 mt-4 px-1 pb-4">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/90 p-3 shadow-pop backdrop-blur-md">
              <Button variant="ghost" icon={ArrowLeft} disabled={step === 0} onClick={() => go(step - 1)}>
                Back
              </Button>
              <span className="hidden truncate text-xs text-ink-muted sm:block">
                {STEPS[step].label}
                {!valid && draft && <span className="text-warning"> · fill the required fields to continue</span>}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {isLast && editing ? (
                  <Button variant="brand" icon={CheckCircle} onClick={() => { toast({ title: 'Changes saved', tone: 'success' }); navigate(`/agentflow/campaigns/${id}`); }}>
                    Save changes
                  </Button>
                ) : isLast ? (
                  <>
                    <Button icon={CalendarBlank} onClick={() => setScheduling(true)}>
                      Schedule
                    </Button>
                    <Button variant="brand" icon={RocketLaunch} disabled={!draft || !stepValid('contacts', draft)} disabledReason="Add a contact list first (step 1)." onClick={() => finish('launch')}>
                      Launch now
                    </Button>
                  </>
                ) : (
                  <Button variant="brand" iconRight={ArrowRight} disabled={!valid} disabledReason="Fill the required fields on this step to continue." onClick={() => go(step + 1)}>
                    {step === STEPS.length - 2 ? 'Review' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={scheduling}
        onClose={() => setScheduling(false)}
        title="Schedule campaign"
        description="Calls start at this time and follow your calling hours after that."
        icon={CalendarBlank}
        size="sm"
        footer={
          <>
            <Button onClick={() => setScheduling(false)}>Cancel</Button>
            <Button variant="brand" icon={CheckCircle} onClick={() => finish('schedule')}>
              Schedule
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <Input type="time" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </Page>
  );
}

function WizardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-4 h-10 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}
