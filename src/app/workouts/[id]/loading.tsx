export default function WorkoutDetailLoading() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="w-full max-w-[1000px] mx-auto px-6 py-10 flex-1">
                <div className="mb-10">
                    <div className="h-5 bg-slate-200 rounded w-40 mb-6 animate-pulse" />
                    <div className="h-8 bg-slate-200 rounded w-64 mb-2 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded w-32 animate-pulse" />
                </div>
                <div className="flex flex-col gap-6">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                            <div className="p-4 md:p-5 flex items-center gap-4">
                                <div className="size-10 rounded-xl bg-slate-200" />
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-200 rounded w-40 mb-2" />
                                    <div className="h-3 bg-slate-100 rounded w-32" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
