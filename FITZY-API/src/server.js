require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/db');

const port = Number(process.env.PORT) || 4000;
connectDatabase().then(() => {
  app.listen(port, () => {
    console.log(`FITZY API listening on http://localhost:${port}`);
    const { expirePendingPaymentOrders } = require('./services/orderService');
    const expiryTimer = setInterval(() => expirePendingPaymentOrders().catch(error => console.error('Payment expiry sweep failed:', error.message)), 30000);
    expiryTimer.unref();
  });
}).catch(error => {
  console.error('Database connection failed:', error.message);
  process.exitCode = 1;
});
