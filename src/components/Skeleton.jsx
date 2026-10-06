/* ─── primitives ─── */

// Single pulsing placeholder. Decorative only, so it's hidden from screen readers;
// the surrounding <SkeletonShell> announces the loading state once instead.
// `motion-reduce:animate-none` respects prefers-reduced-motion.
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}
    />
  )
}

// Card chrome shared by every skeleton so it matches the real cards
// (same border / background / radius as the Dashboard + Feedback cards).
export function SkeletonCard({ className = '', children }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

// Wrapper that tells assistive tech "this region is loading" exactly once.
function SkeletonShell({ label = 'Loading', className = '', children }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

// Title + subtitle on the left, action button on the right.
// Used by every list-style page skeleton.
function PageHeaderSkeleton({ titleW = 'w-32', subW = 'w-20', actionW = 'w-28' }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonBlock className={`h-8 ${titleW}`} />
        <SkeletonBlock className={`h-4 ${subW}`} />
      </div>
      <SkeletonBlock className={`h-9 ${actionW}`} />
    </div>
  )
}

/* ─── page skeletons ─── */

export function SubjectsSkeleton() {
  return (
    <SkeletonShell label="Loading subjects" className="space-y-6">
      <PageHeaderSkeleton titleW="w-32" subW="w-20" actionW="w-28" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-3 h-3 rounded-full" />
              <SkeletonBlock className="h-6 w-40" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 flex-1" />
              <SkeletonBlock className="h-8 flex-1" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonShell>
  )
}

export function AssignmentsSkeleton() {
  return (
    <SkeletonShell label="Loading assignments" className="space-y-6">
      <PageHeaderSkeleton titleW="w-40" subW="w-24" actionW="w-36" />
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-8 w-20" />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="p-4 flex items-start gap-4">
            <SkeletonBlock className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-48" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonShell>
  )
}

export function GradesSkeleton() {
  return (
    <SkeletonShell label="Loading grades" className="space-y-6">
      <PageHeaderSkeleton titleW="w-24" subW="w-20" actionW="w-28" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} className="p-5 space-y-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-4 w-8" />
          </SkeletonCard>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} className="p-4 flex items-center gap-4">
            <SkeletonBlock className="w-14 h-14 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-40" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            </div>
            <SkeletonBlock className="h-7 w-10 flex-shrink-0" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonShell>
  )
}

export function NotesSkeleton() {
  return (
    <SkeletonShell label="Loading notes" className="space-y-6">
      <PageHeaderSkeleton titleW="w-24" subW="w-16" actionW="w-28" />
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 flex-1" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} className="p-5 space-y-3">
            <SkeletonBlock className="h-5 w-36" />
            <div className="space-y-1.5">
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
              <SkeletonBlock className="h-3 w-3/5" />
            </div>
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonShell>
  )
}

// Mirrors the real Feedback page (max-w-2xl, composer + feed).
// Swap this in for the inline skeleton in Feedback.jsx if you like.
export function FeedbackSkeleton() {
  return (
    <SkeletonShell label="Loading feedback" className="space-y-4 max-w-2xl mx-auto">
      <div className="space-y-2 px-1">
        <SkeletonBlock className="h-8 w-52" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <SkeletonCard className="p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
          <SkeletonBlock className="h-14 flex-1" />
        </div>
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-7 w-20 rounded-full" />)}
        </div>
      </SkeletonCard>
      {[...Array(3)].map((_, i) => (
        <SkeletonCard key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-4/5" />
          </div>
        </SkeletonCard>
      ))}
    </SkeletonShell>
  )
}

// A titled section with N full-width row placeholders (classes / assignments / reminders).
function DashboardListSectionSkeleton({ titleW = 'w-40', rows = 2 }) {
  return (
    <div className="space-y-3">
      <SkeletonBlock className={`h-5 ${titleW}`} />
      {[...Array(rows)].map((_, i) => (
        <SkeletonCard key={i} className="rounded-2xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <SkeletonBlock className="w-5 h-5 rounded-full flex-shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-40" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          </div>
          <SkeletonBlock className="h-6 w-20 rounded-full" />
        </SkeletonCard>
      ))}
    </div>
  )
}

// Mirrors the current DashboardHome layout: header, 5 stat cards (2 cols on
// mobile / 5 on lg), 7 quick actions (3 cols / 7), then the three list sections.
export function DashboardSkeleton() {
  return (
    <SkeletonShell label="Loading dashboard" className="space-y-8 max-w-5xl mx-auto pb-8">
      <div className="space-y-2">
        <SkeletonBlock className="h-10 w-72 max-w-full" />
        <SkeletonBlock className="h-5 w-56 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} className="rounded-2xl p-5 space-y-3">
            <SkeletonBlock className="h-6 w-6" />
            <SkeletonBlock className="h-9 w-16" />
            <SkeletonBlock className="h-4 w-24" />
          </SkeletonCard>
        ))}
      </div>

      <div className="space-y-3">
        <SkeletonBlock className="h-5 w-32" />
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-7">
          {[...Array(7)].map((_, i) => (
            <SkeletonBlock key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>

      <DashboardListSectionSkeleton titleW="w-36" rows={2} />
      <DashboardListSectionSkeleton titleW="w-48" rows={3} />
      <DashboardListSectionSkeleton titleW="w-44" rows={2} />
    </SkeletonShell>
  )
}