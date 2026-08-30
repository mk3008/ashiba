import { createApplication as referenceApplication } from '../../reference/reference-application.mjs';

export async function createApplication(runtime) {
  const application = await referenceApplication(runtime);
  return {
    ...application,
    async list(input = {}) {
      return application.list({ ...input, sort: input.sort === 'title' ? 'id' : input.sort });
    },
  };
}
