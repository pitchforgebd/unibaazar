import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { StockBoard } from "@/components/admin/inventory/StockBoard";
import { catalogAccess } from "@/server/admin/access";
import { listStock, listWarehouses, parseStockQuery } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "Inventory" };

type InventoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const query = parseStockQuery(await searchParams);
  const [list, warehouses] = await Promise.all([listStock(query), listWarehouses()]);
  return (
    <div className="space-y-4">
      <InventoryNav />
      <StockBoard
        rows={list.rows}
        query={query}
        page={list.page}
        pages={list.pages}
        total={list.total}
        out={list.out}
        low={list.low}
        warehouses={warehouses}
      />
    </div>
  );
}
