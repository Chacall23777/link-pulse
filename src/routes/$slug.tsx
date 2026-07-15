import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createHash } from "crypto";
import { z } from "zod";

const trackClick = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("links").select("id, destino_url").eq("slug", data.slug).maybeSingle();
    if (!link) return { destino: null };

    const ip = getRequestHeader("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const ua = getRequestHeader("user-agent") || "";
    const referrer = getRequestHeader("referer") || null;
    const ip_hash = createHash("sha256").update(ip + "|" + ua).digest("hex").slice(0, 32);

    await supabaseAdmin.from("clicks").insert({
      link_id: link.id,
      ip_hash,
      user_agent: ua.slice(0, 500),
      referrer: referrer?.slice(0, 500) ?? null,
    });
    return { destino: link.destino_url };
  });

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const res = await trackClick({ data: { slug: params.slug } });
    if (!res.destino) throw redirect({ to: "/" });
    throw redirect({ href: res.destino });
  },
  component: () => null,
});
