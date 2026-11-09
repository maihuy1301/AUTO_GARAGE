import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessWeb } from '../src/lib/auth/web-access.ts';

for (const role of ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']) {
  test(`${role} can use the web`, () => assert.equal(canAccessWeb([role]), true));
}

for (const roles of [
  ['ROLE_CUSTOMER'], ['ROLE_TECHNICIAN'], ['ROLE_CUSTOMER', 'ROLE_TECHNICIAN'],
  ['ROLE_ADMIN', 'ROLE_CUSTOMER'], ['ROLE_MANAGER', 'ROLE_TECHNICIAN'],
  ['ROLE_FRONT_DESK', 'ROLE_CUSTOMER'], ['ROLE_ADMIN', 'ROLE_FRONT_DESK', 'ROLE_TECHNICIAN'],
  [], ['ROLE_UNKNOWN'],
]) {
  test(`web access denied for ${JSON.stringify(roles)}`, () => assert.equal(canAccessWeb(roles), false));
}

test('multiple staff roles can use the web', () => {
  assert.equal(canAccessWeb(['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_FRONT_DESK']), true);
});

test('a missing role list cannot restore a web session', () => assert.equal(canAccessWeb(), false));
