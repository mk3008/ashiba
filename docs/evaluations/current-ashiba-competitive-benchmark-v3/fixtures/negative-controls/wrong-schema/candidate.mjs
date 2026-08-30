import { createApplication as referenceApplication } from '../../reference/reference-application.mjs';

export function createApplication(runtime) {
  return referenceApplication({ ...runtime, schema: 'wrong_schema' });
}
