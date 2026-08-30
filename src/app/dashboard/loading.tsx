export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6 animate-pulse">
      <div className="h-64 sm:h-72 rounded-2xl bg-bg-secondary border border-border" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] rounded-xl bg-bg-secondary border border-border" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-bg-secondary border border-border" />
        ))}
      </div>
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-bg-secondary border border-border" />
        <div className="lg:col-span-3 h-72 rounded-2xl bg-bg-secondary border border-border" />
      </div>
    </div>
  );
}
