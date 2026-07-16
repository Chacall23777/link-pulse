import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLinkAnalytics, deleteLink } from "@/lib/links.functions";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/links/$slug")({
  head: () => ({ meta: [{ title: "Analytics — web3brasillinks" }] }),
  component: LinkAnalytics,
});

function LinkAnalytics() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchFn = useServerFn(getLinkAnalytics);
  const del = useServerFn(deleteLink);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", slug],
    queryFn: () => fetchFn({ data: { slug } }),
  });

  if (isLoading) return <AppShell><div className="p-8">Carregando...</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-destructive">Erro: {(error as Error).message}</div></AppShell>;
  if (!data) return null;

  const shortUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${data.link.slug}`;
  const isWhats = data.link.plataforma === "whatsapp";

  async function handleDelete() {
    if (!window.confirm(`Excluir o link "${data.link.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await del({ data: { id: data.link.id } });
      toast.success("Link excluído");
      queryClient.invalidateQueries({ queryKey: ["links"] });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir link");
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-semibold">{data.link.nome}</h1>
              <Badge variant="secondary">{data.link.plataforma}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{shortUrl}</code>
              <Button size="sm" variant="ghost"
                onClick={() => { navigator.clipboard.writeText(shortUrl); toast.success("Copiado!"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">→ {data.link.destino_url}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleDelete}
            className="text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-1.5" />
            Excluir link
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Cliques totais" value={data.total_clicks} />
          <Stat label="Cliques únicos" value={data.unique_clicks} />
          <Stat
            label={isWhats ? "Entradas (estimativa)" : "Entradas confirmadas"}
            value={isWhats ? data.total_clicks : data.total_joins}
            hint={isWhats ? "WhatsApp: baseado em cliques" : undefined}
          />
        </div>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Cliques por dia</h2>
          <div className="h-64">
            {data.daily.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" stroke="currentColor" fontSize={11} />
                  <YAxis stroke="currentColor" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="count" stroke="oklch(0.75 0.14 190)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Top origens (referrer)</h2>
          {data.referrers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {data.referrers.map((r) => (
                  <tr key={r.referrer} className="border-t border-border first:border-0">
                    <td className="py-2 truncate max-w-md">{r.referrer}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-3xl font-semibold mt-2 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

