import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/telegram/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
          const provided = request.headers.get("x-telegram-bot-api-secret-token");
          if (!expected || provided !== expected) {
            return Response.json({ ok: false }, { status: 401 });
          }
          const body = await request.json();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: link } = await supabaseAdmin
            .from("links").select("id, plataforma").eq("slug", params.slug).maybeSingle();
          if (!link || link.plataforma !== "telegram") {
            return Response.json({ ok: false, error: "link não encontrado" }, { status: 404 });
          }
          const message = body?.message;
          const newMembers = message?.new_chat_members;
          if (Array.isArray(newMembers) && newMembers.length > 0) {
            const rows = newMembers.map((m: any) => ({
              link_id: link.id,
              platform: "telegram" as const,
              platform_user_id: String(m.id ?? ""),
            }));
            await supabaseAdmin.from("group_joins").insert(rows);
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("telegram webhook", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});