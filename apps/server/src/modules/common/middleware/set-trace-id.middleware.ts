import { Request, Response, NextFunction } from 'express';
import api from '@opentelemetry/api';

export function setTraceID(_req: Request, res: Response, next: NextFunction) {
  const activeSpan = api.trace.getSpan(api.context.active());
  if (activeSpan) {
    res.setHeader('x-trace-id', activeSpan.spanContext().traceId);
  }
  next();
}
