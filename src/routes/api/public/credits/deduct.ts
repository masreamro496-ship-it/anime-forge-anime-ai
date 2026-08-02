import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * نقطة استقبال طلبات خصم الكريدت من المواقع الخارجية (مثل: شات برمجي).
 *
 * POST /api/public/credits/deduct
 * Headers: x-api-key: <CREDITS_API_KEY>
 * Body: { "email": "user@example.com", "amount": 5, "source": "ai-coder", "reason": "توليد كود" }
 *
 * الرد:
 *  200 { ok: true, balance, deducted }
 *  402 { ok: false, error: "insufficient_credits", balance }
 *  404 { ok: false, error: "user_not_found" }
 */

const BodySchema = z.object({
  email: z.string().email(),
  amount: z.number().positive().max(100000),
  source: z.string().min(1).max(60),
  reason: z.string().max(200).optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-api-key",
      "access-control-allow-methods": "POST, OPTIONS",
    },
  });

export const Route = createFileRoute("/api/public/credits/deduct")({
  server: {
    handlers: {
      OPTIONS: async () => json({ ok: true }),
      POST: async ({ request }) => {
        const expected = process.env["CREDITS_API_KEY"];
        const provided =
          request.headers.get("x-api-key") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        if (!expected || provided !== expected) {
          return json({ ok: false, error: "unauthorized" }, 401);
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }

        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, error: "invalid_body", details: parsed.error.flatten() }, 400);
        }

        const { email, amount, source, reason } = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await (supabaseAdmin as unknown as {
          rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
        }).rpc("api_deduct_credits", {
          _email: email,
          _amount: amount,
          _source: source,
          _reason: reason ?? null,
        });

        if (error) return json({ ok: false, error: error.message }, 500);

        const result = data as { ok: boolean; error?: string; balance?: number; deducted?: number };
        if (!result?.ok) {
          const status = result?.error === "user_not_found" ? 404 : result?.error === "insufficient_credits" ? 402 : 400;
          return json(result, status);
        }

        return json(result, 200);
      },
    },
  },
});
