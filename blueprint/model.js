(function attachBlueprintModel(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.BlueprintModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBlueprintModel() {
  'use strict';

  const STORAGE_KEY = 'graph-engineering-mission-blueprint:v1';
  const MAX_IMPORT_BYTES = 1024 * 1024;
  const MAX_DEPTH = 24;
  const MAX_ARRAY_ITEMS = 512;
  const MAX_STRING_LENGTH = 20000;
  const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const VALID_NODE_KINDS = new Set([
    'deterministic',
    'loop',
    'agent',
    'agent-team',
    'human-gate',
    'subgraph'
  ]);
  const VALID_EDGE_TYPES = new Set([
    'data',
    'control',
    'verification',
    'failure',
    'compensation'
  ]);
  const DEPENDENCY_EDGE_TYPES = new Set(['data', 'control', 'verification']);
  const SCHEMA_EDGE_TYPES = new Set(['data', 'verification']);
  const VALID_JOIN_MODES = new Set([
    'all',
    'reduce',
    'first-success',
    'quorum',
    'barrier-verifier',
    'human-gate'
  ]);
  const VALID_EFFECT_CLASSES = new Set(['read-only', 'reversible', 'external']);
  const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  const REQUIRED_IPC_FIELDS = [
    'task_id',
    'state',
    'artifact',
    'evidence',
    'decision',
    'unknowns',
    'dependency',
    'next_action'
  ];
  const REQUIRED_ADAPTER_IDS = ['claude', 'antigravity', 'codex'];
  const REQUIRED_IPC_ENVELOPE_FIELDS = [
    'message_id',
    'run_id',
    'message_type',
    'task_id',
    'workstream_id',
    'graph_node_id',
    'sender_owner',
    'sender_adapter_id',
    'recipient_owner',
    'recipient_adapter_id',
    'sequence',
    'sent_at',
    'state',
    'artifact',
    'evidence',
    'decision',
    'unknowns',
    'dependency',
    'next_action',
    'contract_sha256',
    'command_sha256',
    'previous_message_sha256',
    'message_sha256'
  ];
  const SECRET_FIELD_PATTERN = /(api.?key|access.?token|refresh.?token|password|client.?secret|credential)/i;
  const MAX_BLUEPRINT_EVENTS = 100;
  const LEGO_BLOCK_CATALOG = [
    {
      id: 'clarify',
      id_prefix: 'clarify-block',
      name: 'Clarify one unknown',
      description: 'Turn one unclear assumption into a checked input before approval.',
      lane: 'planning',
      block_kind: 'step',
      node_kind: 'deterministic',
      owner_role: 'graph-owner',
      label: 'Clarify one unknown',
      summary: 'Resolve one important unknown and record the evidence before the mission is approved.',
      verifier: 'The named unknown has an evidence-backed answer or an explicit blocker.',
      timeout_seconds: 180,
      max_attempts: 1,
      tool_calls: 3,
      cost_label: '+3 min · 3 tool calls'
    },
    {
      id: 'approval',
      id_prefix: 'approval-block',
      name: 'Ask for approval',
      description: 'Pause at a visible human decision before the main structure is confirmed.',
      lane: 'planning',
      block_kind: 'gate',
      node_kind: 'human-gate',
      owner_role: 'mission-owner',
      label: 'Ask for approval',
      summary: 'A named human reviews the prepared evidence and decides whether the mission may continue.',
      verifier: 'A fresh approval or rejection decision names the reviewer and the reviewed contract.',
      timeout_seconds: 300,
      max_attempts: 1,
      tool_calls: 1,
      cost_label: '+5 min · 1 tool call'
    },
    {
      id: 'bounded-loop',
      id_prefix: 'bounded-loop-block',
      name: 'Improve with a limit',
      description: 'Repeat inside one block at most twice; never draw a graph cycle.',
      lane: 'planning',
      block_kind: 'loop',
      node_kind: 'loop',
      owner_role: 'graph-owner',
      label: 'Improve with a limit',
      summary: 'Try, check, and improve this planning artifact inside one bounded block.',
      verifier: 'The result passes the named check or stops after two attempts with evidence.',
      timeout_seconds: 240,
      max_attempts: 2,
      tool_calls: 4,
      cost_label: '+4 min · 2 attempts'
    },
    {
      id: 'final-check',
      id_prefix: 'final-check-block',
      name: 'Check the result',
      description: 'Add one objective evidence check immediately before delivery.',
      lane: 'evidence',
      block_kind: 'check',
      node_kind: 'deterministic',
      owner_role: 'verification-owner',
      label: 'Check the result',
      summary: 'Verify one additional success condition before the final completion decision.',
      verifier: 'The named success condition has a fresh, reproducible evidence receipt.',
      timeout_seconds: 180,
      max_attempts: 1,
      tool_calls: 3,
      cost_label: '+3 min · 3 tool calls'
    }
  ];
  const LEGO_RECIPES = [
    {
      id: 'clear-and-check',
      name: 'Clarify, then check',
      description: 'Resolve an unknown before approval and add a final evidence check.',
      block_types: ['clarify', 'final-check']
    },
    {
      id: 'approval-path',
      name: 'Add an approval path',
      description: 'Insert a visible human decision and an additional final check.',
      block_types: ['approval', 'final-check']
    },
    {
      id: 'bounded-improvement',
      name: 'Improve safely',
      description: 'Add one finite improvement loop and a final evidence check.',
      block_types: ['bounded-loop', 'final-check']
    }
  ];

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isPositiveInteger(value) {
    return Number.isInteger(value) && value > 0;
  }

  function isUniqueStringList(value, allowEmpty) {
    return Array.isArray(value)
      && (allowEmpty || value.length > 0)
      && value.every(isNonEmptyString)
      && new Set(value).size === value.length;
  }

  function containsSecretField(value) {
    if (Array.isArray(value)) {
      return value.some(containsSecretField);
    }
    if (!isObject(value)) {
      return false;
    }
    return Object.keys(value).some((key) => (
      SECRET_FIELD_PATTERN.test(key) || containsSecretField(value[key])
    ));
  }

  function deepClone(value) {
    if (Array.isArray(value)) {
      return value.map(deepClone);
    }
    if (isObject(value)) {
      const copy = {};
      Object.keys(value).forEach((key) => {
        copy[key] = deepClone(value[key]);
      });
      return copy;
    }
    return value;
  }

  function inspectSafeJson(value, path, depth, counts) {
    const currentPath = path || '$';
    const currentDepth = depth || 0;
    const counters = counts || { items: 0 };

    if (currentDepth > MAX_DEPTH) {
      throw new Error(`Import exceeds the maximum depth at ${currentPath}.`);
    }
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      throw new Error(`String exceeds the maximum length at ${currentPath}.`);
    }
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) {
        throw new Error(`Array exceeds the item limit at ${currentPath}.`);
      }
      counters.items += value.length;
      if (counters.items > MAX_ARRAY_ITEMS * 8) {
        throw new Error('Import contains too many total array items.');
      }
      value.forEach((item, index) => {
        inspectSafeJson(item, `${currentPath}[${index}]`, currentDepth + 1, counters);
      });
      return;
    }
    if (isObject(value)) {
      Object.keys(value).forEach((key) => {
        if (FORBIDDEN_KEYS.has(key)) {
          throw new Error(`Forbidden object key at ${currentPath}.${key}.`);
        }
        inspectSafeJson(value[key], `${currentPath}.${key}`, currentDepth + 1, counters);
      });
    }
  }

  function parseImportedJson(text) {
    if (typeof text !== 'string') {
      throw new Error('Import must be text.');
    }
    if (new Blob([text]).size > MAX_IMPORT_BYTES) {
      throw new Error('Import is larger than 1 MiB.');
    }
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    if (!isObject(value)) {
      throw new Error('Blueprint import must be a JSON object.');
    }
    inspectSafeJson(value);
    return deepClone(value);
  }

  function discardRuntimeAuthority(candidate) {
    if (!isObject(candidate.blueprint)) {
      candidate.blueprint = {};
    }
    candidate.blueprint.confirmation = null;
    candidate.blueprint.status = 'DRAFT';
    candidate.blueprint.updated_at = null;
    if (isObject(candidate.team_command)) {
      candidate.team_command.status = 'LOCKED_UNTIL_CONFIRMATION';
      candidate.team_command.handoff = null;
      const adapters = candidate.team_command.agent_roster?.adapters;
      if (Array.isArray(adapters)) {
        adapters.forEach((adapter) => {
          adapter.runtime_state = {
            status: 'UNVERIFIED',
            probe_receipt: null
          };
        });
      }
      if (isObject(candidate.team_command.routing)) {
        candidate.team_command.routing.resolution = {
          status: 'PENDING_HARNESS_PROBE',
          selected_routes: [],
          receipt: null
        };
      }
    }
    return candidate;
  }

  function resetRuntimeAuthority(value, eventType, detail) {
    const candidate = discardRuntimeAuthority(deepClone(value));
    if (!Array.isArray(candidate.blueprint.events)) {
      candidate.blueprint.events = [];
    }
    candidate.blueprint.events.push({
      type: eventType || 'RUNTIME_AUTHORITY_RESET',
      at: new Date().toISOString(),
      detail: detail || 'A fresh local confirmation and Harness readiness evidence are required.'
    });
    if (candidate.blueprint.events.length > MAX_BLUEPRINT_EVENTS) {
      candidate.blueprint.events.splice(
        0,
        candidate.blueprint.events.length - MAX_BLUEPRINT_EVENTS
      );
    }
    return candidate;
  }

  function prepareImportedBlueprint(value) {
    return resetRuntimeAuthority(
      value,
      'IMPORTED',
      'Imported state requires local validation and confirmation.'
    );
  }

  function restoreEditableSnapshot(value, detail) {
    return resetRuntimeAuthority(
      value,
      'HISTORY_RESTORED',
      detail || 'Undo or redo restored editable content; prior authority was discarded.'
    );
  }

  function recoverEditableDraft(value) {
    if (!isObject(value)) {
      throw new Error('Stored draft must be a JSON object.');
    }
    const result = validateBlueprint(value);
    if (!result.errors.length) {
      return {
        state: deepClone(value),
        repair_mode: false,
        issues: []
      };
    }
    const requiredArrays = [
      'non_goals',
      'entry_nodes',
      'terminal_nodes',
      'nodes',
      'edges',
      'joins',
      'stop_conditions'
    ];
    const requiredObjects = [
      'budgets',
      'permission_boundary',
      'recovery',
      'blueprint',
      'team_command'
    ];
    const editableShape = requiredArrays.every((field) => Array.isArray(value[field]))
      && requiredObjects.every((field) => isObject(value[field]))
      && Array.isArray(value.blueprint.success_criteria)
      && isObject(value.blueprint.presentation)
      && Array.isArray(value.blueprint.events)
      && Array.isArray(value.team_command.workstreams)
      && isObject(value.team_command.integration)
      && isObject(value.team_command.agent_roster)
      && Array.isArray(value.team_command.agent_roster.adapters)
      && isObject(value.team_command.routing)
      && Array.isArray(value.team_command.routing.route_requests);
    if (!editableShape) {
      throw new Error('Stored draft is missing the minimum editable structure.');
    }
    return {
      state: resetRuntimeAuthority(
        value,
        'INCOMPLETE_DRAFT_RECOVERED',
        `Recovered an incomplete local draft with ${result.errors.length} issue(s).`
      ),
      repair_mode: true,
      issues: deepClone(result.errors)
    };
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(',')}]`;
    }
    if (isObject(value)) {
      return `{${Object.keys(value).sort().map((key) => (
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
      )).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function utf8Bytes(value) {
    if (typeof TextEncoder !== 'undefined') {
      return Array.from(new TextEncoder().encode(value));
    }
    const encoded = encodeURIComponent(value);
    const bytes = [];
    for (let index = 0; index < encoded.length; index += 1) {
      if (encoded[index] === '%') {
        bytes.push(parseInt(encoded.slice(index + 1, index + 3), 16));
        index += 2;
      } else {
        bytes.push(encoded.charCodeAt(index));
      }
    }
    return bytes;
  }

  function sha256(value) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
      0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
      0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
      0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
      0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
      0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
      0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
      0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
      0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const bytes = utf8Bytes(String(value));
    const bitLength = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) {
      bytes.push(0);
    }
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    [high, low].forEach((word) => {
      bytes.push((word >>> 24) & 0xff);
      bytes.push((word >>> 16) & 0xff);
      bytes.push((word >>> 8) & 0xff);
      bytes.push(word & 0xff);
    });

    const state = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const rotateRight = (word, bits) => (word >>> bits) | (word << (32 - bits));

    for (let offset = 0; offset < bytes.length; offset += 64) {
      const schedule = new Array(64);
      for (let index = 0; index < 16; index += 1) {
        const start = offset + (index * 4);
        schedule[index] = (
          (bytes[start] << 24)
          | (bytes[start + 1] << 16)
          | (bytes[start + 2] << 8)
          | bytes[start + 3]
        ) >>> 0;
      }
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotateRight(schedule[index - 15], 7)
          ^ rotateRight(schedule[index - 15], 18)
          ^ (schedule[index - 15] >>> 3);
        const s1 = rotateRight(schedule[index - 2], 17)
          ^ rotateRight(schedule[index - 2], 19)
          ^ (schedule[index - 2] >>> 10);
        schedule[index] = (
          schedule[index - 16] + s0 + schedule[index - 7] + s1
        ) >>> 0;
      }

      let [a, b, c, d, e, f, g, h] = state;
      for (let index = 0; index < 64; index += 1) {
        const sigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        const choice = (e & f) ^ ((~e) & g);
        const temp1 = (h + sigma1 + choice + K[index] + schedule[index]) >>> 0;
        const sigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (sigma0 + majority) >>> 0;
        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }
      state[0] = (state[0] + a) >>> 0;
      state[1] = (state[1] + b) >>> 0;
      state[2] = (state[2] + c) >>> 0;
      state[3] = (state[3] + d) >>> 0;
      state[4] = (state[4] + e) >>> 0;
      state[5] = (state[5] + f) >>> 0;
      state[6] = (state[6] + g) >>> 0;
      state[7] = (state[7] + h) >>> 0;
    }

    return state.map((word) => word.toString(16).padStart(8, '0')).join('');
  }

  function structureProjection(state) {
    const projection = {};
    Object.keys(state || {}).sort().forEach((key) => {
      if (key !== 'blueprint' && key !== 'team_command') {
        projection[key] = deepClone(state[key]);
      }
    });
    projection.mission = {
      title: state?.blueprint?.mission_title || '',
      summary: state?.blueprint?.summary || '',
      success_criteria: deepClone(state?.blueprint?.success_criteria || [])
    };
    return projection;
  }

  function structureHash(state) {
    return sha256(stableStringify(structureProjection(state)));
  }

  function commandProjection(state) {
    const command = deepClone(state?.team_command || {});
    delete command.status;
    command.handoff = null;
    return command;
  }

  function commandHash(state) {
    return sha256(stableStringify(commandProjection(state)));
  }

  function getBlockCatalog() {
    return deepClone(LEGO_BLOCK_CATALOG);
  }

  function getBlockRecipes() {
    return deepClone(LEGO_RECIPES);
  }

  function uniqueContractId(prefix, nodes) {
    const ids = new Set((nodes || []).map((node) => node.id));
    let candidate = prefix;
    let suffix = 2;
    while (ids.has(candidate)) {
      candidate = `${prefix}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function catalogDefinition(blockType) {
    return LEGO_BLOCK_CATALOG.find((item) => item.id === blockType) || null;
  }

  function blockTypeForNode(node) {
    if (!isObject(node) || !isNonEmptyString(node.id)) {
      return null;
    }
    const marker = isObject(node.beginner_block) ? node.beginner_block : {};
    const definition = LEGO_BLOCK_CATALOG.find((item) => (
      marker.schema_version === '1.0'
      && marker.type === item.id
      && (node.id === item.id_prefix || node.id.startsWith(`${item.id_prefix}-`))
    ));
    return definition ? definition.id : null;
  }

  function createBlockDraft(blockType, contract, overrides) {
    const definition = catalogDefinition(blockType);
    if (!definition) {
      throw new Error(`Unknown block type: ${blockType}.`);
    }
    const edits = isObject(overrides) ? overrides : {};
    if (containsSecretField(edits) || [
      'model',
      'provider',
      'vendor',
      'adapter_id',
      'runtime_adapter'
    ].some((field) => field in edits)) {
      throw new Error('Block drafts cannot contain credentials or runtime-vendor bindings.');
    }
    const allowedOverrides = new Set(['label', 'summary', 'verifier']);
    Object.keys(edits).forEach((field) => {
      if (!allowedOverrides.has(field)) {
        throw new Error(`Unsupported beginner block override: ${field}.`);
      }
    });
    const owner = definition.owner_role === 'mission-owner'
      ? 'mission-owner'
      : (definition.owner_role === 'verification-owner'
        ? 'verification-owner'
        : (contract?.owner || 'integration-owner'));
    const id = uniqueContractId(definition.id_prefix, contract?.nodes || []);
    return {
      schema_version: '1.0',
      block_type: definition.id,
      block_kind: definition.block_kind,
      lane: definition.lane,
      id,
      node: {
        id,
        beginner_block: {
          schema_version: '1.0',
          type: definition.id
        },
        kind: definition.node_kind,
        owner,
        inputs: [],
        outputs: [],
        reads: [],
        writes: [],
        verifier: isNonEmptyString(edits.verifier) ? edits.verifier.trim() : definition.verifier,
        timeout_seconds: definition.timeout_seconds,
        max_attempts: definition.max_attempts,
        tool_calls: definition.tool_calls,
        effect_class: 'read-only',
        idempotency: 'For the same input contract hash, replace only this block receipt.',
        compensation: '',
        label: isNonEmptyString(edits.label) ? edits.label.trim() : definition.label,
        summary: isNonEmptyString(edits.summary) ? edits.summary.trim() : definition.summary
      }
    };
  }

  function dependencyEdges(contract) {
    return (contract?.edges || []).filter((edge) => DEPENDENCY_EDGE_TYPES.has(edge?.type));
  }

  function requiredBudgetFloor(contract) {
    const nodes = Array.isArray(contract?.nodes) ? contract.nodes : [];
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
    const indegree = new Map(nodes.map((node) => [node.id, 0]));
    dependencyEdges(contract).forEach((edge) => {
      if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)
        || adjacency.get(edge.from).has(edge.to)) {
        return;
      }
      adjacency.get(edge.from).add(edge.to);
      indegree.set(edge.to, indegree.get(edge.to) + 1);
    });
    const longest = new Map(nodes.map((node) => [
      node.id,
      isPositiveInteger(node.timeout_seconds) ? node.timeout_seconds : 0
    ]));
    const ready = Array.from(indegree.entries())
      .filter(([, degree]) => degree === 0)
      .map(([id]) => id);
    let visited = 0;
    while (ready.length) {
      const id = ready.shift();
      visited += 1;
      adjacency.get(id).forEach((target) => {
        const targetTimeout = isPositiveInteger(nodeMap.get(target)?.timeout_seconds)
          ? nodeMap.get(target).timeout_seconds
          : 0;
        longest.set(target, Math.max(
          longest.get(target),
          longest.get(id) + targetTimeout
        ));
        indegree.set(target, indegree.get(target) - 1);
        if (indegree.get(target) === 0) {
          ready.push(target);
        }
      });
    }
    return {
      max_nodes: nodes.length,
      max_attempts_per_node: Math.max(1, ...nodes.map(
        (node) => isPositiveInteger(node.max_attempts) ? node.max_attempts : 1
      )),
      wall_time_seconds: visited === nodes.length
        ? Math.max(1, ...Array.from(longest.values()))
        : Number.POSITIVE_INFINITY,
      tool_calls: nodes.reduce(
        (total, node) => total + (isPositiveInteger(node.tool_calls) ? node.tool_calls : 0),
        0
      ),
      max_open_workstreams: Array.isArray(contract?.team_command?.workstreams)
        ? contract.team_command.workstreams.length
        : 0
    };
  }

  function applyBudgetFloor(candidate) {
    const floor = requiredBudgetFloor(candidate);
    if (!Number.isFinite(floor.wall_time_seconds)) {
      return floor;
    }
    candidate.budgets.max_nodes = Math.max(
      candidate.budgets.max_nodes,
      floor.max_nodes
    );
    candidate.budgets.max_attempts_per_node = Math.max(
      candidate.budgets.max_attempts_per_node,
      floor.max_attempts_per_node
    );
    candidate.budgets.wall_time_seconds = Math.max(
      candidate.budgets.wall_time_seconds,
      floor.wall_time_seconds
    );
    candidate.budgets.tool_calls = Math.max(
      candidate.budgets.tool_calls,
      floor.tool_calls
    );
    if (isObject(candidate.team_command?.review_budget)) {
      candidate.team_command.review_budget.max_open_workstreams = Math.max(
        candidate.team_command.review_budget.max_open_workstreams,
        floor.max_open_workstreams
      );
    }
    return floor;
  }

  function insertBlockCandidate(candidate, blockType, overrides) {
    const draft = createBlockDraft(blockType, candidate, overrides);
    const targetId = draft.lane === 'planning'
      ? candidate.team_command?.activation_gate
      : candidate.terminal_nodes?.[0];
    if (!isNonEmptyString(targetId)) {
      throw new Error(`The ${draft.lane} insertion point is missing.`);
    }
    const incoming = dependencyEdges(candidate).filter((edge) => edge.to === targetId);
    if (incoming.length !== 1) {
      throw new Error(
        `The ${draft.lane} lane needs exactly one visible incoming connection before a block can be inserted.`
      );
    }
    const original = incoming[0];
    if (isNonEmptyString(original.failure_route)) {
      throw new Error('A connector with a failure route must be edited in Advanced mode.');
    }
    const source = candidate.nodes.find((node) => node.id === original.from);
    const target = candidate.nodes.find((node) => node.id === original.to);
    if (!source || !target) {
      throw new Error('The block insertion connector has an unknown endpoint.');
    }
    if (SCHEMA_EDGE_TYPES.has(original.type)) {
      if (!isNonEmptyString(original.payload_schema)
        || !source.outputs.includes(original.payload_schema)
        || !target.inputs.includes(original.payload_schema)) {
        throw new Error('The block insertion connector does not have a compatible typed payload.');
      }
      draft.node.inputs = [original.payload_schema];
      draft.node.outputs = [original.payload_schema];
    }
    let outgoingPayload = original.payload_schema;
    let outgoingType = original.type;
    if (blockType === 'approval' && SCHEMA_EDGE_TYPES.has(original.type)) {
      outgoingPayload = `${draft.node.id.replace(/-/g, '_')}_approval_receipt`;
      outgoingType = 'verification';
      draft.node.outputs = [outgoingPayload];
      draft.node.writes = [
        `.agent-state/graph/artifacts/${draft.node.id}-approval.json`
      ];
      draft.node.effect_class = 'reversible';
      draft.node.idempotency = 'Replace one approval receipt for the same reviewed contract hash.';
      draft.node.compensation = 'Invalidate the approval receipt when the reviewed contract changes.';
      const targetInputIndex = target.inputs.indexOf(original.payload_schema);
      if (targetInputIndex < 0) {
        throw new Error('The approval target does not consume the incoming contract.');
      }
      target.inputs[targetInputIndex] = outgoingPayload;
    }
    const firstEdge = {
      ...deepClone(original),
      to: draft.node.id
    };
    const secondEdge = {
      ...deepClone(original),
      from: draft.node.id,
      type: outgoingType,
      payload_schema: outgoingPayload,
      condition: 'block verifier passed',
      failure_route: ''
    };
    const edgeIndex = candidate.edges.indexOf(original);
    candidate.edges.splice(edgeIndex, 1, firstEdge, secondEdge);
    candidate.nodes.push(draft.node);
    return draft;
  }

  function removeBlockCandidate(candidate, blockId) {
    const node = candidate.nodes.find((item) => item.id === blockId);
    const blockType = blockTypeForNode(node);
    if (!node || !blockType) {
      throw new Error('Only blocks added from the beginner palette can be removed here.');
    }
    if ((candidate.edges || []).some((edge) => edge.failure_route === blockId)) {
      throw new Error('Remove the Advanced-mode failure route before removing this block.');
    }
    if ((candidate.joins || []).some((join) => (
      join.target === blockId || join.inputs?.includes(blockId)
    ))) {
      throw new Error('A block participating in an explicit merge must be edited in Advanced mode.');
    }
    const incoming = dependencyEdges(candidate).filter((edge) => edge.to === blockId);
    const outgoing = dependencyEdges(candidate).filter((edge) => edge.from === blockId);
    const connected = (candidate.edges || []).filter((edge) => (
      edge.from === blockId || edge.to === blockId
    ));
    if (incoming.length !== 1 || outgoing.length !== 1 || connected.length !== 2) {
      throw new Error('This block is no longer a simple Lego connection; use Advanced mode.');
    }
    const before = incoming[0];
    const after = outgoing[0];
    if (isNonEmptyString(before.failure_route) || isNonEmptyString(after.failure_route)) {
      throw new Error('A connector with a failure route must be edited in Advanced mode.');
    }
    if (blockType === 'approval') {
      if (node.inputs?.[0] !== before.payload_schema
        || node.outputs?.[0] !== after.payload_schema
        || after.type !== 'verification') {
        throw new Error('The approval receipt connector no longer matches; use Advanced mode.');
      }
      const target = candidate.nodes.find((item) => item.id === after.to);
      const receiptIndex = target?.inputs?.indexOf(after.payload_schema) ?? -1;
      if (receiptIndex < 0) {
        throw new Error('The approval target no longer consumes its receipt; use Advanced mode.');
      }
      target.inputs[receiptIndex] = before.payload_schema;
    } else if (before.type !== after.type || before.payload_schema !== after.payload_schema) {
      throw new Error('The surrounding connectors no longer match; use Advanced mode.');
    }
    const replacement = {
      ...deepClone(before),
      to: after.to
    };
    const replacementIndex = Math.min(
      candidate.edges.indexOf(before),
      candidate.edges.indexOf(after)
    );
    candidate.edges = candidate.edges.filter((edge) => edge !== before && edge !== after);
    candidate.edges.splice(replacementIndex, 0, replacement);
    candidate.nodes = candidate.nodes.filter((item) => item.id !== blockId);
    return { id: blockId, block_type: blockType };
  }

  function updateBlockCandidate(candidate, blockId, patch) {
    if (!isNonEmptyString(blockId) || !isObject(patch)) {
      throw new Error('A block update needs a block_id and patch object.');
    }
    if (containsSecretField(patch)) {
      throw new Error('Block updates cannot contain credentials or secret fields.');
    }
    const allowedFields = new Set([
      'label',
      'summary',
      'verifier',
      'timeout_seconds',
      'max_attempts',
      'compensation'
    ]);
    const fields = Object.keys(patch);
    if (!fields.length) {
      throw new Error('A block update needs at least one editable field.');
    }
    fields.forEach((field) => {
      if (!allowedFields.has(field)) {
        throw new Error(`Unsupported beginner block field: ${field}.`);
      }
    });
    const node = candidate.nodes.find((item) => item.id === blockId);
    if (!node) {
      throw new Error(`Unknown block: ${blockId}.`);
    }
    fields.forEach((field) => {
      const value = patch[field];
      if (['label', 'summary', 'verifier'].includes(field) && !isNonEmptyString(value)) {
        throw new Error(`${field} must contain a plain-language value.`);
      }
      if (field === 'compensation' && typeof value !== 'string') {
        throw new Error('compensation must be text.');
      }
      if (['timeout_seconds', 'max_attempts'].includes(field) && !isPositiveInteger(value)) {
        throw new Error(`${field} must be a positive finite integer.`);
      }
      node[field] = typeof value === 'string' ? value.trim() : value;
    });
    return {
      id: node.id,
      block_type: blockTypeForNode(node) || 'canonical',
      updated_fields: fields.slice().sort()
    };
  }

  function normalizeBlockTransaction(transaction) {
    if (!isObject(transaction) || transaction.schema_version !== '1.0') {
      throw new Error('Block transaction schema_version must be 1.0.');
    }
    const operations = Array.isArray(transaction.operations) ? transaction.operations : [];
    if (!operations.length || operations.length > 8) {
      throw new Error('A block transaction needs between 1 and 8 operations.');
    }
    return operations;
  }

  function previewBlockTransaction(contract, transaction) {
    const beforeHash = structureHash(contract);
    const beforeCommandHash = commandHash(contract);
    const baseline = validateBlueprint(contract);
    if (baseline.errors.length) {
      return {
        ok: false,
        status: 'BLOCK_TRANSACTION_REJECTED',
        candidate: null,
        errors: [
          issue(
            'block.base-invalid',
            'Repair the current draft before adding Lego blocks.',
            '$'
          ),
          ...baseline.errors
        ],
        warnings: baseline.warnings,
        before_hash: beforeHash,
        after_hash: beforeHash,
        confirmation_will_reset: false,
        next_action: 'Open the issue list and repair the current draft.'
      };
    }
    const candidate = deepClone(contract);
    const applied = [];
    try {
      normalizeBlockTransaction(transaction).forEach((operation) => {
        if (!isObject(operation)) {
          throw new Error('Every block operation must be an object.');
        }
        if (operation.op === 'insert-block') {
          applied.push(insertBlockCandidate(
            candidate,
            operation.block_type,
            operation.overrides
          ));
          return;
        }
        if (operation.op === 'remove-block') {
          applied.push(removeBlockCandidate(candidate, operation.block_id));
          return;
        }
        if (operation.op === 'update-block') {
          applied.push(updateBlockCandidate(
            candidate,
            operation.block_id,
            operation.patch
          ));
          return;
        }
        throw new Error(`Unsupported beginner block operation: ${operation.op}.`);
      });
    } catch (error) {
      return {
        ok: false,
        status: 'BLOCK_TRANSACTION_REJECTED',
        candidate: null,
        errors: [issue('block.operation', error.message, 'block_transaction')],
        warnings: [],
        before_hash: beforeHash,
        after_hash: beforeHash,
        confirmation_will_reset: false,
        next_action: 'No changes were made. Review the block action and try again.'
      };
    }
    const beforeFloor = requiredBudgetFloor(contract);
    const beforeBudgets = deepClone(contract.budgets || {});
    const requiredFloor = applyBudgetFloor(candidate);
    const result = validateBlueprint(candidate);
    if (result.errors.length) {
      return {
        ok: false,
        status: 'BLOCK_TRANSACTION_REJECTED',
        candidate: null,
        errors: result.errors,
        warnings: result.warnings,
        before_hash: beforeHash,
        after_hash: beforeHash,
        required_budget_floor: requiredFloor,
        confirmation_will_reset: false,
        next_action: 'No changes were made because the compiled graph was not valid.'
      };
    }
    discardRuntimeAuthority(candidate);
    return {
      ok: true,
      status: 'BLOCK_TRANSACTION_PREVIEW_VALID',
      candidate,
      errors: [],
      warnings: result.warnings,
      applied,
      before_hash: beforeHash,
      after_hash: structureHash(candidate),
      before_command_hash: beforeCommandHash,
      after_command_hash: commandHash(candidate),
      required_budget_floor: requiredFloor,
      required_work_delta: {
        max_nodes: requiredFloor.max_nodes - beforeFloor.max_nodes,
        wall_time_seconds: requiredFloor.wall_time_seconds - beforeFloor.wall_time_seconds,
        tool_calls: requiredFloor.tool_calls - beforeFloor.tool_calls,
        max_open_workstreams: requiredFloor.max_open_workstreams - beforeFloor.max_open_workstreams
      },
      budget_delta: {
        max_nodes: Number(candidate.budgets?.max_nodes || 0)
          - Number(beforeBudgets.max_nodes || 0),
        wall_time_seconds: Number(candidate.budgets?.wall_time_seconds || 0)
          - Number(beforeBudgets.wall_time_seconds || 0),
        tool_calls: Number(candidate.budgets?.tool_calls || 0)
          - Number(beforeBudgets.tool_calls || 0),
        max_open_workstreams: Number(
          candidate.team_command?.review_budget?.max_open_workstreams || 0
        ) - Number(contract.team_command?.review_budget?.max_open_workstreams || 0)
      },
      confirmation_will_reset: Boolean(contract?.blueprint?.confirmation),
      next_action: 'Apply the valid transaction, then review and confirm the new structure.'
    };
  }

  function applyBlockTransaction(contract, transaction) {
    const preview = previewBlockTransaction(contract, transaction);
    if (!preview.ok) {
      return preview;
    }
    let candidate = resetRuntimeAuthority(
      preview.candidate,
      'BLOCK_TRANSACTION_APPLIED',
      `Applied ${preview.applied.length} beginner block operation(s); fresh confirmation required.`
    );
    candidate.blueprint.revision = Math.max(
      1,
      Number(contract?.blueprint?.revision || 1) + 1
    );
    const result = validateBlueprint(candidate);
    if (result.errors.length) {
      return {
        ...preview,
        ok: false,
        status: 'BLOCK_TRANSACTION_REJECTED',
        candidate: null,
        errors: result.errors,
        warnings: result.warnings,
        after_hash: preview.before_hash,
        next_action: 'No changes were made because the final authority reset did not validate.'
      };
    }
    const receipt = {
      schema_version: '1.0',
      transaction_id: isNonEmptyString(transaction.transaction_id)
        ? transaction.transaction_id
        : `block-transaction-r${candidate.blueprint.revision}`,
      operation_count: preview.applied.length,
      before_contract_sha256: preview.before_hash,
      after_contract_sha256: structureHash(candidate),
      before_command_sha256: preview.before_command_hash,
      after_command_sha256: commandHash(candidate),
      runtime_authority_reset: true,
      launch_authorized: false,
      status: 'BLOCK_TRANSACTION_CLIENT_VALIDATED'
    };
    const event = candidate.blueprint.events[candidate.blueprint.events.length - 1];
    if (isObject(event) && event.type === 'BLOCK_TRANSACTION_APPLIED') {
      event.receipt = deepClone(receipt);
    }
    return {
      ...preview,
      status: receipt.status,
      candidate,
      after_hash: receipt.after_contract_sha256,
      after_command_hash: receipt.after_command_sha256,
      receipt
    };
  }

  function applyBlockRecipe(contract, recipeId) {
    const recipe = LEGO_RECIPES.find((item) => item.id === recipeId);
    if (!recipe) {
      return {
        ok: false,
        status: 'BLOCK_TRANSACTION_REJECTED',
        candidate: null,
        errors: [issue('block.recipe', `Unknown starter recipe: ${recipeId}.`, 'recipe')],
        warnings: [],
        before_hash: structureHash(contract),
        after_hash: structureHash(contract),
        confirmation_will_reset: false,
        next_action: 'Choose one of the declared starter recipes.'
      };
    }
    return applyBlockTransaction(contract, {
      schema_version: '1.0',
      transaction_id: `recipe-${recipe.id}`,
      operations: recipe.block_types.map((blockType) => ({
        op: 'insert-block',
        block_type: blockType
      }))
    });
  }

  function issue(code, message, path) {
    return { code, message, path: path || '$' };
  }

  function validateBlueprint(contract) {
    const errors = [];
    const warnings = [];

    if (!isObject(contract)) {
      return { errors: [issue('contract.object', 'Blueprint must be an object.')], warnings };
    }

    const requiredTopLevel = [
      'schema_version', 'graph_id', 'objective', 'non_goals', 'owner',
      'artifact_path', 'state_path', 'entry_nodes', 'terminal_nodes',
      'budgets', 'permission_boundary', 'nodes', 'edges', 'joins',
      'stop_conditions', 'recovery'
    ];
    requiredTopLevel.forEach((field) => {
      if (!(field in contract)) {
        errors.push(issue('top.missing', `Missing top-level field: ${field}.`, field));
      }
    });
    if (errors.length) {
      return { errors, warnings };
    }

    if (contract.schema_version !== '1.0') {
      errors.push(issue('schema.version', 'schema_version must be 1.0.', 'schema_version'));
    }
    ['graph_id', 'objective', 'owner', 'artifact_path', 'state_path'].forEach((field) => {
      if (!isNonEmptyString(contract[field])) {
        errors.push(issue('field.string', `${field} must be non-empty.`, field));
      }
    });
    if (!isUniqueStringList(contract.non_goals, false)) {
      errors.push(issue('non_goals.list', 'non_goals must be a non-empty unique string list.', 'non_goals'));
    }
    if (!isUniqueStringList(contract.stop_conditions, false)) {
      errors.push(issue('stop.list', 'stop_conditions must be a non-empty unique string list.', 'stop_conditions'));
    }

    const budgets = isObject(contract.budgets) ? contract.budgets : {};
    const budgetFields = [
      'max_nodes', 'max_concurrency', 'max_attempts_per_node',
      'wall_time_seconds', 'tool_calls', 'review_changed_lines'
    ];
    budgetFields.forEach((field) => {
      if (!isPositiveInteger(budgets[field])) {
        errors.push(issue('budget.finite', `${field} must be a positive integer.`, `budgets.${field}`));
      }
    });
    if (budgets.max_nodes > 64) {
      errors.push(issue('budget.nodes', 'max_nodes must be 64 or less.', 'budgets.max_nodes'));
    }
    if (budgets.max_concurrency > 16) {
      errors.push(issue('budget.concurrency', 'max_concurrency must be 16 or less.', 'budgets.max_concurrency'));
    }
    if (budgets.max_attempts_per_node > 5) {
      errors.push(issue('budget.attempts', 'max_attempts_per_node must be 5 or less.', 'budgets.max_attempts_per_node'));
    }
    if (budgets.review_changed_lines > 1000) {
      errors.push(issue('budget.review', 'review_changed_lines must be 1000 or less.', 'budgets.review_changed_lines'));
    }

    const permission = isObject(contract.permission_boundary)
      ? contract.permission_boundary
      : {};
    ['allowed', 'denied', 'approval_required'].forEach((field) => {
      if (!isUniqueStringList(permission[field], true)) {
        errors.push(issue('permission.list', `${field} must be a unique string list.`, `permission_boundary.${field}`));
      }
    });
    if (!isNonEmptyString(permission.rollback)) {
      errors.push(issue('permission.rollback', 'A rollback path is required.', 'permission_boundary.rollback'));
    }

    const recovery = isObject(contract.recovery) ? contract.recovery : {};
    if (!isNonEmptyString(recovery.checkpoint) || !isNonEmptyString(recovery.write_back)) {
      errors.push(issue('recovery.path', 'Recovery checkpoint and write_back paths are required.', 'recovery'));
    }
    if (recovery.whole_graph_rerun !== false) {
      errors.push(issue('recovery.scope', 'Strict graphs must set whole_graph_rerun to false.', 'recovery.whole_graph_rerun'));
    }

    const nodes = Array.isArray(contract.nodes) ? contract.nodes : [];
    if (!nodes.length) {
      errors.push(issue('nodes.empty', 'At least one node is required.', 'nodes'));
    }
    if (nodes.length > budgets.max_nodes) {
      errors.push(issue('nodes.cap', 'Declared nodes exceed max_nodes.', 'nodes'));
    }
    if (budgets.max_concurrency > nodes.length && nodes.length) {
      errors.push(issue('budget.concurrency.nodes', 'max_concurrency cannot exceed the node count.', 'budgets.max_concurrency'));
    }

    const nodeMap = new Map();
    const writers = new Map();
    let totalToolCalls = 0;
    const externalNodes = new Set();

    nodes.forEach((node, index) => {
      const path = `nodes[${index}]`;
      if (!isObject(node)) {
        errors.push(issue('node.object', 'Node must be an object.', path));
        return;
      }
      if (!isNonEmptyString(node.id) || !NODE_ID_PATTERN.test(node.id)) {
        errors.push(issue('node.id', 'Node id must use lowercase letters, numbers, and hyphens.', `${path}.id`));
        return;
      }
      if (nodeMap.has(node.id)) {
        errors.push(issue('node.duplicate', `Duplicate node id: ${node.id}.`, `${path}.id`));
        return;
      }
      nodeMap.set(node.id, node);
      if (!VALID_NODE_KINDS.has(node.kind)) {
        errors.push(issue('node.kind', `Unsupported node kind: ${node.kind}.`, `${path}.kind`));
      }
      if (!isNonEmptyString(node.owner)) {
        errors.push(issue('node.owner', 'Node owner is required.', `${path}.owner`));
      }
      if (['model', 'provider', 'vendor', 'adapter_id', 'runtime_adapter'].some(
        (field) => field in node
      )) {
        errors.push(issue(
          'node.binding',
          'Graph nodes cannot bind a named model, provider, vendor, or runtime adapter.',
          path
        ));
      }
      if ('beginner_block' in node && !blockTypeForNode(node)) {
        errors.push(issue(
          'node.beginner-block',
          'beginner_block must name a declared palette type and match its generated ID prefix.',
          `${path}.beginner_block`
        ));
      }
      ['inputs', 'outputs', 'reads', 'writes'].forEach((field) => {
        if (!isUniqueStringList(node[field], true)) {
          errors.push(issue('node.list', `${field} must be a unique string list.`, `${path}.${field}`));
        }
      });
      if (!isNonEmptyString(node.verifier)) {
        errors.push(issue('node.verifier', 'Node verifier is required.', `${path}.verifier`));
      }
      ['timeout_seconds', 'max_attempts', 'tool_calls'].forEach((field) => {
        if (!isPositiveInteger(node[field])) {
          errors.push(issue('node.budget', `${field} must be a positive integer.`, `${path}.${field}`));
        }
      });
      if (node.timeout_seconds > budgets.wall_time_seconds) {
        errors.push(issue('node.timeout', 'Node timeout exceeds graph wall time.', `${path}.timeout_seconds`));
      }
      if (node.max_attempts > budgets.max_attempts_per_node) {
        errors.push(issue('node.attempts', 'Node attempts exceed the graph cap.', `${path}.max_attempts`));
      }
      totalToolCalls += Number.isInteger(node.tool_calls) ? node.tool_calls : 0;
      if (!VALID_EFFECT_CLASSES.has(node.effect_class)) {
        errors.push(issue('node.effect', `Unsupported effect class: ${node.effect_class}.`, `${path}.effect_class`));
      }
      if (!isNonEmptyString(node.idempotency)) {
        errors.push(issue('node.idempotency', 'Idempotency behavior is required.', `${path}.idempotency`));
      }
      if (node.effect_class === 'read-only' && Array.isArray(node.writes) && node.writes.length) {
        errors.push(issue('node.readonly', 'Read-only nodes cannot declare writes.', `${path}.writes`));
      }
      if (node.kind === 'loop' && node.max_attempts < 1) {
        errors.push(issue('loop.bound', 'Loop nodes require a finite attempt cap.', `${path}.max_attempts`));
      }
      if (node.effect_class === 'external') {
        externalNodes.add(node.id);
        if (!isNonEmptyString(node.compensation)) {
          errors.push(issue('external.compensation', 'External nodes require compensation.', `${path}.compensation`));
        }
      }
      (Array.isArray(node.writes) ? node.writes : []).forEach((target) => {
        if (!writers.has(target)) {
          writers.set(target, []);
        }
        writers.get(target).push(node.id);
      });
    });

    if (totalToolCalls > budgets.tool_calls) {
      errors.push(issue('budget.tools', 'Sum of node tool_calls exceeds the graph budget.', 'budgets.tool_calls'));
    }
    writers.forEach((owners, target) => {
      if (owners.length > 1) {
        errors.push(issue('writer.overlap', `Write target has multiple owners: ${target}.`, 'nodes'));
      }
    });

    const edges = Array.isArray(contract.edges) ? contract.edges : [];
    const adjacency = new Map(Array.from(nodeMap.keys(), (id) => [id, new Set()]));
    const incoming = new Map(Array.from(nodeMap.keys(), (id) => [id, new Set()]));
    const outgoing = new Map(Array.from(nodeMap.keys(), (id) => [id, new Set()]));
    const edgeKeys = new Set();
    const compensationSources = new Set();

    edges.forEach((edge, index) => {
      const path = `edges[${index}]`;
      if (!isObject(edge)) {
        errors.push(issue('edge.object', 'Edge must be an object.', path));
        return;
      }
      if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
        errors.push(issue('edge.endpoint', `Unknown edge endpoint: ${edge.from} → ${edge.to}.`, path));
        return;
      }
      if (edge.from === edge.to) {
        errors.push(issue('edge.self', 'Self edges are not allowed.', path));
      }
      if (!VALID_EDGE_TYPES.has(edge.type)) {
        errors.push(issue('edge.type', `Unsupported edge type: ${edge.type}.`, `${path}.type`));
      }
      if (!isNonEmptyString(edge.condition)) {
        errors.push(issue('edge.condition', 'Edge condition is required.', `${path}.condition`));
      }
      const key = `${edge.from}|${edge.to}|${edge.type}|${edge.payload_schema}`;
      if (edgeKeys.has(key)) {
        errors.push(issue('edge.duplicate', `Duplicate edge: ${edge.from} → ${edge.to}.`, path));
      }
      edgeKeys.add(key);
      adjacency.get(edge.from).add(edge.to);
      outgoing.get(edge.from).add(edge.to);
      incoming.get(edge.to).add(edge.from);

      if (SCHEMA_EDGE_TYPES.has(edge.type)) {
        if (!isNonEmptyString(edge.payload_schema)) {
          errors.push(issue('edge.schema', 'Data and verification edges require a payload schema.', `${path}.payload_schema`));
        } else {
          const sourceOutputs = nodeMap.get(edge.from).outputs || [];
          const targetInputs = nodeMap.get(edge.to).inputs || [];
          if (!sourceOutputs.includes(edge.payload_schema)) {
            errors.push(issue('edge.output', `${edge.from} does not output ${edge.payload_schema}.`, `${path}.payload_schema`));
          }
          if (!targetInputs.includes(edge.payload_schema)) {
            errors.push(issue('edge.input', `${edge.to} does not accept ${edge.payload_schema}.`, `${path}.payload_schema`));
          }
        }
      }
      if (isNonEmptyString(edge.failure_route)) {
        if (!nodeMap.has(edge.failure_route)) {
          errors.push(issue('edge.failure', `Unknown failure route: ${edge.failure_route}.`, `${path}.failure_route`));
        } else {
          adjacency.get(edge.from).add(edge.failure_route);
          outgoing.get(edge.from).add(edge.failure_route);
          incoming.get(edge.failure_route).add(edge.from);
        }
      }
      if (edge.type === 'compensation') {
        compensationSources.add(edge.from);
      }
    });

    const entries = Array.isArray(contract.entry_nodes) ? contract.entry_nodes : [];
    const terminals = Array.isArray(contract.terminal_nodes) ? contract.terminal_nodes : [];
    if (!isUniqueStringList(entries, false)) {
      errors.push(issue('entry.list', 'entry_nodes must be a non-empty unique list.', 'entry_nodes'));
    }
    if (!isUniqueStringList(terminals, false)) {
      errors.push(issue('terminal.list', 'terminal_nodes must be a non-empty unique list.', 'terminal_nodes'));
    }
    entries.forEach((id) => {
      if (!nodeMap.has(id)) {
        errors.push(issue('entry.unknown', `Unknown entry node: ${id}.`, 'entry_nodes'));
      } else if (incoming.get(id).size) {
        errors.push(issue('entry.incoming', `Entry node has an incoming edge: ${id}.`, 'entry_nodes'));
      }
    });
    terminals.forEach((id) => {
      if (!nodeMap.has(id)) {
        errors.push(issue('terminal.unknown', `Unknown terminal node: ${id}.`, 'terminal_nodes'));
      } else if (outgoing.get(id).size) {
        errors.push(issue('terminal.outgoing', `Terminal node has an outgoing edge: ${id}.`, 'terminal_nodes'));
      }
    });

    const reachable = new Set();
    const stack = entries.filter((id) => nodeMap.has(id));
    while (stack.length) {
      const id = stack.pop();
      if (reachable.has(id)) {
        continue;
      }
      reachable.add(id);
      adjacency.get(id).forEach((next) => stack.push(next));
    }
    nodeMap.forEach((_node, id) => {
      if (!reachable.has(id)) {
        errors.push(issue('node.unreachable', `Unreachable node: ${id}.`, 'nodes'));
      }
    });

    const indegree = new Map(Array.from(nodeMap.keys(), (id) => [id, 0]));
    adjacency.forEach((targets) => {
      targets.forEach((target) => indegree.set(target, indegree.get(target) + 1));
    });
    const ready = Array.from(indegree.entries()).filter(([, degree]) => degree === 0).map(([id]) => id);
    let visited = 0;
    while (ready.length) {
      const id = ready.pop();
      visited += 1;
      adjacency.get(id).forEach((target) => {
        indegree.set(target, indegree.get(target) - 1);
        if (indegree.get(target) === 0) {
          ready.push(target);
        }
      });
    }
    if (visited !== nodeMap.size) {
      errors.push(issue('graph.cycle', 'Static graph must be acyclic.', 'edges'));
    } else if (isPositiveInteger(budgets.wall_time_seconds)) {
      const criticalIndegree = new Map(Array.from(nodeMap.keys(), (id) => [id, 0]));
      const criticalDuration = new Map(
        Array.from(nodeMap.entries(), ([id, node]) => [
          id,
          isPositiveInteger(node.timeout_seconds) ? node.timeout_seconds : 0
        ])
      );
      adjacency.forEach((targets) => {
        targets.forEach((target) => (
          criticalIndegree.set(target, criticalIndegree.get(target) + 1)
        ));
      });
      const criticalReady = Array.from(criticalIndegree.entries())
        .filter(([, degree]) => degree === 0)
        .map(([id]) => id);
      while (criticalReady.length) {
        const id = criticalReady.pop();
        adjacency.get(id).forEach((target) => {
          const targetNode = nodeMap.get(target);
          const targetTimeout = isPositiveInteger(targetNode?.timeout_seconds)
            ? targetNode.timeout_seconds
            : 0;
          criticalDuration.set(
            target,
            Math.max(
              criticalDuration.get(target),
              criticalDuration.get(id) + targetTimeout
            )
          );
          criticalIndegree.set(target, criticalIndegree.get(target) - 1);
          if (criticalIndegree.get(target) === 0) {
            criticalReady.push(target);
          }
        });
      }
      const longestPathSeconds = Math.max(0, ...criticalDuration.values());
      if (longestPathSeconds > budgets.wall_time_seconds) {
        errors.push(issue(
          'budget.critical-path',
          `Critical-path timeout ${longestPathSeconds}s exceeds graph wall time.`,
          'budgets.wall_time_seconds'
        ));
      }
    }

    const joins = Array.isArray(contract.joins) ? contract.joins : [];
    const joinTargets = new Set();
    const joinIds = new Set();
    joins.forEach((join, index) => {
      const path = `joins[${index}]`;
      if (!isObject(join)) {
        errors.push(issue('join.object', 'Join must be an object.', path));
        return;
      }
      if (!isNonEmptyString(join.id) || joinIds.has(join.id)) {
        errors.push(issue('join.id', 'Join id must be non-empty and unique.', `${path}.id`));
      }
      joinIds.add(join.id);
      if (!nodeMap.has(join.target)) {
        errors.push(issue('join.target', `Unknown join target: ${join.target}.`, `${path}.target`));
        return;
      }
      if (joinTargets.has(join.target)) {
        errors.push(issue('join.multiple', `Multiple joins target ${join.target}.`, `${path}.target`));
      }
      joinTargets.add(join.target);
      if (!VALID_JOIN_MODES.has(join.mode)) {
        errors.push(issue('join.mode', `Unsupported join mode: ${join.mode}.`, `${path}.mode`));
      }
      if (!isUniqueStringList(join.inputs, false) || join.inputs.length < 2) {
        errors.push(issue('join.inputs', 'Join inputs need at least two unique nodes.', `${path}.inputs`));
      } else {
        const declared = new Set(join.inputs);
        const actual = incoming.get(join.target);
        if (declared.size !== actual.size || Array.from(declared).some((id) => !actual.has(id))) {
          errors.push(issue('join.exact', 'Join inputs must exactly match incoming dependencies.', `${path}.inputs`));
        }
      }
      if (!isNonEmptyString(join.verifier)) {
        errors.push(issue('join.verifier', 'Join verifier is required.', `${path}.verifier`));
      }
      if (join.mode === 'quorum') {
        if (!isPositiveInteger(join.quorum) || join.quorum > join.inputs.length) {
          errors.push(issue('join.quorum', 'Quorum must fit the declared input count.', `${path}.quorum`));
        }
      } else if (join.quorum !== null) {
        errors.push(issue('join.quorum.null', 'quorum must be null unless mode is quorum.', `${path}.quorum`));
      }
    });
    incoming.forEach((sources, nodeId) => {
      if (sources.size > 1 && !joinTargets.has(nodeId)) {
        errors.push(issue('join.missing', `${nodeId} has multiple dependencies but no explicit join.`, 'joins'));
      }
    });

    externalNodes.forEach((nodeId) => {
      const node = nodeMap.get(nodeId);
      const approvalRequired = permission.approval_required || [];
      if (!approvalRequired.includes(nodeId)) {
        errors.push(issue('external.approval', `External node ${nodeId} is not in approval_required.`, 'permission_boundary.approval_required'));
      }
      (node.writes || []).forEach((target) => {
        if (!(permission.allowed || []).includes(target) || (permission.denied || []).includes(target)) {
          errors.push(issue('external.scope', `External write is not exactly allowed: ${target}.`, 'permission_boundary'));
        }
      });
      const approvalEdge = edges.some((edge) => {
        const source = nodeMap.get(edge.from);
        return edge.to === nodeId
          && source?.kind === 'human-gate'
          && SCHEMA_EDGE_TYPES.has(edge.type)
          && /approval/i.test(edge.payload_schema || '')
          && /receipt/i.test(edge.payload_schema || '');
      });
      if (!approvalEdge) {
        errors.push(issue('external.receipt', `External node ${nodeId} needs a direct approval receipt.`, 'edges'));
      }
      if (!compensationSources.has(nodeId)) {
        errors.push(issue('external.edge', `External node ${nodeId} needs a compensation edge.`, 'edges'));
      }
    });

    if (!isObject(contract.blueprint)) {
      errors.push(issue('blueprint.extension', 'Editable blueprint metadata is required.', 'blueprint'));
    } else {
      if (!isNonEmptyString(contract.blueprint.mission_title)) {
        errors.push(issue('mission.title', 'Mission title is required.', 'blueprint.mission_title'));
      }
      if (!isUniqueStringList(contract.blueprint.success_criteria, false)) {
        errors.push(issue('mission.criteria', 'At least one unique success criterion is required.', 'blueprint.success_criteria'));
      }
    }

    const teamResult = validateTeamCommand(contract.team_command, contract, false);
    errors.push(...teamResult.errors);
    warnings.push(...teamResult.warnings);

    return { errors, warnings };
  }

  function validateTeamCommand(team, contract, requireConfirmed) {
    const errors = [];
    const warnings = [];
    if (!isObject(team)) {
      return { errors: [issue('team.object', 'team_command must be an object.', 'team_command')], warnings };
    }
    if (team.schema_version !== '1.1') {
      errors.push(issue(
        'team.schema',
        'team_command.schema_version must be 1.1.',
        'team_command.schema_version'
      ));
    }
    [
      'commander',
      'integration_owner',
      'topology',
      'activation_gate',
      'runtime_validation_node',
      'adapter_readiness_node',
      'state_path',
      'artifact_path'
    ].forEach((field) => {
      if (!isNonEmptyString(team[field])) {
        errors.push(issue('team.field', `${field} is required.`, `team_command.${field}`));
      }
    });
    const graphNodes = Array.isArray(contract?.nodes) ? contract.nodes : [];
    const graphNodeMap = new Map(graphNodes.map((node) => [node.id, node]));
    const graphEdges = Array.isArray(contract?.edges) ? contract.edges : [];
    const graphAdjacency = new Map(graphNodes.map((node) => [node.id, new Set()]));
    graphEdges.forEach((edge) => {
      if (DEPENDENCY_EDGE_TYPES.has(edge?.type)
        && graphAdjacency.has(edge.from)
        && graphAdjacency.has(edge.to)) {
        graphAdjacency.get(edge.from).add(edge.to);
      }
    });

    const gate = graphNodeMap.get(team.activation_gate);
    if (!gate || gate.kind !== 'human-gate') {
      errors.push(issue('team.gate', 'activation_gate must reference a human-gate node.', 'team_command.activation_gate'));
    }
    const runtimeNode = graphNodeMap.get(team.runtime_validation_node);
    if (!runtimeNode || runtimeNode.kind !== 'deterministic') {
      errors.push(issue(
        'team.runtime.node',
        'runtime_validation_node must reference a deterministic Graph node.',
        'team_command.runtime_validation_node'
      ));
    }
    if (gate && runtimeNode && !graphEdges.some((edge) => (
      edge.from === gate.id
      && edge.to === runtimeNode.id
      && edge.type === 'verification'
    ))) {
      errors.push(issue(
        'team.runtime.edge',
        'The human gate must release the runtime-validation node through a verification edge.',
        'team_command.runtime_validation_node'
      ));
    }
    if (isNonEmptyString(contract?.owner) && team.integration_owner !== contract.owner) {
      errors.push(issue(
        'team.integration.owner',
        'integration_owner must match the Graph owner.',
        'team_command.integration_owner'
      ));
    }
    if (runtimeNode && isNonEmptyString(team.integration_owner)
      && runtimeNode.owner !== team.integration_owner) {
      errors.push(issue(
        'team.runtime.owner',
        'The integration owner must own runtime validation.',
        'team_command.runtime_validation_node'
      ));
    }
    const readinessNode = graphNodeMap.get(team.adapter_readiness_node);
    if (!readinessNode || readinessNode.kind !== 'deterministic') {
      errors.push(issue(
        'team.adapter-readiness.node',
        'adapter_readiness_node must reference a deterministic Graph node.',
        'team_command.adapter_readiness_node'
      ));
    } else {
      if (readinessNode.owner !== 'harness-runtime') {
        errors.push(issue(
          'team.adapter-readiness.owner',
          'Adapter readiness is owned by the Harness runtime.',
          'team_command.adapter_readiness_node'
        ));
      }
      if (!Array.isArray(readinessNode.outputs)
        || !readinessNode.outputs.includes('adapter_readiness_receipt')) {
        errors.push(issue(
          'team.adapter-readiness.output',
          'Adapter readiness must emit adapter_readiness_receipt.',
          'team_command.adapter_readiness_node'
        ));
      }
    }
    if (runtimeNode && readinessNode && !graphEdges.some((edge) => (
      edge.from === runtimeNode.id
      && edge.to === readinessNode.id
      && edge.type === 'verification'
      && edge.payload_schema === 'runtime_validation_receipt'
    ))) {
      errors.push(issue(
        'team.adapter-readiness.edge',
        'Runtime contract validation must release adapter readiness through a typed verification edge.',
        'team_command.adapter_readiness_node'
      ));
    }

    const executionReachable = new Set();
    const executionRoot = readinessNode || runtimeNode;
    if (executionRoot && graphAdjacency.has(executionRoot.id)) {
      const stack = [executionRoot.id];
      while (stack.length) {
        const nodeId = stack.pop();
        if (executionReachable.has(nodeId)) {
          continue;
        }
        executionReachable.add(nodeId);
        graphAdjacency.get(nodeId).forEach((target) => stack.push(target));
      }
    }
    const executionAgentNodes = new Map(
      graphNodes
        .filter((node) => (
          executionReachable.has(node.id)
          && (node.kind === 'agent' || node.kind === 'agent-team')
        ))
        .map((node) => [node.id, node])
    );
    if (!isObject(team.admission)
      || !isNonEmptyString(team.admission.rationale)
      || !isNonEmptyString(team.admission.orchestration_tax)) {
      errors.push(issue('team.admission', 'Team admission needs rationale and orchestration tax.', 'team_command.admission'));
    }
    const review = isObject(team.review_budget) ? team.review_budget : {};
    ['max_parallel_workers', 'max_open_workstreams', 'max_changed_lines_per_batch'].forEach((field) => {
      if (!isPositiveInteger(review[field])) {
        errors.push(issue('team.review', `${field} must be finite.`, `team_command.review_budget.${field}`));
      }
    });
    if (isPositiveInteger(review.max_parallel_workers)
      && isPositiveInteger(contract?.budgets?.max_concurrency)
      && review.max_parallel_workers > contract.budgets.max_concurrency) {
      errors.push(issue(
        'team.review.concurrency',
        'Team parallel workers exceed the Graph concurrency budget.',
        'team_command.review_budget.max_parallel_workers'
      ));
    }
    if (!isUniqueStringList(team.ipc_schema, false)
      || REQUIRED_IPC_FIELDS.some((field) => !team.ipc_schema.includes(field))) {
      errors.push(issue('team.ipc', 'IPC schema is missing required fields.', 'team_command.ipc_schema'));
    }
    const ipcContract = isObject(team.ipc_contract) ? team.ipc_contract : {};
    if (ipcContract.protocol !== 'agent-team-ipc/1.0'
      || ipcContract.transport !== 'append-only-jsonl'
      || !isNonEmptyString(ipcContract.ledger)
      || ipcContract.artifact_transfer !== 'content-addressed-reference') {
      errors.push(issue(
        'team.ipc.contract',
        'IPC needs the versioned append-only JSONL and content-addressed artifact contract.',
        'team_command.ipc_contract'
      ));
    }
    if (!isUniqueStringList(ipcContract.required_envelope_fields, false)
      || REQUIRED_IPC_ENVELOPE_FIELDS.some(
        (field) => !ipcContract.required_envelope_fields.includes(field)
      )) {
      errors.push(issue(
        'team.ipc.envelope',
        'IPC required_envelope_fields are incomplete.',
        'team_command.ipc_contract.required_envelope_fields'
      ));
    }
    if (!isUniqueStringList(ipcContract.message_types, false)
      || !isNonEmptyString(ipcContract.deduplication_key)
      || !isNonEmptyString(ipcContract.ordering_key)) {
      errors.push(issue(
        'team.ipc.messages',
        'IPC message types, deduplication, and ordering must be explicit.',
        'team_command.ipc_contract'
      ));
    }

    const roster = isObject(team.agent_roster) ? team.agent_roster : {};
    const adapters = Array.isArray(roster.adapters) ? roster.adapters : [];
    const adapterMap = new Map();
    if (roster.schema_version !== '1.0'
      || !isUniqueStringList(roster.required_adapter_ids, false)
      || REQUIRED_ADAPTER_IDS.some((id) => !roster.required_adapter_ids.includes(id))) {
      errors.push(issue(
        'team.roster.required',
        'The runtime roster must require Claude, Antigravity, and Codex adapter descriptors.',
        'team_command.agent_roster'
      ));
    }
    if (!adapters.length) {
      errors.push(issue(
        'team.roster.adapters',
        'At least one runtime adapter descriptor is required.',
        'team_command.agent_roster.adapters'
      ));
    }
    adapters.forEach((adapter, index) => {
      const path = `team_command.agent_roster.adapters[${index}]`;
      [
        'id',
        'display_name',
        'runtime_kind',
        'connection_ref',
        'launch_mode',
        'ipc_protocol_version'
      ].forEach((field) => {
        if (!isNonEmptyString(adapter?.[field])) {
          errors.push(issue('team.adapter.field', `${field} is required.`, `${path}.${field}`));
        }
      });
      if (adapterMap.has(adapter?.id)) {
        errors.push(issue('team.adapter.id', `Duplicate adapter id: ${adapter.id}.`, `${path}.id`));
      }
      adapterMap.set(adapter?.id, adapter);
      if (adapter?.enabled !== true) {
        errors.push(issue('team.adapter.enabled', 'Required mission adapters must be enabled.', `${path}.enabled`));
      }
      if (adapter?.connection_ref !== `runtime.adapters.${adapter?.id || ''}`) {
        errors.push(issue(
          'team.adapter.connection',
          'connection_ref must be an opaque runtime.adapters.<id> reference, never a credential or URL.',
          `${path}.connection_ref`
        ));
      }
      if (adapter?.launch_mode !== 'harness-managed') {
        errors.push(issue(
          'team.adapter.launch',
          'All adapter launch modes must be Harness-managed.',
          `${path}.launch_mode`
        ));
      }
      if (!isUniqueStringList(adapter?.declared_capabilities, false)
        || !isUniqueStringList(adapter?.supported_workspace_modes, false)
        || !isUniqueStringList(adapter?.supported_permission_profiles, false)) {
        errors.push(issue(
          'team.adapter.capabilities',
          'Adapter capabilities, workspace modes, and permission profiles must be unique string lists.',
          path
        ));
      }
      if (!isPositiveInteger(adapter?.max_concurrency)) {
        errors.push(issue(
          'team.adapter.concurrency',
          'Adapter max_concurrency must be finite.',
          `${path}.max_concurrency`
        ));
      }
      if (adapter?.ipc_protocol_version !== ipcContract.protocol) {
        errors.push(issue(
          'team.adapter.ipc',
          'Every adapter must implement the canonical IPC protocol version.',
          `${path}.ipc_protocol_version`
        ));
      }
      if (adapter?.runtime_state?.status !== 'UNVERIFIED'
        || adapter?.runtime_state?.probe_receipt !== null) {
        errors.push(issue(
          'team.adapter.authority',
          'Browser state may only declare an UNVERIFIED adapter with no probe receipt.',
          `${path}.runtime_state`
        ));
      }
      if (containsSecretField(adapter)) {
        errors.push(issue(
          'team.adapter.secret',
          'Adapter descriptors cannot contain credentials, tokens, passwords, or secret fields.',
          path
        ));
      }
    });
    REQUIRED_ADAPTER_IDS.forEach((id) => {
      if (!adapterMap.has(id)) {
        errors.push(issue(
          'team.adapter.missing',
          `Required adapter ${id} is missing.`,
          'team_command.agent_roster.adapters'
        ));
      }
    });
    if (!isUniqueStringList(team.allowed_tools, false) || !isUniqueStringList(team.denied_tools, false)) {
      errors.push(issue('team.tools', 'Allowed and denied tools must be explicit string lists.', 'team_command'));
    }
    const workstreams = Array.isArray(team.workstreams) ? team.workstreams : [];
    if (workstreams.length < 2) {
      errors.push(issue('team.width', 'A team requires at least two independently ownable workstreams.', 'team_command.workstreams'));
    }
    const ids = new Set();
    const owners = new Set();
    const territories = new Map();
    const artifacts = new Set();
    const mappedNodeIds = new Set();
    const graphNodeToStreamId = new Map();
    workstreams.forEach((stream, index) => {
      const path = `team_command.workstreams[${index}]`;
      [
        'id',
        'graph_node_id',
        'name',
        'capability',
        'owner',
        'output_artifact',
        'verifier',
        'stop_condition'
      ].forEach((field) => {
        if (!isNonEmptyString(stream?.[field])) {
          errors.push(issue('team.stream.field', `${field} is required.`, `${path}.${field}`));
        }
      });
      if (ids.has(stream?.id)) {
        errors.push(issue('team.stream.id', `Duplicate workstream id: ${stream.id}.`, `${path}.id`));
      }
      ids.add(stream?.id);
      if (owners.has(stream?.owner)) {
        warnings.push(issue('team.owner.shared', `Owner ${stream.owner} owns more than one workstream.`, `${path}.owner`));
      }
      owners.add(stream?.owner);
      if (!isUniqueStringList(stream?.territory, false)
        || !isUniqueStringList(stream?.inputs, false)
        || !isUniqueStringList(stream?.dependencies, true)) {
        errors.push(issue('team.stream.list', 'Territory, inputs, and dependencies must be unique string lists.', path));
      }
      (stream?.territory || []).forEach((target) => {
        if (!territories.has(target)) {
          territories.set(target, []);
        }
        territories.get(target).push(stream.id);
      });
      if (artifacts.has(stream?.output_artifact)) {
        errors.push(issue('team.artifact.overlap', `Output artifact has multiple writers: ${stream.output_artifact}.`, `${path}.output_artifact`));
      }
      artifacts.add(stream?.output_artifact);
      if (Array.isArray(stream?.territory)
        && isNonEmptyString(stream?.output_artifact)
        && !stream.territory.includes(stream.output_artifact)) {
        errors.push(issue(
          'team.stream.artifact',
          'The output artifact must be inside the workstream territory.',
          `${path}.output_artifact`
        ));
      }
      const budget = isObject(stream?.budget) ? stream.budget : {};
      ['max_attempts', 'tool_calls', 'timeout_seconds'].forEach((field) => {
        if (!isPositiveInteger(budget[field])) {
          errors.push(issue('team.stream.budget', `${field} must be finite.`, `${path}.budget.${field}`));
        }
      });
      const mappedNode = executionAgentNodes.get(stream?.graph_node_id);
      if (!mappedNode) {
        errors.push(issue(
          'team.stream.graph-node',
          'graph_node_id must reference a reachable post-validation agent or agent-team node.',
          `${path}.graph_node_id`
        ));
      } else {
        if (mappedNodeIds.has(mappedNode.id)) {
          errors.push(issue(
            'team.stream.graph-node-duplicate',
            `Graph node ${mappedNode.id} is mapped by more than one workstream.`,
            `${path}.graph_node_id`
          ));
        }
        mappedNodeIds.add(mappedNode.id);
        graphNodeToStreamId.set(mappedNode.id, stream.id);
        if (stream.owner !== mappedNode.owner) {
          errors.push(issue(
            'team.stream.owner',
            `Workstream owner must match Graph node owner ${mappedNode.owner}.`,
            `${path}.owner`
          ));
        }
        ['max_attempts', 'tool_calls', 'timeout_seconds'].forEach((field) => {
          if (isPositiveInteger(budget[field])
            && isPositiveInteger(mappedNode[field])
            && budget[field] > mappedNode[field]) {
            errors.push(issue(
              'team.stream.graph-budget',
              `${field} exceeds the mapped Graph node budget.`,
              `${path}.budget.${field}`
            ));
          }
        });
        if (Array.isArray(mappedNode.inputs)
          && Array.isArray(stream?.inputs)
          && mappedNode.inputs.some((input) => !stream.inputs.includes(input))) {
          errors.push(issue(
            'team.stream.inputs',
            'Workstream inputs must include every mapped Graph node input.',
            `${path}.inputs`
          ));
        }
        if (Array.isArray(mappedNode.writes)
          && isNonEmptyString(stream?.output_artifact)
          && !mappedNode.writes.includes(stream.output_artifact)) {
          errors.push(issue(
            'team.stream.graph-artifact',
            'Workstream output artifact must be a write owned by the mapped Graph node.',
            `${path}.output_artifact`
          ));
        }
      }
      if (['model', 'provider', 'vendor', 'adapter_id', 'runtime_adapter'].some(
        (field) => field in (stream || {})
      )) {
        errors.push(issue(
          'team.binding',
          'Route by capability; durable model, provider, vendor, or adapter bindings are not allowed.',
          path
        ));
      }
    });

    const routing = isObject(team.routing) ? team.routing : {};
    const routeRequests = Array.isArray(routing.route_requests) ? routing.route_requests : [];
    if (routing.selection_policy !== 'capability-match-at-runtime'
      || routing.require_runtime_probe !== true
      || typeof routing.automatic_substitution !== 'boolean'
      || routing.unavailable_action !== 'PAUSE_AND_ESCALATE') {
      errors.push(issue(
        'team.routing.policy',
        'Routing must be capability-matched at runtime, probe-gated, and pause on unavailable capability.',
        'team_command.routing'
      ));
    }
    if (containsSecretField(routing)) {
      errors.push(issue(
        'team.routing.secret',
        'Routing requests cannot contain credentials, tokens, passwords, or secret fields.',
        'team_command.routing'
      ));
    }
    const requestIds = new Set();
    const workstreamMap = new Map(workstreams.map((stream) => [stream.id, stream]));
    const adapterCovers = (adapter, request) => (
      adapter?.enabled === true
      && (request.required_capabilities || []).every(
        (capability) => adapter.declared_capabilities?.includes(capability)
      )
      && adapter.supported_workspace_modes?.includes(request.workspace_mode)
      && adapter.supported_permission_profiles?.includes(request.permission_profile)
    );
    routeRequests.forEach((request, index) => {
      const path = `team_command.routing.route_requests[${index}]`;
      const stream = workstreamMap.get(request?.workstream_id);
      if (requestIds.has(request?.workstream_id)) {
        errors.push(issue(
          'team.routing.duplicate',
          `Duplicate route request for ${request.workstream_id}.`,
          `${path}.workstream_id`
        ));
      }
      requestIds.add(request?.workstream_id);
      if (!stream) {
        errors.push(issue(
          'team.routing.workstream',
          'Route request must reference one declared workstream.',
          `${path}.workstream_id`
        ));
      } else {
        if (request.graph_node_id !== stream.graph_node_id
          || request.capability_owner !== stream.owner) {
          errors.push(issue(
            'team.routing.ownership',
            'Route request graph node and capability owner must match the durable workstream.',
            path
          ));
        }
      }
      if (!isUniqueStringList(request?.required_capabilities, false)
        || !isNonEmptyString(request?.workspace_mode)
        || !isNonEmptyString(request?.permission_profile)) {
        errors.push(issue(
          'team.routing.requirements',
          'Every route request needs capabilities, workspace mode, and permission profile.',
          path
        ));
      }
      if (['adapter_id', 'preferred_adapter_id', 'selected_adapter_id', 'model', 'provider', 'vendor']
        .some((field) => field in (request || {}))) {
        errors.push(issue(
          'team.routing.binding',
          'Route requests cannot pre-bind a named runtime adapter.',
          path
        ));
      }
      if ('territory' in (request || {})) {
        errors.push(issue(
          'team.routing.territory',
          'Runtime routing cannot expand durable workstream territory.',
          path
        ));
      }
      if (!adapters.some((adapter) => adapterCovers(adapter, request || {}))) {
        errors.push(issue(
          'team.routing.unavailable',
          `No enabled adapter declares the complete capability and permission profile for ${request?.workstream_id || 'route'}.`,
          path
        ));
      }
    });
    workstreams.forEach((stream) => {
      if (!requestIds.has(stream.id)) {
        errors.push(issue(
          'team.routing.missing',
          `Workstream ${stream.id} needs exactly one capability route request.`,
          'team_command.routing.route_requests'
        ));
      }
    });
    const orchestration = isObject(routing.orchestration_request)
      ? routing.orchestration_request
      : {};
    if (orchestration.capability_owner !== team.integration_owner
      || orchestration.serial !== true
      || !isUniqueStringList(orchestration.required_capabilities, false)
      || !isNonEmptyString(orchestration.workspace_mode)
      || !isNonEmptyString(orchestration.permission_profile)
      || !adapters.some((adapter) => adapterCovers(adapter, orchestration))) {
      errors.push(issue(
        'team.routing.orchestration',
        'Serial integration needs one capability-routable Harness orchestration request.',
        'team_command.routing.orchestration_request'
      ));
    }
    const resolution = isObject(routing.resolution) ? routing.resolution : {};
    if (resolution.status !== 'PENDING_HARNESS_PROBE'
      || !Array.isArray(resolution.selected_routes)
      || resolution.selected_routes.length !== 0
      || resolution.receipt !== null) {
      errors.push(issue(
        'team.routing.authority',
        'Browser state cannot claim selected routes or Harness readiness.',
        'team_command.routing.resolution'
      ));
    }
    executionAgentNodes.forEach((_node, nodeId) => {
      if (!mappedNodeIds.has(nodeId)) {
        errors.push(issue(
          'team.stream.graph-node-missing',
          `Post-validation Graph node ${nodeId} needs exactly one workstream.`,
          'team_command.workstreams'
        ));
      }
    });
    if (isPositiveInteger(review.max_open_workstreams)
      && review.max_open_workstreams < workstreams.length) {
      errors.push(issue(
        'team.review.width',
        'max_open_workstreams is smaller than the declared workstream count.',
        'team_command.review_budget.max_open_workstreams'
      ));
    }
    territories.forEach((streamIds, target) => {
      if (streamIds.length > 1) {
        errors.push(issue('team.territory.overlap', `Territory has multiple owners: ${target}.`, 'team_command.workstreams'));
      }
    });
    workstreams.forEach((stream, index) => {
      (stream.dependencies || []).forEach((dependency) => {
        if (!ids.has(dependency)) {
          errors.push(issue('team.dependency', `Unknown workstream dependency: ${dependency}.`, `team_command.workstreams[${index}].dependencies`));
        }
      });
      const mappedNode = graphNodeMap.get(stream.graph_node_id);
      if (mappedNode) {
        const expectedDependencies = new Set(
          graphEdges
            .filter((edge) => (
              edge.to === mappedNode.id
              && DEPENDENCY_EDGE_TYPES.has(edge.type)
              && graphNodeToStreamId.has(edge.from)
            ))
            .map((edge) => graphNodeToStreamId.get(edge.from))
        );
        const actualDependencies = new Set(stream.dependencies || []);
        if (expectedDependencies.size !== actualDependencies.size
          || Array.from(expectedDependencies).some((id) => !actualDependencies.has(id))) {
          errors.push(issue(
            'team.dependency.graph',
            'Workstream dependencies must exactly match mapped Graph dependencies.',
            `team_command.workstreams[${index}].dependencies`
          ));
        }
      }
    });

    const dependencyAdjacency = new Map(Array.from(ids, (id) => [id, new Set()]));
    const dependencyIndegree = new Map(Array.from(ids, (id) => [id, 0]));
    workstreams.forEach((stream) => {
      (stream.dependencies || []).forEach((dependency) => {
        if (dependencyAdjacency.has(dependency) && dependencyIndegree.has(stream.id)) {
          if (!dependencyAdjacency.get(dependency).has(stream.id)) {
            dependencyAdjacency.get(dependency).add(stream.id);
            dependencyIndegree.set(stream.id, dependencyIndegree.get(stream.id) + 1);
          }
        }
      });
    });
    const dependencyReady = Array.from(dependencyIndegree.entries())
      .filter(([, degree]) => degree === 0)
      .map(([id]) => id);
    let dependencyVisited = 0;
    while (dependencyReady.length) {
      const id = dependencyReady.pop();
      dependencyVisited += 1;
      dependencyAdjacency.get(id).forEach((target) => {
        dependencyIndegree.set(target, dependencyIndegree.get(target) - 1);
        if (dependencyIndegree.get(target) === 0) {
          dependencyReady.push(target);
        }
      });
    }
    if (dependencyVisited !== ids.size) {
      errors.push(issue(
        'team.dependency.cycle',
        'Agent Team workstream dependencies must be acyclic.',
        'team_command.workstreams'
      ));
    }

    const integration = isObject(team.integration) ? team.integration : {};
    if (!isUniqueStringList(integration.order, false)
      || integration.order.length !== ids.size
      || integration.order.some((id) => !ids.has(id))) {
      errors.push(issue('team.integration.order', 'Integration order must name every workstream exactly once.', 'team_command.integration.order'));
    }
    ['verifier', 'rollback', 'cleanup_receipt'].forEach((field) => {
      if (!isNonEmptyString(integration[field])) {
        errors.push(issue('team.integration.field', `${field} is required.`, `team_command.integration.${field}`));
      }
    });
    if (!isNonEmptyString(integration.graph_node_id)) {
      errors.push(issue(
        'team.integration.field',
        'graph_node_id is required.',
        'team_command.integration.graph_node_id'
      ));
    } else {
      const integrationNode = graphNodeMap.get(integration.graph_node_id);
      const joinTargets = new Set(
        (Array.isArray(contract?.joins) ? contract.joins : []).map((join) => join.target)
      );
      if (!integrationNode || !joinTargets.has(integrationNode.id)) {
        errors.push(issue(
          'team.integration.graph-node',
          'Integration graph_node_id must reference an explicit Graph join target.',
          'team_command.integration.graph_node_id'
        ));
      } else if (integrationNode.owner !== team.integration_owner) {
        errors.push(issue(
          'team.integration.graph-owner',
          'The Graph integration node owner must match integration_owner.',
          'team_command.integration_owner'
        ));
      }
    }
    if (Array.isArray(integration.order)) {
      const integrationPosition = new Map(integration.order.map((id, index) => [id, index]));
      workstreams.forEach((stream) => {
        (stream.dependencies || []).forEach((dependency) => {
          if (integrationPosition.has(dependency)
            && integrationPosition.has(stream.id)
            && integrationPosition.get(dependency) > integrationPosition.get(stream.id)) {
            errors.push(issue(
              'team.integration.dependency-order',
              'Integration order must place dependencies before dependents.',
              'team_command.integration.order'
            ));
          }
        });
      });
    }
    const adapterOwnerIds = new Set(
      Array.from(adapterMap.keys())
        .filter(isNonEmptyString)
        .map((id) => id.trim().toLowerCase())
    );
    const durableOwners = [
      { value: contract?.owner, path: 'owner' },
      { value: team.commander, path: 'team_command.commander' },
      { value: team.integration_owner, path: 'team_command.integration_owner' },
      {
        value: orchestration.capability_owner,
        path: 'team_command.routing.orchestration_request.capability_owner'
      }
    ];
    graphNodes.forEach((node, index) => durableOwners.push({
      value: node?.owner,
      path: `nodes[${index}].owner`
    }));
    workstreams.forEach((stream, index) => durableOwners.push({
      value: stream?.owner,
      path: `team_command.workstreams[${index}].owner`
    }));
    routeRequests.forEach((request, index) => durableOwners.push({
      value: request?.capability_owner,
      path: `team_command.routing.route_requests[${index}].capability_owner`
    }));
    durableOwners.forEach(({ value, path }) => {
      if (isNonEmptyString(value)
        && adapterOwnerIds.has(value.trim().toLowerCase())) {
        errors.push(issue(
          'team.owner.adapter-binding',
          `Durable owner ${value} must be a capability role, not a runtime adapter ID.`,
          path
        ));
      }
    });
    if (requireConfirmed && !confirmationIsValid(contract)) {
      errors.push(issue('team.confirmation', 'A fresh structure confirmation is required.', 'blueprint.confirmation'));
    }
    return { errors, warnings };
  }

  function topologicalLevels(contract) {
    const nodes = Array.isArray(contract?.nodes) ? contract.nodes : [];
    const ids = nodes.map((node) => node.id);
    const known = new Set(ids);
    const adjacency = new Map(ids.map((id) => [id, new Set()]));
    const indegree = new Map(ids.map((id) => [id, 0]));
    (contract?.edges || []).forEach((edge) => {
      if (!known.has(edge.from) || !known.has(edge.to) || !DEPENDENCY_EDGE_TYPES.has(edge.type)) {
        return;
      }
      if (!adjacency.get(edge.from).has(edge.to)) {
        adjacency.get(edge.from).add(edge.to);
        indegree.set(edge.to, indegree.get(edge.to) + 1);
      }
    });
    let ready = ids.filter((id) => indegree.get(id) === 0);
    const levels = [];
    const placed = new Set();
    while (ready.length) {
      const level = ready;
      levels.push(level);
      ready = [];
      level.forEach((id) => {
        placed.add(id);
        adjacency.get(id).forEach((target) => {
          indegree.set(target, indegree.get(target) - 1);
          if (indegree.get(target) === 0) {
            ready.push(target);
          }
        });
      });
    }
    const remainder = ids.filter((id) => !placed.has(id));
    if (remainder.length) {
      levels.push(remainder);
    }
    return levels;
  }

  function confirmationIsValid(contract) {
    const receipt = contract?.blueprint?.confirmation;
    return isObject(receipt)
      && receipt.status === 'HUMAN_CONFIRMED'
      && receipt.graph_id === contract.graph_id
      && receipt.contract_sha256 === structureHash(contract)
      && receipt.client_validation?.status === 'PASSED'
      && receipt.client_validation?.contract_sha256 === receipt.contract_sha256;
  }

  function createConfirmation(contract, confirmedBy) {
    const validation = validateBlueprint(contract);
    if (validation.errors.length) {
      throw new Error('Cannot confirm an invalid blueprint.');
    }
    const contractSha256 = structureHash(contract);
    return {
      schema_version: '1.0',
      graph_id: contract.graph_id,
      contract_sha256: contractSha256,
      client_validation: {
        status: 'PASSED',
        validator: 'BlueprintModel.validateBlueprint',
        contract_sha256: contractSha256
      },
      confirmed_by: isNonEmptyString(confirmedBy) ? confirmedBy.trim() : 'human',
      confirmed_at: new Date().toISOString(),
      status: 'HUMAN_CONFIRMED'
    };
  }

  function invalidateConfirmation(contract, reason) {
    if (!contract?.blueprint?.confirmation) {
      return false;
    }
    contract.blueprint.confirmation = null;
    contract.blueprint.status = 'DRAFT';
    if (isObject(contract.team_command)) {
      contract.team_command.status = 'LOCKED_UNTIL_CONFIRMATION';
      contract.team_command.handoff = null;
    }
    if (!Array.isArray(contract.blueprint.events)) {
      contract.blueprint.events = [];
    }
    contract.blueprint.events.push({
      type: 'CONFIRMATION_INVALIDATED',
      at: new Date().toISOString(),
      detail: reason || 'Mission or graph structure changed.'
    });
    return true;
  }

  function createHandoff(contract) {
    const validation = validateBlueprint(contract);
    const teamValidation = validateTeamCommand(contract.team_command, contract, true);
    if (validation.errors.length || teamValidation.errors.length) {
      throw new Error('A valid confirmed blueprint and team command are required.');
    }
    const contractSha256 = structureHash(contract);
    const command = commandProjection(contract);
    const commandSha256 = sha256(stableStringify(command));
    return {
      schema_version: '1.1',
      handoff_id: `${contract.graph_id}-r${contract.blueprint.revision}`,
      status: 'PENDING_RUNTIME_VALIDATION',
      created_at: new Date().toISOString(),
      contract_sha256: contractSha256,
      command_sha256: commandSha256,
      confirmation_receipt: deepClone(contract.blueprint.confirmation),
      mission: {
        objective: contract.objective,
        non_goals: deepClone(contract.non_goals),
        success_criteria: deepClone(contract.blueprint.success_criteria)
      },
      graph_contract: structureProjection(contract),
      command,
      graph: {
        entry_nodes: deepClone(contract.entry_nodes),
        terminal_nodes: deepClone(contract.terminal_nodes),
        activation_gate: contract.team_command.activation_gate,
        runtime_validation_node: contract.team_command.runtime_validation_node,
        adapter_readiness_node: contract.team_command.adapter_readiness_node
      },
      runtime_validation: {
        status: 'REQUIRED',
        contract_locator: 'handoff.graph_contract',
        command_locator: 'handoff.command',
        validator_command_template: 'python tools/validate_mission_handoff.py <handoff.json> --receipt <runtime-validation-receipt.json>',
        strict_validator_command_template: 'python skills/graph-engineering/scripts/validate_graph_contract.py <extracted-graph-contract.json> --strict',
        expected_contract_sha256: contractSha256,
        expected_command_sha256: commandSha256,
        hash_algorithm: 'SHA-256',
        canonicalization: 'BlueprintModel.stableStringify for both handoff.graph_contract and handoff.command',
        required_receipt_fields: [
          'status',
          'validator_exit_code',
          'contract_sha256',
          'command_sha256',
          'command',
          'finished_at',
          'launch_authorized'
        ],
        receipt: null
      },
      adapter_readiness: {
        status: 'REQUIRED',
        node_id: contract.team_command.adapter_readiness_node,
        required_adapter_ids: deepClone(contract.team_command.agent_roster.required_adapter_ids),
        browser_claims_endpoint_health: false,
        launch_authorized: false,
        required_receipts: [
          'adapter_probe_receipts',
          'capability_route_receipt',
          'workspace_isolation_receipts',
          'permission_receipts',
          'ipc_ledger_readiness_receipt'
        ],
        receipt: null
      },
      next_action: 'Validate both exported hashes, then let the Harness probe adapters and resolve capability routes before recruiting workers.'
    };
  }

  function safeFilename(value, fallback) {
    const normalized = String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
    return normalized || fallback || 'blueprint';
  }

  return {
    STORAGE_KEY,
    MAX_IMPORT_BYTES,
    NODE_ID_PATTERN,
    VALID_NODE_KINDS: Array.from(VALID_NODE_KINDS),
    VALID_EDGE_TYPES: Array.from(VALID_EDGE_TYPES),
    VALID_JOIN_MODES: Array.from(VALID_JOIN_MODES),
    VALID_EFFECT_CLASSES: Array.from(VALID_EFFECT_CLASSES),
    getBlockCatalog,
    getBlockRecipes,
    blockTypeForNode,
    createBlockDraft,
    requiredBudgetFloor,
    previewBlockTransaction,
    applyBlockTransaction,
    applyBlockRecipe,
    deepClone,
    parseImportedJson,
    prepareImportedBlueprint,
    restoreEditableSnapshot,
    recoverEditableDraft,
    stableStringify,
    sha256,
    structureProjection,
    structureHash,
    commandProjection,
    commandHash,
    validateBlueprint,
    validateTeamCommand,
    topologicalLevels,
    confirmationIsValid,
    createConfirmation,
    invalidateConfirmation,
    createHandoff,
    safeFilename
  };
});
