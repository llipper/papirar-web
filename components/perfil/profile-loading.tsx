import { Skeleton } from "@/components/ui/skeleton"

export function ProfileLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-5 px-5 py-10">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </main>
  )
}
