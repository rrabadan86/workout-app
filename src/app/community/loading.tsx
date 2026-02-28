export default function CommunityLoading() {
    return (
        <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8">
            <div className="h-10 bg-slate-200 rounded w-48 mb-4 animate-pulse" />
            <div className="h-12 bg-white rounded-xl mb-6 animate-pulse" />
            <div className="flex flex-col gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-slate-200" />
                            <div>
                                <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                                <div className="h-3 bg-slate-100 rounded w-20" />
                            </div>
                        </div>
                        <div className="h-10 bg-slate-100 rounded-xl w-28" />
                    </div>
                ))}
            </div>
        </main>
    );
}
