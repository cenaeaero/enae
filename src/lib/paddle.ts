import crypto from "crypto";

// Paddle Billing (Merchant of Record) — cobros internacionales en USD.
// Usamos la API REST directamente (sin SDK) para no agregar dependencias.

const IS_PRODUCTION = process.env.PADDLE_ENV === "production";
const API_BASE = IS_PRODUCTION
  ? "https://api.paddle.com"
  : "https://sandbox-api.paddle.com";

const API_KEY = process.env.PADDLE_API_KEY || "";

type CreateTxnArgs = {
  amountUsd: number; // dólares enteros, ej: 350
  courseName: string;
  customData: Record<string, string>; // ej: { registration_id, payment_id }
  customerEmail?: string;
};

// Crea una transacción "non-catalog" (precio dinámico) y devuelve su id (txn_...).
// El cliente abre el overlay de Paddle.js con este transactionId.
export async function createPaddleTransaction(args: CreateTxnArgs): Promise<{ id: string }> {
  if (!API_KEY) throw new Error("PADDLE_API_KEY no configurada");

  const body: Record<string, unknown> = {
    items: [
      {
        quantity: 1,
        price: {
          description: args.courseName.slice(0, 200),
          name: "Matrícula",
          unit_price: {
            // Paddle usa el mínimo de la moneda como string (USD → centavos).
            amount: String(Math.round(args.amountUsd * 100)),
            currency_code: "USD",
          },
          product: {
            name: args.courseName.slice(0, 200),
            tax_category: "standard",
          },
        },
      },
    ],
    collection_mode: "automatic",
    custom_data: args.customData,
  };

  if (args.customerEmail) {
    body.customer = { email: args.customerEmail };
  }

  const res = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.detail || json?.error?.code || JSON.stringify(json);
    throw new Error(`Paddle transactions error: ${msg}`);
  }
  return { id: json.data.id as string };
}

// Verifica la firma HMAC-SHA256 del webhook de Paddle Billing.
// Header: `Paddle-Signature: ts=<unix>;h1=<hex>` — se firma `${ts}:${rawBody}`.
export function verifyPaddleSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET || "";
  if (!secret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => {
      const [k, v] = kv.split("=");
      return [k?.trim(), v?.trim()];
    })
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signed = `${ts}:${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");

  // Comparación en tiempo constante.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(h1, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
