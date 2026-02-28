export default function ProjectsLoading() {
    return (
        <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
            <div className="flex flex-col gap-5 mb-8">
                <div className="h-5 bg-slate-200 rounded w-32 animate-pulse" />
                <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
                <div className="flex gap-3">
                    <div className="h-10 bg-slate-200 rounded-xl w-32 animate-pulse" />
                    <div className="h-10 bg-slate-200 rounded-xl w-32 animate-pulse" />
                </div>
            </div>
            <div className="flex flex-col gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="size-11 rounded-xl bg-slate-200" />
                            <div className="flex-1">
                                <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                                <div className="flex gap-2">
                                    <div className="h-5 bg-slate-100 rounded-full w-16" />
                                    <div className="h-5 bg-slate-100 rounded-full w-12" />
                                </div>
                            </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded w-64 ml-14" />
                    </div>
                ))}
            </div>
        </main>
    );
}
