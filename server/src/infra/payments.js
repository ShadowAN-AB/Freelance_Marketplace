const { logger } = require('./logger');

function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getStripe() {
  if (!stripeEnabled()) return null;
  // eslint-disable-next-line global-require
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

async function captureIfNeeded(payment) {
  if (stripeEnabled() && payment.providerRef) {
    try {
      const stripe = getStripe();
      if (stripe) await stripe.paymentIntents.capture(payment.providerRef);
    } catch (err) {
      logger.warn({ err: err.message }, 'stripe capture skipped');
    }
  }
}

async function releasePartial(payment, amount) {
  const increment = Math.max(0, Number(amount) || 0);
  const next = Math.min(payment.amount, (payment.releasedAmount || 0) + increment);
  payment.releasedAmount = next;
  if (next >= payment.amount) {
    payment.status = 'released';
    payment.releasedAt = new Date();
    await captureIfNeeded(payment);
  }
  await payment.save();
  return payment;
}

async function markReleased(payment) {
  const remaining = Math.max(0, payment.amount - (payment.releasedAmount || 0));
  return releasePartial(payment, remaining);
}

async function markRefunded(payment) {
  if ((payment.releasedAmount || 0) >= payment.amount) return payment;
  if ((payment.releasedAmount || 0) === 0) {
    payment.status = 'refunded';
  }
  payment.refundedAt = new Date();
  if (stripeEnabled() && payment.providerRef) {
    try {
      const stripe = getStripe();
      if (stripe) await stripe.refunds.create({ payment_intent: payment.providerRef });
    } catch (err) {
      logger.warn({ err: err.message }, 'stripe refund skipped');
    }
  }
  await payment.save();
  return payment;
}

module.exports = { stripeEnabled, getStripe, markReleased, markRefunded, releasePartial };
