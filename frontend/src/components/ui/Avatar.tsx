import { cn } from '@/lib/cn';

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

const SIZES = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm', xl: 'h-16 w-16 text-lg' } as const;

interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps): JSX.Element {
  const classes = cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold', SIZES[size], className);
  if (src) return <img src={src} alt="" className={cn(classes, 'object-cover')} />;
  return (
    <span aria-hidden className={cn(classes, 'bg-primary-soft text-primary')}>
      {initialsOf(name)}
    </span>
  );
}
