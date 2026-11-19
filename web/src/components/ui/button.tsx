import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

/**
 * Buttons: primary (deep cyan, one per view), secondary (outlined navy), quiet (text only), and
 * onBlue / onBlueOutline for the blue hero and call-to-action bands. They press in slightly when
 * tapped. 44 px minimum touch target at the default size.
 */
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[color,background-color,border-color,transform,box-shadow] duration-150 ease-standard active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-deep-cyan text-white hover:bg-deep-cyan-hover dark:text-[#0b1a30]',
        secondary: 'border border-navy/80 bg-paper text-navy hover:bg-cyan-wash',
        quiet: 'text-deep-cyan underline-offset-4 hover:underline active:scale-100',
        onBlue:
          'bg-white text-hero-deep shadow-[0_6px_20px_-6px_rgb(4_30_70/0.55)] hover:bg-[#eaf6fd] hover:shadow-[0_10px_28px_-8px_rgb(4_30_70/0.6)] dark:text-[#083f7a]',
        onBlueOutline: 'border border-white/70 text-white hover:bg-white/10',
      },
      size: {
        md: 'min-h-11 px-5 text-base',
        sm: 'min-h-9 px-3.5 text-sm',
        lg: 'min-h-12 px-6 text-lg',
        xl: 'min-h-14 px-8 text-xl',
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
