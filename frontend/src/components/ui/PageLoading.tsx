import Skeleton from "@/components/atoms/Skeleton";

interface PageLoadingProps {
  message: string;
}

export default function PageLoading({ message }: PageLoadingProps) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <Skeleton variant="circular" width={32} height={32} className="motion-reduce:animate-none" />
      <p className="text-sm text-[var(--foreground-muted)]">{message}</p>
    </div>
  );
}
