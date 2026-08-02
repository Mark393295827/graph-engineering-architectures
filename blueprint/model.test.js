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
  const originalCommand = Model.commandHash(blueprint);

  const themed = Model.deepClone(blueprint);
  themed.blueprint.presentation.theme = 'paper';
  assert.equal(Model.structureHash(themed), original);

  const reallocated = Model.deepClone(blueprint);
  reallocated.team_command.commander = 'another-integration-owner';
  assert.equal(Model.structureHash(reallocated), original);
  assert.notEqual(Model.commandHash(reallocated), originalCommand);

  const semantic = Model.deepClone(blueprint);
  semantic.objective += ' Updated.';
  assert.notEqual(Model.structureHash(semantic), original);
});

test('dynamic task specification participates in the structure hash', () => {
  const blueprint = loadDefault();
  const original = Model.structureHash(blueprint);
  blueprint.task_spec = {
    schema_version: 'dynamic-mission/1.0',
    task_class: 'multimedia-production',
    template_id: 'multimedia-source-fusion',
    input_asset_refs: ['artifact:source-001'],
    deliverables: ['preview-package'],
    dynamic_expansion: false
  };
  assert.notEqual(Model.structureHash(blueprint), original);
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

test('critical-path timeouts must fit the graph wall-time budget', () => {
  const blueprint = loadDefault();
  blueprint.budgets.wall_time_seconds = 1000;

  const codes = Model.validateBlueprint(blueprint).errors.map((item) => item.code);
  assert.ok(codes.includes('budget.critical-path'));
  assert.equal(codes.includes('node.timeout'), false);
});

test('Agent Team mapping cannot diverge from post-validation Graph ownership and topology', () => {
  const ownerMismatch = loadDefault();
  ownerMismatch.team_command.integration_owner = 'another-owner';
  assert.ok(
    Model.validateBlueprint(ownerMismatch).errors.some(
      (item) => item.code === 'team.integration.owner'
    )
  );

  const duplicateMapping = loadDefault();
  duplicateMapping.team_command.workstreams[1].graph_node_id = 'implementation-stream';
  const mappingCodes = Model.validateBlueprint(duplicateMapping).errors.map((item) => item.code);
  assert.ok(mappingCodes.includes('team.stream.graph-node-duplicate'));
  assert.ok(mappingCodes.includes('team.stream.graph-node-missing'));

  const ownerBudgetArtifactMismatch = loadDefault();
  const stream = ownerBudgetArtifactMismatch.team_command.workstreams[0];
  stream.owner = 'wrong-owner';
  stream.budget.tool_calls += 1;
  stream.output_artifact = '.agent-state/team/artifacts/not-owned.json';
  stream.territory.push(stream.output_artifact);
  const contractCodes = Model.validateBlueprint(ownerBudgetArtifactMismatch)
    .errors
    .map((item) => item.code);
  assert.ok(contractCodes.includes('team.stream.owner'));
  assert.ok(contractCodes.includes('team.stream.graph-budget'));
  assert.ok(contractCodes.includes('team.stream.graph-artifact'));

  const dependencyCycle = loadDefault();
  dependencyCycle.team_command.workstreams[0].dependencies = ['experience-reviewer'];
  const dependencyCodes = Model.validateBlueprint(dependencyCycle)
    .errors
    .map((item) => item.code);
  assert.ok(dependencyCodes.includes('team.dependency.cycle'));
  assert.ok(dependencyCodes.includes('team.dependency.graph'));
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
  assert.equal(handoff.command_sha256, Model.commandHash(blueprint));
  assert.equal(handoff.runtime_validation.status, 'REQUIRED');
  assert.equal(handoff.runtime_validation.expected_contract_sha256, handoff.contract_sha256);
  assert.equal(handoff.runtime_validation.expected_command_sha256, handoff.command_sha256);
  assert.equal(handoff.runtime_validation.receipt, null);
  assert.deepEqual(handoff.graph_contract, Model.structureProjection(blueprint));
  assert.deepEqual(handoff.command, Model.commandProjection(blueprint));
  assert.equal(
    Model.sha256(Model.stableStringify(handoff.graph_contract)),
    handoff.contract_sha256
  );
  assert.equal(
    Model.sha256(Model.stableStringify(handoff.command)),
    handoff.command_sha256
  );
  assert.equal(
    handoff.runtime_validation.validator_command_template.includes('default-blueprint.json'),
    false
  );
  assert.ok(
    handoff.runtime_validation.validator_command_template.includes(
      'tools/validate_mission_handoff.py'
    )
  );
  assert.ok(
    handoff.runtime_validation.strict_validator_command_template.includes(
      'validate_graph_contract.py'
    )
  );
  assert.equal(handoff.command.handoff, null);
  assert.equal(handoff.command.workstreams.length, blueprint.team_command.workstreams.length);
  assert.ok(handoff.command.ipc_schema.includes('evidence'));
  assert.equal(handoff.command.ipc_contract.protocol, 'agent-team-ipc/1.0');
  assert.ok(handoff.command.integration.cleanup_receipt);
  assert.equal(handoff.adapter_readiness.status, 'REQUIRED');
  assert.equal(handoff.adapter_readiness.launch_authorized, false);
  assert.equal(handoff.adapter_readiness.receipt, null);
  handoff.command.workstreams.forEach((stream) => {
    assert.ok(stream.capability);
    assert.ok(stream.verifier);
    assert.ok(stream.stop_condition);
    assert.ok(stream.budget.max_attempts > 0);
    assert.equal('model' in stream, false);
    assert.equal('provider' in stream, false);
  });
});

test('handoff embeds and hash-binds an edited browser contract instead of the seed', () => {
  const blueprint = loadDefault();
  const seedHash = Model.structureHash(blueprint);
  blueprint.objective += ' Browser-edited objective.';
  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');

  const handoff = Model.createHandoff(blueprint);

  assert.notEqual(handoff.contract_sha256, seedHash);
  assert.equal(handoff.graph_contract.objective, blueprint.objective);
  assert.equal(
    Model.sha256(Model.stableStringify(handoff.graph_contract)),
    handoff.runtime_validation.expected_contract_sha256
  );

  blueprint.team_command.handoff = handoff;
  const repeated = Model.createHandoff(blueprint);
  assert.equal(repeated.command.handoff, null);
});

test('named runtime adapters stay separate from durable Graph and workstream ownership', () => {
  const blueprint = loadDefault();
  const adapters = blueprint.team_command.agent_roster.adapters;

  assert.deepEqual(
    adapters.map((adapter) => adapter.id).sort(),
    ['antigravity', 'claude', 'codex']
  );
  adapters.forEach((adapter) => {
    assert.equal(adapter.enabled, true);
    assert.equal(adapter.launch_mode, 'harness-managed');
    assert.equal(adapter.runtime_state.status, 'UNVERIFIED');
    assert.equal(adapter.runtime_state.probe_receipt, null);
    assert.equal(adapter.ipc_protocol_version, blueprint.team_command.ipc_contract.protocol);
    assert.ok(adapter.declared_capabilities.length > 0);
    assert.ok(adapter.max_concurrency > 0);
  });

  const vendorIds = new Set(adapters.map((adapter) => adapter.id));
  blueprint.nodes.forEach((node) => assert.equal(vendorIds.has(node.owner), false));
  blueprint.team_command.workstreams.forEach((stream) => {
    assert.equal(vendorIds.has(stream.owner), false);
    ['model', 'provider', 'vendor', 'adapter_id', 'runtime_adapter'].forEach((field) => {
      assert.equal(field in stream, false);
    });
  });
  blueprint.team_command.routing.route_requests.forEach((request) => {
    assert.equal('adapter_id' in request, false);
    assert.equal('preferred_adapter_id' in request, false);
  });
});

test('runtime roster and routing violations fail without claiming readiness', () => {
  const duplicate = loadDefault();
  duplicate.team_command.agent_roster.adapters[1].id = 'claude';
  assert.ok(
    Model.validateBlueprint(duplicate).errors.some((item) => item.code === 'team.adapter.id')
  );

  const incompatible = loadDefault();
  incompatible.team_command.agent_roster.adapters[0].ipc_protocol_version = 'vendor-chat/9';
  assert.ok(
    Model.validateBlueprint(incompatible).errors.some((item) => item.code === 'team.adapter.ipc')
  );

  const missingRoute = loadDefault();
  missingRoute.team_command.routing.route_requests.pop();
  assert.ok(
    Model.validateBlueprint(missingRoute).errors.some((item) => item.code === 'team.routing.missing')
  );

  const fixedBinding = loadDefault();
  fixedBinding.team_command.routing.route_requests[0].adapter_id = 'codex';
  assert.ok(
    Model.validateBlueprint(fixedBinding).errors.some((item) => item.code === 'team.routing.binding')
  );

  const selfCertified = loadDefault();
  selfCertified.team_command.agent_roster.adapters[0].runtime_state = {
    status: 'READY',
    probe_receipt: { status: 'SELF_CERTIFIED' }
  };
  assert.ok(
    Model.validateBlueprint(selfCertified).errors.some(
      (item) => item.code === 'team.adapter.authority'
    )
  );
});

test('imports discard adapter probes, selected routes, and handoff authority', () => {
  const blueprint = loadDefault();
  blueprint.team_command.agent_roster.adapters[0].runtime_state = {
    status: 'READY',
    probe_receipt: { status: 'HARNESS_PROBED' }
  };
  blueprint.team_command.routing.resolution = {
    status: 'READY',
    selected_routes: [{ workstream_id: 'interface-builder', adapter_id: 'codex' }],
    receipt: { status: 'READY' }
  };
  blueprint.team_command.handoff = { status: 'PENDING_RUNTIME_VALIDATION' };

  const imported = Model.prepareImportedBlueprint(blueprint);

  imported.team_command.agent_roster.adapters.forEach((adapter) => {
    assert.deepEqual(adapter.runtime_state, {
      status: 'UNVERIFIED',
      probe_receipt: null
    });
  });
  assert.deepEqual(imported.team_command.routing.resolution, {
    status: 'PENDING_HARNESS_PROBE',
    selected_routes: [],
    receipt: null
  });
  assert.equal(imported.team_command.handoff, null);
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

test('beginner block catalog compiles every block atomically into a valid canonical graph', () => {
  const catalog = Model.getBlockCatalog();
  assert.deepEqual(
    catalog.map((item) => item.id),
    ['clarify', 'approval', 'bounded-loop', 'final-check']
  );

  catalog.forEach((definition) => {
    const blueprint = loadDefault();
    blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');
    blueprint.team_command.handoff = { status: 'PENDING_RUNTIME_VALIDATION' };
    const before = JSON.stringify(blueprint);
    const beforeNodes = blueprint.nodes.length;
    const result = Model.applyBlockTransaction(blueprint, {
      schema_version: '1.0',
      transaction_id: `test-${definition.id}`,
      operations: [{ op: 'insert-block', block_type: definition.id }]
    });

    assert.equal(result.ok, true, definition.id);
    assert.equal(JSON.stringify(blueprint), before, `${definition.id} mutated its input`);
    assert.equal(result.candidate.nodes.length, beforeNodes + 1);
    assert.deepEqual(Model.validateBlueprint(result.candidate).errors, []);
    assert.equal(result.candidate.blueprint.confirmation, null);
    assert.equal(result.candidate.team_command.handoff, null);
    assert.equal(result.candidate.team_command.status, 'LOCKED_UNTIL_CONFIRMATION');
    assert.equal(result.receipt.runtime_authority_reset, true);
    assert.equal(result.receipt.launch_authorized, false);
    assert.equal(result.receipt.status, 'BLOCK_TRANSACTION_CLIENT_VALIDATED');
    assert.equal(result.receipt.after_contract_sha256, Model.structureHash(result.candidate));
    assert.deepEqual(
      result.candidate.blueprint.events.at(-1).receipt,
      result.receipt
    );
    assert.ok(result.candidate.budgets.max_nodes >= result.candidate.nodes.length);
    assert.ok(
      result.candidate.budgets.tool_calls
      >= result.candidate.nodes.reduce((total, node) => total + node.tool_calls, 0)
    );
    const inserted = result.candidate.nodes.find(
      (node) => Model.blockTypeForNode(node) === definition.id
    );
    assert.equal(inserted.beginner_block.type, definition.id);
    if (definition.id === 'approval') {
      assert.match(inserted.outputs[0], /approval_receipt$/);
      assert.ok(inserted.writes[0].endsWith('-approval.json'));
      const receiptEdge = result.candidate.edges.find(
        (edge) => edge.from === inserted.id
      );
      assert.equal(receiptEdge.type, 'verification');
      assert.equal(receiptEdge.payload_schema, inserted.outputs[0]);
      const target = result.candidate.nodes.find(
        (node) => node.id === receiptEdge.to
      );
      assert.ok(target.inputs.includes(inserted.outputs[0]));
    }
  });
});

test('plain-language block updates validate atomically and persist their receipt', () => {
  const blueprint = loadDefault();
  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');
  const before = JSON.stringify(blueprint);
  const beforeHash = Model.structureHash(blueprint);
  const nodeId = blueprint.nodes[0].id;

  const rejected = Model.applyBlockTransaction(blueprint, {
    schema_version: '1.0',
    transaction_id: 'invalid-beginner-setting',
    operations: [{
      op: 'update-block',
      block_id: nodeId,
      patch: { verifier: '' }
    }]
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.candidate, null);
  assert.equal(rejected.after_hash, beforeHash);
  assert.equal(JSON.stringify(blueprint), before);

  const accepted = Model.applyBlockTransaction(blueprint, {
    schema_version: '1.0',
    transaction_id: 'valid-beginner-setting',
    operations: [{
      op: 'update-block',
      block_id: nodeId,
      patch: {
        label: 'State the beginner mission',
        timeout_seconds: blueprint.nodes[0].timeout_seconds + 1
      }
    }]
  });
  assert.equal(accepted.ok, true);
  assert.equal(
    accepted.candidate.nodes.find((node) => node.id === nodeId).label,
    'State the beginner mission'
  );
  assert.equal(accepted.candidate.blueprint.confirmation, null);
  assert.deepEqual(
    accepted.candidate.blueprint.events.at(-1).receipt,
    accepted.receipt
  );
  assert.deepEqual(Model.validateBlueprint(accepted.candidate).errors, []);
  assert.equal(JSON.stringify(blueprint), before);
});

test('starter recipes are deterministic, bounded, and never create graph feedback edges', () => {
  Model.getBlockRecipes().forEach((recipe) => {
    const first = Model.applyBlockRecipe(loadDefault(), recipe.id);
    const second = Model.applyBlockRecipe(loadDefault(), recipe.id);

    assert.equal(first.ok, true, recipe.id);
    assert.equal(second.ok, true, recipe.id);
    assert.equal(Model.structureHash(first.candidate), Model.structureHash(second.candidate));
    assert.deepEqual(Model.validateBlueprint(first.candidate).errors, []);
    assert.equal(
      Model.topologicalLevels(first.candidate).flat().length,
      first.candidate.nodes.length
    );
    first.candidate.nodes
      .filter((node) => Model.blockTypeForNode(node) === 'bounded-loop')
      .forEach((node) => {
        assert.equal(node.kind, 'loop');
        assert.equal(node.max_attempts, 2);
        assert.equal(
          first.candidate.edges.some((edge) => edge.from === node.id && edge.to === node.id),
          false
        );
      });
  });
});

test('invalid block transactions reject without changing the draft or its hashes', () => {
  const blueprint = loadDefault();
  blueprint.objective = '';
  const before = JSON.stringify(blueprint);
  const beforeHash = Model.structureHash(blueprint);
  const result = Model.applyBlockTransaction(blueprint, {
    schema_version: '1.0',
    operations: [{ op: 'insert-block', block_type: 'clarify' }]
  });

  assert.equal(result.ok, false);
  assert.equal(result.candidate, null);
  assert.equal(result.errors[0].code, 'block.base-invalid');
  assert.equal(result.after_hash, beforeHash);
  assert.equal(JSON.stringify(blueprint), before);

  const unknown = Model.applyBlockTransaction(loadDefault(), {
    schema_version: '1.0',
    operations: [{ op: 'insert-block', block_type: 'mystery-vendor-block' }]
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.candidate, null);
  assert.equal(unknown.errors[0].code, 'block.operation');
});

test('palette blocks can be removed without changing surrounding connector semantics', () => {
  Model.getBlockCatalog().forEach((definition) => {
    const seed = loadDefault();
    const targetId = definition.id === 'final-check'
      ? seed.terminal_nodes[0]
      : seed.team_command.activation_gate;
    const originalConnector = structuredClone(
      seed.edges.find((edge) => edge.to === targetId)
    );
    const originalTargetInputs = structuredClone(
      seed.nodes.find((node) => node.id === targetId).inputs
    );
    const added = Model.applyBlockTransaction(seed, {
      schema_version: '1.0',
      operations: [{ op: 'insert-block', block_type: definition.id }]
    });
    assert.equal(added.ok, true, definition.id);
    const blockId = added.applied[0].id;

    const removed = Model.applyBlockTransaction(added.candidate, {
      schema_version: '1.0',
      operations: [{ op: 'remove-block', block_id: blockId }]
    });

    assert.equal(removed.ok, true, definition.id);
    assert.equal(removed.candidate.nodes.some((node) => node.id === blockId), false);
    assert.deepEqual(Model.validateBlueprint(removed.candidate).errors, []);
    assert.equal(removed.candidate.blueprint.confirmation, null);
    assert.deepEqual(
      removed.candidate.edges.find((edge) => (
        edge.from === originalConnector.from && edge.to === originalConnector.to
      )),
      originalConnector
    );
    assert.deepEqual(
      removed.candidate.nodes.find((node) => node.id === targetId).inputs,
      originalTargetInputs
    );
    const readded = Model.applyBlockTransaction(removed.candidate, {
      schema_version: '1.0',
      operations: [{ op: 'insert-block', block_type: definition.id }]
    });
    assert.equal(readded.ok, true, definition.id);
    assert.equal(
      Model.structureHash(readded.candidate),
      Model.structureHash(added.candidate),
      `${definition.id} did not compile deterministically after remove`
    );
  });
});

test('undo and redo snapshots never restore confirmation, handoff, probes, or routes', () => {
  const blueprint = loadDefault();
  blueprint.blueprint.confirmation = Model.createConfirmation(blueprint, 'test-owner');
  blueprint.team_command.handoff = { status: 'PENDING_RUNTIME_VALIDATION' };
  blueprint.team_command.agent_roster.adapters[0].runtime_state = {
    status: 'READY',
    probe_receipt: { status: 'HARNESS_PROBED' }
  };
  blueprint.team_command.routing.resolution = {
    status: 'READY',
    selected_routes: [{ workstream_id: 'interface-builder', adapter_id: 'codex' }],
    receipt: { status: 'READY' }
  };

  const restored = Model.restoreEditableSnapshot(blueprint, 'test history restore');

  assert.equal(restored.blueprint.confirmation, null);
  assert.equal(restored.team_command.handoff, null);
  assert.equal(restored.team_command.status, 'LOCKED_UNTIL_CONFIRMATION');
  restored.team_command.agent_roster.adapters.forEach((adapter) => {
    assert.deepEqual(adapter.runtime_state, {
      status: 'UNVERIFIED',
      probe_receipt: null
    });
  });
  assert.deepEqual(restored.team_command.routing.resolution, {
    status: 'PENDING_HARNESS_PROBE',
    selected_routes: [],
    receipt: null
  });
});

test('invalid but editable saved drafts reopen in repair mode without authority', () => {
  const blueprint = loadDefault();
  blueprint.objective = '';
  blueprint.blueprint.confirmation = { status: 'HUMAN_CONFIRMED' };
  blueprint.team_command.handoff = { status: 'PENDING_RUNTIME_VALIDATION' };

  const recovered = Model.recoverEditableDraft(blueprint);

  assert.equal(recovered.repair_mode, true);
  assert.ok(recovered.issues.length > 0);
  assert.equal(recovered.state.objective, '');
  assert.equal(recovered.state.blueprint.confirmation, null);
  assert.equal(recovered.state.team_command.handoff, null);
  assert.equal(recovered.state.team_command.status, 'LOCKED_UNTIL_CONFIRMATION');
  assert.equal(
    recovered.state.blueprint.events.at(-1).type,
    'INCOMPLETE_DRAFT_RECOVERED'
  );
  assert.throws(
    () => Model.recoverEditableDraft({
      nodes: [],
      edges: [],
      blueprint: {},
      team_command: {}
    }),
    /minimum editable structure/
  );
});

test('beginner block overrides reject runtime-vendor and secret fields', () => {
  const blueprint = loadDefault();
  assert.throws(
    () => Model.createBlockDraft('clarify', blueprint, { provider: 'named-runtime' }),
    /runtime-vendor bindings/
  );
  assert.throws(
    () => Model.createBlockDraft('clarify', blueprint, { api_key: 'secret' }),
    /credentials/
  );
});

test('runtime adapter ids cannot become durable Graph or Team owners', () => {
  const blueprint = loadDefault();
  blueprint.owner = 'Codex';
  blueprint.team_command.integration_owner = 'Codex';
  blueprint.team_command.commander = 'Codex';
  blueprint.nodes
    .filter((node) => node.owner === 'integration-owner')
    .forEach((node) => {
      node.owner = 'Codex';
    });
  blueprint.team_command.routing.orchestration_request.capability_owner = 'Codex';

  const errors = Model.validateBlueprint(blueprint).errors;
  assert.ok(errors.some((item) => item.code === 'team.owner.adapter-binding'));
  const result = Model.applyBlockTransaction(blueprint, {
    schema_version: '1.0',
    operations: [{ op: 'insert-block', block_type: 'clarify' }]
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors[0].code, 'block.base-invalid');
});
