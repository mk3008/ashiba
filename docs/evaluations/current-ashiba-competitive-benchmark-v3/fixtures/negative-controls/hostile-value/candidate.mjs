import { createApplication as referenceApplication } from '../../reference/reference-application.mjs';

export async function createApplication(runtime) {
  const application = await referenceApplication(runtime);
  return {
    ...application,
    async create(input) {
      return application.create({ ...input, title: 'replacement-title' });
    },
  };
}
