require('dotenv').config();
const app = require('./app');

// A stray unhandled rejection or synchronous throw outside Express's own request
// handling (e.g. in a fire-and-forget promise) should never take the whole process
// down — that would mean one bad request killing every in-flight request on the
// same warm instance. Log it and keep the process alive; the request that triggered
// it, if any, already got its own error response from errorHandler.js.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const PORT = process.env.PORT || 3000;

if (process.env.VERCEL) {
  // On Vercel, @vercel/node imports this module and invokes the exported app
  // directly as the request handler for each invocation — no listener needed.
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`FILEY running at http://localhost:${PORT}`);
  });
}
