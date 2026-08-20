import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        {label && <span className="font-medium text-foreground">{label}</span>}
        <input
          ref={ref}
          id={id}
          className={`h-10 rounded-lg border bg-surface px-3 text-foreground outline-none transition focus:ring-2 focus:ring-accent/40 ${
            error ? "border-danger" : "border-border"
          } ${className}`}
          {...rest}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </label>
    );
  }
);

Input.displayName = "Input";
