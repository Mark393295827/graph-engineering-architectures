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

  function prepareImportedBlueprint(value) {
    const candidate = deepClone(value);
    if (!isObject(candidate.blueprint)) {
      candidate.blueprint = {};
    }
    candidate.blueprint.confirmation = null;
    candidate.blueprint.status = 'DRAFT';
    candidate.blueprint.updated_at = null;
    if (!Array.isArray(candidate.blueprint.events)) {
      candidate.blueprint.events = [];
    }
    candidate.blueprint.events.push({
      type: 'IMPORTED',
      at: new Date().toISOString(),
      detail: 'Imported state requires local validation and confirmation.'
    });
    if (isObject(candidate.team_command)) {
      candidate.team_command.status = 'LOCKED_UNTIL_CONFIRMATION';
      candidate.team_command.handoff = null;
    }
    return candidate;
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
    ['commander', 'integration_owner', 'topology', 'activation_gate', 'state_path', 'artifact_path'].forEach((field) => {
      if (!isNonEmptyString(team[field])) {
        errors.push(issue('team.field', `${field} is required.`, `team_command.${field}`));
      }
    });
    const gate = (contract?.nodes || []).find((node) => node.id === team.activation_gate);
    if (!gate || gate.kind !== 'human-gate') {
      errors.push(issue('team.gate', 'activation_gate must reference a human-gate node.', 'team_command.activation_gate'));
    }
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
    if (!isUniqueStringList(team.ipc_schema, false)
      || REQUIRED_IPC_FIELDS.some((field) => !team.ipc_schema.includes(field))) {
      errors.push(issue('team.ipc', 'IPC schema is missing required fields.', 'team_command.ipc_schema'));
    }
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
    workstreams.forEach((stream, index) => {
      const path = `team_command.workstreams[${index}]`;
      ['id', 'name', 'capability', 'owner', 'output_artifact', 'verifier', 'stop_condition'].forEach((field) => {
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
      const budget = isObject(stream?.budget) ? stream.budget : {};
      ['max_attempts', 'tool_calls', 'timeout_seconds'].forEach((field) => {
        if (!isPositiveInteger(budget[field])) {
          errors.push(issue('team.stream.budget', `${field} must be finite.`, `${path}.budget.${field}`));
        }
      });
      if ('model' in (stream || {}) || 'provider' in (stream || {})) {
        errors.push(issue('team.binding', 'Route by capability; durable model/provider bindings are not allowed.', path));
      }
    });
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
    });
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
    const command = deepClone(contract.team_command);
    command.handoff = null;
    return {
      schema_version: '1.0',
      handoff_id: `${contract.graph_id}-r${contract.blueprint.revision}`,
      status: 'PENDING_RUNTIME_VALIDATION',
      created_at: new Date().toISOString(),
      contract_sha256: contractSha256,
      confirmation_receipt: deepClone(contract.blueprint.confirmation),
      mission: {
        objective: contract.objective,
        non_goals: deepClone(contract.non_goals),
        success_criteria: deepClone(contract.blueprint.success_criteria)
      },
      command,
      graph: {
        entry_nodes: deepClone(contract.entry_nodes),
        terminal_nodes: deepClone(contract.terminal_nodes),
        activation_gate: contract.team_command.activation_gate
      },
      runtime_validation: {
        status: 'REQUIRED',
        validator: 'python skills/graph-engineering/scripts/validate_graph_contract.py blueprint/default-blueprint.json --strict',
        expected_contract_sha256: contractSha256,
        receipt: null
      },
      next_action: 'Run strict runtime validation and bind its receipt to this hash before recruiting capability-matched workers.'
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
    deepClone,
    parseImportedJson,
    prepareImportedBlueprint,
    stableStringify,
    sha256,
    structureProjection,
    structureHash,
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
