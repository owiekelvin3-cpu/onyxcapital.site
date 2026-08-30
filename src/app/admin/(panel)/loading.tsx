export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-bg-hover rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-secondary border border-border rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-bg-secondary border border-border rounded-lg" />
    </div>
  );
}
