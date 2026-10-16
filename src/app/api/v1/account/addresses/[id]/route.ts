import { deleteAddressForSession } from "@/server/account/account";
import { handle } from "@/server/http";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  return handle(async () => {
    await deleteAddressForSession(id);
    return { ok: true };
  });
}
