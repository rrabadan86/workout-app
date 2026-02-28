export default function DashboardLoading() {
    return (
        <div className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Feed Column Skeleton */}
            <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Active Now Skeleton */}
                <div className="bg-white rounded-xl p-6 animate-pulse">
                    <div className="h-5 bg-slate-100 rounded w-48 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-slate-50 p-3 rounded-xl flex items-center gap-3">
                                <div className="size-12 rounded-full bg-slate-200" />
                                <div className="flex-1">
                                    <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Feed Skeleton */}
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 animate-pulse flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-slate-200" />
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-48" />
                            </div>
                        </div>
                        <div className="h-20 bg-slate-50 rounded-xl" />
                    </div>
                ))}
            </div>
            {/* Sidebar Skeleton */}
            <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="bg-slate-900 rounded-2xl p-8 h-52 animate-pulse" />
                <div className="bg-white rounded-2xl p-8 h-48 animate-pulse" />
            </div>
        </div>
    );
}
