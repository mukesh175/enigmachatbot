export default function RootLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center font-bold text-white animate-pulse">
          L
        </div>
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
