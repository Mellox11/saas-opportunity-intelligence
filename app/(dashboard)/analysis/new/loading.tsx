export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 dot-grid">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Subreddit Selection Skeleton */}
              <div className="border border-gray-800 bg-gray-900/50 backdrop-blur rounded-lg">
                <div className="p-6">
                  <div className="h-6 bg-gray-800 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Time Range Skeleton */}
              <div className="border border-gray-800 bg-gray-900/50 backdrop-blur rounded-lg">
                <div className="p-6">
                  <div className="h-6 bg-gray-800 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3 mb-4"></div>
                  <div className="flex gap-4">
                    <div className="h-10 bg-gray-800 rounded animate-pulse flex-1"></div>
                    <div className="h-10 bg-gray-800 rounded animate-pulse flex-1"></div>
                    <div className="h-10 bg-gray-800 rounded animate-pulse flex-1"></div>
                  </div>
                </div>
              </div>

              {/* Keywords Skeleton */}
              <div className="border border-gray-800 bg-gray-900/50 backdrop-blur rounded-lg">
                <div className="p-6">
                  <div className="h-6 bg-gray-800 rounded animate-pulse mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2 mb-4"></div>
                  <div className="grid grid-cols-2 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-8 bg-gray-800 rounded animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Panel Skeleton */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="border border-gray-800 bg-gray-900/50 backdrop-blur rounded-lg p-6 mb-6">
                  <div className="h-6 bg-gray-800 rounded animate-pulse mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-2/3"></div>
                    <div className="h-4 bg-gray-800 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="h-12 bg-gray-800 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}