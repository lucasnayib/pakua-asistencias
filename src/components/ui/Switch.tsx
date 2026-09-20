"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
};

export function Switch({ checked, onChange, disabled, label }: SwitchProps) {
  return (
    <label className="inline-flex items-center gap-3">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-accent" : "border border-border bg-surface-2"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-key transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
