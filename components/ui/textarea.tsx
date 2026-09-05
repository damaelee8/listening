import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn('min-h-36 w-full resize-none rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-4 text-base leading-8 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-3 focus:ring-cyan-400/10', className)}
      {...props}
    />
  );
}

export { Textarea };
