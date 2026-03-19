"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, RotateCcw, Shield, ShieldOff } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFAEnabled: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.role !== "admin") { router.replace("/"); return; }
      setMe(d);
    });
    loadUsers();
  }, [router]);

  const loadUsers = () => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Gebruiker aangemaakt");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "staff" });
      loadUsers();
    } else {
      const d = await res.json();
      toast.error(d.error || "Aanmaken mislukt");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Gebruiker "${name}" verwijderen?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Gebruiker verwijderd"); loadUsers(); }
    else { const d = await res.json(); toast.error(d.error); }
  };

  const handleReset2FA = async (id: string, name: string) => {
    if (!confirm(`2FA resetten voor "${name}"? De gebruiker moet 2FA opnieuw instellen.`)) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset2fa: true }),
    });
    if (res.ok) { toast.success("2FA gereset"); loadUsers(); }
    else toast.error("Reset mislukt");
  };

  const handleToggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "staff" : "admin";
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) { toast.success(`Rol gewijzigd naar ${newRole}`); loadUsers(); }
    else toast.error("Rol wijzigen mislukt");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gebruikersbeheer</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Gebruiker toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe gebruiker</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>E-mailadres</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Wachtwoord</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm bg-background"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="staff">Medewerker</option>
                  <option value="admin">Beheerder</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Aanmaken..." : "Gebruiker aanmaken"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gebruikers ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? "Beheerder" : "Medewerker"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.twoFAEnabled ? (
                      <Badge className="bg-green-100 text-green-800">Ingeschakeld</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">Uitgeschakeld</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.twoFAEnabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReset2FA(user.id, user.name)}
                          title="2FA resetten"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {me && user.id !== me.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRole(user.id, user.role)}
                            title={user.role === "admin" ? "Rol verlagen" : "Beheerder maken"}
                          >
                            {user.role === "admin" ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <Shield className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(user.id, user.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
