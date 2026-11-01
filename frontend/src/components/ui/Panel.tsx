import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Small count or status next to the title. */
  meta?: ReactNode;
  actions?: ReactNode;
  /** "View all" style link in the header. */
  link?: { to: string; label: string };
  /** Remove body padding (for tables and lists that run edge to edge). */
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  as?: 'section' | 'div';
}

export function Panel({
  title, description, meta, actions, link, flush = false, className, bodyClassName, children, as = 'section',
}: PanelProps): JSX.Element {
  const Tag = as;
  const hasHeader = title !== undefined || actions !== undefined || link !== undefined;
  return (
    <Tag className={cn('rounded-xl border border-line bg-surface', className)}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {title !== undefined && (
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                {title}
                {meta}
              </h2>
            )}
            {description !== undefined && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {link !== undefined && (
              <Link to={link.to} className="rounded text-xs font-medium text-primary hover:underline">
                {link.label}
              </Link>
            )}
          </div>
        </div>
      )}
      <div className={cn(!flush && 'p-4', bodyClassName)}>{children}</div>
    </Tag>
  );
}
