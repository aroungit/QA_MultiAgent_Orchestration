'use client';

import type { ComponentType } from 'react';
import { formatDate, type TrendPoint } from '../lib/apiClient';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartProps = Record<string, unknown>;
const ChartCartesianGrid = CartesianGrid as unknown as ComponentType<ChartProps>;
const ChartLegend = Legend as unknown as ComponentType<ChartProps>;
const ChartLine = Line as unknown as ComponentType<ChartProps>;
const ChartLineChart = LineChart as unknown as ComponentType<ChartProps>;
const ChartResponsiveContainer = ResponsiveContainer as unknown as ComponentType<ChartProps>;
const ChartTooltip = Tooltip as unknown as ComponentType<ChartProps>;
const ChartXAxis = XAxis as unknown as ComponentType<ChartProps>;
const ChartYAxis = YAxis as unknown as ComponentType<ChartProps>;

export function TrendChart({ trends }: { trends: TrendPoint[] }) {
  const data = trends.map((point) => ({
    createdAt: formatDate(point.createdAt),
    Passed: point.summary.passed,
    Failed: point.summary.failed,
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ChartResponsiveContainer width="100%" height="100%">
        <ChartLineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <ChartCartesianGrid strokeDasharray="3 3" />
          <ChartXAxis dataKey="createdAt" />
          <ChartYAxis allowDecimals={false} />
          <ChartTooltip />
          <ChartLegend />
          <ChartLine type="monotone" dataKey="Passed" stroke="#2f9e44" strokeWidth={2} />
          <ChartLine type="monotone" dataKey="Failed" stroke="#e03131" strokeWidth={2} />
        </ChartLineChart>
      </ChartResponsiveContainer>
    </div>
  );
}
