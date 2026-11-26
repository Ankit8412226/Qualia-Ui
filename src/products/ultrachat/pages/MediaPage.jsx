import { useRef, useState } from 'react';
import { Copy, FileAudio, FilePdf, Image as ImageIcon, Images, Play, Trash, UploadSimple, VideoCamera } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks';
import { fmtDate } from '@/lib/format';
import { Button, Card, CopyField, DescriptionList, EmptyState, IconButton, Modal, SearchInput, Segmented, Skeleton, useConfirm, useToast } from '@/design-system';
import { Page, PageHeader } from '@/shared/layout';
import { listMedia } from '@/services/ultrachat';

const TYPE = {
  image: { icon: ImageIcon, label: 'Image', tone: 'text-brand', bg: 'from-brand/25 via-brand/10 to-accent/20' },
  video: { icon: VideoCamera, label: 'Video', tone: 'text-info', bg: 'from-info/25 via-info/10 to-brand/15' },
  document: { icon: FilePdf, label: 'Document', tone: 'text-danger', bg: 'from-danger/15 via-surface-3 to-surface-3' },
  audio: { icon: FileAudio, label: 'Audio', tone: 'text-product-businesspulse', bg: 'from-product-businesspulse/20 via-surface-3 to-surface-3' },
};

function Thumb({ item, large }) {
  const t = TYPE[item.type];
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-gradient-to-br', t.bg, large ? 'aspect-video rounded-2xl' : 'aspect-[4/3]')}>
      {item.type === 'video' ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night/60 text-white">
          <Play size={20} weight="fill" />
        </span>
      ) : (
        <t.icon size={large ? 56 : 34} weight="duotone" className={t.tone} />
      )}
      <span className="absolute left-2 top-2 rounded-md bg-surface/80 px-1.5 py-0.5 text-2xs font-semibold uppercase text-ink-2 backdrop-blur">{item.name.split('.').pop()}</span>
    </div>
  );
}

export default function MediaPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, setData } = useQuery(() => listMedia(), []);
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null);
  const fileRef = useRef(null);
  const rows = (data || []).filter((m) => (type === 'all' || m.type === type) && (!search || m.name.toLowerCase().includes(search.toLowerCase())));
  const count = (t) => (data || []).filter((m) => m.type === t).length;

  const remove = async (m) => {
    if (!(await confirm({ title: `Delete ${m.name}?`, message: m.usedIn ? `It is used in “${m.usedIn}”. Messages already sent keep working; new sends will fail until you pick another file.` : 'This can’t be undone.', tone: 'danger', confirmLabel: 'Delete file' }))) return;
    setData((all) => all.filter((x) => x.id !== m.id));
    setOpen(null);
    toast(`${m.name} deleted`);
  };

  const upload = (files) => {
    const added = files.map((f, i) => ({
      id: `md_new_${Date.now()}_${i}`,
      name: f.name,
      type: f.type.startsWith('image') ? 'image' : f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : 'document',
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      usedIn: null,
      uploadedBy: 'You',
      at: new Date(),
      url: `https://cdn.ultrachat.in/rrparko/${f.name}`,
    }));
    setData((all) => [...added, ...all]);
    toast({ title: `${added.length} file${added.length > 1 ? 's' : ''} uploaded`, description: 'Ready to use in templates, flows and the inbox.' });
  };

  return (
    <Page>
      <PageHeader
        title="Media library"
        description="Images, videos and documents you send in templates, flows and chats. WhatsApp limits: images 5 MB, video 16 MB, documents 100 MB."
        actions={
          <>
            <input ref={fileRef} type="file" multiple className="sr-only" accept="image/*,video/mp4,application/pdf,audio/*" onChange={(e) => (upload([...e.target.files]), (e.target.value = ''))} />
            <Button variant="brand" icon={UploadSimple} onClick={() => fileRef.current?.click()}>
              Upload
            </Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: `All ${data ? data.length : ''}` },
            { value: 'image', label: `Images ${count('image')}` },
            { value: 'video', label: `Videos ${count('video')}` },
            { value: 'document', label: `Docs ${count('document')}` },
            { value: 'audio', label: `Audio ${count('audio')}` },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search files" className="w-full sm:ml-auto sm:w-64" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={Images} title="No files here" description="Upload images, videos or PDFs to reuse them across WhatsApp." action={<Button variant="brand" icon={UploadSimple} onClick={() => fileRef.current?.click()}>Upload</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rows.map((m) => (
            <Card key={m.id} padded={false} className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop">
              <button onClick={() => setOpen(m)} className="block w-full text-left">
                <Thumb item={m} />
                <div className="p-3">
                  <div className="truncate text-[13px] font-medium text-ink" title={m.name}>
                    {m.name}
                  </div>
                  <div className="mt-0.5 truncate text-2xs text-ink-muted">
                    {m.size} · {m.usedIn ? `Used in ${m.usedIn}` : 'Not used yet'}
                  </div>
                </div>
              </button>
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <IconButton
                  size="xs"
                  variant="secondary"
                  icon={Copy}
                  label="Copy link"
                  onClick={() => {
                    navigator.clipboard?.writeText(m.url);
                    toast('Link copied');
                  }}
                />
                <IconButton size="xs" variant="secondary" icon={Trash} label="Delete" className="hover:text-danger" onClick={() => remove(m)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name}
        size="lg"
        footer={
          <>
            <Button variant="danger-soft" icon={Trash} onClick={() => remove(open)} className="mr-auto">
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setOpen(null)}>
              Close
            </Button>
          </>
        }
      >
        {open && (
          <div className="flex flex-col gap-5">
            <Thumb item={open} large />
            <DescriptionList
              cols={3}
              items={[
                { label: 'Type', value: TYPE[open.type].label },
                { label: 'Size', value: open.size },
                { label: 'Uploaded', value: `${fmtDate(open.at)} · ${open.uploadedBy}` },
                { label: 'Used in', value: open.usedIn || 'Not used yet' },
              ]}
            />
            <CopyField value={open.url} />
          </div>
        )}
      </Modal>
    </Page>
  );
}
