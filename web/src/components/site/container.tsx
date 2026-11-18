import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** 1200 px content width, 16 px side gutter on phones, content left-aligned. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6', className)} {...props} />;
}
