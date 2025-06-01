// SES Manager Interactive Prototype Demo Script
// This script provides guided demonstration scenarios

window.DemoMode = {
  isActive: false,
  currentStep: 0,
  steps: [],
  overlay: null,
  
  // Demo scenarios
  scenarios: {
    'complete-workflow': {
      title: '完全ワークフローデモ',
      description: '技術者登録から案件マッチング、提案作成までの完全な流れ',
      steps: [
        {
          page: 'dashboard',
          title: 'ダッシュボード確認',
          description: 'システムの現在状況とKPIを確認します',
          actions: ['overview']
        },
        {
          page: 'engineers/new',
          title: '技術者登録',
          description: '新しい技術者を登録します',
          actions: ['fill-form', 'submit']
        },
        {
          page: 'projects/new',
          title: '案件登録',
          description: '新しい案件を登録します',
          actions: ['fill-form', 'submit']
        },
        {
          page: 'matching',
          title: 'マッチング実行',
          description: 'AI powered マッチングを実行します',
          actions: ['search', 'ai-match', 'view-results']
        },
        {
          page: 'dashboard',
          title: '結果確認',
          description: '作業結果をダッシュボードで確認します',
          actions: ['overview']
        }
      ]
    },
    'matching-demo': {
      title: 'マッチングシステムデモ',
      description: '高度なマッチング機能の実演',
      steps: [
        {
          page: 'matching',
          title: 'マッチング検索',
          description: '条件を設定してマッチングを実行',
          actions: ['advanced-search']
        },
        {
          page: 'matching',
          title: 'AI マッチング',
          description: 'AI アルゴリズムによる自動マッチング',
          actions: ['ai-analysis']
        },
        {
          page: 'matching',
          title: '結果分析',
          description: 'マッチング結果の詳細分析',
          actions: ['detailed-analysis']
        }
      ]
    },
    'data-management': {
      title: 'データ管理デモ',
      description: '技術者・案件データの管理機能',
      steps: [
        {
          page: 'engineers',
          title: '技術者一覧',
          description: '技術者データの検索・フィルタリング',
          actions: ['search', 'filter', 'sort']
        },
        {
          page: 'projects',
          title: '案件一覧',
          description: '案件データの管理・ステータス更新',
          actions: ['view-cards', 'status-update', 'bulk-actions']
        },
        {
          page: 'engineers/detail',
          title: '詳細表示',
          description: 'データの詳細表示と編集',
          actions: ['view-detail', 'edit']
        }
      ]
    }
  },
  
  // Initialize demo mode
  init() {
    this.createDemoControls();
    this.setupDemoData();
    console.log('Demo mode initialized');
  },
  
  // Create demo control UI
  createDemoControls() {
    const controls = document.createElement('div');
    controls.id = 'demo-controls';
    controls.className = 'demo-controls';
    controls.innerHTML = `
      <div class="demo-panel">
        <div class="demo-header">
          <h5><i class="bi bi-play-circle me-2"></i>デモモード</h5>
          <button class="btn btn-sm btn-outline-secondary" onclick="DemoMode.toggleDemo()">
            <span id="demo-toggle-text">開始</span>
          </button>
        </div>
        <div class="demo-content" id="demo-content" style="display: none;">
          <div class="mb-3">
            <label class="form-label">デモシナリオ</label>
            <select class="form-select form-select-sm" id="demo-scenario">
              <option value="">シナリオを選択...</option>
              <option value="complete-workflow">完全ワークフローデモ</option>
              <option value="matching-demo">マッチングシステムデモ</option>
              <option value="data-management">データ管理デモ</option>
            </select>
          </div>
          <div class="demo-progress mb-3" id="demo-progress" style="display: none;">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <small class="text-muted">進行状況</small>
              <small class="text-muted"><span id="current-step">0</span>/<span id="total-steps">0</span></small>
            </div>
            <div class="progress">
              <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
            </div>
          </div>
          <div class="demo-step" id="demo-step" style="display: none;">
            <h6 id="step-title"></h6>
            <p class="small text-muted" id="step-description"></p>
            <div class="d-flex gap-2">
              <button class="btn btn-primary btn-sm" onclick="DemoMode.nextStep()">次へ</button>
              <button class="btn btn-outline-secondary btn-sm" onclick="DemoMode.skipStep()">スキップ</button>
              <button class="btn btn-outline-danger btn-sm" onclick="DemoMode.stopDemo()">終了</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      .demo-controls {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1000;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 300px;
      }
      .demo-panel {
        padding: 16px;
      }
      .demo-header {
        display: flex;
        justify-content: between;
        align-items: center;
        margin-bottom: 12px;
      }
      .demo-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .demo-highlight {
        animation: pulse 2s infinite;
        border: 3px solid #ffc107 !important;
        border-radius: 4px;
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(controls);
  },
  
  // Setup demo data
  setupDemoData() {
    // Pre-populate with demo data
    window.MockDB.addSampleData();
    console.log('Demo data loaded');
  },
  
  // Toggle demo mode
  toggleDemo() {
    this.isActive = !this.isActive;
    const content = document.getElementById('demo-content');
    const toggleText = document.getElementById('demo-toggle-text');
    
    if (this.isActive) {
      content.style.display = 'block';
      toggleText.textContent = '終了';
    } else {
      content.style.display = 'none';
      toggleText.textContent = '開始';
      this.stopDemo();
    }
  },
  
  // Start demo scenario
  startScenario(scenarioKey) {
    const scenario = this.scenarios[scenarioKey];
    if (!scenario) return;
    
    this.steps = scenario.steps;
    this.currentStep = 0;
    
    document.getElementById('demo-progress').style.display = 'block';
    document.getElementById('demo-step').style.display = 'block';
    document.getElementById('total-steps').textContent = this.steps.length;
    
    this.showStep();
    window.app.showToast('info', 'デモ開始', scenario.title + 'を開始します');
  },
  
  // Show current step
  showStep() {
    if (this.currentStep >= this.steps.length) {
      this.completeDemo();
      return;
    }
    
    const step = this.steps[this.currentStep];
    document.getElementById('current-step').textContent = this.currentStep + 1;
    document.getElementById('step-title').textContent = step.title;
    document.getElementById('step-description').textContent = step.description;
    
    const progress = ((this.currentStep + 1) / this.steps.length) * 100;
    document.getElementById('progress-bar').style.width = progress + '%';
    
    // Navigate to step page
    window.app.navigate(step.page);
    
    // Highlight relevant elements
    this.highlightElements(step);
  },
  
  // Highlight demo elements
  highlightElements(step) {
    // Remove previous highlights
    document.querySelectorAll('.demo-highlight').forEach(el => {
      el.classList.remove('demo-highlight');
    });
    
    // Add highlights based on step actions
    setTimeout(() => {
      step.actions.forEach(action => {
        this.performAction(action);
      });
    }, 1000);
  },
  
  // Perform demo actions
  performAction(action) {
    switch (action) {
      case 'overview':
        // Highlight KPI cards
        document.querySelectorAll('.kpi-card').forEach(card => {
          card.classList.add('demo-highlight');
        });
        break;
        
      case 'fill-form':
        // Auto-fill form with demo data
        this.autoFillForm();
        break;
        
      case 'search':
        // Highlight search controls
        document.querySelectorAll('.filter-panel, .form-control').forEach(el => {
          el.classList.add('demo-highlight');
        });
        break;
        
      case 'ai-match':
        // Highlight AI matching button
        document.querySelectorAll('button[onclick*="AI"]').forEach(btn => {
          btn.classList.add('demo-highlight');
        });
        break;
        
      case 'view-results':
        // Highlight results area
        document.querySelectorAll('.matching-result, .engineer-card, .project-card').forEach(el => {
          el.classList.add('demo-highlight');
        });
        break;
    }
  },
  
  // Auto-fill forms with demo data
  autoFillForm() {
    const nameInput = document.querySelector('input[name="name"]');
    const emailInput = document.querySelector('input[name="email"]');
    const titleInput = document.querySelector('input[name="title"]');
    
    if (nameInput) {
      nameInput.value = 'デモ 太郎';
      nameInput.classList.add('demo-highlight');
    }
    
    if (emailInput) {
      emailInput.value = 'demo@example.com';
      emailInput.classList.add('demo-highlight');
    }
    
    if (titleInput) {
      titleInput.value = 'デモ案件プロジェクト';
      titleInput.classList.add('demo-highlight');
    }
    
    // Trigger Alpine.js reactivity
    nameInput?.dispatchEvent(new Event('input'));
    emailInput?.dispatchEvent(new Event('input'));
    titleInput?.dispatchEvent(new Event('input'));
  },
  
  // Next step
  nextStep() {
    this.currentStep++;
    this.showStep();
  },
  
  // Skip step
  skipStep() {
    this.nextStep();
  },
  
  // Stop demo
  stopDemo() {
    this.isActive = false;
    this.currentStep = 0;
    this.steps = [];
    
    document.getElementById('demo-progress').style.display = 'none';
    document.getElementById('demo-step').style.display = 'none';
    
    // Remove highlights
    document.querySelectorAll('.demo-highlight').forEach(el => {
      el.classList.remove('demo-highlight');
    });
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  },
  
  // Complete demo
  completeDemo() {
    window.app.showToast('success', 'デモ完了', 'デモシナリオが完了しました！');
    this.stopDemo();
  }
};

// Demo utility functions
window.DemoUtils = {
  // Generate sample data for demonstrations
  generateSampleData() {
    return {
      engineers: [
        {
          name: 'デモ 太郎',
          email: 'demo.taro@example.com',
          skills: ['REACT', 'TYPESCRIPT', 'NODE_JS'],
          experienceYears: 5,
          workStatus: 'AVAILABLE'
        },
        {
          name: 'テスト 花子',
          email: 'test.hanako@example.com',
          skills: ['VUE_JS', 'PYTHON', 'POSTGRESQL'],
          experienceYears: 3,
          workStatus: 'AVAILABLE'
        }
      ],
      projects: [
        {
          title: 'ECサイト開発プロジェクト',
          description: 'React/TypeScriptを使用したECサイトの開発',
          requiredSkills: ['REACT', 'TYPESCRIPT'],
          budget: { min: 600000, max: 800000 },
          status: 'PLANNING'
        },
        {
          title: '業務システム刷新',
          description: 'レガシーシステムのモダン化プロジェクト',
          requiredSkills: ['VUE_JS', 'PYTHON'],
          budget: { min: 700000, max: 900000 },
          status: 'PLANNING'
        }
      ]
    };
  },
  
  // Performance testing utilities
  performanceTest() {
    const startTime = performance.now();
    
    // Test data loading performance
    Promise.all([
      window.api.get('/api/engineers'),
      window.api.get('/api/projects'),
      window.api.get('/api/skills')
    ]).then(() => {
      const endTime = performance.now();
      console.log(`Data loading performance: ${endTime - startTime}ms`);
      window.app.showToast('info', 'パフォーマンステスト', 
        `データ読み込み: ${Math.round(endTime - startTime)}ms`);
    });
  },
  
  // Accessibility testing
  accessibilityTest() {
    const issues = [];
    
    // Check for missing alt texts
    document.querySelectorAll('img:not([alt])').forEach(img => {
      issues.push('Missing alt text for image');
    });
    
    // Check for form labels
    document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])').forEach(input => {
      if (!input.closest('label')) {
        issues.push('Form input without proper label');
      }
    });
    
    // Check for button texts
    document.querySelectorAll('button:empty').forEach(btn => {
      if (!btn.getAttribute('aria-label')) {
        issues.push('Button without text or aria-label');
      }
    });
    
    console.log('Accessibility issues:', issues);
    window.app.showToast('info', 'アクセシビリティテスト', 
      `${issues.length}件の改善点が見つかりました`);
  }
};

// Event listeners for demo controls
document.addEventListener('DOMContentLoaded', () => {
  // Initialize demo mode after a short delay
  setTimeout(() => {
    if (window.location.hash.includes('demo')) {
      DemoMode.init();
    }
  }, 2000);
  
  // Demo scenario selection
  document.addEventListener('change', (e) => {
    if (e.target.id === 'demo-scenario') {
      const scenario = e.target.value;
      if (scenario) {
        DemoMode.startScenario(scenario);
      }
    }
  });
});

// Global demo functions
window.startDemo = (scenario) => {
  DemoMode.init();
  DemoMode.toggleDemo();
  if (scenario) {
    document.getElementById('demo-scenario').value = scenario;
    DemoMode.startScenario(scenario);
  }
};

window.testPerformance = DemoUtils.performanceTest;
window.testAccessibility = DemoUtils.accessibilityTest;

console.log('Demo script loaded - Available functions: startDemo(), testPerformance(), testAccessibility()');