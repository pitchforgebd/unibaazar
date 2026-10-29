"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { homeAction } from "@/app/(admin)/admin/content-actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Stagger, StaggerItem } from "@/components/motion";
import type { HomeSectionRow } from "@/server/admin/content";

export function HomeBoard({ rows }: { rows: HomeSectionRow[] }) {
  const router = useRouter();
  const [sections, setSections] = useState(rows);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dragKey, setDragKey] = useState("");

  function move(index: number, direction: -1 | 1): void {
    const next = index + direction;
    if (next < 0 || next >= sections.length) {
      return;
    }
    const copy = [...sections];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setSections(copy);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Homepage</h1>
        <p className="text-sm text-muted">
          Drag a row, or use the arrows. Featured can take a category slug.
        </p>
      </div>
      <Stagger as="ul" className="space-y-2">
        {sections.map((section, index) => (
          <StaggerItem as="li" key={section.key}>
            <div
              draggable
              onDragStart={() => setDragKey(section.key)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                const from = sections.findIndex((row) => row.key === dragKey);
                if (from < 0 || from === index) {
                  return;
                }
                const copy = [...sections];
                const [item] = copy.splice(from, 1);
                copy.splice(index, 0, item);
                setSections(copy);
              }}
              className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div>
                <p className="font-semibold text-ink">{section.title}</p>
                <p className="text-xs text-muted">{section.key}</p>
                {section.key === "featured" ? (
                  <div className="mt-2 max-w-xs">
                    <Input
                      label="Category slug"
                      value={section.target}
                      onChange={(event) =>
                        setSections((current) =>
                          current.map((row) =>
                            row.key === section.key
                              ? { ...row, target: event.target.value }
                              : row,
                          ),
                        )
                      }
                      placeholder="Optional"
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  label="Show"
                  checked={section.enabled}
                  onChange={(event) =>
                    setSections((current) =>
                      current.map((row) =>
                        row.key === section.key
                          ? { ...row, enabled: event.target.checked }
                          : row,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => move(index, -1)}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => move(index, 1)}
                >
                  Down
                </Button>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <Button
        type="button"
        isLoading={pending}
        loadingLabel="Saving…"
        onClick={() => {
          setPending(true);
          void homeAction({
            sections: sections.map((section) => ({
              key: section.key,
              title: section.title,
              enabled: section.enabled,
              target: section.target,
            })),
          }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        Save homepage
      </Button>
      {message ? (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
