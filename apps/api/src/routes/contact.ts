import type { FastifyPluginAsyncZod } from '@fastify/type-provider-zod';
import { z } from 'zod';

const contactBodySchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  message: z.string().min(1, { message: 'Message cannot be empty.' }).max(1000, {
    message: 'Message cannot exceed 1000 characters.',
  }),
});

const contactRoutes: FastifyPluginAsyncZod = async (app) => {
  // POST /api/v1/contact — Receive support or contact messages
  app.post(
    '/api/v1/contact',
    {
      schema: {
        body: contactBodySchema,
      },
    },
    async (request, reply) => {
      const { email, message } = request.body;

      request.log.info({ email, messageLength: message.length }, 'Contact form submission received.');

      // Return standard envelope
      return reply.code(200).send({ success: true });
    }
  );
};

export default contactRoutes;
