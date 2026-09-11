"use client";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatUGXCompact, formatUGX, MONTH_NAMES } from "@/lib/currency";

const BRAND = "#2F6B4F";
const GOLD = "#C79A3B";
const GRID = "#E7E3D8";
const TICK = "#8A8676";

function monthTick(row: { month: number; year: number }) {
  return `${MONTH_NAMES[row.month - 1].slice(0, 3)} '${String(row.year).slice(2)}`;
}

export function ContributionTrendChart({ data }: { data: { month: number; year: number; amount: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: monthTick(d) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="contribFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUGXCompact(v)} tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} width={64} />
        <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E7E3D8", fontSize: 12 }} />
        <Area type="monotone" dataKey="amount" name="Contribution" stroke={BRAND} strokeWidth={2.25} fill="url(#contribFill)" dot={{ r: 3, fill: BRAND }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DualLineChart({
  data, keys,
}: {
  data: { month: number; year: number; [k: string]: number }[];
  keys: { key: string; name: string; color: string }[];
}) {
  const rows = data.map((d) => ({ ...d, label: monthTick(d) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUGXCompact(v)} tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} width={64} />
        <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E7E3D8", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} strokeWidth={2.25} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedBarChart({
  data, keys,
}: {
  data: { month: number; year: number; [k: string]: number }[];
  keys: { key: string; name: string; color: string }[];
}) {
  const rows = data.map((d) => ({ ...d, label: monthTick(d) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tickFormatter={(v) => formatUGXCompact(v)} tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} width={64} />
        <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E7E3D8", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k, i) => (
          <Bar key={k.key} dataKey={k.key} name={k.name} stackId="a" fill={k.color} radius={i === keys.length - 1 ? [4, 4, 0, 0] : undefined} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PrincipalInterestDonut({ principal, interest }: { principal: number; interest: number }) {
  const data = [
    { name: "Principal", value: Math.max(0, principal) },
    { name: "Interest", value: Math.max(0, interest) },
  ];
  const colors = [BRAND, GOLD];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatUGX(v)} contentStyle={{ borderRadius: 10, border: "1px solid #E7E3D8", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CompliancePctChart({ data }: { data: { month: number; year: number; compliance: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: monthTick(d) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: TICK }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: TICK }} axisLine={false} tickLine={false} width={40} domain={[0, 100]} />
        <Tooltip formatter={(v: number) => `${v.toFixed(0)}%`} contentStyle={{ borderRadius: 10, border: "1px solid #E7E3D8", fontSize: 12 }} />
        <Bar dataKey="compliance" name="Compliance %" fill={BRAND} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
