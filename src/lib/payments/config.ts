export type PaymentMethod = "instapay" | "fawry";

export function getPaymentConfiguration() {
  return {
    enabledMethods: ["instapay", "fawry"] as const,
    instapayReceiverIdentifier: process.env.INSTAPAY_RECEIVER_IDENTIFIER ?? "",
    fawryMerchantConfigured: Boolean(process.env.FAWRY_MERCHANT_CODE && process.env.FAWRY_SECRET_KEY)
  };
}

// Never mark a payment as paid from a screenshot or client-side button.
// InstaPay submissions remain pending until an owner verifies them.
// Fawry payments must be confirmed by a verified provider callback.
