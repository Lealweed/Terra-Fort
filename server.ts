import express from "express";
import { existsSync } from "fs";
import { createServer as createViteServer } from "vite";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";
import { buildAgentContext } from "./api/_agentContext.js";
import { requireIntegrationAccess } from "./api/_integrationAuth.js";
import { getStripe } from "./api/_stripe.js";
import { createCheckoutSession } from "./src/server-core/checkout.js";
import { getCheckoutErrorMessage, getCheckoutErrorStatus } from "./src/server-core/stripe-error.js";
import { createPaymentLink } from "./src/server-core/payment-link.js";
import { handleSupportIntake } from "./api/_supportIntake.js";
import { registerAdminUsersRoute } from "./src/server-core/admin-users-route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || 'unknown_error');
  return raw
    .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token|secret|key|authorization)=[^\s&]+/gi, '$1=[REDACTED]')
    .slice(0, 400);
}

function normalizeSupportBody(rawBody: unknown) {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof rawBody === 'object' && !Array.isArray(rawBody)) {
    return rawBody;
  }

  return {};
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const runtime = (process.env.SERVER_RUNTIME || "").toLowerCase();
  const distPath = path.join(process.cwd(), "dist");
  const distIndexPath = path.join(distPath, "index.html");
  const useDevRuntime = runtime === "dev" || (!runtime && process.env.NODE_ENV !== "production");

  app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const stripe = getStripe();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return res.status(500).json({ error: "Missing STRIPE_WEBHOOK_SECRET" });
      }

      const signature = req.headers["stripe-signature"];
      if (!signature || typeof signature !== "string") {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        console.log("[webhook] checkout.session.completed", {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          orderRef: session.metadata?.orderRef,
        });
      }

      return res.json({ received: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Webhook validation failed" });
    }
  });

  app.use(express.json());

  app.all("/api/agent-context", async (req, res) => {
    const auth = requireIntegrationAccess(req);
    if (auth.ok === false) {
      return res.status(auth.status).json({ error: auth.error });
    }

    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const input = req.method === "GET" ? req.query || {} : req.body || {};
      const context = await buildAgentContext({
        phone: typeof input.phone === "string" ? input.phone : undefined,
        email: typeof input.email === "string" ? input.email : undefined,
        orderCode: typeof input.orderCode === "string" ? input.orderCode : undefined,
        productQuery: typeof input.productQuery === "string" ? input.productQuery : undefined,
      });
      return res.json(context);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to build agent context" });
    }
  });

  app.post("/api/support-intake", async (req, res) => {
    const requestId = (typeof req?.headers?.["x-request-id"] === "string" && req.headers["x-request-id"].trim())
      || (typeof req?.headers?.["x-correlation-id"] === "string" && req.headers["x-correlation-id"].trim())
      || undefined;

    const whatsappNumber = String(process.env.VITE_SUPPORT_WHATSAPP_NUMBER || process.env.SUPPORT_WHATSAPP_NUMBER || "5594999346107").replace(/\D/g, "") || "5594999346107";
    const emergencyUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá! Preciso de atendimento da Terra Fort.")}`;

    try {
      const normalizedBody = normalizeSupportBody(req.body);
      const result = await handleSupportIntake(normalizedBody, { requestId, origin: "express_server" });
      if (result?.body?.requestId) {
        res.setHeader("x-request-id", result.body.requestId);
      }
      return res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error('[support-intake] express_unhandled_error', {
        requestId: requestId || 'unknown',
        error: sanitizeErrorMessage(error),
      });
      if (requestId) {
        res.setHeader("x-request-id", requestId);
      }
      return res.status(500).json({
        error: "Falha ao abrir atendimento. Tente novamente em instantes ou continue pelo WhatsApp.",
        requestId: requestId || "unknown",
        whatsappUrl: emergencyUrl,
        n8nErrorCode: "SUPPORT_INTAKE_UNHANDLED",
      });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const result = await createCheckoutSession(req.body || {}, {
        stripe: getStripe(),
        appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
      });

      res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(getCheckoutErrorStatus(error)).json({ error: getCheckoutErrorMessage(error) });
    }
  });

  app.post("/api/create-payment-link", async (req, res) => {
    try {
      const result = await createPaymentLink(req.body || {}, {
        stripe: getStripe(),
        appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
      });

      res.status(result.status).json(result.body);
    } catch (error: any) {
      console.error("Stripe payment-link error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  registerAdminUsersRoute(app);

  if (useDevRuntime) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    if (!existsSync(distIndexPath)) {
      throw new Error(`Missing build output at ${distIndexPath}. Run \"npm run build\" before \"npm run start\".`);
    }

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(distIndexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
