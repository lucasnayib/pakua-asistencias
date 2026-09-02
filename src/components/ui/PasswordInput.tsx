"use client";

import { InputHTMLAttributes, forwardRef, useId, useState } from "react";

type PasswordInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A9.7 9.7 0 0 1 12 4c7 0 11 7 11 7a20.3 20.3 0 0 1-2.66 3.79M14.12 14.12a3 3 0 1 1-4.24-4.24"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <label htmlFor={inputId} className="flex flex-col gap-1.5 text-sm">
        {label && <span className="font-medium text-foreground">{label}</span>}
        <span className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className={`h-10 w-full rounded-lg border bg-surface px-3 pr-10 text-foreground outline-none transition focus:ring-2 focus:ring-accent/40 ${
              error ? "border-danger" : "border-border"
            } ${className}`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2 flex items-center justify-center text-white"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </span>
        {error && <span className="text-xs text-danger">{error}</span>}
      </label>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
