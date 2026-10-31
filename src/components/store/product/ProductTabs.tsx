"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/controls";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { StarRating } from "@/components/store/product/StarRating";
import {
  questionSchema,
  reviewSchema,
  type QuestionInput,
  type ReviewInput,
} from "@/lib/validation/customer";
import { RichText } from "@/components/store/product/RichText";
import { translatedError } from "@/lib/validation/messages";
import type { ProductQuestion, Review } from "@/types/catalog";

type ProductTabsProps = {
  productSlug: string;
  description: string;
  reviews: Review[];
  questions: ProductQuestion[];
};

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

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" &&
    body &&
    "error" in body &&
    typeof body.error === "string"
    ? body.error
    : fallback;
}

function ReviewForm({ productSlug }: { productSlug: string }) {
  const t = useTranslations("product");
  const v = useTranslations("validation");
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
      setError(await readError(response, t("common.genericError")));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p className="mt-4 text-sm text-success">{t("reviews.form.success")}</p>;
  }

  return (
    <form
      className="mt-4 max-w-md space-y-3 border-t border-ink/5 pt-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        {t("reviews.form.ratingLabel")}
        <select
          className={`${fieldClass} mt-1`}
          {...register("rating", { valueAsNumber: true })}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {t("reviews.form.starOption", { count: value })}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        {t("reviews.form.commentLabel")}
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-primary"
          {...register("comment")}
        />
        {errors.comment ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.comment.message)}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingLabel={t("reviews.form.submitting")}
      >
        {t("reviews.form.submit")}
      </Button>
    </form>
  );
}

function QuestionForm({ productSlug }: { productSlug: string }) {
  const t = useTranslations("product");
  const v = useTranslations("validation");
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
      setError(await readError(response, t("common.genericError")));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p className="mt-4 text-sm text-success">{t("qa.form.success")}</p>;
  }

  return (
    <form
      className="mt-4 max-w-md space-y-3 border-t border-ink/5 pt-4"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        {t("qa.form.questionLabel")}
        <textarea
          rows={3}
          className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2 text-sm outline-none focus:border-primary"
          {...register("question")}
        />
        {errors.question ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.question.message)}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button
        type="submit"
        isLoading={isSubmitting}
        loadingLabel={t("qa.form.submitting")}
      >
        {t("qa.form.submit")}
      </Button>
    </form>
  );
}

function SignInPrompt({ action }: { action: string }) {
  const t = useTranslations("product");
  return (
    <p className="mt-4 text-sm text-muted">
      {t.rich("common.signInPrompt", {
        action,
        link: (chunks) => (
          <Link href="/login" className="font-semibold text-primary underline">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}

export function ProductTabs({
  productSlug,
  description,
  reviews,
  questions,
}: ProductTabsProps) {
  const t = useTranslations("product");
  const signedIn = useSignedIn();

  const items: TabItem[] = [
    {
      value: "description",
      label: t("tabs.description"),
      content: (
        <RichText safeHtml={description} className="text-sm leading-7 text-foreground" />
      ),
    },
    {
      value: "reviews",
      label: <TabLabel text={t("tabs.reviews")} count={reviews.length} />,
      content: (
        <>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted">{t("reviews.empty")}</p>
          ) : (
            <ul className="space-y-4">
              {reviews.map((review) => (
                <li key={review.id} className="border-b border-ink/5 pb-4 last:border-0">
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
          {signedIn === false ? (
            <SignInPrompt action={t("reviews.signInAction")} />
          ) : null}
        </>
      ),
    },
    {
      value: "qa",
      label: <TabLabel text={t("tabs.qa")} count={questions.length} />,
      content: (
        <>
          {questions.length === 0 ? (
            <p className="text-sm text-muted">{t("qa.empty")}</p>
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
          {signedIn === false ? <SignInPrompt action={t("qa.signInAction")} /> : null}
        </>
      ),
    },
  ];

  return (
    <section className="mt-8 rounded-theme bg-card shadow-soft">
      <Tabs
        items={items}
        label={t("tabs.label")}
        listClassName="px-2 sm:px-4"
        panelClassName="px-4 pb-4 sm:px-6 sm:pb-6"
      />
    </section>
  );
}

function TabLabel({ text, count }: { text: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {text}
      {count > 0 ? <Badge>{count}</Badge> : null}
    </span>
  );
}
