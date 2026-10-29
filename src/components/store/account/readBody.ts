/** Reads a `{ data?, error? }` API envelope, tolerating non-JSON bodies. */
export async function readBody(
  response: Response,
): Promise<{ data?: unknown; error?: string }> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return {};
  }
  return body as { data?: unknown; error?: string };
}
