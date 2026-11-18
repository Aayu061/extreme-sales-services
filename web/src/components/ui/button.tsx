import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Buttons: primary (deep cyan, one per view), secondary (outlined navy) and quiet (text only).
 * 44 px minimum touch target at the default size.
 */
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-deep-cyan text-white hover:bg-deep-cyan-hover dark:text-[#0b1a30]',
        secondary: 'border border-navy/80 bg-paper text-navy hover:bg-cyan-wash',
        quiet: 'text-deep-cyan underline-offset-4 hover:underline',
      },
      size: {
        md: 'min-h-11 px-5 text-base',
        sm: 'min-h-9 px-3.5 text-sm',
        lg: 'min-h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type StyleProps = VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = 'button', ...props }: ComponentProps<'button'> & StyleProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
