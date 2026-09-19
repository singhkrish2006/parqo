// Off by default. Parqo does not take payments yet: this only builds a UPI
// deep link the visitor's own UPI app opens, and paying it does NOT reserve
// anything. Enable for internal demos with NEXT_PUBLIC_UPI_DEMO=1 and
// NEXT_PUBLIC_UPI_VPA=<your test VPA>. For real payments you need a merchant
// account with a licensed payment aggregator (Razorpay, Cashfree, PhonePe for
// Business, ...) — that has to be set up by you, not by this code.
const PAYEE_VPA = process.env.NEXT_PUBLIC_UPI_VPA ?? "";

export const isUpiDemoEnabled =
  process.env.NEXT_PUBLIC_UPI_DEMO === "1" && PAYEE_VPA.length > 0;

export function buildUpiPayLink(opts: {
  amount: number;
  note: string;
  payeeName?: string;
}): string {
  const params = new URLSearchParams({
    pa: PAYEE_VPA,
    pn: opts.payeeName ?? "Parqo",
    am: opts.amount.toFixed(2),
    cu: "INR",
    tn: opts.note,
  });
  return `upi://pay?${params.toString()}`;
}
