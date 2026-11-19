import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Buttons (design doc §8): taxi yellow for the main action, frosted glass for the second action,
 * quiet for text links. All pills, pressing in slightly when tapped; 44 px minimum touch target.
 */
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-standard active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        taxi: 'bg-taxi text-taxi-ink shadow-[0_10px_30px_-8px_rgb(255_201_21/0.55)] hover:bg-taxi-hover hover:shadow-[0_14px_38px_-8px_rgb(255_201_21/0.7)]',
        glass: 'glass text-ink hover:bg-[var(--glass-strong)]',
        quiet: 'text-cool underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'min-h-11 px-5 text-[15px]',
        md: 'min-h-12 px-6 text-base',
        lg: 'min-h-14 px-8 text-lg',
      },
    },
    defaultVariants: { variant: 'taxi', size: 'md' },
  },
);

type StyleProps = VariantProps<typeof buttonStyles>;

export function Button({ className, variant, size, type = 'button', ...props }: ComponentProps<'button'> & StyleProps) {
  return <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}
