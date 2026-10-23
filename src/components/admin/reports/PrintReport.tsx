"use client";

import { Button } from "@/components/ui/Button";

export function PrintReport() {
  return (
    <Button className="print:hidden" onClick={() => window.print()}>
      Save as PDF
    </Button>
  );
}
