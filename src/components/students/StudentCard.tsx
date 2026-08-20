"use client";

import Image from "next/image";

type StudentCardProps = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  present: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function StudentCard({ firstName, lastName, photoUrl, present, onClick, disabled }: StudentCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-center gap-3 rounded-2xl p-3 text-center transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={`relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 transition-all sm:h-36 sm:w-36 ${
          present ? "border-success shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" : "border-border"
        }`}
      >
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${firstName} ${lastName}`}
            fill
            sizes="144px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-surface-2 text-2xl font-semibold text-muted-foreground">
            {firstName[0]}
            {lastName[0]}
          </span>
        )}
        {present && (
          <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-success text-success-foreground shadow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </span>
      <span className="text-sm font-semibold leading-tight sm:text-base">
        {firstName} {lastName}
      </span>
    </button>
  );
}
