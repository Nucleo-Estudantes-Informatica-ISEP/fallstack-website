import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(new URL('./failure-scenarios.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '')
  .replace(/export default /g, '')
  .replace(/export /g, '');
function load(fault, seconds, status = null) {
  const requests = [];
  const checks = [];
  const result = vm.runInNewContext(`${source}\n({runFailure, phaseAt, options})`, {
    __ENV: { FAILURE_SCENARIO: fault },
    assertStagingTarget: () => 'http://localhost',
    execution: { instance: { currentTestRunDuration: seconds * 1000 } },
    sleep() {},
    check(res, predicates) { checks.push(...Object.values(predicates).map(fn => fn(res))); },
    http: {
      expectedStatuses: value => value,
      get(url, params) {
        requests.push({ url, ...params });
        return { status: status ?? params.responseCallback };
      },
    },
  });
  result.runFailure();
  return { ...result, requests, checks };
}
for (const fault of ['copy-removed', 'copy-drained', 'redis-unavailable']) {
  test(`${fault}: baseline, outage and recovery requests`, () => {
    for (const seconds of [0, 60, 120]) {
      const result = load(fault, seconds);
      assert.equal(result.requests.length, 4);
      for (const request of result.requests) {
        const expected = fault === 'redis-unavailable' && seconds === 60 && request.url.endsWith('/api/ready') ? 503 : 200;
        assert.equal(request.responseCallback, expected);
      }
      assert.ok(result.checks.every(Boolean));
    }
  });
}
test('unexpected outage and missing recovery fail checks', () => {
  assert.ok(load('copy-drained', 60, 503).checks.every(value => !value));
  assert.ok(load('redis-unavailable', 120, 503).checks.every(value => !value));
});
test('phase boundaries and required samples', () => {
  const { phaseAt, options } = load('copy-removed', 0);
  assert.deepEqual([29, 30, 45, 90, 105].map(phaseAt), ['baseline', 'injection', 'fault', 'restoration', 'recovery']);
  assert.equal(options.maxRedirects, 0);
  for (const phase of ['baseline', 'fault', 'recovery'])
    assert.equal(options.thresholds[`http_reqs{phase:${phase}}`][0], 'count>0');
});
test('unknown scenario is rejected', () => assert.throws(() => load('unknown', 0)));
