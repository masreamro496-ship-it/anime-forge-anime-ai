import { createFileRoute } from "@tanstack/react-router";

const PLAN_CREDITS: Record<string, number> = {
  coins_100: 100,
  coins_500: 500,
  coins_1000: 1000,
};

export const Route = createFileRoute("/api/public/fatora/success")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order");
        const origin = url.origin;

        const fail = (msg: string) =>
          Response.redirect(`${origin}/pro-upgrade?payment=failed&reason=${encodeURIComponent(msg)}`, 302);

        if (!orderId) return fail("missing_order");

        const apiKey = process.env.FATORA_API_KEY;
        if (!apiKey) return fail("server_not_configured");

        // Verify with Fatora
        let verifyJson: any;
        try {
          const verifyRes = await fetch("https://api.fatora.io/v1/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", api_key: apiKey },
            body: JSON.stringify({ order_id: orderId }),
          });
          verifyJson = await verifyRes.json().catch(() => ({}));
        } catch (e) {
          console.error("Fatora verify error", e);
          return fail("verify_failed");
        }

        const status = verifyJson?.result?.status || verifyJson?.status;
        const ok =
          verifyJson?.status === "SUCCESS" &&
          (status === "SUCCESS" || status === "success" || verifyJson?.result?.payment_status === "SUCCESS");
        if (!ok) {
          console.warn("Fatora payment not successful", verifyJson);
          return fail("not_paid");
        }

        // Parse: ${plan}_${userId}_${ts}  where plan may contain underscore (coins_100)
        const parts = orderId.split("_");
        if (parts.length < 3) return fail("bad_order");
        const ts = parts[parts.length - 1];
        const userId = parts[parts.length - 2];
        const plan = parts.slice(0, parts.length - 2).join("_");
        void ts;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: skip if already recorded
        const { data: existing } = await supabaseAdmin
          .from("credit_transactions")
          .select("id")
          .eq("description", `fatora:${orderId}`)
          .maybeSingle();
        if (existing) {
          return Response.redirect(`${origin}/dashboard?payment=success&already=1`, 302);
        }

        if (plan === "pro") {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: true, updated_at: new Date().toISOString() })
            .eq("id", userId);
          // bonus credits
          const { data: cur } = await supabaseAdmin
            .from("credits")
            .select("balance")
            .eq("user_id", userId)
            .maybeSingle();
          const newBal = Number(cur?.balance ?? 0) + 50;
          await supabaseAdmin
            .from("credits")
            .upsert({ user_id: userId, balance: newBal, updated_at: new Date().toISOString() });
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            amount: 50,
            kind: "purchase",
            description: `fatora:${orderId}`,
          });
        } else {
          const amount = PLAN_CREDITS[plan];
          if (!amount) return fail("unknown_plan");
          const { data: cur } = await supabaseAdmin
            .from("credits")
            .select("balance")
            .eq("user_id", userId)
            .maybeSingle();
          const newBal = Number(cur?.balance ?? 0) + amount;
          await supabaseAdmin
            .from("credits")
            .upsert({ user_id: userId, balance: newBal, updated_at: new Date().toISOString() });
          await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            amount,
            kind: "purchase",
            description: `fatora:${orderId}`,
          });
        }

        return Response.redirect(`${origin}/dashboard?payment=success&plan=${encodeURIComponent(plan)}`, 302);
      },
    },
  },
});
