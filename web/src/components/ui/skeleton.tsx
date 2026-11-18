import { cn } from '@/lib/cn';

/** Loading placeholder: the shape of what is coming, instead of "Loading…". */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block animate-pulse rounded-md bg-line/60', className)} />;
}
