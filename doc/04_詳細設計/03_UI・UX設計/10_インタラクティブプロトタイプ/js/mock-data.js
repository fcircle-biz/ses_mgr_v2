// Mock Data for SES Manager Prototype

class MockDatabase {
  constructor() {
    this.data = {
      engineers: [],
      projects: [],
      contracts: [],
      timesheets: [],
      billing: [],
      notifications: [],
      skills: [],
      companies: []
    };
    
    this.initialize();
  }
  
  initialize() {
    // Initialize skills first
    this.initializeSkills();
    this.initializeCompanies();
    
    // Initialize main data
    this.initializeEngineers();
    this.initializeProjects();
    this.initializeContracts();
    this.initializeTimesheets();
    this.initializeBilling();
    this.initializeNotifications();
    
    // Load from localStorage if available
    this.loadFromStorage();
  }
  
  initializeSkills() {
    this.data.skills = [
      // Programming Languages
      { id: 'JAVA', name: 'Java', category: 'PROGRAMMING', level: null },
      { id: 'PYTHON', name: 'Python', category: 'PROGRAMMING', level: null },
      { id: 'JAVASCRIPT', name: 'JavaScript', category: 'PROGRAMMING', level: null },
      { id: 'TYPESCRIPT', name: 'TypeScript', category: 'PROGRAMMING', level: null },
      { id: 'CSHARP', name: 'C#', category: 'PROGRAMMING', level: null },
      { id: 'PHP', name: 'PHP', category: 'PROGRAMMING', level: null },
      { id: 'GO', name: 'Go', category: 'PROGRAMMING', level: null },
      
      // Frameworks
      { id: 'SPRING_BOOT', name: 'Spring Boot', category: 'FRAMEWORK', level: null },
      { id: 'REACT', name: 'React', category: 'FRAMEWORK', level: null },
      { id: 'VUE', name: 'Vue.js', category: 'FRAMEWORK', level: null },
      { id: 'ANGULAR', name: 'Angular', category: 'FRAMEWORK', level: null },
      { id: 'NODE_JS', name: 'Node.js', category: 'FRAMEWORK', level: null },
      { id: 'DJANGO', name: 'Django', category: 'FRAMEWORK', level: null },
      { id: 'LARAVEL', name: 'Laravel', category: 'FRAMEWORK', level: null },
      
      // Databases
      { id: 'POSTGRESQL', name: 'PostgreSQL', category: 'DATABASE', level: null },
      { id: 'MYSQL', name: 'MySQL', category: 'DATABASE', level: null },
      { id: 'ORACLE', name: 'Oracle', category: 'DATABASE', level: null },
      { id: 'MONGODB', name: 'MongoDB', category: 'DATABASE', level: null },
      { id: 'REDIS', name: 'Redis', category: 'DATABASE', level: null },
      
      // Cloud/Infrastructure
      { id: 'AWS', name: 'AWS', category: 'CLOUD', level: null },
      { id: 'AZURE', name: 'Azure', category: 'CLOUD', level: null },
      { id: 'GCP', name: 'GCP', category: 'CLOUD', level: null },
      { id: 'DOCKER', name: 'Docker', category: 'INFRASTRUCTURE', level: null },
      { id: 'KUBERNETES', name: 'Kubernetes', category: 'INFRASTRUCTURE', level: null },
      
      // Other
      { id: 'GIT', name: 'Git', category: 'TOOLS', level: null },
      { id: 'JENKINS', name: 'Jenkins', category: 'TOOLS', level: null },
      { id: 'JIRA', name: 'JIRA', category: 'TOOLS', level: null }
    ];
  }
  
  initializeCompanies() {
    this.data.companies = [
      { id: 'COMP001', name: 'テックソリューションズ株式会社', type: 'CLIENT' },
      { id: 'COMP002', name: 'デジタルイノベーション株式会社', type: 'CLIENT' },
      { id: 'COMP003', name: 'システム開発パートナーズ', type: 'CLIENT' },
      { id: 'COMP004', name: 'フューチャーテクノロジー', type: 'CLIENT' },
      { id: 'COMP005', name: 'エンタープライズソフトウェア株式会社', type: 'CLIENT' },
      { id: 'COMP006', name: 'クラウドサービス株式会社', type: 'CLIENT' }
    ];
  }
  
  initializeEngineers() {
    const engineers = [
      {
        id: 'ENG001',
        name: '田中太郎',
        email: 't.tanaka@example.com',
        phone: '090-1234-5678',
        workStatus: 'AVAILABLE',
        skills: [
          { skillId: 'JAVA', level: 5 },
          { skillId: 'SPRING_BOOT', level: 4 },
          { skillId: 'POSTGRESQL', level: 4 },
          { skillId: 'AWS', level: 3 },
          { skillId: 'GIT', level: 5 }
        ],
        experienceYears: 5.5,
        unitPrice: 650000,
        contractType: 'PERMANENT',
        availableRoles: ['DEVELOPER', 'TEAM_LEAD'],
        location: '東京都',
        remoteWork: true,
        avatar: 'assets/images/avatars/user1.png',
        joinDate: '2019-04-01',
        lastUpdate: new Date('2025-06-01T10:00:00'),
        projects: ['PRJ001', 'PRJ003'],
        certifications: ['AWS Solution Architect', 'Oracle Java Gold'],
        languages: ['Japanese', 'English'],
        personalInfo: {
          birthDate: '1990-05-15',
          address: '東京都渋谷区',
          emergencyContact: '080-9876-5432'
        }
      },
      {
        id: 'ENG002',
        name: '佐藤花子',
        email: 'h.sato@example.com',
        phone: '080-9876-5432',
        workStatus: 'ASSIGNED',
        skills: [
          { skillId: 'REACT', level: 5 },
          { skillId: 'TYPESCRIPT', level: 4 },
          { skillId: 'NODE_JS', level: 4 },
          { skillId: 'AWS', level: 3 },
          { skillId: 'GIT', level: 5 }
        ],
        experienceYears: 4.2,
        unitPrice: 580000,
        contractType: 'CONTRACT',
        availableRoles: ['DEVELOPER', 'ARCHITECT'],
        location: '神奈川県',
        remoteWork: true,
        avatar: 'assets/images/avatars/user2.png',
        joinDate: '2020-09-01',
        lastUpdate: new Date('2025-05-30T15:30:00'),
        projects: ['PRJ002'],
        certifications: ['AWS Developer Associate'],
        languages: ['Japanese', 'English', 'Korean'],
        personalInfo: {
          birthDate: '1992-08-22',
          address: '神奈川県横浜市',
          emergencyContact: '090-1111-2222'
        }
      },
      {
        id: 'ENG003',
        name: '山田次郎',
        email: 'j.yamada@example.com',
        phone: '070-5555-7777',
        workStatus: 'AVAILABLE',
        skills: [
          { skillId: 'PYTHON', level: 5 },
          { skillId: 'DJANGO', level: 4 },
          { skillId: 'POSTGRESQL', level: 4 },
          { skillId: 'DOCKER', level: 3 },
          { skillId: 'GIT', level: 4 }
        ],
        experienceYears: 3.8,
        unitPrice: 520000,
        contractType: 'FREELANCE',
        availableRoles: ['DEVELOPER'],
        location: '大阪府',
        remoteWork: true,
        avatar: 'assets/images/avatars/user3.png',
        joinDate: '2021-01-15',
        lastUpdate: new Date('2025-05-28T09:45:00'),
        projects: [],
        certifications: ['Python Institute PCAP'],
        languages: ['Japanese'],
        personalInfo: {
          birthDate: '1995-03-10',
          address: '大阪府大阪市',
          emergencyContact: '080-3333-4444'
        }
      },
      {
        id: 'ENG004',
        name: '鈴木一郎',
        email: 'i.suzuki@example.com',
        phone: '090-8888-9999',
        workStatus: 'UNAVAILABLE',
        skills: [
          { skillId: 'CSHARP', level: 5 },
          { skillId: 'AZURE', level: 4 },
          { skillId: 'MYSQL', level: 3 },
          { skillId: 'GIT', level: 4 }
        ],
        experienceYears: 7.2,
        unitPrice: 750000,
        contractType: 'PERMANENT',
        availableRoles: ['DEVELOPER', 'ARCHITECT', 'PROJECT_MANAGER'],
        location: '愛知県',
        remoteWork: false,
        avatar: 'assets/images/avatars/user4.png',
        joinDate: '2018-06-01',
        lastUpdate: new Date('2025-05-25T14:20:00'),
        projects: ['PRJ004'],
        certifications: ['Microsoft Azure Solution Architect'],
        languages: ['Japanese', 'English'],
        personalInfo: {
          birthDate: '1988-11-30',
          address: '愛知県名古屋市',
          emergencyContact: '070-7777-8888'
        }
      },
      {
        id: 'ENG005',
        name: '高橋美咲',
        email: 'm.takahashi@example.com',
        phone: '080-2222-3333',
        workStatus: 'AVAILABLE',
        skills: [
          { skillId: 'VUE', level: 4 },
          { skillId: 'JAVASCRIPT', level: 5 },
          { skillId: 'PHP', level: 3 },
          { skillId: 'LARAVEL', level: 3 },
          { skillId: 'MYSQL', level: 3 }
        ],
        experienceYears: 2.5,
        unitPrice: 450000,
        contractType: 'CONTRACT',
        availableRoles: ['DEVELOPER'],
        location: '福岡県',
        remoteWork: true,
        avatar: 'assets/images/avatars/user5.png',
        joinDate: '2022-10-01',
        lastUpdate: new Date('2025-06-01T11:15:00'),
        projects: [],
        certifications: [],
        languages: ['Japanese'],
        personalInfo: {
          birthDate: '1997-07-18',
          address: '福岡県福岡市',
          emergencyContact: '090-4444-5555'
        }
      }
    ];
    
    this.data.engineers = engineers;
  }
  
  initializeProjects() {
    const projects = [
      {
        id: 'PRJ001',
        title: 'ECサイトリニューアルプロジェクト',
        description: '既存ECサイトのフルリニューアル。React + TypeScript での SPA 化、マイクロサービス化による性能向上を目指します。',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        clientCompany: 'COMP001',
        requiredSkills: ['REACT', 'TYPESCRIPT', 'NODE_JS', 'AWS'],
        assignedEngineers: ['ENG001'],
        budget: { min: 7000000, max: 9000000 },
        unitPriceRange: { min: 700000, max: 900000 },
        period: { 
          start: new Date('2025-07-01'), 
          end: new Date('2025-12-31') 
        },
        location: '東京都渋谷区',
        remoteWorkRatio: 80,
        workingHours: { start: '09:00', end: '18:00' },
        requirementsDetail: {
          teamSize: 5,
          roles: ['DEVELOPER', 'ARCHITECT', 'PROJECT_MANAGER'],
          technologies: ['React 18', 'TypeScript 5', 'Node.js 18', 'PostgreSQL 15', 'AWS ECS']
        },
        progress: 65,
        milestones: [
          { name: '要件定義', status: 'COMPLETED', dueDate: '2025-07-15' },
          { name: '基本設計', status: 'COMPLETED', dueDate: '2025-08-31' },
          { name: '詳細設計', status: 'IN_PROGRESS', dueDate: '2025-09-30' },
          { name: '開発・テスト', status: 'PENDING', dueDate: '2025-11-30' },
          { name: 'リリース', status: 'PENDING', dueDate: '2025-12-15' }
        ],
        createdAt: new Date('2025-05-01T09:00:00'),
        updatedAt: new Date('2025-06-01T14:30:00')
      },
      {
        id: 'PRJ002',
        title: '社内業務システム開発',
        description: '人事・経理・営業の業務効率化を目的とした統合システムの開発。クラウドネイティブ設計でスケーラビリティを重視。',
        status: 'PLANNING',
        priority: 'MEDIUM',
        clientCompany: 'COMP002',
        requiredSkills: ['JAVA', 'SPRING_BOOT', 'POSTGRESQL', 'KUBERNETES'],
        assignedEngineers: ['ENG002'],
        budget: { min: 5000000, max: 7000000 },
        unitPriceRange: { min: 650000, max: 850000 },
        period: { 
          start: new Date('2025-08-01'), 
          end: new Date('2026-03-31') 
        },
        location: '東京都千代田区',
        remoteWorkRatio: 60,
        workingHours: { start: '10:00', end: '19:00' },
        requirementsDetail: {
          teamSize: 8,
          roles: ['DEVELOPER', 'ARCHITECT', 'PROJECT_MANAGER', 'TEAM_LEAD'],
          technologies: ['Java 17', 'Spring Boot 3', 'PostgreSQL 15', 'Kubernetes', 'GitLab CI/CD']
        },
        progress: 15,
        milestones: [
          { name: '要件定義', status: 'IN_PROGRESS', dueDate: '2025-08-15' },
          { name: '基本設計', status: 'PENDING', dueDate: '2025-09-30' },
          { name: '詳細設計', status: 'PENDING', dueDate: '2025-11-30' },
          { name: '開発・テスト', status: 'PENDING', dueDate: '2026-02-28' },
          { name: 'リリース', status: 'PENDING', dueDate: '2026-03-15' }
        ],
        createdAt: new Date('2025-05-15T10:30:00'),
        updatedAt: new Date('2025-05-30T16:45:00')
      },
      {
        id: 'PRJ003',
        title: 'モバイルアプリケーション開発',
        description: '顧客向けモバイルアプリの新規開発。React Native を使用したクロスプラットフォーム対応。',
        status: 'COMPLETED',
        priority: 'LOW',
        clientCompany: 'COMP003',
        requiredSkills: ['REACT', 'TYPESCRIPT', 'MONGODB', 'NODE_JS'],
        assignedEngineers: ['ENG001'],
        budget: { min: 3000000, max: 4000000 },
        unitPriceRange: { min: 600000, max: 750000 },
        period: { 
          start: new Date('2025-01-01'), 
          end: new Date('2025-05-31') 
        },
        location: '神奈川県横浜市',
        remoteWorkRatio: 100,
        workingHours: { start: '09:00', end: '17:00' },
        requirementsDetail: {
          teamSize: 3,
          roles: ['DEVELOPER', 'TEAM_LEAD'],
          technologies: ['React Native', 'TypeScript', 'Node.js', 'MongoDB', 'Firebase']
        },
        progress: 100,
        milestones: [
          { name: '要件定義', status: 'COMPLETED', dueDate: '2025-01-15' },
          { name: '基本設計', status: 'COMPLETED', dueDate: '2025-02-15' },
          { name: '詳細設計', status: 'COMPLETED', dueDate: '2025-02-28' },
          { name: '開発・テスト', status: 'COMPLETED', dueDate: '2025-04-30' },
          { name: 'リリース', status: 'COMPLETED', dueDate: '2025-05-15' }
        ],
        createdAt: new Date('2024-12-01T08:00:00'),
        updatedAt: new Date('2025-05-31T17:00:00')
      },
      {
        id: 'PRJ004',
        title: 'レガシーシステム modernization',
        description: '.NET Framework から .NET 8 への移行と Azure クラウド化。段階的な移行により業務継続性を確保。',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        clientCompany: 'COMP004',
        requiredSkills: ['CSHARP', 'AZURE', 'MYSQL'],
        assignedEngineers: ['ENG004'],
        budget: { min: 8000000, max: 12000000 },
        unitPriceRange: { min: 750000, max: 1000000 },
        period: { 
          start: new Date('2025-06-01'), 
          end: new Date('2026-05-31') 
        },
        location: '愛知県名古屋市',
        remoteWorkRatio: 40,
        workingHours: { start: '08:30', end: '17:30' },
        requirementsDetail: {
          teamSize: 6,
          roles: ['DEVELOPER', 'ARCHITECT', 'PROJECT_MANAGER'],
          technologies: ['.NET 8', 'Azure App Service', 'Azure SQL Database', 'Azure DevOps']
        },
        progress: 25,
        milestones: [
          { name: '現状分析', status: 'COMPLETED', dueDate: '2025-06-15' },
          { name: '移行計画策定', status: 'IN_PROGRESS', dueDate: '2025-07-31' },
          { name: 'POC開発', status: 'PENDING', dueDate: '2025-09-30' },
          { name: '段階移行実施', status: 'PENDING', dueDate: '2026-03-31' },
          { name: '完全移行', status: 'PENDING', dueDate: '2026-05-15' }
        ],
        createdAt: new Date('2025-05-01T09:00:00'),
        updatedAt: new Date('2025-06-01T12:00:00')
      }
    ];
    
    this.data.projects = projects;
  }
  
  initializeContracts() {
    this.data.contracts = [
      {
        id: 'CTR001',
        engineerId: 'ENG001',
        projectId: 'PRJ001',
        type: 'PROJECT_BASED',
        status: 'ACTIVE',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-12-31'),
        unitPrice: 650000,
        workingDays: 20,
        estimatedHours: 160,
        terms: {
          overtimeRate: 1.25,
          holidayRate: 1.5,
          expenses: true,
          confidentiality: true
        },
        cloudSignDocumentId: 'CS-DOC-001',
        createdAt: new Date('2025-06-01T10:00:00'),
        signedAt: new Date('2025-06-05T15:30:00')
      },
      {
        id: 'CTR002',
        engineerId: 'ENG002',
        projectId: 'PRJ002',
        type: 'MONTHLY',
        status: 'PENDING',
        startDate: new Date('2025-08-01'),
        endDate: new Date('2026-03-31'),
        unitPrice: 580000,
        workingDays: 22,
        estimatedHours: 176,
        terms: {
          overtimeRate: 1.25,
          holidayRate: 1.5,
          expenses: true,
          confidentiality: true
        },
        cloudSignDocumentId: null,
        createdAt: new Date('2025-05-30T14:00:00'),
        signedAt: null
      }
    ];
  }
  
  initializeTimesheets() {
    this.data.timesheets = [
      {
        id: 'TS001',
        engineerId: 'ENG001',
        projectId: 'PRJ001',
        contractId: 'CTR001',
        period: { year: 2025, month: 6 },
        workDays: [
          { date: '2025-06-01', startTime: '09:00', endTime: '18:00', breakTime: 60, overtime: 0, status: 'APPROVED' },
          { date: '2025-06-02', startTime: '09:00', endTime: '19:00', breakTime: 60, overtime: 60, status: 'APPROVED' }
        ],
        totalHours: 176,
        overtimeHours: 8,
        status: 'APPROVED',
        submittedAt: new Date('2025-06-30T17:00:00'),
        approvedAt: new Date('2025-07-01T10:00:00'),
        approvedBy: 'MANAGER001'
      }
    ];
  }
  
  initializeBilling() {
    this.data.billing = [
      {
        id: 'BILL001',
        contractId: 'CTR001',
        period: { year: 2025, month: 6 },
        amount: 650000,
        tax: 65000,
        totalAmount: 715000,
        status: 'PAID',
        invoiceDate: new Date('2025-07-01'),
        dueDate: new Date('2025-07-31'),
        paidDate: new Date('2025-07-28'),
        moneyForwardId: 'MF-INV-001',
        bankInfo: {
          accountName: 'SES Manager Inc.',
          accountNumber: '1234567',
          bankName: 'Sample Bank'
        }
      }
    ];
  }
  
  initializeNotifications() {
    const now = new Date();
    this.data.notifications = [
      {
        id: 'NOT001',
        type: 'info',
        title: '新しい案件提案',
        message: 'ECサイトリニューアルプロジェクトについて、React開発者の提案をお待ちしています。',
        userId: 'USER001',
        read: false,
        createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5分前
        icon: 'bi-briefcase',
        actionUrl: '/projects/PRJ001'
      },
      {
        id: 'NOT002',
        type: 'success',
        title: '契約書署名完了',
        message: '田中太郎さんとの業務委託契約の電子署名が完了しました。',
        userId: 'USER001',
        read: false,
        createdAt: new Date(now.getTime() - 60 * 60 * 1000), // 1時間前
        icon: 'bi-check-circle',
        actionUrl: '/contracts/CTR001'
      },
      {
        id: 'NOT003',
        type: 'warning',
        title: '勤怠承認待ち',
        message: '3件の勤怠報告が承認待ちです。確認をお願いします。',
        userId: 'USER001',
        read: true,
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3時間前
        icon: 'bi-clock',
        actionUrl: '/timesheets/pending'
      },
      {
        id: 'NOT004',
        type: 'danger',
        title: '支払期限まもなく',
        message: '請求書BILL001の支払期限が3日後に迫っています。',
        userId: 'USER001',
        read: true,
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6時間前
        icon: 'bi-exclamation-triangle',
        actionUrl: '/billing/BILL001'
      },
      {
        id: 'NOT005',
        type: 'info',
        title: 'システムメンテナンス',
        message: '明日午前2時-4時にシステムメンテナンスを実施します。',
        userId: 'USER001',
        read: true,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1日前
        icon: 'bi-gear',
        actionUrl: '/maintenance'
      }
    ];
  }
  
  // Utility methods
  getEngineerById(id) {
    return this.data.engineers.find(e => e.id === id);
  }
  
  getProjectById(id) {
    return this.data.projects.find(p => p.id === id);
  }
  
  getSkillById(id) {
    return this.data.skills.find(s => s.id === id);
  }
  
  getCompanyById(id) {
    return this.data.companies.find(c => c.id === id);
  }
  
  searchEngineers(query, filters = {}) {
    let results = this.data.engineers;
    
    // Text search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(engineer => 
        engineer.name.toLowerCase().includes(queryLower) ||
        engineer.email.toLowerCase().includes(queryLower) ||
        engineer.skills.some(skill => {
          const skillData = this.getSkillById(skill.skillId);
          return skillData && skillData.name.toLowerCase().includes(queryLower);
        })
      );
    }
    
    // Status filter
    if (filters.workStatus && filters.workStatus !== '') {
      results = results.filter(engineer => engineer.workStatus === filters.workStatus);
    }
    
    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      results = results.filter(engineer => 
        filters.skills.every(skillId => 
          engineer.skills.some(skill => skill.skillId === skillId)
        )
      );
    }
    
    // Experience filter
    if (filters.experienceMin !== undefined) {
      results = results.filter(engineer => engineer.experienceYears >= filters.experienceMin);
    }
    
    if (filters.experienceMax !== undefined) {
      results = results.filter(engineer => engineer.experienceYears <= filters.experienceMax);
    }
    
    // Unit price filter
    if (filters.unitPriceMin !== undefined) {
      results = results.filter(engineer => engineer.unitPrice >= filters.unitPriceMin);
    }
    
    if (filters.unitPriceMax !== undefined) {
      results = results.filter(engineer => engineer.unitPrice <= filters.unitPriceMax);
    }
    
    return results;
  }
  
  searchProjects(query, filters = {}) {
    let results = this.data.projects;
    
    // Text search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(project => 
        project.title.toLowerCase().includes(queryLower) ||
        project.description.toLowerCase().includes(queryLower) ||
        project.requiredSkills.some(skillId => {
          const skillData = this.getSkillById(skillId);
          return skillData && skillData.name.toLowerCase().includes(queryLower);
        })
      );
    }
    
    // Status filter
    if (filters.status && filters.status !== '') {
      results = results.filter(project => project.status === filters.status);
    }
    
    // Skills filter
    if (filters.requiredSkills && filters.requiredSkills.length > 0) {
      results = results.filter(project => 
        filters.requiredSkills.some(skillId => 
          project.requiredSkills.includes(skillId)
        )
      );
    }
    
    return results;
  }
  
  // Storage methods
  saveToStorage() {
    try {
      localStorage.setItem('ses-mock-data', JSON.stringify(this.data));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
    }
  }
  
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('ses-mock-data');
      if (stored) {
        const data = JSON.parse(stored);
        // Merge with default data, preserving any additions
        Object.keys(data).forEach(key => {
          if (this.data[key] && Array.isArray(this.data[key])) {
            // For arrays, merge by ID if possible
            if (data[key] && Array.isArray(data[key])) {
              const merged = [...this.data[key]];
              data[key].forEach(item => {
                const existingIndex = merged.findIndex(existing => existing.id === item.id);
                if (existingIndex >= 0) {
                  merged[existingIndex] = item;
                } else {
                  merged.push(item);
                }
              });
              this.data[key] = merged;
            }
          } else {
            this.data[key] = data[key];
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load data from localStorage:', error);
    }
  }
  
  // Helper methods for time formatting
  getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP');
  }
}

// Global instance
window.MockDB = new MockDatabase();