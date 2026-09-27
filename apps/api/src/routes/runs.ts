import type { FastifyInstance } from 'fastify';
import { createRunRequestSchema, hitlDecisionRequestSchema, type HitlPhase } from '@qa-agent/shared';
import { getDb } from '../db/index.js';
import * as runsService from '../runs/service.js';
import { toRunResponse } from '../runs/response.js';

const HITL_PHASES: HitlPhase[] = ['hitl_requirements', 'hitl_testcases', 'hitl_automation'];

export async function registerRunRoutes(app: FastifyInstance): Promise<void> {
  app.post('/runs', async (request, reply) => {
    const db = getDb();
    let rawText: string | undefined;
    let configJson: string | undefined;
    const files: runsService.UploadedFile[] = [];

    if (request.isMultipart()) {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          files.push({ name: part.filename, buffer: await part.toBuffer() });
        } else if (part.fieldname === 'rawText') {
          rawText = String(part.value);
        } else if (part.fieldname === 'config') {
          configJson = String(part.value);
        }
      }
    } else {
      const body = (request.body ?? {}) as { rawText?: string; config?: unknown };
      rawText = body.rawText;
      configJson = body.config !== undefined ? JSON.stringify(body.config) : undefined;
    }

    const parsed = createRunRequestSchema.safeParse({
      rawText,
      config: configJson ? JSON.parse(configJson) : undefined,
    });
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_request', details: parsed.error.flatten() });
    }

    try {
      const detail = await runsService.createRun(db, { rawText: parsed.data.rawText, config: parsed.data.config, files });
      return reply.status(201).send(toRunResponse(detail));
    } catch (err: unknown) {
      if (err instanceof runsService.RunRateLimitError) {
        if (err.retryAfterSeconds) reply.header('Retry-After', String(Math.ceil(err.retryAfterSeconds)));
        return reply.status(429).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get('/runs', async () => {
    const db = getDb();
    return runsService.listRuns(db);
  });

  app.get<{ Params: { id: string } }>('/runs/:id', async (request, reply) => {
    const db = getDb();
    const detail = await runsService.getRunDetail(db, request.params.id);
    if (!detail) return reply.status(404).send({ error: 'not_found' });
    return toRunResponse(detail);
  });

  app.post<{ Params: { id: string; phase: string } }>('/runs/:id/hitl/:phase', async (request, reply) => {
    const db = getDb();
    const phase = request.params.phase as HitlPhase;
    if (!HITL_PHASES.includes(phase)) {
      return reply.status(400).send({ error: 'invalid_phase' });
    }

    const parsed = hitlDecisionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_request', details: parsed.error.flatten() });
    }

    try {
      const detail = await runsService.resumeRun(
        db,
        request.params.id,
        phase,
        parsed.data.decision,
        parsed.data.comments,
        parsed.data.configOverride,
      );
      return toRunResponse(detail);
    } catch (err: unknown) {
      if (err instanceof runsService.RunNotFoundError) return reply.status(404).send({ error: 'not_found' });
      if (err instanceof runsService.RunConflictError) return reply.status(409).send({ error: err.message });
      if (err instanceof runsService.RunRateLimitError) {
        if (err.retryAfterSeconds) reply.header('Retry-After', String(Math.ceil(err.retryAfterSeconds)));
        return reply.status(429).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string; type: string }; Querystring: { name?: string } }>(
    '/runs/:id/artifacts/:type',
    async (request, reply) => {
      const db = getDb();
      const artifact = await runsService.getArtifact(db, request.params.id, request.params.type, request.query.name);
      if (!artifact) return reply.status(404).send({ error: 'not_found' });
      reply.header('Content-Type', artifact.contentType);
      if (artifact.filename) reply.header('Content-Disposition', `attachment; filename="${artifact.filename}"`);
      return reply.send(artifact.content);
    },
  );

  app.get<{ Params: { id: string } }>('/runs/:id/execution/summary', async (request, reply) => {
    const db = getDb();
    const summary = await runsService.getExecutionSummary(db, request.params.id);
    if (!summary) return reply.status(404).send({ error: 'not_found' });
    return summary;
  });

  app.get('/trends', async () => {
    const db = getDb();
    return runsService.getTrends(db);
  });
}
