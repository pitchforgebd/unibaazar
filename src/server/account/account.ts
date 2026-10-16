import bcrypt from "bcryptjs";
import type { Address, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/server/http";
import { readSession } from "@/server/auth/session";
import type { AddressInput, ProfileInput } from "@/lib/validation/customer";

async function currentUser(): Promise<User> {
  const session = await readSession();
  if (!session) {
    throw new ApiError(401, "Sign in to continue");
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    throw new ApiError(401, "Sign in again");
  }
  return user;
}

export async function updateProfileForSession(input: ProfileInput) {
  const user = await currentUser();
  const email = input.email.trim() || null;
  if (email) {
    const conflict = await prisma.user.findFirst({
      where: { email, id: { not: user.id } },
    });
    if (conflict) {
      throw new ApiError(409, "That email is already used by another account");
    }
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: input.name, email },
  });
  await prisma.customer.updateMany({
    where: { userId: user.id },
    data: { name: input.name, email },
  });
  return {
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    email: updated.email ?? "",
  };
}

export async function changePasswordForSession(input: {
  currentPassword: string;
  nextPassword: string;
}): Promise<void> {
  const user = await currentUser();
  if (!user.passwordHash) {
    throw new ApiError(400, "This account signs in with Google or Facebook");
  }
  const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!match) {
    throw new ApiError(401, "Current password is incorrect");
  }
  const passwordHash = await bcrypt.hash(input.nextPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

function presentAddress(row: Address) {
  return {
    id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    area:
      row.area === "INSIDE_DHAKA"
        ? ("inside-dhaka" as const)
        : ("outside-dhaka" as const),
    city: row.city,
    isDefault: row.isDefault,
  };
}

export async function listAddressesForSession() {
  const user = await currentUser();
  const rows = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(presentAddress);
}

export async function createAddressForSession(input: AddressInput) {
  const user = await currentUser();
  const area = input.area === "inside-dhaka" ? "INSIDE_DHAKA" : "OUTSIDE_DHAKA";
  if (input.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }
  const count = await prisma.address.count({ where: { userId: user.id } });
  const row = await prisma.address.create({
    data: {
      userId: user.id,
      label: input.label,
      name: input.name,
      phone: input.phone,
      line1: input.line1,
      area,
      city: input.city?.trim() || "Dhaka",
      isDefault: input.isDefault ?? count === 0,
    },
  });
  return presentAddress(row);
}

export async function deleteAddressForSession(id: string): Promise<void> {
  const user = await currentUser();
  const row = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!row) {
    throw new ApiError(404, "Address not found");
  }
  await prisma.address.delete({ where: { id } });
}
