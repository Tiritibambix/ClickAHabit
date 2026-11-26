
function lowerData(heat) {
    var ldata = [];
    let arrayLength = heat.length;
    for (let i = 0 ; i < arrayLength; i++) {
        let val = heat[i];
        ldata.push({
            x: val.X,
            y: val.Y,
            d: val.D,
            v: val.V
        });
    }
    return ldata;
};

// Scrolls a heatmap's horizontal scroll container all the way to the right
// so the most recent weeks are what the user sees first — history is still
// reachable by scrolling left, but it's not what greets you by default.
function scrollHeatmapToRecent(canvasId) {
    const canvas = document.getElementById(canvasId);
    const scrollEl = canvas && canvas.closest('.horiz-scroll');
    if (scrollEl) scrollEl.scrollLeft = scrollEl.scrollWidth;
}

function makeChart(heat, hcolor) {
    let ldata = lowerData(heat);

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        const allXvals = [...new Set(ldata.map(d => parseInt(d.x)))].sort((a, b) => a - b);
        const keepX = new Set(allXvals.slice(-16).map(String));
        ldata = ldata.filter(d => keepX.has(d.x));

        // Resize container to match actual number of weeks so cells are compact
        const canvas = document.getElementById('matrix-chart');
        if (canvas && canvas.parentElement) {
            const numWeeks = keepX.size;
            canvas.parentElement.style.width = (numWeeks * 22 + 55) + 'px';
        }
    }

    window.myMatrix = buildMatrixChart('matrix-chart', ldata, hcolor);
    scrollHeatmapToRecent('matrix-chart');
};

// Shared chart builder used by both the single-habit heatmap and the
// fused (merged) one, so they always look and behave the same way.
function buildMatrixChart(canvasId, ldata, hcolor) {
    const cellSize = 20;
    const emptyColor = Chart.helpers.color(getThemeColor('--bs-secondary-color') || '#888').alpha(0.12).rgbString();
    const borderColor = Chart.helpers.color(getThemeColor('--bs-border-color-translucent') || 'grey').alpha(0.6).rgbString();
    const hoverColor = Chart.helpers.color(hcolor).alpha(0.92).rgbString();

    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'matrix',
        data: {
            datasets: [{
                label: 'Heatmap',
                data: ldata,
                backgroundColor(context) {
                    const value = context.dataset.data[context.dataIndex].v;
                    if (!value) return emptyColor;
                    const alpha = Math.min(1, 2 * value / 3);
                    return Chart.helpers.color(hcolor).alpha(alpha).rgbString();
                },
                borderColor,
                borderWidth: 1,
                borderRadius: 3,
                hoverBackgroundColor: hoverColor,
                hoverBorderColor: hcolor,
                width()  { return cellSize; },
                height() { return cellSize; }
            }]
        },
        options: {
            plugins: {
                legend: false,
                tooltip: {
                    backgroundColor: getThemeColor('--surface-raised') || '#1f1f1f',
                    titleColor: getThemeColor('--bs-body-color'),
                    bodyColor: getThemeColor('--bs-body-color'),
                    borderColor: getThemeColor('--bs-border-color'),
                    borderWidth: 1,
                    padding: 8,
                    displayColors: false,
                    callbacks: {
                        title() { return ''; },
                        label(context) {
                            const v = context.dataset.data[context.dataIndex];
                            if (!v.v) return v.d;
                            return [v.v + (v.v === 1 ? ' click' : ' clicks'), v.d];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    offset: true,
                    reverse: false,
                    ticks: { display: false },
                    border: { display: false },
                    grid:   { display: false }
                },
                y: {
                    type: 'category',
                    labels: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
                    reverse: false,
                    ticks: {
                        stepSize: 1,
                        display: true,
                        color: getThemeColor('--bs-secondary-color'),
                        font: { size: 11 }
                    },
                    border: { display: false },
                    grid:   { display: false }
                }
            }
        }
    });
}

// Small "Less -> More" legend, GitHub-contributions style, so the color
// ramp actually means something instead of being left to guesswork.
function renderHeatmapLegend(hcolor) {
    const steps = [0, 0.2, 0.45, 0.7, 1];
    const swatches = steps.map(a => {
        const bg = a === 0
            ? Chart.helpers.color(getThemeColor('--bs-secondary-color') || '#888').alpha(0.12).rgbString()
            : Chart.helpers.color(hcolor).alpha(a).rgbString();
        return `<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${bg};border:1px solid ${Chart.helpers.color(getThemeColor('--bs-border-color-translucent') || 'grey').alpha(0.6).rgbString()};"></span>`;
    }).join('');
    return `<div class="d-flex align-items-center gap-1 justify-content-end small text-muted mt-1">
        <span>Less</span>${swatches}<span>More</span>
    </div>`;
}
