const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../services/logger');
const { stripeEnabled, getStripe } = require('../services/payments');
const Payment = require('../models/Payment');

const myCheckoutMode = asyncHandler(async (_req, res) => {
  res.json({
    mode: stripeEnabled() ? 'stripe' : 'simulated',
  });
});

async function handleStripeWebhook(req, res) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !stripeEnabled()) {
    return res.json({ ignored: true });
  }
  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.warn({ err: err.message }, 'stripe webhook signature failed');
    return res.status(400).json({ message: 'Invalid signature' });
  }
  const intent = event.data?.object;
  if (event.type === 'payment_intent.succeeded' && intent?.metadata?.contractId) {
    await Payment.findOneAndUpdate(
      { contractId: intent.metadata.contractId },
      { status: 'held', providerRef: intent.id }
    );
  }
  if (event.type === 'charge.refunded' && intent?.id) {
    await Payment.findOneAndUpdate({ providerRef: intent.id }, { status: 'refunded', refundedAt: new Date() });
  }
  return res.json({ received: true });
}

module.exports = { myCheckoutMode, handleStripeWebhook };
