"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Copy } from "lucide-react";

interface Me {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFAEnabled: boolean;
}

type Setup2FAState = {
  secret: string;
  qrCodeDataUrl: string;
} | null;

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [setup, setSetup] = useState<Setup2FAState>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setMe);
  }, []);

  const startSetup = async () => {
    const res = await fetch("/api/auth/setup-2fa", { method: "POST" });
    const data = await res.json();
    setSetup(data);
    setConfirmCode("");
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup) return;
    setConfirmLoading(true);
    const res = await fetch("/api/auth/confirm-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: setup.secret, code: confirmCode }),
    });
    setConfirmLoading(false);
    const data = await res.json();
    if (res.ok) {
      setBackupCodes(data.backupCodes);
      setSetup(null);
      setMe((m) => m ? { ...m, twoFAEnabled: true } : m);
      toast.success("2FA ingeschakeld!");
    } else {
      toast.error(data.error || "Bevestiging mislukt");
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisableLoading(true);
    const res = await fetch("/api/auth/disable-2fa", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: disableCode, isBackup: false }),
    });
    setDisableLoading(false);
    if (res.ok) {
      setMe((m) => m ? { ...m, twoFAEnabled: false } : m);
      setShowDisable(false);
      setDisableCode("");
      toast.success("2FA uitgeschakeld");
    } else {
      const d = await res.json();
      toast.error(d.error || "Uitschakelen mislukt");
    }
  };

  if (!me) return <div className="p-6 text-muted-foreground">Laden...</div>;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Mijn profiel</h1>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Accountgegevens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Naam</span>
            <span className="font-medium">{me.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">E-mail</span>
            <span className="font-medium">{me.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rol</span>
            <Badge variant={me.role === "admin" ? "default" : "secondary"}>
              {me.role === "admin" ? "Beheerder" : "Medewerker"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {me.twoFAEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-gray-400" />
              )}
              Tweestapsverificatie
            </CardTitle>
            {me.twoFAEnabled ? (
              <Badge className="bg-green-100 text-green-800">Ingeschakeld</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">Uitgeschakeld</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Backup codes shown after enabling */}
          {backupCodes && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                Bewaar deze herstelcodes op een veilige plek. Ze worden maar één keer getoond.
              </p>
              <div className="grid grid-cols-2 gap-1 font-mono text-sm">
                {backupCodes.map((c) => (
                  <span key={c} className="bg-white border rounded px-2 py-1 text-center">{c}</span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join("\n"));
                  toast.success("Codes gekopieerd");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Kopiëren
              </Button>
            </div>
          )}

          {!me.twoFAEnabled && !setup && !backupCodes && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Beveilig uw account met een authenticator-app zoals Google Authenticator of Authy.
              </p>
              <Button onClick={startSetup}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                2FA inschakelen
              </Button>
            </div>
          )}

          {/* QR code setup step */}
          {setup && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan de QR-code met uw authenticator-app en voer vervolgens de 6-cijferige code in ter bevestiging.
              </p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setup.qrCodeDataUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-center text-muted-foreground font-mono break-all">
                {setup.secret}
              </p>
              <form onSubmit={handleConfirm} className="space-y-3">
                <div className="space-y-2">
                  <Label>Bevestigingscode</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-xl tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={confirmLoading || confirmCode.length !== 6}>
                    {confirmLoading ? "Verifiëren..." : "Bevestigen"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSetup(null)}>
                    Annuleren
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Disable 2FA */}
          {me.twoFAEnabled && !backupCodes && (
            <div className="space-y-3">
              {!showDisable ? (
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDisable(true)}>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  2FA uitschakelen
                </Button>
              ) : (
                <form onSubmit={handleDisable} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Voer uw huidige authenticatorcode in om 2FA uit te schakelen.
                  </p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-xl tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" variant="destructive" className="flex-1" disabled={disableLoading || disableCode.length !== 6}>
                      {disableLoading ? "Uitschakelen..." : "2FA uitschakelen"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { setShowDisable(false); setDisableCode(""); }}>
                      Annuleren
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
