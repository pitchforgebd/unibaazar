"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteRedirectAction,
  redirectAction,
  robotsAction,
} from "@/app/(admin)/admin/seo-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
};

type MissRow = { path: string; count: number; when: string };

export function SeoManager({
  robots,
  redirects,
  misses,
  origin,
}: {
  robots: string;
  redirects: RedirectRow[];
  misses: MissRow[];
  origin: string;
}) {
  const router = useRouter();
  const [robotsText, setRobotsText] = useState(robots);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">SEO</h1>
        <p className="text-sm text-muted">
          Titles, descriptions, canonical URLs, and focus keywords are edited on each
          product, category, page, and blog post. Filtered shop URLs point their canonical
          at the clean path.
        </p>
      </div>
      <section className="rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Sitemaps</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link className="text-primary" href="/sitemap.xml">
              {`${origin}/sitemap.xml`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/image-sitemap.xml">
              {`${origin}/image-sitemap.xml`}
            </Link>
          </li>
          <li>
            <Link className="text-primary" href="/robots.txt">
              {`${origin}/robots.txt`}
            </Link>
          </li>
        </ul>
      </section>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void robotsAction({ robots: robotsText }).then((result) => {
            setMessage(result.message);
            setPending(false);
          });
        }}
      >
        <h2 className="font-semibold text-ink">robots.txt</h2>
        <textarea
          value={robotsText}
          onChange={(event) => setRobotsText(event.target.value)}
          className="min-h-40 w-full rounded-md border border-black/10 bg-card px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          aria-label="robots.txt"
        />
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save robots.txt
        </button>
      </form>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void redirectAction({ fromPath, toPath, statusCode }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setFromPath("");
              setToPath("");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold text-ink">Redirects</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">From</span>
            <input
              value={fromPath}
              onChange={(event) => setFromPath(event.target.value)}
              className={fieldClass}
              placeholder="/old-page"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">To</span>
            <input
              value={toPath}
              onChange={(event) => setToPath(event.target.value)}
              className={fieldClass}
              placeholder="/shop"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Status</span>
            <select
              value={statusCode}
              onChange={(event) =>
                setStatusCode(event.target.value === "302" ? 302 : 301)
              }
              className={fieldClass}
            >
              <option value={301}>301</option>
              <option value={302}>302</option>
            </select>
          </label>
        </div>
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save redirect
        </button>
      </form>
      <section className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">From</th>
              <th className="px-3 py-3 font-semibold">To</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {redirects.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted" colSpan={4}>
                  No redirects yet.
                </td>
              </tr>
            ) : null}
            {redirects.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">{row.fromPath}</td>
                <td className="px-3 py-3">{row.toPath}</td>
                <td className="px-3 py-3">{row.statusCode}</td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    className={buttonClass("outline")}
                    onClick={() => {
                      if (!window.confirm("Remove this redirect?")) {
                        return;
                      }
                      void deleteRedirectAction({ id: row.id }).then((result) => {
                        setMessage(result.message);
                        if (result.ok) {
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <h2 className="px-3 py-3 font-semibold text-ink">404 log</h2>
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Path</th>
              <th className="px-3 py-3 font-semibold">Hits</th>
              <th className="px-3 py-3 font-semibold">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {misses.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted" colSpan={3}>
                  No missing pages yet.
                </td>
              </tr>
            ) : null}
            {misses.map((row) => (
              <tr key={row.path} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">{row.path}</td>
                <td className="px-3 py-3">{row.count}</td>
                <td className="px-3 py-3">{row.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </div>
  );
}
