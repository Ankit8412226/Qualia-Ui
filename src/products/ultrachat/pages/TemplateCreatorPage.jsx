import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBendUpLeft, ArrowSquareOut, Cards, CheckCircle, Copy, FileText, Image as ImageIcon, Info, Megaphone, Phone, Plus, ShieldCheck, TextB, TextItalic, TextStrikethrough, TextT, Trash, VideoCamera, Wrench, BracketsCurly, WarningCircle, PaperPlaneTilt, Prohibit } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { BackLink, Page, PageHeader, useUnsavedChanges } from '@/shared/layout';
import { Badge, Button, Card, CardHeader, Field, FileDrop, Input, RadioCards, Segmented, Select, Skeleton, Switch, Textarea, Tooltip, useConfirm, useToast } from '@/design-system';
import { getTemplate } from '@/services/ultrachat';
import { extractVars, RATE } from '../components/wa';
import { PhoneFrame, TemplateMessage } from '../components/PhonePreview';

const EMPTY = { name: '', category: 'Marketing', language: 'English', header: { type: 'none', text: '' }, body: '', samples: [], footer: '', buttons: [], carousel: null, expiry: 10, securityNote: true };

const BUTTON_TYPES = [
  { type: 'quick', label: 'Quick reply', icon: ArrowBendUpLeft, max: 10 },
  { type: 'url', label: 'Visit website', icon: ArrowSquareOut, max: 2 },
  { type: 'call', label: 'Call phone', icon: Phone, max: 1 },
];

const LIMITS = { name: 512, header: 60, body: 1024, footer: 60, button: 25 };

function Counter({ value = '', max }) {
  const n = value.length;
  return <span className={cn('text-2xs tabular', n > max ? 'text-danger' : n > max * 0.9 ? 'text-warning' : 'text-ink-faint')}>{n}/{max}</span>;
}

export default function TemplateCreatorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const editing = useQuery(() => (id ? getTemplate(id) : Promise.resolve(null)), [id]);
  const [t, setT] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (editing.data) setT({ ...EMPTY, ...editing.data, header: editing.data.header || { type: 'none', text: '' }, carousel: editing.data.carousel || null });
  }, [editing.data]);

  const [edited, setEdited] = useState(false);
  const leave = useUnsavedChanges(edited, { message: 'Your changes to this template will be lost.' });
  const set = (patch) => {
    setT((x) => ({ ...x, ...patch }));
    setEdited(true);
  };
  const auth = t.category === 'Authentication';
  const vars = extractVars(t.body);

  // Authentication templates have a fixed, Meta-defined body.
  const preview = useMemo(() => {
    if (!auth) return { ...t, header: t.header.type === 'none' ? null : t.header };
    return {
      ...t,
      header: null,
      body: `*{{1}}* is your verification code.${t.securityNote ? ' For your security, do not share this code.' : ''}`,
      samples: ['482913'],
      footer: t.expiry ? `This code expires in ${t.expiry} minutes.` : '',
      buttons: [{ type: 'copy', text: 'Copy code' }],
      carousel: null,
    };
  }, [t, auth]);

  const issues = useMemo(() => {
    const out = [];
    if (!t.name) out.push('Give the template a name.');
    else if (!/^[a-z0-9_]+$/.test(t.name)) out.push('Name can only use lowercase letters, numbers and underscores.');
    if (!auth) {
      if (!t.body.trim()) out.push('Write the message body.');
      if (t.body.length > LIMITS.body) out.push('Body is longer than 1,024 characters.');
      vars.forEach((n, i) => {
        if (n !== i + 1) out.push(`Variables must be numbered in order: found {{${n}}} where {{${i + 1}}} was expected.`);
        if (!t.samples[n - 1]) out.push(`Add a sample value for {{${n}}} so Meta can review it.`);
      });
      if (/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(t.body)) out.push('The body can’t start or end with a variable.');
      if (['image', 'video', 'document'].includes(t.header.type) && !t.header.text) out.push(`Upload a sample ${t.header.type} for the header.`);
      if (t.header.type === 'text' && !t.header.text) out.push('Write the header text or choose “None”.');
      t.buttons.forEach((b, i) => {
        if (!b.text) out.push(`Button ${i + 1} needs a label.`);
        if (b.type === 'url' && !/^https?:\/\//.test(b.url || '')) out.push(`Button ${i + 1} needs a full URL starting with https://`);
        if (b.type === 'call' && !(b.phone || '').replace(/\D/g, '').length) out.push(`Button ${i + 1} needs a phone number.`);
      });
    }
    return [...new Set(out)];
  }, [t, auth, vars]);

  const warnings = useMemo(() => {
    const w = [];
    if (/[A-Z]{6,}/.test(t.body) || /!{2,}/.test(t.body)) w.push('Lots of capitals or “!!!” often gets marketing templates rejected.');
    if (/guarantee|100% free|lowest price/i.test(t.body)) w.push('Avoid absolute claims like “guaranteed” or “lowest price”.');
    if (t.category === 'Utility' && /offer|discount|sale|% off/i.test(t.body)) w.push('This reads like marketing. Meta may re-categorise it as Marketing (₹0.88 per message).');
    return w;
  }, [t.body, t.category]);

  const wrap = (mark) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const sel = t.body.slice(a, b) || 'text';
    const next = t.body.slice(0, a) + mark + sel + mark + t.body.slice(b);
    set({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + 1, a + 1 + sel.length);
    });
  };
  const addVar = () => {
    const el = bodyRef.current;
    const n = (vars.length ? Math.max(...vars) : 0) + 1;
    const pos = el ? el.selectionStart : t.body.length;
    set({ body: `${t.body.slice(0, pos)}{{${n}}}${t.body.slice(pos)}` });
    requestAnimationFrame(() => el?.focus());
  };

  const addButton = (type) => set({ buttons: [...t.buttons, { type, text: '', url: type === 'url' ? 'https://' : undefined, phone: type === 'call' ? '+91 ' : undefined }] });
  const setButton = (i, patch) => set({ buttons: t.buttons.map((b, j) => (j === i ? { ...b, ...patch } : b)) });

  const submit = async () => {
    setTouched(true);
    if (issues.length) return toast({ tone: 'error', title: 'Fix the highlighted items first', description: issues[0] });
    if (!(await confirm({ title: 'Submit to Meta for review?', message: `“${t.name}” will be reviewed by Meta, usually within 15 minutes. You can’t edit it while it’s in review.`, confirmLabel: 'Submit for approval' }))) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: 'Submitted for approval', description: 'We’ll notify you when Meta approves it.' });
      leave.allow();
      navigate('/ultrachat/templates');
    }, 900);
  };

  if (id && editing.loading)
    return (
      <Page>
        <Skeleton className="h-96 rounded-2xl" />
      </Page>
    );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Templates', to: '/ultrachat/templates' }, { label: id ? t.name || 'Edit' : 'New template' }]}
        title={id ? `Edit ${t.name}` : 'New template'}
        description="Build the message on the left; the phone shows exactly what your customer will see."
        actions={
          <>
            <Button variant="secondary" onClick={() => {
                setEdited(false);
                toast({ title: 'Draft saved', description: 'Drafts are not sent to Meta.' });
              }}>
              Save draft
            </Button>
            <Button variant="brand" icon={PaperPlaneTilt} loading={submitting} onClick={submit}>
              Submit for approval
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* basics */}
          <Card>
            <CardHeader title="Basics" subtitle="Category decides the price and what Meta allows." />
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Template name" required hint="Lowercase and underscores, e.g. site_visit_reminder" error={touched && t.name && !/^[a-z0-9_]+$/.test(t.name) ? 'Only a–z, 0–9 and _ are allowed.' : undefined}>
                <Input value={t.name} onChange={(e) => set({ name: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="diwali_offer_2026" className="font-mono" disabled={!!id} />
              </Field>
              <Field label="Language">
                <Select value={t.language} onChange={(e) => set({ language: e.target.value })} options={['English', 'Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Bengali', 'Kannada']} />
              </Field>
            </div>
            <div className="mt-4">
              <RadioCards
                cols={3}
                value={t.category}
                onChange={(category) => set({ category, carousel: category === 'Marketing' ? t.carousel : null })}
                options={[
                  { value: 'Marketing', label: 'Marketing', icon: Megaphone, description: `Offers, launches · ₹${RATE.Marketing}/msg` },
                  { value: 'Utility', label: 'Utility', icon: Wrench, description: `Booking & payment updates · ₹${RATE.Utility}/msg` },
                  { value: 'Authentication', label: 'Authentication', icon: ShieldCheck, description: `One-time passwords · ₹${RATE.Authentication}/msg` },
                ]}
              />
            </div>
          </Card>

          {auth ? (
            <Card>
              <CardHeader title="One-time password" subtitle="Meta fixes the wording of authentication templates. You choose the options." icon={ShieldCheck} />
              <div className="flex flex-col gap-4">
                <Switch checked={t.securityNote} onChange={(v) => set({ securityNote: v })} label="Add security recommendation" description="“For your security, do not share this code.”" />
                <Field label="Code expires after" hint="Shown as a footer. Leave empty for no expiry line.">
                  <Input type="number" min={1} max={90} value={t.expiry ?? ''} onChange={(e) => set({ expiry: e.target.value ? Number(e.target.value) : null })} suffix="min" className="w-40" />
                </Field>
                <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-xs text-ink-2">
                  <Copy size={15} className="text-brand" /> A “Copy code” button is added automatically.
                </div>
              </div>
            </Card>
          ) : (
            <>
              {/* header */}
              <Card>
                <CardHeader title="Header" subtitle="Optional. A title line or a photo, video or PDF on top." />
                <Segmented
                  value={t.header.type}
                  onChange={(type) => set({ header: { type, text: '' } })}
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'text', label: 'Text', icon: TextT },
                    { value: 'image', label: 'Image', icon: ImageIcon },
                    { value: 'video', label: 'Video', icon: VideoCamera },
                    { value: 'document', label: 'Document', icon: FileText },
                  ]}
                />
                {t.header.type === 'text' && (
                  <Field className="mt-4" label="Header text" action={<Counter value={t.header.text} max={LIMITS.header} />}>
                    <Input value={t.header.text} maxLength={LIMITS.header} onChange={(e) => set({ header: { ...t.header, text: e.target.value } })} placeholder="Payment reminder" />
                  </Field>
                )}
                {['image', 'video', 'document'].includes(t.header.type) && (
                  <div className="mt-4">
                    {t.header.text ? (
                      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
                        <CheckCircle size={20} weight="fill" className="text-success" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.header.text}</span>
                        <Button size="xs" variant="ghost" onClick={() => set({ header: { ...t.header, text: '' } })}>
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <FileDrop
                        compact
                        accept={t.header.type === 'image' ? 'image/jpeg,image/png' : t.header.type === 'video' ? 'video/mp4' : 'application/pdf'}
                        title={`Upload a sample ${t.header.type}`}
                        hint={t.header.type === 'image' ? 'JPG or PNG, up to 5 MB' : t.header.type === 'video' ? 'MP4, up to 16 MB' : 'PDF, up to 100 MB'}
                        onFiles={(f) => f[0] && set({ header: { ...t.header, text: f[0].name } })}
                      />
                    )}
                    <p className="mt-2 text-xs text-ink-muted">This is only a sample for review. You can send a different file in each campaign.</p>
                  </div>
                )}
              </Card>

              {/* body */}
              <Card>
                <CardHeader title="Body" subtitle="The main message. Use {{1}}, {{2}} for details that change per person." />
                <Field label="Message" required action={<Counter value={t.body} max={LIMITS.body} />} error={touched && !t.body.trim() ? 'Body is required.' : undefined}>
                  <div className="overflow-hidden rounded-xl border border-line focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
                    <div className="flex items-center gap-0.5 border-b border-line bg-surface-2 px-1.5 py-1">
                      {[
                        [TextB, 'Bold', '*'],
                        [TextItalic, 'Italic', '_'],
                        [TextStrikethrough, 'Strikethrough', '~'],
                      ].map(([Icon, label, mark]) => (
                        <Tooltip key={label} content={`${label} (${mark}text${mark})`}>
                          <button type="button" onClick={() => wrap(mark)} aria-label={label} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink">
                            <Icon size={16} weight="bold" />
                          </button>
                        </Tooltip>
                      ))}
                      <span className="mx-1 h-5 w-px bg-line" />
                      <button type="button" onClick={addVar} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10">
                        <BracketsCurly size={14} weight="bold" /> Add variable
                      </button>
                    </div>
                    <textarea
                      ref={bodyRef}
                      rows={6}
                      value={t.body}
                      onChange={(e) => set({ body: e.target.value })}
                      placeholder="Hi {{1}}, your site visit at Parko Heights is on {{2}}."
                      className="block w-full resize-y bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
                    />
                  </div>
                </Field>
                {vars.length > 0 && (
                  <div className="mt-4 rounded-xl bg-surface-2 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold">
                      Sample values <span className="text-xs font-normal text-ink-muted">Meta reviews the message with these.</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {vars.map((n) => (
                        <Field key={n} label={<span className="font-mono">{`{{${n}}}`}</span>}>
                          <Input size="sm" value={t.samples[n - 1] || ''} onChange={(e) => set({ samples: Object.assign([...t.samples], { [n - 1]: e.target.value }) })} placeholder={n === 1 ? 'Priya' : 'Sample'} />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}
                <Field className="mt-4" label="Footer" optional action={<Counter value={t.footer} max={LIMITS.footer} />}>
                  <Input value={t.footer} maxLength={LIMITS.footer} onChange={(e) => set({ footer: e.target.value })} placeholder="Reply STOP to opt out" />
                </Field>
              </Card>

              {/* buttons */}
              <Card>
                <CardHeader title="Buttons" subtitle="Optional. Up to 10 quick replies, 2 website links and 1 call button." />
                {t.buttons.length > 0 && (
                  <ul className="mb-4 flex flex-col gap-2.5">
                    {t.buttons.map((b, i) => {
                      const meta = BUTTON_TYPES.find((x) => x.type === b.type);
                      return (
                        <li key={i} className="grid items-start gap-2 rounded-xl border border-line p-3 sm:grid-cols-[150px_1fr_1fr_auto]">
                          <span className="inline-flex h-8 items-center gap-2 text-[13px] font-medium text-ink-2">
                            <meta.icon size={16} className="text-brand" /> {meta.label}
                          </span>
                          <Input size="sm" value={b.text} maxLength={LIMITS.button} onChange={(e) => setButton(i, { text: e.target.value })} placeholder="Button label" />
                          {b.type === 'url' ? (
                            <Input size="sm" value={b.url} onChange={(e) => setButton(i, { url: e.target.value })} placeholder="https://rrparko.in/offer" />
                          ) : b.type === 'call' ? (
                            <Input size="sm" value={b.phone} onChange={(e) => setButton(i, { phone: e.target.value })} placeholder="+91 20 4890 1200" />
                          ) : (
                            <span className="hidden sm:block" />
                          )}
                          <button onClick={() => set({ buttons: t.buttons.filter((_, j) => j !== i) })} aria-label="Remove button" className="h-8 rounded-lg px-2 text-ink-faint hover:bg-danger/10 hover:text-danger">
                            <Trash size={15} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  {BUTTON_TYPES.map((bt) => {
                    const used = t.buttons.filter((b) => b.type === bt.type).length;
                    return (
                      <Button key={bt.type} size="sm" variant="secondary" icon={Plus} disabled={used >= bt.max || t.buttons.length >= 10} onClick={() => addButton(bt.type)}>
                        {bt.label}
                      </Button>
                    );
                  })}
                </div>
              </Card>

              {/* carousel */}
              {t.category === 'Marketing' && (
                <Card>
                  <Switch
                    checked={!!t.carousel}
                    onChange={(v) => set({ carousel: v ? [{ title: '', text: '', button: 'View' }, { title: '', text: '', button: 'View' }] : null })}
                    label={
                      <span className="inline-flex items-center gap-2">
                        <Cards size={16} className="text-brand" /> Carousel cards
                      </span>
                    }
                    description="Show 2–10 swipeable cards under the message, each with an image and a button."
                  />
                  {t.carousel && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {t.carousel.map((c, i) => (
                        <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
                            Card {i + 1}
                            {t.carousel.length > 2 && (
                              <button onClick={() => set({ carousel: t.carousel.filter((_, j) => j !== i) })} className="text-ink-faint hover:text-danger" aria-label="Remove card">
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                          <Input size="sm" placeholder="Title" value={c.title} onChange={(e) => set({ carousel: t.carousel.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                          <Input size="sm" placeholder="Short text" value={c.text} onChange={(e) => set({ carousel: t.carousel.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                          <Input size="sm" placeholder="Button label" value={c.button} onChange={(e) => set({ carousel: t.carousel.map((x, j) => (j === i ? { ...x, button: e.target.value } : x)) })} />
                        </div>
                      ))}
                      {t.carousel.length < 10 && (
                        <button onClick={() => set({ carousel: [...t.carousel, { title: '', text: '', button: 'View' }] })} className="flex min-h-[132px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-medium text-ink-muted hover:border-brand/50 hover:text-brand">
                          <Plus size={16} weight="bold" /> Add card
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>

        {/* sticky preview */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <PhoneFrame height={520}>
            <TemplateMessage template={preview} />
          </PhoneFrame>
          <Card className="p-4">
            {issues.length === 0 && warnings.length === 0 ? (
              <div className="flex items-start gap-2 text-[13px]">
                <CheckCircle size={18} weight="fill" className="shrink-0 text-success" />
                <span>
                  <b>Ready to submit.</b> <span className="text-ink-muted">Charged as {t.category} · ₹{RATE[t.category]} per message.</span>
                </span>
              </div>
            ) : (
              <ul className="flex flex-col gap-2 text-[13px]">
                {issues.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-ink-2">
                    <Prohibit size={16} className="mt-px shrink-0 text-danger" /> {i}
                  </li>
                ))}
                {warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-ink-2">
                    <WarningCircle size={16} className="mt-px shrink-0 text-warning" /> {w}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-2xs text-ink-muted">
              <Info size={12} /> Variables show as <Badge size="xs" tone="brand">sample</Badge> in the preview.
            </div>
          </Card>
          <BackLink to="/ultrachat/templates">Back to templates</BackLink>
        </div>
      </div>
    </Page>
  );
}
