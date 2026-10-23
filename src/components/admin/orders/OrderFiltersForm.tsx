import Link from "next/link";
import { prettyStatus } from "./labels";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { orderStatuses } from "@/lib/validation/admin-orders";
import type { OrderListQuery } from "@/server/admin/orders-admin";

export function OrderFiltersForm({ query }: { query: OrderListQuery }) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
    >
      <Input
        name="q"
        label="Search"
        defaultValue={query.q}
        placeholder="Order ID, phone, or name"
        containerClassName="sm:col-span-2"
      />
      <Select name="status" label="Status" defaultValue={query.status}>
        <option value="">Any status</option>
        {orderStatuses.map((item) => (
          <option key={item} value={item}>
            {prettyStatus(item)}
          </option>
        ))}
      </Select>
      <Select name="payment" label="Payment" defaultValue={query.payment}>
        <option value="">Any method</option>
        {["COD", "BKASH", "NAGAD", "ROCKET", "CARD"].map((item) => (
          <option key={item} value={item}>
            {prettyStatus(item)}
          </option>
        ))}
      </Select>
      <Select
        name="paymentStatus"
        label="Payment status"
        defaultValue={query.paymentStatus}
      >
        <option value="">Any</option>
        {["PENDING", "PAID", "FAILED", "REFUNDED"].map((item) => (
          <option key={item} value={item}>
            {prettyStatus(item)}
          </option>
        ))}
      </Select>
      <Select name="courier" label="Courier" defaultValue={query.courier}>
        <option value="">Any</option>
        <option value="steadfast">Steadfast</option>
        <option value="none">No shipment</option>
      </Select>
      <Select name="area" label="Area" defaultValue={query.area}>
        <option value="">Any area</option>
        <option value="INSIDE_DHAKA">Inside Dhaka</option>
        <option value="OUTSIDE_DHAKA">Outside Dhaka</option>
      </Select>
      <Input type="date" name="from" label="From" defaultValue={query.from} />
      <Input type="date" name="to" label="To" defaultValue={query.to} />
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit">Apply filters</Button>
        <Link href="/admin/orders" className={buttonStyles({ variant: "outline" })}>
          Clear
        </Link>
      </div>
    </form>
  );
}
