// js/charts.js - High-Performance Interactive Visualizations for Admin Dashboard (Chart.js)

let chartStatusInstance = null;
let chartTrendInstance = null;
let chartWorkloadInstance = null;
let chartServiceDistInstance = null;

// Helper to configure global Chart.js defaults
function configureChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    Chart.defaults.plugins.tooltip.titleFont = { size: 13, weight: 'bold' };
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.displayColors = true;
}

// 1. Status Breakdown Doughnut Chart
function initStatusChart(canvasId, statusCounts) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartStatusInstance) chartStatusInstance.destroy();

    const labels = ['Pending', 'Assigned', 'In Progress', 'Completed'];
    const dataValues = [
        statusCounts.Pending || 0,
        statusCounts.Assigned || 0,
        statusCounts['In Progress'] || 0,
        statusCounts.Completed || 0
    ];

    const bgColors = ['#f59e0b', '#8b5cf6', '#3b82f6', '#10b981'];

    chartStatusInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 14, font: { weight: 600 } }
                }
            }
        }
    });
}

// 2. 7-Day Service Intake & Completion Trend Line Chart
function initTrendChart(canvasId, trendData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartTrendInstance) chartTrendInstance.destroy();

    const chartCtx = ctx.getContext('2d');
    const gradientBlue = chartCtx.createLinearGradient(0, 0, 0, 240);
    gradientBlue.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    gradientBlue.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const gradientGreen = chartCtx.createLinearGradient(0, 0, 0, 240);
    gradientGreen.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradientGreen.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    chartTrendInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'New Bookings',
                    data: trendData.bookings || [4, 6, 5, 8, 7, 9, 6],
                    borderColor: '#3b82f6',
                    backgroundColor: gradientBlue,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#3b82f6'
                },
                {
                    label: 'Completions',
                    data: trendData.completions || [3, 4, 6, 7, 6, 8, 5],
                    borderColor: '#10b981',
                    backgroundColor: gradientGreen,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10b981'
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
                    grid: { color: '#f1f5f9' },
                    ticks: { stepSize: 2 }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 12, font: { weight: 600 } }
                }
            }
        }
    });
}

// 3. Technician Workload Bar Chart
function initWorkloadChart(canvasId, workloadData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartWorkloadInstance) chartWorkloadInstance.destroy();

    chartWorkloadInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: workloadData.labels || ['Suresh', 'Ramesh', 'Deepak'],
            datasets: [
                {
                    label: 'Active Jobs',
                    data: workloadData.assigned || [2, 1, 0],
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6,
                    barPercentage: 0.6
                },
                {
                    label: 'Completed Jobs',
                    data: workloadData.completed || [5, 4, 3],
                    backgroundColor: '#10b981',
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
                    grid: { color: '#f1f5f9' },
                    ticks: { stepSize: 1 }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 12, padding: 10, font: { weight: 600 } }
                }
            }
        }
    });
}

// 4. Service Type Breakdown Bar Chart
function initServiceDistChart(canvasId, distData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (chartServiceDistInstance) chartServiceDistInstance.destroy();

    chartServiceDistInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: distData.labels || ['AC Repair', 'Servicing', 'Installation', 'Gas Refill', 'AMC'],
            datasets: [{
                label: 'Total Requests',
                data: distData.data || [12, 18, 5, 8, 14],
                backgroundColor: [
                    '#3b82f6',
                    '#06b6d4',
                    '#8b5cf6',
                    '#f59e0b',
                    '#10b981'
                ],
                borderRadius: 8,
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
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Master initialization
function initAllCharts(analytics) {
    configureChartDefaults();
    if (!analytics) return;

    if (analytics.statusCounts) {
        initStatusChart('chartJobStatus', analytics.statusCounts);
    }
    if (analytics.trend) {
        initTrendChart('chartTrend', analytics.trend);
    }
    if (analytics.technicianWorkload) {
        initWorkloadChart('chartTechWorkload', analytics.technicianWorkload);
    }
    if (analytics.serviceDistribution) {
        initServiceDistChart('chartServiceTypes', analytics.serviceDistribution);
    }
}
