import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Web3Brasil Links" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password: senha,
          options: { data: { nome }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Faça login.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <Link2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Web3Brasil Links</h1>
        </div>
        <div className="flex gap-2 mb-6 text-sm">
          <button type="button"
            className={`px-3 py-1.5 rounded transition-colors ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("signin")}>Entrar</button>
          <button type="button"
            className={`px-3 py-1.5 rounded transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("signup")}>Criar primeira conta</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">
          Contas de funcionários são criadas pelo admin em Equipe.
          A primeira conta cadastrada vira admin automaticamente.
        </p>
      </Card>
    </main>
  );
}