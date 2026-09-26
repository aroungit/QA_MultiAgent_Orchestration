import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { loadEnv } from './env.js';
import { registerRunRoutes } from './routes/runs.js';

loadEnv();

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.WEB_PUBLIC_API_URL ? true : '*',
  });
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  // Centralized error handling; never leak stack traces / secrets to the client. Must be set
  // *before* registering route plugins below — Fastify's encapsulation means a handler set on
  // the parent instance after a child plugin is registered is not picked up by that child's routes.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const status = error.statusCode ?? 500;
    reply.status(status).send({ error: status === 500 ? 'internal_server_error' : error.message });
  });

  await app.register(registerRunRoutes);

  return app;
}

buildServer()
  .then((app) => app.listen({ port: PORT, host: HOST }))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start API server', err);
    process.exit(1);
  });
