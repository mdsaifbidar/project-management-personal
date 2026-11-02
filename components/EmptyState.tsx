export default function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="animate-fade-in rounded-xl border border-dashed border-stone-300 bg-white/50 px-6 py-16 text-center dark:border-stone-700 dark:bg-stone-900/40">
      <p className="text-[15px] font-medium text-stone-600 dark:text-stone-300">
        {title}
      </p>
      {hint ? (
        <p className="mx-auto mt-1 max-w-sm text-sm text-stone-400 dark:text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
