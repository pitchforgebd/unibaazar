// Maps the raw English messages defined in src/lib/validation/customer.ts to
// their src/locales/*.json "validation" namespace key. Zod schemas stay in
// English (they're also parsed server-side in API routes) — this lookup only
// translates the message where it's rendered in a client form.
const messageKeys: Record<string, string> = {
  "Enter your name": "name",
  "Enter a valid email": "email",
  "Enter a valid Bangladeshi mobile number": "phone",
  "Password must be at least 6 characters": "passwordMin",
  "Confirm your password": "confirmPassword",
  "Passwords do not match": "passwordsMismatch",
  "Enter the full delivery address": "address",
  "Write a short review": "comment",
  "Choose a rating": "rating",
  "Enter your question": "question",
  "Write a short message": "message",
  "Enter the order ID": "orderId",
  "Enter your current password": "currentPassword",
  "Use at least 6 characters": "newPasswordMin",
  "Confirm the new password": "confirmNewPassword",
  "Enter a name": "addressName",
  "Enter the full address": "addressLine1",
};

export function translatedError(
  t: (key: string) => string,
  message: string | undefined,
): string | undefined {
  if (!message) {
    return undefined;
  }
  const key = messageKeys[message];
  return key ? t(key) : message;
}
