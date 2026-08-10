const nodemailer = require('nodemailer');
const env = require('./env');

const transporter = nodemailer.createTransport({
  host: env.emailHost,
  port: env.emailPort,
  auth: {
    user: env.emailUser,
    pass: env.emailPass,
  },
});

module.exports = transporter;
