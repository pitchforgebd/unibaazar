"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  importReviewsAction,
  moderateReviewAction,
} from "@/app/(admin)/admin/catalog-actions";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useToastStore } from "@/store/toast";

function statusVariant(status: string): BadgeVariant {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "outline";
  return "default";
}

export function ReviewList({
  reviews,
  status,
}: {
  status: string;
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    comment: string;
    status: string;
    product: { name: string };
  }[];
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [csv, setCsv] = useState("slug,author,rating,comment\n");
  const [importing, setImporting] = useState(false);
  const [moderatingId, setModeratingId] = useState("");

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-end gap-2" action="/admin/reviews">
        <Select label="Review status" hideLabel name="status" defaultValue={status}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
        <Button type="submit">Filter</Button>
      </form>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setImporting(true);
          void importReviewsAction(csv).then((result) => {
            setImporting(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) router.refresh();
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">Import UGC reviews</h2>
        <p className="text-sm text-muted">
          Paste CSV with slug, author, rating, and comment. Imported reviews are approved.
        </p>
        <Textarea
          label="Review CSV"
          hideLabel
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          className="min-h-24 font-mono text-xs"
        />
        <Button type="submit" isLoading={importing}>
          Import CSV
        </Button>
      </form>
      <Stagger as="div" className="space-y-3">
        {reviews.map((review) => (
          <StaggerItem key={review.id}>
            <article className="rounded-theme bg-card p-4 shadow-soft">
              <p className="text-sm font-semibold text-ink">{review.product.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                {review.authorName} · {review.rating}/5
                <Badge variant={statusVariant(review.status)}>{review.status}</Badge>
              </p>
              <p className="mt-2 text-sm text-foreground">{review.comment}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  isLoading={moderatingId === `${review.id}-APPROVED`}
                  onClick={() => {
                    setModeratingId(`${review.id}-APPROVED`);
                    void moderateReviewAction(review.id, "APPROVED").then((result) => {
                      setModeratingId("");
                      push({
                        message: result.message,
                        type: result.ok ? "success" : "error",
                      });
                      if (result.ok) router.refresh();
                    });
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  isLoading={moderatingId === `${review.id}-REJECTED`}
                  onClick={() => {
                    setModeratingId(`${review.id}-REJECTED`);
                    void moderateReviewAction(review.id, "REJECTED").then((result) => {
                      setModeratingId("");
                      push({
                        message: result.message,
                        type: result.ok ? "success" : "error",
                      });
                      if (result.ok) router.refresh();
                    });
                  }}
                >
                  Reject
                </Button>
              </div>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
