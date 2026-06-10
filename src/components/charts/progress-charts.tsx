"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

export interface ProgressPoint {
  recorded_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  hips_cm: number | null;
}

const fmtDate = (d: string) => {
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
};

interface TooltipItem {
  dataKey?: string | number;
  color?: string;
  name?: string | number;
  value?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{fmtDate(label ?? "")}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function WeightChart({ data }: { data: ProgressPoint[] }) {
  const points = data.filter((d) => d.weight_kg != null);
  if (points.length === 0) {
    return <EmptyChart label="No weight entries yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(158 64% 39%)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(158 64% 39%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="recorded_on" tickFormatter={fmtDate} tickLine={false} axisLine={false} />
        <YAxis width={40} tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="weight_kg"
          name="Weight (kg)"
          stroke="hsl(158 64% 39%)"
          strokeWidth={2.5}
          fill="url(#weightFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const MEASURES = [
  { key: "waist_cm", name: "Waist", color: "hsl(217 91% 60%)" },
  { key: "chest_cm", name: "Chest", color: "hsl(158 64% 39%)" },
  { key: "arms_cm", name: "Arms", color: "hsl(38 92% 50%)" },
  { key: "hips_cm", name: "Hips", color: "hsl(280 65% 60%)" },
] as const;

export function MeasurementChart({ data }: { data: ProgressPoint[] }) {
  const hasAny = data.some((d) => MEASURES.some((m) => d[m.key] != null));
  if (!hasAny) {
    return <EmptyChart label="No measurements yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="recorded_on" tickFormatter={fmtDate} tickLine={false} axisLine={false} />
        <YAxis width={40} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {MEASURES.map((m) => (
          <Line
            key={m.key}
            type="monotone"
            dataKey={m.key}
            name={m.name}
            stroke={m.color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}
