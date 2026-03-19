"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

interface Me {
  name: string;
  role: string;
}

function ExchangeRateBadge() {
  const [rate, setRate] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        const r = d.current?.rateUsdToSrd;
        setRate(r ? `SRD ${Number(r).toFixed(2)}` : null);
      })
      .catch(() => null);
  }, []);

  if (!rate) return null;
  return (
    <div className="rounded-md bg-blue-50 px-3 py-1.5 text-sm">
      <span className="text-gray-600">Exchange Rate: </span>
      <span className="font-semibold text-blue-700">$1 = {rate}</span>
    </div>
  );
}

export function Header() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.name) setMe(d); })
      .catch(() => null);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <ExchangeRateBadge />
        {me && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{me.name}</span>
              {me.role === "admin" && (
                <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                  beheerder
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Uitloggen">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
