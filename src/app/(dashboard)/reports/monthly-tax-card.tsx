"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

function fmt(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtSrd(amount: number, rate: number): string {
  return `SRD ${(amount * rate).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface MonthlySummary {
  invoiceCount: number;
  totalSalesExclBtw: number;
  totalBtw: number;
  totalInclBtw: number;
  rate: number;
}

export function MonthlyTaxCard() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/monthly-summary?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Maandoverzicht Verkopen &amp; BTW
          </CardTitle>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name} {year}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden...</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">Geen data beschikbaar</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Totale Verkopen (excl. BTW)</p>
              <p className="text-2xl font-bold">{fmt(data.totalSalesExclBtw)}</p>
              <p className="text-xs text-muted-foreground">{fmtSrd(data.totalSalesExclBtw, data.rate)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Totale BTW</p>
              <p className="text-2xl font-bold text-amber-600">{fmt(data.totalBtw)}</p>
              <p className="text-xs text-muted-foreground">{fmtSrd(data.totalBtw, data.rate)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Totaal Incl. BTW</p>
              <p className="text-2xl font-bold text-green-600">{fmt(data.totalInclBtw)}</p>
              <p className="text-xs text-muted-foreground">
                {fmtSrd(data.totalInclBtw, data.rate)} &bull; {data.invoiceCount} facturen
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
