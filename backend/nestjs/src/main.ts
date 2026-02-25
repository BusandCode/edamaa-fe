/**
 * Entrypoint for the NestJS API.
 * This file bootstraps the application, enables CORS for local development,
 * and starts the HTTP server. Keep this file minimal — application
 * composition and providers live in `AppModule` and related modules.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { mountQueuesUI } from './monitor/queues.ui';
import { loadBackendEnv } from './config/load-env';

loadBackendEnv();

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    // eslint-disable-next-line no-console
    console.log('Sentry initialized');
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.warn('Sentry is configured but failed to initialize:', err?.message || err);
  }
}

async function bootstrap() {
  initSentry();

  // Create the Nest application from the root module
  const app = await NestFactory.create(AppModule);

  // Allow cross-origin requests during development — tighten this in prod
  app.enableCors();

  // IMPORTANT: Expose a raw body endpoint for webhook verification. Stripe
  // requires the exact raw request body to verify signatures. We register
  // an express raw parser for the /webhooks/stripe path before starting the
  // server. Note: this is minimal and intended for local/dev scaffolding.
  const server = app.getHttpAdapter().getInstance() as express.Express;
  server.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Mount the Bull Board UI for job monitoring in development.
  // Note: enable this only in trusted environments; remove or secure it in
  // production. The UI is available at /admin/queues.
  try {
    const mounted = mountQueuesUI(server);
    if (!mounted) {
      // eslint-disable-next-line no-console
      console.log('Queues UI disabled (SKIP_REDIS_CONNECT=1 or DISABLE_QUEUES_UI=1)');
    }
  } catch (err: any) {
    // If bull-board isn't available or Redis is misconfigured, continue
    // without crashing the app — the dashboard is optional.
    // eslint-disable-next-line no-console
    console.warn('Could not mount queues UI:', err?.message || err);
  }

  // Use PORT env var when provided, otherwise default to 3001
  const port = process.env.PORT || 3001;

  await app.listen(port);

  // Friendly log so developers know the server is running
  // eslint-disable-next-line no-console
  console.log('NestJS API running on', port);
}

bootstrap();
