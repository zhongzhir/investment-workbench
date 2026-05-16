"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinancialData } from "@/lib/types";

const BLUE = "#1B6FE8";
const ORANGE = "#FF6B35";
const GREEN = "#3d7a5e";

const AXIS = { fontSize: 11, fill: "#787774" };
const GRID = "#e9e9e7";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <h3 className="mb-2 text-[14px] font-medium text-ink">{title}</h3>
      <div style={{ height: 200, width: "100%" }}>{children}</div>
    </div>
  );
}

export function FinancialCharts({ data }: { data: FinancialData }) {
  const hasAny =
    data.revenue.length > 0 ||
    data.growth_rate.length > 0 ||
    data.gross_margin.length > 0 ||
    data.users.length > 0 ||
    data.funding_history.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-line py-12 text-center text-sm text-ink-faint">
        未在 BP 中发现相关数据
      </div>
    );
  }

  return (
    <div>
      {data.summary && (
        <p className="mb-4 text-xs leading-5 text-ink-faint">{data.summary}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {data.revenue.length > 0 && (
          <ChartCard title="收入增长">
            <ResponsiveContainer>
              <BarChart data={data.revenue} margin={{ top: 16, right: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS} axisLine={{ stroke: GRID }} width={40} />
                <Tooltip />
                <Bar dataKey="value" fill={BLUE} radius={[3, 3, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    style={{ fontSize: 11, fill: "#37352f" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data.growth_rate.length > 0 && (
          <ChartCard title="增长率趋势（%）">
            <ResponsiveContainer>
              <LineChart data={data.growth_rate} margin={{ top: 16, right: 12 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS} axisLine={{ stroke: GRID }} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={ORANGE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: ORANGE }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data.gross_margin.length > 0 && (
          <ChartCard title="毛利率趋势（%）">
            <ResponsiveContainer>
              <LineChart
                data={data.gross_margin}
                margin={{ top: 16, right: 12 }}
              >
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS} axisLine={{ stroke: GRID }} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={GREEN}
                  strokeWidth={2}
                  dot={{ r: 3, fill: GREEN }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data.users.length > 0 && (
          <ChartCard title="用户增长">
            <ResponsiveContainer>
              <AreaChart data={data.users} margin={{ top: 16, right: 12 }}>
                <defs>
                  <linearGradient id="userFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: GRID }} />
                <YAxis tick={AXIS} axisLine={{ stroke: GRID }} width={40} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={BLUE}
                  strokeWidth={2}
                  fill="url(#userFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {data.funding_history.length > 0 && (
          <ChartCard title="融资历史">
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={data.funding_history}
                margin={{ top: 4, right: 32, left: 8 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS} axisLine={{ stroke: GRID }} />
                <YAxis
                  type="category"
                  dataKey="round"
                  tick={AXIS}
                  axisLine={{ stroke: GRID }}
                  width={64}
                />
                <Tooltip />
                <Bar dataKey="amount" fill={ORANGE} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="amount"
                    position="right"
                    style={{ fontSize: 11, fill: "#37352f" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {data.key_metrics.length > 0 && (
        <div className="mt-3 rounded-lg border border-line bg-white p-4">
          <h3 className="mb-2 text-[14px] font-medium text-ink">关键指标</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.key_metrics.map((m, i) => (
              <div key={i} className="rounded-md bg-surface px-3 py-2">
                <div className="text-xs text-ink-faint">{m.name}</div>
                <div className="mt-0.5 text-sm font-medium text-ink">
                  {m.value}
                </div>
                {m.date && (
                  <div className="text-[11px] text-ink-faint">{m.date}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
