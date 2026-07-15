import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/settings/bots")({
  head: () => ({ meta: [{ title: "Bots & Webhooks — Web3Brasil Links" }] }),
  component: BotsSettings,
});

function BotsSettings() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://SEU-DOMINIO";
  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bots & Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Para rastrear entradas reais nos grupos, configure um bot externo (fora desta plataforma).
          </p>
        </div>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Telegram</h2>
          <p className="text-sm text-muted-foreground">
            Crie um bot pelo <a href="https://t.me/BotFather" className="text-primary underline" target="_blank" rel="noreferrer">@BotFather</a>,
            adicione o bot como <strong>admin</strong> do grupo, e configure o webhook para postar em:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
POST {origin}/api/public/webhooks/telegram/{"{slug}"}
Content-Type: application/json

{"{ message: {"} new_chat_members: [...] {"} }"}
          </pre>
          <p className="text-xs text-muted-foreground">
            Substitua <code>{"{slug}"}</code> pelo slug do link (ex: <code>x7f2a-web3brasil</code>).
          </p>
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Discord</h2>
          <p className="text-sm text-muted-foreground">
            Crie um bot em <a href="https://discord.com/developers/applications" className="text-primary underline" target="_blank" rel="noreferrer">discord.com/developers</a>,
            escute o evento <code>guildMemberAdd</code> e faça POST em:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-auto">
POST {origin}/api/public/webhooks/discord/{"{slug}"}
Content-Type: application/json

{"{ user_id: \"123456789\" }"}
          </pre>
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