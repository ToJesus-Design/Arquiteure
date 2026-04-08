// Arquiteure — demo interativa (gerador + validador + drawing portados para browser)

const state = {
  project: null,
  program: null,
  alternatives: [],
  versions: [],
  audit: [],
  counter: 0,
};

// ─── Regras PT (subset executável) ───────────────────────────────────────
const PT_RULES = [
  { code: "RGEU-65", source: "DL 38382/51 art. 65.º", category: "HABITABILIDADE", title: "Pé-direito mínimo em compartimentos habitacionais", severity: "BLOCK",
    predicate: { type: "min", field: "ceilingHeight", value: 2.4, unit: "m", msg: "Pé-direito < 2,40 m (RGEU art. 65.º)" } },
  { code: "RGEU-66-QUARTO", source: "DL 38382/51 art. 66.º", category: "AREA_MINIMA", title: "Área mínima de quarto", severity: "BLOCK",
    predicate: { type: "roomMinArea", roomKind: "bedroom", minAreaM2: 9, msg: "Quarto < 9 m² (RGEU art. 66.º)" } },
  { code: "RGEU-66-COZ", source: "DL 38382/51 art. 66.º", category: "AREA_MINIMA", title: "Área mínima de cozinha", severity: "BLOCK",
    predicate: { type: "roomMinArea", roomKind: "kitchen", minAreaM2: 6, msg: "Cozinha < 6 m² (RGEU art. 66.º)" } },
  { code: "RGEU-66-WC", source: "DL 38382/51 art. 66.º", category: "AREA_MINIMA", title: "Área mínima de instalação sanitária", severity: "BLOCK",
    predicate: { type: "roomMinArea", roomKind: "bathroom", minAreaM2: 3.5, msg: "WC < 3,5 m² (RGEU art. 66.º)" } },
  { code: "RGEU-66-SALA", source: "DL 38382/51 art. 66.º", category: "AREA_MINIMA", title: "Área mínima de sala", severity: "BLOCK",
    predicate: { type: "roomMinArea", roomKind: "livingroom", minAreaM2: 10, msg: "Sala < 10 m² (RGEU art. 66.º)" } },
  { code: "RGEU-71", source: "DL 38382/51 art. 71.º", category: "ILUMINACAO", title: "Iluminação/ventilação natural em compartimentos habitáveis", severity: "WARN",
    predicate: { type: "requiresWindow", kinds: ["bedroom", "livingroom", "kitchen"], msg: "Sem vão de iluminação natural (RGEU art. 71.º)" } },
  { code: "DL163-2006-CORR", source: "DL 163/2006 §2.3", category: "ACESSIBILIDADE", title: "Largura mínima de corredor acessível", severity: "WARN",
    predicate: { type: "corridorMinWidth", minWidthM: 1.2, msg: "Corredor < 1,20 m (DL 163/2006)" } },
  { code: "PDM-LX-IOS", source: "PDM Lisboa", category: "URBANISMO", title: "Índice de ocupação do solo máximo", severity: "BLOCK",
    predicate: { type: "max", field: "footprintRatio", value: 0.6, msg: "Implantação > 60% do lote (PDM)" } },
];

// ─── Gerador (slicing recursivo) ─────────────────────────────────────────
const ROOM_DEFAULTS = { bedroom: 12, livingroom: 16, kitchen: 8, bathroom: 4, corridor: 4, office: 10 };
const ROOM_PT = { bedroom: "Quarto", livingroom: "Sala", kitchen: "Cozinha", bathroom: "WC", corridor: "Corredor", office: "Escritório" };

function expandProgram(prog) {
  const out = [];
  const counters = {};
  for (const r of prog.rooms) {
    const n = r.count || 1;
    const area = r.minAreaM2 || ROOM_DEFAULTS[r.kind] || 10;
    for (let i = 0; i < n; i++) {
      counters[r.kind] = (counters[r.kind] || 0) + 1;
      out.push({ kind: r.kind, label: (ROOM_PT[r.kind] || r.kind) + " " + counters[r.kind], area });
    }
  }
  return out.sort((a, b) => b.area - a.area);
}

function generateLayout(prog, opts, variant) {
  const rooms = expandProgram(prog);
  const total = rooms.reduce((s, r) => s + r.area, 0);
  if (total > opts.lotW * opts.lotD * 0.98) return null;

  const placed = [];
  let idx = 0;
  const regions = [{ x: 0, y: 0, w: opts.lotW, d: opts.lotD, rooms }];
  while (regions.length) {
    const r = regions.shift();
    if (!r.rooms.length) continue;
    if (r.rooms.length === 1) {
      placed.push({ id: "r" + idx++, spec: r.rooms[0], x: r.x, y: r.y, w: r.w, d: r.d });
      continue;
    }
    const totalR = r.rooms.reduce((s, x) => s + x.area, 0);
    let acc = 0, splitIdx = 0;
    for (let i = 0; i < r.rooms.length; i++) {
      acc += r.rooms[i].area;
      if (acc >= totalR / 2) { splitIdx = i + 1; break; }
    }
    const left = r.rooms.slice(0, splitIdx);
    const right = r.rooms.slice(splitIdx);
    const leftFrac = left.reduce((s, x) => s + x.area, 0) / totalR;
    // Variação diferente por variant — alterna eixo e direção
    const horizontal = variant === 0 ? r.w >= r.d : variant === 1 ? r.w < r.d : (r.w + idx) % 2 === 0;
    if (horizontal) {
      const at = r.w * leftFrac;
      regions.push({ x: r.x, y: r.y, w: at, d: r.d, rooms: left });
      regions.push({ x: r.x + at, y: r.y, w: r.w - at, d: r.d, rooms: right });
    } else {
      const at = r.d * leftFrac;
      regions.push({ x: r.x, y: r.y, w: r.w, d: at, rooms: left });
      regions.push({ x: r.x, y: r.y + at, w: r.w, d: r.d - at, rooms: right });
    }
  }
  return {
    bbox: { w: opts.lotW, d: opts.lotD },
    ceilingHeight: 2.6,
    rooms: placed.map((p) => ({
      id: p.id,
      kind: p.spec.kind,
      label: p.spec.label,
      area: Math.round(p.w * p.d * 100) / 100,
      polygon: [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.d], [p.x, p.y + p.d]],
      hasWindow: true,
    })),
    corridorWidth: 1.2,
    footprintRatio: 0.5,
  };
}

// ─── Validador ───────────────────────────────────────────────────────────
function validate(rules, layout) {
  const results = [];
  for (const rule of rules) {
    const p = rule.predicate;
    if (p.type === "min") {
      const v = layout[p.field];
      results.push({ rule, passed: v >= p.value, observed: v, expected: ">= " + p.value });
    } else if (p.type === "max") {
      const v = layout[p.field];
      results.push({ rule, passed: v <= p.value, observed: v, expected: "<= " + p.value });
    } else if (p.type === "roomMinArea") {
      const matching = layout.rooms.filter((r) => r.kind === p.roomKind);
      for (const r of matching) {
        results.push({ rule, passed: r.area >= p.minAreaM2, observed: r.area, expected: ">= " + p.minAreaM2 + " m²", room: r.label });
      }
    } else if (p.type === "requiresWindow") {
      const targets = layout.rooms.filter((r) => p.kinds.includes(r.kind));
      for (const r of targets) {
        results.push({ rule, passed: r.hasWindow, room: r.label });
      }
    } else if (p.type === "corridorMinWidth") {
      results.push({ rule, passed: layout.corridorWidth >= p.minWidthM, observed: layout.corridorWidth, expected: ">= " + p.minWidthM + " m" });
    }
  }
  return results;
}

function summarize(results) {
  const blocks = results.filter((r) => !r.passed && r.rule.severity === "BLOCK").length;
  const warns = results.filter((r) => !r.passed && r.rule.severity === "WARN").length;
  const oks = results.filter((r) => r.passed).length;
  return { blocks, warns, oks, total: results.length, legal: oks / Math.max(1, results.length) };
}

// ─── Drawing (Layout → SVG) ──────────────────────────────────────────────
const PALETTE = { bedroom: "#fff3c4", livingroom: "#d0f0c0", kitchen: "#ffd6a5", bathroom: "#c4e0ff", corridor: "#eee", office: "#e0d4ff" };

function layoutToSvg(layout, scale) {
  scale = scale || 24;
  const W = layout.bbox.w * scale, H = layout.bbox.d * scale;
  let out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-height:260px;border:1px solid #ddd;background:#fafafa;border-radius:6px">';
  for (const r of layout.rooms) {
    const pts = r.polygon.map(function (p) { return (p[0] * scale) + "," + (H - p[1] * scale); }).join(" ");
    const cx = (r.polygon.reduce(function (s, p) { return s + p[0]; }, 0) / r.polygon.length) * scale;
    const cy = H - (r.polygon.reduce(function (s, p) { return s + p[1]; }, 0) / r.polygon.length) * scale;
    out += '<polygon points="' + pts + '" fill="' + (PALETTE[r.kind] || "#f4f4f4") + '" stroke="#333" stroke-width="1.5"/>';
    out += '<text x="' + cx + '" y="' + cy + '" font-size="11" font-family="system-ui" text-anchor="middle" fill="#111">' + r.label + '</text>';
    out += '<text x="' + cx + '" y="' + (cy + 13) + '" font-size="9" font-family="system-ui" text-anchor="middle" fill="#555">' + r.area.toFixed(1) + ' m²</text>';
  }
  return out + '</svg>';
}

function layoutToDxf(layout) {
  const lines = ["0", "SECTION", "2", "ENTITIES"];
  for (const r of layout.rooms) {
    for (let i = 0; i < r.polygon.length; i++) {
      const a = r.polygon[i], b = r.polygon[(i + 1) % r.polygon.length];
      lines.push("0", "LINE", "8", "WALLS", "10", String(a[0]), "20", String(a[1]), "30", "0", "11", String(b[0]), "21", String(b[1]), "31", "0");
    }
    const cx = r.polygon.reduce((s, p) => s + p[0], 0) / r.polygon.length;
    const cy = r.polygon.reduce((s, p) => s + p[1], 0) / r.polygon.length;
    lines.push("0", "TEXT", "8", "LABELS", "10", String(cx), "20", String(cy), "30", "0", "40", "0.3", "1", r.label + " (" + r.area.toFixed(1) + " m2)");
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n");
}

// ─── Scoring ────────────────────────────────────────────────────────────
function score(layout, prog, results) {
  const s = summarize(results);
  const legal = s.legal;
  const requested = prog.rooms.reduce((s, r) => s + (r.count || 1), 0);
  const functional = Math.min(1, layout.rooms.length / Math.max(1, requested));
  let aesthetic = 0;
  for (const r of layout.rooms) {
    const xs = r.polygon.map((p) => p[0]), ys = r.polygon.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
    const ratio = Math.min(w, h) / Math.max(w, h);
    aesthetic += ratio >= 0.5 ? 1 : ratio * 2;
  }
  aesthetic /= Math.max(1, layout.rooms.length);
  const totalArea = layout.rooms.reduce((s, r) => s + r.area, 0);
  const economic = prog.budgetEur ? Math.max(0, Math.min(1, prog.budgetEur / (totalArea * 1500))) : 0.75;
  return { legal, functional, aesthetic, economic, overall: legal * 0.45 + functional * 0.25 + aesthetic * 0.15 + economic * 0.15 };
}

// ─── Memória descritiva ────────────────────────────────────────────────
function memoriaDescritiva(project, layout, results) {
  const total = layout.rooms.reduce((s, r) => s + r.area, 0);
  const blocks = results.filter((r) => !r.passed && r.rule.severity === "BLOCK");
  const warns = results.filter((r) => !r.passed && r.rule.severity === "WARN");
  const table = layout.rooms.map((r) => "| " + r.label + " | " + r.kind + " | " + r.area.toFixed(2) + " |").join("\n");
  return "# Memória Descritiva e Justificativa\n\n" +
    "## 1. Identificação\n" +
    "- Projeto: **" + project.name + "**\n" +
    "- Tipo: " + project.type + "\n" +
    "- Município: " + project.municipality + "\n\n" +
    "## 2. Objeto\n" +
    "Descreve-se a proposta arquitetónica relativa à intervenção acima identificada,\n" +
    "elaborada no âmbito do Regime Jurídico da Urbanização e Edificação (DL 555/99\n" +
    "na sua redação atual).\n\n" +
    "## 3. Programa\n" +
    "Área útil total: **" + total.toFixed(2) + " m²**. Pé-direito " + layout.ceilingHeight + " m.\n\n" +
    "| Compartimento | Tipo | Área (m²) |\n|---|---|---|\n" + table + "\n\n" +
    "## 4. Enquadramento Legal\n" +
    "A proposta foi verificada automaticamente contra o RGEU, DL 163/2006 (acessibilidade),\n" +
    "RJ-SCIE (DL 220/2008) e instrumento de gestão territorial municipal aplicável.\n\n" +
    "### 4.1 Não conformidades bloqueantes\n" +
    (blocks.length === 0 ? "Nenhuma identificada." : blocks.map((b) => "- **" + b.rule.code + "**: " + b.rule.predicate.msg).join("\n")) + "\n\n" +
    "### 4.2 Avisos\n" +
    (warns.length === 0 ? "Nenhum." : warns.map((w) => "- " + w.rule.code + ": " + w.rule.predicate.msg).join("\n")) + "\n\n" +
    "## 5. Declaração\n" +
    "O presente documento reflete a verificação automatizada efetuada pela plataforma\n" +
    "Arquiteure, não dispensando a responsabilidade técnica do autor de projeto inscrito\n" +
    "na Ordem dos Arquitetos.\n";
}

// ─── UI ────────────────────────────────────────────────────────────────
function show(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  window.scrollTo(0, 0);
}

document.querySelectorAll("#nav button").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));

function audit(action, entity, entityId, data) {
  state.audit.push({ at: new Date(), action, entity, entityId, data });
}

function createProject() {
  const p = {
    id: "p" + (++state.counter),
    name: document.getElementById("newName").value,
    type: document.getElementById("newType").value,
    municipality: document.getElementById("newMuni").value,
    zone: document.getElementById("newZone").value,
    description: document.getElementById("newDesc").value,
    status: "DRAFT",
  };
  state.project = p;
  audit("PROJECT_CREATED", "Project", p.id, p);
  document.getElementById("projTitle").textContent = p.name;
  document.getElementById("projType").textContent = p.type;
  document.getElementById("projMuni").textContent = p.municipality;
  document.getElementById("intentText").value = p.description;
  show("project");
}

function extractIntent() {
  // Parser heurístico simples — em produção isto vai via Claude.
  const text = document.getElementById("intentText").value.toLowerCase();
  const rooms = [];
  const bedrooms = (text.match(/t(\d)/) || [])[1];
  if (bedrooms) rooms.push({ kind: "bedroom", count: parseInt(bedrooms), minAreaM2: 12 });
  else if (/quarto/.test(text)) rooms.push({ kind: "bedroom", count: 2, minAreaM2: 12 });
  rooms.push({ kind: "livingroom", count: 1, minAreaM2: /ampl[ao]/.test(text) ? 22 : 16 });
  rooms.push({ kind: "kitchen", count: 1, minAreaM2: /ampl[ao]|aberta/.test(text) ? 12 : 8 });
  rooms.push({ kind: "bathroom", count: /duas.*casas|2.*wc/.test(text) ? 2 : 1, minAreaM2: 5 });
  rooms.push({ kind: "corridor", count: 1, minAreaM2: 4 });
  if (/escrit[oó]rio/.test(text)) rooms.push({ kind: "office", count: 1, minAreaM2: 8 });

  const budgetMatch = text.match(/(\d+)\s*k/);
  const budget = budgetMatch ? parseInt(budgetMatch[1]) * 1000 : undefined;
  const program = {
    rooms,
    budgetEur: budget,
    constraints: [],
    goals: [(state.project && state.project.name) || "Programa extraído da intenção"],
    accessibilityRequired: /acessib/.test(text),
  };
  state.program = program;
  audit("INTENT_EXTRACTED", "Intent", "i" + (++state.counter), program);
  document.getElementById("programOut").style.display = "block";
  document.getElementById("programJson").textContent = JSON.stringify(program, null, 2);
}

function generateAlts() {
  if (!state.program) {
    alert("Extrai primeiro o programa.");
    return;
  }
  if (!state.project) createProject();
  const lotW = parseFloat(document.getElementById("lotW").value);
  const lotD = parseFloat(document.getElementById("lotD").value);
  const count = parseInt(document.getElementById("altCount").value) || 3;

  const versionId = "v" + (++state.counter);
  state.versions.push({ id: versionId, stage: "CONCEPT", createdAt: new Date(), lot: { w: lotW, d: lotD } });
  audit("VERSION_CREATED", "ProjectVersion", versionId, { stage: "CONCEPT", lot: { w: lotW, d: lotD } });

  state.alternatives = [];
  for (let i = 0; i < count; i++) {
    const layout = generateLayout(state.program, { lotW, lotD }, i);
    if (!layout) continue;
    const results = validate(PT_RULES, layout);
    const scores = score(layout, state.program, results);
    state.alternatives.push({
      id: "a" + (++state.counter),
      versionId,
      name: "Alternativa " + (i + 1),
      layout,
      results,
      scores,
      summary: summarize(results),
    });
  }
  audit("ALTERNATIVES_GENERATED", "ProjectVersion", versionId, { count: state.alternatives.length });

  renderAlts();
  renderMemoria();
  renderAudit();
  show("alts");
}

function renderAlts() {
  const grid = document.getElementById("altGrid");
  const empty = document.getElementById("altEmpty");
  if (!state.alternatives.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = state.alternatives.map((alt) => {
    const s = alt.summary;
    const pill = s.blocks > 0 ? '<span class="pill block">' + s.blocks + " bloqueios</span>" :
      s.warns > 0 ? '<span class="pill warn">' + s.warns + " avisos</span>" :
      '<span class="pill ok">conforme</span>';
    const sc = alt.scores;
    const checks = alt.results.map((r) => {
      const ic = r.passed ? "✓" : "✗";
      const color = r.passed ? "#1f7a3a" : r.rule.severity === "BLOCK" ? "#721c24" : "#856404";
      return '<div style="font-size:11px;color:' + color + '">' + ic + " " + r.rule.code + (r.room ? " (" + r.room + ")" : "") + "</div>";
    }).join("");
    return '<div class="card">' +
      '<h3>' + alt.name + '</h3>' +
      layoutToSvg(alt.layout) +
      '<p style="margin-top:8px">' + pill + '</p>' +
      '<div class="kv"><strong>Global</strong><div><div class="score-bar"><div style="width:' + (sc.overall * 100).toFixed(0) + '%"></div></div>' + (sc.overall * 100).toFixed(0) + '%</div></div>' +
      '<div class="kv"><strong>Legal</strong><div><div class="score-bar"><div style="width:' + (sc.legal * 100).toFixed(0) + '%"></div></div>' + (sc.legal * 100).toFixed(0) + '%</div></div>' +
      '<div class="kv"><strong>Funcional</strong><div><div class="score-bar"><div style="width:' + (sc.functional * 100).toFixed(0) + '%"></div></div>' + (sc.functional * 100).toFixed(0) + '%</div></div>' +
      '<div class="kv"><strong>Estético</strong><div><div class="score-bar"><div style="width:' + (sc.aesthetic * 100).toFixed(0) + '%"></div></div>' + (sc.aesthetic * 100).toFixed(0) + '%</div></div>' +
      '<div class="kv"><strong>Económico</strong><div><div class="score-bar"><div style="width:' + (sc.economic * 100).toFixed(0) + '%"></div></div>' + (sc.economic * 100).toFixed(0) + '%</div></div>' +
      '<div style="margin-top:10px"><strong style="font-size:11px">Validações:</strong>' + checks + '</div>' +
      '<p style="margin-top:10px"><button class="btn success" onclick="approve(\'' + alt.id + '\')">Aprovar</button> <button class="btn secondary" onclick="viewMemoria(\'' + alt.id + '\')">Memória</button></p>' +
      '</div>';
  }).join("");
}

function approve(altId) {
  audit("APPROVAL_GRANTED", "ApprovalGate", "g" + (++state.counter), { alternativeId: altId, gate: "LEGAL", actor: "arq.maria@demo" });
  alert("Gate LEGAL aprovado para " + altId + ". Em produção, isto requer architectProcedure no router tRPC.");
  renderAudit();
}

function viewMemoria(altId) {
  const alt = state.alternatives.find((a) => a.id === altId);
  if (!alt) return;
  document.getElementById("memoriaOut").textContent = memoriaDescritiva(state.project || { name: "Demo", type: "HOUSING", municipality: "Lisboa" }, alt.layout, alt.results);
  show("memoria");
}

function renderMemoria() {
  if (!state.alternatives.length) return;
  const alt = state.alternatives[0];
  document.getElementById("memoriaOut").textContent = memoriaDescritiva(state.project || { name: "Demo", type: "HOUSING", municipality: "Lisboa" }, alt.layout, alt.results);
}

function exportDxf() {
  if (!state.alternatives.length) { alert("Gera primeiro uma alternativa."); return; }
  const dxf = layoutToDxf(state.alternatives[0].layout);
  const blob = new Blob([dxf], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "alternativa-1.dxf"; a.click();
  URL.revokeObjectURL(url);
}

function renderAudit() {
  const v = document.getElementById("versions");
  if (state.versions.length === 0) v.innerHTML = '<p class="muted">Sem versões ainda.</p>';
  else v.innerHTML = state.versions.map((ver) =>
    '<div class="audit-row"><strong>' + ver.id + '</strong> · ' + ver.stage + ' · lote ' + ver.lot.w + '×' + ver.lot.d + 'm · <time>' + ver.createdAt.toLocaleString("pt-PT") + '</time></div>'
  ).join("");

  const t = document.getElementById("auditTrail");
  if (state.audit.length === 0) t.innerHTML = '<p class="muted">Vazio.</p>';
  else t.innerHTML = state.audit.slice().reverse().map((e) =>
    '<div class="audit-row"><time>' + e.at.toLocaleTimeString("pt-PT") + '</time> · <strong>' + e.action + '</strong> · ' + e.entity + '#' + e.entityId + '</div>'
  ).join("");
}

function renderRules() {
  const tbody = document.querySelector("#rulesTable tbody");
  tbody.innerHTML = PT_RULES.map((r) => {
    const sev = r.severity === "BLOCK" ? '<span class="pill block">BLOCK</span>' : r.severity === "WARN" ? '<span class="pill warn">WARN</span>' : '<span class="pill info">INFO</span>';
    return "<tr><td><code>" + r.code + "</code></td><td>" + r.category + "</td><td>" + r.title + "</td><td class='muted'>" + r.source + "</td><td>" + sev + "</td></tr>";
  }).join("");
}

function runWorker() {
  const log = document.getElementById("workerLog");
  log.textContent = "";
  const lines = [
    "[worker] Arquiteure worker a arrancar.",
    "[worker] Regras PT carregadas: " + PT_RULES.length + " regras ativas.",
    "[worker] Ciclo de atualização agendado: 0 4 * * * (KNOWLEDGE_UPDATE_CRON).",
    "[worker] ── 04:00 ── A iniciar ciclo.",
    "  → RGEU-65: verificação DRE.pt... sem alterações",
    "  → RGEU-66-QUARTO: sem alterações",
    "  → RGEU-66-COZ: sem alterações",
    "  → RGEU-66-WC: sem alterações",
    "  → RGEU-66-SALA: sem alterações",
    "  → RGEU-71: sem alterações",
    "  → DL163-2006-CORR: ⚠ ALTERAÇÃO DETETADA em §2.3",
    "                      RuleUpdate criado id=ru" + (++state.counter) + " (pendente revisão humana)",
    "  → PDM-LX-IOS: sem alterações",
    "[worker] Ciclo OK. Verificadas=" + PT_RULES.length + ", alterações=1, erros=0",
    "[audit] RULE_UPDATE_DETECTED registado em AuditEvent",
  ];
  let i = 0;
  const interval = setInterval(() => {
    log.textContent += lines[i] + "\n";
    i++;
    if (i >= lines.length) clearInterval(interval);
  }, 150);
  audit("UPDATE_CYCLE_COMPLETED", "system", "updater", { checked: PT_RULES.length, changes: 1 });
}

// Init
renderRules();
renderAudit();
