const SVG_NS = "http://www.w3.org/2000/svg";

const COLORS = [
  "#ccfbf1",
  "#dbeafe",
  "#fef3c7",
  "#ffe4e6",
  "#ede9fe",
  "#dcfce7",
  "#fae8ff",
  "#e0f2fe",
  "#ffedd5",
  "#f8fafc",
];

const TYPE_DEFAULTS = {
  start: { label: "Start", width: 150, height: 56, color: "#ccfbf1" },
  process: { label: "Process", width: 190, height: 78, color: "#dbeafe" },
  decision: { label: "Decision?", width: 170, height: 112, color: "#fef3c7" },
  data: { label: "Data", width: 190, height: 78, color: "#ede9fe" },
  end: { label: "End", width: 150, height: 56, color: "#ffe4e6" },
};

const TYPE_LABELS = {
  start: "Start",
  process: "Process",
  decision: "Decision",
  data: "Data",
  end: "End",
};

const elements = {
  svg: document.getElementById("flowSvg"),
  edgeLayer: document.getElementById("edgeLayer"),
  nodeLayer: document.getElementById("nodeLayer"),
  inspector: document.getElementById("inspectorContent"),
  status: document.getElementById("statusText"),
  moveModeBtn: document.getElementById("moveModeBtn"),
  connectModeBtn: document.getElementById("connectModeBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  layoutBtn: document.getElementById("layoutBtn"),
  exportSvgBtn: document.getElementById("exportSvgBtn"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportMermaidBtn: document.getElementById("exportMermaidBtn"),
  importInput: document.getElementById("importInput"),
  clearBtn: document.getElementById("clearBtn"),
  zoomRange: document.getElementById("zoomRange"),
  fitBtn: document.getElementById("fitBtn"),
  undoBtn: document.getElementById("undoBtn"),
  redoBtn: document.getElementById("redoBtn"),
};

const state = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  connectMode: false,
  pendingSourceId: null,
  dragging: null,
  nextNodeId: 1,
  nextEdgeId: 1,
  zoom: 1,
  history: [],
  historyIndex: -1,
};

function createSvgElement(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, value);
  }
  return element;
}

function cloneDiagram() {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges),
    nextNodeId: state.nextNodeId,
    nextEdgeId: state.nextEdgeId,
  };
}

function restoreDiagram(snapshot) {
  state.nodes = structuredClone(snapshot.nodes);
  state.edges = structuredClone(snapshot.edges);
  state.nextNodeId = snapshot.nextNodeId;
  state.nextEdgeId = snapshot.nextEdgeId;
  state.selectedNodeId = null;
  state.selectedEdgeId = null;
  state.pendingSourceId = null;
  state.dragging = null;
  render();
}

function commitHistory() {
  const snapshot = cloneDiagram();
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
  updateUndoRedo();
}

function updateUndoRedo() {
  elements.undoBtn.disabled = state.historyIndex <= 0;
  elements.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex -= 1;
  restoreDiagram(state.history[state.historyIndex]);
  updateUndoRedo();
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex += 1;
  restoreDiagram(state.history[state.historyIndex]);
  updateUndoRedo();
}

function makeNode(type, x, y, label) {
  const defaults = TYPE_DEFAULTS[type];
  const id = `n${state.nextNodeId++}`;
  return {
    id,
    type,
    label: label ?? defaults.label,
    x,
    y,
    width: defaults.width,
    height: defaults.height,
    color: defaults.color,
  };
}

function makeEdge(source, target, label = "") {
  const id = `e${state.nextEdgeId++}`;
  return { id, source, target, label };
}

function loadSample() {
  state.nodes = [
    { id: "n1", type: "start", label: "Request received", x: 170, y: 130, width: 170, height: 56, color: "#ccfbf1" },
    { id: "n2", type: "process", label: "Validate input", x: 420, y: 130, width: 190, height: 78, color: "#dbeafe" },
    { id: "n3", type: "decision", label: "Complete?", x: 680, y: 130, width: 170, height: 112, color: "#fef3c7" },
    { id: "n4", type: "process", label: "Ask for fixes", x: 680, y: 330, width: 190, height: 78, color: "#ffedd5" },
    { id: "n5", type: "data", label: "Save record", x: 950, y: 130, width: 190, height: 78, color: "#ede9fe" },
    { id: "n6", type: "process", label: "Notify reviewer", x: 1190, y: 130, width: 190, height: 78, color: "#dcfce7" },
    { id: "n7", type: "decision", label: "Approved?", x: 1190, y: 330, width: 170, height: 112, color: "#fef3c7" },
    { id: "n8", type: "end", label: "Closed", x: 950, y: 520, width: 150, height: 56, color: "#ffe4e6" },
  ];
  state.edges = [
    { id: "e1", source: "n1", target: "n2", label: "" },
    { id: "e2", source: "n2", target: "n3", label: "" },
    { id: "e3", source: "n3", target: "n5", label: "Yes" },
    { id: "e4", source: "n3", target: "n4", label: "No" },
    { id: "e5", source: "n4", target: "n2", label: "" },
    { id: "e6", source: "n5", target: "n6", label: "" },
    { id: "e7", source: "n6", target: "n7", label: "" },
    { id: "e8", source: "n7", target: "n8", label: "Yes" },
    { id: "e9", source: "n7", target: "n4", label: "No" },
  ];
  state.nextNodeId = 9;
  state.nextEdgeId = 10;
  state.selectedNodeId = null;
  state.selectedEdgeId = null;
  state.pendingSourceId = null;
  commitHistory();
  render();
}

function getSvgPoint(event) {
  const point = elements.svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(elements.svg.getScreenCTM().inverse());
}

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getEdge(id) {
  return state.edges.find((edge) => edge.id === id);
}

function setSelectedNode(id) {
  state.selectedNodeId = id;
  state.selectedEdgeId = null;
  render();
}

function setSelectedEdge(id) {
  state.selectedEdgeId = id;
  state.selectedNodeId = null;
  render();
}

function clearSelection() {
  state.selectedNodeId = null;
  state.selectedEdgeId = null;
  render();
}

function addNode(type) {
  const position = nextNodePosition();
  const node = makeNode(type, position.x, position.y);
  state.nodes.push(node);
  state.selectedNodeId = node.id;
  state.selectedEdgeId = null;
  commitHistory();
  render();
}

function nextNodePosition() {
  const offset = state.nodes.length % 8;
  return {
    x: 220 + offset * 36,
    y: 160 + offset * 32,
  };
}

function toggleConnectMode(force) {
  state.connectMode = typeof force === "boolean" ? force : !state.connectMode;
  if (!state.connectMode) {
    state.pendingSourceId = null;
  }
  elements.moveModeBtn.classList.toggle("active", !state.connectMode);
  elements.connectModeBtn.classList.toggle("active", state.connectMode);
  renderStatus();
}

function handleConnectClick(nodeId) {
  if (!state.pendingSourceId) {
    state.pendingSourceId = nodeId;
    state.selectedNodeId = nodeId;
    state.selectedEdgeId = null;
    render();
    return;
  }

  if (state.pendingSourceId === nodeId) {
    state.pendingSourceId = null;
    render();
    return;
  }

  const duplicate = state.edges.some(
    (edge) => edge.source === state.pendingSourceId && edge.target === nodeId,
  );
  if (!duplicate) {
    state.edges.push(makeEdge(state.pendingSourceId, nodeId));
    commitHistory();
  }
  state.pendingSourceId = null;
  render();
}

function deleteSelected() {
  if (state.selectedNodeId) {
    const id = state.selectedNodeId;
    state.nodes = state.nodes.filter((node) => node.id !== id);
    state.edges = state.edges.filter((edge) => edge.source !== id && edge.target !== id);
    state.selectedNodeId = null;
    state.pendingSourceId = state.pendingSourceId === id ? null : state.pendingSourceId;
    commitHistory();
    render();
    return;
  }

  if (state.selectedEdgeId) {
    const id = state.selectedEdgeId;
    state.edges = state.edges.filter((edge) => edge.id !== id);
    state.selectedEdgeId = null;
    commitHistory();
    render();
  }
}

function clearDiagram() {
  state.nodes = [];
  state.edges = [];
  state.selectedNodeId = null;
  state.selectedEdgeId = null;
  state.pendingSourceId = null;
  state.nextNodeId = 1;
  state.nextEdgeId = 1;
  commitHistory();
  render();
}

function render() {
  renderEdges();
  renderNodes();
  renderInspector();
  renderStatus();
  updateUndoRedo();
  elements.deleteBtn.disabled = !state.selectedNodeId && !state.selectedEdgeId;
}

function renderCanvasOnly() {
  renderEdges();
  renderNodes();
  renderStatus();
  elements.deleteBtn.disabled = !state.selectedNodeId && !state.selectedEdgeId;
}

function renderStatus() {
  if (state.connectMode && state.pendingSourceId) {
    const node = getNode(state.pendingSourceId);
    elements.status.textContent = `Connect: ${node?.label || "source"}`;
    return;
  }

  if (state.selectedNodeId) {
    const node = getNode(state.selectedNodeId);
    elements.status.textContent = `${TYPE_LABELS[node.type]} selected`;
    return;
  }

  if (state.selectedEdgeId) {
    elements.status.textContent = "Connector selected";
    return;
  }

  elements.status.textContent = `${state.nodes.length} nodes, ${state.edges.length} connectors`;
}

function renderNodes() {
  elements.nodeLayer.replaceChildren();

  for (const node of state.nodes) {
    const group = createSvgElement("g", {
      class: `node-group${node.id === state.selectedNodeId ? " selected" : ""}`,
      transform: `translate(${node.x} ${node.y})`,
      "data-node-id": node.id,
      tabindex: "0",
      role: "button",
      "aria-label": `${TYPE_LABELS[node.type]} ${node.label}`,
    });

    group.appendChild(createNodeShape(node));
    group.appendChild(createNodeText(node));

    if (node.id === state.pendingSourceId) {
      group.appendChild(
        createSvgElement("circle", {
          r: Math.max(node.width, node.height) / 2 + 12,
          fill: "none",
          stroke: "#0f766e",
          "stroke-width": "2",
          "stroke-dasharray": "8 8",
        }),
      );
    }

    group.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (state.connectMode) {
        handleConnectClick(node.id);
        return;
      }

      const pointer = getSvgPoint(event);
      state.dragging = {
        id: node.id,
        offsetX: pointer.x - node.x,
        offsetY: pointer.y - node.y,
        moved: false,
      };
      group.setPointerCapture(event.pointerId);
      setSelectedNode(node.id);
    });

    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!state.connectMode) setSelectedNode(node.id);
    });

    elements.nodeLayer.appendChild(group);
  }
}

function createNodeShape(node) {
  const common = {
    class: "node-shape",
    fill: node.color,
  };

  if (node.type === "decision") {
    return createSvgElement("polygon", {
      ...common,
      points: `0 ${-node.height / 2} ${node.width / 2} 0 0 ${node.height / 2} ${-node.width / 2} 0`,
    });
  }

  if (node.type === "data") {
    const skew = Math.min(28, node.width * 0.16);
    return createSvgElement("polygon", {
      ...common,
      points: `${-node.width / 2 + skew} ${-node.height / 2} ${node.width / 2} ${-node.height / 2} ${node.width / 2 - skew} ${node.height / 2} ${-node.width / 2} ${node.height / 2}`,
    });
  }

  const radius = node.type === "start" || node.type === "end" ? node.height / 2 : 8;
  return createSvgElement("rect", {
    ...common,
    x: -node.width / 2,
    y: -node.height / 2,
    width: node.width,
    height: node.height,
    rx: radius,
    ry: radius,
  });
}

function createNodeText(node) {
  const text = createSvgElement("text", {
    class: "node-label",
    x: 0,
    y: 0,
  });

  const lineHeight = 19;
  const maxWidth = node.type === "decision" ? node.width * 0.54 : node.width - 28;
  const lines = wrapLabel(node.label, maxWidth);
  const startY = -((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    const tspan = createSvgElement("tspan", {
      x: 0,
      y: startY + index * lineHeight,
    });
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  return text;
}

function wrapLabel(label, maxWidth) {
  const text = String(label || "").trim() || " ";
  const maxChars = Math.max(6, Math.floor(maxWidth / 8.2));
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = splitLongWord(word, maxChars, lines);
      continue;
    }

    if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = splitLongWord(word, maxChars, lines);
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function splitLongWord(word, maxChars, lines) {
  if (word.length <= maxChars) return word;
  let rest = word;
  while (rest.length > maxChars) {
    lines.push(rest.slice(0, maxChars));
    rest = rest.slice(maxChars);
  }
  return rest;
}

function renderEdges() {
  elements.edgeLayer.replaceChildren();

  for (const edge of state.edges) {
    const source = getNode(edge.source);
    const target = getNode(edge.target);
    if (!source || !target) continue;

    const pathData = makeEdgePath(source, target);
    const group = createSvgElement("g", {
      class: `edge-group${edge.id === state.selectedEdgeId ? " selected" : ""}`,
      "data-edge-id": edge.id,
    });

    const hitPath = createSvgElement("path", {
      class: "edge-hit",
      d: pathData,
    });
    const path = createSvgElement("path", {
      class: "edge-path",
      d: pathData,
    });

    hitPath.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelectedEdge(edge.id);
    });
    path.addEventListener("click", (event) => {
      event.stopPropagation();
      setSelectedEdge(edge.id);
    });

    group.appendChild(hitPath);
    group.appendChild(path);

    if (edge.label) {
      group.appendChild(createEdgeLabel(source, target, edge.label));
    }

    elements.edgeLayer.appendChild(group);
  }
}

function makeEdgePath(source, target) {
  const start = anchorPoint(source, target);
  const end = anchorPoint(target, source);
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const bend = Math.min(160, Math.max(70, (dx + dy) * 0.26));

  if (dx > dy) {
    const c1x = start.x + Math.sign(end.x - start.x || 1) * bend;
    const c2x = end.x - Math.sign(end.x - start.x || 1) * bend;
    return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
  }

  const c1y = start.y + Math.sign(end.y - start.y || 1) * bend;
  const c2y = end.y - Math.sign(end.y - start.y || 1) * bend;
  return `M ${start.x} ${start.y} C ${start.x} ${c1y}, ${end.x} ${c2y}, ${end.x} ${end.y}`;
}

function anchorPoint(node, other) {
  const dx = other.x - node.x;
  const dy = other.y - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

  if (node.type === "decision") {
    const scale = 1 / (Math.abs(dx) / (node.width / 2) + Math.abs(dy) / (node.height / 2));
    return { x: node.x + dx * scale, y: node.y + dy * scale };
  }

  const scale = Math.min(
    Math.abs((node.width / 2) / (dx || 0.0001)),
    Math.abs((node.height / 2) / (dy || 0.0001)),
  );

  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

function createEdgeLabel(source, target, label) {
  const mid = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
  const group = createSvgElement("g");
  const width = Math.max(42, Math.min(180, label.length * 8 + 22));
  const rect = createSvgElement("rect", {
    class: "edge-label-bg",
    x: mid.x - width / 2,
    y: mid.y - 13,
    width,
    height: 26,
    rx: 7,
  });
  const text = createSvgElement("text", {
    class: "edge-label",
    x: mid.x,
    y: mid.y + 1,
  });
  text.textContent = label.slice(0, 22);
  group.appendChild(rect);
  group.appendChild(text);
  return group;
}

function renderInspector() {
  elements.inspector.replaceChildren();

  if (state.selectedNodeId) {
    renderNodeInspector(getNode(state.selectedNodeId));
    return;
  }

  if (state.selectedEdgeId) {
    renderEdgeInspector(getEdge(state.selectedEdgeId));
    return;
  }

  const stats = document.createElement("div");
  stats.className = "stats-grid";
  stats.innerHTML = `
    <div class="stat"><strong>${state.nodes.length}</strong><span>Nodes</span></div>
    <div class="stat"><strong>${state.edges.length}</strong><span>Connectors</span></div>
  `;
  elements.inspector.appendChild(stats);

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = "No selection";
  elements.inspector.appendChild(empty);
}

function renderNodeInspector(node) {
  if (!node) return;

  elements.inspector.appendChild(makeField("Label", "textarea", node.label, (value) => {
    node.label = value;
    renderCanvasOnly();
  }, commitHistory));

  const typeField = makeSelectField("Type", node.type, TYPE_LABELS, (value) => {
    node.type = value;
    if (!node.color || Object.values(TYPE_DEFAULTS).some((defaults) => defaults.color === node.color)) {
      node.color = TYPE_DEFAULTS[value].color;
    }
    render();
    commitHistory();
  });
  elements.inspector.appendChild(typeField);

  const colorTitle = document.createElement("div");
  colorTitle.className = "panel-title";
  colorTitle.textContent = "Color";
  elements.inspector.appendChild(colorTitle);
  elements.inspector.appendChild(makeSwatches(node));

  elements.inspector.appendChild(makeField("Width", "number", node.width, (value) => {
    node.width = clamp(Number(value) || TYPE_DEFAULTS[node.type].width, 110, 320);
    renderCanvasOnly();
  }, commitHistory));

  elements.inspector.appendChild(makeField("Height", "number", node.height, (value) => {
    node.height = clamp(Number(value) || TYPE_DEFAULTS[node.type].height, 46, 190);
    renderCanvasOnly();
  }, commitHistory));

  const actions = document.createElement("div");
  actions.className = "inspector-actions";
  const duplicate = document.createElement("button");
  duplicate.className = "wide-button primary-button";
  duplicate.type = "button";
  duplicate.textContent = "Duplicate";
  duplicate.addEventListener("click", () => duplicateNode(node.id));
  const remove = document.createElement("button");
  remove.className = "wide-button danger";
  remove.type = "button";
  remove.textContent = "Delete";
  remove.addEventListener("click", deleteSelected);
  actions.append(duplicate, remove);
  elements.inspector.appendChild(actions);
}

function renderEdgeInspector(edge) {
  if (!edge) return;
  const source = getNode(edge.source);
  const target = getNode(edge.target);

  const meta = document.createElement("div");
  meta.className = "empty-state";
  meta.textContent = `${source?.label || "Source"} -> ${target?.label || "Target"}`;
  elements.inspector.appendChild(meta);

  elements.inspector.appendChild(makeField("Label", "input", edge.label, (value) => {
    edge.label = value;
    renderCanvasOnly();
  }, commitHistory));

  const remove = document.createElement("button");
  remove.className = "wide-button danger";
  remove.type = "button";
  remove.textContent = "Delete";
  remove.addEventListener("click", deleteSelected);
  elements.inspector.appendChild(remove);
}

function makeField(label, type, value, onInput, onCommit) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const span = document.createElement("span");
  span.textContent = label;
  const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (type !== "textarea") input.type = type;
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));
  input.addEventListener("change", onCommit);
  wrapper.append(span, input);
  return wrapper;
}

function makeSelectField(label, value, options, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const span = document.createElement("span");
  span.textContent = label;
  const select = document.createElement("select");
  for (const [optionValue, optionLabel] of Object.entries(options)) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    select.appendChild(option);
  }
  select.addEventListener("change", () => onChange(select.value));
  wrapper.append(span, select);
  return wrapper;
}

function makeSwatches(node) {
  const grid = document.createElement("div");
  grid.className = "swatch-grid";
  for (const color of COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = `swatch${node.color === color ? " active" : ""}`;
    swatch.style.background = color;
    swatch.title = color;
    swatch.setAttribute("aria-label", `Set color ${color}`);
    swatch.addEventListener("click", () => {
      node.color = color;
      render();
      commitHistory();
    });
    grid.appendChild(swatch);
  }
  return grid;
}

function duplicateNode(id) {
  const source = getNode(id);
  if (!source) return;
  const copy = structuredClone(source);
  copy.id = `n${state.nextNodeId++}`;
  copy.x += 38;
  copy.y += 38;
  state.nodes.push(copy);
  state.selectedNodeId = copy.id;
  state.selectedEdgeId = null;
  commitHistory();
  render();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function autoLayout() {
  if (!state.nodes.length) return;

  const nodeIds = new Set(state.nodes.map((node) => node.id));
  const outgoing = new Map(state.nodes.map((node) => [node.id, []]));
  const indegree = new Map(state.nodes.map((node) => [node.id, 0]));

  for (const edge of state.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    outgoing.get(edge.source).push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
  }

  const queue = state.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  if (!queue.length) queue.push(state.nodes[0].id);

  const depth = new Map();
  for (const id of queue) depth.set(id, 0);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    const currentDepth = depth.get(id) ?? 0;
    for (const target of outgoing.get(id) || []) {
      const nextDepth = Math.max(depth.get(target) ?? 0, currentDepth + 1);
      if (!depth.has(target) || nextDepth > depth.get(target)) {
        depth.set(target, nextDepth);
        queue.push(target);
      }
    }
  }

  for (const node of state.nodes) {
    if (!depth.has(node.id)) {
      depth.set(node.id, Math.max(0, depth.size % 4));
    }
  }

  const layers = new Map();
  for (const node of state.nodes) {
    const layer = depth.get(node.id);
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer).push(node);
  }

  const sortedLayers = [...layers.keys()].sort((a, b) => a - b);
  for (const layer of sortedLayers) {
    const nodes = layers.get(layer);
    nodes.forEach((node, index) => {
      node.x = 150 + layer * 250;
      node.y = 130 + index * 145;
    });
  }

  commitHistory();
  render();
}

function setZoom(value) {
  state.zoom = value / 100;
  const width = 1600 / state.zoom;
  const height = 1000 / state.zoom;
  elements.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

function fitCanvas() {
  elements.zoomRange.value = "100";
  setZoom(100);
}

function exportJson() {
  const payload = JSON.stringify(cloneDiagram(), null, 2);
  downloadFile("flowchart.json", "application/json", payload);
}

function importJson(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("Invalid diagram");
      }
      state.nodes = parsed.nodes.map(normalizeNode);
      state.edges = parsed.edges.map(normalizeEdge);
      state.nextNodeId = parsed.nextNodeId || nextNumber(state.nodes, "n");
      state.nextEdgeId = parsed.nextEdgeId || nextNumber(state.edges, "e");
      state.selectedNodeId = null;
      state.selectedEdgeId = null;
      state.pendingSourceId = null;
      commitHistory();
      render();
    } catch (error) {
      window.alert("The selected file is not a valid flowchart JSON file.");
    }
  });
  reader.readAsText(file);
}

function normalizeNode(node) {
  const type = TYPE_DEFAULTS[node.type] ? node.type : "process";
  const defaults = TYPE_DEFAULTS[type];
  return {
    id: String(node.id),
    type,
    label: String(node.label || defaults.label),
    x: Number(node.x) || 160,
    y: Number(node.y) || 140,
    width: clamp(Number(node.width) || defaults.width, 80, 360),
    height: clamp(Number(node.height) || defaults.height, 42, 220),
    color: COLORS.includes(node.color) ? node.color : defaults.color,
  };
}

function normalizeEdge(edge) {
  return {
    id: String(edge.id),
    source: String(edge.source),
    target: String(edge.target),
    label: String(edge.label || ""),
  };
}

function nextNumber(items, prefix) {
  const max = items.reduce((value, item) => {
    const number = Number(String(item.id).replace(prefix, ""));
    return Number.isFinite(number) ? Math.max(value, number) : value;
  }, 0);
  return max + 1;
}

function exportSvg() {
  const clone = elements.svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", "1600");
  clone.setAttribute("height", "1000");
  const style = createSvgElement("style");
  style.textContent = `
    .node-shape{stroke:#2f3a48;stroke-width:2.2;vector-effect:non-scaling-stroke}
    .node-label{fill:#101828;font:700 16px system-ui,sans-serif;text-anchor:middle;dominant-baseline:middle}
    .edge-path{fill:none;stroke:#2f3a48;stroke-width:2.4;marker-end:url(#arrowMarker);vector-effect:non-scaling-stroke}
    .edge-label-bg{fill:#fff;stroke:#d8dee6;stroke-width:1.2}
    .edge-label{fill:#334155;font:700 13px system-ui,sans-serif;text-anchor:middle;dominant-baseline:central}
  `;
  clone.insertBefore(style, clone.firstChild);
  clone.querySelectorAll(".edge-hit").forEach((element) => element.remove());
  const source = new XMLSerializer().serializeToString(clone);
  downloadFile("flowchart.svg", "image/svg+xml", source);
}

function exportMermaid() {
  const lines = ["flowchart LR"];
  for (const node of state.nodes) {
    lines.push(`    ${node.id}${mermaidShape(node)}`);
  }
  for (const edge of state.edges) {
    const label = edge.label ? `|${escapeMermaid(edge.label)}|` : "";
    lines.push(`    ${edge.source} -->${label} ${edge.target}`);
  }
  downloadFile("flowchart.mmd", "text/plain", lines.join("\n"));
}

function mermaidShape(node) {
  const label = escapeMermaid(node.label);
  switch (node.type) {
    case "start":
    case "end":
      return `([${label}])`;
    case "decision":
      return `{${label}}`;
    case "data":
      return `[/${label}/]`;
    default:
      return `[${label}]`;
  }
}

function escapeMermaid(value) {
  return String(value).replaceAll('"', "'").replaceAll("\n", " ");
}

function downloadFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  document.querySelectorAll("[data-add-type]").forEach((button) => {
    button.addEventListener("click", () => addNode(button.dataset.addType));
  });

  elements.moveModeBtn.addEventListener("click", () => toggleConnectMode(false));
  elements.connectModeBtn.addEventListener("click", () => toggleConnectMode(true));
  elements.deleteBtn.addEventListener("click", deleteSelected);
  elements.sampleBtn.addEventListener("click", loadSample);
  elements.layoutBtn.addEventListener("click", autoLayout);
  elements.exportSvgBtn.addEventListener("click", exportSvg);
  elements.exportJsonBtn.addEventListener("click", exportJson);
  elements.exportMermaidBtn.addEventListener("click", exportMermaid);
  elements.clearBtn.addEventListener("click", clearDiagram);
  elements.fitBtn.addEventListener("click", fitCanvas);
  elements.undoBtn.addEventListener("click", undo);
  elements.redoBtn.addEventListener("click", redo);

  elements.importInput.addEventListener("change", () => {
    const [file] = elements.importInput.files;
    if (file) importJson(file);
    elements.importInput.value = "";
  });

  elements.zoomRange.addEventListener("input", () => setZoom(Number(elements.zoomRange.value)));

  elements.svg.addEventListener("pointerdown", (event) => {
    if (event.target === elements.svg || event.target.classList.contains("canvas-bg")) {
      if (state.connectMode) state.pendingSourceId = null;
      clearSelection();
    }
  });

  elements.svg.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const node = getNode(state.dragging.id);
    if (!node) return;
    const pointer = getSvgPoint(event);
    node.x = clamp(pointer.x - state.dragging.offsetX, 40, 1560);
    node.y = clamp(pointer.y - state.dragging.offsetY, 40, 960);
    state.dragging.moved = true;
    renderEdges();
    const group = elements.nodeLayer.querySelector(`[data-node-id="${node.id}"]`);
    group?.setAttribute("transform", `translate(${node.x} ${node.y})`);
  });

  elements.svg.addEventListener("pointerup", () => {
    if (state.dragging?.moved) commitHistory();
    state.dragging = null;
  });

  elements.svg.addEventListener("pointercancel", () => {
    state.dragging = null;
  });

  window.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    const editing = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
    if (editing) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      deleteSelected();
      event.preventDefault();
    }

    if (event.key === "Escape") {
      state.pendingSourceId = null;
      toggleConnectMode(false);
      clearSelection();
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.shiftKey ? redo() : undo();
      event.preventDefault();
    }
  });
}

bindEvents();
loadSample();
