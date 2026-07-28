async function createPayment(priceAmount: number, orderId: string) {
  const response = await fetch('https://api.nowpayments.io/v1/payment', {
    method: 'POST',
    headers: {
      'x-api-key': 'HJB6ZHJ-3T9MZF5-JNDXWVP-3HKEKKJ',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      price_amount: priceAmount,
      price_currency: 'usd',
      pay_currency: 'usdtbsc',
      order_id: orderId,
      order_description: 'شراء منتج من موقعك'
    })
  });

  const data = await response.json();
  return data.invoice_url; // return data.invoice_url; // link to redirect customer

}

