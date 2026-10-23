"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { menuItemAction } from "@/app/(admin)/admin/content-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type MenuRow = {
  location: string;
  name: string;
  items: { id: string; label: string; href: string }[];
};

export function MenuBoard({ menus }: { menus: MenuRow[] }) {
  const router = useRouter();
  const [location, setLocation] = useState("footer");
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("/");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Menus</h1>
        <p className="text-sm text-muted">
          Header, footer, mobile, and the footer service group.
        </p>
      </div>
      {menus.map((menu) => (
        <section key={menu.location} className="rounded-theme bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">
            {menu.name} · {menu.location}
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {menu.items.map((item) => (
              <li key={item.id}>
                {item.label} · {item.href}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void menuItemAction({ location, label, href }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <div className="sm:col-span-2">
          <Select
            label="Menu"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="header">Header</option>
            <option value="footer">Footer</option>
            <option value="mobile">Mobile</option>
            <option value="footer-service">Footer service</option>
          </Select>
        </div>
        <Input
          label="Label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <Input
          label="Link"
          value={href}
          onChange={(event) => setHref(event.target.value)}
        />
        <div className="sm:col-span-2">
          <Button type="submit" isLoading={pending} loadingLabel="Saving…">
            Save link
          </Button>
        </div>
        {message ? (
          <p role="status" className="text-sm text-foreground sm:col-span-2">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
