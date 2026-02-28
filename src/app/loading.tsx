export default function GlobalLoading() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium font-roboto text-sm">Carregando...</p>
            </div>
        </div>
    );
}
