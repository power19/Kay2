"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TwoFAPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6 && !useBackup) {
      await submit(cleaned);
    }
  };

  const submit = async (codeValue: string) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeValue, isBackup: useBackup }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ongeldige code");
        setCode("");
        setLoading(false);
        return;
      }
      router.push("/");
    } catch {
      setError("Er is een fout opgetreden");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Tweestapsverificatie</CardTitle>
        <p className="text-sm text-muted-foreground">
          {useBackup
            ? "Voer een herstelcode in"
            : "Voer de 6-cijferige code in uit uw authenticator-app"}
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(code);
          }}
          className="space-y-4"
        >
          {useBackup ? (
            <div className="space-y-2">
              <Label htmlFor="backup">Herstelcode</Label>
              <Input
                id="backup"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="code">Authenticatorcode</Label>
              <Input
                id="code"
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          {useBackup && (
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Controleren..." : "Verifiëren"}
            </Button>
          )}

          <button
            type="button"
            className="text-sm text-blue-600 hover:underline w-full text-center"
            onClick={() => {
              setUseBackup(!useBackup);
              setCode("");
              setError("");
            }}
          >
            {useBackup ? "← Terug naar authenticatorcode" : "Herstelcode gebruiken"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
