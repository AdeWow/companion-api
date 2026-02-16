import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { closeRedis } from './lib/redis';
import healthRoutes from './routes/health';
import pushTokenRoutes from './routes/pushToken';
import dailyRoutes from './routes/daily';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  const fastify = Fastify({
    logger: true,
  });

  // Decorate request with userId (set by auth middleware)
  fastify.decorateRequest('userId', '');

  // Register plugins
  await fastify.register(cors, { origin: '*' });
  await fastify.register(sensible);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(pushTokenRoutes);
  await fastify.register(dailyRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    fastify.log.info(`[SERVER] ${signal} received — shutting down`);
    await closeRedis();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Start server
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`[SERVER] Listening on 0.0.0.0:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
