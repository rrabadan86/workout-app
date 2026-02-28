'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CompareChartProps {
    data: Record<string, unknown>[];
    myName: string;
    friendName: string;
}

export default function CompareChart({ data, myName, friendName }: CompareChartProps) {
    return (
        <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Roboto' }} axisLine={false} tickLine={false} tickMargin={12} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Roboto' }} axisLine={false} tickLine={false} tickMargin={12} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: 12, color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontFamily: 'Inter', fontWeight: 600 }} labelStyle={{ fontFamily: 'Roboto', color: '#64748b', marginBottom: 4 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontFamily: 'Roboto', paddingTop: 20 }} />
                <Line type="monotone" dataKey={myName} stroke="#00AAFF" strokeWidth={3} dot={{ fill: '#00AAFF', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
                <Line type="monotone" dataKey={friendName} stroke="#fb7185" strokeWidth={3} dot={{ fill: '#fb7185', r: 4, strokeWidth: 0 }} strokeDasharray="6 4" animationDuration={1000} />
            </LineChart>
        </ResponsiveContainer>
    );
}
