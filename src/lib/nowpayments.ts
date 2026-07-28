export async function createPayment(priceAmount: number, orderId: string) {
  try {
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': 'HJB6ZHJ-3T9MZF5-JNDXWVP-3HKEKKJ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: 'usd',
        order_id: orderId,
        order_description: 'شراء منتج / ترقية من موقعك',
        success_url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '',
        cancel_url: typeof window !== 'undefined' ? window.location.origin : ''
      })
    });

    const data = await response.json();
    return data.invoice_url || null;
  } catch (error) {
    console.error("Payment error:", error);
    return null;
  }
}
