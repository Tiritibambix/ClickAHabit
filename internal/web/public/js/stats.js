// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let currentKey    = null;
let activeChart   = 'monthly';
let chartInstance = null;

let selectedKeys   = new Set();
let activeCmpChart = 'monthly';
let cmpInstance    = null;
let lastMultiData  = null;

// ═══════════════════════════════════════════════════
//  PALETTE  (distinct colours for multi-habit chart)
// ═══════════════════════════════════════════════════
const PALETTE = [
    '#4e79a7','#f28e2b','#e15759','#76b7b2',
    '#59a14f','#edc948','#b07aa1','#ff9da7',
    '#9c755f','#bab0ac'
];
function paletteColor(i) { return PALETTE[i % PALETTE.length]; }

// ═══════════════════════════════════════════════════
//  CHECKBOX SELECTION
// ═══════════════════════════════════════════════════
function onCheckChange() {
    selectedKeys.clear();
    document.querySelectorAll('.habit-chk:checked').forEach(chk => {
        selectedKeys.add(chk.dataset.key);
    });

    const n = selectedKeys.size;
    const btnCmp  = document.getElementById('btnCompare');
    const btnClr  = document.getElementById('btnClearSel');
    const cnt     = document.getElementById('selCount');

    if (n >= 2) {
        btnCmp.style.display  = '';
        btnClr.style.display  = '';
        cnt.textContent       = n + ' sélectionné' + (n > 1 ? 's' : '');
        cnt.style.display     = '';
    } else {
        btnCmp.style.display  = 'none';
        if (n === 0) {
            btnClr.style.display = 'none';
            cnt.style.display    = 'none';
        }
    }

    // Sync "select all" checkbox state
    const total = document.querySelectorAll('.habit-chk').length;
    const chkAll = document.getElementById('chkAll');
    chkAll.checked       = n === total;
    chkAll.indeterminate = n > 0 && n < total;
}

function toggleAll(masterChk) {
    document.querySelectorAll('.habit-chk').forEach(chk => {
        chk.checked = masterChk.checked;
    });
    onCheckChange();
}

function clearSelection() {
    document.querySelectorAll('.habit-chk').forEach(chk => chk.checked = false);
    document.getElementById('chkAll').checked = false;
    onCheckChange();
    closeCompare();
}

// ═══════════════════════════════════════════════════
//  SINGLE HABIT PANEL
// ═══════════════════════════════════════════════════
async function getMore(key) {
    if (!key) return;
    currentKey = key;

    closeCompare();

    // Heatmap
    const heat  = await (await fetch('/smore/' + encodeURIComponent(key))).json();
    document.getElementById('statsHeader').innerHTML = key;

    if (window.myMatrix) { window.myMatrix.destroy(); window.myMatrix = null; }

    const heatWrap = document.getElementById('heatmapWrap');
    heatWrap.innerHTML = `
        <div class="horiz-scroll">
            <div style="max-height:150px;width:1200px;">
                <canvas id="matrix-chart" style="height:100%;width:100%;"></canvas>
            </div>
        </div>`;
    makeChart(heat, getThemeColor('--bs-primary'));

    // Enriched stats
    const resp = await fetch('/sdata/' + encodeURIComponent(key));
    if (!resp.ok) return;
    const data = await resp.json();

    renderKpis(data);
    renderChart(data, activeChart);

    document.querySelectorAll('.chart-tab').forEach(btn => {
        btn.onclick = () => {
            activeChart = btn.dataset.chart;
            document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderChart(data, activeChart);
        };
    });

    document.getElementById('panelSingle').style.display = '';
}

function closeSingle() {
    document.getElementById('panelSingle').style.display = 'none';
    destroyChart();
    if (window.myMatrix) { window.myMatrix.destroy(); window.myMatrix = null; }
}

// ═══════════════════════════════════════════════════
//  MULTI-HABIT COMPARISON
// ═══════════════════════════════════════════════════
async function openCompare() {
    closeSingle();

    const keys = Array.from(selectedKeys);
    if (keys.length < 2) return;

    document.getElementById('compareHeader').textContent =
        'Comparaison : ' + keys.join(', ');
    document.getElementById('panelCompare').style.display = '';
    document.getElementById('compareLoading').style.display = '';

    const resp = await fetch('/sdata-multi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keys })
    });

    document.getElementById('compareLoading').style.display = 'none';

    if (!resp.ok) return;
    lastMultiData = await resp.json();

    renderCompare(lastMultiData, activeCmpChart);

    document.querySelectorAll('.cmp-tab').forEach(btn => {
        btn.onclick = () => {
            activeCmpChart = btn.dataset.cmp;
            document.querySelectorAll('.cmp-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCompare(lastMultiData, activeCmpChart);
        };
    });
}

function closeCompare() {
    document.getElementById('panelCompare').style.display = 'none';
    if (cmpInstance) { cmpInstance.destroy(); cmpInstance = null; }
}

function renderCompare(multi, type) {
    if (cmpInstance) { cmpInstance.destroy(); cmpInstance = null; }

    const canvas = document.getElementById('compare-chart');
    const ctx    = canvas.getContext('2d');
    const textColor = getThemeColor('--bs-body-color') || '#aaa';

    // Collect all labels across all habits + avg
    const labelSet = new Set();
    (multi.Stats || []).forEach(sd => {
        const pts = type === 'monthly' ? sd.MonthlyTotals : sd.YearlyTotals;
        (pts || []).forEach(p => labelSet.add(p.Label));
    });
    const avgPts = type === 'monthly'
        ? (multi.Avg.MonthlyAvg || [])
        : (multi.Avg.YearlyAvg  || []);
    avgPts.forEach(p => labelSet.add(p.Label));

    const labels = Array.from(labelSet).sort();

    // Build index maps
    function buildMap(pts) {
        const m = {};
        (pts || []).forEach(p => { m[p.Label] = p; });
        return m;
    }

    const datasets = [];

    // One line per habit (avg/active day)
    (multi.Stats || []).forEach((sd, i) => {
        const pts = type === 'monthly' ? sd.MonthlyTotals : sd.YearlyTotals;
        const map = buildMap(pts);
        const color = paletteColor(i);
        datasets.push({
            label:           sd.Group + ': ' + sd.Name,
            data:            labels.map(l => map[l] ? parseFloat(map[l].Avg.toFixed(2)) : null),
            borderColor:     color,
            backgroundColor: hexAlpha(color, 0.08),
            borderWidth:     2,
            pointRadius:     3,
            tension:         0.3,
            spanGaps:        true,
            type:            'line',
            order:           i + 1,
        });
    });

    // Aggregated average — thicker, dashed, white/black
    const avgMap = {};
    avgPts.forEach(p => { avgMap[p.Label] = p; });
    datasets.push({
        label:           'Moyenne globale',
        data:            labels.map(l => avgMap[l] ? parseFloat(avgMap[l].Avg.toFixed(2)) : null),
        borderColor:     textColor,
        backgroundColor: hexAlpha(textColor, 0.05),
        borderWidth:     3,
        borderDash:      [6, 3],
        pointRadius:     4,
        tension:         0.3,
        spanGaps:        true,
        type:            'line',
        order:           0,
    });

    cmpInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: textColor } },
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid:  { color: hexAlpha(textColor, 0.1) }
                },
                y: {
                    title:       { display: true, text: 'Moy / jour actif', color: textColor },
                    ticks:       { color: textColor },
                    grid:        { color: hexAlpha(textColor, 0.1) },
                    beginAtZero: true
                }
            }
        }
    });
}

// ═══════════════════════════════════════════════════
//  KPI CARDS
// ═══════════════════════════════════════════════════
function fmt(n) { return Number.isFinite(n) ? n.toFixed(2) : '—'; }

function renderKpis(data) {
    document.getElementById('kpi-dtotal').textContent    = data.DTotal ?? '—';
    document.getElementById('kpi-ctotal').textContent    = data.CTotal ?? '—';
    document.getElementById('kpi-avg-day').textContent   = fmt(data.AvgPerDay);
    document.getElementById('kpi-avg-week').textContent  = fmt(data.AvgPerWeek);
    document.getElementById('kpi-avg-month').textContent = fmt(data.AvgPerMonth);

    let bestMonth = null;
    if (data.MonthlyTotals && data.MonthlyTotals.length)
        bestMonth = data.MonthlyTotals.reduce((a, b) => b.Count > a.Count ? b : a);
    document.getElementById('kpi-best-month').textContent =
        bestMonth ? bestMonth.Label + ' (' + bestMonth.Count + ')' : '—';

    const dow = data.DowCounts;
    let bestDow = null, bestDowVal = -1;
    if (dow) for (const [k, v] of Object.entries(dow))
        if (v > bestDowVal) { bestDowVal = v; bestDow = k; }
    document.getElementById('kpi-best-dow').textContent =
        bestDow ? bestDow + ' (' + bestDowVal + ')' : '—';
}

// ═══════════════════════════════════════════════════
//  SINGLE HABIT CHARTS
// ═══════════════════════════════════════════════════
const DOW_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function destroyChart() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}

function renderChart(data, type) {
    destroyChart();
    const ctx       = document.getElementById('main-chart').getContext('2d');
    const primary   = getThemeColor('--bs-primary');
    const secondary = getThemeColor('--bs-secondary');

    if (type === 'monthly') renderMonthly(ctx, data, primary, secondary);
    else if (type === 'yearly') renderYearly(ctx, data, primary, secondary);
    else if (type === 'dow')    renderDow(ctx, data, primary, secondary);
}

function renderMonthly(ctx, data, primary, secondary) {
    const points = data.MonthlyTotals || [];
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: points.map(p => p.Label),
            datasets: [
                {
                    label: 'Total / mois',
                    data:  points.map(p => p.Count),
                    backgroundColor: hexAlpha(primary, 0.7),
                    borderColor: primary, borderWidth: 1,
                    yAxisID: 'y', order: 2,
                },
                {
                    label: 'Moy / jour actif',
                    data:  points.map(p => parseFloat(p.Avg.toFixed(2))),
                    type: 'line', borderColor: secondary,
                    backgroundColor: hexAlpha(secondary, 0.15),
                    borderWidth: 2, pointRadius: 3, tension: 0.3,
                    yAxisID: 'y2', order: 1,
                }
            ]
        },
        options: chartOptions('Total', 'Moy/jour actif')
    });
}

function renderYearly(ctx, data, primary, secondary) {
    const points = data.YearlyTotals || [];
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: points.map(p => p.Label),
            datasets: [
                {
                    label: 'Total / an',
                    data:  points.map(p => p.Count),
                    backgroundColor: hexAlpha(primary, 0.7),
                    borderColor: primary, borderWidth: 1,
                    yAxisID: 'y', order: 2,
                },
                {
                    label: 'Moy / jour actif',
                    data:  points.map(p => parseFloat(p.Avg.toFixed(2))),
                    type: 'line', borderColor: secondary,
                    backgroundColor: hexAlpha(secondary, 0.15),
                    borderWidth: 2, pointRadius: 4, tension: 0.3,
                    yAxisID: 'y2', order: 1,
                }
            ]
        },
        options: chartOptions('Total', 'Moy/jour actif')
    });
}

function renderDow(ctx, data, primary, secondary) {
    const counts = data.DowCounts || {};
    const days   = data.DowDays   || {};
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: DOW_ORDER,
            datasets: [
                {
                    label: 'Total',
                    data:  DOW_ORDER.map(d => counts[d] || 0),
                    backgroundColor: hexAlpha(primary, 0.7),
                    borderColor: primary, borderWidth: 1,
                    yAxisID: 'y', order: 2,
                },
                {
                    label: 'Moy / jour actif',
                    data:  DOW_ORDER.map(d => {
                        const c = counts[d] || 0, dd = days[d] || 0;
                        return dd > 0 ? parseFloat((c/dd).toFixed(2)) : 0;
                    }),
                    type: 'line', borderColor: secondary,
                    backgroundColor: hexAlpha(secondary, 0.15),
                    borderWidth: 2, pointRadius: 4, tension: 0.2,
                    yAxisID: 'y2', order: 1,
                }
            ]
        },
        options: chartOptions('Total', 'Moy/jour actif')
    });
}

function chartOptions(y1Label, y2Label) {
    const textColor = getThemeColor('--bs-body-color') || '#aaa';
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
            x:  { ticks: { color: textColor }, grid: { color: hexAlpha(textColor, 0.1) } },
            y:  { position: 'left',  title: { display: true, text: y1Label, color: textColor },
                  ticks: { color: textColor }, grid: { color: hexAlpha(textColor, 0.1) }, beginAtZero: true },
            y2: { position: 'right', title: { display: true, text: y2Label, color: textColor },
                  ticks: { color: textColor }, grid: { drawOnChartArea: false }, beginAtZero: true }
        }
    };
}

// ═══════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════
function getThemeColor(varName) {
    return getComputedStyle(document.body).getPropertyValue(varName).trim();
}

function hexAlpha(color, alpha) {
    if (!color) return 'rgba(128,128,128,' + alpha + ')';
    color = color.trim();
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1,3), 16);
        const g = parseInt(color.slice(3,5), 16);
        const b = parseInt(color.slice(5,7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    if (color.startsWith('rgb'))
        return color.replace('rgb(', 'rgba(').replace(')', ',' + alpha + ')');
    return 'rgba(128,128,128,' + alpha + ')';
}
