import { z } from 'zod';
import { httpError } from '../security/http.js';

export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw httpError(400, result.error.issues.map((issue) => issue.message).join(' '));
  }
  return result.data;
}

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
