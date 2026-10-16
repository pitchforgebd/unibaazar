"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import {
  addressSchema,
  passwordSchema,
  profileSchema,
  type AddressInput,
  type PasswordInput,
  type ProfileInput,
} from "@/lib/validation/customer";

type Address = {
  id: string;
  label: "HOME" | "OFFICE" | "OTHER";
  name: string;
  phone: string;
  line1: string;
  area: "inside-dhaka" | "outside-dhaka";
  city: string;
  isDefault: boolean;
};

const labelText: Record<Address["label"], string> = {
  HOME: "Home",
  OFFICE: "Office",
  OTHER: "Other",
};

async function readBody(response: Response): Promise<{ data?: unknown; error?: string }> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return {};
  }
  return body as { data?: unknown; error?: string };
}

export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: "HOME", area: "inside-dhaka" },
  });

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/account/addresses");
      const body = await readBody(response);
      setAddresses(Array.isArray(body.data) ? (body.data as Address[]) : []);
      setLoading(false);
    })();
  }, []);

  async function onSubmit(values: AddressInput) {
    setError("");
    const response = await fetch("/api/v1/account/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? "Could not save that address");
      return;
    }
    setAddresses((current) => [...current, body.data as Address]);
    reset({
      label: "HOME",
      area: "inside-dhaka",
      name: "",
      phone: "",
      line1: "",
      city: "",
    });
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/v1/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAddresses((current) => current.filter((address) => address.id !== id));
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading addresses…</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {addresses.length === 0 ? (
          <li className="rounded-lg bg-card p-4 text-sm text-muted shadow-soft">
            No saved addresses yet.
          </li>
        ) : null}
        {addresses.map((address) => (
          <li key={address.id} className="rounded-lg bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {labelText[address.label]}
                  {address.isDefault ? (
                    <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">{address.line1}</p>
                <p className="text-sm text-muted">
                  {address.city} ·{" "}
                  {address.area === "inside-dhaka" ? "Inside Dhaka" : "Outside Dhaka"}
                </p>
                <p className="text-sm text-muted">{address.phone}</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-red-700"
                onClick={() => onDelete(address.id)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Label
            <select className={`${fieldClass} mt-1`} {...register("label")}>
              <option value="HOME">Home</option>
              <option value="OFFICE">Office</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            Area
            <select className={`${fieldClass} mt-1`} {...register("area")}>
              <option value="inside-dhaka">Inside Dhaka</option>
              <option value="outside-dhaka">Outside Dhaka</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Recipient name
          <input className={`${fieldClass} mt-1`} {...register("name")} />
          {errors.name ? (
            <span className="mt-1 block text-xs text-red-700">{errors.name.message}</span>
          ) : null}
        </label>
        <label className="block text-sm">
          Phone
          <input className={`${fieldClass} mt-1`} {...register("phone")} />
          {errors.phone ? (
            <span className="mt-1 block text-xs text-red-700">
              {errors.phone.message}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          Full address
          <input className={`${fieldClass} mt-1`} {...register("line1")} />
          {errors.line1 ? (
            <span className="mt-1 block text-xs text-red-700">
              {errors.line1.message}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          City
          <input
            className={`${fieldClass} mt-1`}
            placeholder="Dhaka"
            {...register("city")}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isDefault")} />
          Make this the default address
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save address"}
        </button>
      </form>
    </div>
  );
}

export function ProfileForm() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/auth/me");
      const body = await readBody(response);
      const profile = body.data as
        { name?: string; phone?: string; email?: string } | undefined;
      if (profile) {
        reset({ name: profile.name ?? "", email: profile.email ?? "" });
        setPhone(profile.phone ?? "");
      }
      setLoading(false);
    })();
  }, [reset]);

  async function onSubmit(values: ProfileInput) {
    setError("");
    setSaved(false);
    const response = await fetch("/api/v1/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? "Could not save your profile");
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading profile…</p>;
  }

  return (
    <form
      className="max-w-lg space-y-3 rounded-lg bg-card p-5 shadow-soft"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <label className="block text-sm">
        Name
        <input className={`${fieldClass} mt-1`} {...register("name")} />
        {errors.name ? (
          <span className="mt-1 block text-xs text-red-700">{errors.name.message}</span>
        ) : null}
      </label>
      <label className="block text-sm">
        Phone
        <input
          className={`${fieldClass} mt-1 bg-black/5`}
          value={phone}
          disabled
          readOnly
        />
        <span className="mt-1 block text-xs text-muted">
          Your phone number is your login ID and cannot be changed here.
        </span>
      </label>
      <label className="block text-sm">
        Email
        <input className={`${fieldClass} mt-1`} {...register("email")} />
        {errors.email ? (
          <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save profile"}
      </button>
      {saved ? <p className="text-sm text-success">Profile saved.</p> : null}
    </form>
  );
}

export function PasswordForm() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordInput) {
    setError("");
    setSaved(false);
    const response = await fetch("/api/v1/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? "Could not update your password");
      return;
    }
    setSaved(true);
    reset();
  }

  return (
    <form
      className="max-w-lg space-y-3 rounded-lg bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        Current password
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {errors.currentPassword.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        New password
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("nextPassword")}
        />
        {errors.nextPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {errors.nextPassword.message}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        Confirm password
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {errors.confirmPassword.message}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("ink")} disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Update password"}
      </button>
      {saved ? <p className="text-sm text-success">Password updated.</p> : null}
    </form>
  );
}
