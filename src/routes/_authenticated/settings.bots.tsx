import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { listTelegramLinks, connectTelegramBot } from "@/lib/bots.functions";

export const Route = createFileRoute("/_authenticated/settings/bots")({
  head: () => ({ meta: [{ title: "Bots & Webhooks — Web3Brasil Links" }] }),
  component: BotsSettings,
});

function BotsSettings() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://SEU-DOMINIO";
  const list = useServerFn(listTelegramLinks);
  const { data: tgLinks = [] } = useQuery({
    queryKey: ["telegram-links"],
    queryFn: () => list(),
  });
  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bots & Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Rastreie entradas reais nos grupos conectando um bot. Só a primeira entrada de cada
            pessoa em um link é contabilizada — quem já estava no grupo antes não conta.
          </p>
        </div>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Telegram — conectar bot</h2>
          <ol className="text-sm text-muted-foreground list-decimal ml-5 space-y-1">
            <li>Abra <a href="https://t.me/BotFather" className="text-primary underline" target="_blank" rel="noreferrer">@BotFather</a> e envie <code>/newbot</code>. Copie o <strong>token</strong> gerado.</li>
            <li>Adicione esse bot como <strong>administrador</strong> do grupo (permissão mínima: gerenciar membros).</li>
            <li>No campo abaixo, cole o token do bot no link correspondente e clique <strong>Conectar</strong>.</li>
            <li>Pronto: cada novo membro que entrar no grupo passa a ser contabilizado automaticamente.</li>
          </ol>
          <div className="space-y-3 pt-2">
            {tgLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Você ainda não tem links do Telegram.</p>
            ) : (
              tgLinks.map((l) => <TelegramLinkRow key={l.id} link={l} />)
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Discord</h2>
          <p className="text-sm text-muted-foreground">
            O Discord não permite webhooks nativos para "novo membro" — é preciso um bot rodando 24/7
            que escute o evento <code>guildMemberAdd</code> e faça POST para:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
POST {origin}/api/public/webhooks/discord/{"{slug}"}
Header: x-webhook-secret: (seu DISCORD_WEBHOOK_SECRET)

{"{ user_id: \"123456789\" }"}
          </pre>
          <p className="text-xs text-muted-foreground">
            Se quiser, posso te ajudar a montar esse bot em outro servidor.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-2">WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Não é possível confirmar entradas em grupos WhatsApp de forma automatizada.
            A contagem exibida é uma <strong>estimativa baseada em cliques</strong> na página intermediária.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function TelegramLinkRow({ link }: { link: { id: string; slug: string; nome: string } }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState<{ botUsername: string | null } | null>(null);
  const connect = useServerFn(connectTelegramBot);
  const qc = useQueryClient();

  async function handleConnect() {
    setBusy(true);
    try {
      const res = await connect({ data: { slug: link.slug, botToken: token.trim() } });
      setConnected({ botUsername: res.botUsername });
      setToken("");
      toast.success(res.botUsername ? `Bot @${res.botUsername} conectado` : "Bot conectado");
      qc.invalidateQueries({ queryKey: ["analytics", link.slug] });
    } catch (err: any) {
      toast.error(err.message || "Falha ao conectar o bot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium truncate">{link.nome}</div>
          <code className="text-xs text-muted-foreground">{link.slug}</code>
        </div>
        {connected && (
          <Badge variant="secondary">
            {connected.botUsername ? `@${connected.botUsername}` : "conectado"}
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder="Cole aqui o token do bot (ex: 123456:ABC-...)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
        />
        <Button onClick={handleConnect} disabled={busy || !token.trim()}>
          {busy ? "Conectando..." : "Conectar"}
        </Button>
      </div>
    </div>
  );
}