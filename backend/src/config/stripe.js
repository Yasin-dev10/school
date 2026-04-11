const Stripe = require('stripe');

// Initialize Stripe with secret key
// Use a placeholder if the key is missing to prevent server crash during startup
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
    console.warn('⚠️ STRIPE_SECRET_KEY is missing from environment variables. Stripe functionality will fail if used.');
}

const stripe = Stripe(stripeKey || 'sk_test_placeholder_key');

module.exports = stripe;