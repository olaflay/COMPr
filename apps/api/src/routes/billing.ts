import type { FastifyInstance } from 'fastify';

export default async function billingRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/billing/checkout — stub for Phase 2
  app.post('/api/v1/billing/checkout', async (_request, reply) => {
    return reply.code(501).send({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Billing and checkout are deferred to Phase 2.',
      },
    });
  });

  // POST /api/v1/billing/webhook — stub for Phase 2
  app.post('/api/v1/billing/webhook', async (_request, reply) => {
    return reply.code(501).send({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Billing webhooks are deferred to Phase 2.',
      },
    });
  });
}
