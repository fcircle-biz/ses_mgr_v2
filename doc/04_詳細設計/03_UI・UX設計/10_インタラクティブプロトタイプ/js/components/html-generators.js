// HTML Generators for SES Manager Prototype Pages

// Add HTML generation methods to the main app object
Object.assign(window.app, {
  
  // Dashboard HTML generation
  generateDashboardHTML(kpis, charts, activity) {
    return `
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h3 mb-2">ダッシュボード</h1>
            <p class="text-muted mb-0">SES業務の概要と最新情報</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="app.navigate('engineers/new')">
              <i class="bi bi-plus me-1"></i>技術者登録
            </button>
          </div>
        </div>
      </div>
      
      <!-- KPI Cards -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card kpi-card">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="stats-icon bg-primary text-white rounded-3 me-3">
                  <i class="bi bi-people-fill"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="stats-value h4 mb-0">${kpis.totalEngineers}</div>
                  <div class="stats-label text-muted small">技術者数</div>
                </div>
              </div>
              <div class="stats-trend mt-2">
                <span class="text-success">
                  <i class="bi bi-arrow-up"></i> ${kpis.availableEngineers}名
                </span>
                <span class="text-muted small ms-1">稼働可能</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-6 col-md-3">
          <div class="card kpi-card success">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="stats-icon bg-success text-white rounded-3 me-3">
                  <i class="bi bi-briefcase-fill"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="stats-value h4 mb-0">${kpis.activeProjects}</div>
                  <div class="stats-label text-muted small">進行中案件</div>
                </div>
              </div>
              <div class="progress mt-2" style="height: 4px;">
                <div class="progress-bar bg-success" style="width: ${(kpis.activeProjects / 5) * 100}%"></div>
              </div>
              <div class="d-flex justify-content-between mt-1">
                <small class="text-muted">目標: 5件</small>
                <small class="text-success">${Math.round((kpis.activeProjects / 5) * 100)}%</small>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-6 col-md-3">
          <div class="card kpi-card warning">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="stats-icon bg-warning text-white rounded-3 me-3">
                  <i class="bi bi-currency-yen"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="stats-value h4 mb-0">¥${(kpis.monthlySales / 1000000).toFixed(1)}M</div>
                  <div class="stats-label text-muted small">今月売上</div>
                </div>
              </div>
              <div class="stats-comparison mt-2">
                <div class="d-flex justify-content-between">
                  <span class="text-muted small">前月比</span>
                  <span class="text-success small">
                    <i class="bi bi-arrow-up"></i> +${kpis.salesGrowth}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-6 col-md-3">
          <div class="card kpi-card ${kpis.pendingContracts > 0 ? 'danger' : 'info'}">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="stats-icon bg-${kpis.pendingContracts > 0 ? 'danger' : 'info'} text-white rounded-3 me-3">
                  <i class="bi bi-file-text-fill"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="stats-value h4 mb-0">${kpis.pendingContracts}</div>
                  <div class="stats-label text-muted small">要対応契約</div>
                </div>
              </div>
              ${kpis.pendingContracts > 0 ? `
              <div class="mt-2">
                <button class="btn btn-outline-danger btn-sm w-100" onclick="app.navigate('contracts')">
                  <i class="bi bi-arrow-right me-1"></i>確認する
                </button>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Charts and Recent Activity -->
      <div class="row g-4">
        <div class="col-lg-8">
          <!-- Sales Chart -->
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5 class="card-title mb-0">売上推移</h5>
              <div class="btn-group btn-group-sm">
                <input type="radio" class="btn-check" name="chartPeriod" id="monthly" checked>
                <label class="btn btn-outline-secondary" for="monthly">月次</label>
                <input type="radio" class="btn-check" name="chartPeriod" id="quarterly">
                <label class="btn btn-outline-secondary" for="quarterly">四半期</label>
              </div>
            </div>
            <div class="card-body">
              <canvas id="salesChart" height="300"></canvas>
            </div>
          </div>
        </div>
        
        <div class="col-lg-4">
          <!-- Project Status Chart -->
          <div class="card mb-4">
            <div class="card-header">
              <h6 class="card-title mb-0">案件ステータス</h6>
            </div>
            <div class="card-body">
              <canvas id="projectStatusChart" height="200"></canvas>
            </div>
          </div>
          
          <!-- Recent Activity -->
          <div class="card">
            <div class="card-header">
              <h6 class="card-title mb-0">最新の活動</h6>
            </div>
            <div class="card-body">
              <div class="activity-list">
                ${activity.map(item => `
                  <div class="activity-item d-flex align-items-start mb-3">
                    <div class="activity-icon bg-${item.color} text-white rounded-circle me-3">
                      <i class="${item.icon}"></i>
                    </div>
                    <div class="flex-grow-1">
                      <div class="activity-title fw-medium">${item.title}</div>
                      <div class="activity-description text-muted small">${item.description}</div>
                      <div class="activity-time text-muted small">${window.MockDB.getTimeAgo(item.timestamp)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="text-center mt-3">
                <button class="btn btn-outline-primary btn-sm" onclick="app.navigate('notifications')">
                  すべての活動を表示
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  // Engineers List HTML generation
  generateEngineersListHTML(engineersData, skills) {
    const engineers = engineersData.content;
    
    return `
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h3 mb-2">技術者管理</h1>
            <p class="text-muted mb-0">技術者の登録・管理・検索を行います</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="app.navigate('engineers/new')">
              <i class="bi bi-plus me-1"></i>新規登録
            </button>
          </div>
        </div>
      </div>
      
      <!-- Search and Filter -->
      <div class="filter-panel mb-4">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">キーワード検索</label>
            <input type="text" class="form-control" placeholder="名前、メール、スキルで検索...">
          </div>
          <div class="col-md-3">
            <label class="form-label">稼働ステータス</label>
            <select class="form-select">
              <option value="">すべて</option>
              <option value="AVAILABLE">稼働可能</option>
              <option value="ASSIGNED">アサイン中</option>
              <option value="UNAVAILABLE">稼働不可</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">スキル</label>
            <select class="form-select">
              <option value="">すべて</option>
              ${skills.filter(s => s.category === 'PROGRAMMING').map(skill => 
                `<option value="${skill.id}">${skill.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button class="btn btn-primary w-100">検索</button>
          </div>
        </div>
      </div>
      
      <!-- Engineers Table -->
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>技術者一覧 (${engineersData.totalElements}件)</span>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary active">
              <i class="bi bi-table"></i> テーブル
            </button>
            <button class="btn btn-outline-secondary">
              <i class="bi bi-grid-3x3-gap"></i> カード
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">技術者名</th>
                <th scope="col" class="d-none d-md-table-cell">メール</th>
                <th scope="col">ステータス</th>
                <th scope="col" class="d-none d-lg-table-cell">スキル</th>
                <th scope="col" class="d-none d-md-table-cell">経験年数</th>
                <th scope="col" class="d-none d-md-table-cell">希望単価</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              ${engineers.map(engineer => `
                <tr>
                  <td>
                    <div class="d-flex align-items-center">
                      <img src="${engineer.avatar || 'assets/images/default-avatar.png'}" 
                           class="rounded-circle me-2" 
                           width="32" 
                           height="32"
                           alt="プロフィール画像">
                      <div>
                        <div class="fw-medium">${engineer.name}</div>
                        <small class="text-muted d-md-none">${engineer.email}</small>
                      </div>
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell">
                    <a href="mailto:${engineer.email}" class="text-decoration-none">
                      ${engineer.email}
                    </a>
                  </td>
                  <td>
                    <span class="badge status-${engineer.workStatus.toLowerCase()}">
                      ${this.getStatusLabel(engineer.workStatus)}
                    </span>
                  </td>
                  <td class="d-none d-lg-table-cell">
                    <div class="skill-tags">
                      ${engineer.skills.slice(0, 3).map(skill => {
                        const skillData = window.MockDB.getSkillById(skill.skillId);
                        return `<span class="badge bg-primary me-1">${skillData ? skillData.name : skill.skillId}</span>`;
                      }).join('')}
                      ${engineer.skills.length > 3 ? `<span class="badge bg-secondary">+${engineer.skills.length - 3}</span>` : ''}
                    </div>
                  </td>
                  <td class="d-none d-md-table-cell">
                    <span class="fw-medium">${engineer.experienceYears}年</span>
                  </td>
                  <td class="d-none d-md-table-cell">
                    <span class="fw-medium">¥${engineer.unitPrice.toLocaleString()}</span>
                  </td>
                  <td>
                    <div class="btn-group btn-group-sm">
                      <button class="btn btn-outline-primary" 
                              onclick="app.navigate('engineers/detail', {id: '${engineer.id}'})"
                              title="詳細表示">
                        <i class="bi bi-eye"></i>
                      </button>
                      <button class="btn btn-outline-secondary" 
                              onclick="app.navigate('engineers/edit', {id: '${engineer.id}'})"
                              title="編集">
                        <i class="bi bi-pencil"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="card-footer">
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              ${engineersData.totalElements}件中 ${(engineersData.page - 1) * engineersData.size + 1}-${Math.min(engineersData.page * engineersData.size, engineersData.totalElements)}件を表示
            </small>
            <nav aria-label="ページネーション">
              <ul class="pagination pagination-sm mb-0">
                <li class="page-item ${engineersData.first ? 'disabled' : ''}">
                  <a class="page-link" href="#">前へ</a>
                </li>
                <li class="page-item active">
                  <span class="page-link">${engineersData.page}</span>
                </li>
                <li class="page-item ${engineersData.last ? 'disabled' : ''}">
                  <a class="page-link" href="#">次へ</a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    `;
  },
  
  // Engineer Form HTML generation
  generateEngineerFormHTML(engineer = null, skills) {
    const isEdit = engineer !== null;
    
    return `
      <div class="page-header mb-4">
        <h1 class="h3">${isEdit ? '技術者編集' : '技術者新規登録'}</h1>
        <p class="text-muted">技術者の基本情報とスキルを登録します</p>
      </div>
      
      <form class="engineer-form" onsubmit="return false;">
        <!-- Basic Information -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">基本情報</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label for="name" class="form-label">技術者名 <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="name" name="name" 
                       value="${engineer ? engineer.name : ''}" required>
              </div>
              <div class="col-md-6">
                <label for="email" class="form-label">メールアドレス <span class="text-danger">*</span></label>
                <input type="email" class="form-control" id="email" name="email" 
                       value="${engineer ? engineer.email : ''}" required>
              </div>
              <div class="col-md-6">
                <label for="phone" class="form-label">電話番号</label>
                <input type="tel" class="form-control" id="phone" name="phone" 
                       value="${engineer ? engineer.phone : ''}" placeholder="090-1234-5678">
              </div>
              <div class="col-md-6">
                <label for="workStatus" class="form-label">稼働ステータス <span class="text-danger">*</span></label>
                <select class="form-select" id="workStatus" name="workStatus" required>
                  <option value="">選択してください</option>
                  <option value="AVAILABLE" ${engineer && engineer.workStatus === 'AVAILABLE' ? 'selected' : ''}>稼働可能</option>
                  <option value="ASSIGNED" ${engineer && engineer.workStatus === 'ASSIGNED' ? 'selected' : ''}>アサイン中</option>
                  <option value="UNAVAILABLE" ${engineer && engineer.workStatus === 'UNAVAILABLE' ? 'selected' : ''}>稼働不可</option>
                  <option value="PENDING" ${engineer && engineer.workStatus === 'PENDING' ? 'selected' : ''}>調整中</option>
                </select>
              </div>
              <div class="col-md-6">
                <label for="experienceYears" class="form-label">経験年数 <span class="text-danger">*</span></label>
                <div class="input-group">
                  <input type="number" class="form-control" id="experienceYears" name="experienceYears" 
                         value="${engineer ? engineer.experienceYears : ''}" 
                         min="0" max="50" step="0.5" required>
                  <span class="input-group-text">年</span>
                </div>
              </div>
              <div class="col-md-6">
                <label for="unitPrice" class="form-label">希望単価 <span class="text-danger">*</span></label>
                <div class="input-group">
                  <span class="input-group-text">¥</span>
                  <input type="number" class="form-control" id="unitPrice" name="unitPrice" 
                         value="${engineer ? engineer.unitPrice : ''}" 
                         min="0" step="10000" required>
                  <span class="input-group-text">円</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Skills -->
        <div class="card mb-4">
          <div class="card-header">
            <h5 class="card-title mb-0">スキル情報</h5>
          </div>
          <div class="card-body">
            <div class="row g-3">
              ${['PROGRAMMING', 'FRAMEWORK', 'DATABASE', 'CLOUD'].map(category => `
                <div class="col-md-6">
                  <label class="form-label">${this.getSkillCategoryLabel(category)}</label>
                  <div class="skill-category">
                    ${skills.filter(s => s.category === category).map(skill => `
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" 
                               id="skill-${skill.id}" name="skills" value="${skill.id}"
                               ${engineer && engineer.skills.some(s => s.skillId === skill.id) ? 'checked' : ''}>
                        <label class="form-check-label" for="skill-${skill.id}">
                          ${skill.name}
                        </label>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="d-flex justify-content-end gap-2">
          <button type="button" class="btn btn-outline-secondary" onclick="app.navigate('engineers')">
            キャンセル
          </button>
          <button type="submit" class="btn btn-primary">
            <i class="bi bi-check-lg me-1"></i>${isEdit ? '更新' : '登録'}
          </button>
        </div>
      </form>
    `;
  },
  
  // Projects List HTML generation
  generateProjectsListHTML(projectsData, skills, companies) {
    const projects = projectsData.content;
    
    return `
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h3 mb-2">案件管理</h1>
            <p class="text-muted mb-0">案件の登録・管理・進捗確認を行います</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="app.navigate('projects/new')">
              <i class="bi bi-plus me-1"></i>新規案件
            </button>
          </div>
        </div>
      </div>
      
      <!-- Project Cards -->
      <div class="row g-4">
        ${projects.map(project => `
          <div class="col-12 col-lg-6">
            <div class="card project-card h-100">
              <div class="card-header">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 class="card-title mb-1">${project.title}</h6>
                    <small class="text-white-50">ID: ${project.id}</small>
                  </div>
                  <div class="d-flex gap-2">
                    <span class="badge ${this.getProjectStatusClass(project.status)}">
                      ${this.getProjectStatusLabel(project.status)}
                    </span>
                    <span class="badge ${this.getProjectPriorityClass(project.priority)}">
                      ${this.getProjectPriorityLabel(project.priority)}
                    </span>
                  </div>
                </div>
              </div>
              <div class="card-body">
                <p class="card-text small mb-3">${project.description}</p>
                
                <!-- Project Details -->
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <small class="text-muted d-block">期間</small>
                    <small class="fw-medium">
                      ${new Date(project.period.start).toLocaleDateString('ja-JP')} - 
                      ${new Date(project.period.end).toLocaleDateString('ja-JP')}
                    </small>
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">予算</small>
                    <small class="fw-medium">
                      ¥${(project.budget.min / 1000000).toFixed(1)}M - ¥${(project.budget.max / 1000000).toFixed(1)}M
                    </small>
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">場所</small>
                    <small class="fw-medium">${project.location}</small>
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">リモート率</small>
                    <small class="fw-medium">${project.remoteWorkRatio}%</small>
                  </div>
                </div>
                
                <!-- Required Skills -->
                <div class="mb-3">
                  <small class="text-muted d-block mb-1">必要スキル</small>
                  <div class="skill-tags">
                    ${project.requiredSkills.map(skillId => {
                      const skill = skills.find(s => s.id === skillId);
                      return `<span class="badge bg-primary me-1 mb-1">${skill ? skill.name : skillId}</span>`;
                    }).join('')}
                  </div>
                </div>
                
                <!-- Progress -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted">進捗</small>
                    <small class="fw-medium">${project.progress}%</small>
                  </div>
                  <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-success" style="width: ${project.progress}%"></div>
                  </div>
                </div>
                
                <!-- Assigned Engineers -->
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <small class="text-muted">アサイン済み</small>
                    <div class="mt-1">
                      ${project.assignedEngineers.map(engineerId => {
                        const engineer = window.MockDB.getEngineerById(engineerId);
                        return engineer ? `
                          <img src="${engineer.avatar || 'assets/images/default-avatar.png'}" 
                               class="rounded-circle me-1" 
                               width="24" 
                               height="24"
                               title="${engineer.name}">
                        ` : '';
                      }).join('')}
                      ${project.assignedEngineers.length === 0 ? '<span class="text-muted small">未アサイン</span>' : ''}
                    </div>
                  </div>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" 
                            onclick="app.navigate('projects/detail', {id: '${project.id}'})">
                      <i class="bi bi-eye"></i> 詳細
                    </button>
                    <button class="btn btn-outline-secondary">
                      <i class="bi bi-pencil"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Load More -->
      ${!projectsData.last ? `
      <div class="text-center mt-4">
        <button class="btn btn-outline-primary">
          <i class="bi bi-arrow-down me-1"></i>さらに読み込む
        </button>
      </div>
      ` : ''}
    `;
  },
  
  // Matching Page HTML generation
  generateMatchingHTML(projects, skills) {
    return `
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h3 mb-2">マッチング</h1>
            <p class="text-muted mb-0">技術者と案件の最適なマッチングを支援します</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary">
              <i class="bi bi-robot me-1"></i>AI マッチング
            </button>
          </div>
        </div>
      </div>
      
      <!-- Matching Search -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0">マッチング検索</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label">対象案件</label>
              <select class="form-select" id="projectSelect">
                <option value="">案件を選択してください</option>
                ${projects.map(project => `
                  <option value="${project.id}">${project.title}</option>
                `).join('')}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">必要スキル</label>
              <select class="form-select" multiple id="skillsSelect">
                ${skills.filter(s => s.category === 'PROGRAMMING').map(skill => `
                  <option value="${skill.id}">${skill.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">経験年数（最低）</label>
              <select class="form-select">
                <option value="">指定なし</option>
                <option value="1">1年以上</option>
                <option value="3">3年以上</option>
                <option value="5">5年以上</option>
                <option value="10">10年以上</option>
              </select>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-primary" onclick="performMatching()">
              <i class="bi bi-search me-1"></i>マッチング実行
            </button>
          </div>
        </div>
      </div>
      
      <!-- Matching Results (Initially hidden) -->
      <div class="card" id="matchingResults" style="display: none;">
        <div class="card-header">
          <h5 class="card-title mb-0">マッチング結果</h5>
        </div>
        <div class="card-body">
          <div id="matchingResultsContent">
            <!-- Results will be populated here -->
          </div>
        </div>
      </div>
      
      <!-- Quick Recommendations -->
      <div class="card">
        <div class="card-header">
          <h5 class="card-title mb-0">おすすめマッチング</h5>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <div class="recommendation-card p-3 border rounded">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h6 class="mb-0">田中太郎 → ECサイトリニューアル</h6>
                  <span class="badge bg-success">95%</span>
                </div>
                <p class="small text-muted mb-2">React と TypeScript のスキルが完全にマッチしています</p>
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">
                    <i class="bi bi-star-fill text-warning"></i> 高度な推奨
                  </small>
                  <button class="btn btn-outline-primary btn-sm">
                    詳細確認
                  </button>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="recommendation-card p-3 border rounded">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h6 class="mb-0">佐藤花子 → 社内業務システム</h6>
                  <span class="badge bg-warning">78%</span>
                </div>
                <p class="small text-muted mb-2">Vue.js スキルを活かせる新規プロジェクトです</p>
                <div class="d-flex justify-content-between align-items-center">
                  <small class="text-muted">
                    <i class="bi bi-star text-warning"></i> 推奨
                  </small>
                  <button class="btn btn-outline-primary btn-sm">
                    詳細確認
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        async function performMatching() {
          const projectId = document.getElementById('projectSelect').value;
          if (!projectId) {
            app.showToast('warning', '警告', '案件を選択してください');
            return;
          }
          
          try {
            const response = await window.api.get(\`/api/matching/search?projectId=\${projectId}&skills=REACT,TYPESCRIPT\`);
            displayMatchingResults(response.data.content);
          } catch (error) {
            app.showToast('error', 'エラー', 'マッチング検索に失敗しました');
          }
        }
        
        function displayMatchingResults(results) {
          const container = document.getElementById('matchingResultsContent');
          const resultsCard = document.getElementById('matchingResults');
          
          container.innerHTML = results.map(result => \`
            <div class="matching-result border rounded p-3 mb-3">
              <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-center">
                  <img src="\${result.engineer.avatar || 'assets/images/default-avatar.png'}" 
                       class="rounded-circle me-3" width="48" height="48">
                  <div>
                    <h6 class="mb-0">\${result.engineer.name}</h6>
                    <small class="text-muted">\${result.engineer.email}</small>
                  </div>
                </div>
                <div class="text-end">
                  <div class="score-badge badge bg-\${result.score >= 80 ? 'success' : result.score >= 60 ? 'warning' : 'secondary'} mb-1">
                    \${result.score}%
                  </div>
                  <div class="recommendation-level small text-muted">
                    \${result.recommendation === 'HIGHLY_RECOMMENDED' ? '高度推奨' : 
                      result.recommendation === 'RECOMMENDED' ? '推奨' : 
                      result.recommendation === 'CONSIDER' ? '検討' : '非推奨'}
                  </div>
                </div>
              </div>
              <div class="mt-2">
                <div class="matching-reasons">
                  \${result.reasons.map(reason => \`<span class="badge bg-light text-dark me-1">\${reason}</span>\`).join('')}
                </div>
              </div>
              <div class="mt-3 d-flex justify-content-end">
                <button class="btn btn-outline-primary btn-sm me-2">詳細確認</button>
                <button class="btn btn-primary btn-sm">提案作成</button>
              </div>
            </div>
          \`).join('');
          
          resultsCard.style.display = 'block';
          app.showToast('success', '完了', \`\${results.length}件のマッチング結果が見つかりました\`);
        }
      </script>
    `;
  },
  
  // Notifications HTML generation
  generateNotificationsHTML(notificationsData) {
    const notifications = notificationsData.content;
    
    return `
      <div class="page-header mb-4">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h1 class="h3 mb-2">通知</h1>
            <p class="text-muted mb-0">システムからの通知とお知らせ</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-outline-secondary" onclick="app.markAllAsRead()">
              すべて既読にする
            </button>
          </div>
        </div>
      </div>
      
      <div class="notification-list">
        ${notifications.map(notification => `
          <div class="card mb-3 ${notification.read ? '' : 'border-primary'}">
            <div class="card-body">
              <div class="d-flex align-items-start">
                <div class="notification-icon bg-${notification.type} text-white rounded-circle me-3">
                  <i class="${notification.icon}"></i>
                </div>
                <div class="flex-grow-1">
                  <div class="d-flex justify-content-between align-items-start">
                    <h6 class="card-title mb-1 ${notification.read ? '' : 'fw-bold'}">${notification.title}</h6>
                    <small class="text-muted">${notification.timeAgo}</small>
                  </div>
                  <p class="card-text text-muted mb-2">${notification.message}</p>
                  ${notification.actionUrl ? `
                    <a href="#" class="btn btn-outline-primary btn-sm" 
                       onclick="app.navigate('${notification.actionUrl.replace('/', '')}')">
                      詳細を確認
                    </a>
                  ` : ''}
                </div>
                ${!notification.read ? `
                  <button class="btn btn-link btn-sm p-1" 
                          onclick="app.markAsRead('${notification.id}')"
                          title="既読にする">
                    <i class="bi bi-check"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      ${notifications.length === 0 ? `
        <div class="text-center py-5">
          <i class="bi bi-bell display-1 text-muted"></i>
          <h3 class="mt-3">通知はありません</h3>
          <p class="text-muted">新しい通知があるとここに表示されます</p>
        </div>
      ` : ''}
    `;
  },
  
  // Utility methods for labels and status
  getStatusLabel(status) {
    const labels = {
      'AVAILABLE': '稼働可能',
      'ASSIGNED': 'アサイン中',
      'UNAVAILABLE': '稼働不可',
      'PENDING': '調整中'
    };
    return labels[status] || status;
  },
  
  getSkillCategoryLabel(category) {
    const labels = {
      'PROGRAMMING': 'プログラミング言語',
      'FRAMEWORK': 'フレームワーク',
      'DATABASE': 'データベース',
      'CLOUD': 'クラウド',
      'INFRASTRUCTURE': 'インフラ',
      'TOOLS': 'ツール'
    };
    return labels[category] || category;
  },
  
  getProjectStatusLabel(status) {
    const labels = {
      'PLANNING': '計画中',
      'IN_PROGRESS': '進行中',
      'COMPLETED': '完了',
      'CANCELLED': 'キャンセル',
      'ON_HOLD': '保留'
    };
    return labels[status] || status;
  },
  
  getProjectStatusClass(status) {
    const classes = {
      'PLANNING': 'bg-info',
      'IN_PROGRESS': 'bg-warning',
      'COMPLETED': 'bg-success',
      'CANCELLED': 'bg-danger',
      'ON_HOLD': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  },
  
  getProjectPriorityLabel(priority) {
    const labels = {
      'HIGH': '高',
      'MEDIUM': '中',
      'LOW': '低'
    };
    return labels[priority] || priority;
  },
  
  getProjectPriorityClass(priority) {
    const classes = {
      'HIGH': 'bg-danger',
      'MEDIUM': 'bg-warning',
      'LOW': 'bg-success'
    };
    return classes[priority] || 'bg-secondary';
  },
  
  // Chart initialization
  initializeDashboardCharts(chartData) {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
      new Chart(salesCtx, {
        type: 'line',
        data: chartData.salesTrend,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '¥' + (value / 1000000) + 'M';
                }
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ¥' + 
                         context.parsed.y.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
    
    // Project Status Chart
    const statusCtx = document.getElementById('projectStatusChart');
    if (statusCtx) {
      new Chart(statusCtx, {
        type: 'doughnut',
        data: chartData.projectStatus,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            }
          }
        }
      });
    }
  }
});

// Make functions globally available for inline event handlers
window.performMatching = window.app.performMatching;