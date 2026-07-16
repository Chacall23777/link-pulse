import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createLinkSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  destino_url: z.string().trim().url().max(2000),
  plataforma: z.enum(["telegram", "discord", "whatsapp"]),
  slug_prefixo: z.string().trim().toLowerCase().min(3).max(30)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífen"),
});

export const createLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createLinkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const slug = `${data.slug_prefixo}-web3brasil`;
    const { data: row, error } = await context.supabase
      .from("links")
      .insert({
        user_id: context.userId,
        slug,
        destino_url: data.destino_url,
        nome: data.nome,
        plataforma: data.plataforma,
      })
      .select()
      .single();
    if (error) {
      if (error.message.includes("duplicate")) {
        throw new Error("Esse link já está em uso, escolha outro texto");
      }
      console.error("createLink error", error);
      throw new Error("Não foi possível criar o link");
    }
    return row;
  });

export const listLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("links")
      .select("id, slug, nome, destino_url, plataforma, criado_em, user_id")
      .order("criado_em", { ascending: false });
    if (error) {
      console.error("listLinks error", error);
      throw new Error("Não foi possível carregar os links");
    }

    const linkIds = (data ?? []).map((l) => l.id);
    let clickCounts: Record<string, number> = {};
    let joinCounts: Record<string, number> = {};
    let profileMap: Record<string, string> = {};
    if (linkIds.length) {
      const { data: clicks } = await context.supabase
        .from("clicks").select("link_id").in("link_id", linkIds);
      for (const c of clicks ?? []) clickCounts[c.link_id] = (clickCounts[c.link_id] || 0) + 1;
      const { data: joins } = await context.supabase
        .from("group_joins").select("link_id").in("link_id", linkIds);
      for (const j of joins ?? []) joinCounts[j.link_id] = (joinCounts[j.link_id] || 0) + 1;

      const userIds = Array.from(new Set((data ?? []).map((l) => l.user_id)));
      const { data: profs } = await context.supabase
        .from("profiles").select("id, nome").in("id", userIds);
      for (const p of profs ?? []) profileMap[p.id] = p.nome;
    }

    return (data ?? []).map((l) => ({
      ...l,
      criador_nome: profileMap[l.user_id] ?? "—",
      total_clicks: clickCounts[l.id] || 0,
      total_joins: joinCounts[l.id] || 0,
    }));
  });

export const getLinkAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: link, error } = await context.supabase
      .from("links")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) {
      console.error("getLinkAnalytics error", error);
      throw new Error("Não foi possível carregar as métricas");
    }
    if (!link) throw new Error("Link não encontrado");

    const { data: clicks } = await context.supabase
      .from("clicks")
      .select("timestamp, ip_hash, referrer")
      .eq("link_id", link.id)
      .order("timestamp", { ascending: true });

    const { data: joins } = await context.supabase
      .from("group_joins")
      .select("id, timestamp, platform_user_id")
      .eq("link_id", link.id);

    const clicksArr = clicks ?? [];
    const uniqueIps = new Set(clicksArr.map((c) => c.ip_hash).filter(Boolean));

    const byDay: Record<string, number> = {};
    for (const c of clicksArr) {
      const day = new Date(c.timestamp).toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }
    const daily = Object.entries(byDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    const refCounts: Record<string, number> = {};
    for (const c of clicksArr) {
      const r = c.referrer || "Direto";
      refCounts[r] = (refCounts[r] || 0) + 1;
    }
    const referrers = Object.entries(refCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      link,
      total_clicks: clicksArr.length,
      unique_clicks: uniqueIps.size,
      total_joins: (joins ?? []).length,
      daily,
      referrers,
    };
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("links").delete().eq("id", data.id);
    if (error) {
      console.error("deleteLink error", error);
      throw new Error("Não foi possível excluir o link");
    }
    return { ok: true };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const { data: profile } = await context.supabase
      .from("profiles").select("nome, email, ativo").eq("id", context.userId).maybeSingle();
    return {
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      profile,
    };
  });
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const { data: profile } = await context.supabase
      .from("profiles").select("nome, email, ativo").eq("id", context.userId).maybeSingle();
    return {
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      profile,
    };
  });
