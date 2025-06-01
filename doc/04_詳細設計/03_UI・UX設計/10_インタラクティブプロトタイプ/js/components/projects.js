// Projects Management Component for SES Manager Prototype

Alpine.data('projects', () => ({
  // Data state
  projects: [],
  skills: [],
  companies: [],
  
  // Pagination state
  currentPage: 1,
  pageSize: 12,
  totalElements: 0,
  totalPages: 0,
  
  // Search and filter state
  searchQuery: '',
  filters: {
    status: '',
    priority: '',
    skills: [],
    budgetMin: '',
    budgetMax: '',
    location: '',
    remoteWorkRatio: '',
    clientCompany: '',
    startDateFrom: '',
    startDateTo: ''
  },
  
  // UI state
  loading: false,
  error: null,
  selectedProjects: [],
  viewMode: 'cards', // 'cards' or 'table'
  sortField: 'createdAt',
  sortDirection: 'desc',
  
  // Form state
  showForm: false,
  editingProject: null,
  formData: {
    title: '',
    description: '',
    clientCompany: '',
    period: {
      start: '',
      end: ''
    },
    budget: {
      min: '',
      max: ''
    },
    requiredSkills: [],
    location: '',
    remoteWorkRatio: 0,
    priority: 'MEDIUM',
    status: 'PLANNING',
    maxTeamSize: 1,
    notes: ''
  },
  formErrors: {},
  
  // Bulk actions
  bulkActionType: '',
  showBulkActions: false,
  
  // Project detail modal
  showDetailModal: false,
  detailProject: null,
  
  // Initialization
  async init() {
    console.log('Initializing projects component');
    await Promise.all([
      this.loadSkills(),
      this.loadCompanies(),
      this.loadProjects()
    ]);
    this.setupEventListeners();
  },
  
  // Data loading
  async loadProjects() {
    try {
      this.loading = true;
      this.error = null;
      
      const params = new URLSearchParams({
        page: this.currentPage,
        size: this.pageSize,
        sort: this.sortField,
        direction: this.sortDirection
      });
      
      // Add search query
      if (this.searchQuery.trim()) {
        params.append('search', this.searchQuery.trim());
      }
      
      // Add filters
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value);
          }
        }
      });
      
      const response = await window.api.get(`/api/projects?${params}`);
      const data = response.data;
      
      this.projects = data.content;
      this.totalElements = data.totalElements;
      this.totalPages = data.totalPages;
      this.currentPage = data.page;
      
      // Clear selections when data changes
      this.selectedProjects = [];
      this.updateBulkActionsVisibility();
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      this.error = '案件一覧の読み込みに失敗しました';
      window.app.showToast('error', 'エラー', this.error);
    } finally {
      this.loading = false;
    }
  },
  
  async loadSkills() {
    try {
      const response = await window.api.get('/api/skills');
      this.skills = response.data;
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  },
  
  async loadCompanies() {
    try {
      const response = await window.api.get('/api/companies');
      this.companies = response.data;
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  },
  
  // Search and filtering
  async performSearch() {
    this.currentPage = 1;
    await this.loadProjects();
    window.app.showToast('info', '検索完了', `${this.totalElements}件の結果が見つかりました`, 2000);
  },
  
  async clearSearch() {
    this.searchQuery = '';
    this.filters = {
      status: '',
      priority: '',
      skills: [],
      budgetMin: '',
      budgetMax: '',
      location: '',
      remoteWorkRatio: '',
      clientCompany: '',
      startDateFrom: '',
      startDateTo: ''
    };
    this.currentPage = 1;
    await this.loadProjects();
  },
  
  async applyFilters() {
    this.currentPage = 1;
    await this.loadProjects();
  },
  
  // Sorting
  async sort(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    await this.loadProjects();
  },
  
  getSortIcon(field) {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  },
  
  // Pagination
  async goToPage(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      await this.loadProjects();
    }
  },
  
  async changePageSize(size) {
    this.pageSize = parseInt(size);
    this.currentPage = 1;
    await this.loadProjects();
  },
  
  get pageNumbers() {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  },
  
  get startIndex() {
    return (this.currentPage - 1) * this.pageSize + 1;
  },
  
  get endIndex() {
    return Math.min(this.currentPage * this.pageSize, this.totalElements);
  },
  
  // Selection management
  toggleSelection(projectId) {
    const index = this.selectedProjects.indexOf(projectId);
    if (index > -1) {
      this.selectedProjects.splice(index, 1);
    } else {
      this.selectedProjects.push(projectId);
    }
    this.updateBulkActionsVisibility();
  },
  
  toggleAllSelection() {
    if (this.isAllSelected) {
      this.selectedProjects = [];
    } else {
      this.selectedProjects = this.projects.map(p => p.id);
    }
    this.updateBulkActionsVisibility();
  },
  
  get isAllSelected() {
    return this.projects.length > 0 && 
           this.selectedProjects.length === this.projects.length;
  },
  
  updateBulkActionsVisibility() {
    this.showBulkActions = this.selectedProjects.length > 0;
  },
  
  // Bulk actions
  async performBulkAction(action) {
    if (this.selectedProjects.length === 0) return;
    
    const count = this.selectedProjects.length;
    let message = '';
    
    switch (action) {
      case 'export':
        message = `${count}件の案件データをエクスポートしています...`;
        await this.bulkExport();
        break;
      case 'status':
        message = `${count}件の案件のステータスを変更しています...`;
        await this.bulkStatusChange();
        break;
      case 'archive':
        if (confirm(`選択した${count}件の案件をアーカイブしますか？`)) {
          message = `${count}件の案件をアーカイブしています...`;
          await this.bulkArchive();
        }
        break;
      case 'delete':
        if (confirm(`選択した${count}件の案件を削除しますか？この操作は取り消せません。`)) {
          message = `${count}件の案件を削除しています...`;
          await this.bulkDelete();
        }
        break;
    }
    
    if (message) {
      window.app.showToast('info', '処理中', message, 2000);
    }
  },
  
  async bulkExport() {
    // Simulate export functionality
    setTimeout(() => {
      window.app.showToast('success', '完了', 'エクスポートが完了しました');
      this.selectedProjects = [];
      this.updateBulkActionsVisibility();
    }, 1500);
  },
  
  async bulkStatusChange() {
    // Simulate bulk status change
    setTimeout(() => {
      window.app.showToast('success', '完了', 'ステータスが変更されました');
      this.selectedProjects = [];
      this.updateBulkActionsVisibility();
      this.loadProjects();
    }, 1000);
  },
  
  async bulkArchive() {
    try {
      // Simulate bulk archive
      for (const projectId of this.selectedProjects) {
        await window.api.put(`/api/projects/${projectId}/archive`);
      }
      
      window.app.showToast('success', '完了', `${this.selectedProjects.length}件の案件がアーカイブされました`);
      this.selectedProjects = [];
      this.updateBulkActionsVisibility();
      await this.loadProjects();
      
    } catch (error) {
      console.error('Bulk archive failed:', error);
      window.app.showToast('error', 'エラー', 'アーカイブに失敗しました');
    }
  },
  
  async bulkDelete() {
    try {
      // Simulate bulk delete
      for (const projectId of this.selectedProjects) {
        await window.api.delete(`/api/projects/${projectId}`);
      }
      
      window.app.showToast('success', '完了', `${this.selectedProjects.length}件の案件が削除されました`);
      this.selectedProjects = [];
      this.updateBulkActionsVisibility();
      await this.loadProjects();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      window.app.showToast('error', 'エラー', '削除に失敗しました');
    }
  },
  
  // CRUD operations
  async createProject() {
    this.resetForm();
    this.editingProject = null;
    this.showForm = true;
  },
  
  async editProject(projectId) {
    try {
      const response = await window.api.get(`/api/projects/${projectId}`);
      const project = response.data;
      
      this.editingProject = project;
      this.formData = {
        title: project.title,
        description: project.description,
        clientCompany: project.clientCompany,
        period: {
          start: project.period.start,
          end: project.period.end
        },
        budget: {
          min: project.budget.min,
          max: project.budget.max
        },
        requiredSkills: project.requiredSkills || [],
        location: project.location || '',
        remoteWorkRatio: project.remoteWorkRatio || 0,
        priority: project.priority,
        status: project.status,
        maxTeamSize: project.maxTeamSize || 1,
        notes: project.notes || ''
      };
      this.showForm = true;
      
    } catch (error) {
      console.error('Failed to load project:', error);
      window.app.showToast('error', 'エラー', '案件情報の読み込みに失敗しました');
    }
  },
  
  async saveProject() {
    if (!this.validateForm()) return;
    
    try {
      this.loading = true;
      
      // Prepare data for API
      const data = {
        ...this.formData,
        budget: {
          min: parseInt(this.formData.budget.min),
          max: parseInt(this.formData.budget.max)
        },
        remoteWorkRatio: parseInt(this.formData.remoteWorkRatio),
        maxTeamSize: parseInt(this.formData.maxTeamSize)
      };
      
      if (this.editingProject) {
        // Update existing project
        await window.api.put(`/api/projects/${this.editingProject.id}`, data);
        window.app.showToast('success', '完了', '案件情報が更新されました');
      } else {
        // Create new project
        await window.api.post('/api/projects', data);
        window.app.showToast('success', '完了', '新しい案件が登録されました');
      }
      
      this.showForm = false;
      await this.loadProjects();
      
    } catch (error) {
      console.error('Failed to save project:', error);
      window.app.showToast('error', 'エラー', '案件情報の保存に失敗しました');
    } finally {
      this.loading = false;
    }
  },
  
  async deleteProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (confirm(`案件「${project.title}」を削除しますか？この操作は取り消せません。`)) {
      try {
        await window.api.delete(`/api/projects/${projectId}`);
        window.app.showToast('success', '完了', '案件が削除されました');
        await this.loadProjects();
      } catch (error) {
        console.error('Failed to delete project:', error);
        window.app.showToast('error', 'エラー', '案件の削除に失敗しました');
      }
    }
  },
  
  // Project detail modal
  async viewProjectDetail(projectId) {
    try {
      const response = await window.api.get(`/api/projects/${projectId}`);
      this.detailProject = response.data;
      this.showDetailModal = true;
    } catch (error) {
      console.error('Failed to load project detail:', error);
      window.app.showToast('error', 'エラー', '案件詳細の読み込みに失敗しました');
    }
  },
  
  closeDetailModal() {
    this.showDetailModal = false;
    this.detailProject = null;
  },
  
  // Status management
  async updateProjectStatus(projectId, newStatus) {
    try {
      await window.api.patch(`/api/projects/${projectId}/status`, { status: newStatus });
      window.app.showToast('success', '完了', 'ステータスが更新されました');
      await this.loadProjects();
    } catch (error) {
      console.error('Failed to update project status:', error);
      window.app.showToast('error', 'エラー', 'ステータスの更新に失敗しました');
    }
  },
  
  // Form management
  resetForm() {
    this.formData = {
      title: '',
      description: '',
      clientCompany: '',
      period: {
        start: '',
        end: ''
      },
      budget: {
        min: '',
        max: ''
      },
      requiredSkills: [],
      location: '',
      remoteWorkRatio: 0,
      priority: 'MEDIUM',
      status: 'PLANNING',
      maxTeamSize: 1,
      notes: ''
    };
    this.formErrors = {};
  },
  
  cancelForm() {
    this.showForm = false;
    this.resetForm();
    this.editingProject = null;
  },
  
  validateForm() {
    this.formErrors = {};
    
    // Required field validation
    if (!this.formData.title.trim()) {
      this.formErrors.title = '案件名は必須です';
    }
    
    if (!this.formData.description.trim()) {
      this.formErrors.description = '案件説明は必須です';
    }
    
    if (!this.formData.clientCompany.trim()) {
      this.formErrors.clientCompany = 'クライアント企業は必須です';
    }
    
    if (!this.formData.period.start) {
      this.formErrors.startDate = '開始日は必須です';
    }
    
    if (!this.formData.period.end) {
      this.formErrors.endDate = '終了日は必須です';
    }
    
    if (this.formData.period.start && this.formData.period.end) {
      if (new Date(this.formData.period.start) >= new Date(this.formData.period.end)) {
        this.formErrors.period = '開始日は終了日より前に設定してください';
      }
    }
    
    if (!this.formData.budget.min) {
      this.formErrors.budgetMin = '予算下限は必須です';
    } else if (parseInt(this.formData.budget.min) < 0) {
      this.formErrors.budgetMin = '予算は0以上で入力してください';
    }
    
    if (!this.formData.budget.max) {
      this.formErrors.budgetMax = '予算上限は必須です';
    } else if (parseInt(this.formData.budget.max) < 0) {
      this.formErrors.budgetMax = '予算は0以上で入力してください';
    }
    
    if (this.formData.budget.min && this.formData.budget.max) {
      if (parseInt(this.formData.budget.min) > parseInt(this.formData.budget.max)) {
        this.formErrors.budget = '予算下限は上限以下に設定してください';
      }
    }
    
    if (this.formData.requiredSkills.length === 0) {
      this.formErrors.requiredSkills = '少なくとも1つのスキルを選択してください';
    }
    
    if (!this.formData.location.trim()) {
      this.formErrors.location = '勤務地は必須です';
    }
    
    if (parseInt(this.formData.remoteWorkRatio) < 0 || parseInt(this.formData.remoteWorkRatio) > 100) {
      this.formErrors.remoteWorkRatio = 'リモートワーク比率は0-100%で入力してください';
    }
    
    if (parseInt(this.formData.maxTeamSize) < 1) {
      this.formErrors.maxTeamSize = 'チーム規模は1人以上で入力してください';
    }
    
    return Object.keys(this.formErrors).length === 0;
  },
  
  // View management
  switchViewMode(mode) {
    this.viewMode = mode;
  },
  
  // Navigation
  navigateToMatching(projectId) {
    window.app.navigate('matching', { projectId });
  },
  
  // Utility methods
  getStatusLabel(status) {
    const labels = {
      'PLANNING': '計画中',
      'IN_PROGRESS': '進行中',
      'COMPLETED': '完了',
      'CANCELLED': 'キャンセル',
      'ON_HOLD': '保留'
    };
    return labels[status] || status;
  },
  
  getStatusClass(status) {
    const classes = {
      'PLANNING': 'status-planning',
      'IN_PROGRESS': 'status-in-progress',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'ON_HOLD': 'status-on-hold'
    };
    return classes[status] || 'status-planning';
  },
  
  getPriorityLabel(priority) {
    const labels = {
      'HIGH': '高',
      'MEDIUM': '中',
      'LOW': '低'
    };
    return labels[priority] || priority;
  },
  
  getPriorityClass(priority) {
    const classes = {
      'HIGH': 'priority-high',
      'MEDIUM': 'priority-medium',
      'LOW': 'priority-low'
    };
    return classes[priority] || 'priority-medium';
  },
  
  getSkillName(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    return skill ? skill.name : skillId;
  },
  
  getCompanyName(companyId) {
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
  },
  
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ja-JP');
  },
  
  calculateProjectDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    if (months > 0) {
      return `${months}ヶ月${days > 0 ? days + '日' : ''}`;
    } else {
      return `${days}日`;
    }
  },
  
  getProgressColor(progress) {
    if (progress >= 80) return 'success';
    if (progress >= 50) return 'warning';
    if (progress >= 20) return 'info';
    return 'danger';
  },
  
  // Event listeners
  setupEventListeners() {
    // Search input debouncing
    let searchTimeout;
    this.$watch('searchQuery', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (this.searchQuery.length === 0 || this.searchQuery.length >= 2) {
          this.performSearch();
        }
      }, 300);
    });
  },
  
  // Cleanup
  destroy() {
    console.log('Projects component destroyed');
  }
}));

// Project-specific utilities
window.projectUtils = {
  // Budget validation helpers
  validateBudgetRange(min, max) {
    return min > 0 && max > 0 && min <= max;
  },
  
  calculateBudgetPerMonth(budget, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                  (end.getMonth() - start.getMonth()) + 1;
    
    return {
      min: Math.floor(budget.min / months),
      max: Math.floor(budget.max / months)
    };
  },
  
  // Progress calculation
  calculateProgress(startDate, endDate, currentDate = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(currentDate);
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    const totalDuration = end - start;
    const elapsed = current - start;
    
    return Math.floor((elapsed / totalDuration) * 100);
  },
  
  // Export utilities
  generateProjectCSV(projects) {
    const headers = ['案件名', 'クライアント', 'ステータス', '優先度', '開始日', '終了日', '予算下限', '予算上限'];
    const rows = projects.map(p => [
      p.title,
      p.clientCompany,
      p.status,
      p.priority,
      p.period.start,
      p.period.end,
      p.budget.min,
      p.budget.max
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    return csvContent;
  },
  
  // Status workflow helpers
  getNextAvailableStatuses(currentStatus) {
    const workflows = {
      'PLANNING': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
      'ON_HOLD': ['IN_PROGRESS', 'CANCELLED'],
      'COMPLETED': [],
      'CANCELLED': []
    };
    
    return workflows[currentStatus] || [];
  }
};

console.log('Projects component loaded');