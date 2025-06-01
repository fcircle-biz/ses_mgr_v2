// Mock API for SES Manager Prototype

class MockAPI {
  constructor() {
    this.debug = false;
    this.latency = 200; // Simulate network latency in ms
    this.errorRate = 0; // Percentage of requests that should fail (0-1)
    this.setupRoutes();
  }
  
  setupRoutes() {
    this.routes = {
      // Engineers API
      'GET /api/engineers': this.getEngineers.bind(this),
      'GET /api/engineers/:id': this.getEngineer.bind(this),
      'POST /api/engineers': this.createEngineer.bind(this),
      'PUT /api/engineers/:id': this.updateEngineer.bind(this),
      'DELETE /api/engineers/:id': this.deleteEngineer.bind(this),
      'GET /api/engineers/search': this.searchEngineers.bind(this),
      
      // Projects API
      'GET /api/projects': this.getProjects.bind(this),
      'GET /api/projects/:id': this.getProject.bind(this),
      'POST /api/projects': this.createProject.bind(this),
      'PUT /api/projects/:id': this.updateProject.bind(this),
      'DELETE /api/projects/:id': this.deleteProject.bind(this),
      'GET /api/projects/search': this.searchProjects.bind(this),
      
      // Matching API
      'GET /api/matching/search': this.searchMatching.bind(this),
      'POST /api/matching/evaluate': this.evaluateMatching.bind(this),
      'GET /api/matching/recommendations': this.getRecommendations.bind(this),
      
      // Contracts API
      'GET /api/contracts': this.getContracts.bind(this),
      'GET /api/contracts/:id': this.getContract.bind(this),
      'POST /api/contracts': this.createContract.bind(this),
      'PUT /api/contracts/:id': this.updateContract.bind(this),
      
      // Timesheets API
      'GET /api/timesheets': this.getTimesheets.bind(this),
      'GET /api/timesheets/:id': this.getTimesheet.bind(this),
      'POST /api/timesheets': this.submitTimesheet.bind(this),
      'PUT /api/timesheets/:id/approve': this.approveTimesheet.bind(this),
      
      // Billing API
      'GET /api/billing': this.getBilling.bind(this),
      'GET /api/billing/:id': this.getBill.bind(this),
      'POST /api/billing': this.createBill.bind(this),
      'PUT /api/billing/:id/pay': this.payBill.bind(this),
      
      // Dashboard API
      'GET /api/dashboard/kpis': this.getDashboardKPIs.bind(this),
      'GET /api/dashboard/charts': this.getDashboardCharts.bind(this),
      'GET /api/dashboard/recent': this.getRecentActivity.bind(this),
      
      // Notifications API
      'GET /api/notifications': this.getNotifications.bind(this),
      'PUT /api/notifications/:id/read': this.markNotificationAsRead.bind(this),
      'PUT /api/notifications/read-all': this.markAllNotificationsAsRead.bind(this),
      
      // Skills and Companies API
      'GET /api/skills': this.getSkills.bind(this),
      'GET /api/companies': this.getCompanies.bind(this)
    };
  }
  
  // Main request handler
  async request(method, url, data = null) {
    if (this.debug) {
      console.log(`MockAPI: ${method} ${url}`, data);
    }
    
    // Simulate network latency
    await this.delay(this.latency);
    
    // Simulate random errors
    if (Math.random() < this.errorRate) {
      throw new Error('Network error (simulated)');
    }
    
    // Parse URL and extract parameters
    const { path, params, query } = this.parseURL(url);
    const routeKey = `${method} ${path}`;
    
    if (this.routes[routeKey]) {
      try {
        const result = await this.routes[routeKey](params, query, data);
        return this.formatResponse(result);
      } catch (error) {
        throw this.formatError(error);
      }
    } else {
      throw this.formatError(new Error(`Route not found: ${method} ${url}`), 404);
    }
  }
  
  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  parseURL(url) {
    const [pathPart, queryPart] = url.split('?');
    const pathSegments = pathPart.split('/').filter(segment => segment);
    
    // Extract parameters from path (e.g., /api/engineers/:id)
    const params = {};
    const path = pathSegments.map(segment => {
      if (segment.match(/^[A-Z0-9]+\d+$/)) { // Match IDs like ENG001, PRJ001
        return ':id';
      }
      return segment;
    }).join('/');
    
    // Extract actual ID values
    const pathTemplate = pathPart.split('/').filter(segment => segment);
    pathTemplate.forEach((segment, index) => {
      if (segment.match(/^[A-Z0-9]+\d+$/)) {
        params.id = segment;
      }
    });
    
    // Parse query parameters
    const query = {};
    if (queryPart) {
      queryPart.split('&').forEach(param => {
        const [key, value] = param.split('=');
        query[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }
    
    return { path: '/' + path, params, query };
  }
  
  formatResponse(data, status = 200) {
    return {
      status,
      data,
      timestamp: new Date().toISOString()
    };
  }
  
  formatError(error, status = 500) {
    return {
      status,
      error: {
        message: error.message,
        code: `API_ERROR_${status}`,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // Pagination helper
  paginate(data, page = 1, size = 20) {
    const start = (page - 1) * size;
    const end = start + size;
    const content = data.slice(start, end);
    
    return {
      content,
      page: parseInt(page),
      size: parseInt(size),
      totalElements: data.length,
      totalPages: Math.ceil(data.length / size),
      first: page === 1,
      last: page >= Math.ceil(data.length / size)
    };
  }
  
  // Engineers API
  async getEngineers(params, query) {
    const { page = 1, size = 20, sort, direction = 'asc', search, status } = query;
    let engineers = [...window.MockDB.data.engineers];
    
    // Filter by status
    if (status) {
      engineers = engineers.filter(e => e.workStatus === status);
    }
    
    // Search filter
    if (search) {
      engineers = window.MockDB.searchEngineers(search);
    }
    
    // Sort
    if (sort) {
      engineers.sort((a, b) => {
        let aVal = a[sort];
        let bVal = b[sort];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    return this.paginate(engineers, page, size);
  }
  
  async getEngineer(params) {
    const engineer = window.MockDB.getEngineerById(params.id);
    if (!engineer) {
      throw new Error('Engineer not found');
    }
    return engineer;
  }
  
  async createEngineer(params, query, data) {
    const newEngineer = {
      id: 'ENG' + String(window.MockDB.data.engineers.length + 1).padStart(3, '0'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    window.MockDB.data.engineers.push(newEngineer);
    window.MockDB.saveToStorage();
    
    return newEngineer;
  }
  
  async updateEngineer(params, query, data) {
    const index = window.MockDB.data.engineers.findIndex(e => e.id === params.id);
    if (index === -1) {
      throw new Error('Engineer not found');
    }
    
    window.MockDB.data.engineers[index] = {
      ...window.MockDB.data.engineers[index],
      ...data,
      updatedAt: new Date()
    };
    
    window.MockDB.saveToStorage();
    
    return window.MockDB.data.engineers[index];
  }
  
  async deleteEngineer(params) {
    const index = window.MockDB.data.engineers.findIndex(e => e.id === params.id);
    if (index === -1) {
      throw new Error('Engineer not found');
    }
    
    window.MockDB.data.engineers.splice(index, 1);
    window.MockDB.saveToStorage();
    
    return { message: 'Engineer deleted successfully' };
  }
  
  async searchEngineers(params, query) {
    const { q, skills, status, experienceMin, experienceMax, unitPriceMin, unitPriceMax } = query;
    
    const filters = {};
    if (status) filters.workStatus = status;
    if (skills) filters.skills = skills.split(',');
    if (experienceMin) filters.experienceMin = parseFloat(experienceMin);
    if (experienceMax) filters.experienceMax = parseFloat(experienceMax);
    if (unitPriceMin) filters.unitPriceMin = parseInt(unitPriceMin);
    if (unitPriceMax) filters.unitPriceMax = parseInt(unitPriceMax);
    
    const results = window.MockDB.searchEngineers(q, filters);
    return this.paginate(results, query.page, query.size);
  }
  
  // Projects API
  async getProjects(params, query) {
    const { page = 1, size = 20, sort, direction = 'asc', search, status } = query;
    let projects = [...window.MockDB.data.projects];
    
    // Filter by status
    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    
    // Search filter
    if (search) {
      projects = window.MockDB.searchProjects(search);
    }
    
    // Sort
    if (sort) {
      projects.sort((a, b) => {
        let aVal = a[sort];
        let bVal = b[sort];
        
        if (sort === 'period.start' || sort === 'period.end') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        }
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (direction === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }
    
    return this.paginate(projects, page, size);
  }
  
  async getProject(params) {
    const project = window.MockDB.getProjectById(params.id);
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  }
  
  async createProject(params, query, data) {
    const newProject = {
      id: 'PRJ' + String(window.MockDB.data.projects.length + 1).padStart(3, '0'),
      ...data,
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    window.MockDB.data.projects.push(newProject);
    window.MockDB.saveToStorage();
    
    return newProject;
  }
  
  async updateProject(params, query, data) {
    const index = window.MockDB.data.projects.findIndex(p => p.id === params.id);
    if (index === -1) {
      throw new Error('Project not found');
    }
    
    window.MockDB.data.projects[index] = {
      ...window.MockDB.data.projects[index],
      ...data,
      updatedAt: new Date()
    };
    
    window.MockDB.saveToStorage();
    
    return window.MockDB.data.projects[index];
  }
  
  async deleteProject(params) {
    const index = window.MockDB.data.projects.findIndex(p => p.id === params.id);
    if (index === -1) {
      throw new Error('Project not found');
    }
    
    window.MockDB.data.projects.splice(index, 1);
    window.MockDB.saveToStorage();
    
    return { message: 'Project deleted successfully' };
  }
  
  async searchProjects(params, query) {
    const { q, status, skills } = query;
    
    const filters = {};
    if (status) filters.status = status;
    if (skills) filters.requiredSkills = skills.split(',');
    
    const results = window.MockDB.searchProjects(q, filters);
    return this.paginate(results, query.page, query.size);
  }
  
  // Matching API
  async searchMatching(params, query) {
    const { projectId, skills, experienceMin, unitPriceMax, location, remoteWork } = query;
    
    let engineers = [...window.MockDB.data.engineers];
    
    // Filter available engineers
    engineers = engineers.filter(e => e.workStatus === 'AVAILABLE');
    
    // Filter by skills
    if (skills) {
      const requiredSkills = skills.split(',');
      engineers = engineers.filter(engineer => 
        requiredSkills.some(skillId => 
          engineer.skills.some(skill => skill.skillId === skillId)
        )
      );
    }
    
    // Filter by experience
    if (experienceMin) {
      engineers = engineers.filter(e => e.experienceYears >= parseFloat(experienceMin));
    }
    
    // Filter by unit price
    if (unitPriceMax) {
      engineers = engineers.filter(e => e.unitPrice <= parseInt(unitPriceMax));
    }
    
    // Filter by location (if not remote)
    if (location && remoteWork !== 'true') {
      engineers = engineers.filter(e => e.location.includes(location));
    }
    
    // Calculate matching scores
    const project = projectId ? window.MockDB.getProjectById(projectId) : null;
    const results = engineers.map(engineer => {
      let score = 0;
      let reasons = [];
      
      // Skill matching
      if (project && project.requiredSkills) {
        const matchedSkills = project.requiredSkills.filter(skillId => 
          engineer.skills.some(skill => skill.skillId === skillId)
        );
        score += (matchedSkills.length / project.requiredSkills.length) * 40;
        reasons.push(`${matchedSkills.length}/${project.requiredSkills.length} スキルマッチ`);
      }
      
      // Experience bonus
      if (engineer.experienceYears >= 3) {
        score += Math.min(engineer.experienceYears * 2, 20);
        reasons.push(`${engineer.experienceYears}年の豊富な経験`);
      }
      
      // Price competitiveness
      if (project && project.unitPriceRange) {
        const priceScore = 100 - ((engineer.unitPrice - project.unitPriceRange.min) / 
          (project.unitPriceRange.max - project.unitPriceRange.min)) * 20;
        score += Math.max(priceScore, 0);
        reasons.push('価格競争力');
      }
      
      // Remote work capability
      if (engineer.remoteWork) {
        score += 10;
        reasons.push('リモートワーク対応');
      }
      
      // Availability bonus
      if (engineer.workStatus === 'AVAILABLE') {
        score += 10;
        reasons.push('即座に稼働可能');
      }
      
      return {
        engineer,
        score: Math.min(Math.round(score), 100),
        reasons: reasons.slice(0, 3),
        recommendation: score >= 80 ? 'HIGHLY_RECOMMENDED' : 
                      score >= 60 ? 'RECOMMENDED' : 
                      score >= 40 ? 'CONSIDER' : 'NOT_RECOMMENDED'
      };
    });
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    return this.paginate(results, query.page, query.size);
  }
  
  async evaluateMatching(params, query, data) {
    const { engineerId, projectId, evaluation } = data;
    
    // Store matching evaluation (would be persisted in real system)
    const matchingResult = {
      id: 'MATCH' + Date.now(),
      engineerId,
      projectId,
      evaluation,
      evaluatedAt: new Date(),
      evaluatedBy: 'USER001'
    };
    
    return matchingResult;
  }
  
  async getRecommendations(params, query) {
    // Get top recommendations based on recent activity
    const recommendations = [
      {
        type: 'ENGINEER_FOR_PROJECT',
        title: '田中太郎さんをECサイトプロジェクトに提案',
        description: 'React と TypeScript のスキルがマッチしています',
        score: 95,
        engineerId: 'ENG001',
        projectId: 'PRJ001'
      },
      {
        type: 'PROJECT_FOR_ENGINEER',
        title: '佐藤花子さんに適したプロジェクト',
        description: 'Vue.js スキルを活かせる新規案件があります',
        score: 88,
        engineerId: 'ENG002',
        projectId: 'PRJ002'
      }
    ];
    
    return recommendations;
  }
  
  // Dashboard API
  async getDashboardKPIs() {
    const kpis = {
      totalEngineers: window.MockDB.data.engineers.length,
      availableEngineers: window.MockDB.data.engineers.filter(e => e.workStatus === 'AVAILABLE').length,
      activeProjects: window.MockDB.data.projects.filter(p => p.status === 'IN_PROGRESS').length,
      pendingContracts: window.MockDB.data.contracts.filter(c => c.status === 'PENDING').length,
      monthlySales: 2450000,
      monthlyTarget: 3000000,
      salesGrowth: 12.5,
      utilizationRate: 78.5
    };
    
    return kpis;
  }
  
  async getDashboardCharts() {
    const charts = {
      salesTrend: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [{
          label: '売上',
          data: [1200000, 1350000, 1800000, 1650000, 2100000, 2450000],
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)'
        }, {
          label: '目標',
          data: [1500000, 1500000, 1700000, 1700000, 2000000, 2000000],
          borderColor: '#dc3545',
          borderDash: [5, 5]
        }]
      },
      skillDistribution: {
        labels: ['Java', 'React', 'Python', 'C#', 'Vue.js'],
        data: [8, 6, 5, 3, 2]
      },
      projectStatus: {
        labels: ['進行中', '計画中', '完了', 'キャンセル'],
        data: [2, 1, 1, 0],
        backgroundColor: ['#ffc107', '#0dcaf0', '#198754', '#dc3545']
      }
    };
    
    return charts;
  }
  
  async getRecentActivity() {
    const activity = [
      {
        id: 'ACT001',
        type: 'engineer_registered',
        title: '新しい技術者が登録されました',
        description: '高橋美咲さんが技術者として登録されました',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        icon: 'bi-person-plus',
        color: 'success'
      },
      {
        id: 'ACT002',
        type: 'contract_signed',
        title: '契約が締結されました',
        description: 'ECサイトプロジェクトの契約が成立しました',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        icon: 'bi-file-check',
        color: 'primary'
      },
      {
        id: 'ACT003',
        type: 'project_started',
        title: 'プロジェクトが開始されました',
        description: 'レガシーシステム modernization プロジェクトが開始されました',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        icon: 'bi-play-circle',
        color: 'info'
      }
    ];
    
    return activity;
  }
  
  // Notifications API
  async getNotifications(params, query) {
    const { page = 1, size = 20, unreadOnly = false } = query;
    let notifications = [...window.MockDB.data.notifications];
    
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Add time ago
    notifications = notifications.map(notification => ({
      ...notification,
      timeAgo: window.MockDB.getTimeAgo(new Date(notification.createdAt))
    }));
    
    return this.paginate(notifications, page, size);
  }
  
  async markNotificationAsRead(params) {
    const notification = window.MockDB.data.notifications.find(n => n.id === params.id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    notification.read = true;
    window.MockDB.saveToStorage();
    
    return notification;
  }
  
  async markAllNotificationsAsRead() {
    window.MockDB.data.notifications.forEach(notification => {
      notification.read = true;
    });
    
    window.MockDB.saveToStorage();
    
    return { message: 'All notifications marked as read' };
  }
  
  // Skills and Companies API
  async getSkills() {
    return window.MockDB.data.skills;
  }
  
  async getCompanies() {
    return window.MockDB.data.companies;
  }
  
  // Additional mock endpoints for specific features
  async getContracts(params, query) {
    return this.paginate(window.MockDB.data.contracts, query.page, query.size);
  }
  
  async getContract(params) {
    const contract = window.MockDB.data.contracts.find(c => c.id === params.id);
    if (!contract) {
      throw new Error('Contract not found');
    }
    return contract;
  }
  
  async createContract(params, query, data) {
    const newContract = {
      id: 'CTR' + String(window.MockDB.data.contracts.length + 1).padStart(3, '0'),
      ...data,
      status: 'PENDING',
      createdAt: new Date()
    };
    
    window.MockDB.data.contracts.push(newContract);
    window.MockDB.saveToStorage();
    
    return newContract;
  }
  
  async updateContract(params, query, data) {
    const index = window.MockDB.data.contracts.findIndex(c => c.id === params.id);
    if (index === -1) {
      throw new Error('Contract not found');
    }
    
    window.MockDB.data.contracts[index] = {
      ...window.MockDB.data.contracts[index],
      ...data,
      updatedAt: new Date()
    };
    
    window.MockDB.saveToStorage();
    
    return window.MockDB.data.contracts[index];
  }
  
  async getTimesheets(params, query) {
    return this.paginate(window.MockDB.data.timesheets, query.page, query.size);
  }
  
  async getTimesheet(params) {
    const timesheet = window.MockDB.data.timesheets.find(t => t.id === params.id);
    if (!timesheet) {
      throw new Error('Timesheet not found');
    }
    return timesheet;
  }
  
  async submitTimesheet(params, query, data) {
    const newTimesheet = {
      id: 'TS' + String(window.MockDB.data.timesheets.length + 1).padStart(3, '0'),
      ...data,
      status: 'SUBMITTED',
      submittedAt: new Date()
    };
    
    window.MockDB.data.timesheets.push(newTimesheet);
    window.MockDB.saveToStorage();
    
    return newTimesheet;
  }
  
  async approveTimesheet(params) {
    const index = window.MockDB.data.timesheets.findIndex(t => t.id === params.id);
    if (index === -1) {
      throw new Error('Timesheet not found');
    }
    
    window.MockDB.data.timesheets[index].status = 'APPROVED';
    window.MockDB.data.timesheets[index].approvedAt = new Date();
    window.MockDB.data.timesheets[index].approvedBy = 'MANAGER001';
    
    window.MockDB.saveToStorage();
    
    return window.MockDB.data.timesheets[index];
  }
  
  async getBilling(params, query) {
    return this.paginate(window.MockDB.data.billing, query.page, query.size);
  }
  
  async getBill(params) {
    const bill = window.MockDB.data.billing.find(b => b.id === params.id);
    if (!bill) {
      throw new Error('Bill not found');
    }
    return bill;
  }
  
  async createBill(params, query, data) {
    const newBill = {
      id: 'BILL' + String(window.MockDB.data.billing.length + 1).padStart(3, '0'),
      ...data,
      status: 'PENDING',
      invoiceDate: new Date()
    };
    
    window.MockDB.data.billing.push(newBill);
    window.MockDB.saveToStorage();
    
    return newBill;
  }
  
  async payBill(params) {
    const index = window.MockDB.data.billing.findIndex(b => b.id === params.id);
    if (index === -1) {
      throw new Error('Bill not found');
    }
    
    window.MockDB.data.billing[index].status = 'PAID';
    window.MockDB.data.billing[index].paidDate = new Date();
    
    window.MockDB.saveToStorage();
    
    return window.MockDB.data.billing[index];
  }
}

// Global instance
window.MockAPI = new MockAPI();

// Convenience wrapper for fetch-like API
window.api = {
  get: (url) => window.MockAPI.request('GET', url),
  post: (url, data) => window.MockAPI.request('POST', url, data),
  put: (url, data) => window.MockAPI.request('PUT', url, data),
  delete: (url) => window.MockAPI.request('DELETE', url)
};