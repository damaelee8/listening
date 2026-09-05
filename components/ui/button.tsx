import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all outline-none focus-visible:ring-3 focus-visible:ring-cyan-400/30 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 active:translate-y-px',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
        outline: 'border border-slate-700 bg-transparent text-slate-200 hover:border-slate-500 hover:bg-slate-800/70',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
