import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLinks, getMyRole, deleteLink } from "@/lib/links.functions";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, BarChart3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — web3brasillinks" }] }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const list = useServerFn(listLinks);
  const role = useServerFn(getMyRole);
  const del = useServerFn(deleteLink);
  const { data: links = [] } = useQuery({ queryKey: ["links"], queryFn: () => list() });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => role() });
  const isAdmin = me?.isAdmin ?? false;
  const [filter, setFilter] = useState<string>("all");

  const creators = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of links) map.set(l.user_id, l.criador_nome);
    return Array.from(map, ([id, nome]) => ({ id, nome }));
  }, [links]);

  const filtered = filter === "all" ? links : links.filter((l) => l.user_id === filter);
  const totalClicks = filtered.reduce((s, l) => s + l.total_clicks, 0);
  const totalJoins = filtered.reduce((s, l) => s + l.total_joins, 0);

  function fullUrl(slug: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/${slug}`;
  }

  function copyUrl(slug: string) {
    navigator.clipboard.writeText(fullUrl(slug));
    toast.success("Link copiado!");
  }

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`Excluir o link "${nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await del({ data: { id } });
      toast.success("Link excluído");
      queryClient.invalidateQueries({ queryKey: ["links"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir link");
    }
  }

  return (
    <AppShell>
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isAdmin ? "Todos os links da plataforma" : "Seus links criados"}
            </p>
          </div>
          <Link to="/links/new"><Button>Novo link</Button></Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Links" value={filtered.length} />
          <StatCard label="Cliques totais" value={totalClicks} />
          <StatCard label="Entradas confirmadas" value={totalJoins} />
        </div>

        {isAdmin && creators.length > 1 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrar por funcionário:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            Nenhum link ainda. Crie o primeiro.
          </Card>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-3">
              {filtered.map((l) => {
                const canDelete = isAdmin || l.user_id === me?.userId;
                return (
                  <Card key={l.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.nome}</div>
                        
                          href={`/${l.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-xs font-mono hover:underline break-all"
                        >
                          {fullUrl(l.slug)}
                        </a>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{l.plataforma}</Badge>
                    </div>

                    {isAdmin && (
                      <div className="text-xs text-muted-foreground mb-2">Criador: {l.criador_nome}</div>
                    )}

                    <div className="flex items-center gap-4 text-sm mb-3">
                      <div><span className="text-muted-foreground">Cliques: </span><span className="tabular-nums font-medium">{l.total_clicks}</span></div>
                      <div>
                        <span className="text-muted-foreground">Entradas: </span>
                        <span className="tabular-nums font-medium">
                          {l.plataforma === "whatsapp" ? "—" : l.total_joins}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 border-t border-border pt-2">
                      <Button size="sm" variant="ghost" onClick={() => copyUrl(l.slug)} className="flex-1">
                        <Copy className="h-4 w-4 mr-1.5" /> Copiar
                      </Button>
                      <Link to="/links/$slug" params={{ slug: l.slug }} className="flex-1">
                        <Button size="sm" variant="ghost" className="w-full">
                          <BarChart3 className="h-4 w-4 mr-1.5" /> Ver
                        </Button>
                      </Link>
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id, l.nome)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Desktop: table */}
            <Card className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Nome</th>
                    <th className="text-left px-4 py-3">Slug</th>
                    <th className="text-left px-4 py-3">Plataforma</th>
                    {isAdmin && <th className="text-left px-4 py-3">Criador</th>}
                    <th className="text-right px-4 py-3">Cliques</th>
                    <th className="text-right px-4 py-3">Entradas</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const canDelete = isAdmin || l.user_id === me?.userId;
                    return (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{l.nome}</td>
                        <td className="px-4 py-3 font-mono text-xs">
                          
                            href={`/${l.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {fullUrl(l.slug)}
                          </a>
                        </td>
                        <td className="px-4 py-3"><Badge variant="secondary">{l.plataforma}</Badge></td>
                        {isAdmin && <td className="px-4 py-3 text-muted-foreground">{l.criador_nome}</td>}
                        <td className="px-4 py-3 text-right tabular-nums">{l.total_clicks}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {l.plataforma === "whatsapp" ? <span className="text-muted-foreground text-xs">— </span> : l.total_joins}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => copyUrl(l.slug)} title="Copiar">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <a href={`/${l.slug}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost" title="Abrir"><ExternalLink className="h-4 w-4" /></Button>
                            </a>
                            <Link to="/links/$slug" params={{ slug: l.slug }}>
                              <Button size="sm" variant="ghost" title="Analytics"><BarChart3 className="h-4 w-4" /></Button>
                            </Link>
                            {canDelete && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(l.id, l.nome)} title="Excluir">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl sm:text-3xl font-semibold mt-2 tabular-nums">{value}</div>
    </Card>
  );
}

