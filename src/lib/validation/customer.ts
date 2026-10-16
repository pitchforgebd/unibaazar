import { z } from "zod";

export function normalizeBdPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

export const phoneField = z
  .string()
  .trim()
  .refine((value) => normalizeBdPhone(value) !== null, {
    message: "Enter a valid Bangladeshi mobile number",
  });

export const captchaToken = z.string().trim().optional();

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: phoneField,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  address: z.string().trim().min(8, "Enter the full delivery address"),
  area: z.enum(["inside-dhaka", "outside-dhaka"]),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "rocket", "card"]),
  captchaToken,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const loginSchema = z.object({
  identity: z.string().trim().min(3, "Enter your phone or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  captchaToken,
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name"),
    phone: phoneField,
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm your password"),
    captchaToken,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotSchema = z.object({
  identity: z.string().trim().min(3, "Enter your phone or email"),
  captchaToken,
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: phoneField,
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  message: z.string().trim().min(10, "Write a short message"),
  captchaToken,
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  captchaToken,
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5, "Choose a rating"),
  comment: z.string().trim().min(10, "Write a short review"),
});

export const questionSchema = z.object({
  question: z.string().trim().min(5, "Enter your question"),
});

export const trackSchema = z.object({
  orderId: z.string().trim().min(4, "Enter the order ID"),
  phone: phoneField,
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Enter your current password"),
    nextPassword: z.string().min(6, "Use at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm the new password"),
  })
  .refine((value) => value.nextPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
});

export const addressSchema = z.object({
  label: z.enum(["HOME", "OFFICE", "OTHER"]),
  name: z.string().trim().min(2, "Enter a name"),
  phone: phoneField,
  line1: z.string().trim().min(8, "Enter the full address"),
  area: z.enum(["inside-dhaka", "outside-dhaka"]),
  city: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
