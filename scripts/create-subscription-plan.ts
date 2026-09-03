import "dotenv/config";
import { PreApprovalPlan } from "mercadopago";
import { getMpClient } from "../src/lib/mercadopago";

const price = Number(process.env.SUBSCRIPTION_PRICE_ARS);
if (!price) throw new Error("Falta SUBSCRIPTION_PRICE_ARS en .env");

const plan = new PreApprovalPlan(getMpClient());

// Sin free_trial de Mercado Pago a propósito: el trial de 7 días ya lo maneja el propio
// proyecto con Admin.trialEndsAt (arranca en la aprobación de la escuela, no en el pago).
// Si el plan de MP también tuviera su propio trial, habría dos relojes de prueba distintos.
plan
  .create({
    body: {
      reason: "Attendio - Plan Único",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: price,
        currency_id: "ARS",
      },
      back_url: `${process.env.APP_BASE_URL}/admin/facturacion`,
    },
  })
  .then((result) => {
    console.log("Plan creado. Guardá este id como MP_PLAN_ID:", result.id);
  })
  .catch(console.error);
