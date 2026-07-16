import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const telegramSchema = z.object({
  slug: z.string().min(1),
  botToken: z.string().trim().regex(/^\d+:[A-Za-z0-9_-]{30,}$/, "Token do bot inválido"),
});

/**
 * Lista os links da plataforma Telegram do usuário (admin vê todos).
 */
export const listTelegramLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("links")
      .select("id, slug, nome, destino_url, plataforma, criado_em")
      .eq("plataforma", "telegram")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Conecta o bot do Telegram ao link: chama a API do Telegram para configurar o
 * webhook apontando para nossa rota pública com o secret compartilhado.
 * O token do bot NÃO é armazenado no banco — usado só nesta chamada.
 */
export const connectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => telegramSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Confirma que o usuário é dono do link (ou admin), via RLS
    const { data: link, error } = await context.supabase
      .from("links")
      .select("id, slug, plataforma")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) throw new Error("Link não encontrado ou sem permissão");
    if (link.plataforma !== "telegram") throw new Error("Este link não é do Telegram");

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const base = process.env.PUBLIC_APP_URL || process.env.SITE_URL;
    if (!secret) throw new Error("Servidor sem TELEGRAM_WEBHOOK_SECRET configurado");
    if (!base) throw new Error("Servidor sem PUBLIC_APP_URL configurado");

    const webhookUrl = `${base.replace(/\/$/, "")}/api/public/webhooks/telegram/${link.slug}`;

    const res = await fetch(`https://api.telegram.org/bot${data.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "chat_member", "my_chat_member"],
        drop_pending_updates: false,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
      result?: unknown;
    };
    if (!res.ok || !payload.ok) {
      throw new Error(payload.description || `Telegram respondeu ${res.status}`);
    }

    // Busca info do bot pra devolver nome
    const me = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`)
      .then((r) => r.json())
      .catch(() => null);

    return {
      ok: true,
      webhookUrl,
      botUsername: me?.result?.username ?? null,
    };
  });

/**
 * Remove o webhook do bot (útil se o usuário quiser desconectar).
 */
export const disconnectTelegramBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ botToken: z.string().trim().regex(/^\d+:[A-Za-z0-9_-]{30,}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`https://api.telegram.org/bot${data.botToken}/deleteWebhook`, {
      method: "POST",
    });
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !payload.ok) throw new Error(payload.description || `Telegram respondeu ${res.status}`);
    return { ok: true };
  });