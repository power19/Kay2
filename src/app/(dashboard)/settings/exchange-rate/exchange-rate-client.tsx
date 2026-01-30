"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatSrd } from "@/lib/currency";

type ExchangeRate = {
  id: string;
  rateUsdToSrd: number;
  isCurrent: boolean;
  effectiveDate: string;
  createdAt: string;
};

export function ExchangeRateClient({
  currentRate: initialCurrentRate,
  history: initialHistory,
}: {
  currentRate: ExchangeRate | null;
  history: ExchangeRate[];
}) {
  const [currentRate, setCurrentRate] = useState(initialCurrentRate);
  const [history, setHistory] = useState(initialHistory);
  const [newRate, setNewRate] = useState(
    initialCurrentRate?.rateUsdToSrd.toString() || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Exchange rate must be a positive number");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/exchange-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateUsdToSrd: rate }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update exchange rate");
      }

      const newRateData = await res.json();

      // Update local state
      const serializedRate: ExchangeRate = {
        ...newRateData,
        effectiveDate: new Date(newRateData.effectiveDate).toISOString(),
        createdAt: new Date(newRateData.createdAt).toISOString(),
      };

      setCurrentRate(serializedRate);
      setHistory((prev) => {
        const updated = prev.map((r) => ({ ...r, isCurrent: false }));
        return [serializedRate, ...updated].slice(0, 10);
      });

      toast.success("Exchange rate updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update exchange rate"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Current Exchange Rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-6 text-center">
            <p className="text-sm text-gray-600">$1 USD =</p>
            <p className="text-4xl font-bold text-blue-700">
              {currentRate ? formatSrd(currentRate.rateUsdToSrd) : "Not set"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newRate">Update Exchange Rate</Label>
            <div className="flex gap-2">
              <Input
                id="newRate"
                type="number"
                step="0.01"
                min="0.01"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="Enter new rate"
              />
              <Button onClick={handleUpdate} disabled={isLoading}>
                {isLoading ? "Updating..." : "Update"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter how many SRD equals 1 USD
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rate History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No history yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">
                      {formatSrd(rate.rateUsdToSrd)}
                    </TableCell>
                    <TableCell>
                      {new Date(rate.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {rate.isCurrent ? (
                        <Badge>Current</Badge>
                      ) : (
                        <Badge variant="secondary">Previous</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
