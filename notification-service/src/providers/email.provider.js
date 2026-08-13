const nodemailer = require('nodemailer');
const transporter = require('../config/mailer');
const env = require('../config/env');
const logger = require('../utils/logger');

async function sendOrderConfirmationEmail({ to, orderId, items, totalAmount }) {
  const itemLines = items
    .map((item) => `  - ${item.name} x${item.quantity} @ $${item.unitPrice.toFixed(2)}`)
    .join('\n');

  if (!env.emailUser || !env.emailPass) {
    logger.error('Email credentials are not configured. EMAIL_USER and EMAIL_PASS are required.');
  }

  const info = await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: `Cake Delight — Order Confirmation (${orderId})`,
    text: `Thanks for your order!\n\nOrder ID: ${orderId}\n\n${itemLines}\n\nTotal: $${totalAmount.toFixed(2)}`,
  });

  // Ethereal generates a preview URL instead of a real inbox — useful for local/demo verification.
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info({ previewUrl, orderId }, 'Email sent — preview available');
  }

  return info;
}

module.exports = { sendOrderConfirmationEmail };
