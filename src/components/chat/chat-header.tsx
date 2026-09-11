export function ChatHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/60 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/50">
      <div className="mx-auto flex h-14 max-w-160 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
          >
            R
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">Resolv-HQ</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-signal/25 bg-signal/10 py-1 pr-2.5 pl-1.5 text-sm font-medium text-signal">
          <span className="relative flex size-1.5">
            <span className="motion-safe:absolute motion-safe:inline-flex motion-safe:size-full motion-safe:animate-ping motion-safe:rounded-full motion-safe:bg-signal motion-safe:opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
          </span>
          Agent online
        </div>
      </div>
    </header>
  )
}
