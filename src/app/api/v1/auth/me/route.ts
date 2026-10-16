import { publicAccount } from "@/server/auth/accounts";
import { readSession } from "@/server/auth/session";
import { ApiError, handle } from "@/server/http";

export async function GET() {
  return handle(async () => {
    const session = await readSession();
    if (!session) {
      throw new ApiError(401, "Sign in to see your account");
    }
    return publicAccount(session.userId);
  });
}
