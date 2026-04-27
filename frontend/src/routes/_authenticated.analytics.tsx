import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, BarChart3, ShieldCheck } from "lucide-react";
import api from "@/lib/axios";
import { mockAreaByProject } from "@/lib/mockData";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

interface CarbonReading {
  month: string; // "2024-11"
  value: number;
}

function AnalyticsPage() {
  const [timeSeries, setTimeSeries] = useState<CarbonReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CarbonReading[]>("/api/analytics/carbon-stock")
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setTimeSeries(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxTs = timeSeries.length > 0 ? Math.max(...timeSeries.map((d) => d.value)) : 1;
  const maxArea = Math.max(...mockAreaByProject.map((d) => d.area));
  const verifiedRate = 0.78;

  // Format month label: "2024-11" → "Nov"
  function fmtMonth(m: string) {
    try {
      return new Date(`${m}-01`).toLocaleString("default", { month: "short" });
    } catch {
      return m;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated carbon stock and verification trends.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Carbon stock over time
            </h2>
          </div>
          {loading ? (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : timeSeries.length === 0 ? (
            <div className="flex h-56 items-center justify-center">
              <p className="text-sm text-muted-foreground">No data available.</p>
            </div>
          ) : (
            <div className="flex h-56 items-end gap-3">
              {timeSeries.map((d) => (
                <div
                  key={d.month}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all duration-500"
                      style={{ height: `${(d.value / maxTs) * 100}%` }}
                      title={`${d.value.toLocaleString()} tCO₂e`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {fmtMonth(d.month)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Cumulative tCO₂e estimated across all projects (last 6 months).
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-status-complete" />
            <h2 className="text-sm font-semibold text-foreground">
              Verification rate
            </h2>
          </div>
          <div className="grid place-items-center py-4">
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="oklch(0.30 0.013 260)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="oklch(0.68 0.17 150)"
                  strokeWidth="3"
                  strokeDasharray={`${verifiedRate * 100} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-2xl font-semibold text-foreground">
                  {Math.round(verifiedRate * 100)}%
                </span>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            of completed jobs have signed verification.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Area analyzed by project
          </h2>
        </div>
        <ul className="space-y-3">
          {mockAreaByProject.map((d) => (
            <li key={d.project}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-foreground">{d.project}</span>
                <span className="font-mono text-muted-foreground">
                  {d.area.toLocaleString()} ha
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(d.area / maxArea) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
