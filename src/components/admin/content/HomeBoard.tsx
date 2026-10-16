"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { homeAction } from "@/app/(admin)/admin/content-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
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
      <ul className="space-y-2">
        {sections.map((section, index) => (
          <li
            key={section.key}
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
            className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <p className="font-semibold text-ink">{section.title}</p>
              <p className="text-xs text-muted">{section.key}</p>
              {section.key === "featured" ? (
                <label className="mt-2 block text-sm">
                  <span className="mb-1 block font-semibold text-ink">Category slug</span>
                  <input
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
                    className={fieldClass}
                  />
                </label>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
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
                Show
              </label>
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={() => move(index, -1)}
              >
                Up
              </button>
              <button
                type="button"
                className={buttonClass("outline")}
                onClick={() => move(index, 1)}
              >
                Down
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={buttonClass()}
        disabled={pending}
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
      </button>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </div>
  );
}
