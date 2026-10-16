import { Container } from "@/components/ui/Container";
import { CartButton } from "@/components/store/layout/CartButton";
import { Logo } from "@/components/store/layout/Logo";
import { MobileMenu } from "@/components/store/layout/MobileMenu";
import { SearchBar } from "@/components/store/layout/SearchBar";

export function Header({ name, logoUrl }: { name?: string; logoUrl?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-card shadow-soft">
      <Container className="py-3">
        <div className="flex items-center gap-3 lg:gap-6">
          <MobileMenu />
          <Logo name={name} logoUrl={logoUrl} />
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBar id="site-search-desktop" />
          </div>
          <CartButton />
        </div>
        <div className="mt-3 md:hidden">
          <SearchBar id="site-search-mobile" />
        </div>
      </Container>
    </header>
  );
}
