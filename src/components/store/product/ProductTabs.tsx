"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { StarRating } from "@/components/store/product/StarRating";
import {
  questionSchema,
  reviewSchema,
  type QuestionInput,
  type ReviewInput,
} from "@/lib/validation/customer";
import type { ProductQuestion, Review } from "@/types/catalog";

type ProductTabsProps = {
  productSlug: string;
  description: string;
  reviews: Review[];
  questions: ProductQuestion[];
};

const tabs = ["Description", "Reviews", "Q&A"] as const;

function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/auth/me");
      setSignedIn(response.ok);
    })();
  }, []);
  return signedIn;
}

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" &&
    body &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : "Something went wrong. Try again.";
}

function ReviewForm({ productSlug }: { productSlug: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: "" },
  });

  async function onSubmit(values: ReviewInput) {
    setError("");
    const response = await fetch(`/api/v1/products/${productSlug}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, rating: Number(values.rating) }),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-4 text-sm text-success">
        Thanks! Your review is pending approval.
      </p>
    );
  }

  return (
    <form
      className="mt-4 max-w-md space-y-3 border-t border-black/5 pt-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        Rating
        <select
          className={`${fieldClass} mt-1`}
          {...register("rating", { valueAsNumber: true })}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Your review
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
          {...register("comment")}
        />
        {errors.comment ? (
          <span className="mt-1 block text-xs text-red-700">
            {errors.comment.message}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

function QuestionForm({ productSlug }: { productSlug: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<QuestionInput>({ resolver: zodResolver(questionSchema) });

  async function onSubmit(values: QuestionInput) {
    setError("");
    const response = await fetch(`/api/v1/products/${productSlug}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p className="mt-4 text-sm text-success">Thanks! We will answer soon.</p>;
  }

  return (
    <form
      className="mt-4 max-w-md space-y-3 border-t border-black/5 pt-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        Ask a question
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
          {...register("question")}
        />
        {errors.question ? (
          <span className="mt-1 block text-xs text-red-700">
            {errors.question.message}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit question"}
      </button>
    </form>
  );
}

function SignInPrompt({ action }: { action: string }) {
  return (
    <p className="mt-4 text-sm text-muted">
      <Link href="/login" className="font-semibold text-primary">
        Sign in
      </Link>{" "}
      to {action}.
    </p>
  );
}

export function ProductTabs({
  productSlug,
  description,
  reviews,
  questions,
}: ProductTabsProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Description");
  const signedIn = useSignedIn();

  return (
    <section className="mt-8 rounded-lg bg-card shadow-soft">
      <div className="flex overflow-x-auto border-b border-black/5">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
            className={`h-12 px-4 text-sm font-semibold ${
              tab === item ? "border-b-2 border-primary text-primary" : "text-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="p-4 sm:p-6">
        {tab === "Description" ? (
          <p className="text-sm leading-7 text-foreground">{description}</p>
        ) : null}
        {tab === "Reviews" ? (
          <>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted">No reviews yet.</p>
            ) : (
              <ul className="space-y-4">
                {reviews.map((review) => (
                  <li
                    key={review.id}
                    className="border-b border-black/5 pb-4 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{review.author}</p>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="mt-2 text-sm text-muted">{review.comment}</p>
                  </li>
                ))}
              </ul>
            )}
            {signedIn ? <ReviewForm productSlug={productSlug} /> : null}
            {signedIn === false ? <SignInPrompt action="write a review" /> : null}
          </>
        ) : null}
        {tab === "Q&A" ? (
          <>
            {questions.length === 0 ? (
              <p className="text-sm text-muted">No questions yet.</p>
            ) : (
              <ul className="space-y-4">
                {questions.map((question) => (
                  <li key={question.id}>
                    <p className="text-sm font-semibold text-ink">
                      {question.author}: {question.question}
                    </p>
                    <p className="mt-1 text-sm text-muted">{question.answer}</p>
                  </li>
                ))}
              </ul>
            )}
            {signedIn ? <QuestionForm productSlug={productSlug} /> : null}
            {signedIn === false ? <SignInPrompt action="ask a question" /> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
