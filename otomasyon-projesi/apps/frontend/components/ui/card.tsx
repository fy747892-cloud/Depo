import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-blue-100 bg-white p-5 shadow-sm shadow-blue-950/5', className)} {...props} />;
}
