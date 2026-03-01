import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-text-tertiary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`flex h-10 w-full rounded-xl border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${error ? "border-red-500/50 focus:ring-red-500/50" : ""} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
