import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-glow-purple-sm hover:shadow-glow-purple hover:scale-[1.01]",
      secondary:
        "bg-bg-surface border border-border-default text-text-tertiary hover:bg-bg-surface-hover hover:border-border-hover hover:text-text-primary",
      ghost:
        "text-text-muted hover:bg-bg-input hover:text-text-primary",
      danger:
        "bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 hover:text-red-300",
      gradient:
        "bg-gradient-to-br from-violet-500 to-cyan-500 text-white shadow-glow-purple-lg hover:scale-[1.02]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
