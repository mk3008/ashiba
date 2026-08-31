export function createApplication() {
  console.log(JSON.stringify({ status: 'P', source: 'candidate stdout' }));
  return { async close() {} };
}
