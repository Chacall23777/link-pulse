import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listEmployees, createEmployee, toggleEmployee, deleteEmployee,
} from "@/lib/employees.functions";
import { getMyRole } from "@/lib/links.functions";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Equipe — Web3Brasil Links" }] }),
  component: Team,
});

function Team() {
  const list = useServerFn(listEmployees);
  const create = useServerFn(createEmployee);
  const toggle = useServerFn(toggleEmployee);
  const del = useServerFn(deleteEmployee);
  const role = useServerFn(getMyRole);
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => role() });
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ["employees"], queryFn: () => list(),
    enabled: me?.isAdmin === true,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [saving, setSaving] = useState(false);

  if (me && !me.isAdmin) {
    return <AppShell><div className="p-8 text-muted-foreground">Acesso restrito a administradores.</div></AppShell>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await create({ data: form });
      toast.success("Funcionário criado!");
      setOpen(false);
      setForm({ nome: "", email: "", senha: "" });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally { setSaving(false); }
  }

  async function onToggle(id: string, ativo: boolean) {
    try {
      await toggle({ data: { id, ativo } });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
  }

  async function onDelete(id: string) {
    if (!confirm("Excluir este funcionário? Ação irreversível.")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["employees"] });
    } catch (err: any) { toast.error(err.message); }
  }

  function randomPassword() {
    const p = Math.random().toString(36).slice(-10) + "A1!";
    setForm({ ...form, senha: p });
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Equipe</h1>
            <p className="text-sm text-muted-foreground">Gerencie as contas dos funcionários.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Novo funcionário</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar funcionário</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="n">Nome</Label>
                  <Input id="n" required value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e">E-mail (login)</Label>
                  <Input id="e" type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s">Senha (mín. 8)</Label>
                  <div className="flex gap-2">
                    <Input id="s" type="text" required minLength={8} value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                    <Button type="button" variant="outline" onClick={randomPassword}>Gerar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Copie a senha antes de salvar.</p>
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="p-8 text-destructive">{(error as Error).message}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3">E-mail</th>
                  <th className="text-left px-4 py-3">Papel</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.roles.includes("admin")
                        ? <Badge>admin</Badge>
                        : <Badge variant="secondary">funcionário</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {u.ativo
                        ? <Badge variant="secondary" className="bg-primary/20 text-primary">ativo</Badge>
                        : <Badge variant="secondary" className="bg-destructive/20 text-destructive">inativo</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!u.roles.includes("admin") && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => onToggle(u.id, !u.ativo)}>
                            {u.ativo ? "Desativar" : "Ativar"}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(u.id)}>
                            Excluir
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum funcionário ainda.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}