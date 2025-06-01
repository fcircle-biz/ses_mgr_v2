// Dashboard Component for SES Manager Prototype

Alpine.data('dashboard', () => ({
  // Dashboard state
  kpis: {
    totalEngineers: 0,
    availableEngineers: 0,
    activeProjects: 0,
    pendingContracts: 0,
    monthlySales: 0,
    monthlyTarget: 0,
    salesGrowth: 0,
    utilizationRate: 0
  },
  
  chartData: {
    salesTrend: null,
    skillDistribution: null,
    projectStatus: null
  },
  
  recentActivity: [],
  
  loading: {
    kpis: false,
    charts: false,
    activity: false
  },
  
  error: {
    kpis: null,
    charts: null,
    activity: null
  },
  
  refreshInterval: null,
  chartInstances: {},
  
  // Initialization
  async init() {
    console.log('Initializing dashboard component');
    await this.loadDashboardData();
    this.setupAutoRefresh();
  },
  
  // Data loading
  async loadDashboardData() {
    await Promise.all([
      this.loadKPIs(),
      this.loadChartData(),
      this.loadRecentActivity()
    ]);
  },
  
  async loadKPIs() {
    try {
      this.loading.kpis = true;
      this.error.kpis = null;
      
      const response = await window.api.get('/api/dashboard/kpis');
      this.kpis = response.data;
      
      // Trigger animations for KPI cards
      this.$nextTick(() => {
        this.animateKPIs();
      });
      
    } catch (error) {
      console.error('Failed to load KPIs:', error);
      this.error.kpis = 'KPIデータの読み込みに失敗しました';
    } finally {
      this.loading.kpis = false;
    }
  },
  
  async loadChartData() {
    try {
      this.loading.charts = true;
      this.error.charts = null;
      
      const response = await window.api.get('/api/dashboard/charts');
      this.chartData = response.data;
      
      // Initialize charts after data is loaded
      this.$nextTick(() => {
        this.initializeCharts();
      });
      
    } catch (error) {
      console.error('Failed to load chart data:', error);
      this.error.charts = 'チャートデータの読み込みに失敗しました';
    } finally {
      this.loading.charts = false;
    }
  },
  
  async loadRecentActivity() {
    try {
      this.loading.activity = true;
      this.error.activity = null;
      
      const response = await window.api.get('/api/dashboard/recent');
      this.recentActivity = response.data;
      
    } catch (error) {
      console.error('Failed to load recent activity:', error);
      this.error.activity = '最新活動の読み込みに失敗しました';
    } finally {
      this.loading.activity = false;
    }
  },
  
  // Chart initialization
  initializeCharts() {
    this.initializeSalesChart();
    this.initializeSkillChart();
    this.initializeProjectStatusChart();
  },
  
  initializeSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas || !this.chartData.salesTrend) return;
    
    // Destroy existing chart if it exists
    if (this.chartInstances.salesChart) {
      this.chartInstances.salesChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    this.chartInstances.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.chartData.salesTrend.labels,
        datasets: [{
          label: '売上',
          data: this.chartData.salesTrend.datasets[0].data,
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0d6efd',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }, {
          label: '目標',
          data: this.chartData.salesTrend.datasets[1].data,
          borderColor: '#dc3545',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          pointBackgroundColor: '#dc3545',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#0d6efd',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ¥' + 
                       context.parsed.y.toLocaleString('ja-JP');
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6c757d'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            ticks: {
              color: '#6c757d',
              callback: function(value) {
                return '¥' + (value / 1000000).toFixed(1) + 'M';
              }
            }
          }
        },
        animation: {
          duration: 2000,
          easing: 'easeOutQuart'
        }
      }
    });
  },
  
  initializeSkillChart() {
    const canvas = document.getElementById('skillChart');
    if (!canvas || !this.chartData.skillDistribution) return;
    
    if (this.chartInstances.skillChart) {
      this.chartInstances.skillChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    this.chartInstances.skillChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.chartData.skillDistribution.labels,
        datasets: [{
          data: this.chartData.skillDistribution.data,
          backgroundColor: [
            '#0d6efd',
            '#198754',
            '#ffc107',
            '#dc3545',
            '#6f42c1'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return context.label + ': ' + context.parsed + '人 (' + percentage + '%)';
              }
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutBounce'
        }
      }
    });
  },
  
  initializeProjectStatusChart() {
    const canvas = document.getElementById('projectStatusChart');
    if (!canvas || !this.chartData.projectStatus) return;
    
    if (this.chartInstances.projectStatusChart) {
      this.chartInstances.projectStatusChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    this.chartInstances.projectStatusChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.chartData.projectStatus.labels,
        datasets: [{
          data: this.chartData.projectStatus.data,
          backgroundColor: this.chartData.projectStatus.backgroundColor,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  },
  
  // KPI animations
  animateKPIs() {
    this.animateCounter('.stats-value', this.kpis.totalEngineers, 0, 1000);
    this.animateCounter('.kpi-card.success .stats-value', this.kpis.activeProjects, 0, 1200);
    this.animateCounter('.kpi-card.warning .stats-value', this.kpis.monthlySales, 0, 1500, (value) => {
      return '¥' + (value / 1000000).toFixed(1) + 'M';
    });
  },
  
  animateCounter(selector, endValue, startValue = 0, duration = 1000, formatter = null) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    const startTime = performance.now();
    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;
      
      if (formatter) {
        element.textContent = formatter(currentValue);
      } else {
        element.textContent = Math.round(currentValue);
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };
    
    requestAnimationFrame(updateCounter);
  },
  
  // Auto refresh
  setupAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 30000);
  },
  
  async refreshData() {
    try {
      await this.loadKPIs();
      window.app.showToast('info', '更新', 'ダッシュボードが更新されました', 2000);
    } catch (error) {
      console.error('Auto refresh failed:', error);
    }
  },
  
  // Manual refresh
  async manualRefresh() {
    window.app.showToast('info', '更新中', 'ダッシュボードを更新しています...', 1000);
    await this.loadDashboardData();
    window.app.showToast('success', '完了', 'ダッシュボードが更新されました', 2000);
  },
  
  // Chart period switching
  switchChartPeriod(period) {
    // This would update the chart data based on the selected period
    console.log('Switching chart period to:', period);
    // Implementation would involve calling API with period parameter
  },
  
  // Utility methods
  formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num);
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  },
  
  formatPercentage(value) {
    return (value * 100).toFixed(1) + '%';
  },
  
  getActivityIcon(type) {
    const icons = {
      'engineer_registered': 'bi-person-plus',
      'contract_signed': 'bi-file-check',
      'project_started': 'bi-play-circle',
      'payment_received': 'bi-credit-card',
      'milestone_completed': 'bi-flag-fill'
    };
    return icons[type] || 'bi-info-circle';
  },
  
  getActivityColor(type) {
    const colors = {
      'engineer_registered': 'success',
      'contract_signed': 'primary',
      'project_started': 'info',
      'payment_received': 'warning',
      'milestone_completed': 'success'
    };
    return colors[type] || 'secondary';
  },
  
  // Navigation helpers
  navigateToEngineers() {
    window.app.navigate('engineers');
  },
  
  navigateToProjects() {
    window.app.navigate('projects');
  },
  
  navigateToContracts() {
    window.app.navigate('contracts');
  },
  
  navigateToReports() {
    window.app.navigate('reports');
  },
  
  // Cleanup
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Destroy chart instances
    Object.values(this.chartInstances).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }
}));

// Dashboard-specific utilities
window.dashboardUtils = {
  // KPI calculation helpers
  calculateGrowthRate(current, previous) {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },
  
  calculateUtilizationRate(assigned, total) {
    if (total === 0) return 0;
    return (assigned / total) * 100;
  },
  
  // Chart color schemes
  getColorScheme(type) {
    const schemes = {
      primary: ['#0d6efd', '#6ea8fe', '#9ec5fe', '#cfe2ff'],
      success: ['#198754', '#75b798', '#a3d3b7', '#d1eddb'],
      warning: ['#ffc107', '#ffda6a', '#ffe69c', '#fff3cd'],
      danger: ['#dc3545', '#ea868f', '#f1aeb5', '#f8d7da'],
      info: ['#0dcaf0', '#6edff6', '#98ecf9', '#b6f0fb']
    };
    return schemes[type] || schemes.primary;
  },
  
  // Performance metrics
  trackMetric(name, value) {
    // This would send metrics to analytics service
    console.log(`Metric: ${name} = ${value}`);
  }
};

console.log('Dashboard component loaded');