import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/links.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link2, LayoutDashboard, PlusCircle, Users, Settings, LogOut, Download, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const getRole = useServerFn(getMyRole);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => getRole() });

  const isAdmin = data?.isAdmin ?? false;
  const nome = data?.profile?.nome ?? "";

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e);
      if (import.meta.env.DEV) console.log("[PWA] beforeinstallprompt captured");
    }
    function onInstalled() {
      setInstallPrompt(null);
      setIsInstalled(true);
      if (import.meta.env.DEV) console.log("[PWA] appinstalled");
    }
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    if (standalone) setIsInstalled(true);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    setMenuOpen(false);
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (import.meta.env.DEV) console.log("[PWA] userChoice:", outcome);
      setInstallPrompt(null);
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    toast.info(
      isIos
        ? "No iPhone/iPad: toque em Compartilhar e depois em 'Adicionar à Tela de Início'."
        : "Abra o menu do navegador e escolha 'Instalar app' ou 'Adicionar à tela inicial'."
    );
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">web3brasillinks</span>
        </div>
        <button
          className="md:hidden p-1 text-sidebar-foreground"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} onNavigate={() => setMenuOpen(false)}>Dashboard</NavItem>
        <NavItem to="/links/new" icon={<PlusCircle className="h-4 w-4" />} onNavigate={() => setMenuOpen(false)}>Novo link</NavItem>
        {isAdmin && (
          <>
            <NavItem to="/team" icon={<Users className="h-4 w-4" />} onNavigate={() => setMenuOpen(false)}>Equipe</NavItem>
            <NavItem to="/settings/bots" icon={<Settings className="h-4 w-4" />} onNavigate={() => setMenuOpen(false)}>Bots & Webhooks</NavItem>
          </>
        )}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {!isInstalled && (
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleInstall}>
            <Download className="h-4 w-4 mr-2" /> Baixar app
          </Button>
        )}
        <div className="text-xs text-muted-foreground px-2 pt-2 pb-1 truncate">
          {nome} {isAdmin && <span className="text-primary">· admin</span>}
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">web3brasillinks</span>
        </div>
        <button
          className="p-2 text-sidebar-foreground"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative z-50 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-border bg-sidebar flex-col">
        {sidebarContent}
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}

function NavItem({
  to, icon, children, onNavigate,
}: { to: string; icon: ReactNode; children: ReactNode; onNavigate?: () => void }) {
  return (
    <Link
      to={to as any}
      onClick={onNavigate}
      className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors [&.active]:bg-sidebar-accent [&.active]:text-primary"
      activeProps={{ className: "active" }}
    >
      {icon}
      {children}
    </Link>
  );
}

