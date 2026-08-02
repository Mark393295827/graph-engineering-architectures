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
      'action.editGraph': 'Start building',
      'action.reviewConfirm': 'Review & confirm',
      'action.confirmStructure': 'Confirm this structure',
      'action.validate': 'Validate now',
      'action.addNode': '+ Add node',
      'action.addEdge': '+ Add edge',
      'action.addJoin': '+ Add join',
      'action.addStream': 'Generated from Work blocks',
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
      'phase.runtime': 'Runtime gates',
      'phase.runtimeHint': 'Harness validates & probes',
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
      'intake.eyebrow': 'Task intake / dynamic blueprint',
      'intake.title': 'Describe the task before choosing the graph',
      'intake.intro': 'Choose a bounded template, name the media references, and preview the finite Graph that will be confirmed before any runtime allocation.',
      'intake.taskClass': 'Task class',
      'intake.template': 'Blueprint template',
      'intake.assets': 'Bounded asset references',
      'intake.assetHint': 'one `artifact:` or `sha256:` reference per line',
      'intake.outputs': 'Requested deliverables',
      'intake.outputHint': 'one output ID per line',
      'intake.policy': 'Policy profile',
      'intake.maxNodes': 'Maximum compiled nodes',
      'intake.previewKicker': 'Compiler preview',
      'intake.assetCount': 'asset refs',
      'intake.deliverableCount': 'deliverables',
      'intake.nodeBudget': 'node ceiling',
      'intake.compile': 'Compile task preview',
      'intake.disclaimer': 'Preview only · no upload, provider call, agent launch, or media execution occurs in this static page.',
      'admission.eyebrow': 'Graph admission / shape before fan-out',
      'admission.title': 'Measure dependency width before allocating agents',
      'admission.intro': 'Partition from the real dependency graph, isolate structural hubs, and treat the critical path as a floor. Coupled work stays serial when parallelism cannot pay back its coordination tax.',
      'admission.source': 'Dependency evidence',
      'admission.sourceHint': 'Static analysis is preferred; folder and file lists are not dependency evidence.',
      'admission.partition': 'Partition strategy',
      'admission.coupling': 'Coupling profile',
      'admission.hubs': 'Structural hub IDs',
      'admission.hubHint': 'one node ID per line · isolate before fan-out',
      'admission.criticalPath': 'Critical-path floor (seconds)',
      'admission.fanout': 'Fan-out ceiling',
      'admission.rateLimit': 'Rate limit (requests/sec)',
      'admission.workerRate': 'Worker rate (requests/sec)',
      'admission.taxCeiling': 'Coordination-tax ceiling (%)',
      'admission.plannerGate': 'Planner preflight',
      'admission.previewKicker': 'Deterministic admission gate',
      'admission.criticalMetric': 'critical-path floor',
      'admission.fanoutMetric': 'effective fan-out',
      'admission.rateMetric': 'projected requests/sec',
      'admission.hubMetric': 'hub candidates',
      'admission.preview': 'Evaluate admission preview',
      'admission.disclaimer': 'Preview only · the gate reads the declared Graph and emits no scheduler command or provider call.',
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
      'graph.eyebrow': 'Beginner blocks / canonical static DAG',
      'graph.title': 'Build the mission with safe blocks',
      'graph.intro': 'Start with plain-language blocks. Each safe action compiles into typed nodes, finite budgets, evidence, and recovery.',
      'graph.inspector': 'Block settings',
      'builder.modeBlocks': 'Blocks',
      'builder.modeAdvanced': 'Advanced',
      'builder.eyebrow': 'Beginner / Lego mode',
      'builder.title': 'Build the mission one safe block at a time',
      'builder.intro': 'Choose a ready-made block. The editor connects it, adjusts its finite budget, checks the whole graph, and commits only when every rule still passes.',
      'builder.undo': '↶ Undo',
      'builder.redo': '↷ Redo',
      'builder.goal': 'Name the goal',
      'builder.goalHint': 'Write the outcome and success checks.',
      'builder.arrange': 'Arrange blocks',
      'builder.arrangeHint': 'Add only the steps you can explain.',
      'builder.check': 'Check the plan',
      'builder.checkHint': 'Fix any highlighted block.',
      'builder.allocate': 'Confirm & allocate',
      'builder.allocateHint': 'Unlock team setup with a fresh receipt.',
      'builder.recipes': 'Use a starter recipe',
      'builder.recipesHint': 'Add a small, reversible pattern to the current valid blueprint.',
      'builder.clearRecipe': 'Clarify, then check',
      'builder.clearRecipeHint': 'Unknown → evidence check',
      'builder.approvalRecipe': 'Add an approval path',
      'builder.approvalRecipeHint': 'Human decision → final check',
      'builder.loopRecipe': 'Improve safely',
      'builder.loopRecipeHint': 'Finite repeat → final check',
      'builder.safeBlocks': '2 safe blocks',
      'builder.oneBlock': 'Or add one block',
      'builder.oneBlockHint': 'Each button shows the budget it will add before you choose it.',
      'builder.clarify': 'Clarify one unknown',
      'builder.approval': 'Ask for approval',
      'builder.loop': 'Improve with a limit',
      'builder.finalCheck': 'Check the result',
      'builder.clarifyCost': 'Planning · +3 min · 3 tools',
      'builder.approvalCost': 'Human gate · +5 min',
      'builder.loopCost': 'Loop · 2 attempts maximum',
      'builder.finalCheckCost': 'Evidence · +3 min · 3 tools',
      'builder.workspace': 'Your connected mission',
      'builder.workspaceHint': 'Blocks on the same row may run independently. A merge block waits for every declared input.',
      'builder.checkBlocks': 'Check my blocks',
      'builder.ready': 'Ready to build',
      'builder.readyHint': 'The canonical blueprint currently passes browser checks.',
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
      'action.editGraph': '开始搭建',
      'action.reviewConfirm': '审查并确认',
      'action.confirmStructure': '确认当前结构',
      'action.validate': '立即验证',
      'action.addNode': '+ 添加节点',
      'action.addEdge': '+ 添加边',
      'action.addJoin': '+ 添加连接',
      'action.addStream': '由工作块生成',
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
      'phase.runtime': '运行时关卡',
      'phase.runtimeHint': 'Harness 验证并探测',
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
      'intake.eyebrow': '任务输入 / 动态蓝图',
      'intake.title': '先描述任务，再选择依赖图',
      'intake.intro': '选择有界模板，填写媒体引用，并预览一张将在运行时分配前确认的有限依赖图。',
      'intake.taskClass': '任务类别',
      'intake.template': '蓝图模板',
      'intake.assets': '有界资产引用',
      'intake.assetHint': '每行一个 `artifact:` 或 `sha256:` 引用',
      'intake.outputs': '所需交付物',
      'intake.outputHint': '每行一个输出 ID',
      'intake.policy': '策略配置',
      'intake.maxNodes': '编译节点上限',
      'intake.previewKicker': '编译预览',
      'intake.assetCount': '资产引用',
      'intake.deliverableCount': '交付物',
      'intake.nodeBudget': '节点上限',
      'intake.compile': '编译任务预览',
      'intake.disclaimer': '仅预览 · 静态页面不会上传、调用供应商、启动智能体或执行媒体任务。',
      'admission.eyebrow': '图准入 / 扩散前先确定形状',
      'admission.title': '分配智能体前先测量依赖宽度',
      'admission.intro': '从真实依赖图分区，先隔离结构枢纽，并把关键路径视为下限。当并行无法抵消协调税时，让耦合任务保持串行。',
      'admission.source': '依赖证据来源',
      'admission.sourceHint': '优先使用静态分析；文件夹和文件列表不是依赖证据。',
      'admission.partition': '分区策略',
      'admission.coupling': '耦合配置',
      'admission.hubs': '结构枢纽 ID',
      'admission.hubHint': '每行一个节点 ID · 扩散前先隔离',
      'admission.criticalPath': '关键路径下限（秒）',
      'admission.fanout': '扩散上限',
      'admission.rateLimit': '速率限制（请求/秒）',
      'admission.workerRate': '单智能体速率（请求/秒）',
      'admission.taxCeiling': '协调税上限（%）',
      'admission.plannerGate': '规划器预检',
      'admission.previewKicker': '确定性图准入关卡',
      'admission.criticalMetric': '关键路径下限',
      'admission.fanoutMetric': '有效扩散',
      'admission.rateMetric': '预计请求/秒',
      'admission.hubMetric': '枢纽候选',
      'admission.preview': '评估准入预览',
      'admission.disclaimer': '仅预览 · 关卡只读取声明的依赖图，不发出调度命令，也不调用供应商。',
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
      'graph.eyebrow': '初学者积木 / 规范静态 DAG',
      'graph.title': '使用安全积木搭建任务',
      'graph.intro': '先使用易懂的积木。每次安全操作都会编译为类型化节点、有限预算、证据和恢复路径。',
      'graph.inspector': '积木设置',
      'builder.modeBlocks': '积木',
      'builder.modeAdvanced': '高级',
      'builder.eyebrow': '初学者 / 乐高模式',
      'builder.title': '一次使用一个安全积木来搭建任务',
      'builder.intro': '选择现成积木。编辑器会自动连接、调整有限预算、检查整张图，并且只有所有规则通过时才会提交。',
      'builder.undo': '↶ 撤销',
      'builder.redo': '↷ 重做',
      'builder.goal': '写明目标',
      'builder.goalHint': '填写结果和成功检查。',
      'builder.arrange': '排列积木',
      'builder.arrangeHint': '只添加你能解释的步骤。',
      'builder.check': '检查计划',
      'builder.checkHint': '修复所有高亮积木。',
      'builder.allocate': '确认并分配',
      'builder.allocateHint': '用新收据解锁团队设置。',
      'builder.recipes': '使用起步配方',
      'builder.recipesHint': '在当前有效蓝图中加入一个小型、可撤销的模式。',
      'builder.clearRecipe': '先澄清，再检查',
      'builder.clearRecipeHint': '未知项 → 证据检查',
      'builder.approvalRecipe': '添加审批路径',
      'builder.approvalRecipeHint': '人工决定 → 最终检查',
      'builder.loopRecipe': '安全改进',
      'builder.loopRecipeHint': '有限重复 → 最终检查',
      'builder.safeBlocks': '2 个安全积木',
      'builder.oneBlock': '或者添加一个积木',
      'builder.oneBlockHint': '每个按钮都会提前显示新增预算。',
      'builder.clarify': '澄清一个未知项',
      'builder.approval': '请求人工批准',
      'builder.loop': '有限次数改进',
      'builder.finalCheck': '检查结果',
      'builder.clarifyCost': '规划 · +3 分钟 · 3 次工具调用',
      'builder.approvalCost': '人工关卡 · +5 分钟',
      'builder.loopCost': '循环 · 最多尝试 2 次',
      'builder.finalCheckCost': '证据 · +3 分钟 · 3 次工具调用',
      'builder.workspace': '已连接的任务',
      'builder.workspaceHint': '同一行积木可以独立执行；合并积木会等待所有声明的输入。',
      'builder.checkBlocks': '检查我的积木',
      'builder.ready': '可以开始搭建',
      'builder.readyHint': '当前规范蓝图已通过浏览器检查。',
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

  const DYNAMIC_BLUEPRINT_DEFAULTS = {
    schema_version: 'dynamic-mission/1.0',
    task_class: 'multimedia-production',
    template_id: 'multimedia-source-fusion',
    template_version: '1.0.0',
    input_asset_refs: [],
    media_kinds: ['document', 'image', 'audio'],
    deliverables: [
      'cited-brief',
      'storyboard',
      'narration-script',
      'accessible-transcript',
      'preview-package'
    ],
    policy_profile: 'multimedia-review-required',
    compiler_state: 'NEEDS_INPUT',
    dynamic_expansion: false,
    budgets: {
      max_nodes: 24,
      max_concurrency: 4,
      max_attempts: 2,
      wall_time_seconds: 10800,
      tool_calls: 180,
      media_bytes: 524288000
    },
    classification: {
      status: 'NEEDS_INPUT',
      confidence: 0,
      topology: 'diamond',
      evidence: []
    },
    last_compile: null,
    admission: {
      dependency_source: 'unknown',
      partition_strategy: 'dependency-cut',
      coupling_profile: 'needs-input',
      structural_hubs: [],
      critical_path_floor_seconds: 0,
      fanout_ceiling: 3,
      rate_limit_rps: 100,
      worker_rate_rps: 10,
      coordination_tax_ceiling_percent: 30,
      planner_gate: 'script-preflight',
      status: 'NEEDS_INPUT',
      last_receipt: null
    }
  };

  function ensureDynamicBlueprint(contract) {
    if (!contract || typeof contract !== 'object') {
      return contract;
    }
    const current = contract.task_spec;
    const currentBudgets = current && typeof current.budgets === 'object'
      ? current.budgets
      : {};
    const currentClassification = current && typeof current.classification === 'object'
      ? current.classification
      : {};
    const currentAdmission = current && typeof current.admission === 'object'
      ? current.admission
      : {};
    contract.task_spec = {
      ...Model.deepClone(DYNAMIC_BLUEPRINT_DEFAULTS),
      ...(current && typeof current === 'object' ? current : {}),
      budgets: {
        ...Model.deepClone(DYNAMIC_BLUEPRINT_DEFAULTS.budgets),
        ...currentBudgets
      },
      classification: {
        ...Model.deepClone(DYNAMIC_BLUEPRINT_DEFAULTS.classification),
        ...currentClassification
      },
      admission: {
        ...Model.deepClone(DYNAMIC_BLUEPRINT_DEFAULTS.admission),
        ...currentAdmission
      }
    };
    return contract;
  }

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
    dynamicTemplateStatus: document.getElementById('dynamicTemplateStatus'),
    dynamicCompileStatus: document.getElementById('dynamicCompileStatus'),
    dynamicCompileSummary: document.getElementById('dynamicCompileSummary'),
    dynamicAssetCount: document.getElementById('dynamicAssetCount'),
    dynamicDeliverableCount: document.getElementById('dynamicDeliverableCount'),
    dynamicNodeBudget: document.getElementById('dynamicNodeBudget'),
    compileTaskPreviewButton: document.getElementById('compileTaskPreviewButton'),
    admissionStatus: document.getElementById('admissionStatus'),
    admissionSummary: document.getElementById('admissionSummary'),
    admissionPreviewCopy: document.getElementById('admissionPreviewCopy'),
    admissionCriticalPath: document.getElementById('admissionCriticalPath'),
    admissionEffectiveFanout: document.getElementById('admissionEffectiveFanout'),
    admissionProjectedRate: document.getElementById('admissionProjectedRate'),
    admissionHubCount: document.getElementById('admissionHubCount'),
    admissionTaxStatus: document.getElementById('admissionTaxStatus'),
    admissionPreviewButton: document.getElementById('admissionPreviewButton'),
    confirmationSignal: document.getElementById('confirmationSignal'),
    confirmationTitle: document.getElementById('confirmationTitle'),
    confirmationCopy: document.getElementById('confirmationCopy'),
    structureHash: document.getElementById('structureHash'),
    nodeMetric: document.getElementById('nodeMetric'),
    edgeMetric: document.getElementById('edgeMetric'),
    joinMetric: document.getElementById('joinMetric'),
    teamMetric: document.getElementById('teamMetric'),
    mapContractStatus: document.getElementById('mapContractStatus'),
    architectureDiagram: document.getElementById('architectureDiagram'),
    architectureDiagramViewport: document.getElementById('architectureDiagramViewport'),
    architectureAnimationToggle: document.getElementById('architectureAnimationToggle'),
    architectureReferenceToggle: document.getElementById('architectureReferenceToggle'),
    architectureFullscreenToggle: document.getElementById('architectureFullscreenToggle'),
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
    blockBuilder: document.getElementById('blockBuilder'),
    blockModeToggle: document.getElementById('blockModeToggle'),
    advancedModeToggle: document.getElementById('advancedModeToggle'),
    blockPalette: document.getElementById('blockPalette'),
    starterRecipeGrid: document.getElementById('starterRecipeGrid'),
    blockWorkspace: document.getElementById('blockWorkspace'),
    blockCompileButton: document.getElementById('blockCompileButton'),
    blockCompileStatus: document.getElementById('blockCompileStatus'),
    blockIssueList: document.getElementById('blockIssueList'),
    undoButton: document.getElementById('undoButton'),
    redoButton: document.getElementById('redoButton'),
    nodeInspector: document.getElementById('nodeInspector'),
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
    runtimeRosterGrid: document.getElementById('runtimeRosterGrid'),
    routingPolicyDisplay: document.getElementById('routingPolicyDisplay'),
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
  let architectureLoopTimer = null;
  let architectureStepIndex = 0;
  let storageAvailable = true;
  let currentLanguage = 'en';
  let undoHistory = [];
  let redoHistory = [];
  const historyLimit = 30;

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

  function scrollElementIntoView(element, block) {
    if (!element) {
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: block || 'start'
    });
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
      const recovered = Model.recoverEditableDraft(envelope.state);
      if (recovered.repair_mode) {
        queueMicrotask(() => {
          showToast(
            `Your incomplete draft was recovered in repair mode with ${recovered.issues.length} issue(s); no work was discarded.`,
            true
          );
        });
        return recovered.state;
      }
      return recovered.state;
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
    elements.undoButton.setAttribute(
      'aria-label',
      currentLanguage === 'zh-CN' ? '撤销上一次积木更改' : 'Undo last block change'
    );
    elements.redoButton.setAttribute(
      'aria-label',
      currentLanguage === 'zh-CN' ? '重做积木更改' : 'Redo block change'
    );
    updateArchitectureControls();
    refreshStatus();
    if (state?.nodes) {
      refreshOverview();
      renderBlockWorkspace();
      renderNodeInspector();
    }
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
    elements.mapContractStatus.textContent = `LIVE CONTRACT · R${state.blueprint.revision || 1} · ${state.nodes.length} NODES`;
    renderDynamicTaskPreview();
    renderGraphAdmission();
  }

  function renderDynamicTaskPreview() {
    const dynamic = state?.task_spec || DYNAMIC_BLUEPRINT_DEFAULTS;
    const assetRefs = Array.isArray(dynamic.input_asset_refs)
      ? dynamic.input_asset_refs.filter((item) => String(item).trim())
      : [];
    const deliverables = Array.isArray(dynamic.deliverables)
      ? dynamic.deliverables.filter((item) => String(item).trim())
      : [];
    const maxNodes = Number(dynamic.budgets?.max_nodes) || DYNAMIC_BLUEPRINT_DEFAULTS.budgets.max_nodes;
    const hasObjective = String(state?.objective || '').trim().length > 0;
    const hasTemplate = String(dynamic.template_id || '').trim().length > 0;
    const ready = hasObjective && hasTemplate && assetRefs.length > 0 && deliverables.length > 0;
    const compiled = dynamic.compiler_state === 'PREVIEW_READY';
    if (elements.dynamicAssetCount) {
      elements.dynamicAssetCount.textContent = String(assetRefs.length);
      elements.dynamicDeliverableCount.textContent = String(deliverables.length);
      elements.dynamicNodeBudget.textContent = String(maxNodes);
      elements.dynamicTemplateStatus.textContent = compiled
        ? 'SHADOW COMPILE · PREVIEW READY'
        : 'SHADOW COMPILE · NO EXECUTION';
      elements.dynamicCompileStatus.textContent = compiled
        ? 'PREVIEW READY'
        : (ready ? 'READY TO COMPILE' : 'NEEDS INPUT');
      elements.dynamicCompileStatus.dataset.state = compiled ? 'ready' : (ready ? 'prepared' : 'blocked');
      elements.dynamicCompileSummary.textContent = compiled
        ? `Finite ${dynamic.classification?.topology || 'diamond'} template preview prepared for ${assetRefs.length} asset reference(s). Confirm the resulting Graph before allocation.`
        : (ready
          ? 'Inputs are bounded. Compile a task preview to record the selected template and readiness evidence.'
          : 'Add at least one bounded asset reference and one deliverable. The Graph remains unchanged until the task is compiled and confirmed.');
    }
  }

  function calculateGraphAdmission() {
    ensureDynamicBlueprint(state);
    const dynamic = state.task_spec || DYNAMIC_BLUEPRINT_DEFAULTS;
    const admission = {
      ...DYNAMIC_BLUEPRINT_DEFAULTS.admission,
      ...(dynamic.admission || {})
    };
    const nodeCount = Array.isArray(state.nodes) ? state.nodes.length : 0;
    const graphConcurrency = Math.max(
      1,
      Number(state.budgets?.max_concurrency || dynamic.budgets?.max_concurrency) || 1
    );
    const requestedFanout = Math.min(
      64,
      Math.max(1, Number.parseInt(admission.fanout_ceiling, 10) || 0)
    );
    const effectiveFanout = Math.min(requestedFanout, graphConcurrency, Math.max(1, nodeCount));
    const criticalPath = Math.max(0, Number(admission.critical_path_floor_seconds) || 0);
    const rateLimit = Math.max(0, Number(admission.rate_limit_rps) || 0);
    const workerRate = Math.max(0, Number(admission.worker_rate_rps) || 0);
    const projectedRate = effectiveFanout * workerRate;
    const hubs = Array.isArray(admission.structural_hubs)
      ? admission.structural_hubs.filter((item) => String(item).trim())
      : [];
    const taxCeiling = Number(admission.coordination_tax_ceiling_percent);
    const reasons = [];

    if (!['static-analysis', 'declared-graph', 'manual'].includes(admission.dependency_source)) {
      reasons.push(currentLanguage === 'zh-CN'
        ? '需要来自真实依赖图的证据（静态分析、声明图或人工证据）。'
        : 'Dependency evidence must come from static analysis, the declared Graph, or a reviewed manual source.');
    }
    if (admission.coupling_profile === 'needs-input') {
      reasons.push(currentLanguage === 'zh-CN'
        ? '请先判断任务是独立、混合还是耦合。'
        : 'Classify the work as independent, mixed, or coupled before fan-out.');
    }
    if (!criticalPath) {
      reasons.push(currentLanguage === 'zh-CN'
        ? '关键路径下限必须大于零。'
        : 'A positive critical-path floor is required.');
    }
    if (admission.partition_strategy === 'dependency-cut' && hubs.length === 0) {
      reasons.push(currentLanguage === 'zh-CN'
        ? '依赖切分需要先列出结构枢纽。'
        : 'Dependency cuts need structural hub IDs before fan-out.');
    }
    if (admission.planner_gate !== 'script-preflight') {
      reasons.push(currentLanguage === 'zh-CN'
        ? '规划器预检必须保持启用。'
        : 'The zero-token script preflight must stay enabled.');
    }
    if (requestedFanout < 1 || !rateLimit || !workerRate || !Number.isFinite(taxCeiling)
      || taxCeiling < 0 || taxCeiling > 100) {
      reasons.push(currentLanguage === 'zh-CN'
        ? '扩散、速率和协调税预算必须是有限的正值。'
        : 'Fan-out, rate, and coordination-tax budgets must be finite values.');
    }

    let status = 'ADMIT';
    if (reasons.length) {
      status = 'NEEDS_INPUT';
    } else if (projectedRate > rateLimit) {
      status = 'RATE_LIMIT_EXCEEDED';
      reasons.push(currentLanguage === 'zh-CN'
        ? `预计速率 ${projectedRate}/s 超过限制 ${rateLimit}/s。`
        : `Projected rate ${projectedRate}/s exceeds the ${rateLimit}/s limit.`);
    } else if (admission.coupling_profile === 'coupled' || effectiveFanout < 2) {
      status = 'SERIAL_ONLY';
      reasons.push(currentLanguage === 'zh-CN'
        ? '耦合或有效宽度不足，串行执行更安全。'
        : 'Coupling or available width keeps this work serial-only.');
    }

    const summary = status === 'ADMIT'
      ? (currentLanguage === 'zh-CN'
        ? `可考虑并行：先隔离 ${hubs.length} 个枢纽，再在 ${effectiveFanout} 个有界分区内工作。`
        : `Parallel candidate: isolate ${hubs.length} hub(s), then work inside ${effectiveFanout} bounded partition(s).`)
      : status === 'SERIAL_ONLY'
        ? (currentLanguage === 'zh-CN'
          ? '保持串行；关键路径和耦合关系决定了并行不会带来可靠收益。'
          : 'Keep this serial; the critical path and coupling make parallel work unreliable.')
        : status === 'RATE_LIMIT_EXCEEDED'
          ? (currentLanguage === 'zh-CN'
            ? '先降低扩散或单智能体速率，再进入团队分配。'
            : 'Reduce fan-out or worker rate before entering team allocation.')
          : (currentLanguage === 'zh-CN'
            ? '补齐依赖证据、枢纽和关键路径后再评估。'
            : 'Add dependency evidence, hubs, and a critical-path floor before evaluating.');

    return {
      status,
      dependency_source: admission.dependency_source,
      partition_strategy: admission.partition_strategy,
      coupling_profile: admission.coupling_profile,
      structural_hubs: hubs,
      critical_path_floor_seconds: criticalPath,
      requested_fanout: requestedFanout,
      effective_fanout: effectiveFanout,
      graph_concurrency: graphConcurrency,
      rate_limit_rps: rateLimit,
      worker_rate_rps: workerRate,
      projected_rate_rps: projectedRate,
      coordination_tax_ceiling_percent: taxCeiling,
      planner_gate: admission.planner_gate,
      reasons,
      summary
    };
  }

  function admissionStatusLabel(status) {
    const labels = currentLanguage === 'zh-CN'
      ? {
        ADMIT: '可并行候选',
        SERIAL_ONLY: '仅串行',
        RATE_LIMIT_EXCEEDED: '超出速率限制',
        NEEDS_INPUT: '需要输入'
      }
      : {
        ADMIT: 'PARALLEL CANDIDATE',
        SERIAL_ONLY: 'SERIAL ONLY',
        RATE_LIMIT_EXCEEDED: 'RATE LIMIT EXCEEDED',
        NEEDS_INPUT: 'NEEDS INPUT'
      };
    return labels[status] || labels.NEEDS_INPUT;
  }

  function renderGraphAdmission() {
    if (!elements.admissionStatus || !elements.admissionSummary) {
      return;
    }
    const preview = calculateGraphAdmission();
    const statusState = {
      ADMIT: 'candidate',
      SERIAL_ONLY: 'serial',
      RATE_LIMIT_EXCEEDED: 'rate',
      NEEDS_INPUT: 'blocked'
    }[preview.status] || 'blocked';
    const label = admissionStatusLabel(preview.status);
    elements.admissionStatus.textContent = label;
    elements.admissionStatus.dataset.state = statusState;
    elements.admissionSummary.textContent = label;
    elements.admissionSummary.dataset.state = statusState;
    elements.admissionPreviewCopy.textContent = preview.summary;
    elements.admissionCriticalPath.textContent = `${preview.critical_path_floor_seconds}s`;
    elements.admissionEffectiveFanout.textContent = `${preview.effective_fanout}/${preview.requested_fanout}`;
    elements.admissionProjectedRate.textContent = `${preview.projected_rate_rps}/s`;
    elements.admissionHubCount.textContent = String(preview.structural_hubs.length);
    elements.admissionTaxStatus.textContent = currentLanguage === 'zh-CN'
      ? `协调税预算：${preview.coordination_tax_ceiling_percent}% · 关键路径是 ${preview.critical_path_floor_seconds}s 的下限。`
      : `Coordination-tax ceiling: ${preview.coordination_tax_ceiling_percent}% · critical path is a ${preview.critical_path_floor_seconds}s floor.`;
  }

  function fitArchitectureDiagram() {
    const viewport = elements.architectureDiagramViewport;
    if (!viewport) {
      return;
    }
    const fullscreen = document.fullscreenElement === viewport;
    const availableWidth = Math.max(1, fullscreen ? window.innerWidth - 24 : viewport.clientWidth);
    const availableHeight = fullscreen ? Math.max(1, window.innerHeight - 24) : 1024;
    const scale = Math.min(1, availableWidth / 1536, availableHeight / 1024);
    viewport.style.setProperty('--scale', scale.toFixed(4));
    viewport.style.height = `${Math.ceil(1024 * scale)}px`;
  }

  function setArchitectureStep(index) {
    const cards = Array.from(elements.architectureDiagram.querySelectorAll('.workflow-card'));
    if (!cards.length) {
      return;
    }
    architectureStepIndex = ((index % cards.length) + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      card.classList.toggle('active', cardIndex === architectureStepIndex);
    });
  }

  function startArchitectureLoop() {
    clearInterval(architectureLoopTimer);
    setArchitectureStep(architectureStepIndex);
    architectureLoopTimer = window.setInterval(() => {
      setArchitectureStep(architectureStepIndex + 1);
    }, 2400);
  }

  function updateArchitectureControls() {
    const paused = elements.architectureDiagram.classList.contains('paused');
    const showingReference = elements.architectureDiagram.classList.contains('show-reference');
    const fullscreen = document.fullscreenElement === elements.architectureDiagramViewport;
    elements.architectureAnimationToggle.textContent = paused
      ? (currentLanguage === 'zh-CN' ? '继续动画' : 'Resume animation')
      : (currentLanguage === 'zh-CN' ? '暂停动画' : 'Pause animation');
    elements.architectureReferenceToggle.textContent = showingReference
      ? (currentLanguage === 'zh-CN' ? '隐藏原图' : 'Hide source overlay')
      : (currentLanguage === 'zh-CN' ? '显示原图' : 'Show source overlay');
    elements.architectureFullscreenToggle.textContent = fullscreen
      ? (currentLanguage === 'zh-CN' ? '退出全屏' : 'Exit full screen')
      : (currentLanguage === 'zh-CN' ? '全屏' : 'Full screen');
  }

  function openArchitectureTarget(target) {
    const view = target.dataset.mapView;
    if (!view) {
      return;
    }
    setActiveView(view, true);
    const destination = view === 'mission'
      ? document.querySelector('.mission-form-card')
      : document.querySelector(`[data-view-panel="${view}"] .section-heading`);
    requestAnimationFrame(() => scrollElementIntoView(destination, 'start'));
  }

  function refreshStatus() {
    const { confirmed, valid } = updateDerivedStatus();
    const handoffReady = Boolean(state.team_command?.handoff);
    const hash = Model.structureHash(state);
    elements.body.dataset.status = confirmed ? 'confirmed' : (valid ? 'draft' : 'invalid');
    elements.revisionChip.textContent = `R${state.blueprint.revision || 1}`;
    elements.headerStatus.textContent = handoffReady
      ? (currentLanguage === 'zh-CN' ? '交接包已导出 · 等待契约与适配器验证' : 'Handoff exported · contract and adapter gates required')
      : confirmed
        ? (currentLanguage === 'zh-CN' ? '结构已确认' : 'Structure confirmed')
        : valid
          ? (currentLanguage === 'zh-CN' ? '客户端检查通过' : 'Client checks pass')
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
    elements.teamLockBadge.textContent = confirmed ? (handoffReady ? 'PENDING GATES' : 'OPEN') : 'LOCKED';
    elements.teamLockBadge.classList.toggle('ready', confirmed);

    elements.validationBanner.classList.toggle('invalid', !valid);
    elements.validationBanner.querySelector('.validation-icon').textContent = valid ? '✓' : '!';
    elements.validationTitle.textContent = valid
      ? (currentLanguage === 'zh-CN' ? '客户端契约检查通过' : 'Client contract checks pass')
      : `${validation.errors.length} ${currentLanguage === 'zh-CN' ? '项阻塞问题' : 'blocking issue(s)'}`;
    elements.validationSummary.textContent = valid
      ? (currentLanguage === 'zh-CN'
        ? '所有浏览器端图与团队草稿检查均通过。'
        : 'All browser-side Graph and Team draft checks pass.')
      : validation.errors[0]?.message || 'Validation failed.';
    renderValidationDetails();

    elements.teamWorkspace.inert = !confirmed;
    elements.addWorkstreamButton.disabled = true;
    elements.addWorkstreamButton.title = currentLanguage === 'zh-CN'
      ? '新工作流必须与图节点、能力路由和集成顺序一起原子生成。'
      : 'A new workstream must be generated atomically with its Graph node, capability route, and integration order.';
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
      ? (currentLanguage === 'zh-CN' ? '交接包已导出，等待契约与适配器验证' : 'Handoff exported, contract and adapter gates pending')
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
    if (handoffReady && phases[4]) {
      phases[4].classList.add('active');
    }
    updateBeginnerJourney(valid, confirmed, handoffReady);
  }

  function updateBeginnerJourney(valid, confirmed, handoffReady) {
    const steps = Array.from(document.querySelectorAll('.builder-journey > li'));
    const missionComplete = Boolean(
      String(state.objective || '').trim()
      && String(state.blueprint?.mission_title || '').trim()
      && Array.isArray(state.blueprint?.success_criteria)
      && state.blueprint.success_criteria.length
    );
    let currentIndex = 0;
    if (missionComplete) {
      currentIndex = state.nodes.length ? (valid ? 3 : 2) : 1;
    }
    if (confirmed || handoffReady) {
      currentIndex = 3;
    }
    steps.forEach((step, index) => {
      const complete = index < currentIndex || (handoffReady && index === currentIndex);
      step.classList.toggle('complete', complete);
      if (index === currentIndex) {
        step.setAttribute('aria-current', 'step');
      } else {
        step.removeAttribute('aria-current');
      }
    });
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
    const editorMode = presentation.editor_mode === 'advanced' ? 'advanced' : 'blocks';
    elements.body.dataset.editorMode = editorMode;
    elements.blockModeToggle.classList.toggle('active', editorMode === 'blocks');
    elements.advancedModeToggle.classList.toggle('active', editorMode === 'advanced');
    elements.blockModeToggle.setAttribute('aria-pressed', String(editorMode === 'blocks'));
    elements.advancedModeToggle.setAttribute('aria-pressed', String(editorMode === 'advanced'));
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
        const card = createElement('button', `graph-node kind-${node.kind}`);
        card.type = 'button';
        if (interactive) {
          card.dataset.nodeId = node.id;
          card.classList.toggle('selected', node.id === selectedNodeId);
          card.setAttribute('aria-label', `Edit node ${node.label || node.id}`);
        } else {
          card.dataset.previewNodeId = node.id;
          card.setAttribute('aria-label', `Open graph editor for node ${node.label || node.id}`);
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
    renderBlockWorkspace();
  }

  function setEditorMode(mode, persist) {
    const nextMode = mode === 'advanced' ? 'advanced' : 'blocks';
    elements.body.dataset.editorMode = nextMode;
    elements.blockModeToggle.classList.toggle('active', nextMode === 'blocks');
    elements.advancedModeToggle.classList.toggle('active', nextMode === 'advanced');
    elements.blockModeToggle.setAttribute('aria-pressed', String(nextMode === 'blocks'));
    elements.advancedModeToggle.setAttribute('aria-pressed', String(nextMode === 'advanced'));
    if (persist && state.blueprint.presentation.editor_mode !== nextMode) {
      state.blueprint.presentation.editor_mode = nextMode;
      scheduleSave();
    }
    if (activeView === 'graph') {
      requestAnimationFrame(() => {
        renderGraphViews();
        renderNodeInspector();
        const focusTarget = nextMode === 'blocks'
          ? elements.blockBuilder
          : elements.graphStage;
        scrollElementIntoView(focusTarget, 'start');
      });
    }
  }

  function beginnerBlockType(node) {
    const insertedType = Model.blockTypeForNode(node);
    if (insertedType) {
      return insertedType;
    }
    if (state.entry_nodes.includes(node.id)) {
      return 'goal';
    }
    if (state.terminal_nodes.includes(node.id)) {
      return 'deliver';
    }
    if (node.id === state.team_command.integration?.graph_node_id) {
      return 'merge';
    }
    if (node.id === state.team_command.runtime_validation_node
      || node.id === state.team_command.adapter_readiness_node) {
      return 'safety-check';
    }
    if (node.kind === 'human-gate') {
      return 'approval';
    }
    if (node.kind === 'loop') {
      return 'bounded-loop';
    }
    if (node.kind === 'agent-team') {
      return 'team-work';
    }
    if (node.kind === 'agent') {
      return /review/i.test(node.id) ? 'review' : 'work';
    }
    return /verif|check|review/i.test(`${node.id} ${node.label || ''}`)
      ? 'check'
      : 'step';
  }

  function beginnerBlockLabel(type) {
    const labels = currentLanguage === 'zh-CN'
      ? {
        goal: '目标',
        deliver: '交付',
        merge: '合并',
        'safety-check': '安全检查',
        approval: '人工确认',
        'bounded-loop': '有限循环',
        'team-work': '团队工作',
        review: '独立审查',
        work: '工作',
        check: '检查',
        clarify: '澄清',
        'final-check': '结果检查',
        step: '步骤'
      }
      : {
        goal: 'Goal',
        deliver: 'Deliver',
        merge: 'Merge',
        'safety-check': 'Safety check',
        approval: 'Approval',
        'bounded-loop': 'Repeat safely',
        'team-work': 'Team work',
        review: 'Independent review',
        work: 'Work',
        check: 'Check',
        clarify: 'Clarify',
        'final-check': 'Result check',
        step: 'Step'
      };
    return labels[type] || type;
  }

  function nodeIdsForIssue(item) {
    const ids = new Set();
    const path = item?.path || '';
    let match = /^nodes\[(\d+)]/.exec(path);
    if (match && state.nodes[Number(match[1])]) {
      ids.add(state.nodes[Number(match[1])].id);
    }
    match = /^edges\[(\d+)]/.exec(path);
    if (match && state.edges[Number(match[1])]) {
      const edge = state.edges[Number(match[1])];
      ids.add(edge.from);
      ids.add(edge.to);
    }
    match = /^joins\[(\d+)]/.exec(path);
    if (match && state.joins[Number(match[1])]) {
      const join = state.joins[Number(match[1])];
      ids.add(join.target);
      (join.inputs || []).forEach((id) => ids.add(id));
    }
    match = /^team_command\.workstreams\[(\d+)]/.exec(path);
    if (match && state.team_command.workstreams[Number(match[1])]) {
      ids.add(state.team_command.workstreams[Number(match[1])].graph_node_id);
    }
    match = /^team_command\.routing\.route_requests\[(\d+)]/.exec(path);
    if (match && state.team_command.routing?.route_requests?.[Number(match[1])]) {
      ids.add(state.team_command.routing.route_requests[Number(match[1])].graph_node_id);
    }
    if (path === 'team_command.activation_gate') {
      ids.add(state.team_command.activation_gate);
    }
    if (path === 'team_command.runtime_validation_node') {
      ids.add(state.team_command.runtime_validation_node);
    }
    if (path === 'team_command.adapter_readiness_node') {
      ids.add(state.team_command.adapter_readiness_node);
    }
    if (path === 'team_command.integration.graph_node_id') {
      ids.add(state.team_command.integration?.graph_node_id);
    }
    if (item?.code === 'writer.overlap') {
      const target = /multiple owners:\s*(.+?)\.$/.exec(item.message || '')?.[1];
      state.nodes.forEach((node) => {
        if (target && node.writes?.includes(target)) {
          ids.add(node.id);
        }
      });
    }
    return Array.from(ids).filter((id) => state.nodes.some((node) => node.id === id));
  }

  function nodeIssues(nodeId) {
    return validation.errors.filter((item) => nodeIdsForIssue(item).includes(nodeId));
  }

  function hasUnmappedBlockIssues() {
    return validation.errors.some((item) => nodeIdsForIssue(item).length === 0);
  }

  function renderBlockIssues(issues, actionRejected) {
    const blocking = Array.isArray(issues) ? issues : validation.errors;
    const statusKey = blocking.length
      ? `${currentLanguage}:${actionRejected ? 'rejected' : 'invalid'}:${blocking.length}:${blocking[0]?.code || ''}`
      : `${currentLanguage}:ready`;
    const statusChanged = elements.blockCompileStatus.dataset.announceKey !== statusKey;
    elements.blockCompileStatus.dataset.announceKey = statusKey;
    elements.blockIssueList.replaceChildren();
    if (!blocking.length) {
      elements.blockIssueList.hidden = true;
      elements.blockCompileStatus.dataset.state = 'ready';
      if (!statusChanged) {
        return;
      }
      elements.blockCompileStatus.replaceChildren();
      const icon = createElement('span', '', '✓');
      icon.setAttribute('aria-hidden', 'true');
      const copy = createElement('div');
      copy.append(
        createElement('b', '', currentLanguage === 'zh-CN' ? '所有积木已连接' : 'All blocks are connected'),
        createElement(
          'small',
          '',
          currentLanguage === 'zh-CN'
            ? '当前规范蓝图已通过浏览器检查；确认后才能设置团队。'
            : 'The canonical blueprint passes browser checks; team setup still requires confirmation.'
        )
      );
      elements.blockCompileStatus.append(icon, copy);
      return;
    }
    elements.blockIssueList.hidden = false;
    elements.blockCompileStatus.dataset.state = 'invalid';
    if (statusChanged) {
      elements.blockCompileStatus.replaceChildren();
      const icon = createElement('span', '', '!');
      icon.setAttribute('aria-hidden', 'true');
      const copy = createElement('div');
      copy.append(
        createElement(
          'b',
          '',
          actionRejected
            ? (currentLanguage === 'zh-CN' ? '操作未应用' : 'Action not applied')
            : (currentLanguage === 'zh-CN' ? '有积木需要处理' : 'Some blocks need attention')
        ),
        createElement(
          'small',
          '',
          actionRejected
            ? (currentLanguage === 'zh-CN'
              ? '蓝图没有改变。请查看下面的原因。'
              : 'The blueprint was not changed. Review the reason below.')
            : (currentLanguage === 'zh-CN'
              ? `${blocking.length} 项阻塞问题`
              : `${blocking.length} blocking issue${blocking.length === 1 ? '' : 's'}`)
        )
      );
      elements.blockCompileStatus.append(icon, copy);
    }
    blocking.slice(0, 12).forEach((item) => {
      const row = createElement('li');
      const button = createElement('button', '', item.message);
      button.type = 'button';
      button.dataset.blockIssue = item.code;
      button.dataset.path = item.path;
      row.append(button);
      elements.blockIssueList.append(row);
    });
  }

  function renderBlockWorkspace() {
    if (!elements.blockWorkspace) {
      return;
    }
    elements.blockWorkspace.replaceChildren();
    const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));
    const levels = Model.topologicalLevels(state);
    const confirmed = Model.confirmationIsValid(state);
    const planHasUnmappedIssues = hasUnmappedBlockIssues();
    levels.forEach((ids, levelIndex) => {
      const group = createElement('section', 'block-level');
      group.setAttribute(
        'aria-label',
        currentLanguage === 'zh-CN'
          ? `第 ${levelIndex + 1} 步`
          : `Step ${levelIndex + 1}`
      );
      const header = createElement('div', 'block-level-heading');
      header.append(
        createElement('span', '', String(levelIndex + 1).padStart(2, '0')),
        createElement(
          'small',
          '',
          ids.length > 1
            ? (currentLanguage === 'zh-CN'
              ? `${ids.length} 个积木可以独立执行`
              : `${ids.length} blocks may run independently`)
            : (currentLanguage === 'zh-CN' ? '一个有限积木' : 'One bounded block')
        )
      );
      const row = createElement('div', 'block-level-row');
      row.setAttribute('role', 'list');
      row.setAttribute(
        'aria-label',
        currentLanguage === 'zh-CN'
          ? `第 ${levelIndex + 1} 步的积木`
          : `Blocks in step ${levelIndex + 1}`
      );
      ids.forEach((id) => {
        const node = nodeMap.get(id);
        if (!node) {
          return;
        }
        const type = beginnerBlockType(node);
        const issues = nodeIssues(id);
        const needsAttention = issues.length > 0 || planHasUnmappedIssues;
        const card = createElement('article', `mission-block block-${type}`);
        card.dataset.blockId = id;
        card.dataset.blockType = type;
        card.setAttribute('role', 'listitem');
        const top = createElement('div', 'mission-block-top');
        top.append(
          createElement('span', 'mission-block-kind', beginnerBlockLabel(type)),
          createElement(
            'span',
            `block-state ${needsAttention ? 'needs-attention' : (confirmed ? 'confirmed' : 'ready')}`,
            needsAttention
              ? (issues.length
                ? (currentLanguage === 'zh-CN' ? '需要处理' : 'Needs attention')
                : (currentLanguage === 'zh-CN' ? '方案需处理' : 'Plan needs attention'))
              : (confirmed
                ? (currentLanguage === 'zh-CN' ? '已确认' : 'Confirmed')
                : (currentLanguage === 'zh-CN' ? '已就绪' : 'Ready'))
          )
        );
        const configure = createElement('button', 'mission-block-main');
        configure.type = 'button';
        configure.dataset.blockAction = 'configure';
        configure.dataset.blockId = id;
        configure.setAttribute(
          'aria-label',
          `${currentLanguage === 'zh-CN' ? '设置' : 'Configure'} ${node.label || node.id}`
        );
        configure.append(
          createElement('b', '', node.label || node.id),
          createElement('p', '', node.summary || node.verifier),
          createElement(
            'small',
            '',
            currentLanguage === 'zh-CN'
              ? `${node.timeout_seconds} 秒 · 最多 ${node.max_attempts} 次`
              : `${node.timeout_seconds}s · ${node.max_attempts} attempt${node.max_attempts === 1 ? '' : 's'}`
          )
        );
        const actions = createElement('div', 'mission-block-actions');
        if (Model.blockTypeForNode(node)) {
          const remove = createElement(
            'button',
            'quiet-button danger-text',
            currentLanguage === 'zh-CN' ? '移除' : 'Remove'
          );
          remove.type = 'button';
          remove.dataset.blockAction = 'remove';
          remove.dataset.blockId = id;
          remove.setAttribute(
            'aria-label',
            `${currentLanguage === 'zh-CN' ? '移除' : 'Remove'} ${node.label || node.id}`
          );
          actions.append(remove);
        }
        card.append(top, configure);
        if (actions.childElementCount) {
          card.append(actions);
        }
        row.append(card);
      });
      group.append(header, row);
      elements.blockWorkspace.append(group);
      if (levelIndex < levels.length - 1) {
        const connector = createElement('div', 'block-level-connector', '↓');
        connector.setAttribute('aria-hidden', 'true');
        elements.blockWorkspace.append(connector);
      }
    });
    renderBlockIssues();
    updateHistoryControls();
  }

  function updateHistoryControls() {
    elements.undoButton.disabled = undoHistory.length === 0;
    elements.redoButton.disabled = redoHistory.length === 0;
  }

  function rememberBlockState() {
    undoHistory.push(Model.deepClone(state));
    if (undoHistory.length > historyLimit) {
      undoHistory.shift();
    }
    redoHistory = [];
  }

  function commitBlockResult(result, message, options) {
    const settings = options || {};
    if (!result.ok) {
      renderBlockIssues(result.errors, true);
      showToast(result.errors[0]?.message || 'The block action was not applied.', true);
      return false;
    }
    rememberBlockState();
    state = result.candidate;
    selectedNodeId = settings.selectedNodeId
      || result.applied?.[result.applied.length - 1]?.id
      || selectedNodeId;
    selectedWorkstreamId = null;
    updateDerivedStatus();
    scheduleSave();
    renderAll();
    setActiveView('graph', true);
    showToast(message, false);
    requestAnimationFrame(() => {
      if (settings.focusField) {
        const control = elements.nodeInspectorBody.querySelector(
          `[data-node-field="${CSS.escape(settings.focusField)}"]`
        );
        control?.focus({ preventScroll: true });
        scrollElementIntoView(elements.nodeInspector, 'start');
        return;
      }
      const card = elements.blockWorkspace.querySelector(
        `.mission-block[data-block-id="${CSS.escape(selectedNodeId || '')}"] .mission-block-main`
      );
      card?.focus({ preventScroll: true });
      scrollElementIntoView(card, 'center');
    });
    return true;
  }

  function addBeginnerBlock(blockType) {
    const definition = Model.getBlockCatalog().find((item) => item.id === blockType);
    const result = Model.applyBlockTransaction(state, {
      schema_version: '1.0',
      transaction_id: `add-${blockType}-r${Number(state.blueprint.revision || 1) + 1}`,
      operations: [{ op: 'insert-block', block_type: blockType }]
    });
    const budget = result.budget_delta || {};
    const budgetCopy = result.ok
      ? ` Budget: +${Math.max(0, budget.wall_time_seconds || 0)}s, +${Math.max(0, budget.tool_calls || 0)} tool calls.`
      : '';
    commitBlockResult(
      result,
      `${definition?.name || 'Block'} added and the complete graph still passes.${budgetCopy}`
    );
  }

  function applyBeginnerRecipe(recipeId) {
    const recipe = Model.getBlockRecipes().find((item) => item.id === recipeId);
    const result = Model.applyBlockRecipe(state, recipeId);
    commitBlockResult(
      result,
      `${recipe?.name || 'Starter recipe'} added as one validated, undoable change.`
    );
  }

  function removeBeginnerBlock(blockId) {
    const node = state.nodes.find((item) => item.id === blockId);
    if (!node) {
      return;
    }
    const result = Model.applyBlockTransaction(state, {
      schema_version: '1.0',
      transaction_id: `remove-${blockId}-r${Number(state.blueprint.revision || 1) + 1}`,
      operations: [{ op: 'remove-block', block_id: blockId }]
    });
    const outgoingTarget = state.edges.find((edge) => edge.from === blockId)?.to;
    const incomingSource = state.edges.find((edge) => edge.to === blockId)?.from;
    const nextSelection = result.candidate?.nodes.some((item) => item.id === outgoingTarget)
      ? outgoingTarget
      : (result.candidate?.nodes.some((item) => item.id === incomingSource)
        ? incomingSource
        : result.candidate?.nodes[0]?.id);
    commitBlockResult(
      result,
      `${node.label || node.id} removed; surrounding blocks were reconnected safely.`,
      { selectedNodeId: nextSelection || null }
    );
  }

  function restoreBlockHistory(direction) {
    const source = direction === 'undo' ? undoHistory : redoHistory;
    const target = direction === 'undo' ? redoHistory : undoHistory;
    if (!source.length) {
      return;
    }
    target.push(Model.deepClone(state));
    const snapshot = source.pop();
    const previousRevision = Number(state.blueprint.revision || 1);
    state = Model.restoreEditableSnapshot(
      snapshot,
      `${direction === 'undo' ? 'Undo' : 'Redo'} restored editable content; confirmation and runtime authority remain cleared.`
    );
    state.blueprint.revision = Math.max(
      previousRevision,
      Number(state.blueprint.revision || 1)
    ) + 1;
    selectedNodeId = state.nodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : state.nodes[0]?.id || null;
    selectedWorkstreamId = null;
    updateDerivedStatus();
    scheduleSave();
    renderAll();
    setActiveView('graph', true);
    showToast(
      `${direction === 'undo' ? 'Undo' : 'Redo'} complete. A fresh confirmation is still required.`,
      false
    );
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
    if (settings.placeholder) {
      control.placeholder = settings.placeholder;
    }
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
    const overview = createElement('div', 'block-inspector-overview');
    overview.append(
      createElement('span', 'mission-block-kind', beginnerBlockLabel(beginnerBlockType(node))),
      createElement(
        'p',
        '',
        currentLanguage === 'zh-CN'
          ? '先编辑易懂的字段。技术标识、类型化端口和写入规则保留在下方的高级契约中。'
          : 'Start with the plain-language fields. Technical IDs, typed ports, and write rules stay in Advanced contract below.'
      )
    );
    const basics = createElement('div', 'inspector-section beginner-fields');
    basics.append(
      createField(
        currentLanguage === 'zh-CN' ? '积木名称' : 'Block name',
        node.label || '',
        { full: true, dataset: { nodeField: 'label' } }
      ),
      createField(
        currentLanguage === 'zh-CN' ? '这个积木做什么？' : 'What happens in this block?',
        node.summary || '',
        {
          type: 'textarea',
          rows: 2,
          full: true,
          dataset: { nodeField: 'summary' }
        }
      ),
      createField(
        currentLanguage === 'zh-CN' ? '怎样算完成？' : 'How will we know it is done?',
        node.verifier,
        {
          type: 'textarea',
          rows: 3,
          full: true,
          dataset: { nodeField: 'verifier' }
        }
      ),
      createField(
        currentLanguage === 'zh-CN' ? '时间上限（秒）' : 'Time limit · seconds',
        node.timeout_seconds,
        {
          type: 'number',
          min: 1,
          dataset: { nodeField: 'timeout_seconds', number: 'true' }
        }
      ),
      createField(
        currentLanguage === 'zh-CN' ? '最多尝试次数' : 'Attempt limit',
        node.max_attempts,
        {
          type: 'number',
          min: 1,
          dataset: { nodeField: 'max_attempts', number: 'true' }
        }
      ),
      createField(
        currentLanguage === 'zh-CN' ? '失败后怎么办？' : 'What happens if it fails?',
        node.compensation || '',
        {
          type: 'textarea',
          rows: 2,
          full: true,
          placeholder: currentLanguage === 'zh-CN'
            ? '停止，保留已经验证的积木，并报告证据。'
            : 'Stop, keep prior verified blocks, and report the evidence.',
          dataset: { nodeField: 'compensation' }
        }
      )
    );

    const advanced = createElement('details', 'advanced-contract');
    const advancedSummary = createElement(
      'summary',
      '',
      currentLanguage === 'zh-CN' ? '高级契约' : 'Advanced contract'
    );
    const identity = createElement('div', 'inspector-section');
    identity.append(
      createField('ID', node.id, { full: true, dataset: { nodeField: 'id' } }),
      createField('Kind', node.kind, {
        options: Model.VALID_NODE_KINDS,
        dataset: { nodeField: 'kind' }
      }),
      createField('Owner / capability role', node.owner, {
        dataset: { nodeField: 'owner' }
      })
    );
    const payloads = createElement('div', 'inspector-section');
    [
      ['Needs / input ports · one per line', 'inputs'],
      ['Creates / output ports · one per line', 'outputs'],
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
      })
    );
    advanced.append(advancedSummary);
    if (elements.body.dataset.editorMode === 'blocks') {
      const note = createElement(
        'p',
        'advanced-contract-note',
        currentLanguage === 'zh-CN'
          ? '切换到高级模式后可编辑技术字段；易懂字段仍通过安全积木事务保存。'
          : 'Switch to Advanced mode to edit technical fields; plain-language fields stay protected by safe block transactions.'
      );
      advanced.append(note);
      [identity, payloads, evidence].forEach((section) => {
        section.querySelectorAll('input, textarea, select').forEach((control) => {
          control.disabled = true;
        });
      });
    }
    advanced.append(identity, payloads, evidence);
    elements.nodeInspectorBody.append(overview, basics, advanced);
    const nodeIndex = state.nodes.findIndex((item) => item.id === node.id);
    const directPrefix = `nodes[${nodeIndex}].`;
    validation.errors
      .filter((item) => item.path.startsWith(directPrefix))
      .forEach((item, issueIndex) => {
        const field = item.path.slice(directPrefix.length).split(/[.[\]]/, 1)[0];
        const control = elements.nodeInspectorBody.querySelector(
          `[data-node-field="${CSS.escape(field)}"]`
        );
        if (!control || control.getAttribute('aria-invalid') === 'true') {
          return;
        }
        const errorId = `node-${nodeIndex}-${field}-error-${issueIndex}`;
        const error = createElement('small', 'field-error', item.message);
        error.id = errorId;
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('aria-describedby', errorId);
        control.closest('label')?.append(error);
      });
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

  function createAdapterField(label, value, index, field, options) {
    const config = options || {};
    const wrapper = createElement('label', `field${config.full ? ' full' : ''}`);
    wrapper.append(createElement('span', '', label));
    let control;
    if (config.multiline) {
      control = createElement('textarea');
      control.rows = config.rows || 3;
      control.value = Array.isArray(value) ? value.join('\n') : (value || '');
      control.dataset.list = 'true';
    } else {
      control = createElement('input');
      control.type = config.type || 'text';
      if (control.type === 'checkbox') {
        control.checked = Boolean(value);
      } else {
        control.value = value ?? '';
      }
    }
    control.dataset.adapterIndex = String(index);
    control.dataset.adapterField = field;
    control.dataset.scope = 'team';
    wrapper.append(control);
    return wrapper;
  }

  function renderRuntimeRoster() {
    elements.runtimeRosterGrid.replaceChildren();
    const visual = {
      claude: {
        className: 'claude',
        image: 'blueprint/reference-assets/claude-main.png',
        role: 'PLAN / REVIEW'
      },
      antigravity: {
        className: 'antigravity',
        image: 'blueprint/reference-assets/antigravity-main.png',
        role: 'ORCHESTRATE / OBSERVE'
      },
      codex: {
        className: 'codex',
        image: 'blueprint/reference-assets/codex-main.png',
        role: 'BUILD / TEST'
      }
    };
    const adapters = state.team_command.agent_roster?.adapters || [];
    adapters.forEach((adapter, index) => {
      const treatment = visual[adapter.id] || {
        className: 'generic',
        image: 'blueprint/reference-assets/icons/execute-robot.png',
        role: 'CAPABILITY ADAPTER'
      };
      const card = createElement('article', `runtime-adapter-card ${treatment.className}`);
      const header = createElement('div', 'runtime-adapter-head');
      const image = createElement('img');
      image.src = treatment.image;
      image.alt = '';
      image.draggable = false;
      const identity = createElement('div');
      identity.append(
        createElement('small', '', treatment.role),
        createElement('h3', '', adapter.display_name),
        createElement('code', '', adapter.id)
      );
      const status = createElement(
        'span',
        'runtime-adapter-status',
        adapter.runtime_state?.status || 'UNVERIFIED'
      );
      header.append(image, identity, status);

      const capabilities = createElement('div', 'adapter-capability-preview');
      (adapter.declared_capabilities || []).slice(0, 4).forEach((capability) => {
        capabilities.append(createElement('span', '', capability));
      });

      const settings = createElement('details', 'adapter-settings');
      const summary = createElement('summary', '', 'Edit adapter contract');
      const fields = createElement('div', 'field-grid compact-fields');
      fields.append(
        createAdapterField('Display name', adapter.display_name, index, 'display_name'),
        createAdapterField('Enabled', adapter.enabled, index, 'enabled', { type: 'checkbox' }),
        createAdapterField('Opaque connection ref', adapter.connection_ref, index, 'connection_ref', { full: true }),
        createAdapterField('Declared capabilities · one per line', adapter.declared_capabilities, index, 'declared_capabilities', { multiline: true, full: true, rows: 5 }),
        createAdapterField('Workspace modes · one per line', adapter.supported_workspace_modes, index, 'supported_workspace_modes', { multiline: true, full: true }),
        createAdapterField('Permission profiles · one per line', adapter.supported_permission_profiles, index, 'supported_permission_profiles', { multiline: true, full: true }),
        createAdapterField('Max concurrency', adapter.max_concurrency, index, 'max_concurrency', { type: 'number' }),
        createAdapterField('IPC protocol', adapter.ipc_protocol_version, index, 'ipc_protocol_version')
      );
      settings.append(summary, fields);
      card.append(header, capabilities, settings);
      elements.runtimeRosterGrid.append(card);
    });
    elements.routingPolicyDisplay.textContent = state.team_command.routing?.selection_policy || 'missing routing policy';
  }

  function renderTeam() {
    renderRuntimeRoster();
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
    elements.dialogValidation.textContent = `CLIENT PASS · ${state.nodes.length} nodes / ${state.edges.length} edges`;
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
    ensureDynamicBlueprint(state);
    undoHistory = [];
    redoHistory = [];
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
      showToast('Handoff downloaded. Contract validation and Harness adapter readiness are still required; no agents were started.', false);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function commitValidatedCandidate(candidate, message, nextSelectedNodeId) {
    const result = Model.validateBlueprint(candidate);
    if (result.errors.length) {
      renderBlockIssues(result.errors, true);
      showToast(`No change was made: ${result.errors[0].message}`, true);
      return false;
    }
    rememberBlockState();
    const previousRevision = Number(state.blueprint.revision || 1);
    state = Model.restoreEditableSnapshot(
      candidate,
      'An Advanced-mode graph edit was validated and committed; fresh confirmation required.'
    );
    state.blueprint.revision = previousRevision + 1;
    selectedNodeId = nextSelectedNodeId || selectedNodeId;
    updateDerivedStatus();
    scheduleSave();
    renderAll();
    showToast(message, false);
    return true;
  }

  function addNode() {
    addBeginnerBlock('clarify');
  }

  function duplicateSelectedNode() {
    const source = state.nodes.find((node) => node.id === selectedNodeId);
    if (!source) {
      return;
    }
    const candidate = Model.deepClone(state);
    const copy = Model.deepClone(source);
    copy.id = uniqueId(`${source.id}-copy`, candidate.nodes.map((node) => node.id));
    copy.label = `${source.label || source.id} copy`;
    copy.writes = [];
    candidate.nodes.push(copy);
    commitValidatedCandidate(
      candidate,
      `${source.label || source.id} duplicated safely.`,
      copy.id
    );
  }

  function deleteSelectedNode() {
    const node = state.nodes.find((item) => item.id === selectedNodeId);
    if (!node || state.nodes.length <= 1) {
      return;
    }
    if (Model.blockTypeForNode(node)) {
      removeBeginnerBlock(node.id);
      return;
    }
    if (!window.confirm(`Delete node "${node.id}" and its connected edges?`)) {
      return;
    }
    const candidate = Model.deepClone(state);
    candidate.nodes = candidate.nodes.filter((item) => item.id !== node.id);
    candidate.edges = candidate.edges.filter((edge) => (
      edge.from !== node.id && edge.to !== node.id && edge.failure_route !== node.id
    ));
    candidate.joins = candidate.joins
      .filter((join) => join.target !== node.id)
      .map((join) => ({ ...join, inputs: join.inputs.filter((id) => id !== node.id) }))
      .filter((join) => join.inputs.length >= 2);
    candidate.entry_nodes = candidate.entry_nodes.filter((id) => id !== node.id);
    candidate.terminal_nodes = candidate.terminal_nodes.filter((id) => id !== node.id);
    if (!candidate.entry_nodes.length) {
      candidate.entry_nodes = [candidate.nodes[0].id];
    }
    if (!candidate.terminal_nodes.length) {
      candidate.terminal_nodes = [candidate.nodes[candidate.nodes.length - 1].id];
    }
    if (candidate.team_command.activation_gate === node.id) {
      candidate.team_command.activation_gate = candidate.nodes.find(
        (item) => item.kind === 'human-gate'
      )?.id || '';
    }
    commitValidatedCandidate(
      candidate,
      `${node.label || node.id} deleted and the remaining graph revalidated.`,
      candidate.nodes[0]?.id || null
    );
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
    if (state.team_command.runtime_validation_node === oldId) {
      state.team_command.runtime_validation_node = newId;
    }
    if (state.team_command.adapter_readiness_node === oldId) {
      state.team_command.adapter_readiness_node = newId;
    }
    if (state.team_command.integration?.graph_node_id === oldId) {
      state.team_command.integration.graph_node_id = newId;
    }
    state.team_command.workstreams?.forEach((stream) => {
      if (stream.graph_node_id === oldId) {
        stream.graph_node_id = newId;
      }
    });
    state.team_command.routing?.route_requests?.forEach((request) => {
      if (request.graph_node_id === oldId) {
        request.graph_node_id = newId;
      }
    });
  }

  function addEdge() {
    if (state.nodes.length < 2) {
      showToast('Add at least two nodes before adding an edge.', true);
      return;
    }
    const source = state.nodes[0];
    const target = state.nodes.find((node) => node.id !== source.id);
    const payload = source.outputs[0] || 'payload';
    const candidate = Model.deepClone(state);
    candidate.edges.push({
      from: source.id,
      to: target.id,
      type: 'data',
      payload_schema: payload,
      condition: 'verified',
      failure_route: ''
    });
    commitValidatedCandidate(
      candidate,
      `Connected ${source.id} to ${target.id} and revalidated the graph.`,
      target.id
    );
  }

  function addJoin() {
    const incoming = new Map(state.nodes.map((node) => [node.id, []]));
    state.edges.forEach((edge) => {
      if (incoming.has(edge.to) && ['data', 'control', 'verification'].includes(edge.type)) {
        incoming.get(edge.to).push(edge.from);
      }
    });
    const targetCandidate = state.nodes.find((node) => (
      incoming.get(node.id).length > 1
      && !state.joins.some((join) => join.target === node.id)
    ));
    if (!targetCandidate) {
      showToast('No block currently has multiple unmerged inputs. Nothing was changed.', true);
      return;
    }
    const target = targetCandidate;
    const inputs = incoming.get(target.id) || [];
    const candidate = Model.deepClone(state);
    candidate.joins.push({
      id: uniqueId('new-join', candidate.joins.map((join) => join.id)),
      target: target.id,
      mode: 'all',
      inputs,
      verifier: 'All declared input receipts are fresh and valid.',
      quorum: null
    });
    commitValidatedCandidate(
      candidate,
      `Added an explicit merge for ${target.id} and revalidated the graph.`,
      target.id
    );
  }

  function addWorkstream() {
    showToast(
      'Workstreams come from reachable Work blocks. Add the Graph node, workstream, and capability route together through a validated contract transaction.',
      true
    );
  }

  function renderWorkstreamEditor(stream) {
    elements.workstreamEditor.replaceChildren();
    const definitions = [
      ['ID', 'id', {}],
      ['Graph node ID', 'graph_node_id', {}],
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
    showToast(
      'Remove the matching Work block, Graph edges, workstream, route request, merge input, and integration order in one validated transaction.',
      true
    );
  }

  function resetDraft() {
    if (!window.confirm('Reset the entire local draft to the canonical blueprint? Export first if you need a recovery copy.')) {
      return;
    }
    state = Model.deepClone(seed);
    ensureDynamicBlueprint(state);
    undoHistory = [];
    redoHistory = [];
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

  function compileTaskPreview() {
    ensureDynamicBlueprint(state);
    const dynamic = state.task_spec;
    const assetRefs = Array.isArray(dynamic.input_asset_refs)
      ? dynamic.input_asset_refs.filter((item) => String(item).trim())
      : [];
    const deliverables = Array.isArray(dynamic.deliverables)
      ? dynamic.deliverables.filter((item) => String(item).trim())
      : [];
    const ready = String(state.objective || '').trim()
      && String(dynamic.template_id || '').trim()
      && assetRefs.length > 0
      && deliverables.length > 0;
    dynamic.compiler_state = ready ? 'PREVIEW_READY' : 'NEEDS_INPUT';
    dynamic.classification = {
      ...dynamic.classification,
      status: ready ? 'CLASSIFIED' : 'NEEDS_INPUT',
      confidence: ready ? 1 : 0,
      topology: ready ? 'diamond' : (dynamic.classification?.topology || 'diamond'),
      evidence: ready
        ? [
          `Template ${dynamic.template_id}@${dynamic.template_version || '1.0.0'} selected by the local catalog.`,
          `${assetRefs.length} bounded asset reference(s) enumerated before compilation.`,
          'Runtime graph expansion remains disabled.'
        ]
        : []
    };
    dynamic.last_compile = {
      status: dynamic.compiler_state,
      at: new Date().toISOString(),
      input_count: assetRefs.length,
      deliverable_count: deliverables.length,
      max_nodes: Number(dynamic.budgets?.max_nodes) || DYNAMIC_BLUEPRINT_DEFAULTS.budgets.max_nodes,
      graph_revision: Number(state.blueprint.revision || 1)
    };
    mutate('structure', 'all');
    if (ready) {
      showToast('Task preview compiled. Review the finite Graph, then confirm structure before allocation.', false);
    } else {
      showToast('Task preview needs an objective, one bounded asset reference, and one deliverable.', true);
    }
  }

  function compileAdmissionPreview() {
    ensureDynamicBlueprint(state);
    const result = calculateGraphAdmission();
    state.task_spec.admission.status = result.status;
    state.task_spec.admission.last_receipt = {
      schema_version: 'graph-admission-preview/1.0',
      graph_id: state.graph_id,
      graph_revision: Number(state.blueprint.revision || 1),
      evaluated_at: new Date().toISOString(),
      ...result
    };
    mutate('structure', 'all');
    const label = admissionStatusLabel(result.status);
    showToast(
      result.status === 'ADMIT'
        ? `Admission preview: ${label}. Confirm the Graph before allocating agents.`
        : `Admission preview: ${label}. Resolve the listed gate conditions before allocation.`,
      result.status !== 'ADMIT'
    );
  }

  function invalidateDynamicPreview(path) {
    if (!String(path || '').startsWith('task_spec.')) {
      return;
    }
    const dynamic = ensureDynamicBlueprint(state).task_spec;
    dynamic.compiler_state = 'NEEDS_INPUT';
    dynamic.last_compile = null;
    dynamic.classification = {
      ...dynamic.classification,
      status: 'NEEDS_INPUT',
      confidence: 0,
      evidence: []
    };
    dynamic.admission = {
      ...DYNAMIC_BLUEPRINT_DEFAULTS.admission,
      ...(dynamic.admission || {}),
      status: 'NEEDS_INPUT',
      last_receipt: null
    };
  }

  function handleBoundInput(event) {
    const control = event.target.closest('[data-bind], [data-bind-list]');
    if (!control) {
      return;
    }
    const path = control.dataset.bind || control.dataset.bindList;
    let value = control.dataset.bindList ? listFromText(control.value) : control.value;
    if (!control.dataset.bindList && control.dataset.number === 'true') {
      const parsed = Number.parseInt(control.value, 10);
      value = Number.isFinite(parsed) ? parsed : 0;
    }
    invalidateDynamicPreview(path);
    setPath(state, path, value);
    mutate(control.dataset.scope || 'structure', 'status');
  }

  function handleBoundChange(event) {
    const control = event.target.closest('[data-bind], [data-bind-list]');
    if (!control || (control.tagName !== 'SELECT' && control.dataset.dynamicChange !== 'true')) {
      return;
    }
    handleBoundInput(event);
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

  function handleAdapterInput(event) {
    const control = event.target.closest('[data-adapter-index][data-adapter-field]');
    if (!control) {
      return;
    }
    const adapter = state.team_command.agent_roster?.adapters?.[
      Number(control.dataset.adapterIndex)
    ];
    if (!adapter) {
      return;
    }
    const field = control.dataset.adapterField;
    let value;
    if (control.type === 'checkbox') {
      value = control.checked;
    } else if (control.type === 'number') {
      value = Number.parseInt(control.value, 10);
    } else if (control.dataset.list === 'true') {
      value = listFromText(control.value);
    } else {
      value = control.value;
    }
    adapter[field] = value;
    mutate('team', 'team');
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
    if (elements.body.dataset.editorMode === 'blocks') {
      const beginnerFields = new Set([
        'label',
        'summary',
        'verifier',
        'timeout_seconds',
        'max_attempts',
        'compensation'
      ]);
      if (!beginnerFields.has(field)) {
        renderNodeInspector();
        showToast(
          currentLanguage === 'zh-CN'
            ? '请切换到高级模式编辑技术契约字段。'
            : 'Switch to Advanced mode to edit technical contract fields.',
          true
        );
        return;
      }
      const normalizedValue = typeof value === 'string' ? value.trim() : value;
      if (node[field] === normalizedValue) {
        return;
      }
      const result = Model.applyBlockTransaction(state, {
        schema_version: '1.0',
        transaction_id: `update-${selectedNodeId}-${field}-r${Number(state.blueprint.revision || 1) + 1}`,
        operations: [{
          op: 'update-block',
          block_id: selectedNodeId,
          patch: { [field]: value }
        }]
      });
      const committed = commitBlockResult(
        result,
        currentLanguage === 'zh-CN'
          ? '积木设置已作为一次经过验证、可撤销的更改保存。'
          : 'Block setting saved as one validated, undoable change.',
        { selectedNodeId, focusField: field }
      );
      if (!committed) {
        renderNodeInspector();
        requestAnimationFrame(() => {
          const freshControl = elements.nodeInspectorBody.querySelector(
            `[data-node-field="${CSS.escape(field)}"]`
          );
          if (!freshControl) {
            return;
          }
          const errorId = `block-field-error-${selectedNodeId}-${field}`
            .replace(/[^a-zA-Z0-9_-]/g, '-');
          const error = createElement(
            'small',
            'field-error',
            result.errors?.[0]?.message
              || (currentLanguage === 'zh-CN' ? '此更改未应用。' : 'This change was not applied.')
          );
          error.id = errorId;
          freshControl.setAttribute('aria-invalid', 'true');
          freshControl.setAttribute('aria-describedby', errorId);
          freshControl.closest('label')?.append(error);
          freshControl.focus({ preventScroll: true });
          scrollElementIntoView(freshControl, 'center');
        });
      }
      return;
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

  function openPreviewNode(card) {
    selectedNodeId = card.dataset.previewNodeId;
    setActiveView('graph', true);
    renderGraphViews();
    renderNodeInspector();
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
    elements.blockModeToggle.addEventListener('click', () => setEditorMode('blocks', true));
    elements.advancedModeToggle.addEventListener('click', () => setEditorMode('advanced', true));
    elements.blockPalette.addEventListener('click', (event) => {
      const button = event.target.closest('[data-block-template]');
      if (button) {
        addBeginnerBlock(button.dataset.blockTemplate);
      }
    });
    elements.starterRecipeGrid.addEventListener('click', (event) => {
      const button = event.target.closest('[data-block-recipe]');
      if (button) {
        applyBeginnerRecipe(button.dataset.blockRecipe);
      }
    });
    elements.blockWorkspace.addEventListener('click', (event) => {
      const action = event.target.closest('[data-block-action]');
      if (!action) {
        return;
      }
      const blockId = action.dataset.blockId;
      if (action.dataset.blockAction === 'remove') {
        removeBeginnerBlock(blockId);
        return;
      }
      if (action.dataset.blockAction === 'configure') {
        selectedNodeId = blockId;
        renderBlockWorkspace();
        renderNodeInspector();
        scrollElementIntoView(elements.nodeInspector, 'start');
        requestAnimationFrame(() => {
          elements.nodeInspectorBody.querySelector('[data-node-field="label"]')?.focus();
        });
      }
    });
    elements.blockIssueList.addEventListener('click', (event) => {
      const issueButton = event.target.closest('[data-block-issue]');
      if (!issueButton) {
        return;
      }
      const issue = validation.errors.find((item) => (
        item.code === issueButton.dataset.blockIssue
        && item.path === issueButton.dataset.path
      ));
      const mappedIds = nodeIdsForIssue(issue || {
        code: issueButton.dataset.blockIssue,
        path: issueButton.dataset.path,
        message: issueButton.textContent
      });
      if (mappedIds.length) {
        selectedNodeId = mappedIds[0];
        renderBlockWorkspace();
        renderNodeInspector();
        scrollElementIntoView(elements.nodeInspector, 'start');
        const match = /^nodes\[\d+]\.([a-z_]+)/.exec(issueButton.dataset.path || '');
        requestAnimationFrame(() => {
          const field = match
            ? elements.nodeInspectorBody.querySelector(
              `[data-node-field="${CSS.escape(match[1])}"]`
            )
            : null;
          (field || elements.nodeInspector)?.focus({ preventScroll: true });
        });
      } else {
        elements.validationBanner.focus();
      }
    });
    elements.blockCompileButton.addEventListener('click', () => {
      updateDerivedStatus();
      renderBlockWorkspace();
      if (validation.errors.length) {
        elements.blockIssueList.querySelector('button')?.focus();
        showToast(`${validation.errors.length} block issue(s) need attention.`, true);
      } else {
        showToast('Every block compiles to a valid canonical graph. You can review and confirm it.', false);
      }
    });
    elements.undoButton.addEventListener('click', () => restoreBlockHistory('undo'));
    elements.redoButton.addEventListener('click', () => restoreBlockHistory('redo'));
    document.querySelectorAll('[data-confirm-trigger], #confirmButton').forEach((button) => {
      button.addEventListener('click', openConfirmationDialog);
    });
    elements.architectureDiagram.addEventListener('click', (event) => {
      const target = event.target.closest('[data-map-view]');
      if (!target) {
        return;
      }
      const workflowCard = target.closest('.workflow-card');
      if (workflowCard) {
        const cards = Array.from(elements.architectureDiagram.querySelectorAll('.workflow-card'));
        setArchitectureStep(cards.indexOf(workflowCard));
      }
      openArchitectureTarget(target);
    });
    elements.architectureDiagram.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
        return;
      }
      const target = event.target.closest('[data-map-view]');
      if (!target) {
        return;
      }
      event.preventDefault();
      openArchitectureTarget(target);
    });
    elements.architectureAnimationToggle.addEventListener('click', () => {
      const paused = elements.architectureDiagram.classList.toggle('paused');
      if (paused) {
        clearInterval(architectureLoopTimer);
      } else {
        startArchitectureLoop();
      }
      updateArchitectureControls();
    });
    elements.architectureReferenceToggle.addEventListener('click', () => {
      elements.architectureDiagram.classList.toggle('show-reference');
      updateArchitectureControls();
    });
    elements.architectureFullscreenToggle.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === elements.architectureDiagramViewport) {
          await document.exitFullscreen();
        } else {
          await elements.architectureDiagramViewport.requestFullscreen();
        }
      } catch (error) {
        showToast(`Full-screen mode is unavailable: ${error.message}`, true);
      }
      updateArchitectureControls();
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
      renderBlockWorkspace();
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
    elements.compileTaskPreviewButton.addEventListener('click', compileTaskPreview);
    elements.admissionPreviewButton.addEventListener('click', compileAdmissionPreview);

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
    document.addEventListener('change', handleBoundChange);
    document.addEventListener('input', handleTeamInput);
    document.addEventListener('change', handleAdapterInput);
    document.addEventListener('change', handlePresentationChange);
    elements.nodeInspectorBody.addEventListener('change', handleNodeInspectorChange);
    elements.edgeTableBody.addEventListener('change', handleEdgeChange);
    elements.joinEditor.addEventListener('change', handleJoinChange);
    elements.workstreamEditor.addEventListener('change', handleWorkstreamChange);
    document.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.matches('input, textarea, select')
        || target.isContentEditable
      )) {
        return;
      }
      event.preventDefault();
      restoreBlockHistory(event.shiftKey ? 'redo' : 'undo');
    });

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
      openPreviewNode(card);
    });
    elements.missionGraphStage.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') {
        return;
      }
      const card = event.target.closest('[data-preview-node-id]');
      if (!card) {
        return;
      }
      event.preventDefault();
      openPreviewNode(card);
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
      resizeTimer = setTimeout(() => {
        renderGraphViews();
        fitArchitectureDiagram();
      }, 120);
    }, { passive: true });
    document.addEventListener('fullscreenchange', () => {
      fitArchitectureDiagram();
      updateArchitectureControls();
    });
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
    ensureDynamicBlueprint(state);
    selectedNodeId = state.nodes[0]?.id || null;
    updateDerivedStatus();
    bindEvents();
    applyLanguage(resolveInitialLanguage());
    renderAll();
    const initialView = window.location.hash.replace('#', '') || 'mission';
    setActiveView(initialView, false);
    requestAnimationFrame(fitArchitectureDiagram);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      startArchitectureLoop();
    } else {
      elements.architectureDiagram.classList.add('paused');
      setArchitectureStep(0);
      updateArchitectureControls();
    }
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
