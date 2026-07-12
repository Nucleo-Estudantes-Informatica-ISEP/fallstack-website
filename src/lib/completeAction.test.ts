import assert from "node:assert/strict";
import test from "node:test";

import { completeAction } from "./completeAction";

test("upserts an action completion using its compound key", async () => {
  let upsertArgs: unknown;
  const completion = { id: "completion-id" };
  const db = {
    action: {
      findUnique: async () => ({ id: "action-id" }),
    },
    student: {
      findUnique: async () => ({ id: "student-id" }),
    },
    actionCompletion: {
      upsert: async (args: unknown) => {
        upsertArgs = args;
        return completion;
      },
    },
  };

  const result = await completeAction("student-code", "action-name", db);

  assert.equal(result, completion);
  assert.deepEqual(upsertArgs, {
    where: {
      actionId_studentId: {
        studentId: "student-id",
        actionId: "action-id",
      },
    },
    update: {},
    create: {
      studentId: "student-id",
      actionId: "action-id",
    },
  });
});
