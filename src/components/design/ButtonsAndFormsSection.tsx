"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/RadioGroup";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const VARIANTS = ["primary", "outline", "ghost", "destructive"] as const;
const SIZES = ["sm", "md", "lg"] as const;
const BADGES = ["default", "primary", "accent", "success", "outline"] as const;

export function ButtonsAndFormsSection() {
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState("inside-dhaka");
  const [agree, setAgree] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Buttons
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {VARIANTS.flatMap((variant) =>
            SIZES.map((size) => (
              <Button key={`${variant}-${size}`} variant={variant} size={size}>
                {variant} {size}
              </Button>
            )),
          )}
          <Button
            variant="primary"
            isLoading={loading}
            loadingLabel="Saving"
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 1500);
            }}
          >
            Click to load
          </Button>
          <IconButton aria-label="Add to wishlist" variant="outline">
            <Heart className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Badges
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {BADGES.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Form fields
        </h3>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Input label="Full name" placeholder="Rahim Uddin" />
          <Input
            label="Phone"
            placeholder="01XXXXXXXXX"
            error="Enter a valid Bangladeshi mobile number"
          />
          <Textarea label="Delivery note" hint="Optional — gate code, landmark, etc." />
          <Select label="City" defaultValue="dhaka">
            <option value="dhaka">Dhaka</option>
            <option value="chattogram">Chattogram</option>
            <option value="khulna">Khulna</option>
          </Select>
          <RadioGroup label="Delivery area" value={area} onValueChange={setArea}>
            <Radio value="inside-dhaka" label="Inside Dhaka" />
            <Radio value="outside-dhaka" label="Outside Dhaka" />
          </RadioGroup>
          <Checkbox
            label="I agree to the terms"
            checked={agree}
            onChange={(event) => setAgree(event.target.checked)}
          />
        </div>
      </div>
    </div>
  );
}
