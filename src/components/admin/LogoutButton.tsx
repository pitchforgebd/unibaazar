"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="text-sm font-semibold text-primary"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void fetch("/api/v1/auth/logout", { method: "POST" }).then(() => {
          router.push("/login");
          router.refresh();
        });
      }}
    >
      Log out
    </button>
  );
}
