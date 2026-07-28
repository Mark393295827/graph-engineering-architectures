(function initializeMissionBlueprint() {
  'use strict';

  const Model = window.BlueprintModel;
  const seedElement = document.getElementById('blueprintSeed');
  const writerId = (
    window.crypto?.randomUUID?.()
    || `writer-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  const languageKey = 'graph-engineering-blueprint-language';
  const svgNamespace = 'http://www.w3.org/2000/svg';

  const translations = {
    en: {
      'action.import': 'Import',
      'action.export': 'Export',
      'action.confirm': 'Confirm structure',
      'action.editGraph': 'Edit graph',
      'action.reviewConfirm': 'Review & confirm',
      'action.confirmStructure': 'Confirm this structure',
      'action.validate': 'Validate now',
      'action.addNode': '+ Add node',
      'action.addEdge': '+ Add edge',
      'action.addJoin': '+ Add join',
      'action.addStream': '+ Add workstream',
      'action.prepareHandoff': 'Prepare agent handoff',
      'action.reviewStructure': 'Review structure',
      'action.downloadHandoff': 'Download handoff pack',
      'action.reset': 'Reset draft',
      'phase.blueprint': 'Blueprint',
      'phase.blueprintHint': 'Edit the whole mission',
      'phase.validate': 'Validate',
      'phase.validateHint': 'Check static invariants',
      'phase.confirm': 'Confirm',
      'phase.confirmHint': 'Bind a structure hash',
      'phase.team': 'Allocate team',
      'phase.teamHint': 'Prepare bounded handoff',
      'nav.workspace': 'Workspace',
      'nav.mission': 'Mission',
      'nav.missionHint': 'Intent & acceptance',
      'nav.graph': 'Graph',
      'nav.graphHint': 'Nodes, edges & joins',
      'nav.team': 'Agent team',
      'nav.teamHint': 'Ownership & IPC',
      'nav.format': 'Presentation',
      'nav.formatHint': 'Theme, layout & JSON',
      'guardrail.title': 'Static graph only',
      'guardrail.body': 'Repetition stays inside finite Loop nodes. The browser previews a plan; it never schedules agents.',
      'mission.eyebrow': 'Mission / structure first',
      'mission.contract': 'Mission contract',
      'mission.intent': 'Intent before execution',
      'common.editable': 'Editable',
      'field.title': 'Mission title',
      'field.summary': 'Opening summary',
      'field.objective': 'Objective',
      'field.nonGoals': 'Non-goals · one per line',
      'field.criteria': 'Success criteria · one per line',
      'confirm.gate': 'Human gate',
      'confirm.awaiting': 'Awaiting structure confirmation',
      'confirm.awaitingCopy': 'Team handoff stays locked until the current mission and graph pass validation and receive a matching hash receipt.',
      'metric.nodes': 'bounded nodes',
      'metric.edges': 'typed edges',
      'metric.joins': 'explicit joins',
      'metric.streams': 'team streams',
      'preview.eyebrow': 'Forward-only mission flow',
      'preview.title': 'Blueprint → confirmation → team → evidence',
      'graph.eyebrow': 'Canonical static DAG',
      'graph.title': 'Edit topology and execution contracts',
      'graph.intro': 'Every node has one owner, typed payloads, finite budgets, a verifier, and an explicit recovery path.',
      'graph.inspector': 'Node inspector',
      'graph.edges': 'Typed dependencies',
      'graph.edgesTitle': 'Edges',
      'graph.joins': 'Multi-input gates',
      'graph.joinsTitle': 'Explicit joins',
      'team.eyebrow': 'Agent Teams Command',
      'team.title': 'Allocate by capability after confirmation',
      'team.intro': 'Strategic control and integration stay serial. Independently ownable execution and review may run in parallel.',
      'team.gate': 'Confirmation boundary',
      'team.locked': 'Allocation is locked',
      'team.lockedCopy': 'Validate and confirm the current mission structure before editing the Agent Team command.',
      'format.eyebrow': 'Presentation model',
      'format.title': 'Edit appearance and the complete format',
      'format.intro': 'Presentation-only changes do not invalidate a confirmed graph. Raw JSON exposes every persisted field without enabling HTML, CSS, or script injection.'
    },
    'zh-CN': {
      'action.import': '导入',
      'action.export': '导出',
      'action.confirm': '确认结构',
      'action.editGraph': '编辑图结构',
      'action.reviewConfirm': '审查并确认',
      'action.confirmStructure': '确认当前结构',
      'action.validate': '立即验证',
      'action.addNode': '+ 添加节点',
      'action.addEdge': '+ 添加边',
      'action.addJoin': '+ 添加连接',
      'action.addStream': '+ 添加工作流',
      'action.prepareHandoff': '准备智能体交接',
      'action.reviewStructure': '审查结构',
      'action.downloadHandoff': '下载交接包',
      'action.reset': '重置草稿',
      'phase.blueprint': '蓝图',
      'phase.blueprintHint': '编辑整个任务',
      'phase.validate': '验证',
      'phase.validateHint': '检查静态不变量',
      'phase.confirm': '确认',
      'phase.confirmHint': '绑定结构哈希',
      'phase.team': '分配团队',
      'phase.teamHint': '准备有界交接',
      'nav.workspace': '工作区',
      'nav.mission': '任务',
      'nav.missionHint': '意图与验收',
      'nav.graph': '依赖图',
      'nav.graphHint': '节点、边与连接',
      'nav.team': '智能体团队',
      'nav.teamHint': '所有权与 IPC',
      'nav.format': '呈现',
      'nav.formatHint': '主题、布局与 JSON',
      'guardrail.title': '仅限静态图',
      'guardrail.body': '重复执行必须封装在有限循环节点内。浏览器只预览计划，不调度智能体。',
      'mission.eyebrow': '任务 / 先确认结构',
      'mission.contract': '任务契约',
      'mission.intent': '执行前明确意图',
      'common.editable': '可编辑',
      'field.title': '任务标题',
      'field.summary': '开场摘要',
      'field.objective': '目标',
      'field.nonGoals': '非目标 · 每行一项',
      'field.criteria': '成功标准 · 每行一项',
      'confirm.gate': '人工关卡',
      'confirm.awaiting': '等待结构确认',
      'confirm.awaitingCopy': '当前任务与图结构完成验证并取得匹配的哈希收据之前，团队交接保持锁定。',
      'metric.nodes': '有界节点',
      'metric.edges': '类型化边',
      'metric.joins': '显式连接',
      'metric.streams': '团队工作流',
      'preview.eyebrow': '单向任务流程',
      'preview.title': '蓝图 → 确认 → 团队 → 证据',
      'graph.eyebrow': '规范静态 DAG',
      'graph.title': '编辑拓扑与执行契约',
      'graph.intro': '每个节点都有唯一所有者、类型化载荷、有限预算、验证器和明确恢复路径。',
      'graph.inspector': '节点检查器',
      'graph.edges': '类型化依赖',
      'graph.edgesTitle': '边',
      'graph.joins': '多输入关卡',
      'graph.joinsTitle': '显式连接',
      'team.eyebrow': '智能体团队指挥',
      'team.title': '确认后按能力分配',
      'team.intro': '战略控制与集成保持串行；可独立拥有的执行和审查可以并行。',
      'team.gate': '确认边界',
      'team.locked': '团队分配已锁定',
      'team.lockedCopy': '请先验证并确认当前任务结构，再编辑智能体团队指挥方案。',
      'format.eyebrow': '呈现模型',
      'format.title': '编辑外观与完整格式',
      'format.intro': '仅修改呈现不会使已确认的图失效。原始 JSON 可编辑所有持久化字段，但不会执行 HTML、CSS 或脚本。'
    }
  };

  const elements = {
    body: document.body,
    headerStatus: document.getElementById('headerStatus'),
    revisionChip: document.getElementById('revisionChip'),
    graphErrorBadge: document.getElementById('graphErrorBadge'),
    teamLockBadge: document.getElementById('teamLockBadge'),
    saveStatus: document.getElementById('saveStatus'),
    saveTime: document.getElementById('saveTime'),
    missionDisplayTitle: document.getElementById('missionDisplayTitle'),
    missionDisplaySummary: document.getElementById('missionDisplaySummary'),
    confirmationSignal: document.getElementById('confirmationSignal'),
    confirmationTitle: document.getElementById('confirmationTitle'),
    confirmationCopy: document.getElementById('confirmationCopy'),
    structureHash: document.getElementById('structureHash'),
    nodeMetric: document.getElementById('nodeMetric'),
    edgeMetric: document.getElementById('edgeMetric'),
    joinMetric: document.getElementById('joinMetric'),
    teamMetric: document.getElementById('teamMetric'),
    missionGraphStage: document.getElementById('missionGraphStage'),
    missionLinearFlow: document.getElementById('missionLinearFlow'),
    graphStage: document.getElementById('graphStage'),
    graphLinearFlow: document.getElementById('graphLinearFlow'),
    graphIdLabel: document.getElementById('graphIdLabel'),
    graphOwnerLabel: document.getElementById('graphOwnerLabel'),
    validationBanner: document.getElementById('validationBanner'),
    validationTitle: document.getElementById('validationTitle'),
    validationSummary: document.getElementById('validationSummary'),
    validationDetails: document.getElementById('validationDetails'),
    toggleValidationDetails: document.getElementById('toggleValidationDetails'),
    nodeInspectorBody: document.getElementById('nodeInspectorBody'),
    inspectorHeading: document.getElementById('inspectorHeading'),
    duplicateNodeButton: document.getElementById('duplicateNodeButton'),
    deleteNodeButton: document.getElementById('deleteNodeButton'),
    edgeTableBody: document.getElementById('edgeTableBody'),
    joinEditor: document.getElementById('joinEditor'),
    teamGate: document.getElementById('teamGate'),
    teamGateTitle: document.getElementById('teamGateTitle'),
    teamGateCopy: document.getElementById('teamGateCopy'),
    teamWorkspace: document.getElementById('teamWorkspace'),
    addWorkstreamButton: document.getElementById('addWorkstreamButton'),
    handoffButton: document.getElementById('handoffButton'),
    handoffCardButton: document.getElementById('handoffCardButton'),
    handoffTitle: document.getElementById('handoffTitle'),
    handoffSummary: document.getElementById('handoffSummary'),
    ipcFields: document.getElementById('ipcFields'),
    integrationOwnerDisplay: document.getElementById('integrationOwnerDisplay'),
    workstreamGrid: document.getElementById('workstreamGrid'),
    rawJsonEditor: document.getElementById('rawJsonEditor'),
    confirmDialog: document.getElementById('confirmDialog'),
    dialogGraphId: document.getElementById('dialogGraphId'),
    dialogValidation: document.getElementById('dialogValidation'),
    dialogHash: document.getElementById('dialogHash'),
    confirmationCheckbox: document.getElementById('confirmationCheckbox'),
    confirmedByInput: document.getElementById('confirmedByInput'),
    finalConfirmButton: document.getElementById('finalConfirmButton'),
    workstreamDialog: document.getElementById('workstreamDialog'),
    workstreamDialogTitle: document.getElementById('workstreamDialogTitle'),
    workstreamEditor: document.getElementById('workstreamEditor'),
    deleteWorkstreamButton: document.getElementById('deleteWorkstreamButton'),
    toast: document.getElementById('toast'),
    liveRegion: document.getElementById('liveRegion')
  };

  let seed;
  let state;
  let validation = { errors: [], warnings: [] };
  let activeView = 'mission';
  let selectedNodeId = null;
  let selectedWorkstreamId = null;
  let saveTimer = null;
  let toastTimer = null;
  let resizeTimer = null;
  let storageAvailable = true;
  let currentLanguage = 'en';

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = String(text);
    }
    return element;
  }

  function createSvgElement(tag) {
    return document.createElementNS(svgNamespace, tag);
  }

  function createOption(value, label, selected) {
    const option = createElement('option', '', label);
    option.value = value;
    option.selected = value === selected;
    return option;
  }

  function getPath(object, path) {
    return path.split('.').reduce((value, part) => (
      value === undefined || value === null ? undefined : value[part]
    ), object);
  }

  function setPath(object, path, value) {
    const parts = path.split('.');
    const final = parts.pop();
    let cursor = object;
    parts.forEach((part) => {
      if (!cursor[part] || typeof cursor[part] !== 'object') {
        cursor[part] = {};
      }
      cursor = cursor[part];
    });
    cursor[final] = value;
  }

  function listFromText(value) {
    const seen = new Set();
    return String(value)
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => {
        if (!item || seen.has(item)) {
          return false;
        }
        seen.add(item);
        return true;
      });
  }

  function uniqueId(prefix, existing) {
    const known = new Set(existing);
    let candidate = prefix;
    let suffix = 2;
    while (known.has(candidate)) {
      candidate = `${prefix}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  function readSeed() {
    try {
      return Model.parseImportedJson(seedElement.value);
    } catch (error) {
      throw new Error(`The embedded blueprint seed is invalid: ${error.message}`);
    }
  }

  function loadDraft() {
    try {
      const saved = window.localStorage.getItem(Model.STORAGE_KEY);
      if (!saved) {
        return Model.deepClone(seed);
      }
      const envelope = Model.parseImportedJson(saved);
      if (envelope.storage_schema_version !== '1.0' || !envelope.state) {
        throw new Error('Unsupported local storage envelope.');
      }
      const result = Model.validateBlueprint(envelope.state);
      if (result.errors.length) {
        throw new Error('Stored draft no longer satisfies the blueprint schema.');
      }
      return Model.deepClone(envelope.state);
    } catch (error) {
      storageAvailable = false;
      queueMicrotask(() => {
        showToast(`Local draft recovery failed; the canonical seed was opened instead. ${error.message}`, true);
      });
      return Model.deepClone(seed);
    }
  }

  function saveDraftNow() {
    clearTimeout(saveTimer);
    state.blueprint.updated_at = new Date().toISOString();
    const envelope = {
      storage_schema_version: '1.0',
      saved_at: state.blueprint.updated_at,
      writer_id: writerId,
      state
    };
    try {
      window.localStorage.setItem(Model.STORAGE_KEY, JSON.stringify(envelope));
      storageAvailable = true;
      elements.saveStatus.textContent = currentLanguage === 'zh-CN' ? '草稿已保存' : 'Draft saved locally';
      elements.saveTime.textContent = new Date(state.blueprint.updated_at).toLocaleTimeString(
        currentLanguage,
        { hour: '2-digit', minute: '2-digit', second: '2-digit' }
      );
    } catch (error) {
      storageAvailable = false;
      elements.saveStatus.textContent = currentLanguage === 'zh-CN' ? '仅内存草稿' : 'Memory-only draft';
      elements.saveTime.textContent = error.message;
      showToast('Local storage is unavailable. Export before closing this page.', true);
    }
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    elements.saveStatus.textContent = currentLanguage === 'zh-CN' ? '正在保存…' : 'Saving…';
    saveTimer = setTimeout(saveDraftNow, 240);
  }

  function showToast(message, isError) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.toggle('error', Boolean(isError));
    elements.toast.classList.add('show');
    elements.liveRegion.textContent = message;
    toastTimer = setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 4200);
  }

  function applyLanguage(language) {
    currentLanguage = translations[language] ? language : 'en';
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const translated = translations[currentLanguage][element.dataset.i18n];
      if (translated) {
        element.textContent = translated;
      }
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      const active = button.dataset.language === currentLanguage;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    try {
      window.localStorage.setItem(languageKey, currentLanguage);
    } catch (_error) {
      storageAvailable = false;
    }
    refreshStatus();
  }

  function resolveInitialLanguage() {
    const query = new URLSearchParams(window.location.search).get('lang');
    let saved = null;
    try {
      saved = window.localStorage.getItem(languageKey);
    } catch (_error) {
      storageAvailable = false;
    }
    const browser = navigator.language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
    return translations[query] ? query : (translations[saved] ? saved : browser);
  }

  function updateDerivedStatus() {
    validation = Model.validateBlueprint(state);
    const confirmed = Model.confirmationIsValid(state);
    if (confirmed) {
      state.blueprint.status = state.team_command?.handoff
        ? 'HANDOFF_PENDING_RUNTIME_VALIDATION'
        : 'STRUCTURE_CONFIRMED';
      state.team_command.status = state.team_command?.handoff
        ? 'PENDING_RUNTIME_VALIDATION'
        : 'ALLOCATION_DRAFT';
    } else {
      state.blueprint.status = validation.errors.length ? 'DRAFT' : 'VALIDATED';
      state.team_command.status = 'LOCKED_UNTIL_CONFIRMATION';
      state.team_command.handoff = null;
    }
    return { confirmed, valid: validation.errors.length === 0 };
  }

  function mutate(scope, renderMode) {
    if (scope === 'structure') {
      const invalidated = Model.invalidateConfirmation(state, 'Mission or graph structure changed.');
      if (invalidated) {
        state.blueprint.revision = Math.max(1, Number(state.blueprint.revision || 1) + 1);
        showToast('Structure changed. The prior confirmation was invalidated.', false);
      }
    }
    if (scope === 'team' && state.team_command?.handoff) {
      state.team_command.handoff = null;
      state.team_command.status = 'ALLOCATION_DRAFT';
    }
    updateDerivedStatus();
    scheduleSave();
    if (renderMode === 'all') {
      renderAll();
    } else if (renderMode === 'graph') {
      renderGraphViews();
      renderNodeInspector();
      renderEdgesTable();
      renderJoins();
      refreshStatus();
    } else if (renderMode === 'team') {
      renderTeam();
      refreshStatus();
    } else {
      refreshOverview();
      refreshStatus();
    }
  }

  function refreshOverview() {
    elements.missionDisplayTitle.textContent = state.blueprint.mission_title;
    elements.missionDisplaySummary.textContent = state.blueprint.summary;
    elements.nodeMetric.textContent = state.nodes.length;
    elements.edgeMetric.textContent = state.edges.length;
    elements.joinMetric.textContent = state.joins.length;
    elements.teamMetric.textContent = state.team_command.workstreams.length;
  }

  function refreshStatus() {
    const { confirmed, valid } = updateDerivedStatus();
    const handoffReady = Boolean(state.team_command?.handoff);
    const hash = Model.structureHash(state);
    elements.body.dataset.status = confirmed ? 'confirmed' : (valid ? 'draft' : 'invalid');
    elements.revisionChip.textContent = `R${state.blueprint.revision || 1}`;
    elements.headerStatus.textContent = handoffReady
      ? (currentLanguage === 'zh-CN' ? '交接包已导出 · 等待运行时验证' : 'Handoff exported · runtime validation required')
      : confirmed
        ? (currentLanguage === 'zh-CN' ? '结构已确认' : 'Structure confirmed')
        : valid
          ? (currentLanguage === 'zh-CN' ? '结构已验证' : 'Structure validated')
          : (currentLanguage === 'zh-CN' ? '草稿需要修正' : 'Draft needs attention');
    elements.structureHash.textContent = `sha256:${hash.slice(0, 20)}…`;
    elements.structureHash.title = hash;

    elements.confirmationSignal.classList.toggle('confirmed', confirmed);
    elements.confirmationTitle.textContent = confirmed
      ? (currentLanguage === 'zh-CN' ? '结构收据有效' : 'Structure receipt is current')
      : (currentLanguage === 'zh-CN' ? '等待结构确认' : 'Awaiting structure confirmation');
    elements.confirmationCopy.textContent = confirmed
      ? (currentLanguage === 'zh-CN'
        ? '当前哈希与人工确认收据匹配。现在可以编辑并准备团队交接。'
        : 'The current hash matches its human receipt. Team allocation and handoff preparation are now available.')
      : (currentLanguage === 'zh-CN'
        ? '团队交接保持锁定，直到当前任务与图结构验证通过并取得匹配的哈希收据。'
        : 'Team handoff stays locked until the current mission and graph pass validation and receive a matching hash receipt.');

    document.querySelectorAll('[data-confirm-trigger], #confirmButton').forEach((button) => {
      button.disabled = !valid;
      if (confirmed) {
        button.textContent = currentLanguage === 'zh-CN' ? '重新确认当前结构' : 'Reconfirm current structure';
      } else {
        const key = button.dataset.i18n || 'action.confirm';
        button.textContent = translations[currentLanguage][key]
          || translations.en[key]
          || button.textContent;
      }
    });

    elements.graphErrorBadge.hidden = validation.errors.length === 0;
    elements.graphErrorBadge.textContent = String(validation.errors.length);
    elements.graphErrorBadge.classList.toggle('error', validation.errors.length > 0);
    elements.teamLockBadge.textContent = confirmed ? (handoffReady ? 'PENDING CHECK' : 'OPEN') : 'LOCKED';
    elements.teamLockBadge.classList.toggle('ready', confirmed);

    elements.validationBanner.classList.toggle('invalid', !valid);
    elements.validationBanner.querySelector('.validation-icon').textContent = valid ? '✓' : '!';
    elements.validationTitle.textContent = valid
      ? (currentLanguage === 'zh-CN' ? '静态契约有效' : 'Static contract valid')
      : `${validation.errors.length} ${currentLanguage === 'zh-CN' ? '项阻塞问题' : 'blocking issue(s)'}`;
    elements.validationSummary.textContent = valid
      ? (currentLanguage === 'zh-CN' ? '所有图与团队契约检查均通过。' : 'All graph and team contract checks pass.')
      : validation.errors[0]?.message || 'Validation failed.';
    renderValidationDetails();

    elements.teamWorkspace.inert = !confirmed;
    elements.addWorkstreamButton.disabled = !confirmed;
    elements.handoffButton.disabled = !confirmed || !valid;
    elements.handoffCardButton.disabled = !confirmed || !valid;
    elements.teamGate.classList.toggle('ready', confirmed);
    elements.teamGate.querySelector('.gate-lock').textContent = confirmed ? '✓' : '03';
    elements.teamGateTitle.textContent = confirmed
      ? (currentLanguage === 'zh-CN' ? '团队分配已开放' : 'Allocation is open')
      : (currentLanguage === 'zh-CN' ? '团队分配已锁定' : 'Allocation is locked');
    elements.teamGateCopy.textContent = confirmed
      ? (currentLanguage === 'zh-CN'
        ? '团队命令绑定到当前结构哈希；编辑任务或图结构会立即重新锁定。'
        : 'The team command is bound to the current structure hash; mission or graph edits relock it immediately.')
      : (currentLanguage === 'zh-CN'
        ? '请先验证并确认当前任务结构，再编辑智能体团队指挥方案。'
        : 'Validate and confirm the current mission structure before editing the Agent Team command.');
    const gateButton = elements.teamGate.querySelector('button');
    gateButton.hidden = confirmed;

    elements.handoffTitle.textContent = handoffReady
      ? (currentLanguage === 'zh-CN' ? '交接包已导出，等待严格验证' : 'Handoff exported, strict validation pending')
      : (currentLanguage === 'zh-CN' ? '可准备，但绝不自动运行' : 'Ready to prepare, never auto-run');
    elements.handoffSummary.textContent = handoffReady
      ? `${currentLanguage === 'zh-CN' ? '已绑定哈希；仍需运行时验证' : 'Bound hash; runtime validation still required'}: ${state.team_command.handoff.contract_sha256.slice(0, 16)}…`
      : (currentLanguage === 'zh-CN'
        ? '浏览器只导出命令包。运行时工具仍负责招募、权限、调度与清理。'
        : 'The browser exports a command pack. Your runtime harness remains responsible for recruiting workers, permissions, scheduling, and cleanup.');

    updatePhases(valid, confirmed, handoffReady);
  }

  function updatePhases(valid, confirmed, handoffReady) {
    const phases = Array.from(document.querySelectorAll('.phase'));
    phases.forEach((phase) => phase.classList.remove('active', 'complete'));
    phases[0].classList.add(valid ? 'complete' : 'active');
    if (valid) {
      phases[1].classList.add('complete');
      phases[2].classList.add(confirmed ? 'complete' : 'active');
    }
    if (confirmed) {
      phases[3].classList.add(handoffReady ? 'complete' : 'active');
    }
  }

  function renderValidationDetails() {
    elements.validationDetails.replaceChildren();
    const issues = [...validation.errors, ...validation.warnings];
    if (!issues.length) {
      const paragraph = createElement(
        'p',
        '',
        currentLanguage === 'zh-CN'
          ? '无阻塞问题或警告。请仍运行仓库的 Python 严格验证器。'
          : 'No blocking issues or warnings. The repository Python strict validator remains the authoritative command check.'
      );
      elements.validationDetails.append(paragraph);
      return;
    }
    const list = createElement('ul');
    issues.forEach((item) => {
      const row = createElement('li');
      const path = createElement('code', '', item.path);
      row.append(path, document.createTextNode(` · ${item.message}`));
      list.append(row);
    });
    elements.validationDetails.append(list);
  }

  function applyPresentation() {
    const presentation = state.blueprint.presentation;
    document.documentElement.dataset.theme = presentation.theme || 'midnight';
    document.documentElement.dataset.accent = presentation.accent || 'cyan';
    document.documentElement.dataset.density = presentation.density || 'comfortable';
    document.documentElement.dataset.showMinimap = presentation.show_minimap === false ? 'false' : 'true';
    document.documentElement.dataset.showEvidence = presentation.show_evidence === false ? 'false' : 'true';
    document.getElementById('guardrailCard').hidden = presentation.show_guardrails === false;
    document.querySelectorAll('[data-presentation]').forEach((control) => {
      const value = presentation[control.dataset.presentation];
      if (control.type === 'checkbox') {
        control.checked = Boolean(value);
      } else if (control.type === 'radio') {
        control.checked = control.value === value;
      } else {
        control.value = value;
      }
    });
  }

  function syncBoundControls() {
    document.querySelectorAll('[data-bind]').forEach((control) => {
      const value = getPath(state, control.dataset.bind);
      if (document.activeElement !== control) {
        control.value = value ?? '';
      }
    });
    document.querySelectorAll('[data-bind-list]').forEach((control) => {
      const value = getPath(state, control.dataset.bindList);
      if (document.activeElement !== control) {
        control.value = Array.isArray(value) ? value.join('\n') : '';
      }
    });
    document.querySelectorAll('[data-team-bind]').forEach((control) => {
      const value = getPath(state.team_command, control.dataset.teamBind);
      if (document.activeElement !== control) {
        control.value = value ?? '';
      }
    });
  }

  function postGateNodeIds() {
    const gateId = state.team_command.activation_gate;
    const adjacency = new Map(state.nodes.map((node) => [node.id, []]));
    state.edges.forEach((edge) => {
      if (adjacency.has(edge.from)) {
        adjacency.get(edge.from).push(edge.to);
      }
    });
    const result = new Set();
    const stack = [...(adjacency.get(gateId) || [])];
    while (stack.length) {
      const id = stack.pop();
      if (result.has(id)) {
        continue;
      }
      result.add(id);
      (adjacency.get(id) || []).forEach((next) => stack.push(next));
    }
    return result;
  }

  function renderGraph(stage, linearTarget, interactive) {
    stage.replaceChildren();
    linearTarget.replaceChildren();
    const levels = Model.topologicalLevels(state);
    const direction = state.blueprint.presentation.direction || 'horizontal';
    const columns = createElement('div', `graph-columns ${direction === 'vertical' ? 'vertical' : ''}`);
    const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));
    const lockedIds = postGateNodeIds();
    const confirmed = Model.confirmationIsValid(state);

    levels.forEach((ids) => {
      const level = createElement('div', 'graph-level');
      ids.forEach((id) => {
        const node = nodeMap.get(id);
        if (!node) {
          return;
        }
        const card = createElement(
          interactive ? 'button' : 'div',
          `graph-node kind-${node.kind}`
        );
        if (interactive) {
          card.type = 'button';
          card.dataset.nodeId = node.id;
          card.classList.toggle('selected', node.id === selectedNodeId);
          card.setAttribute('aria-label', `Edit node ${node.label || node.id}`);
        } else {
          card.tabIndex = 0;
          card.dataset.previewNodeId = node.id;
        }
        if (!confirmed && lockedIds.has(node.id)) {
          card.classList.add('locked');
        }
        const kind = createElement('span', 'graph-node-kind', node.kind);
        const title = createElement('b', '', node.label || node.id);
        const summary = createElement('p', '', node.summary || node.verifier);
        const meta = createElement('div', 'node-meta');
        meta.append(
          createElement('span', '', node.owner),
          createElement('span', '', `${node.max_attempts}× / ${node.timeout_seconds}s`)
        );
        card.append(kind, title, summary, meta);
        level.append(card);
      });
      columns.append(level);
    });

    const svg = createSvgElement('svg');
    svg.classList.add('edge-layer');
    svg.setAttribute('aria-hidden', 'true');
    stage.append(columns, svg);
    requestAnimationFrame(() => drawEdges(stage, columns, svg));

    state.edges.forEach((edge) => {
      const item = createElement('li');
      const source = createElement('b', '', edge.from);
      const target = createElement('span', '', `${edge.to} · ${edge.type}${edge.payload_schema ? ` / ${edge.payload_schema}` : ''}`);
      item.append(source, target);
      linearTarget.append(item);
    });
  }

  function drawEdges(stage, columns, svg) {
    if (!stage.isConnected || !columns.isConnected) {
      return;
    }
    svg.replaceChildren();
    const width = Math.max(columns.scrollWidth, columns.offsetWidth);
    const height = Math.max(columns.scrollHeight, columns.offsetHeight);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const markerId = `arrow-${stage.id}`;
    const defs = createSvgElement('defs');
    const marker = createSvgElement('marker');
    marker.id = markerId;
    marker.setAttribute('viewBox', '0 0 8 8');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '4');
    marker.setAttribute('markerWidth', '5');
    marker.setAttribute('markerHeight', '5');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrow = createSvgElement('path');
    arrow.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
    arrow.setAttribute('fill', 'currentColor');
    marker.append(arrow);
    defs.append(marker);
    svg.append(defs);

    const columnsRect = columns.getBoundingClientRect();
    const direction = state.blueprint.presentation.direction || 'horizontal';
    state.edges.forEach((edge) => {
      const from = columns.querySelector(`[data-node-id="${CSS.escape(edge.from)}"], [data-preview-node-id="${CSS.escape(edge.from)}"]`);
      const to = columns.querySelector(`[data-node-id="${CSS.escape(edge.to)}"], [data-preview-node-id="${CSS.escape(edge.to)}"]`);
      if (!from || !to) {
        return;
      }
      const fromRect = from.getBoundingClientRect();
      const toRect = to.getBoundingClientRect();
      let startX;
      let startY;
      let endX;
      let endY;
      let pathData;
      if (direction === 'vertical') {
        startX = fromRect.left - columnsRect.left + (fromRect.width / 2);
        startY = fromRect.bottom - columnsRect.top;
        endX = toRect.left - columnsRect.left + (toRect.width / 2);
        endY = toRect.top - columnsRect.top;
        const middleY = startY + ((endY - startY) / 2);
        pathData = `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`;
      } else {
        startX = fromRect.right - columnsRect.left;
        startY = fromRect.top - columnsRect.top + (fromRect.height / 2);
        endX = toRect.left - columnsRect.left;
        endY = toRect.top - columnsRect.top + (toRect.height / 2);
        const middleX = startX + ((endX - startX) / 2);
        pathData = `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`;
      }
      const path = createSvgElement('path');
      path.classList.add('edge-path', `type-${edge.type}`);
      path.setAttribute('d', pathData);
      path.setAttribute('marker-end', `url(#${markerId})`);
      svg.append(path);
    });
  }

  function renderGraphViews() {
    renderGraph(elements.missionGraphStage, elements.missionLinearFlow, false);
    renderGraph(elements.graphStage, elements.graphLinearFlow, true);
    elements.graphIdLabel.textContent = state.graph_id;
    elements.graphOwnerLabel.textContent = `Owner · ${state.owner}`;
  }

  function createField(labelText, value, options) {
    const settings = options || {};
    const label = createElement('label', `field ${settings.full ? 'full' : ''}`);
    label.append(createElement('span', '', labelText));
    let control;
    if (settings.type === 'textarea') {
      control = createElement('textarea');
      control.rows = settings.rows || 3;
    } else if (settings.options) {
      control = createElement('select');
      settings.options.forEach((optionValue) => {
        control.append(createOption(optionValue, optionValue, value));
      });
    } else {
      control = createElement('input');
      control.type = settings.type || 'text';
      if (settings.min !== undefined) {
        control.min = String(settings.min);
      }
    }
    control.value = value ?? '';
    if (settings.dataset) {
      Object.entries(settings.dataset).forEach(([key, dataValue]) => {
        control.dataset[key] = dataValue;
      });
    }
    label.append(control);
    return label;
  }

  function renderNodeInspector() {
    elements.nodeInspectorBody.replaceChildren();
    const node = state.nodes.find((item) => item.id === selectedNodeId);
    elements.duplicateNodeButton.disabled = !node;
    elements.deleteNodeButton.disabled = !node || state.nodes.length <= 1;
    if (!node) {
      elements.inspectorHeading.textContent = currentLanguage === 'zh-CN' ? '选择一个节点' : 'Select a node';
      elements.nodeInspectorBody.append(createElement(
        'p',
        'empty-state',
        currentLanguage === 'zh-CN'
          ? '在画布上选择节点，即可编辑完整契约。'
          : 'Choose a node on the canvas to edit its full contract.'
      ));
      return;
    }
    elements.inspectorHeading.textContent = node.label || node.id;
    const identity = createElement('div', 'inspector-section');
    identity.append(
      createField('ID', node.id, { full: true, dataset: { nodeField: 'id' } }),
      createField('Label', node.label || '', { full: true, dataset: { nodeField: 'label' } }),
      createField('Kind', node.kind, {
        options: Model.VALID_NODE_KINDS,
        dataset: { nodeField: 'kind' }
      }),
      createField('Owner', node.owner, { dataset: { nodeField: 'owner' } }),
      createField('Summary', node.summary || '', {
        type: 'textarea',
        rows: 2,
        full: true,
        dataset: { nodeField: 'summary' }
      })
    );
    const payloads = createElement('div', 'inspector-section');
    [
      ['Inputs · one per line', 'inputs'],
      ['Outputs · one per line', 'outputs'],
      ['Reads · one per line', 'reads'],
      ['Writes · one per line', 'writes']
    ].forEach(([label, field]) => {
      payloads.append(createField(label, (node[field] || []).join('\n'), {
        type: 'textarea',
        rows: 3,
        full: true,
        dataset: { nodeField: field, list: 'true' }
      }));
    });
    const evidence = createElement('div', 'inspector-section');
    evidence.append(
      createField('Verifier', node.verifier, {
        type: 'textarea',
        rows: 3,
        full: true,
        dataset: { nodeField: 'verifier' }
      }),
      createField('Timeout · seconds', node.timeout_seconds, {
        type: 'number',
        min: 1,
        dataset: { nodeField: 'timeout_seconds', number: 'true' }
      }),
      createField('Max attempts', node.max_attempts, {
        type: 'number',
        min: 1,
        dataset: { nodeField: 'max_attempts', number: 'true' }
      }),
      createField('Tool calls', node.tool_calls, {
        type: 'number',
        min: 1,
        dataset: { nodeField: 'tool_calls', number: 'true' }
      }),
      createField('Effect class', node.effect_class, {
        options: Model.VALID_EFFECT_CLASSES,
        dataset: { nodeField: 'effect_class' }
      }),
      createField('Idempotency', node.idempotency, {
        type: 'textarea',
        rows: 2,
        full: true,
        dataset: { nodeField: 'idempotency' }
      }),
      createField('Compensation / recovery', node.compensation || '', {
        type: 'textarea',
        rows: 2,
        full: true,
        dataset: { nodeField: 'compensation' }
      })
    );
    elements.nodeInspectorBody.append(identity, payloads, evidence);
  }

  function renderEdgesTable() {
    elements.edgeTableBody.replaceChildren();
    const nodeIds = state.nodes.map((node) => node.id);
    state.edges.forEach((edge, index) => {
      const row = createElement('tr');
      const values = [
        ['from', nodeIds],
        ['to', nodeIds],
        ['type', Model.VALID_EDGE_TYPES],
        ['payload_schema', null],
        ['condition', null]
      ];
      values.forEach(([field, options]) => {
        const cell = createElement('td');
        let control;
        if (options) {
          control = createElement('select');
          options.forEach((value) => control.append(createOption(value, value, edge[field])));
        } else {
          control = createElement('input');
          control.value = edge[field] || '';
        }
        control.dataset.edgeIndex = String(index);
        control.dataset.edgeField = field;
        control.setAttribute('aria-label', `Edge ${index + 1} ${field}`);
        cell.append(control);
        row.append(cell);
      });
      const actionCell = createElement('td');
      const remove = createElement('button', 'table-action', '×');
      remove.type = 'button';
      remove.dataset.removeEdge = String(index);
      remove.setAttribute('aria-label', `Remove edge ${edge.from} to ${edge.to}`);
      actionCell.append(remove);
      row.append(actionCell);
      elements.edgeTableBody.append(row);
    });
  }

  function renderJoins() {
    elements.joinEditor.replaceChildren();
    const nodeIds = state.nodes.map((node) => node.id);
    state.joins.forEach((join, index) => {
      const row = createElement('div', 'join-row');
      row.append(
        createField('Join ID', join.id, { dataset: { joinIndex: String(index), joinField: 'id' } }),
        createField('Target', join.target, {
          options: nodeIds,
          dataset: { joinIndex: String(index), joinField: 'target' }
        }),
        createField('Mode', join.mode, {
          options: Model.VALID_JOIN_MODES,
          dataset: { joinIndex: String(index), joinField: 'mode' }
        }),
        createField('Inputs · comma separated', (join.inputs || []).join(', '), {
          dataset: { joinIndex: String(index), joinField: 'inputs', list: 'true' }
        }),
        createField('Verifier', join.verifier, {
          dataset: { joinIndex: String(index), joinField: 'verifier' }
        }),
      );
      const remove = createElement('button', 'table-action', '×');
      remove.type = 'button';
      remove.dataset.removeJoin = String(index);
      remove.setAttribute('aria-label', `Remove join ${join.id}`);
      row.append(remove);
      elements.joinEditor.append(row);
    });
    if (!state.joins.length) {
      elements.joinEditor.append(createElement('p', 'empty-state', 'No joins declared. Multi-input nodes require one.'));
    }
  }

  function renderTeam() {
    elements.ipcFields.replaceChildren();
    state.team_command.ipc_schema.forEach((field) => {
      elements.ipcFields.append(createElement('code', '', field));
    });
    elements.integrationOwnerDisplay.textContent = state.team_command.integration_owner;
    elements.workstreamGrid.replaceChildren();
    state.team_command.workstreams.forEach((stream, index) => {
      const card = createElement('button', 'workstream-card');
      card.type = 'button';
      card.dataset.workstreamId = stream.id;
      card.append(
        createElement('span', 'workstream-number', String(index + 1).padStart(2, '0')),
        createElement('h3', '', stream.name),
        createElement('p', '', stream.capability)
      );
      const territory = createElement('div', 'territory-list');
      (stream.territory || []).slice(0, 4).forEach((path) => {
        territory.append(createElement('code', '', path));
      });
      if ((stream.territory || []).length > 4) {
        territory.append(createElement('code', '', `+${stream.territory.length - 4}`));
      }
      const footer = createElement('div', 'stream-footer');
      const owner = createElement('div');
      owner.append(createElement('small', '', 'Owner'), createElement('b', '', stream.owner));
      const budget = createElement(
        'span',
        'stream-budget',
        `${stream.budget.max_attempts}× · ${stream.budget.tool_calls} calls`
      );
      footer.append(owner, budget);
      card.append(territory, footer);
      elements.workstreamGrid.append(card);
    });
  }

  function renderRawJson() {
    if (document.activeElement !== elements.rawJsonEditor) {
      elements.rawJsonEditor.value = JSON.stringify(state, null, 2);
    }
  }

  function renderAll() {
    applyPresentation();
    syncBoundControls();
    refreshOverview();
    renderGraphViews();
    renderNodeInspector();
    renderEdgesTable();
    renderJoins();
    renderTeam();
    renderRawJson();
    refreshStatus();
  }

  function setActiveView(view, updateHash) {
    if (!document.querySelector(`[data-view-panel="${view}"]`)) {
      return;
    }
    activeView = view;
    document.querySelectorAll('[data-view-panel]').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.viewPanel === view);
    });
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.view === view);
      if (button.dataset.view === view) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });
    if (view === 'format') {
      renderRawJson();
    }
    if (view === 'graph') {
      requestAnimationFrame(renderGraphViews);
    }
    if (updateHash) {
      window.history.replaceState(null, '', `#${view}`);
    }
    document.getElementById('workspace').focus({ preventScroll: true });
  }

  function openConfirmationDialog() {
    updateDerivedStatus();
    if (validation.errors.length) {
      setActiveView('graph', true);
      elements.validationBanner.focus();
      showToast('Resolve the blocking contract issues before confirmation.', true);
      return;
    }
    elements.dialogGraphId.textContent = state.graph_id;
    elements.dialogValidation.textContent = `PASS · ${state.nodes.length} nodes / ${state.edges.length} edges`;
    elements.dialogHash.textContent = Model.structureHash(state);
    elements.confirmationCheckbox.checked = false;
    elements.finalConfirmButton.disabled = true;
    if (typeof elements.confirmDialog.showModal === 'function') {
      elements.confirmDialog.showModal();
    } else {
      elements.confirmDialog.setAttribute('open', '');
    }
  }

  function confirmStructure() {
    if (!elements.confirmationCheckbox.checked) {
      return;
    }
    try {
      state.blueprint.confirmation = Model.createConfirmation(
        state,
        elements.confirmedByInput.value
      );
      state.blueprint.status = 'STRUCTURE_CONFIRMED';
      state.team_command.status = 'ALLOCATION_DRAFT';
      state.team_command.handoff = null;
      state.blueprint.events.push({
        type: 'STRUCTURE_CONFIRMED',
        at: state.blueprint.confirmation.confirmed_at,
        detail: state.blueprint.confirmation.contract_sha256
      });
      elements.confirmDialog.close();
      saveDraftNow();
      renderAll();
      setActiveView('team', true);
      showToast('Structure confirmed. Agent Team allocation is now open.', false);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function downloadJson(filename, value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const blob = new Blob([`${text}\n`], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportBlueprint() {
    const filename = `${Model.safeFilename(state.graph_id, 'mission-blueprint')}.json`;
    downloadJson(filename, state);
    showToast('Complete blueprint JSON exported.', false);
  }

  function applyImportedCandidate(candidate, sourceLabel) {
    const prepared = Model.prepareImportedBlueprint(candidate);
    const result = Model.validateBlueprint(prepared);
    if (result.errors.length) {
      throw new Error(`${sourceLabel} rejected: ${result.errors[0].message}`);
    }
    state = prepared;
    selectedNodeId = state.nodes[0]?.id || null;
    selectedWorkstreamId = null;
    saveDraftNow();
    renderAll();
    setActiveView('mission', true);
    showToast(`${sourceLabel} applied. Local confirmation is required.`, false);
  }

  async function importFile(file) {
    if (!file) {
      return;
    }
    if (file.size > Model.MAX_IMPORT_BYTES) {
      throw new Error('Import is larger than 1 MiB.');
    }
    const text = await file.text();
    const candidate = Model.parseImportedJson(text);
    applyImportedCandidate(candidate, file.name);
  }

  function applyRawJson() {
    try {
      const candidate = Model.parseImportedJson(elements.rawJsonEditor.value);
      applyImportedCandidate(candidate, 'Raw JSON');
    } catch (error) {
      showToast(error.message, true);
      elements.rawJsonEditor.focus();
    }
  }

  function prepareHandoff() {
    try {
      const handoff = Model.createHandoff(state);
      state.team_command.handoff = handoff;
      state.team_command.status = 'PENDING_RUNTIME_VALIDATION';
      state.blueprint.status = 'HANDOFF_PENDING_RUNTIME_VALIDATION';
      state.blueprint.events.push({
        type: 'HANDOFF_PACKAGE_EXPORTED',
        at: handoff.created_at,
        detail: handoff.handoff_id
      });
      saveDraftNow();
      refreshStatus();
      downloadJson(`${Model.safeFilename(handoff.handoff_id, 'agent-team-handoff')}.json`, handoff);
      showToast('Handoff pack downloaded. Strict runtime validation is still required; no agents were started.', false);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function addNode() {
    const id = uniqueId('new-node', state.nodes.map((node) => node.id));
    state.nodes.push({
      id,
      kind: 'deterministic',
      owner: state.owner || 'integration-owner',
      inputs: [],
      outputs: [`${id.replace(/-/g, '_')}_result`],
      reads: [],
      writes: [],
      verifier: 'Declare an objective verifier.',
      timeout_seconds: 120,
      max_attempts: 1,
      tool_calls: 2,
      effect_class: 'read-only',
      idempotency: 'Declare duplicate-delivery behavior.',
      compensation: '',
      label: 'New node',
      summary: 'Connect this bounded node to the static graph.'
    });
    selectedNodeId = id;
    mutate('structure', 'graph');
  }

  function duplicateSelectedNode() {
    const source = state.nodes.find((node) => node.id === selectedNodeId);
    if (!source) {
      return;
    }
    const copy = Model.deepClone(source);
    copy.id = uniqueId(`${source.id}-copy`, state.nodes.map((node) => node.id));
    copy.label = `${source.label || source.id} copy`;
    copy.writes = [];
    state.nodes.push(copy);
    selectedNodeId = copy.id;
    mutate('structure', 'graph');
  }

  function deleteSelectedNode() {
    const node = state.nodes.find((item) => item.id === selectedNodeId);
    if (!node || state.nodes.length <= 1) {
      return;
    }
    if (!window.confirm(`Delete node "${node.id}" and its connected edges?`)) {
      return;
    }
    state.nodes = state.nodes.filter((item) => item.id !== node.id);
    state.edges = state.edges.filter((edge) => (
      edge.from !== node.id && edge.to !== node.id && edge.failure_route !== node.id
    ));
    state.joins = state.joins
      .filter((join) => join.target !== node.id)
      .map((join) => ({ ...join, inputs: join.inputs.filter((id) => id !== node.id) }))
      .filter((join) => join.inputs.length >= 2);
    state.entry_nodes = state.entry_nodes.filter((id) => id !== node.id);
    state.terminal_nodes = state.terminal_nodes.filter((id) => id !== node.id);
    if (!state.entry_nodes.length) {
      state.entry_nodes = [state.nodes[0].id];
    }
    if (!state.terminal_nodes.length) {
      state.terminal_nodes = [state.nodes[state.nodes.length - 1].id];
    }
    if (state.team_command.activation_gate === node.id) {
      state.team_command.activation_gate = state.nodes.find((item) => item.kind === 'human-gate')?.id || '';
    }
    selectedNodeId = state.nodes[0]?.id || null;
    mutate('structure', 'graph');
  }

  function renameNode(oldId, newId) {
    state.edges.forEach((edge) => {
      if (edge.from === oldId) edge.from = newId;
      if (edge.to === oldId) edge.to = newId;
      if (edge.failure_route === oldId) edge.failure_route = newId;
    });
    state.joins.forEach((join) => {
      if (join.target === oldId) join.target = newId;
      join.inputs = join.inputs.map((id) => (id === oldId ? newId : id));
    });
    state.entry_nodes = state.entry_nodes.map((id) => (id === oldId ? newId : id));
    state.terminal_nodes = state.terminal_nodes.map((id) => (id === oldId ? newId : id));
    if (state.team_command.activation_gate === oldId) {
      state.team_command.activation_gate = newId;
    }
  }

  function addEdge() {
    if (state.nodes.length < 2) {
      showToast('Add at least two nodes before adding an edge.', true);
      return;
    }
    const source = state.nodes[0];
    const target = state.nodes.find((node) => node.id !== source.id);
    const payload = source.outputs[0] || 'payload';
    state.edges.push({
      from: source.id,
      to: target.id,
      type: 'data',
      payload_schema: payload,
      condition: 'verified',
      failure_route: ''
    });
    mutate('structure', 'graph');
  }

  function addJoin() {
    const incoming = new Map(state.nodes.map((node) => [node.id, []]));
    state.edges.forEach((edge) => {
      if (incoming.has(edge.to) && ['data', 'control', 'verification'].includes(edge.type)) {
        incoming.get(edge.to).push(edge.from);
      }
    });
    const candidate = state.nodes.find((node) => (
      incoming.get(node.id).length > 1
      && !state.joins.some((join) => join.target === node.id)
    ));
    const target = candidate || state.nodes[state.nodes.length - 1];
    const inputs = incoming.get(target.id) || [];
    state.joins.push({
      id: uniqueId('new-join', state.joins.map((join) => join.id)),
      target: target.id,
      mode: 'all',
      inputs,
      verifier: 'All declared input receipts are fresh and valid.',
      quorum: null
    });
    mutate('structure', 'graph');
  }

  function addWorkstream() {
    if (!Model.confirmationIsValid(state)) {
      openConfirmationDialog();
      return;
    }
    const ids = state.team_command.workstreams.map((stream) => stream.id);
    const id = uniqueId('new-workstream', ids);
    const stream = {
      id,
      name: 'New bounded workstream',
      capability: 'Describe the capability required; do not bind a model vendor.',
      owner: id,
      territory: [`.agent-state/team/artifacts/${id}.json`],
      inputs: ['structure_approval_receipt'],
      output_artifact: `.agent-state/team/artifacts/${id}.json`,
      dependencies: [],
      verifier: 'Declare an objective workstream verifier.',
      budget: {
        max_attempts: 2,
        tool_calls: 6,
        timeout_seconds: 600
      },
      stop_condition: 'Verifier passes or the bounded attempt budget is exhausted.'
    };
    state.team_command.workstreams.push(stream);
    state.team_command.integration.order.push(id);
    selectedWorkstreamId = id;
    mutate('team', 'team');
    openWorkstreamDialog(id);
  }

  function renderWorkstreamEditor(stream) {
    elements.workstreamEditor.replaceChildren();
    const definitions = [
      ['ID', 'id', {}],
      ['Name', 'name', {}],
      ['Capability', 'capability', { full: true, type: 'textarea', rows: 2 }],
      ['Owner', 'owner', {}],
      ['Output artifact', 'output_artifact', {}],
      ['Territory · one per line', 'territory', { full: true, type: 'textarea', rows: 3, list: true }],
      ['Inputs · one per line', 'inputs', { full: true, type: 'textarea', rows: 3, list: true }],
      ['Dependencies · one per line', 'dependencies', { full: true, type: 'textarea', rows: 2, list: true }],
      ['Verifier', 'verifier', { full: true, type: 'textarea', rows: 3 }],
      ['Max attempts', 'budget.max_attempts', { type: 'number', number: true }],
      ['Tool calls', 'budget.tool_calls', { type: 'number', number: true }],
      ['Timeout · seconds', 'budget.timeout_seconds', { type: 'number', number: true }],
      ['Stop condition', 'stop_condition', { full: true, type: 'textarea', rows: 3 }]
    ];
    definitions.forEach(([label, path, settings]) => {
      let value = getPath(stream, path);
      if (settings.list) {
        value = Array.isArray(value) ? value.join('\n') : '';
      }
      const field = createField(label, value, {
        ...settings,
        dataset: {
          streamField: path,
          list: settings.list ? 'true' : '',
          number: settings.number ? 'true' : ''
        }
      });
      elements.workstreamEditor.append(field);
    });
  }

  function openWorkstreamDialog(id) {
    const stream = state.team_command.workstreams.find((item) => item.id === id);
    if (!stream || !Model.confirmationIsValid(state)) {
      return;
    }
    selectedWorkstreamId = id;
    elements.workstreamDialogTitle.textContent = stream.name;
    renderWorkstreamEditor(stream);
    if (typeof elements.workstreamDialog.showModal === 'function') {
      elements.workstreamDialog.showModal();
    } else {
      elements.workstreamDialog.setAttribute('open', '');
    }
  }

  function deleteSelectedWorkstream() {
    const streams = state.team_command.workstreams;
    const stream = streams.find((item) => item.id === selectedWorkstreamId);
    if (!stream || streams.length <= 2) {
      showToast('Keep at least two independently ownable workstreams.', true);
      return;
    }
    if (!window.confirm(`Delete workstream "${stream.id}"?`)) {
      return;
    }
    state.team_command.workstreams = streams
      .filter((item) => item.id !== stream.id)
      .map((item) => ({
        ...item,
        dependencies: item.dependencies.filter((id) => id !== stream.id)
      }));
    state.team_command.integration.order = state.team_command.integration.order
      .filter((id) => id !== stream.id);
    elements.workstreamDialog.close();
    selectedWorkstreamId = null;
    mutate('team', 'team');
  }

  function resetDraft() {
    if (!window.confirm('Reset the entire local draft to the canonical blueprint? Export first if you need a recovery copy.')) {
      return;
    }
    state = Model.deepClone(seed);
    selectedNodeId = state.nodes[0]?.id || null;
    selectedWorkstreamId = null;
    try {
      window.localStorage.removeItem(Model.STORAGE_KEY);
    } catch (_error) {
      storageAvailable = false;
    }
    saveDraftNow();
    renderAll();
    setActiveView('mission', true);
    showToast('Local draft reset to the canonical blueprint.', false);
  }

  function handleBoundInput(event) {
    const control = event.target.closest('[data-bind], [data-bind-list]');
    if (!control) {
      return;
    }
    const path = control.dataset.bind || control.dataset.bindList;
    const value = control.dataset.bindList ? listFromText(control.value) : control.value;
    setPath(state, path, value);
    mutate(control.dataset.scope || 'structure', 'status');
  }

  function handleTeamInput(event) {
    const control = event.target.closest('[data-team-bind]');
    if (!control) {
      return;
    }
    setPath(state.team_command, control.dataset.teamBind, control.value);
    mutate('team', 'status');
    elements.integrationOwnerDisplay.textContent = state.team_command.integration_owner;
  }

  function handlePresentationChange(event) {
    const control = event.target.closest('[data-presentation]');
    if (!control) {
      return;
    }
    const field = control.dataset.presentation;
    const value = control.type === 'checkbox' ? control.checked : control.value;
    state.blueprint.presentation[field] = value;
    applyPresentation();
    mutate('presentation', field === 'direction' ? 'all' : 'status');
  }

  function handleNodeInspectorChange(event) {
    const control = event.target.closest('[data-node-field]');
    if (!control) {
      return;
    }
    const node = state.nodes.find((item) => item.id === selectedNodeId);
    if (!node) {
      return;
    }
    const field = control.dataset.nodeField;
    let value = control.value;
    if (control.dataset.list === 'true') {
      value = listFromText(value);
    } else if (control.dataset.number === 'true') {
      value = Number.parseInt(value, 10);
    }
    if (field === 'id' && value !== node.id) {
      const oldId = node.id;
      node.id = value;
      renameNode(oldId, value);
      selectedNodeId = value;
    } else {
      node[field] = value;
    }
    mutate('structure', 'graph');
  }

  function handleEdgeChange(event) {
    const control = event.target.closest('[data-edge-index]');
    if (!control) {
      return;
    }
    const edge = state.edges[Number(control.dataset.edgeIndex)];
    if (!edge) {
      return;
    }
    edge[control.dataset.edgeField] = control.value;
    mutate('structure', 'graph');
  }

  function handleJoinChange(event) {
    const control = event.target.closest('[data-join-index]');
    if (!control) {
      return;
    }
    const join = state.joins[Number(control.dataset.joinIndex)];
    if (!join) {
      return;
    }
    const field = control.dataset.joinField;
    join[field] = control.dataset.list === 'true' ? listFromText(control.value) : control.value;
    if (field === 'mode' && join.mode !== 'quorum') {
      join.quorum = null;
    }
    mutate('structure', 'graph');
  }

  function handleWorkstreamChange(event) {
    const control = event.target.closest('[data-stream-field]');
    if (!control) {
      return;
    }
    const stream = state.team_command.workstreams.find((item) => item.id === selectedWorkstreamId);
    if (!stream) {
      return;
    }
    const path = control.dataset.streamField;
    let value = control.value;
    if (control.dataset.list === 'true') {
      value = listFromText(value);
    } else if (control.dataset.number === 'true') {
      value = Number.parseInt(value, 10);
    }
    if (path === 'id' && value !== stream.id) {
      const oldId = stream.id;
      state.team_command.workstreams.forEach((item) => {
        item.dependencies = item.dependencies.map((id) => (id === oldId ? value : id));
      });
      state.team_command.integration.order = state.team_command.integration.order
        .map((id) => (id === oldId ? value : id));
      stream.id = value;
      selectedWorkstreamId = value;
    } else {
      setPath(stream, path, value);
    }
    elements.workstreamDialogTitle.textContent = stream.name;
    mutate('team', 'status');
  }

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => setActiveView(button.dataset.view, true));
    });
    document.querySelectorAll('[data-view-target]').forEach((button) => {
      button.addEventListener('click', () => setActiveView(button.dataset.viewTarget, true));
    });
    document.querySelectorAll('[data-view-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        setActiveView(link.dataset.viewLink, true);
      });
    });
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.addEventListener('click', () => applyLanguage(button.dataset.language));
    });
    document.querySelectorAll('[data-confirm-trigger], #confirmButton').forEach((button) => {
      button.addEventListener('click', openConfirmationDialog);
    });

    document.getElementById('importButton').addEventListener('click', () => {
      document.getElementById('importInput').click();
    });
    document.getElementById('importInput').addEventListener('change', async (event) => {
      try {
        await importFile(event.target.files?.[0]);
      } catch (error) {
        showToast(error.message, true);
      } finally {
        event.target.value = '';
      }
    });
    document.getElementById('exportButton').addEventListener('click', exportBlueprint);
    document.getElementById('validateButton').addEventListener('click', () => {
      updateDerivedStatus();
      refreshStatus();
      elements.validationBanner.focus();
      showToast(
        validation.errors.length
          ? `${validation.errors.length} blocking contract issue(s).`
          : 'Client static checks pass. Run the repository strict validator for command evidence.',
        validation.errors.length > 0
      );
    });
    document.getElementById('addNodeButton').addEventListener('click', addNode);
    document.getElementById('addEdgeButton').addEventListener('click', addEdge);
    document.getElementById('addJoinButton').addEventListener('click', addJoin);
    elements.duplicateNodeButton.addEventListener('click', duplicateSelectedNode);
    elements.deleteNodeButton.addEventListener('click', deleteSelectedNode);
    elements.addWorkstreamButton.addEventListener('click', addWorkstream);
    elements.handoffButton.addEventListener('click', prepareHandoff);
    elements.handoffCardButton.addEventListener('click', prepareHandoff);
    document.getElementById('refreshJsonButton').addEventListener('click', renderRawJson);
    document.getElementById('applyJsonButton').addEventListener('click', applyRawJson);
    document.getElementById('resetButton').addEventListener('click', resetDraft);

    elements.confirmationCheckbox.addEventListener('change', () => {
      elements.finalConfirmButton.disabled = !elements.confirmationCheckbox.checked;
    });
    elements.finalConfirmButton.addEventListener('click', confirmStructure);
    elements.deleteWorkstreamButton.addEventListener('click', deleteSelectedWorkstream);

    elements.toggleValidationDetails.addEventListener('click', () => {
      const expanded = elements.toggleValidationDetails.getAttribute('aria-expanded') === 'true';
      elements.toggleValidationDetails.setAttribute('aria-expanded', String(!expanded));
      elements.validationDetails.hidden = expanded;
    });

    document.addEventListener('input', handleBoundInput);
    document.addEventListener('input', handleTeamInput);
    document.addEventListener('change', handlePresentationChange);
    elements.nodeInspectorBody.addEventListener('change', handleNodeInspectorChange);
    elements.edgeTableBody.addEventListener('change', handleEdgeChange);
    elements.joinEditor.addEventListener('change', handleJoinChange);
    elements.workstreamEditor.addEventListener('change', handleWorkstreamChange);

    elements.graphStage.addEventListener('click', (event) => {
      const card = event.target.closest('[data-node-id]');
      if (!card) {
        return;
      }
      selectedNodeId = card.dataset.nodeId;
      renderGraphViews();
      renderNodeInspector();
    });
    elements.missionGraphStage.addEventListener('click', (event) => {
      const card = event.target.closest('[data-preview-node-id]');
      if (!card) {
        return;
      }
      selectedNodeId = card.dataset.previewNodeId;
      setActiveView('graph', true);
      renderGraphViews();
      renderNodeInspector();
    });
    elements.edgeTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-edge]');
      if (!button) {
        return;
      }
      state.edges.splice(Number(button.dataset.removeEdge), 1);
      mutate('structure', 'graph');
    });
    elements.joinEditor.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-join]');
      if (!button) {
        return;
      }
      state.joins.splice(Number(button.dataset.removeJoin), 1);
      mutate('structure', 'graph');
    });
    elements.workstreamGrid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-workstream-id]');
      if (card) {
        openWorkstreamDialog(card.dataset.workstreamId);
      }
    });

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderGraphViews, 120);
    }, { passive: true });
    window.addEventListener('hashchange', () => {
      const target = window.location.hash.replace('#', '');
      if (target) {
        setActiveView(target, false);
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== Model.STORAGE_KEY || !event.newValue) {
        return;
      }
      try {
        const envelope = JSON.parse(event.newValue);
        if (envelope.writer_id !== writerId) {
          showToast('Another tab saved a blueprint draft. Export this tab, then reload to choose the newer copy.', true);
        }
      } catch (_error) {
        showToast('Another tab wrote an unreadable draft. This tab was not changed.', true);
      }
    });
  }

  try {
    seed = readSeed();
    state = loadDraft();
    selectedNodeId = state.nodes[0]?.id || null;
    updateDerivedStatus();
    bindEvents();
    applyLanguage(resolveInitialLanguage());
    renderAll();
    const initialView = window.location.hash.replace('#', '') || 'mission';
    setActiveView(initialView, false);
    if (!storageAvailable) {
      elements.saveStatus.textContent = 'Memory-only draft';
    }
  } catch (error) {
    document.body.replaceChildren();
    const failure = createElement('main', 'fatal-error');
    failure.append(
      createElement('h1', '', 'Blueprint failed to initialize'),
      createElement('p', '', error.message)
    );
    document.body.append(failure);
    console.error(error);
  }
})();
