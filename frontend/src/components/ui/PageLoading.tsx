interface PageLoadingProps {
  message: string;
}

export default function PageLoading({ message }: PageLoadingProps) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)] motion-reduce:animate-none" />
      <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>
    </div>
  );
}
