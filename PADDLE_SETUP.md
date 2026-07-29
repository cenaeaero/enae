# Pago internacional (USD) con Paddle — Guía de configuración

Paddle es un **Merchant of Record**: cobra en USD a alumnos de cualquier país, retiene
los impuestos que correspondan en cada país y te paga a Chile vía **Payoneer/Wise**.
Convive con Transbank Webpay (CLP), que sigue siendo el pago para alumnos chilenos.

## 1. Cuenta y verificación (lo haces tú, no se puede automatizar)

1. Crea la cuenta en <https://www.paddle.com> (usa **Paddle Billing**, no el "Classic").
2. Completa la verificación del negocio (CENAE SpA). Suele tardar **1–3 días hábiles**.
3. Configura el **payout** a Chile (Paddle paga por Payoneer/Wise, no transferencia directa).

## 2. Credenciales → variables de entorno en Vercel

En Paddle → **Developer Tools**:

| Variable | Dónde se obtiene | Visibilidad |
|---|---|---|
| `PADDLE_API_KEY` | Developer Tools → Authentication → API keys | **Secreta** (servidor) |
| `PADDLE_WEBHOOK_SECRET` | Developer Tools → Notifications → (tu destino) → Secret key | **Secreta** (servidor) |
| `PADDLE_ENV` | `sandbox` para pruebas, `production` en vivo | Servidor |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Developer Tools → Authentication → Client-side tokens | Pública (navegador) |
| `NEXT_PUBLIC_PADDLE_ENV` | `sandbox` o `production` (igual que `PADDLE_ENV`) | Pública |

> Cárgalas en Vercel → Project → Settings → Environment Variables, y redeploy.

## 3. Webhook

En Paddle → Developer Tools → **Notifications** → New destination:

- **URL:** `https://www.enae.cl/api/pago/paddle/webhook`
- **Evento:** `transaction.completed`
- Copia el **Secret key** generado a `PADDLE_WEBHOOK_SECRET`.

El webhook marca el pago como aprobado, confirma la inscripción y dispara los correos
(comprobante al alumno, aviso al admin y acceso al curso) — igual que Transbank.

## 4. Migración de base de datos

Ejecuta en Supabase (SQL Editor) el archivo:

```
supabase/migration_paddle.sql
```

Agrega `provider`, `paddle_transaction_id`, `paddle_response` a `payments` y `price_usd`
a `sessions`.

## 5. Definir el precio en USD

En el admin: **Cursos → (curso) → Sesión → "Precio internacional (USD)"**.
Deja el campo vacío para no ofrecer pago internacional en esa sesión.
Cuando tenga un valor (> 0), al alumno le aparece el botón **"🌎 Pagar USD $…"** en su portal.

## 6. Prueba en sandbox

Con `PADDLE_ENV=sandbox`, usa una [tarjeta de prueba de Paddle](https://developer.paddle.com/concepts/payment-methods/credit-debit-card)
(ej. `4242 4242 4242 4242`, cualquier fecha futura y CVC). Verifica que:

1. El overlay abre y cobra.
2. El webhook confirma la inscripción (estado pasa a **Confirmed**).
3. Llegan los tres correos.

Luego cambia a `production` y repite con un monto pequeño real.
