import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  url?: string;
};

export function actionError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Check the form";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "That value is already used";
    }
    if (error.code === "P2003") {
      return "This record is still used, so it cannot be deleted";
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong";
}
