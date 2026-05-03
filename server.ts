import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/checkout", async (req, res) => {
    try {
      const { items } = req.body;
      const stripe = getStripe();

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Invalid items" });
      }

      const lineItems = items.map((item: any) => {
        return {
          price_data: {
            currency: "brl",
            product_data: {
              name: item.name,
              images: item.image_url ? [item.image_url] : [],
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.cartQuantity || 1,
        };
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'boleto', 'pix'],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/success`,
        cancel_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/`,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  app.post("/api/create-payment-link", async (req, res) => {
    try {
      const { amount, description } = req.body;
      const stripe = getStripe();

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'boleto', 'pix'],
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: {
              name: description || "Pagamento de Pedido",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/success`,
        cancel_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
