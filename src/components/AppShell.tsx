import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/links.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link2, LayoutDashboard, PlusCircle, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const getRole = useServerFn(getMyRole);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => getRole() });

  const isAdmin = data?.isAdmin ?? false;
  const nome = data?.profile?.nome ?? "";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">Web3Brasil</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavItem>
          <NavItem to="/links/new" icon={<PlusCircle className="h-4 w-4" />}>Novo link</NavItem>
          {isAdmin && (
            <>
              <NavItem to="/team" icon={<Users className="h-4 w-4" />}>Equipe</NavItem>
              <NavItem to="/settings/bots" icon={<Settings className="h-4 w-4" />}>Bots & Webhooks</NavItem>
            </>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground px-2 pb-2 truncate">
            {nome} {isAdmin && <span className="text-primary">· admin</span>}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link
      to={to as any}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors [&.active]:bg-sidebar-accent [&.active]:text-primary"
      activeProps={{ className: "active" }}
    >
      {icon}
      {children}
    </Link>
  );
}