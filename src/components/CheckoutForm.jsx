import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Backend se intent secret lein
      const res = await fetch('https://ai-resume-analyzer-ats-henna.vercel.app/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || 'Failed to initialize payment gateway.');
      }

      // 2. Card details submit karein
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Payment processing error. Please try again.');
    } finally {
      setLoading(false); // Har haal mein processing stop hogi
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
      <label className="block text-xs font-bold text-slate-700">Credit or Debit Card</label>
      <div className="p-3 border border-slate-300 rounded-lg bg-slate-50">
        <CardElement options={{ style: { base: { fontSize: '14px' } } }} />
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:bg-slate-300 cursor-pointer"
      >
        {loading ? 'Processing...' : 'Pay $2.00 (Pro Unlock)'}
      </button>
    </form>
  );
}