export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`} />
  )
}

export function SubjectsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-32" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-3 h-3 rounded-full" />
              <SkeletonBlock className="h-6 w-40" />
            </div>
            <div className="flex gap-2">
              <SkeletonBlock className="h-8 flex-1" />
              <SkeletonBlock className="h-8 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AssignmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-40" />
          <SkeletonBlock className="h-4 w-24" />
        </div>
        <SkeletonBlock className="h-9 w-36" />
      </div>
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-8 w-20" />)}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex items-start gap-4 shadow-sm">
            <SkeletonBlock className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-48" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-4 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GradesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-2 shadow-sm">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-4 w-8" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <SkeletonBlock className="w-14 h-14 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-5 w-40" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            </div>
            <SkeletonBlock className="h-7 w-10 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-24" />
          <SkeletonBlock className="h-4 w-16" />
        </div>
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 flex-1" />
        <SkeletonBlock className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-3 shadow-sm">
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
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-5 w-56" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-3 shadow-sm">
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-9 w-16" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonBlock key={i} className="h-12" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="h-6 w-48" />
        {[...Array(2)].map((_, i) => (
          <SkeletonBlock key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}