import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createLink } from "@/lib/links.functions";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/links/new")({
  head: () => ({ meta: [{ title: "Novo link — web3brasillinks" }] }),
  component: NewLink,
});

function sanitizeSlugPrefix(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function NewLink() {
  const navigate = useNavigate();
  const create = useServerFn(createLink);
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [slugPrefixo, setSlugPrefixo] = useState("");
  const [plataforma, setPlataforma] = useState<"telegram" | "discord" | "whatsapp" | "x" | "instagram">("telegram");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (slugPrefixo.length < 3) {
      toast.error("O texto do link precisa ter pelo menos 3 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await create({ data: { nome, destino_url: url, plataforma, slug_prefixo: slugPrefixo } });
      if (!res.ok) {
        toast.error(
          res.reason === "slug_taken"
            ? "Esse link já está em uso, escolha outro texto"
            : "Não foi possível criar o link"
        );
        return;
      }
      toast.success("Link criado!");
      navigate({ to: "/links/$slug", params: { slug: res.link.slug } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2">Novo link</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Todos os links terminam em <code className="text-primary">-web3brasil</code>.
        </p>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / apelido</Label>
              <Input id="nome" required maxLength={120} value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Grupo VIP outubro" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL de destino (convite do grupo)</Label>
              <Input id="url" type="url" required value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://t.me/..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Texto do link</Label>
              <Input id="slug" required minLength={3} maxLength={30} value={slugPrefixo}
                onChange={(e) => setSlugPrefixo(sanitizeSlugPrefix(e.target.value))}
                placeholder="Ex: chacal" />
              <p className="text-xs text-muted-foreground">
                Link final: <span className="text-primary font-mono">
                  {slugPrefixo || "seutexto"}-web3brasil
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={plataforma} onValueChange={(v: any) => setPlataforma(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="x">X (Twitter)</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Criando..." : "Gerar link curto"}
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
