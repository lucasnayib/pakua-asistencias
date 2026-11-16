"use client";

import { ReactNode } from "react";

type AccordionItem = {
  question: string;
  answer: ReactNode;
};

/** FAQ en acordeón, usando <details>/<summary> nativos: no necesita estado propio ni JS para
 * abrir/cerrar, y el navegador ya resuelve accesibilidad (teclado, foco) gratis. El ícono +/–
 * es puro CSS sobre el estado [open] del <details>. */
export function Accordion({ items }: { items: AccordionItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map((item) => (
        <details key={item.question} className="group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">
            {item.question}
            <span className="relative h-4 w-4 shrink-0 text-muted-foreground">
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="h-px w-3 bg-current" />
              </span>
              <span className="absolute inset-0 flex items-center justify-center transition-transform duration-200 group-open:rotate-90">
                <span className="h-3 w-px bg-current" />
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
