"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MapPin, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Stagger, StaggerItem } from "@/components/motion";
import { addressSchema, type AddressInput } from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { readBody } from "./readBody";

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

export function AddressBook() {
  const t = useTranslations("account");
  const checkout = useTranslations("checkout");
  const v = useTranslations("validation");
  const labelText: Record<Address["label"], string> = {
    HOME: t("labelHome"),
    OFFICE: t("labelOffice"),
    OTHER: t("labelOther"),
  };
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
      setError(body.error ?? t("errorSaveAddress"));
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
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <Spinner />
        {t("loadingAddresses")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 ? (
        <p className="flex items-center gap-3 rounded-theme bg-card p-5 text-sm text-muted shadow-soft">
          <MapPin aria-hidden="true" className="size-5 shrink-0" />
          {t("noAddresses")}
        </p>
      ) : (
        <Stagger as="ul" className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <StaggerItem
              as="li"
              key={address.id}
              className="flex flex-col gap-3 rounded-theme bg-card p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading font-semibold text-ink">
                  {labelText[address.label]}
                </p>
                {address.isDefault ? (
                  <Badge variant="primary">{t("defaultBadge")}</Badge>
                ) : null}
              </div>
              <address className="flex-1 space-y-0.5 text-sm text-muted not-italic">
                <span className="block text-foreground">{address.line1}</span>
                <span className="block">
                  {address.city} ·{" "}
                  {address.area === "inside-dhaka"
                    ? checkout("areaInsideDhaka")
                    : checkout("areaOutsideDhaka")}
                </span>
                <span className="block">{address.phone}</span>
              </address>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => onDelete(address.id)}
              >
                <Trash2 aria-hidden="true" className="size-4 text-red-600" />
                {t("removeAddress")}
              </Button>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <form
        className="space-y-4 rounded-theme bg-card p-5 shadow-soft"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <h2 className="font-heading text-lg font-semibold text-ink">
          {t("addAddressHeading")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t("fieldLabel")} {...register("label")}>
            <option value="HOME">{t("labelHome")}</option>
            <option value="OFFICE">{t("labelOffice")}</option>
            <option value="OTHER">{t("labelOther")}</option>
          </Select>
          <Select label={t("fieldArea")} {...register("area")}>
            <option value="inside-dhaka">{checkout("areaInsideDhaka")}</option>
            <option value="outside-dhaka">{checkout("areaOutsideDhaka")}</option>
          </Select>
          <Input
            label={t("fieldRecipientName")}
            autoComplete="name"
            error={translatedError(v, errors.name?.message)}
            {...register("name")}
          />
          <Input
            label={t("fieldPhone")}
            inputMode="tel"
            autoComplete="tel"
            error={translatedError(v, errors.phone?.message)}
            {...register("phone")}
          />
        </div>
        <Input
          label={t("fieldFullAddress")}
          autoComplete="street-address"
          error={translatedError(v, errors.line1?.message)}
          {...register("line1")}
        />
        <Input
          label={t("fieldCity")}
          placeholder={t("cityPlaceholder")}
          {...register("city")}
        />
        <Checkbox label={t("makeDefaultCheckbox")} {...register("isDefault")} />
        {error ? (
          <div role="alert">
            <FieldError>{error}</FieldError>
          </div>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("savingAddress") : t("saveAddress")}
        </Button>
      </form>
    </div>
  );
}
