import { forwardRef, useId, useRef, useState } from 'react';
import { CaretDown, Check, CloudArrowUp, Copy, Eye, EyeSlash, MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand/60 focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-muted aria-[invalid=true]:border-danger/60 aria-[invalid=true]:focus:ring-danger/10';

/** Label + control + hint/error. Wrap any control in it. */
export function Field({ label, hint, error, required, optional, htmlFor, className, children, action }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
              {label}
              {required && <span className="ml-0.5 text-danger">*</span>}
              {optional && <span className="ml-1.5 text-xs font-normal text-ink-faint">Optional</span>}
            </label>
          )}
          {action}
        </div>
      )}
      {children}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, icon: Icon, suffix, size = 'md', ...rest }, ref) {
  const h = size === 'sm' ? 'h-8 text-[13px]' : 'h-10';
  if (!Icon && !suffix) return <input ref={ref} className={cn(control, h, className)} {...rest} />;
  return (
    <div className={cn('relative', className)}>
      {Icon && <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />}
      <input ref={ref} className={cn(control, h, Icon && 'pl-9', suffix && 'pr-12')} {...rest} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">{suffix}</span>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'py-2.5 leading-relaxed', className)} {...rest} />;
});

/** Native select, styled. `options` = [{value,label}] or strings. */
export const Select = forwardRef(function Select({ options = [], placeholder, className, size = 'md', ...rest }, ref) {
  const h = size === 'sm' ? 'h-8 text-[13px]' : 'h-10';
  return (
    <div className={cn('relative', className)}>
      <select ref={ref} className={cn(control, h, 'appearance-none pr-9')} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      <CaretDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
    </div>
  );
});

export function SearchInput({ value, onChange, placeholder = 'Search', className, size = 'md', autoFocus }) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(control, size === 'sm' ? 'h-8 text-[13px]' : 'h-10', 'pl-9 pr-8')}
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint hover:bg-surface-3 hover:text-ink">
          <X size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, description, disabled, indeterminate, className, ...rest }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-start gap-2.5', disabled && 'cursor-not-allowed opacity-50', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : !!checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        {...rest}
        className={cn('mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition', checked || indeterminate ? 'border-brand bg-brand text-brand-ink' : 'border-line-strong bg-surface hover:border-brand/60')}
      >
        {indeterminate ? <span className="h-0.5 w-2 rounded bg-current" /> : checked && <Check size={12} weight="bold" />}
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-ink">{label}</span>}
          {description && <span className="block text-xs text-ink-muted">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Switch({ checked, onChange, label, description, disabled, size = 'md', className, ...rest }) {
  const dims = size === 'sm' ? ['h-5 w-9', 'h-4 w-4', 'translate-x-4'] : ['h-6 w-11', 'h-5 w-5', 'translate-x-5'];
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      {...rest}
      className={cn('relative inline-flex shrink-0 items-center rounded-full p-0.5 transition disabled:opacity-50', dims[0], checked ? 'bg-brand' : 'bg-line-strong')}
    >
      <span className={cn('rounded-full bg-white shadow transition-transform', dims[1], checked && dims[2])} />
    </button>
  );
  if (!label) return button;
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', className)}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-muted">{description}</span>}
      </span>
      {button}
    </label>
  );
}

/** Card-style radio options. `options` = [{value,label,description,icon}] */
export function RadioCards({ value, onChange, options, cols = 2, className }) {
  return (
    <div className={cn('grid gap-3', cols === 3 ? 'sm:grid-cols-3' : cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2', className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn('flex items-start gap-3 rounded-xl border p-4 text-left transition', active ? 'border-brand bg-brand/5 ring-4 ring-brand/10' : 'border-line bg-surface hover:border-line-strong')}
          >
            {Icon && <Icon size={22} weight="duotone" className={active ? 'text-brand' : 'text-ink-muted'} />}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-xs text-ink-muted">{o.description}</span>}
            </span>
            <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-brand' : 'border-line-strong')}>
              {active && <span className="h-2 w-2 rounded-full bg-brand" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** iOS-style segmented control for 2–5 options. */
export function Segmented({ value, onChange, options, size = 'md', className }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-surface-3 p-1', className)}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              opt.value === value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink',
            )}
          >
            {Icon && <Icon size={14} weight="bold" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Masked secret (API keys). Shows the last 4 characters; eye toggles while typing. */
export function SecretInput({ value, onChange, placeholder = 'Paste key', className }) {
  const [show, setShow] = useState(false);
  return (
    <div className={cn('relative', className)}>
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className={cn(control, 'h-10 pr-10 font-mono text-[13px]')} autoComplete="off" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint hover:bg-surface-3 hover:text-ink">
        {show ? <EyeSlash size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** Read-only value with a copy button (invite links, webhook URLs, IDs). */
export function CopyField({ value, className }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={cn('flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 pl-3 pr-1', className)}>
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-2">{value}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-3"
      >
        {copied ? <Check size={14} weight="bold" className="text-success" /> : <Copy size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/** Drag-and-drop upload zone. UI only: calls onFiles(FileList as array). */
export function FileDrop({ accept, multiple, onFiles, title = 'Drop files here or browse', hint, className, compact }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const id = useId();
  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles?.([...e.dataTransfer.files]);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition',
        compact ? 'p-5' : 'p-8',
        over ? 'border-brand bg-brand/5' : 'border-line hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <CloudArrowUp size={22} weight="duotone" />
      </span>
      <span className="text-sm font-semibold text-ink">{title}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      <input id={id} ref={input} type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => onFiles?.([...e.target.files])} />
    </label>
  );
}

/** A form section: title on the left, fields on the right (stacks on mobile). */
export function FormSection({ title, description, children, className }) {
  return (
    <section className={cn('grid gap-6 border-b border-line py-6 last:border-0 lg:grid-cols-[260px_1fr]', className)}>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** Tag/chip input for numbers, emails, keywords. */
export function TagInput({ value = [], onChange, placeholder = 'Type and press Enter', className }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft('');
  };
  return (
    <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10', className)}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-surface-3 px-2 py-1 text-xs font-medium text-ink-2">
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`} className="text-ink-faint hover:text-ink">
            <X size={10} weight="bold" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}
