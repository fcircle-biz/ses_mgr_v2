// Integration Test Script for SES Manager Prototype
// Run this script to verify all components are functioning correctly

class PrototypeIntegrationTest {
  constructor() {
    this.testResults = [];
    this.currentTest = '';
    this.startTime = 0;
  }

  // Main test runner
  async runAllTests() {
    console.log('🧪 Starting SES Manager Prototype Integration Tests...');
    this.logTest('INTEGRATION_TEST_START', 'Starting comprehensive integration test suite');

    const testSuites = [
      { name: 'Core Dependencies', tests: this.testCoreDependencies.bind(this) },
      { name: 'Mock Data System', tests: this.testMockDataSystem.bind(this) },
      { name: 'Mock API System', tests: this.testMockAPISystem.bind(this) },
      { name: 'Alpine.js Components', tests: this.testAlpineComponents.bind(this) },
      { name: 'Navigation System', tests: this.testNavigationSystem.bind(this) },
      { name: 'Dashboard Features', tests: this.testDashboardFeatures.bind(this) },
      { name: 'Engineers Management', tests: this.testEngineersManagement.bind(this) },
      { name: 'Projects Management', tests: this.testProjectsManagement.bind(this) },
      { name: 'Matching System', tests: this.testMatchingSystem.bind(this) },
      { name: 'Responsive Design', tests: this.testResponsiveDesign.bind(this) }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.tests);
    }

    this.displayResults();
    return this.getOverallResult();
  }

  async runTestSuite(suiteName, testFunction) {
    console.log(`\n📋 Testing: ${suiteName}`);
    this.currentTest = suiteName;
    this.startTime = performance.now();

    try {
      await testFunction();
      this.logSuccess(`${suiteName} - All tests passed`);
    } catch (error) {
      this.logError(`${suiteName} - Test failed: ${error.message}`);
    }
  }

  // Test Core Dependencies
  async testCoreDependencies() {
    this.assert(typeof Alpine !== 'undefined', 'Alpine.js is loaded');
    this.assert(typeof htmx !== 'undefined', 'htmx is loaded');
    this.assert(typeof Chart !== 'undefined', 'Chart.js is loaded');
    this.assert(typeof bootstrap !== 'undefined', 'Bootstrap JS is loaded');
    
    // Check if CSS frameworks are loaded
    const bootstrapCSS = Array.from(document.styleSheets).some(sheet => 
      sheet.href && sheet.href.includes('bootstrap')
    );
    this.assert(bootstrapCSS, 'Bootstrap CSS is loaded');
    
    const customCSS = Array.from(document.styleSheets).some(sheet => 
      sheet.href && (sheet.href.includes('ses-theme') || sheet.href.includes('components'))
    );
    this.assert(customCSS, 'Custom CSS files are loaded');
  }

  // Test Mock Data System
  async testMockDataSystem() {
    this.assert(typeof window.MockDB !== 'undefined', 'MockDB is available');
    
    // Test data generation
    const engineers = window.MockDB.getEngineers({ page: 1, size: 5 });
    this.assert(engineers.content.length > 0, 'Engineers data is generated');
    this.assert(engineers.totalElements > 0, 'Engineers pagination info is correct');
    
    const projects = window.MockDB.getProjects({ page: 1, size: 5 });
    this.assert(projects.content.length > 0, 'Projects data is generated');
    
    const skills = window.MockDB.getSkills();
    this.assert(skills.length > 0, 'Skills data is generated');
    
    // Test data operations
    const testEngineer = {
      name: 'Test Engineer',
      email: 'test@example.com',
      workStatus: 'AVAILABLE',
      skills: ['JAVASCRIPT'],
      experienceYears: 3,
      unitPrice: 600000
    };
    
    const createdEngineer = window.MockDB.createEngineer(testEngineer);
    this.assert(createdEngineer.id, 'Engineer creation works');
    
    const updatedEngineer = window.MockDB.updateEngineer(createdEngineer.id, { name: 'Updated Name' });
    this.assert(updatedEngineer.name === 'Updated Name', 'Engineer update works');
    
    window.MockDB.deleteEngineer(createdEngineer.id);
    const deletedEngineer = window.MockDB.getEngineerById(createdEngineer.id);
    this.assert(!deletedEngineer, 'Engineer deletion works');
  }

  // Test Mock API System
  async testMockAPISystem() {
    this.assert(typeof window.api !== 'undefined', 'Mock API is available');
    
    // Test GET requests
    const engineersResponse = await window.api.get('/api/engineers');
    this.assert(engineersResponse.status === 200, 'Engineers API GET works');
    this.assert(engineersResponse.data.content.length > 0, 'Engineers API returns data');
    
    const dashboardResponse = await window.api.get('/api/dashboard/kpis');
    this.assert(dashboardResponse.status === 200, 'Dashboard KPI API works');
    this.assert(typeof dashboardResponse.data.totalEngineers === 'number', 'KPI data is valid');
    
    // Test POST request
    const newEngineer = {
      name: 'API Test Engineer',
      email: 'apitest@example.com',
      workStatus: 'AVAILABLE',
      skills: [{ skillId: 'JAVASCRIPT', level: 3 }],
      experienceYears: 2,
      unitPrice: 550000
    };
    
    const createResponse = await window.api.post('/api/engineers', newEngineer);
    this.assert(createResponse.status === 201, 'Engineer creation API works');
    
    // Test PUT request
    const updateResponse = await window.api.put(`/api/engineers/${createResponse.data.id}`, 
      { ...newEngineer, name: 'Updated API Engineer' });
    this.assert(updateResponse.status === 200, 'Engineer update API works');
    
    // Test DELETE request
    const deleteResponse = await window.api.delete(`/api/engineers/${createResponse.data.id}`);
    this.assert(deleteResponse.status === 204, 'Engineer deletion API works');
  }

  // Test Alpine.js Components
  async testAlpineComponents() {
    // Test if Alpine.js is initialized
    this.assert(window.Alpine, 'Alpine.js is initialized');
    
    // Test if app component data is available
    this.assert(typeof window.app !== 'undefined', 'Main app object is available');
    this.assert(typeof window.app.navigate === 'function', 'Navigation function exists');
    this.assert(typeof window.app.showToast === 'function', 'Toast function exists');
    
    // Test component scripts are loaded
    const componentScripts = [
      'dashboard.js',
      'engineers.js', 
      'projects.js',
      'matching.js',
      'html-generators.js'
    ];
    
    componentScripts.forEach(script => {
      const scriptElement = document.querySelector(`script[src*="${script}"]`);
      this.assert(scriptElement !== null, `${script} component is loaded`);
    });
  }

  // Test Navigation System
  async testNavigationSystem() {
    // Test page navigation
    await window.app.navigate('dashboard');
    this.assert(window.app.currentPage === 'dashboard', 'Dashboard navigation works');
    
    await window.app.navigate('engineers');
    this.assert(window.app.currentPage === 'engineers', 'Engineers navigation works');
    
    await window.app.navigate('projects');
    this.assert(window.app.currentPage === 'projects', 'Projects navigation works');
    
    await window.app.navigate('matching');
    this.assert(window.app.currentPage === 'matching', 'Matching navigation works');
    
    // Test breadcrumb generation
    this.assert(Array.isArray(window.app.breadcrumb), 'Breadcrumb is generated');
    this.assert(window.app.breadcrumb.length > 0, 'Breadcrumb has items');
  }

  // Test Dashboard Features
  async testDashboardFeatures() {
    await window.app.navigate('dashboard');
    await this.waitForElement('#page-content');
    
    // Wait for charts to potentially load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if KPI cards are rendered
    const kpiCards = document.querySelectorAll('.kpi-card');
    this.assert(kpiCards.length > 0, 'KPI cards are rendered');
    
    // Check if chart containers exist
    const chartContainers = document.querySelectorAll('canvas[id*="Chart"]');
    this.assert(chartContainers.length > 0, 'Chart containers are present');
    
    // Test toast notification
    window.app.showToast('info', 'Test', 'Dashboard test notification');
    const toasts = document.querySelectorAll('.toast');
    this.assert(toasts.length > 0, 'Toast notifications work');
  }

  // Test Engineers Management
  async testEngineersManagement() {
    await window.app.navigate('engineers');
    await this.waitForElement('#page-content');
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if engineers table/cards are rendered
    const engineerElements = document.querySelectorAll('.engineer-card, tbody tr');
    this.assert(engineerElements.length > 0, 'Engineers list is rendered');
    
    // Test if search functionality exists
    const searchInput = document.querySelector('input[placeholder*="検索"]');
    this.assert(searchInput !== null, 'Search input is present');
    
    // Test if filter controls exist
    const filterSelects = document.querySelectorAll('select');
    this.assert(filterSelects.length > 0, 'Filter controls are present');
  }

  // Test Projects Management
  async testProjectsManagement() {
    await window.app.navigate('projects');
    await this.waitForElement('#page-content');
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if projects are rendered
    const projectElements = document.querySelectorAll('.project-card, .card');
    this.assert(projectElements.length > 0, 'Projects list is rendered');
    
    // Test if project creation button exists
    const newProjectBtn = document.querySelector('button[onclick*="projects/new"]');
    this.assert(newProjectBtn !== null, 'New project button is present');
  }

  // Test Matching System
  async testMatchingSystem() {
    await window.app.navigate('matching');
    await this.waitForElement('#page-content');
    
    // Wait for component to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if matching search form exists
    const searchForm = document.querySelector('form, .card');
    this.assert(searchForm !== null, 'Matching search interface is present');
    
    // Check if project selection dropdown exists
    const projectSelect = document.querySelector('select[id*="project"], select');
    this.assert(projectSelect !== null, 'Project selection is available');
  }

  // Test Responsive Design
  async testResponsiveDesign() {
    // Test different viewport sizes
    const originalWidth = window.innerWidth;
    
    // Test mobile view
    this.simulateViewport(375, 667);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mobileNav = document.querySelector('.d-lg-none');
    this.assert(mobileNav !== null, 'Mobile navigation elements exist');
    
    // Test tablet view
    this.simulateViewport(768, 1024);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test desktop view
    this.simulateViewport(1200, 800);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const sidebar = document.querySelector('.sidebar');
    this.assert(sidebar !== null, 'Desktop sidebar is present');
    
    // Restore original viewport
    this.simulateViewport(originalWidth, window.innerHeight);
  }

  // Utility methods
  simulateViewport(width, height) {
    // This is a basic simulation - in real testing you'd use proper viewport testing tools
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
    window.dispatchEvent(new Event('resize'));
  }

  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (document.querySelector(selector)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Element ${selector} not found within ${timeout}ms`);
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    this.logSuccess(message);
  }

  logTest(type, message) {
    const timestamp = new Date().toISOString();
    this.testResults.push({
      type,
      message,
      timestamp,
      test: this.currentTest,
      duration: this.startTime ? performance.now() - this.startTime : 0
    });
  }

  logSuccess(message) {
    this.logTest('SUCCESS', message);
    console.log(`✅ ${message}`);
  }

  logError(message) {
    this.logTest('ERROR', message);
    console.error(`❌ ${message}`);
  }

  displayResults() {
    const successes = this.testResults.filter(r => r.type === 'SUCCESS').length;
    const errors = this.testResults.filter(r => r.type === 'ERROR').length;
    const totalTests = successes + errors;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successes: ${successes}`);
    console.log(`Failures: ${errors}`);
    console.log(`Success Rate: ${((successes / totalTests) * 100).toFixed(1)}%`);
    
    if (errors > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.type === 'ERROR')
        .forEach(result => {
          console.log(`  - ${result.test}: ${result.message}`);
        });
    }

    // Show results in UI if possible
    if (window.app && window.app.showToast) {
      const message = `${successes}/${totalTests} tests passed (${((successes / totalTests) * 100).toFixed(1)}%)`;
      const type = errors > 0 ? 'warning' : 'success';
      window.app.showToast(type, 'Integration Test Complete', message);
    }
  }

  getOverallResult() {
    const errors = this.testResults.filter(r => r.type === 'ERROR').length;
    return {
      passed: errors === 0,
      totalTests: this.testResults.filter(r => r.type !== 'INTEGRATION_TEST_START').length,
      failures: errors,
      results: this.testResults
    };
  }
}

// Global function to run tests
window.runIntegrationTests = async () => {
  const tester = new PrototypeIntegrationTest();
  return await tester.runAllTests();
};

// Auto-run tests if URL contains ?test=auto
if (window.location.search.includes('test=auto')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('🚀 Auto-running integration tests...');
      window.runIntegrationTests();
    }, 3000); // Wait for app to fully initialize
  });
}

console.log('Integration test script loaded. Run tests with: runIntegrationTests()');