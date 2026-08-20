import { SelectHTMLAttributes, forwardRef } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, id, ...rest }, ref) => {
    return (
      <label className="flex flex-col gap-1.5 text-sm">
        {label && <span className="font-medium text-foreground">{label}</span>}
        <select
          ref={ref}
          id={id}
          className={`h-10 rounded-lg border bg-surface px-3 text-foreground outline-none transition focus:ring-2 focus:ring-accent/40 ${
            error ? "border-danger" : "border-border"
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <span className="text-xs text-danger">{error}</span>}
      </label>
    );
  }
);

Select.displayName = "Select";
