import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { stripePromise } from '@/lib/stripe';
import toast from 'react-hot-toast';

interface UseStripePaymentReturn {
  isProcessing: boolean;
  processPayment: (packId: string) => Promise<void>;
}

export function useStripePayment(): UseStripePaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const processPayment = async (packId: string) => {
    if (!user) {
      toast.error('Please sign in to make a purchase');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Taking you to Checkout...');

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      if (!sessionId) {
        throw new Error('No session ID received from API');
      }

      // Redirect to Stripe checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Redirecting to payment...', { id: loadingToast });
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed', {
        id: loadingToast,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    processPayment,
  };
}
