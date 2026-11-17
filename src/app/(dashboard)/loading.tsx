import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while any dashboard-area page loads on the server, so
// navigation responds right away instead of appearing frozen.
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
