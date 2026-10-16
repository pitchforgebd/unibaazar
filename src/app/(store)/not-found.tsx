import Link from "next/link";
import { MissBeacon } from "@/components/store/seo/MissBeacon";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { PageTitle } from "@/components/store/common/PageTitle";

export default function StoreNotFound() {
  return (
    <>
      <MissBeacon />
      <PageTitle title="Page not found" />
      <Container className="py-10">
        <p className="text-sm text-muted">That page is not on UniBaazar.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary")}>
            Home
          </Link>
          <Link href="/shop" className={buttonClass("outline")}>
            Shop
          </Link>
        </div>
      </Container>
    </>
  );
}
