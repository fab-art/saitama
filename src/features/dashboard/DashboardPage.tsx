export function DashboardPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="text-5xl mb-4">🏠</span>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-void-400 text-sm max-w-xs">
        Your rank, XP bar, streak, and today's workout target will appear here.
      </p>
    </div>
  )
}
