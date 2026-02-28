export default function HistoryLoading() {
    return (
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
            <div className="h-8 bg-slate-200 rounded w-40 mb-8 animate-pulse" />
            <div className="flex flex-col gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 animate-pulse flex flex-col gap-5">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-slate-200" />
                            <div>
                                <div className="h-5 bg-slate-200 rounded w-24 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-48" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-5">
                            {[...Array(3)].map((_, j) => (
                                <div key={j}>
                                    <div className="h-3 bg-slate-200 rounded w-16 mb-2" />
                                    <div className="h-7 bg-slate-200 rounded w-24" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
