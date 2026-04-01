// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
let currentKey    = null;
let activeChart   = 'monthly';
let chartInstance = null;

let selectedKeys   = new Set();
let activeCmpChart = 'monthly';
let cmpInstance    = null;

// ═══════════════════════════════════════════════════
//  CHECKBOX SELECTION
// ═══════════════════════════════════════════════════
function onCheckChange() {
    selectedKeys.clear();
    document.querySelectorAll('.habit-chk:checked').forEach(chk => {
        selectedKeys.add(chk.dataset.key);
    });

    const n       = selectedKeys.size;
    const btnCmp  = document.getElementById('btnCompare');
    const btnClr  = document.getElementById('btnClearSel');
    const cnt     = document.getElementById('selCount');

    if (n >= 2) {
        btnCmp.style.display = '';
        btnClr.style.display = '';
        cnt.textContent      = n + ' sélectionné' + (n > 1 ? 's' : '');
        cnt.style.display    = '';
    } else {
        btnCmp.style.display = 'none';
        if (n === 0) {
            btnClr.style.display = 'none';
            cnt.style.display    = 'none';
        }
    }

    const total  = document.querySelectorAll('.habit-chk').length;
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

    const heat = await (await fetch('/smore/' + encodeURIComponent(key))).json();
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
//  FUSION PANEL
// ═══════════════════════════════════════════════════
async function openCompare() {
    closeSingle();

    const keys = Array.from(selectedKeys);
    if (keys.length < 2) return;

    document.getElementById('compareHeader').textContent = 'Fusion : ' + keys.join(', ');
    document.getElementById('panelCompare').style.display = '';
    document.getElementById('compareLoading').style.display = '';

    const resp = await fetch('/sdata-multi', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ keys })
    });

    document.getElementById('compareLoading').style.display = 'none';
    if (!resp.ok) return;

    const result = await resp.json();
    const data   = result.Stat;
    const heat   = result.HeatMap;

    // KPIs fusionnés
    renderKpisInto(data, 'fused');

    // Heatmap fusionnée
    if (window.myMatrixFused) { window.myMatrixFused.destroy(); window.myMatrixFused = null; }
    const fusedHeatWrap = document.getElementById('fusedHeatmapWrap');
    fusedHeatWrap.innerHTML = `
        <div class="horiz-scroll">
            <div style="max-height:150px;width:1200px;">
                <canvas id="matrix-chart-fused" style="height:100%;width:100%;"></canvas>
            </div>
        </div>`;
    const ctx2d = document.getElementById('matrix-chart-fused');
    window.myMatrixFused = makeFusedChart(heat, ctx2d, getThemeColor('--bs-primary'));

    // Charts
    renderCmpChart(data, activeCmpChart);

    document.querySelectorAll('.cmp-tab').forEach(btn => {
        btn.onclick = () => {
            activeCmpChart = btn.dataset.cmp;
            document.querySelectorAll('.cmp-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderCmpChart(data, activeCmpChart);
        };
    });
}

function closeCompare() {
    document.getElementById('panelCompare').style.display = 'none';
    if (cmpInstance) { cmpInstance.destroy(); cmpInstance = null; }
    if (window.myMatrixFused) { window.myMatrixFused.destroy(); window.myMatrixFused = null; }
}

function renderCmpChart(data, type) {
    if (cmpInstance) { cmpInstance.destroy(); cmpInstance = null; }
    const canvas = document.getElementById('compare-chart');
    const ctx    = canvas.getContext('2d');
    const primary   = getThemeColor('--bs-primary');
    const secondary = getThemeColor('--bs-secondary');
    if (type === 'monthly') renderMonthlyInto(ctx, data, primary, secondary, 'cmp');
    else renderYearlyInto(ctx, data, primary, secondary, 'cmp');
}

// ═══════════════════════════════════════════════════
//  KPI CARDS
// ═══════════════════════════════════════════════════
function fmt(n) { return Number.isFinite(n) ? n.toFixed(2) : '—'; }

function renderKpis(data)              { renderKpisInto(data, 'single'); }
function renderKpisInto(data, prefix) {
    const s = prefix === 'single' ? '' : 'f-';
    document.getElementById('kpi-' + s + 'dtotal').textContent    = data.DTotal ?? '—';
    document.getElementById('kpi-' + s + 'ctotal').textContent    = data.CTotal ?? '—';
    document.getElementById('kpi-' + s + 'avg-day').textContent   = fmt(data.AvgPerDay);
    document.getElementById('kpi-' + s + 'avg-week').textContent  = fmt(data.AvgPerWeek);
    document.getElementById('kpi-' + s + 'avg-month').textContent = fmt(data.AvgPerMonth);
    document.getElementById('kpi-' + s + 'avg-year').textContent  = fmt(data.AvgPerYear);

    let bestMonth = null;
    if (data.MonthlyTotals && data.MonthlyTotals.length)
        bestMonth = data.MonthlyTotals.reduce((a, b) => b.Count > a.Count ? b : a);
    document.getElementById('kpi-' + s + 'best-month').textContent =
        bestMonth ? bestMonth.Label + ' (' + bestMonth.Count + ')' : '—';

    const dow = data.DowCounts;
    let bestDow = null, bestDowVal = -1;
    if (dow) for (const [k, v] of Object.entries(dow))
        if (v > bestDowVal) { bestDowVal = v; bestDow = k; }
    document.getElementById('kpi-' + s + 'best-dow').textContent =
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
    if (type === 'monthly')      renderMonthlyInto(ctx, data, primary, secondary, 'single');
    else if (type === 'yearly')  renderYearlyInto(ctx, data, primary, secondary, 'single');
    else if (type === 'dow')     renderDow(ctx, data, primary, secondary);
}

function renderMonthlyInto(ctx, data, primary, secondary, target) {
    const points = data.MonthlyTotals || [];
    const chart = new Chart(ctx, {
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
    if (target === 'single') chartInstance = chart;
    else cmpInstance = chart;
}

function renderYearlyInto(ctx, data, primary, secondary, target) {
    const points = data.YearlyTotals || [];
    const chart = new Chart(ctx, {
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
    if (target === 'single') chartInstance = chart;
    else cmpInstance = chart;
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
//  FUSED HEATMAP (reuse heatmap.js logic on a different canvas)
// ═══════════════════════════════════════════════════
function makeFusedChart(heat, canvasEl, hcolor) {
    const ldata = heat.map(v => ({ x: v.X, y: v.Y, d: v.D, v: v.V }));
    const ctx = canvasEl.getContext('2d');
    return new Chart(ctx, {
        type: 'matrix',
        data: {
            datasets: [{
                label: 'Heatmap',
                data: ldata,
                backgroundColor(context) {
                    const value = context.dataset.data[context.dataIndex].v;
                    return Chart.helpers.color(hcolor).alpha(2 * value / 3).rgbString();
                },
                borderColor(context) {
                    return Chart.helpers.color('grey').alpha(0.5).rgbString();
                },
                borderWidth: 1,
                hoverBackgroundColor: 'lightgrey',
                hoverBorderColor: 'grey',
                width() { return 20; },
                height() { return 20; }
            }]
        },
        options: {
            plugins: {
                legend: false,
                tooltip: {
                    callbacks: {
                        title() { return ''; },
                        label(context) {
                            const v = context.dataset.data[context.dataIndex];
                            return [v.v, v.d];
                        }
                    }
                }
            },
            scales: {
                x: { type: 'category', offset: true, ticks: { display: false },
                     border: { display: false }, grid: { display: false } },
                y: { type: 'category', labels: ['Mo','Tu','We','Th','Fr','Sa','Su'],
                     ticks: { stepSize: 1, display: true },
                     border: { display: false }, grid: { display: false } }
            }
        }
    });
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