# TP4 — Sesiones de pago y webhook Stripe

Microservicio HTTP en **NestJS** que crea sesiones de pago contra Stripe y recibe
el aviso del cobro por webhook.

**Materia:** Programación Avanzada — 2026 — FCyT — LISI (UADER)

---

## Qué hace

1. **Crea una Checkout Session** (modo `payment`) y devuelve `id` y `url`.
2. **Recibe el webhook** de Stripe, verifica la firma y, cuando llega
   `charge.succeeded`, registra el `orderId` que viajó en la metadata.

Fuera de alcance (según la consigna): MS de órdenes, NATS/TCP, reembolsos y
modo live de Stripe.

---

## Requisitos

- Node.js 22+
- npm
- [Stripe CLI](https://docs.stripe.com/stripe-cli) (para probar el webhook)
- Una cuenta de Stripe en **modo test**

---

## Cómo levantarlo

```bash
# 1. Dependencias
npm install --legacy-peer-deps

# 2. Variables de entorno
cp .env.template .env
#    y completar STRIPE_SECRET y STRIPE_ENDPOINT_SECRET

# 3. Arrancar
npm run start:dev
```

Queda escuchando en `http://localhost:3003`.

> La app **no arranca** si falta alguna variable obligatoria: la configuración
> es *fail-fast*. Es intencional.

---

## Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP (sugerido `3003`) |
| `STRIPE_SECRET` | Clave secreta de **test** (`sk_test_...`) |
| `STRIPE_SUCCESS_URL` | A dónde vuelve el usuario si paga |
| `STRIPE_CANCEL_URL` | A dónde vuelve si cancela |
| `STRIPE_ENDPOINT_SECRET` | Signing secret del webhook (`whsec_...`) |

El `.env` **no se versiona**. El `.env.template` sí, con los valores vacíos.

---

## Endpoints

### `POST /payments/create-payment-session`

**Body:**

```json
{
  "orderId": "ord-1",
  "currency": "usd",
  "items": [
    { "name": "Producto", "price": 20, "quantity": 1 }
  ]
}
```

**Respuesta:** `{ "id": "cs_test_...", "url": "https://checkout.stripe.com/..." }`

- `price` viaja a Stripe en **centavos**: `Math.round(price * 100)`.
- `orderId` se guarda en `payment_intent_data.metadata`.

**Validaciones (dan 400):** `orderId` o `currency` vacíos, `items` vacío o
ausente, `price` o `quantity` negativos o no numéricos, y **campos extra** que
no estén en el DTO.

### `GET /payments/success`

```json
{ "ok": true, "message": "Payment successful" }
```

### `GET /payments/cancel`

```json
{ "ok": false, "message": "Payment cancelled" }
```

### `POST /payments/webhook`

- Requiere el header `stripe-signature`.
- Usa el **cuerpo crudo** (`rawBody: true` en `NestFactory.create`).
- Firma inválida → **400** y el evento no se procesa.
- `charge.succeeded` → se loguea `PAGO CONFIRMADO - orderId=...`
- Cualquier otro `event.type` → log "Evento no manejado" y **200**, para que
  Stripe no reintente eternamente.

---

## Probar el webhook

```bash
stripe login
stripe listen --forward-to localhost:3003/payments/webhook
```

La CLI imprime un `whsec_...`: ese es el valor de `STRIPE_ENDPOINT_SECRET`.

Después, en otra terminal, crear una sesión:

```bash
curl -X POST http://localhost:3003/payments/create-payment-session \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ord-1","currency":"usd","items":[{"name":"Producto","price":20,"quantity":1}]}'
```

Abrir la `url` que devuelve y pagar con una
[tarjeta de prueba](https://docs.stripe.com/testing) (`4242 4242 4242 4242`).
En la terminal de `stripe listen` tiene que aparecer `charge.succeeded`.

---

## Estructura

```
src/
├── main.ts                                 # bootstrap: rawBody + ValidationPipe global
├── app.module.ts                           # ConfigModule con validación fail-fast
└── payments/
    ├── payments.module.ts
    ├── payments.controller.ts              # los 4 endpoints
    ├── payments.service.ts                 # Stripe SDK
    └── dto/
        └── create-payment-session.dto.ts   # class-validator + ValidateNested
```

---

## Checklist de la consigna

- [x] Módulo `payments` con DTO, controller y service
- [x] `POST` que crea la Checkout Session
- [x] `rawBody` activado y webhook con verificación de firma
- [x] `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`)
- [x] Config fail-fast
- [x] `.env` ignorado, `.env.template` versionado
- [ ] Probar con Stripe CLI hasta `charge.succeeded` (requiere las claves reales)
