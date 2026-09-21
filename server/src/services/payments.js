const { logger } = require('./logger');

function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function getStripe() {
  if (!stripeEnabled()) return null;
  // eslint-disable-next-line global-require
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

async function markReleased(payment) {
  payment.status = 'released';
  payment.releasedAt = new Date();
  if (stripeEnabled() && payment.providerRef) {
    try {
      const stripe = getStripe();
      if (stripe) await stripe.paymentIntents.capture(payment.providerRef);
    } catch (err) {
      logger.warn({ err: err.message }, 'stripe capture skipped');
    }
  }
  await payment.save();
  return payment;
}

async function markRefunded(payment) {
  payment.status = 'refunded';
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

module.exports = { stripeEnabled, getStripe, markReleased, markRefunded };
