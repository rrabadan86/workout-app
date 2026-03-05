import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Loader2, Navigation, CheckCircle2 } from 'lucide-react';
import type { GymCheckin } from '@/lib/types';

interface NearbyPlace {
    place_name: string;
    lat: number;
    lng: number;
    distanceStr: string;
}

interface GymCheckinProps {
    onCheckin: (data: { placeName: string; lat: number | null; lng: number | null } | null) => void;
    checkin: { placeName: string; lat: number | null; lng: number | null } | null;
}

// Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function GymCheckinComponent({ onCheckin, checkin }: GymCheckinProps) {
    const [status, setStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
    const [customName, setCustomName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    async function startLocating() {
        setStatus('locating');
        if (!navigator.geolocation) {
            setErrorMsg('Localização não suportada no seu navegador.');
            setStatus('error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCoords({ lat, lng });

                // Fetch recent places from DB
                const { data, error } = await supabase
                    .from('gym_checkins')
                    .select('place_name, lat, lng')
                    .not('lat', 'is', null)
                    .not('lng', 'is', null)
                    .order('checked_in_at', { ascending: false })
                    .limit(500); // Last 500 checkins context

                if (!error && data) {
                    const uniquePlaces = new Map<string, NearbyPlace>();
                    for (const row of data as GymCheckin[]) {
                        if (!row.lat || !row.lng) continue;
                        const distKm = getDistanceFromLatLonInKm(lat, lng, row.lat, row.lng);
                        if (distKm <= 1.5) { // within 1.5km
                            if (!uniquePlaces.has(row.place_name)) {
                                uniquePlaces.set(row.place_name, {
                                    place_name: row.place_name,
                                    lat: row.lat,
                                    lng: row.lng,
                                    distanceStr: distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`
                                });
                            }
                        }
                    }
                    const placesArr = Array.from(uniquePlaces.values()).sort((a, b) => {
                        const distA = getDistanceFromLatLonInKm(lat, lng, a.lat, a.lng);
                        const distB = getDistanceFromLatLonInKm(lat, lng, b.lat, b.lng);
                        return distA - distB;
                    });
                    setNearbyPlaces(placesArr);
                }
                setStatus('ready');
            },
            (err) => {
                setStatus('error');
                if (err.code === err.PERMISSION_DENIED) {
                    setErrorMsg('Permissão de localização negada. Habilite o GPS para fazer check-in.');
                } else {
                    setErrorMsg('Não foi possível obter a localização. Verifique seu sinal de GPS.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    if (checkin) {
        return (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-2">
                    <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-slate-900">Check-in Concluído</p>
                <p className="text-xs text-slate-500 font-medium">{checkin.placeName}</p>
                <button
                    onClick={() => { onCheckin(null); setStatus('idle'); setCustomName(''); setCoords(null); }}
                    className="mt-3 text-xs font-bold text-primary opacity-80 hover:opacity-100"
                >
                    Remover Check-in
                </button>
            </div>
        );
    }

    if (status === 'idle') {
        return (
            <button
                onClick={startLocating}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors rounded-2xl border border-slate-100 group"
            >
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <MapPin size={20} />
                    </div>
                    <div className="text-left py-1">
                        <p className="text-sm font-bold text-slate-800">Fazer Check-in (Opcional)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Vincule este treino a um local</p>
                    </div>
                </div>
            </button>
        );
    }

    if (status === 'locating') {
        return (
            <div className="w-full p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                <Loader2 size={28} className="text-primary animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-800">Buscando localização...</p>
                <p className="text-xs text-slate-500 font-medium mt-1 w-4/5">Procurando locais próximos baseados no seu GPS</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="w-full p-4 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center text-center">
                <Navigation size={24} className="text-rose-400 mb-2" />
                <p className="text-sm font-bold text-slate-900 mb-1">Erro de Localização</p>
                <p className="text-xs text-slate-600 font-medium mb-4">{errorMsg}</p>
                <div className="flex gap-2 w-full">
                    <button
                        onClick={() => setStatus('idle')}
                        className="flex-1 py-2 bg-white text-slate-600 font-bold text-xs rounded-xl shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={startLocating}
                        className="flex-1 py-2 bg-rose-500 text-white font-bold text-xs rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    // status === 'ready'
    return (
        <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                    <Navigation size={16} className="text-primary" /> Sugestões próximas:
                </div>
                <button
                    onClick={() => { setStatus('idle'); setCoords(null); }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                >
                    Cancelar
                </button>
            </div>

            <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-100">
                {nearbyPlaces.map((place) => (
                    <button
                        key={place.place_name}
                        onClick={() => onCheckin({ placeName: place.place_name, lat: coords?.lat ?? null, lng: coords?.lng ?? null })}
                        className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-800">{place.place_name}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider font-roboto">Localização Comunitária</p>
                        </div>
                        <span className="text-xs font-bold text-primary/80 bg-primary/10 px-2 flex items-center h-6 rounded-md">
                            {place.distanceStr}
                        </span>
                    </button>
                ))}

                {nearbyPlaces.length === 0 && (
                    <div className="p-6 text-center text-sm font-medium text-slate-400 font-roboto">
                        Nenhum local registrado por perto.
                    </div>
                )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2">
                <p className="text-xs font-bold text-slate-500 font-roboto uppercase tracking-wide">Ou digite o nome do local:</p>
                <div className="flex w-full gap-2">
                    <input
                        type="text"
                        placeholder="Ex: Academia Cenario"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="flex-1 w-full min-w-0 bg-slate-100 rounded-xl px-4 py-3 text-sm font-medium placeholder-slate-400 border border-transparent focus:bg-white focus:border-primary/30 focus:outline-none transition-all shadow-inner"
                    />
                    <button
                        onClick={() => onCheckin({ placeName: customName.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null })}
                        disabled={!customName.trim()}
                        className="px-5 py-3 shrink-0 bg-primary text-white text-sm font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Check-in
                    </button>
                </div>
            </div>
        </div>
    );
}
