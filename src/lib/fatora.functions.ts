import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Plan = "pro" | "coins_100" | "coins_500" | "coins_1000";

const PLANS: Record<Plan, { amount: number; name: string }> = {
  pro: { amount: 50, name: "ترقية PRO" },
  coins_100: { amount: 25, name: "100 كريديت" },
  coins_500: { amount: 100, name: "500 كريديت" },
  coins_1000: { amount: 180, name: "1000 كريديت" },
};

export const createFatoraCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: Plan; origin: string }) => {
    if (!PLANS[input.plan]) throw new Error("invalid plan");
    return input;
  })
  .handler(async ({ data, context }) => {
    const apiKey = process.env.FATORA_API_KEY;
    if (!apiKey) throw new Error("FATORA_API_KEY not configured");

    const plan = PLANS[data.plan];
    const orderId = `${data.plan}_${context.userId}_${Date.now()}`;

    const res = await fetch("https://api.fatora.io/v1/payments/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_key: apiKey,
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: "EGP",
        order_id: orderId,
        client: {
          name: context.claims?.email ?? "Customer",
          email: context.claims?.email ?? "customer@example.com",
        },
        language: "ar",
        success_url: `${data.origin}/api/public/fatora/success?order=${orderId}`,
        failure_url: `${data.origin}/pro-upgrade?payment=failed`,
        note: plan.name,
      }),
    });

    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== "SUCCESS") {
      console.error("Fatora error:", json);
      throw new Error(json?.error?.description || json?.message || "Fatora checkout failed");
    }

    const url = json?.result?.checkout_url;
    if (!url) throw new Error("No checkout_url returned");
    return { url, orderId };
  });
