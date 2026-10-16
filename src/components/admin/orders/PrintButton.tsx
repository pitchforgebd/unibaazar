"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white print:hidden"
    >
      Print or save PDF
    </button>
  );
}
