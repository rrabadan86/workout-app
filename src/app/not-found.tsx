import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
                <div className="text-7xl font-extrabold font-inter text-slate-200">404</div>
                <div>
                    <h2 className="text-xl font-extrabold font-inter text-slate-900 mb-2">Página não encontrada</h2>
                    <p className="text-sm text-slate-500 font-roboto">
                        A página que você está procurando não existe ou foi movida.
                    </p>
                </div>
                <Link
                    href="/dashboard"
                    className="py-3 px-8 bg-primary text-white rounded-xl font-bold font-montserrat hover:opacity-90 transition-opacity"
                >
                    Ir para o Dashboard
                </Link>
            </div>
        </div>
    );
}
