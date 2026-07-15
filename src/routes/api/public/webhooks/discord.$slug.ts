import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/discord/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const expected = process.env.DISCORD_WEBHOOK_SECRET;
          const provided = request.headers.get("x-webhook-secret");
          if (!expected || provided !== expected) {
            return Response.json({ ok: false }, { status: 401 });
          }
          const body = await request.json();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: link } = await supabaseAdmin
            .from("links").select("id, plataforma").eq("slug", params.slug).maybeSingle();
          if (!link || link.plataforma !== "discord") {
            return Response.json({ ok: false, error: "link não encontrado" }, { status: 404 });
          }
          // Expected: { user_id: "..." } — bot posts on guildMemberAdd
          const userId = body?.user_id ?? body?.user?.id ?? null;
          await supabaseAdmin.from("group_joins").insert({
            link_id: link.id,
            platform: "discord",
            platform_user_id: userId ? String(userId) : null,
          });
          return Response.json({ ok: true });
        } catch (e) {
          console.error("discord webhook", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});