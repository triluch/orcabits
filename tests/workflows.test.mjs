import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";

const workflow = (name) =>
  parse(
    readFileSync(
      new URL(`../.github/workflows/${name}.yml`, import.meta.url),
      "utf8",
    ),
  );

test("PR checks are read-only and only main can publish Pages", () => {
  const check = workflow("check");
  const pages = workflow("pages");
  assert.deepEqual(check.on.pull_request.branches, ["main"]);
  assert.deepEqual(pages.on.push.branches, ["main"]);
  assert.equal(pages.jobs.build.if, "github.ref == 'refs/heads/main'");
  assert.equal(pages.jobs.deploy.needs, "build");
  assert.equal(pages.jobs.deploy.environment.name, "github-pages");
  assert.deepEqual(pages.jobs.deploy.permissions, {
    pages: "write",
    "id-token": "write",
  });
  assert.ok(
    pages.jobs.build.steps.some((step) => step.run === "make test-browser"),
  );

  for (const config of [check, pages]) {
    assert.deepEqual(config.permissions, { contents: "read" });
    assert.equal(config.on.pull_request_target, undefined);
    assert.equal(config.on.workflow_run, undefined);
    for (const [name, job] of Object.entries(config.jobs)) {
      if (config !== pages || name !== "deploy") {
        assert.equal(job.permissions, undefined);
      }
      for (const step of job.steps) {
        if (!step.uses) continue;
        assert.match(step.uses, /^actions\/[\w-]+@[a-f0-9]{40}$/);
        if (step.uses.startsWith("actions/checkout@")) {
          assert.equal(step.with["persist-credentials"], false);
        }
      }
    }
  }
  assert.deepEqual(Object.keys(pages.on).sort(), ["push", "workflow_dispatch"]);
});
