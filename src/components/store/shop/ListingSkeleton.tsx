import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

export function ListingSkeleton() {
  return (
    <Container className="py-6">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Skeleton className="h-80" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      </div>
    </Container>
  );
}

export function ProductSkeleton() {
  return (
    <Container className="py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-11 w-40" />
        </div>
      </div>
    </Container>
  );
}

export function PageSkeleton() {
  return (
    <Container className="space-y-4 py-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-48" />
        ))}
      </div>
    </Container>
  );
}
