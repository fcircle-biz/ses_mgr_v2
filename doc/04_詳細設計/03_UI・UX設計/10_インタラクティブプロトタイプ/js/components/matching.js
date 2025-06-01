// Matching Component for SES Manager Prototype

Alpine.data('matching', () => ({
  // Data state
  projects: [],
  engineers: [],
  skills: [],
  companies: [],
  
  // Search state
  searchCriteria: {
    projectId: '',
    engineerId: '',
    requiredSkills: [],
    minExperience: '',
    maxExperience: '',
    locationPreference: '',
    remoteWorkRequired: false,
    budgetRange: {
      min: '',
      max: ''
    },
    availabilityFrom: '',
    contractType: '',
    minMatchScore: 70
  },
  
  // Results state
  matchingResults: [],
  isSearching: false,
  hasSearched: false,
  searchError: null,
  
  // UI state
  activeTab: 'search', // 'search', 'results', 'history'
  selectedResults: [],
  showAdvancedOptions: false,
  showProposalModal: false,
  selectedMatchForProposal: null,
  
  // Quick match state
  quickMatches: [],
  loadingQuickMatches: false,
  
  // Algorithm settings
  algorithmSettings: {
    skillWeighting: 40,
    experienceWeighting: 25,
    availabilityWeighting: 20,
    budgetWeighting: 10,
    locationWeighting: 5
  },
  
  // Matching history
  matchingHistory: [],
  
  // AI recommendations
  aiRecommendations: [],
  loadingRecommendations: false,
  
  // Initialization
  async init() {
    console.log('Initializing matching component');
    await Promise.all([
      this.loadProjects(),
      this.loadEngineers(),
      this.loadSkills(),
      this.loadCompanies(),
      this.loadQuickMatches(),
      this.loadMatchingHistory(),
      this.loadAIRecommendations()
    ]);
    this.setupEventListeners();
  },
  
  // Data loading
  async loadProjects() {
    try {
      const response = await window.api.get('/api/projects?status=PLANNING,IN_PROGRESS');
      this.projects = response.data.content;
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },
  
  async loadEngineers() {
    try {
      const response = await window.api.get('/api/engineers?workStatus=AVAILABLE,PENDING');
      this.engineers = response.data.content;
    } catch (error) {
      console.error('Failed to load engineers:', error);
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
  
  async loadQuickMatches() {
    try {
      this.loadingQuickMatches = true;
      const response = await window.api.get('/api/matching/quick-matches');
      this.quickMatches = response.data;
    } catch (error) {
      console.error('Failed to load quick matches:', error);
    } finally {
      this.loadingQuickMatches = false;
    }
  },
  
  async loadMatchingHistory() {
    try {
      const response = await window.api.get('/api/matching/history');
      this.matchingHistory = response.data.content;
    } catch (error) {
      console.error('Failed to load matching history:', error);
    }
  },
  
  async loadAIRecommendations() {
    try {
      this.loadingRecommendations = true;
      const response = await window.api.get('/api/matching/ai-recommendations');
      this.aiRecommendations = response.data;
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      this.loadingRecommendations = false;
    }
  },
  
  // Search functionality
  async performMatching() {
    if (!this.validateSearchCriteria()) return;
    
    try {
      this.isSearching = true;
      this.searchError = null;
      this.matchingResults = [];
      
      // Build search parameters
      const params = new URLSearchParams();
      
      if (this.searchCriteria.projectId) {
        params.append('projectId', this.searchCriteria.projectId);
      }
      
      if (this.searchCriteria.engineerId) {
        params.append('engineerId', this.searchCriteria.engineerId);
      }
      
      if (this.searchCriteria.requiredSkills.length > 0) {
        params.append('skills', this.searchCriteria.requiredSkills.join(','));
      }
      
      if (this.searchCriteria.minExperience) {
        params.append('minExperience', this.searchCriteria.minExperience);
      }
      
      if (this.searchCriteria.maxExperience) {
        params.append('maxExperience', this.searchCriteria.maxExperience);
      }
      
      if (this.searchCriteria.locationPreference) {
        params.append('location', this.searchCriteria.locationPreference);
      }
      
      if (this.searchCriteria.remoteWorkRequired) {
        params.append('remoteWork', 'true');
      }
      
      if (this.searchCriteria.budgetRange.min) {
        params.append('budgetMin', this.searchCriteria.budgetRange.min);
      }
      
      if (this.searchCriteria.budgetRange.max) {
        params.append('budgetMax', this.searchCriteria.budgetRange.max);
      }
      
      if (this.searchCriteria.availabilityFrom) {
        params.append('availableFrom', this.searchCriteria.availabilityFrom);
      }
      
      if (this.searchCriteria.contractType) {
        params.append('contractType', this.searchCriteria.contractType);
      }
      
      params.append('minScore', this.searchCriteria.minMatchScore);
      
      // Include algorithm weights
      Object.entries(this.algorithmSettings).forEach(([key, value]) => {
        params.append(key, value);
      });
      
      const response = await window.api.get(`/api/matching/search?${params}`);
      this.matchingResults = response.data.content;
      this.hasSearched = true;
      this.activeTab = 'results';
      
      // Save search to history
      await this.saveSearchToHistory();
      
      window.app.showToast('success', '完了', `${this.matchingResults.length}件のマッチング結果が見つかりました`);
      
    } catch (error) {
      console.error('Matching search failed:', error);
      this.searchError = 'マッチング検索に失敗しました';
      window.app.showToast('error', 'エラー', this.searchError);
    } finally {
      this.isSearching = false;
    }
  },
  
  validateSearchCriteria() {
    if (!this.searchCriteria.projectId && !this.searchCriteria.engineerId) {
      window.app.showToast('warning', '警告', '案件または技術者のいずれかを選択してください');
      return false;
    }
    
    if (this.searchCriteria.minExperience && this.searchCriteria.maxExperience) {
      if (parseInt(this.searchCriteria.minExperience) > parseInt(this.searchCriteria.maxExperience)) {
        window.app.showToast('warning', '警告', '最小経験年数は最大経験年数以下に設定してください');
        return false;
      }
    }
    
    if (this.searchCriteria.budgetRange.min && this.searchCriteria.budgetRange.max) {
      if (parseInt(this.searchCriteria.budgetRange.min) > parseInt(this.searchCriteria.budgetRange.max)) {
        window.app.showToast('warning', '警告', '予算下限は上限以下に設定してください');
        return false;
      }
    }
    
    return true;
  },
  
  clearSearchCriteria() {
    this.searchCriteria = {
      projectId: '',
      engineerId: '',
      requiredSkills: [],
      minExperience: '',
      maxExperience: '',
      locationPreference: '',
      remoteWorkRequired: false,
      budgetRange: {
        min: '',
        max: ''
      },
      availabilityFrom: '',
      contractType: '',
      minMatchScore: 70
    };
    this.matchingResults = [];
    this.hasSearched = false;
    this.searchError = null;
    this.activeTab = 'search';
  },
  
  // AI Matching
  async performAIMatching() {
    if (!this.searchCriteria.projectId) {
      window.app.showToast('warning', '警告', 'AI マッチングには案件の選択が必要です');
      return;
    }
    
    try {
      this.isSearching = true;
      window.app.showToast('info', 'AI 分析中', 'AIがマッチング分析を実行しています...', 3000);
      
      const response = await window.api.post('/api/matching/ai-match', {
        projectId: this.searchCriteria.projectId,
        preferences: this.algorithmSettings
      });
      
      this.matchingResults = response.data.matches;
      this.hasSearched = true;
      this.activeTab = 'results';
      
      window.app.showToast('success', 'AI 分析完了', `AIが${this.matchingResults.length}件の最適なマッチングを発見しました`);
      
    } catch (error) {
      console.error('AI matching failed:', error);
      window.app.showToast('error', 'エラー', 'AI マッチングに失敗しました');
    } finally {
      this.isSearching = false;
    }
  },
  
  // Result management
  toggleResultSelection(resultId) {
    const index = this.selectedResults.indexOf(resultId);
    if (index > -1) {
      this.selectedResults.splice(index, 1);
    } else {
      this.selectedResults.push(resultId);
    }
  },
  
  get isAllResultsSelected() {
    return this.matchingResults.length > 0 && 
           this.selectedResults.length === this.matchingResults.length;
  },
  
  toggleAllResultsSelection() {
    if (this.isAllResultsSelected) {
      this.selectedResults = [];
    } else {
      this.selectedResults = this.matchingResults.map(r => r.id);
    }
  },
  
  // Proposal creation
  createProposal(matchResult) {
    this.selectedMatchForProposal = matchResult;
    this.showProposalModal = true;
  },
  
  async submitProposal(proposalData) {
    try {
      const data = {
        matchId: this.selectedMatchForProposal.id,
        projectId: this.selectedMatchForProposal.project.id,
        engineerId: this.selectedMatchForProposal.engineer.id,
        ...proposalData
      };
      
      await window.api.post('/api/proposals', data);
      window.app.showToast('success', '完了', '提案が作成されました');
      this.showProposalModal = false;
      this.selectedMatchForProposal = null;
      
    } catch (error) {
      console.error('Failed to create proposal:', error);
      window.app.showToast('error', 'エラー', '提案の作成に失敗しました');
    }
  },
  
  closeProposalModal() {
    this.showProposalModal = false;
    this.selectedMatchForProposal = null;
  },
  
  // Bulk actions
  async bulkCreateProposals() {
    if (this.selectedResults.length === 0) {
      window.app.showToast('warning', '警告', 'マッチング結果を選択してください');
      return;
    }
    
    if (confirm(`選択した${this.selectedResults.length}件の提案を一括作成しますか？`)) {
      try {
        const proposals = this.selectedResults.map(resultId => {
          const result = this.matchingResults.find(r => r.id === resultId);
          return {
            matchId: result.id,
            projectId: result.project.id,
            engineerId: result.engineer.id,
            message: 'システムにより自動生成された提案です。',
            priority: result.score >= 80 ? 'HIGH' : 'MEDIUM'
          };
        });
        
        await window.api.post('/api/proposals/bulk', { proposals });
        window.app.showToast('success', '完了', `${this.selectedResults.length}件の提案が作成されました`);
        this.selectedResults = [];
        
      } catch (error) {
        console.error('Bulk proposal creation failed:', error);
        window.app.showToast('error', 'エラー', '一括提案作成に失敗しました');
      }
    }
  },
  
  async exportResults() {
    if (this.matchingResults.length === 0) {
      window.app.showToast('warning', '警告', 'エクスポートする結果がありません');
      return;
    }
    
    try {
      const exportData = this.matchingResults.map(result => ({
        projectTitle: result.project.title,
        engineerName: result.engineer.name,
        matchScore: result.score,
        recommendation: result.recommendation,
        reasons: result.reasons.join(', '),
        skillMatch: result.skillMatch,
        experienceMatch: result.experienceMatch,
        budgetMatch: result.budgetMatch
      }));
      
      const csv = window.matchingUtils.generateMatchingCSV(exportData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `matching-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      window.app.showToast('success', '完了', 'マッチング結果がエクスポートされました');
      
    } catch (error) {
      console.error('Export failed:', error);
      window.app.showToast('error', 'エラー', 'エクスポートに失敗しました');
    }
  },
  
  // History management
  async saveSearchToHistory() {
    try {
      const searchData = {
        criteria: this.searchCriteria,
        resultCount: this.matchingResults.length,
        timestamp: new Date().toISOString()
      };
      
      await window.api.post('/api/matching/history', searchData);
      await this.loadMatchingHistory();
      
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  },
  
  async loadFromHistory(historyItem) {
    this.searchCriteria = { ...historyItem.criteria };
    await this.performMatching();
  },
  
  async deleteFromHistory(historyId) {
    if (confirm('この検索履歴を削除しますか？')) {
      try {
        await window.api.delete(`/api/matching/history/${historyId}`);
        await this.loadMatchingHistory();
        window.app.showToast('success', '完了', '検索履歴が削除されました');
      } catch (error) {
        console.error('Failed to delete history:', error);
        window.app.showToast('error', 'エラー', '履歴の削除に失敗しました');
      }
    }
  },
  
  // Quick matches
  async viewQuickMatch(quickMatch) {
    this.searchCriteria.projectId = quickMatch.project.id;
    this.searchCriteria.engineerId = quickMatch.engineer.id;
    await this.performMatching();
  },
  
  async acceptQuickMatch(quickMatch) {
    if (confirm('このクイックマッチを承認して提案を作成しますか？')) {
      try {
        await window.api.post('/api/proposals', {
          projectId: quickMatch.project.id,
          engineerId: quickMatch.engineer.id,
          matchScore: quickMatch.score,
          message: 'システムクイックマッチからの提案です。',
          priority: 'HIGH'
        });
        
        window.app.showToast('success', '完了', 'クイックマッチが承認され、提案が作成されました');
        await this.loadQuickMatches();
        
      } catch (error) {
        console.error('Failed to accept quick match:', error);
        window.app.showToast('error', 'エラー', 'クイックマッチの承認に失敗しました');
      }
    }
  },
  
  // Algorithm settings
  updateAlgorithmWeight(type, value) {
    this.algorithmSettings[type] = parseInt(value);
    
    // Ensure total weights don't exceed 100%
    const total = Object.values(this.algorithmSettings).reduce((sum, val) => sum + val, 0);
    if (total > 100) {
      const excess = total - 100;
      this.algorithmSettings[type] -= excess;
    }
  },
  
  resetAlgorithmSettings() {
    this.algorithmSettings = {
      skillWeighting: 40,
      experienceWeighting: 25,
      availabilityWeighting: 20,
      budgetWeighting: 10,
      locationWeighting: 5
    };
  },
  
  // Utility methods
  getMatchScoreColor(score) {
    if (score >= 90) return 'success';
    if (score >= 80) return 'primary';
    if (score >= 70) return 'warning';
    if (score >= 60) return 'info';
    return 'secondary';
  },
  
  getRecommendationLabel(recommendation) {
    const labels = {
      'HIGHLY_RECOMMENDED': '高度推奨',
      'RECOMMENDED': '推奨',
      'CONSIDER': '検討',
      'NOT_RECOMMENDED': '非推奨'
    };
    return labels[recommendation] || recommendation;
  },
  
  getRecommendationClass(recommendation) {
    const classes = {
      'HIGHLY_RECOMMENDED': 'text-success',
      'RECOMMENDED': 'text-primary',
      'CONSIDER': 'text-warning',
      'NOT_RECOMMENDED': 'text-danger'
    };
    return classes[recommendation] || 'text-secondary';
  },
  
  getSkillName(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    return skill ? skill.name : skillId;
  },
  
  getProjectName(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.title : projectId;
  },
  
  getEngineerName(engineerId) {
    const engineer = this.engineers.find(e => e.id === engineerId);
    return engineer ? engineer.name : engineerId;
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
  
  getTimeAgo(timestamp) {
    return window.MockDB.getTimeAgo(timestamp);
  },
  
  // Event listeners
  setupEventListeners() {
    // Auto-search when project or engineer is selected
    this.$watch('searchCriteria.projectId', (newValue) => {
      if (newValue && this.hasSearched) {
        this.performMatching();
      }
    });
    
    this.$watch('searchCriteria.engineerId', (newValue) => {
      if (newValue && this.hasSearched) {
        this.performMatching();
      }
    });
  },
  
  // Navigation
  navigateToProject(projectId) {
    window.app.navigate('projects/detail', { id: projectId });
  },
  
  navigateToEngineer(engineerId) {
    window.app.navigate('engineers/detail', { id: engineerId });
  },
  
  navigateToContract(projectId, engineerId) {
    window.app.navigate('contracts/new', { projectId, engineerId });
  },
  
  // Cleanup
  destroy() {
    console.log('Matching component destroyed');
  }
}));

// Matching-specific utilities
window.matchingUtils = {
  // Score calculation helpers
  calculateSkillMatch(requiredSkills, engineerSkills) {
    if (requiredSkills.length === 0) return 100;
    
    const matches = requiredSkills.filter(req => 
      engineerSkills.some(eng => eng.skillId === req)
    ).length;
    
    return Math.round((matches / requiredSkills.length) * 100);
  },
  
  calculateExperienceMatch(requiredYears, engineerYears) {
    if (engineerYears >= requiredYears) return 100;
    return Math.round((engineerYears / requiredYears) * 100);
  },
  
  calculateBudgetMatch(budget, unitPrice) {
    if (unitPrice <= budget.max && unitPrice >= budget.min) return 100;
    if (unitPrice < budget.min) {
      return Math.max(0, 100 - ((budget.min - unitPrice) / budget.min * 50));
    }
    return Math.max(0, 100 - ((unitPrice - budget.max) / budget.max * 50));
  },
  
  // Export utilities
  generateMatchingCSV(matchingData) {
    const headers = [
      '案件名', '技術者名', 'マッチ度', '推奨レベル', 'マッチ理由', 
      'スキル適合度', '経験適合度', '予算適合度'
    ];
    
    const rows = matchingData.map(item => [
      item.projectTitle,
      item.engineerName,
      item.matchScore + '%',
      item.recommendation,
      `"${item.reasons}"`,
      item.skillMatch + '%',
      item.experienceMatch + '%',
      item.budgetMatch + '%'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    return csvContent;
  },
  
  // Recommendation algorithms
  generateRecommendationReasons(skillMatch, experienceMatch, budgetMatch, locationMatch) {
    const reasons = [];
    
    if (skillMatch >= 90) reasons.push('必要スキルが完全に合致');
    else if (skillMatch >= 70) reasons.push('必要スキルの大部分に対応');
    
    if (experienceMatch >= 100) reasons.push('十分な経験年数');
    else if (experienceMatch >= 80) reasons.push('経験年数がほぼ適合');
    
    if (budgetMatch >= 95) reasons.push('予算範囲内');
    else if (budgetMatch >= 80) reasons.push('予算にほぼ適合');
    
    if (locationMatch >= 90) reasons.push('勤務地が適合');
    
    return reasons;
  },
  
  // Notification helpers
  generateMatchingNotification(result) {
    return {
      title: '新しいマッチングが見つかりました',
      message: `${result.project.title} × ${result.engineer.name} (${result.score}% マッチ)`,
      type: 'matching',
      actionUrl: `/matching?projectId=${result.project.id}&engineerId=${result.engineer.id}`
    };
  }
};

console.log('Matching component loaded');