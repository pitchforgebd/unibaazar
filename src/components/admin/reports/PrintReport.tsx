"use client";

export function PrintReport() {
  return (
    <button
      type="button"
      className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white print:hidden"
      onClick={() => window.print()}
    >
      Save as PDF
    </button>
  );
}
