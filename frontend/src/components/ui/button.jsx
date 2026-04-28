import * as React from 'react';
import { cn } from '../../lib/utils';

const buttonStyles = {
  base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 font-[Orbitron] tracking-[0.18em] uppercase',
  variants: {
    default: 'bg-[rgba(180,210,255,0.08)] border border-[rgba(180,210,255,0.42)] text-[rgba(180,210,255,0.90)] shadow-[0_0_20px_rgba(100,160,255,0.08),inset_0_0_20px_rgba(100,160,255,0.04)] backdrop-blur-sm',
    secondary: 'bg-transparent border border-[rgba(180,210,255,0.28)] text-[rgba(180,210,255,0.60)] backdrop-blur-sm',
    ghost: 'bg-transparent border-none text-[rgba(180,210,255,0.55)]',
    destructive: 'bg-red-600/20 border border-red-500/50 text-red-300'
  },
  sizes: {
    default: 'h-9 px-10 py-2 text-[0.60rem]',
    sm: 'h-7 px-5 text-[0.52rem]',
    lg: 'h-11 px-14 text-[0.68rem]',
    icon: 'h-9 w-9'
  }
};

const Button = React.forwardRef(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const classes = cn(
    buttonStyles.base,
    buttonStyles.variants[variant],
    buttonStyles.sizes[size],
    className
  );
  
  return (
    <button
      ref={ref}
      className={classes}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button };
