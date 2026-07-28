'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const Model = require('./model.js');

const DEFAULT_PATH = path.join(__dirname, 'default-blueprint.json');

function loadDefault() {
  return JSON.parse(fs.readFileSync(DEFAULT_PATH, 'utf8'));
}

test('canonical blueprint passes client contract validation', () => {
  const blueprint = loadDefault();
  const result = Model.validateBlueprint(blueprint);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(Model.topologicalLevels(blueprint).flat().length, blueprint.nodes.length);
});

test('SHA-256 implementation matches the standard fixture', () => {
  assert.equal(
    Model.sha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  );
});

test('semantic edits change the structure hash while presentation and team edits do not', () => {
  const blueprint = loadDefault();
  const original = Model.structureHash(blueprint);

  const themed = Model.deepClone(blueprint);
  themed.blueprint.presentation.theme = 'paper';
  assert.equal(Model.structureHash(themed), original);

  const reallocated = Model.deepClone(blueprint);
  reallocated.team_command.commander = 'another-integration-owner';
  assert.equal(Model.structureHash(reallocated), original);

  const semantic = Model.deepClone(blueprint);
  semantic.objective += ' Updated.';
  assert.notEqual(Model.structureHash(semantic), original);
});

test('human receipt is valid only for the exact current structure', () => {
  const blueprint = loadDefault();
  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');

  assert.equal(Model.confirmationIsValid(blueprint), true);
  assert.equal(blueprint.blueprint.confirmation.client_validation.status, 'PASSED');
  assert.equal('validator_exit_code' in blueprint.blueprint.confirmation, false);

  blueprint.nodes[0].verifier = 'Changed verifier.';
  assert.equal(Model.confirmationIsValid(blueprint), false);

  assert.equal(Model.invalidateConfirmation(blueprint, 'test change'), true);
  assert.equal(blueprint.blueprint.confirmation, null);
  assert.equal(blueprint.team_command.status, 'LOCKED_UNTIL_CONFIRMATION');
});

test('imports reject prototype keys and discard imported authority', () => {
  assert.throws(
    () => Model.parseImportedJson('{"__proto__":{"polluted":true}}'),
    /Forbidden object key/
  );
  assert.equal({}.polluted, undefined);

  const blueprint = loadDefault();
  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');
  blueprint.team_command.handoff = { status: 'PENDING_RUNTIME_VALIDATION' };
  blueprint.team_command.status = 'PENDING_RUNTIME_VALIDATION';

  const imported = Model.prepareImportedBlueprint(
    Model.parseImportedJson(JSON.stringify(blueprint))
  );
  assert.equal(imported.blueprint.confirmation, null);
  assert.equal(imported.blueprint.status, 'DRAFT');
  assert.equal(imported.team_command.handoff, null);
  assert.equal(imported.team_command.status, 'LOCKED_UNTIL_CONFIRMATION');
});

test('cycle, writer collision, schema mismatch, and missing join are rejected', () => {
  const cycle = loadDefault();
  cycle.edges.push({
    from: 'terminal-verification',
    to: 'mission-intake',
    type: 'control',
    payload_schema: '',
    condition: 'always',
    failure_route: ''
  });
  assert.ok(Model.validateBlueprint(cycle).errors.some((item) => item.code === 'graph.cycle'));

  const writerCollision = loadDefault();
  writerCollision.nodes[1].writes = [writerCollision.nodes[2].writes[0]];
  assert.ok(
    Model.validateBlueprint(writerCollision).errors.some((item) => item.code === 'writer.overlap')
  );

  const schemaMismatch = loadDefault();
  schemaMismatch.edges[0].payload_schema = 'undeclared_payload';
  const schemaCodes = Model.validateBlueprint(schemaMismatch).errors.map((item) => item.code);
  assert.ok(schemaCodes.includes('edge.output'));
  assert.ok(schemaCodes.includes('edge.input'));

  const missingJoin = loadDefault();
  missingJoin.joins = [];
  assert.ok(
    Model.validateBlueprint(missingJoin).errors.some((item) => item.code === 'join.missing')
  );
});

test('external effects require exact approval, direct receipt, and compensation', () => {
  const blueprint = loadDefault();
  const external = blueprint.nodes.find((node) => node.id === 'implementation-stream');
  external.effect_class = 'external';
  external.writes = ['external://publication'];
  external.compensation = '';

  const codes = Model.validateBlueprint(blueprint).errors.map((item) => item.code);
  assert.ok(codes.includes('external.compensation'));
  assert.ok(codes.includes('external.approval'));
  assert.ok(codes.includes('external.scope'));
  assert.ok(codes.includes('external.edge'));
});

test('handoff remains locked until confirmation and exports bounded command data', () => {
  const blueprint = loadDefault();
  assert.throws(() => Model.createHandoff(blueprint), /valid confirmed blueprint/);

  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');
  const handoff = Model.createHandoff(blueprint);

  assert.equal(handoff.status, 'PENDING_RUNTIME_VALIDATION');
  assert.equal(handoff.contract_sha256, Model.structureHash(blueprint));
  assert.equal(handoff.runtime_validation.status, 'REQUIRED');
  assert.equal(handoff.runtime_validation.expected_contract_sha256, handoff.contract_sha256);
  assert.equal(handoff.runtime_validation.receipt, null);
  assert.equal(handoff.command.handoff, null);
  assert.equal(handoff.command.workstreams.length, 3);
  assert.ok(handoff.command.ipc_schema.includes('evidence'));
  assert.ok(handoff.command.integration.cleanup_receipt);
  handoff.command.workstreams.forEach((stream) => {
    assert.ok(stream.capability);
    assert.ok(stream.verifier);
    assert.ok(stream.stop_condition);
    assert.ok(stream.budget.max_attempts > 0);
    assert.equal('model' in stream, false);
    assert.equal('provider' in stream, false);
  });
});

test('unsafe or excessive import shapes fail atomically', () => {
  const oversized = `{"value":"${'x'.repeat(Model.MAX_IMPORT_BYTES + 1)}"}`;
  assert.throws(() => Model.parseImportedJson(oversized), /larger than 1 MiB/);

  let nested = '"leaf"';
  for (let index = 0; index < 30; index += 1) {
    nested = `{"next":${nested}}`;
  }
  assert.throws(() => Model.parseImportedJson(nested), /maximum depth/);
});
