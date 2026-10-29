"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="primary"
      className="print:hidden"
      onClick={() => window.print()}
    >
      Print or save PDF
    </Button>
  );
}
