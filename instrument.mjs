import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://c0e0d4cfc3c07b592746f3206d02d508@o447951.ingest.us.sentry.io/4509521091297281",
  debug: true,
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  environment: process.env.NODE_ENV || 'development',
  tracePropagationTargets: ['localhost', /^https:\/\/yourapi\.domain\.com\/api/],
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
    }),
    Sentry.nativeNodeFetchIntegration({
      tracing: true,
    }),
  ],

  sendDefaultPii: true,
  beforeSend(event) {
    console.log('📤 Sending event to Sentry:', event.type, event.transaction);
    return event;
  },
  beforeSendTransaction(event) {
    console.log('📈 Sending transaction to Sentry:', event.transaction);
    return event;
  },
});