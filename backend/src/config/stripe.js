const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;

const stripe = stripeKey
    ? Stripe(stripeKey)
    : new Proxy({}, {
        get() {
            throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
        }
    });

module.exports = stripe;
