"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Row = { date: string; totalChats: number; totalLeads: number };

export default function AnalyticsCharts({ rows }: { rows: Row[] }) {
  // Aggregate across campaigns per day for a clean overview chart
  const byDate = new Map<string, { date: string; chats: number; leads: number }>();
  for (const r of rows) {
    const existing = byDate.get(r.date) || { date: r.date, chats: 0, leads: 0 };
    existing.chats += r.totalChats;
    existing.leads += r.totalLeads;
    byDate.set(r.date, existing);
  }
  const chartData = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Chats & Leads over time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="chats" stroke="var(--accent-color, #ed5e4e)" strokeWidth={2} name="Chats" />
            <Line type="monotone" dataKey="leads" stroke="#2f3192" strokeWidth={2} name="Leads" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily volume</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="chats" fill="var(--accent-color, #ed5e4e)" name="Chats" radius={[4, 4, 0, 0]} />
            <Bar dataKey="leads" fill="#2f3192" name="Leads" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
