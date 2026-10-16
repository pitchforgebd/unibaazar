"use server";

import { revalidatePath } from "next/cache";
import { requireContent } from "@/server/admin/access";
import {
  deleteFaq,
  deleteTestimonial,
  saveBlogCategory,
  saveFaq,
  saveHomeSections,
  saveMenuItem,
  savePage,
  savePost,
  saveTestimonial,
} from "@/server/admin/content";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  blogCategorySchema,
  faqSchema,
  homeSchema,
  idSchema,
  menuItemSchema,
  pageSchema,
  postSchema,
  testimonialSchema,
} from "@/lib/validation/admin-content";

function refresh(): void {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/blog");
  revalidatePath("/admin/content/menus");
  revalidatePath("/admin/content/home");
  revalidatePath("/admin/content/faq");
  revalidatePath("/admin/content/testimonials");
}

export async function pageAction(input: {
  slug: string;
  title: string;
  body: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  ogImage: string;
  focusKeyword: string;
  noIndex: boolean;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = pageSchema.parse(input);
    const message = await savePage(session.userId, parsed);
    refresh();
    revalidatePath(`/${parsed.slug}`);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function blogCategoryAction(input: {
  slug: string;
  name: string;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = blogCategorySchema.parse(input);
    const message = await saveBlogCategory(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function postAction(input: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  categorySlug: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  ogImage: string;
  focusKeyword: string;
  noIndex: boolean;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = postSchema.parse(input);
    const message = await savePost(session.userId, parsed);
    refresh();
    revalidatePath(`/blog/${parsed.slug}`);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function menuItemAction(input: {
  location: string;
  label: string;
  href: string;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = menuItemSchema.parse(input);
    const message = await saveMenuItem(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function faqAction(input: {
  id?: string;
  question: string;
  answer: string;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = faqSchema.parse(input);
    const message = await saveFaq(session.userId, parsed);
    refresh();
    revalidatePath("/faq");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteFaqAction(input: { id: string }): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteFaq(session.userId, parsed.id);
    refresh();
    revalidatePath("/faq");
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function testimonialAction(input: {
  id?: string;
  name: string;
  quote: string;
  rating: string;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = testimonialSchema.parse(input);
    const message = await saveTestimonial(session.userId, parsed);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function deleteTestimonialAction(input: {
  id: string;
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = idSchema.parse(input);
    const message = await deleteTestimonial(session.userId, parsed.id);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function homeAction(input: {
  sections: { key: string; title: string; enabled: boolean; target: string }[];
}): Promise<ActionResult> {
  const session = await requireContent();
  try {
    const parsed = homeSchema.parse(input);
    const message = await saveHomeSections(session.userId, parsed.sections);
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
