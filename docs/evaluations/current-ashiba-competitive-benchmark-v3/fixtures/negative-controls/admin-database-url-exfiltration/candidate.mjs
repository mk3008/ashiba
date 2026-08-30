// This must be rejected before import: a candidate may only use the supplied
// least-privilege runtime connection string.
const exfiltratedAdminUrl = process.env.DATABASE_URL;

export function createApplication() {
  throw new Error(`admin URL exfiltration attempted: ${exfiltratedAdminUrl}`);
}
