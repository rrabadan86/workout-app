'use client';

import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Props {
    chartData: Record<string, unknown>[];
    friendName?: string;
    comparisonFriendId?: string;
}

export default function ExerciseChart({ chartData, friendName, comparisonFriendId }: Props) {
    if (chartData.length === 0) return null;

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-1">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                Evolução (kg)
            </p>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip
                            contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc', fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            itemStyle={{ fontWeight: 700 }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                        <Line type="monotone" dataKey="Você" stroke="#00AAFF" strokeWidth={3} dot={{ fill: '#00AAFF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
                        {comparisonFriendId && friendName && (
                            <Line type="monotone" dataKey={friendName} stroke="#ff4757" strokeWidth={3} dot={{ fill: '#ff4757', r: 4, strokeWidth: 0 }} strokeDasharray="5 5" />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
