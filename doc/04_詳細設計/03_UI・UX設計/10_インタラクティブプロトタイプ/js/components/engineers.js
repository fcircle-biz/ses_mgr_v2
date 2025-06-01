// Engineers Management Component for SES Manager Prototype

Alpine.data('engineers', () => ({
  // Data state
  engineers: [],
  skills: [],
  companies: [],
  
  // Pagination state
  currentPage: 1,
  pageSize: 20,
  totalElements: 0,
  totalPages: 0,
  
  // Search and filter state
  searchQuery: '',
  filters: {
    workStatus: '',
    skills: [],
    experienceMin: '',
    experienceMax: '',
    unitPriceMin: '',
    unitPriceMax: '',
    location: '',
    contractType: '',
    remoteWork: ''
  },
  
  // UI state
  loading: false,
  error: null,
  selectedEngineers: [],
  viewMode: 'table', // 'table' or 'cards'
  sortField: 'name',
  sortDirection: 'asc',
  
  // Form state
  showForm: false,
  editingEngineer: null,
  formData: {
    name: '',
    email: '',
    phone: '',
    workStatus: '',
    skills: [],
    experienceYears: '',
    unitPrice: '',
    contractType: '',
    availableRoles: [],
    location: '',
    remoteWork: false
  },
  formErrors: {},
  
  // Bulk actions
  bulkActionType: '',
  showBulkActions: false,
  
  // Initialization
  async init() {
    console.log('Initializing engineers component');
    await Promise.all([
      this.loadSkills(),
      this.loadCompanies(),
      this.loadEngineers()
    ]);
    this.setupEventListeners();
  },
  
  // Data loading
  async loadEngineers() {
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
      
      const response = await window.api.get(`/api/engineers?${params}`);
      const data = response.data;
      
      this.engineers = data.content;
      this.totalElements = data.totalElements;
      this.totalPages = data.totalPages;
      this.currentPage = data.page;
      
      // Clear selections when data changes
      this.selectedEngineers = [];
      this.updateBulkActionsVisibility();
      
    } catch (error) {
      console.error('Failed to load engineers:', error);
      this.error = '技術者一覧の読み込みに失敗しました';
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
    await this.loadEngineers();
    window.app.showToast('info', '検索完了', `${this.totalElements}件の結果が見つかりました`, 2000);
  },
  
  async clearSearch() {
    this.searchQuery = '';
    this.filters = {
      workStatus: '',
      skills: [],
      experienceMin: '',
      experienceMax: '',
      unitPriceMin: '',
      unitPriceMax: '',
      location: '',
      contractType: '',
      remoteWork: ''
    };
    this.currentPage = 1;
    await this.loadEngineers();
  },
  
  async applyFilters() {
    this.currentPage = 1;
    await this.loadEngineers();
  },
  
  // Sorting
  async sort(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    await this.loadEngineers();
  },
  
  getSortIcon(field) {
    if (this.sortField !== field) return 'bi-arrow-down-up';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  },
  
  // Pagination
  async goToPage(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      await this.loadEngineers();
    }
  },
  
  async changePageSize(size) {
    this.pageSize = parseInt(size);
    this.currentPage = 1;
    await this.loadEngineers();
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
  toggleSelection(engineerId) {
    const index = this.selectedEngineers.indexOf(engineerId);
    if (index > -1) {
      this.selectedEngineers.splice(index, 1);
    } else {
      this.selectedEngineers.push(engineerId);
    }
    this.updateBulkActionsVisibility();
  },
  
  toggleAllSelection() {
    if (this.isAllSelected) {
      this.selectedEngineers = [];
    } else {
      this.selectedEngineers = this.engineers.map(e => e.id);
    }
    this.updateBulkActionsVisibility();
  },
  
  get isAllSelected() {
    return this.engineers.length > 0 && 
           this.selectedEngineers.length === this.engineers.length;
  },
  
  updateBulkActionsVisibility() {
    this.showBulkActions = this.selectedEngineers.length > 0;
  },
  
  // Bulk actions
  async performBulkAction(action) {
    if (this.selectedEngineers.length === 0) return;
    
    const count = this.selectedEngineers.length;
    let message = '';
    
    switch (action) {
      case 'export':
        message = `${count}件の技術者データをエクスポートしています...`;
        await this.bulkExport();
        break;
      case 'status':
        message = `${count}件の技術者のステータスを変更しています...`;
        await this.bulkStatusChange();
        break;
      case 'delete':
        if (confirm(`選択した${count}件の技術者を削除しますか？この操作は取り消せません。`)) {
          message = `${count}件の技術者を削除しています...`;
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
      this.selectedEngineers = [];
      this.updateBulkActionsVisibility();
    }, 1500);
  },
  
  async bulkStatusChange() {
    // Simulate bulk status change
    setTimeout(() => {
      window.app.showToast('success', '完了', 'ステータスが変更されました');
      this.selectedEngineers = [];
      this.updateBulkActionsVisibility();
      this.loadEngineers();
    }, 1000);
  },
  
  async bulkDelete() {
    try {
      // Simulate bulk delete
      for (const engineerId of this.selectedEngineers) {
        await window.api.delete(`/api/engineers/${engineerId}`);
      }
      
      window.app.showToast('success', '完了', `${this.selectedEngineers.length}件の技術者が削除されました`);
      this.selectedEngineers = [];
      this.updateBulkActionsVisibility();
      await this.loadEngineers();
      
    } catch (error) {
      console.error('Bulk delete failed:', error);
      window.app.showToast('error', 'エラー', '削除に失敗しました');
    }
  },
  
  // CRUD operations
  async createEngineer() {
    this.resetForm();
    this.editingEngineer = null;
    this.showForm = true;
  },
  
  async editEngineer(engineerId) {
    try {
      const response = await window.api.get(`/api/engineers/${engineerId}`);
      const engineer = response.data;
      
      this.editingEngineer = engineer;
      this.formData = {
        name: engineer.name,
        email: engineer.email,
        phone: engineer.phone || '',
        workStatus: engineer.workStatus,
        skills: engineer.skills.map(s => s.skillId),
        experienceYears: engineer.experienceYears,
        unitPrice: engineer.unitPrice,
        contractType: engineer.contractType,
        availableRoles: engineer.availableRoles || [],
        location: engineer.location || '',
        remoteWork: engineer.remoteWork || false
      };
      this.showForm = true;
      
    } catch (error) {
      console.error('Failed to load engineer:', error);
      window.app.showToast('error', 'エラー', '技術者情報の読み込みに失敗しました');
    }
  },
  
  async saveEngineer() {
    if (!this.validateForm()) return;
    
    try {
      this.loading = true;
      
      // Prepare data for API
      const data = {
        ...this.formData,
        skills: this.formData.skills.map(skillId => ({ skillId, level: 3 })), // Default level
        experienceYears: parseFloat(this.formData.experienceYears),
        unitPrice: parseInt(this.formData.unitPrice)
      };
      
      if (this.editingEngineer) {
        // Update existing engineer
        await window.api.put(`/api/engineers/${this.editingEngineer.id}`, data);
        window.app.showToast('success', '完了', '技術者情報が更新されました');
      } else {
        // Create new engineer
        await window.api.post('/api/engineers', data);
        window.app.showToast('success', '完了', '新しい技術者が登録されました');
      }
      
      this.showForm = false;
      await this.loadEngineers();
      
    } catch (error) {
      console.error('Failed to save engineer:', error);
      window.app.showToast('error', 'エラー', '技術者情報の保存に失敗しました');
    } finally {
      this.loading = false;
    }
  },
  
  async deleteEngineer(engineerId) {
    const engineer = this.engineers.find(e => e.id === engineerId);
    if (!engineer) return;
    
    if (confirm(`技術者「${engineer.name}」を削除しますか？この操作は取り消せません。`)) {
      try {
        await window.api.delete(`/api/engineers/${engineerId}`);
        window.app.showToast('success', '完了', '技術者が削除されました');
        await this.loadEngineers();
      } catch (error) {
        console.error('Failed to delete engineer:', error);
        window.app.showToast('error', 'エラー', '技術者の削除に失敗しました');
      }
    }
  },
  
  // Form management
  resetForm() {
    this.formData = {
      name: '',
      email: '',
      phone: '',
      workStatus: '',
      skills: [],
      experienceYears: '',
      unitPrice: '',
      contractType: '',
      availableRoles: [],
      location: '',
      remoteWork: false
    };
    this.formErrors = {};
  },
  
  cancelForm() {
    this.showForm = false;
    this.resetForm();
    this.editingEngineer = null;
  },
  
  validateForm() {
    this.formErrors = {};
    
    // Required field validation
    if (!this.formData.name.trim()) {
      this.formErrors.name = '技術者名は必須です';
    }
    
    if (!this.formData.email.trim()) {
      this.formErrors.email = 'メールアドレスは必須です';
    } else if (!this.isValidEmail(this.formData.email)) {
      this.formErrors.email = '正しいメールアドレス形式で入力してください';
    }
    
    if (!this.formData.workStatus) {
      this.formErrors.workStatus = '稼働ステータスは必須です';
    }
    
    if (!this.formData.experienceYears) {
      this.formErrors.experienceYears = '経験年数は必須です';
    } else if (parseFloat(this.formData.experienceYears) < 0) {
      this.formErrors.experienceYears = '経験年数は0以上で入力してください';
    }
    
    if (!this.formData.unitPrice) {
      this.formErrors.unitPrice = '希望単価は必須です';
    } else if (parseInt(this.formData.unitPrice) < 0) {
      this.formErrors.unitPrice = '希望単価は0以上で入力してください';
    }
    
    if (this.formData.skills.length === 0) {
      this.formErrors.skills = '少なくとも1つのスキルを選択してください';
    }
    
    return Object.keys(this.formErrors).length === 0;
  },
  
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // View management
  switchViewMode(mode) {
    this.viewMode = mode;
  },
  
  // Navigation
  viewEngineerDetail(engineerId) {
    window.app.navigate('engineers/detail', { id: engineerId });
  },
  
  // Utility methods
  getStatusLabel(status) {
    const labels = {
      'AVAILABLE': '稼働可能',
      'ASSIGNED': 'アサイン中',
      'UNAVAILABLE': '稼働不可',
      'PENDING': '調整中'
    };
    return labels[status] || status;
  },
  
  getStatusClass(status) {
    const classes = {
      'AVAILABLE': 'status-available',
      'ASSIGNED': 'status-assigned',
      'UNAVAILABLE': 'status-unavailable',
      'PENDING': 'status-pending'
    };
    return classes[status] || 'status-pending';
  },
  
  getSkillName(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    return skill ? skill.name : skillId;
  },
  
  getSkillsByCategory(category) {
    return this.skills.filter(s => s.category === category);
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(amount);
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
    // Clean up any timers or listeners
    console.log('Engineers component destroyed');
  }
}));

// Engineer-specific utilities
window.engineerUtils = {
  // Validation helpers
  validateSkillLevel(level) {
    return level >= 1 && level <= 5;
  },
  
  calculateExperienceLevel(years) {
    if (years < 1) return 'Junior';
    if (years < 3) return 'Mid-level';
    if (years < 7) return 'Senior';
    return 'Expert';
  },
  
  // Export utilities
  generateCSV(engineers) {
    const headers = ['名前', 'メール', 'ステータス', '経験年数', '希望単価'];
    const rows = engineers.map(e => [
      e.name,
      e.email,
      e.workStatus,
      e.experienceYears,
      e.unitPrice
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    return csvContent;
  }
};

console.log('Engineers component loaded');