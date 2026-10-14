import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../lib/cn.js';

/*
  FOUR VARIANTS, AND THE PRIMARY ONE IS INK, NOT BLUE.

  A light button on a dark tool is the loudest object on the screen without a
  colour of its own — which leaves blue to mean "interactive" and nothing more,
  and leaves every provenance colour to mean only what it means. `aria-busy` is
  the loading state: the label stays, so the button does not change width under
  the pointer, and a spinner is not the only sign anything is happening.
*/
const button = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97]',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-busy:cursor-progress aria-busy:opacity-80',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-inverse text-on-inverse hover:bg-fg/90 active:bg-fg/80',
        /*
          The one gradient button, for the page's single most important action. Both
          stops are solid brand tones measured at 4.5:1 under white in both themes; the
          glow on hover is a shadow, so it costs the label nothing.
        */
        brand:
          'bg-linear-to-r from-brand-solid to-brand-alt-solid text-on-brand shadow-[0_8px_24px_-8px_var(--brand-alt-solid)] ' +
          'hover:shadow-[0_12px_32px_-8px_var(--brand-alt-solid)] hover:brightness-110',
        secondary: 'border border-line bg-raised text-fg hover:border-strong hover:bg-hover',
        ghost: 'text-secondary hover:bg-hover hover:text-fg',
        accent: 'border border-accent/40 bg-accent-subtle text-accent-strong hover:border-accent hover:text-fg',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9 px-3.5 text-sm',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  /** Render the child (a link) with the button's look instead of a `<button>`. */
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
});
