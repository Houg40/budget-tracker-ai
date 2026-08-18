"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getCategorySummary, getDailySummary } from "@/lib/api";

const BLUE = "#3987e5";
const GRID = "#2c2c2a";
const MUTED = "#898781";
const SURFACE = "#1a1a19";
const BORDER = "rgba(255,255,255,0.10)";

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState<{ category: string; total: number }[]>([]);
  const [dateData, setDateData] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [categories, dates] = await Promise.all([getCategorySummary(), getDailySummary()]);
        setCategoryData(categories.map((c) => ({ category: c.category, total: parseFloat(c.total) })));
        setDateData(dates.map((d) => ({ date: d.date, total: parseFloat(d.total) })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalSpent = categoryData.reduce((sum, c) => sum + c.total, 0);

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8 inline-block">
            <p className="text-sm text-gray-400 mb-1">Total Spent This Month</p>
            <p className="text-4xl font-bold">${totalSpent.toFixed(2)}</p>
          </div>

          {categoryData.length === 0 && dateData.length === 0 ? (
            <p className="text-gray-400">No transactions yet this month.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis dataKey="category" stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} />
                    <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                      labelStyle={{ color: "#ffffff" }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                    />
                    <Bar dataKey="total" fill={BLUE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Spending Over Time</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dateData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={MUTED}
                      tick={{ fill: MUTED, fontSize: 12 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis stroke={MUTED} tick={{ fill: MUTED, fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 4 }}
                      labelStyle={{ color: "#ffffff" }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                    />
                    <Area type="monotone" dataKey="total" stroke={BLUE} strokeWidth={2} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}