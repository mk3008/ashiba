import assert from "node:assert/strict";
import test from "node:test";
import { createReportApplication } from "./report-application.js";

test("rejects report vocabulary that cannot select reviewed SQL terms", async () => {
  const application = createReportApplication({
    connectionString: "postgresql://not-used.invalid/test",
    schema: "not_used",
  });

  await assert.rejects(
    () => application.runReport({
      dimensions: ["tag"],
      metric: "count",
      includeTagJoin: false,
    }),
    { code: "VALIDATION" },
  );
  await assert.rejects(
    () => application.runReport({
      dimensions: ["status", "status"],
      metric: "count",
      includeTagJoin: false,
    }),
    { code: "VALIDATION" },
  );
  await application.close();
  await assert.rejects(
    () => application.runReport({
      dimensions: ["status"],
      metric: "count",
      includeTagJoin: false,
    }),
    { code: "APPLICATION_CLOSED" },
  );
});
