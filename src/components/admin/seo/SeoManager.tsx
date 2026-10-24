"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteRedirectAction,
  redirectAction,
  robotsAction,
} from "@/app/(admin)/admin/seo-actions";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";

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
  const push = useToastStore((state) => state.push);
  const [robotsText, setRobotsText] = useState(robots);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [robotsPending, setRobotsPending] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RedirectRow | null>(null);
  const [removing, setRemoving] = useState(false);

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
      <section className="rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Sitemaps</h2>
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
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setRobotsPending(true);
          void robotsAction({ robots: robotsText }).then((result) => {
            setRobotsPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">robots.txt</h2>
        <Textarea
          label="robots.txt"
          hideLabel
          value={robotsText}
          onChange={(event) => setRobotsText(event.target.value)}
          className="min-h-40 font-mono text-sm"
        />
        <Button type="submit" isLoading={robotsPending}>
          Save robots.txt
        </Button>
      </form>
      <form
        id="redirect-form"
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setRedirectPending(true);
          void redirectAction({ fromPath, toPath, statusCode }).then((result) => {
            setRedirectPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              setFromPath("");
              setToPath("");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">Redirects</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="From"
            value={fromPath}
            onChange={(event) => setFromPath(event.target.value)}
            placeholder="/old-page"
          />
          <Input
            label="To"
            value={toPath}
            onChange={(event) => setToPath(event.target.value)}
            placeholder="/shop"
          />
          <Select
            label="Status"
            value={statusCode}
            onChange={(event) => setStatusCode(event.target.value === "302" ? 302 : 301)}
          >
            <option value={301}>301</option>
            <option value={302}>302</option>
          </Select>
        </div>
        <Button type="submit" isLoading={redirectPending}>
          Save redirect
        </Button>
      </form>
      <section className="overflow-x-auto rounded-theme bg-card shadow-soft">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveTarget(row)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <h2 className="px-3 py-3 font-heading font-semibold text-ink">404 log</h2>
        <table className="min-w-[520px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Path</th>
              <th className="px-3 py-3 font-semibold">Hits</th>
              <th className="px-3 py-3 font-semibold">Last seen</th>
              <th className="px-3 py-3 font-semibold"> </th>
            </tr>
          </thead>
          <tbody>
            {misses.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-muted" colSpan={4}>
                  No missing pages yet.
                </td>
              </tr>
            ) : null}
            {misses.map((row) => (
              <tr key={row.path} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">{row.path}</td>
                <td className="px-3 py-3">{row.count}</td>
                <td className="px-3 py-3">{row.when}</td>
                <td className="px-3 py-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFromPath(row.path);
                      document
                        .getElementById("redirect-form")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                  >
                    Create redirect
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove redirect"
        description={
          removeTarget
            ? `Remove the redirect from "${removeTarget.fromPath}" to "${removeTarget.toPath}"?`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isLoading={removing}
        loadingLabel="Removing…"
        onConfirm={() => {
          if (!removeTarget) return;
          setRemoving(true);
          void deleteRedirectAction({ id: removeTarget.id }).then((result) => {
            setRemoving(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) {
              setRemoveTarget(null);
              router.refresh();
            }
          });
        }}
      />
    </div>
  );
}
