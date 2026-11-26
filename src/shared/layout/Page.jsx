import { cn } from '@/lib/cn';
import { Breadcrumbs } from '@/design-system';
import { usePageTitle } from './ShellContext';

/** Page container: consistent max width and gutters on every screen. `full` for workspaces (inbox, flow builder). */
export function Page({ children, className, full }) {
  return <div className={cn(full ? 'h-[calc(100vh-64px)]' : 'mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8', className)}>{children}</div>;
}

/**
 * Page title row. title, description, actions (buttons), meta (badges/live indicator under the title),
 * breadcrumbs = [{label,to}], children = tabs or filters under the header.
 * A string title also names the browser tab on sub pages (detail, wizard); pass `docTitle` to override.
 */
export function PageHeader({ title, docTitle, description, actions, meta, breadcrumbs, icon: Icon, children, className }) {
  usePageTitle(docTitle || (typeof title === 'string' ? title : null));
  return (
    <header className={cn('mb-6 flex flex-col gap-4', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:flex">
              <Icon size={22} weight="duotone" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold leading-tight sm:text-[26px]">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
            {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Section heading inside a page. */
export function SectionTitle({ title, description, actions, className }) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="text-xs text-ink-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
