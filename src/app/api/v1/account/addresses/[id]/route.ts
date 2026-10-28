import { deleteAddressForSession } from "@/server/account/account";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  const { id } = await context.params;
  return handle(async () => {
    assertSameOrigin(request);
    await deleteAddressForSession(id);
    return { ok: true };
  });
}
