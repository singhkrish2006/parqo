// Demo only. This builds a UPI deep link the visitor's own UPI app opens —
// Parqo never touches money or credentials. Before this can take real
// payments you need your own merchant VPA from a licensed payment
// aggregator (Razorpay, Cashfree, PhonePe for Business, etc.) — that
// account has to be created by you, not by this code.
const DEMO_PAYEE_VPA = "your-upi-id@bank"; // replace with a real merchant VPA later

export function buildUpiPayLink(opts: {
  amount: number;
  note: string;
  payeeName?: string;
}): string {
  const params = new URLSearchParams({
    pa: DEMO_PAYEE_VPA,
    pn: opts.payeeName ?? "Parqo",
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note,
  });
  return `upi://pay?${params.toString()}`;
}

export const isUpiDemoConfigured = DEMO_PAYEE_VPA !== "your-upi-id@bank";
