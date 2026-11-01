// js/charts.js - High-Performance Mineral Architecture Telemetry Suite for Extreme Sales & Services (Chart.js)
// ═══════════════════════════════════════════════════════════════════════════════
// Strict Live Data Grounding: Zero synthetic fallbacks or hardcoded arrays
// ═══════════════════════════════════════════════════════════════════════════════

let chartStatusInstance = null;
let chartTrendInstance = null;
let chartWorkloadInstance = null;
let chartServiceDistInstance = null;
let chartFmeaRiskInstance = null;

let currentTrendDays = 7;
let cachedAnalyticsData = null;

// Mineral Architecture Palette Tokens
const PALETTE = {
    COPPER: '#A05B3A',
    COPPER_ALPHA: 'rgba(160, 91, 58, 0.28)',
    JADE: '#77B89A',
    JADE_ALPHA: 'rgba(119, 184, 154, 0.28)',
    AMBER_QUEUE: '#C27A23',
    INDIGO_DISPATCH: '#8B5CF6',
    SKY_PROGRESS: '#0284C7',
    CRIMSON_CRITICAL: '#EF4444',
    GOLD_HIGH: '#F59E0B',
    BRONZE_TEXT: '#655448',
    PORCELAIN: '#FDFBF7',
    ESPRESSO: '#27211D',
    TAUPE_GRID_LIGHT: 'rgba(184, 170, 152, 0.22)',
    TAUPE_GRID_DARK: 'rgba(255, 255, 255, 0.08)'
};

// Global Chart.js Defaults
function configureChartDefaults() {
    if (typeof Chart === 'undefined') return;
    const isDark = document.documentElement.classList.contains('dark');
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT;
    Chart.defaults.plugins.tooltip.backgroundColor = isDark ? 'rgba(39, 33, 29, 0.95)' : 'rgba(52, 44, 39, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#FDFBF7';
    Chart.defaults.plugins.tooltip.bodyColor = '#E4C99A';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(184, 170, 152, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: 'bold' };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.displayColors = true;
}

// Custom Center Text Plugin for Doughnut Charts (Fixed Zero-Baseline KPI Count)
const doughnutCenterTextPlugin = {
    id: 'doughnutCenterText',
    beforeDraw(chart) {
        if (chart.config.type !== 'doughnut') return;
        const { ctx, chartArea: { top, bottom, left, right, width, height } } = chart;
        const dataset = chart.data.datasets && chart.data.datasets[0];
        const total = (dataset && typeof dataset.realTotal === 'number')
            ? dataset.realTotal
            : (dataset && dataset.data ? dataset.data.reduce((a, b) => a + (Number(b) || 0), 0) : 0);
        const isDark = document.documentElement.classList.contains('dark');

        ctx.save();
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Primary Count
        ctx.font = '900 24px monospace';
        ctx.fillStyle = isDark ? '#FDFBF7' : '#342C27';
        ctx.fillText(String(total), centerX, centerY - 6);

        // Subtitle
        ctx.font = '700 9px sans-serif';
        ctx.fillStyle = isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT;
        ctx.fillText(total > 0 ? 'ACTIVE QUEUE' : 'FLEET STANDBY', centerX, centerY + 14);

        ctx.restore();
    }
};

// 1. Status Breakdown Doughnut Chart
function initStatusChart(canvasId, statusCounts) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (chartStatusInstance) chartStatusInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const counts = statusCounts || {};
    const labels = ['Pending', 'Assigned', 'In Progress', 'Completed'];
    const dataValues = [
        Number(counts.Pending) || 0,
        Number(counts.Assigned) || 0,
        Number(counts['In Progress']) || 0,
        Number(counts.Completed) || 0
    ];

    const total = dataValues.reduce((a, b) => a + b, 0);
    const bgColors = [PALETTE.AMBER_QUEUE, PALETTE.INDIGO_DISPATCH, PALETTE.SKY_PROGRESS, PALETTE.JADE];

    chartStatusInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: total > 0 ? dataValues : [1],
                realTotal: total,
                backgroundColor: total > 0 ? bgColors : [isDark ? 'rgba(184, 170, 152, 0.18)' : 'rgba(184, 170, 152, 0.22)'],
                borderWidth: 2,
                borderColor: isDark ? '#27211D' : '#FDFBF7',
                hoverOffset: total > 0 ? 6 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '74%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        padding: 12,
                        font: { weight: 700, size: 10 },
                        color: isDark ? '#FDFBF7' : '#342C27',
                        generateLabels: (chart) => {
                            if (total === 0) {
                                return [{
                                    text: 'Awaiting Active Requests (0 Live)',
                                    fillStyle: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                    hidden: false,
                                    lineCap: 'round',
                                    pointStyle: 'circle'
                                }];
                            }
                            return labels.map((l, i) => ({
                                text: `${l}: ${dataValues[i]}`,
                                fillStyle: bgColors[i],
                                hidden: false,
                                pointStyle: 'circle'
                            }));
                        }
                    }
                },
                tooltip: {
                    enabled: total > 0,
                    callbacks: {
                        label(context) {
                            const val = context.raw || 0;
                            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                            return ` ${context.label}: ${val} requests (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [doughnutCenterTextPlugin]
    });
}

// 2. Volume & Completion Area Trend Chart (Supports 7-Day & 30-Day Switcher)
function initTrendChart(canvasId, trendData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (chartTrendInstance) chartTrendInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const chartCtx = ctx.getContext('2d');

    const gradientCopper = chartCtx.createLinearGradient(0, 0, 0, 220);
    gradientCopper.addColorStop(0, PALETTE.COPPER_ALPHA);
    gradientCopper.addColorStop(1, 'rgba(160, 91, 58, 0.0)');

    const gradientJade = chartCtx.createLinearGradient(0, 0, 0, 220);
    gradientJade.addColorStop(0, PALETTE.JADE_ALPHA);
    gradientJade.addColorStop(1, 'rgba(119, 184, 154, 0.0)');

    const gridColor = isDark ? PALETTE.TAUPE_GRID_DARK : PALETTE.TAUPE_GRID_LIGHT;

    // Truthful data or empty zero-filled baseline
    const labels = (trendData && trendData.labels && trendData.labels.length > 0)
        ? trendData.labels
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const bookings = (trendData && trendData.bookings && trendData.bookings.length > 0)
        ? trendData.bookings
        : labels.map(() => 0);

    const completions = (trendData && trendData.completions && trendData.completions.length > 0)
        ? trendData.completions
        : labels.map(() => 0);

    chartTrendInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'New Bookings',
                    data: bookings,
                    borderColor: PALETTE.COPPER,
                    backgroundColor: gradientCopper,
                    fill: true,
                    tension: 0.42,
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointHoverRadius: 6,
                    pointBackgroundColor: PALETTE.COPPER
                },
                {
                    label: 'Completions',
                    data: completions,
                    borderColor: PALETTE.JADE,
                    backgroundColor: gradientJade,
                    fill: true,
                    tension: 0.42,
                    borderWidth: 2.5,
                    pointRadius: 3.5,
                    pointHoverRadius: 6,
                    pointBackgroundColor: PALETTE.JADE
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 10,
                        font: { weight: 700, size: 10 },
                        color: isDark ? '#FDFBF7' : '#342C27'
                    }
                },
                tooltip: {
                    callbacks: {
                        afterBody(items) {
                            if (items.length >= 2) {
                                const b = items[0].raw || 0;
                                const c = items[1].raw || 0;
                                const net = b - c;
                                return `Net Intake Delta: ${net >= 0 ? '+' + net : net}`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

// 3. Technician Workload Bar Chart
function initWorkloadChart(canvasId, workloadData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (chartWorkloadInstance) chartWorkloadInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? PALETTE.TAUPE_GRID_DARK : PALETTE.TAUPE_GRID_LIGHT;

    const hasData = workloadData && workloadData.labels && workloadData.labels.length > 0;
    const labels = hasData ? workloadData.labels : ['No Active Technicians'];
    const assigned = hasData ? workloadData.assigned : [0];
    const completed = hasData ? workloadData.completed : [0];

    chartWorkloadInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Active Jobs',
                    data: assigned,
                    backgroundColor: PALETTE.COPPER,
                    borderRadius: 6,
                    barPercentage: 0.6
                },
                {
                    label: 'Completed Jobs',
                    data: completed,
                    backgroundColor: PALETTE.JADE,
                    borderRadius: 6,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        boxWidth: 10,
                        padding: 10,
                        font: { weight: 700, size: 10 },
                        color: isDark ? '#FDFBF7' : '#342C27'
                    }
                }
            }
        }
    });
}

// 4. Service Type Breakdown Bar Chart
function initServiceDistChart(canvasId, distData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (chartServiceDistInstance) chartServiceDistInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? PALETTE.TAUPE_GRID_DARK : PALETTE.TAUPE_GRID_LIGHT;

    const defaultCategories = ['AC Repair', 'Servicing', 'Installation', 'Gas Refill', 'AMC Visits'];
    const labels = (distData && distData.labels && distData.labels.length > 0) ? distData.labels : defaultCategories;
    const dataValues = (distData && distData.data && distData.data.length > 0) ? distData.data : labels.map(() => 0);

    const barColors = [
        PALETTE.COPPER,
        PALETTE.JADE,
        PALETTE.SKY_PROGRESS,
        PALETTE.GOLD_HIGH,
        PALETTE.INDIGO_DISPATCH
    ];

    chartServiceDistInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Service Requests',
                data: dataValues,
                backgroundColor: barColors,
                borderRadius: 6,
                barPercentage: 0.65
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        stepSize: 1,
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? '#B8AA98' : PALETTE.BRONZE_TEXT,
                        font: { weight: 600 }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return ` ${context.label}: ${context.raw} requests`;
                        }
                    }
                }
            }
        }
    });
}

// 5. NEW: FMEA Risk Severity Distribution Chart
function initFmeaRiskChart(canvasId, fmeaData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;

    if (chartFmeaRiskInstance) chartFmeaRiskInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const labels = ['Critical (RPN ≥300)', 'High (200–299)', 'Moderate (100–199)', 'Minor (<100)'];
    const counts = (fmeaData && fmeaData.data) ? fmeaData.data : [0, 0, 0, 0];
    const total = counts.reduce((a, b) => a + b, 0);

    const colors = [
        PALETTE.CRIMSON_CRITICAL,
        PALETTE.GOLD_HIGH,
        PALETTE.SKY_PROGRESS,
        PALETTE.JADE
    ];

    chartFmeaRiskInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: total > 0 ? counts : [1],
                realTotal: total,
                backgroundColor: total > 0 ? colors : [isDark ? 'rgba(184, 170, 152, 0.18)' : 'rgba(184, 170, 152, 0.22)'],
                borderWidth: 2,
                borderColor: isDark ? '#27211D' : '#FDFBF7'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 8,
                        padding: 8,
                        font: { weight: 700, size: 9 },
                        color: isDark ? '#FDFBF7' : '#342C27'
                    }
                },
                tooltip: {
                    enabled: total > 0,
                    callbacks: {
                        label(context) {
                            return ` ${context.label}: ${context.raw} complaints`;
                        }
                    }
                }
            }
        }
    });
}

// Timeframe Switcher (7-Day vs 30-Day Trend)
function switchTrendTimeframe(days) {
    currentTrendDays = days;
    const btn7 = document.getElementById('btnTrend7d');
    const btn30 = document.getElementById('btnTrend30d');

    if (btn7 && btn30) {
        if (days === 7) {
            btn7.className = 'px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#A05B3A] text-white shadow-xs transition';
            btn30.className = 'px-2.5 py-1 text-[10px] font-bold rounded-lg text-[#655448] dark:text-[#B8AA98] hover:text-black dark:hover:text-white transition';
        } else {
            btn30.className = 'px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[#A05B3A] text-white shadow-xs transition';
            btn7.className = 'px-2.5 py-1 text-[10px] font-bold rounded-lg text-[#655448] dark:text-[#B8AA98] hover:text-black dark:hover:text-white transition';
        }
    }

    if (cachedAnalyticsData) {
        const trendSource = (days === 30 && cachedAnalyticsData.trend30d)
            ? cachedAnalyticsData.trend30d
            : cachedAnalyticsData.trend;
        initTrendChart('chartTrend', trendSource);
    }
}

// Master initialization
function initAllCharts(analytics) {
    configureChartDefaults();
    if (!analytics) return;
    cachedAnalyticsData = analytics;

    initStatusChart('chartJobStatus', analytics.statusCounts);

    const trendSource = (currentTrendDays === 30 && analytics.trend30d) ? analytics.trend30d : analytics.trend;
    initTrendChart('chartTrend', trendSource);

    initWorkloadChart('chartTechWorkload', analytics.technicianWorkload);
    initServiceDistChart('chartServiceTypes', analytics.serviceDistribution);

    if (document.getElementById('chartFmeaRisk')) {
        initFmeaRiskChart('chartFmeaRisk', analytics.fmeaDistribution);
    }
}

// Redraw on theme toggle
window.addEventListener('theme-changed', () => {
    if (cachedAnalyticsData) {
        initAllCharts(cachedAnalyticsData);
    }
});

// Window exports
window.initAllCharts = initAllCharts;
window.initStatusChart = initStatusChart;
window.initTrendChart = initTrendChart;
window.initWorkloadChart = initWorkloadChart;
window.initServiceDistChart = initServiceDistChart;
window.initFmeaRiskChart = initFmeaRiskChart;
window.switchTrendTimeframe = switchTrendTimeframe;
