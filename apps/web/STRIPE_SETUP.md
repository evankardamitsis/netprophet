# Stripe Integration Setup

This guide will help you set up Stripe payments for the NetProphet coin top-up feature.

## 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints

## 2. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 3. Database Setup

Run the following migrations to set up the required database functions and tables:

```bash
# Apply the migrations
supabase db push
```

This will create:

- `add_coins_to_balance` function
- `transactions` table with proper RLS policies

## 4. Webhook Configuration

1. In your Stripe Dashboard, go to Webhooks
2. Add a new endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select the following events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret to your environment variables

## 5. Testing

### Test Cards

Use these test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Mode

The integration is configured for test mode by default. For production:

1. Replace test keys with live keys
2. Update webhook endpoints to production URLs
3. Test thoroughly with small amounts

## 6. Coin Pack Configuration

The coin packs are configured in `/api/stripe/create-checkout-session/route.ts`:

```typescript
const coinPacks = {
  starter: { name: "Starter Pack", price: 199, coins: 350 }, // €1.99
  basic: { name: "Basic Pack", price: 499, coins: 950 }, // €4.99
  pro: { name: "Pro Pack", price: 999, coins: 1950 }, // €9.99
  champion: { name: "Champion Pack", price: 1999, coins: 3900 }, // €19.99
  legend: { name: "Legend Pack", price: 3999, coins: 7700 }, // €39.99
};
```

## 7. Security Considerations

- All API routes are protected with proper validation
- Webhook signatures are verified
- User authentication is required for purchases
- RLS policies protect transaction data
- Service role key is used only for webhook processing

## 8. Error Handling

The integration includes comprehensive error handling:

- Payment failures are logged
- User-friendly error messages
- Automatic balance updates on successful payments
- Transaction records for audit trails

## 9. Monitoring

Monitor your Stripe Dashboard for:

- Successful payments
- Failed payments
- Webhook delivery status
- Dispute management

## 10. Production Checklist

Before going live:

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoints
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerts
- [ ] Review compliance requirements
- [ ] Test refund process
- [ ] Verify webhook reliability
