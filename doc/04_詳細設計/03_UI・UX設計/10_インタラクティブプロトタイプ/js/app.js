// Main Application JavaScript for SES Manager Prototype

// Global application state and utilities
window.app = {
  currentUser: null,
  currentPage: 'dashboard',
  breadcrumb: [],
  isLoading: false,
  hasError: false,
  errorMessage: '',
  toasts: [],
  notifications: {
    items: [],
    unread: 0
  },
  globalSearch: '',
  matchingAlerts: 3,
  
  // Initialize application
  async init() {
    console.log('Initializing SES Manager prototype...');
    
    // Set up current user
    this.currentUser = {
      id: 'USER001',
      name: '管理者 太郎',
      email: 'admin@ses-manager.com',
      role: 'ADMIN',
      avatar: 'assets/images/user-avatar.png'
    };
    
    // Load initial notifications
    await this.loadNotifications();
    
    // Set up global event listeners
    this.setupEventListeners();
    
    // Load initial page
    await this.navigate('dashboard');
    
    console.log('SES Manager prototype initialized successfully');
  },
  
  // Navigation management
  async navigate(page, params = {}) {
    try {
      this.isLoading = true;
      this.hasError = false;
      this.currentPage = page;
      
      // Update breadcrumb
      this.updateBreadcrumb(page);
      
      // Load page content
      await this.loadPageContent(page, params);
      
      // Update URL (for demo purposes)
      history.pushState({ page, params }, '', `#/${page}`);
      
    } catch (error) {
      console.error('Navigation error:', error);
      this.hasError = true;
      this.errorMessage = error.message;
    } finally {
      this.isLoading = false;
    }
  },
  
  // Update breadcrumb based on current page
  updateBreadcrumb(page) {
    const breadcrumbMap = {
      'dashboard': [
        { title: 'ダッシュボード', path: 'dashboard' }
      ],
      'engineers': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '技術者管理', path: 'engineers' }
      ],
      'engineers/new': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '技術者管理', path: 'engineers' },
        { title: '新規登録', path: 'engineers/new' }
      ],
      'engineers/detail': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '技術者管理', path: 'engineers' },
        { title: '技術者詳細', path: 'engineers/detail' }
      ],
      'projects': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '案件管理', path: 'projects' }
      ],
      'projects/new': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '案件管理', path: 'projects' },
        { title: '新規案件', path: 'projects/new' }
      ],
      'matching': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: 'マッチング', path: 'matching' }
      ],
      'contracts': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '契約管理', path: 'contracts' }
      ],
      'timesheets': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '勤怠・工数', path: 'timesheets' }
      ],
      'billing': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '請求・支払', path: 'billing' }
      ],
      'reports': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: 'レポート', path: 'reports' }
      ],
      'notifications': [
        { title: 'ダッシュボード', path: 'dashboard' },
        { title: '通知', path: 'notifications' }
      ]
    };
    
    this.breadcrumb = breadcrumbMap[page] || [
      { title: 'ダッシュボード', path: 'dashboard' }
    ];
  },
  
  // Load page content dynamically
  async loadPageContent(page, params = {}) {
    const pageContent = document.getElementById('page-content');
    
    // Show loading state
    pageContent.innerHTML = `
      <div class="loading-container text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">読み込み中...</span>
        </div>
        <div class="mt-2">ページを読み込んでいます...</div>
      </div>
    `;
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Load content based on page
    switch (page) {
      case 'dashboard':
        await this.loadDashboard();
        break;
      case 'engineers':
        await this.loadEngineersPage();
        break;
      case 'engineers/new':
        await this.loadEngineerForm();
        break;
      case 'engineers/detail':
        await this.loadEngineerDetail(params.id);
        break;
      case 'projects':
        await this.loadProjectsPage();
        break;
      case 'projects/new':
        await this.loadProjectForm();
        break;
      case 'matching':
        await this.loadMatchingPage();
        break;
      case 'contracts':
        await this.loadContractsPage();
        break;
      case 'timesheets':
        await this.loadTimesheetsPage();
        break;
      case 'billing':
        await this.loadBillingPage();
        break;
      case 'reports':
        await this.loadReportsPage();
        break;
      case 'notifications':
        await this.loadNotificationsPage();
        break;
      default:
        this.load404Page();
    }
  },
  
  // Dashboard loading
  async loadDashboard() {
    try {
      const [kpisResponse, chartsResponse, activityResponse] = await Promise.all([
        window.api.get('/api/dashboard/kpis'),
        window.api.get('/api/dashboard/charts'),
        window.api.get('/api/dashboard/recent')
      ]);
      
      const content = this.generateDashboardHTML(
        kpisResponse.data,
        chartsResponse.data,
        activityResponse.data
      );
      
      document.getElementById('page-content').innerHTML = content;
      
      // Initialize charts after DOM is ready
      this.$nextTick(() => {
        this.initializeDashboardCharts(chartsResponse.data);
      });
      
    } catch (error) {
      throw new Error('ダッシュボードの読み込みに失敗しました');
    }
  },
  
  // Engineers page loading
  async loadEngineersPage() {
    try {
      const response = await window.api.get('/api/engineers?page=1&size=20');
      const skillsResponse = await window.api.get('/api/skills');
      
      const content = this.generateEngineersListHTML(response.data, skillsResponse.data);
      document.getElementById('page-content').innerHTML = content;
      
    } catch (error) {
      throw new Error('技術者一覧の読み込みに失敗しました');
    }
  },
  
  // Engineer form loading
  async loadEngineerForm(engineerId = null) {
    try {
      const skillsResponse = await window.api.get('/api/skills');
      let engineer = null;
      
      if (engineerId) {
        const engineerResponse = await window.api.get(`/api/engineers/${engineerId}`);
        engineer = engineerResponse.data;
      }
      
      const content = this.generateEngineerFormHTML(engineer, skillsResponse.data);
      document.getElementById('page-content').innerHTML = content;
      
    } catch (error) {
      throw new Error('技術者フォームの読み込みに失敗しました');
    }
  },
  
  // Projects page loading
  async loadProjectsPage() {
    try {
      const response = await window.api.get('/api/projects?page=1&size=20');
      const skillsResponse = await window.api.get('/api/skills');
      const companiesResponse = await window.api.get('/api/companies');
      
      const content = this.generateProjectsListHTML(
        response.data,
        skillsResponse.data,
        companiesResponse.data
      );
      document.getElementById('page-content').innerHTML = content;
      
    } catch (error) {
      throw new Error('案件一覧の読み込みに失敗しました');
    }
  },
  
  // Matching page loading
  async loadMatchingPage() {
    try {
      const [projectsResponse, skillsResponse] = await Promise.all([
        window.api.get('/api/projects?status=IN_PROGRESS'),
        window.api.get('/api/skills')
      ]);
      
      const content = this.generateMatchingHTML(
        projectsResponse.data.content,
        skillsResponse.data
      );
      document.getElementById('page-content').innerHTML = content;
      
    } catch (error) {
      throw new Error('マッチングページの読み込みに失敗しました');
    }
  },
  
  // Other page loaders (simplified for prototype)
  async loadContractsPage() {
    document.getElementById('page-content').innerHTML = `
      <div class="page-header mb-4">
        <h1 class="h3">契約管理</h1>
        <p class="text-muted">契約の作成・管理・電子署名を行います</p>
      </div>
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        契約管理機能は開発中です。
      </div>
    `;
  },
  
  async loadTimesheetsPage() {
    document.getElementById('page-content').innerHTML = `
      <div class="page-header mb-4">
        <h1 class="h3">勤怠・工数管理</h1>
        <p class="text-muted">勤怠入力・承認・集計を行います</p>
      </div>
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        勤怠・工数管理機能は開発中です。
      </div>
    `;
  },
  
  async loadBillingPage() {
    document.getElementById('page-content').innerHTML = `
      <div class="page-header mb-4">
        <h1 class="h3">請求・支払管理</h1>
        <p class="text-muted">請求書作成・支払管理・売上分析を行います</p>
      </div>
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        請求・支払管理機能は開発中です。
      </div>
    `;
  },
  
  async loadReportsPage() {
    document.getElementById('page-content').innerHTML = `
      <div class="page-header mb-4">
        <h1 class="h3">レポート・分析</h1>
        <p class="text-muted">各種レポートの作成・分析を行います</p>
      </div>
      <div class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        レポート・分析機能は開発中です。
      </div>
    `;
  },
  
  async loadNotificationsPage() {
    try {
      const response = await window.api.get('/api/notifications');
      const content = this.generateNotificationsHTML(response.data);
      document.getElementById('page-content').innerHTML = content;
    } catch (error) {
      throw new Error('通知一覧の読み込みに失敗しました');
    }
  },
  
  load404Page() {
    document.getElementById('page-content').innerHTML = `
      <div class="error-container">
        <div class="text-center">
          <i class="bi bi-exclamation-triangle display-1 text-warning"></i>
          <h2 class="mt-3">ページが見つかりません</h2>
          <p class="text-muted">指定されたページは存在しないか、移動された可能性があります。</p>
          <button class="btn btn-primary" onclick="app.navigate('dashboard')">
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    `;
  },
  
  // Notification management
  async loadNotifications() {
    try {
      const response = await window.api.get('/api/notifications');
      this.notifications.items = response.data.content;
      this.notifications.unread = this.notifications.items.filter(n => !n.read).length;
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  },
  
  async markAsRead(notificationId) {
    try {
      await window.api.put(`/api/notifications/${notificationId}/read`);
      const notification = this.notifications.items.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifications.unread = Math.max(0, this.notifications.unread - 1);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },
  
  async markAllAsRead() {
    try {
      await window.api.put('/api/notifications/read-all');
      this.notifications.items.forEach(n => n.read = true);
      this.notifications.unread = 0;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
  
  // Toast management
  showToast(type, title, message, duration = 5000) {
    const toast = {
      id: 'toast-' + Date.now(),
      type,
      title,
      message,
      timeAgo: 'たった今'
    };
    
    this.toasts.push(toast);
    
    setTimeout(() => {
      this.removeToast(toast.id);
    }, duration);
  },
  
  removeToast(toastId) {
    const index = this.toasts.findIndex(t => t.id === toastId);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  },
  
  getToastIcon(type) {
    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-exclamation-triangle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };
    return icons[type] || 'bi-info-circle-fill';
  },
  
  // Global search
  async performGlobalSearch() {
    if (!this.globalSearch.trim()) return;
    
    try {
      // Search across multiple entities
      const [engineersResponse, projectsResponse] = await Promise.all([
        window.api.get(`/api/engineers/search?q=${encodeURIComponent(this.globalSearch)}`),
        window.api.get(`/api/projects/search?q=${encodeURIComponent(this.globalSearch)}`)
      ]);
      
      const results = {
        engineers: engineersResponse.data.content,
        projects: projectsResponse.data.content
      };
      
      // Show search results in a modal or navigate to search results page
      this.showSearchResults(results);
      
    } catch (error) {
      console.error('Global search failed:', error);
      this.showToast('error', 'エラー', '検索に失敗しました');
    }
  },
  
  showSearchResults(results) {
    // This would typically show a search results modal or navigate to a results page
    console.log('Search results:', results);
    this.showToast('info', '検索完了', `${results.engineers.length + results.projects.length}件の結果が見つかりました`);
  },
  
  // Retry mechanism
  async retryLoad() {
    this.hasError = false;
    this.errorMessage = '';
    await this.navigate(this.currentPage);
  },
  
  // Logout
  logout() {
    if (confirm('ログアウトしますか？')) {
      // Clear any stored data
      localStorage.removeItem('ses-auth-token');
      // Redirect to login (in real app)
      alert('ログアウトしました（デモでは実際のログアウトは行われません）');
    }
  },
  
  // Event listeners setup
  setupEventListeners() {
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.page) {
        this.navigate(event.state.page, event.state.params);
      }
    });
    
    // Handle global shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K for global search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.main-content input[type="text"]')?.focus();
      }
    });
  },
  
  // Utility method for Alpine.js $nextTick equivalent
  $nextTick(callback) {
    setTimeout(callback, 0);
  }
};

// Alpine.js component data functions will be loaded from separate files
// This is the main application data
Alpine.data('app', () => window.app);

// Navigation component
Alpine.data('navigation', () => ({
  currentPage: Alpine.raw(window.app).currentPage,
  
  navigate(page) {
    return window.app.navigate(page);
  }
}));

// Initialize when Alpine.js is ready
document.addEventListener('alpine:init', () => {
  console.log('Alpine.js initialized');
});

// Auto-start when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, waiting for Alpine.js...');
});