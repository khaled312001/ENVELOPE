import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from 'react';

import { cn } from '../lib/cn.js';

/* ── Badge ───────────────────────────────────────────────────────────────── */

/*
  Each tone is a provenance class or a status, never a decoration. `assumed` is
  the only place amber appears outside a traced value, and it carries a dashed
  border as well, so it survives a greyscale photocopy (1.4.1).
*/
const badge = cva(
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[11px] font-medium uppercase tracking-[0.04em] whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-line bg-raised text-secondary',
        accent: 'border-accent/40 bg-accent-subtle text-accent-strong',
        derived: 'border-derived/40 bg-derived-surface text-derived',
        assumed: 'border-dashed border-assumed/70 bg-assumed-surface text-assumed',
        variance: 'border-variance/50 bg-variance-surface text-variance',
        deferred: 'border-line bg-raised text-deferred',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>): JSX.Element {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>): JSX.Element {
  return <section className={cn('rounded-lg border border-line bg-panel', className)} {...props} />;
}

export function PanelHeader({
  title,
  hint,
  actions,
  className,
  level = 2,
}: {
  readonly title: ReactNode;
  readonly hint?: ReactNode;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly level?: 2 | 3;
}): JSX.Element {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <header className={cn('flex items-start justify-between gap-3 border-b border-subtle px-4 py-3', className)}>
      <div className="min-w-0">
        <H className="text-[13px] font-semibold tracking-[0.01em] text-fg">{title}</H>
        {hint ? <p className="mt-0.5 text-[12.5px] leading-snug text-secondary">{hint}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

/* ── Field ───────────────────────────────────────────────────────────────── */

/*
  A visible label, always — a placeholder is not one. The hint and the error
  are tied to the control by `aria-describedby`, and an error sets
  `aria-invalid`, so the state is announced and not only coloured.
*/
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: ReactNode;
  readonly children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  readonly className?: string;
}): JSX.Element {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-[12.5px] font-medium text-fg">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-[12px] leading-snug text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errId} className="text-[12px] leading-snug text-variance">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const control =
  'h-9 w-full min-w-0 rounded-md border border-line bg-sunken px-2.5 text-sm text-fg ' +
  'placeholder:text-tertiary transition-colors duration-150 hover:border-strong ' +
  'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 ' +
  'aria-invalid:border-variance disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cn(control, 'cursor-pointer pe-7', className)} {...props} />;
});

/* ── Stat ────────────────────────────────────────────────────────────────── */

export function Stat({
  label,
  children,
  className,
}: {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <div className={cn('grid gap-1', className)}>
      <dt className="text-[11.5px] font-medium tracking-[0.02em] text-secondary">{label}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}

/* ── Kbd / Spinner / Empty ───────────────────────────────────────────────── */

export function Spinner({ className }: { readonly className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-3.5 animate-spin rounded-full border-2 border-current border-e-transparent', className)}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  readonly title: ReactNode;
  readonly body: ReactNode;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
}): JSX.Element {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="grid size-10 place-items-center rounded-lg border border-line bg-raised text-secondary">{icon}</div> : null}
      <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
      <p className="text-[13px] leading-relaxed text-secondary">{body}</p>
      {action}
    </div>
  );
}

/** A refusal or failure from the API, in its own sentence — the server writes them to be read. */
export function Notice({
  tone = 'variance',
  title,
  children,
}: {
  readonly tone?: 'variance' | 'neutral' | 'assumed';
  readonly title?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div
      role={tone === 'variance' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2.5 text-[13px] leading-relaxed',
        tone === 'variance' && 'border-variance/50 bg-variance-surface text-fg',
        tone === 'neutral' && 'border-line bg-raised text-secondary',
        tone === 'assumed' && 'border-dashed border-assumed/70 bg-assumed-surface text-fg',
      )}
    >
      {title ? <p className="mb-0.5 font-semibold text-fg">{title}</p> : null}
      {children}
    </div>
  );
}
