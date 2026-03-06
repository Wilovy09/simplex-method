'use strict';

// ============================================================
// UTILITIES
// ============================================================

function copyTable(t) {
  return t.map(r => [...r]);
}

/** Display a number as a fraction when possible */
function toFrac(x) {
  if (Math.abs(x) < 1e-9) return '0';
  const neg = x < 0;
  const ax = Math.abs(x);
  for (let d = 1; d <= 24; d++) {
    const n = Math.round(ax * d);
    if (Math.abs(n / d - ax) < 1e-9) {
      if (d === 1) return (neg ? '\u2212' : '') + n;
      return (neg ? '\u2212' : '') + n + '/' + d;
    }
  }
  return x.toFixed(3);
}

/** Convert "x1" -> "x<sub>1</sub>" for HTML display */
function vh(name) {
  return name.replace(/([a-zA-Z]+)(\d+)/, (_, l, n) => `${l}<sub>${n}</sub>`);
}

// ============================================================
// PROBLEM STATE
// ============================================================

let problem = {
  nVars: 2,
  nConstraints: 3,
  objCoeffs: [3, 2],
  // Each constraint: [...coefficients, rhs]
  constraints: [
    [2, 1, 18],
    [2, 3, 42],
    [3, 1, 24],
  ],
};

// ============================================================
// TABLEAU BUILDER
// ============================================================

function buildTableau(prob) {
  const { nVars, nConstraints, objCoeffs, constraints } = prob;
  const nAll = nVars + nConstraints; // total variables (decision + slack)

  const varNames = [];
  for (let i = 1; i <= nVars; i++)        varNames.push(`x${i}`);
  for (let i = 1; i <= nConstraints; i++) varNames.push(`s${i}`);

  const table = [];

  // Z row: Z - c1*x1 - c2*x2 - ... = 0  →  coefficients are negated
  const zRow = new Array(nAll + 1).fill(0);
  for (let j = 0; j < nVars; j++) zRow[j] = -objCoeffs[j];
  table.push(zRow);

  // Constraint rows with slack variables
  for (let i = 0; i < nConstraints; i++) {
    const row = new Array(nAll + 1).fill(0);
    for (let j = 0; j < nVars; j++) row[j] = constraints[i][j];
    row[nVars + i] = 1;               // slack variable
    row[nAll]      = constraints[i][nVars]; // RHS
    table.push(row);
  }

  // Initial basis: slack variables
  const basics = [];
  for (let i = 0; i < nConstraints; i++) basics.push(nVars + i);

  return { table, varNames, basics, nAll };
}

// ============================================================
// SIMPLEX SOLVER — records every step
// ============================================================

function solveSimplex(prob) {
  const { table: t0, varNames, basics: b0, nAll } = buildTableau(prob);
  let table  = copyTable(t0);
  let basics = [...b0];
  const steps = [];

  // ---- INITIAL ----
  steps.push({
    phase: 'initial',
    iteration: 0,
    table: copyTable(table),
    basics: [...basics],
    varNames, nAll,
    enteringCol: null,
    leavingRow: null,
    pivotValue: null,
    ratios: null,
    headline: 'Tabla Inicial',
    icon: '\uD83D\uDCCB',
    explanation: [
      `El problema tiene <strong>${prob.nVars}</strong> variable(s) de decision y <strong>${prob.nConstraints}</strong> restriccion(es).`,
      `Se agregan variables de holgura (${varNames.slice(prob.nVars).map(vh).join(', ')}) para convertir &le; en igualdades.`,
      `La <strong>fila Z</strong> representa la funcion objetivo con coeficientes negados.`,
      `La <strong>solucion inicial</strong>: todas las variables de decision = 0; holguras = lado derecho.`,
      `Buscamos coeficientes negativos en la fila Z &rarr; indican que Z puede mejorarse.`,
    ],
  });

  let iter = 1;

  while (true) {
    // --- Find entering variable (most negative in Z row) ---
    const zRow = table[0];
    let minVal = -1e-9;
    let enteringCol = null;
    for (let j = 0; j < nAll; j++) {
      if (zRow[j] < minVal) { minVal = zRow[j]; enteringCol = j; }
    }

    // --- OPTIMAL ---
    if (enteringCol === null) {
      const sol = extractSolution(table, basics, varNames, prob, nAll);
      steps.push({
        phase: 'optimal',
        iteration: iter,
        table: copyTable(table),
        basics: [...basics],
        varNames, nAll,
        enteringCol: null,
        leavingRow: null,
        pivotValue: null,
        ratios: null,
        headline: '\u00A1Solucion Optima Encontrada!',
        icon: '\uD83C\uDFC6',
        explanation: [
          'Todos los coeficientes de la fila Z son &ge; 0.',
          'No existe ninguna variable que pueda mejorar Z.',
          'La solucion actual es <strong>optima</strong>.',
        ],
        solution: sol,
      });
      break;
    }

    // --- ENTERING VARIABLE step ---
    steps.push({
      phase: 'entering',
      iteration: iter,
      table: copyTable(table),
      basics: [...basics],
      varNames, nAll,
      enteringCol,
      leavingRow: null,
      pivotValue: null,
      ratios: null,
      headline: `Iteracion ${iter} &mdash; Variable Entrante`,
      icon: '\u2B06\uFE0F',
      explanation: [
        `Revisamos la fila Z en busca del coeficiente mas negativo.`,
        `El mas negativo es <strong>${toFrac(zRow[enteringCol])}</strong> en la columna de <strong>${vh(varNames[enteringCol])}</strong>.`,
        `Entonces <strong>${vh(varNames[enteringCol])}</strong> es la <em>variable entrante</em>.`,
        `Cada unidad de ${vh(varNames[enteringCol])} que entre a la base incrementara Z en <strong>${toFrac(Math.abs(zRow[enteringCol]))}</strong>.`,
        `Siguiente: Prueba de la Razon Minima para encontrar que variable sale.`,
      ],
    });

    // --- RATIO TEST ---
    let minRatio  = Infinity;
    let leavingRow = null;
    const ratios  = [];

    for (let i = 1; i < table.length; i++) {
      const a = table[i][enteringCol];
      const b = table[i][nAll];
      if (a > 1e-9) {
        const ratio = b / a;
        ratios.push({ row: i, a, b, ratio, isMin: false });
        if (ratio < minRatio - 1e-9) { minRatio = ratio; leavingRow = i; }
      } else {
        ratios.push({ row: i, a, b, ratio: null, isMin: false });
      }
    }

    // --- UNBOUNDED ---
    if (leavingRow === null) {
      steps.push({
        phase: 'unbounded',
        iteration: iter,
        table: copyTable(table),
        basics: [...basics],
        varNames, nAll,
        enteringCol,
        leavingRow: null,
        pivotValue: null,
        ratios,
        headline: 'Problema No Acotado',
        icon: '\u26A0\uFE0F',
        explanation: [
          `Todos los coeficientes en la columna de ${vh(varNames[enteringCol])} son &le; 0.`,
          `La variable puede crecer sin limite sin violar ninguna restriccion.`,
          'El problema <strong>no tiene solucion optima finita</strong>.',
        ],
      });
      break;
    }

    ratios.forEach(r => { if (r.row === leavingRow) r.isMin = true; });
    const pivotValue    = table[leavingRow][enteringCol];
    const leavingName   = varNames[basics[leavingRow - 1]];

    // --- RATIOS step ---
    steps.push({
      phase: 'ratios',
      iteration: iter,
      table: copyTable(table),
      basics: [...basics],
      varNames, nAll,
      enteringCol,
      leavingRow,
      pivotValue,
      ratios,
      headline: `Iteracion ${iter} &mdash; Prueba de la Razon Minima`,
      icon: '\u2797',
      explanation: [
        `Para cada fila i (con a<sub>ij</sub> &gt; 0): Razon<sub>i</sub> = b<sub>i</sub> / a<sub>ij</sub>.`,
        `Esto indica cuanto puede crecer ${vh(varNames[enteringCol])} antes de que la restriccion i se vuelva activa.`,
        `La <strong>razon minima</strong> es <strong>${toFrac(minRatio)}</strong> en la fila ${leavingRow} &rarr; la variable <strong>${vh(leavingName)}</strong> sale de la base.`,
        `El <strong>elemento pivote</strong> es <strong>${toFrac(pivotValue)}</strong> (interseccion de la columna entrante con la fila saliente).`,
      ],
    });

    // --- PERFORM PIVOT ---
    const oldBasic = basics[leavingRow - 1];
    const oldZ     = table[0][nAll];
    basics[leavingRow - 1] = enteringCol;

    // Normalize pivot row
    for (let j = 0; j <= nAll; j++) table[leavingRow][j] /= pivotValue;

    // Eliminate entering variable from all other rows
    for (let i = 0; i < table.length; i++) {
      if (i === leavingRow) continue;
      const factor = table[i][enteringCol];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = 0; j <= nAll; j++) table[i][j] -= factor * table[leavingRow][j];
    }

    const newZ       = table[0][nAll];
    const improvement = newZ - oldZ;

    // --- PIVOT RESULT step ---
    steps.push({
      phase: 'pivot_result',
      iteration: iter,
      table: copyTable(table),
      basics: [...basics],
      varNames, nAll,
      enteringCol,
      leavingRow,
      pivotValue,
      ratios: null,
      headline: `Iteracion ${iter} &mdash; Nueva Tabla`,
      icon: '\u26A1',
      explanation: [
        `<strong>Paso 1 (Normalizar):</strong> Fila ${leavingRow} &divide; pivote (${toFrac(pivotValue)}) &rarr; el pivote se vuelve 1.`,
        `<strong>Paso 2 (Eliminar):</strong> Para cada fila i &ne; ${leavingRow}: Fila i &larr; Fila i &minus; (a<sub>i,col</sub>) &times; nueva Fila ${leavingRow}.`,
        `La columna de ${vh(varNames[enteringCol])} es ahora un vector unitario (1 en fila ${leavingRow}, 0 en las demas).`,
        `<strong>${vh(varNames[enteringCol])}</strong> reemplaza a <strong>${vh(varNames[oldBasic])}</strong> en la base.`,
        `Z mejoro de ${toFrac(oldZ)} a <strong>${toFrac(newZ)}</strong> (ganancia: +${toFrac(improvement)}).`,
        steps.some(s => s.phase === 'initial') && table[0].some((v, j) => j < nAll && v < -1e-9)
          ? 'Aun hay negativos en Z &rarr; se requiere otra iteracion.'
          : '',
      ].filter(Boolean),
    });

    iter++;
    if (iter > 60) break; // safeguard against cycling
  }

  return steps;
}

function extractSolution(table, basics, varNames, prob, nAll) {
  const vars = [];
  for (let j = 0; j < prob.nVars; j++) {
    const idx   = basics.indexOf(j);
    const value = idx >= 0 ? table[idx + 1][nAll] : 0;
    vars.push({ name: varNames[j], value });
  }
  return { vars, z: table[0][nAll] };
}

// ============================================================
// RENDERING
// ============================================================

function renderProblemDisplay(prob) {
  const { nVars, objCoeffs, constraints } = prob;

  function terms(coeffs) {
    return coeffs
      .map((c, j) => {
        if (Math.abs(c) < 1e-9) return null;
        const label = vh(`x${j + 1}`);
        if (j === 0) return `${c === 1 ? '' : c === -1 ? '\u2212' : toFrac(c)}${label}`;
        if (c < 0) return `\u2212 ${Math.abs(c) === 1 ? '' : toFrac(Math.abs(c))}${label}`;
        return `+ ${c === 1 ? '' : toFrac(c)}${label}`;
      })
      .filter(Boolean)
      .join(' ');
  }

  let html = `<div class="problem-obj">Maximizar Z = ${terms(objCoeffs)}</div>`;
  html += `<div class="problem-sa">sujeto a:</div>`;
  for (const row of constraints) {
    html += `<div class="problem-constraint">${terms(row.slice(0, nVars))} &le; ${row[nVars]}</div>`;
  }
  html += `<div class="problem-constraint nonneg">x<sub>i</sub> &ge; 0 para todo i</div>`;

  document.getElementById('problem-display').innerHTML = html;
}

function renderTableau(step) {
  const { table, basics, varNames, nAll, enteringCol, leavingRow, ratios, phase } = step;
  const showRatios  = phase === 'ratios';
  const isOptimal   = phase === 'optimal';
  const isAfterPivot = phase === 'pivot_result';

  let html = `<table class="simplex-table${isOptimal ? ' optimal-table' : ''}">`;

  // ---- HEADER ----
  html += '<thead><tr>';
  html += '<th>Base</th>';
  for (let j = 0; j < nAll; j++) {
    const isEntering = j === enteringCol;
    let cls = '';
    if (isEntering && !isAfterPivot) cls = 'entering-header';
    html += `<th class="${cls}">${vh(varNames[j])}</th>`;
  }
  html += '<th>b</th>';
  if (showRatios) html += '<th class="ratio-header">Razon</th>';
  html += '</tr></thead>';

  // ---- BODY ----
  html += '<tbody>';

  for (let i = 0; i < table.length; i++) {
    const isZ         = i === 0;
    const isLeaving   = leavingRow !== null && i === leavingRow;
    const isPivotedRow = isAfterPivot && i === leavingRow;

    let rowCls = '';
    if (isZ)          rowCls = 'z-row';
    if (isLeaving)    rowCls += ' leaving-row';
    if (isPivotedRow) rowCls = 'z-row pivoted-row'; // override

    const baseLabel = isZ ? 'Z' : vh(varNames[basics[i - 1]]);

    let baseCls = 'base-cell';

    html += `<tr class="${rowCls}">`;
    html += `<td class="${baseCls}">${baseLabel}</td>`;

    for (let j = 0; j < nAll; j++) {
      const isEntering = j === enteringCol;
      const isPivot    = isLeaving && isEntering;
      let cls = '';
      if (isPivot && !isAfterPivot)          cls = 'pivot-cell';
      else if (isEntering && !isZ && !isAfterPivot) cls = 'entering-cell';
      else if (isAfterPivot && isEntering && !isZ) cls = 'pivoted-col';

      html += `<td class="${cls}">${toFrac(table[i][j])}</td>`;
    }

    // b (RHS)
    let bCls = '';
    if (isOptimal && !isZ) bCls = 'rhs-optimal';
    html += `<td class="${bCls}">${toFrac(table[i][nAll])}</td>`;

    // Ratio column
    if (showRatios) {
      if (isZ) {
        html += '<td></td>';
      } else {
        const rd = ratios.find(r => r.row === i);
        if (rd && rd.ratio !== null) {
          const minCls = rd.isMin ? 'ratio-cell min-ratio' : 'ratio-cell';
          const arrow  = rd.isMin ? ' \u2190 min' : '';
          html += `<td class="${minCls}">${toFrac(rd.b)} / ${toFrac(rd.a)} = ${toFrac(rd.ratio)}${arrow}</td>`;
        } else {
          html += '<td class="ratio-cell no-ratio">&mdash;</td>';
        }
      }
    }

    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

function renderExplanation(step) {
  const { phase, headline, icon, explanation, solution } = step;

  let html = `<div class="phase-${phase}">`;
  html += `<div class="explanation-card">`;
  html += `<div class="explanation-head"><span class="phase-icon">${icon}</span> ${headline}</div>`;
  html += `<div class="explanation-body"><ul>`;
  for (const item of explanation) html += `<li>${item}</li>`;
  html += '</ul>';

  if (phase === 'optimal' && solution) {
    html += `<div class="solution-vars">`;
    for (const v of solution.vars) {
      html += `<span class="solution-var">${vh(v.name)} = ${toFrac(v.value)}</span>`;
    }
    html += `<span class="solution-var solution-z">Z<sub>max</sub> = ${toFrac(solution.z)}</span>`;
    html += `</div>`;
  }

  html += '</div></div></div>';
  return html;
}

function renderStep(step) {
  const expEl = document.getElementById('explanation-box');
  const tabEl = document.getElementById('tableau-container');

  expEl.classList.remove('step-animate');
  tabEl.classList.remove('step-animate');
  // force reflow to restart animation
  void expEl.offsetWidth;
  void tabEl.offsetWidth;

  expEl.innerHTML = renderExplanation(step);
  tabEl.innerHTML = renderTableau(step);

  expEl.classList.add('step-animate');
  tabEl.classList.add('step-animate');

  // Step label
  const phaseLabel = {
    initial:      'Tabla Inicial',
    entering:     `Iter. ${step.iteration}: Var. Entrante`,
    ratios:       `Iter. ${step.iteration}: Razon Minima`,
    pivot_result: `Iter. ${step.iteration}: Resultado`,
    optimal:      'Solucion Optima',
    unbounded:    'Sin Solucion',
  };
  document.getElementById('step-label').textContent =
    `${phaseLabel[step.phase] || 'Paso'} \u2014 ${currentStep + 1} / ${steps.length}`;
}

// ============================================================
// UI STATE & NAVIGATION
// ============================================================

let steps = [];
let currentStep = 0;

function updateNav() {
  document.getElementById('prev-btn').disabled = currentStep === 0;
  document.getElementById('next-btn').disabled = currentStep === steps.length - 1;

  const container = document.getElementById('step-dots');
  container.innerHTML = '';
  steps.forEach((s, i) => {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    dot.title = s.phase;
    if (i === currentStep)   dot.classList.add('active');
    else if (i < currentStep) dot.classList.add('visited');
    dot.addEventListener('click', () => { currentStep = i; renderStep(steps[i]); updateNav(); });
    container.appendChild(dot);
  });
}

function goTo(i) {
  currentStep = Math.max(0, Math.min(i, steps.length - 1));
  renderStep(steps[currentStep]);
  updateNav();
}

function solve() {
  steps = solveSimplex(problem);
  currentStep = 0;

  const section = document.getElementById('steps-section');
  section.style.display = 'block';

  renderStep(steps[0]);
  updateNav();

  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ============================================================
// EDITOR
// ============================================================

let editorOpen = false;

function buildEditorUI() {
  const nV = parseInt(document.getElementById('n-vars').value)        || 2;
  const nC = parseInt(document.getElementById('n-constraints').value) || 3;

  // Objective inputs
  const objDiv = document.getElementById('obj-inputs');
  objDiv.innerHTML = '';
  for (let j = 0; j < nV; j++) {
    const val = j < problem.objCoeffs.length ? problem.objCoeffs[j] : 1;
    if (j > 0) {
      const plus = document.createElement('span');
      plus.className = 'coeff-plus';
      plus.textContent = '+';
      objDiv.appendChild(plus);
    }
    const g = document.createElement('div');
    g.className = 'coeff-group';
    g.innerHTML = `
      <input type="number" id="obj-c${j}" value="${val}" step="any">
      <span class="var-label">${vh(`x${j + 1}`)}</span>
    `;
    objDiv.appendChild(g);
  }

  // Constraint inputs
  const conDiv = document.getElementById('constraint-inputs');
  conDiv.innerHTML = '';
  for (let i = 0; i < nC; i++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'constraint-row';
    let html = `<span class="row-label">R${i + 1}:</span>`;
    for (let j = 0; j < nV; j++) {
      const val = (i < problem.constraints.length && j < problem.constraints[i].length - 1)
        ? problem.constraints[i][j] : 1;
      if (j > 0) html += '<span class="coeff-plus">+</span>';
      html += `
        <div class="coeff-group">
          <input type="number" id="con-r${i}-c${j}" value="${val}" step="any">
          <span class="var-label">${vh(`x${j + 1}`)}</span>
        </div>
      `;
    }
    const rhs = (i < problem.constraints.length)
      ? problem.constraints[i][problem.constraints[i].length - 1] : 10;
    html += `<span class="leq-sign">&le;</span>`;
    html += `<input type="number" id="con-r${i}-rhs" value="${rhs}" step="any" class="small-input">`;
    rowEl.innerHTML = html;
    conDiv.appendChild(rowEl);
  }
}

function readEditorValues() {
  const nV = parseInt(document.getElementById('n-vars').value)        || 2;
  const nC = parseInt(document.getElementById('n-constraints').value) || 3;

  const objCoeffs = [];
  for (let j = 0; j < nV; j++) {
    objCoeffs.push(parseFloat(document.getElementById(`obj-c${j}`).value) || 0);
  }

  const constraints = [];
  for (let i = 0; i < nC; i++) {
    const row = [];
    for (let j = 0; j < nV; j++) {
      row.push(parseFloat(document.getElementById(`con-r${i}-c${j}`).value) || 0);
    }
    row.push(parseFloat(document.getElementById(`con-r${i}-rhs`).value) || 0);
    constraints.push(row);
  }

  return { nVars: nV, nConstraints: nC, objCoeffs, constraints };
}

// ============================================================
// EVENT LISTENERS
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  renderProblemDisplay(problem);

  document.getElementById('solve-btn').addEventListener('click', solve);

  document.getElementById('next-btn').addEventListener('click', () => goTo(currentStep + 1));
  document.getElementById('prev-btn').addEventListener('click', () => goTo(currentStep - 1));

  document.addEventListener('keydown', (e) => {
    if (steps.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentStep + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentStep - 1);
  });

  document.getElementById('toggle-editor').addEventListener('click', () => {
    editorOpen = !editorOpen;
    document.getElementById('problem-editor').classList.toggle('hidden', !editorOpen);
    document.getElementById('toggle-editor').textContent =
      editorOpen ? 'Cerrar editor' : 'Editar problema';
    if (editorOpen) {
      document.getElementById('n-vars').value        = problem.nVars;
      document.getElementById('n-constraints').value = problem.nConstraints;
      buildEditorUI();
    }
  });

  document.getElementById('update-size').addEventListener('click', buildEditorUI);

  document.getElementById('apply-problem').addEventListener('click', () => {
    problem = readEditorValues();
    renderProblemDisplay(problem);
    editorOpen = false;
    document.getElementById('problem-editor').classList.add('hidden');
    document.getElementById('toggle-editor').textContent = 'Editar problema';
    // Reset visualization
    document.getElementById('steps-section').style.display = 'none';
    steps = [];
    currentStep = 0;
  });

  // ---- MODAL ----
  const modal    = document.getElementById('help-modal');
  const helpBtn  = document.getElementById('help-btn');
  const closeBtn = document.getElementById('modal-close');

  function openModal()  { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closeModal() { modal.style.display = 'none';  document.body.style.overflow = '';       }

  helpBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
});
