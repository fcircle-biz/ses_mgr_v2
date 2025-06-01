# Engineer Context 画面仕様書

## 📋 概要

### 文書情報
- **対象システム**: SES業務システム
- **対象コンテキスト**: Engineer Context（技術者管理）
- **文書種別**: 画面仕様書
- **作成日**: 2025年6月1日
- **バージョン**: 1.0

### 対象画面
1. 技術者一覧画面
2. 技術者詳細画面
3. 技術者新規登録・編集画面
4. スキルマトリックス評価画面

---

## 🎯 全体方針

### デザインシステム
- **UIフレームワーク**: Bootstrap 5.3.2
- **チャートライブラリ**: Chart.js 4.4.0（スキル可視化用）
- **レスポンシブ対応**: Mobile First
- **テーマカラー**:
  - Primary: #0d6efd
  - Secondary: #6c757d
  - Success: #198754
  - Warning: #ffc107
  - Danger: #dc3545

### 特殊要件
- **スキル管理の視覚化**: レーダーチャート、バーチャート使用
- **リアルタイム更新**: スキル評価・稼働状況の即座反映
- **マッチング支援**: スキル検索・フィルタリングの高度機能

---

## 📄 1. 技術者一覧画面

### 1.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | ENG-001 |
| **画面名** | 技術者一覧画面 |
| **URL** | `/engineers` |
| **アクセス権限** | 営業担当、PM、技術マネージャー、管理者 |
| **表示方式** | 一覧表示（カード + テーブル レスポンシブ） |

### 1.2 機能要件

#### 主要機能
1. **技術者一覧表示**
   - ページング対応（デフォルト20件/ページ）
   - ソート機能（名前、スキルレベル、稼働率、登録日）
   - 高度フィルタリング機能（スキル、経験、稼働状況）

2. **スキル検索・フィルタ機能**
   - スキルカテゴリフィルタ（プログラミング言語、フレームワーク、DB、インフラ等）
   - 経験年数範囲指定
   - スキルレベル指定
   - 稼働状況フィルタ
   - 勤務地・リモート対応フィルタ

3. **操作機能**
   - 詳細表示（プロフィール参照）
   - 編集（権限に応じて）
   - スキルシート出力（PDF）
   - 新規登録
   - 一括操作（ステータス変更、メール送信）

#### データ項目
| 項目名 | 表示名 | データ型 | 必須 | 表示条件 | 特記事項 |
|--------|--------|----------|------|----------|----------|
| engineerId | 技術者ID | String | ○ | 常時 | 一意識別子 |
| employeeNumber | 社員番号 | String | ○ | 常時 | - |
| fullName | 氏名 | String | ○ | 常時 | - |
| email | メールアドレス | String | ○ | 常時 | - |
| workStatus | 稼働状況 | Enum | ○ | バッジ表示 | AVAILABLE/BUSY/PARTIALLY_AVAILABLE/UNAVAILABLE |
| skillLevel | 総合スキルレベル | Enum | ○ | バッジ表示 | BEGINNER/INTERMEDIATE/ADVANCED/EXPERT |
| primarySkills | 主要スキル | Array | ○ | タグ表示 | 上位3スキル |
| experienceYears | 総経験年数 | Integer | ○ | 常時 | 年単位 |
| currentUtilization | 現在稼働率 | Integer | △ | プログレスバー | 0-100% |
| availableFrom | 参画可能日 | Date | △ | 稼働状況による | workStatus=AVAILABLEの場合 |
| location | 勤務地 | String | △ | 常時 | - |
| remoteCapable | リモート対応 | Boolean | △ | アイコン表示 | - |
| lastUpdated | 最終更新日 | DateTime | ○ | 常時 | - |
| profileImageUrl | プロフィール画像 | String | △ | アバター表示 | - |

### 1.3 画面レイアウト

#### デスクトップ版レイアウト
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー (固定)                                               │
├─────────────┬───────────────────────────────────────────────┤
│ サイドバー   │ メインコンテンツ                               │
│ (固定)      │ ┌─────────────────────────────────────────────┐ │
│             │ │ パンくずリスト                               │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ タイトル + 新規登録ボタン + 一括操作         │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ 高度検索・フィルタエリア                     │ │
│             │ │ ┌─────────┬─────────┬─────────┬─────────┐ │ │
│             │ │ │キーワード│スキル    │経験年数  │稼働状況  │ │ │
│             │ │ │検索      │カテゴリ  │範囲      │        │ │ │
│             │ │ └─────────┴─────────┴─────────┴─────────┘ │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ 技術者一覧表示エリア                         │ │
│             │ │ ┌─────────────────────────────────────────┐ │ │
│             │ │ │ テーブルヘッダー (ソート可能)            │ │ │
│             │ │ ├─────────────────────────────────────────┤ │ │
│             │ │ │ ☐ 田中太郎 | Java,Spring | 上級 | 稼働中 │ │ │
│             │ │ │ ☐ 佐藤花子 | React,Node  | 中級 | 待機中 │ │ │
│             │ │ │ ☐ 山田次郎 | Python,AWS  | 上級 | 稼働中 │ │ │
│             │ │ └─────────────────────────────────────────┘ │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ ページング + 件数表示 + 表示件数選択        │ │
│             │ └─────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────┘
```

#### モバイル版レイアウト（カード表示）
```
┌─────────────────────────────────────┐
│ ヘッダー (ハンバーガーメニュー)       │
├─────────────────────────────────────┤
│ メインコンテンツ                     │
│ ┌─────────────────────────────────┐   │
│ │ 検索バー + フィルタアイコン      │   │
│ ├─────────────────────────────────┤   │
│ │ 技術者カード表示エリア           │   │
│ │ ┌─────────────────────────────┐ │   │
│ │ │ 📷 田中太郎 [稼働中]         │ │   │
│ │ │ Java, Spring Boot (上級)    │ │   │
│ │ │ 経験8年 | 稼働率: 80%       │ │   │
│ │ │ 🌐 リモート対応             │ │   │
│ │ │ [詳細] [スキルシート]       │ │   │
│ │ └─────────────────────────────┘ │   │
│ │ ┌─────────────────────────────┐ │   │
│ │ │ 📷 佐藤花子 [待機中]         │ │   │
│ │ │ React, TypeScript (中級)    │ │   │
│ │ │ 経験5年 | 次回: 7/1参画可能  │ │   │
│ │ │ 🏢 オフィス勤務             │ │   │
│ │ │ [詳細] [スキルシート]       │ │   │
│ │ └─────────────────────────────┘ │   │
│ ├─────────────────────────────────┤   │
│ │ 無限スクロール or ページング    │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 1.4 スキル・ステータス表示

#### 稼働状況バッジ
| 稼働状況 | バッジ色 | 表示文言 | アイコン |
|----------|----------|----------|----------|
| AVAILABLE | success | 待機中 | ⭕ |
| BUSY | danger | 稼働中 | 🔴 |
| PARTIALLY_AVAILABLE | warning | 部分稼働可能 | 🟡 |
| UNAVAILABLE | secondary | 稼働不可 | ⚫ |

#### スキルレベルバッジ
| レベル | バッジ色 | 表示文言 | 経験年数目安 |
|--------|----------|----------|--------------|
| BEGINNER | info | 初級 | 0-2年 |
| INTERMEDIATE | primary | 中級 | 2-5年 |
| ADVANCED | warning | 上級 | 5-10年 |
| EXPERT | success | エキスパート | 10年以上 |

### 1.5 高度検索・フィルタ機能

#### フィルタエリア設計
```html
<div class="advanced-search-area" id="searchArea">
  <div class="row g-3">
    <!-- キーワード検索 -->
    <div class="col-md-3">
      <label class="form-label">キーワード検索</label>
      <div class="input-group">
        <input type="text" class="form-control" placeholder="名前・スキル・会社名"
               id="keywordSearch" name="keyword">
        <button class="btn btn-outline-secondary" type="button">
          <i class="bi bi-search"></i>
        </button>
      </div>
    </div>
    
    <!-- スキルカテゴリ -->
    <div class="col-md-3">
      <label class="form-label">スキルカテゴリ</label>
      <select class="form-select" name="skillCategory" id="skillCategory">
        <option value="">全カテゴリ</option>
        <option value="PROGRAMMING">プログラミング言語</option>
        <option value="FRAMEWORK">フレームワーク</option>
        <option value="DATABASE">データベース</option>
        <option value="INFRASTRUCTURE">インフラ</option>
        <option value="CLOUD">クラウド</option>
        <option value="FRONTEND">フロントエンド</option>
        <option value="MOBILE">モバイル</option>
      </select>
    </div>
    
    <!-- 経験年数範囲 -->
    <div class="col-md-2">
      <label class="form-label">経験年数</label>
      <div class="d-flex gap-1 align-items-center">
        <input type="number" class="form-control" placeholder="最小" 
               name="minExperience" min="0" max="50">
        <span>-</span>
        <input type="number" class="form-control" placeholder="最大" 
               name="maxExperience" min="0" max="50">
        <span>年</span>
      </div>
    </div>
    
    <!-- 稼働状況 -->
    <div class="col-md-2">
      <label class="form-label">稼働状況</label>
      <select class="form-select" name="workStatus">
        <option value="">全状況</option>
        <option value="AVAILABLE">待機中</option>
        <option value="BUSY">稼働中</option>
        <option value="PARTIALLY_AVAILABLE">部分稼働可能</option>
        <option value="UNAVAILABLE">稼働不可</option>
      </select>
    </div>
    
    <!-- 検索・リセットボタン -->
    <div class="col-md-2">
      <label class="form-label">&nbsp;</label>
      <div class="d-flex gap-2">
        <button type="button" class="btn btn-primary" onclick="performSearch()">
          検索
        </button>
        <button type="button" class="btn btn-outline-secondary" onclick="resetSearch()">
          リセット
        </button>
      </div>
    </div>
  </div>
  
  <!-- 詳細フィルタ切り替え -->
  <div class="mt-3">
    <button class="btn btn-link btn-sm" type="button" data-bs-toggle="collapse" 
            data-bs-target="#advancedFilters">
      <i class="bi bi-chevron-down"></i> 詳細フィルタ
    </button>
  </div>
  
  <!-- 詳細フィルタ（折りたたみ） -->
  <div class="collapse" id="advancedFilters">
    <div class="row g-3 mt-2">
      <div class="col-md-3">
        <label class="form-label">勤務地</label>
        <select class="form-select" name="location">
          <option value="">指定なし</option>
          <option value="東京">東京</option>
          <option value="大阪">大阪</option>
          <option value="名古屋">名古屋</option>
          <option value="福岡">福岡</option>
        </select>
      </div>
      
      <div class="col-md-3">
        <label class="form-label">リモート対応</label>
        <select class="form-select" name="remoteCapable">
          <option value="">指定なし</option>
          <option value="true">対応可能</option>
          <option value="false">対応不可</option>
        </select>
      </div>
      
      <div class="col-md-3">
        <label class="form-label">参画可能日</label>
        <input type="date" class="form-control" name="availableFrom">
      </div>
      
      <div class="col-md-3">
        <label class="form-label">雇用形態</label>
        <select class="form-select" name="employmentType">
          <option value="">全形態</option>
          <option value="FULL_TIME">正社員</option>
          <option value="CONTRACT">契約社員</option>
          <option value="FREELANCE">フリーランス</option>
        </select>
      </div>
    </div>
  </div>
</div>
```

### 1.6 API連携・検索機能

#### 検索API呼び出し
```javascript
// 技術者検索API
const searchEngineers = async (searchParams) => {
  const queryParams = new URLSearchParams({
    page: searchParams.page || 0,
    size: searchParams.size || 20,
    sort: searchParams.sort || 'name,asc',
    keyword: searchParams.keyword || '',
    skillCategory: searchParams.skillCategory || '',
    minExperience: searchParams.minExperience || '',
    maxExperience: searchParams.maxExperience || '',
    workStatus: searchParams.workStatus || '',
    location: searchParams.location || '',
    remoteCapable: searchParams.remoteCapable || '',
    availableFrom: searchParams.availableFrom || ''
  });
  
  const response = await fetch(`/api/engineers?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('技術者検索に失敗しました');
  }
  
  return response.json();
};

// 検索実行関数
const performSearch = async () => {
  const searchForm = document.getElementById('searchArea');
  const formData = new FormData(searchForm);
  const searchParams = Object.fromEntries(formData.entries());
  
  showLoading('#engineerList');
  
  try {
    const result = await searchEngineers(searchParams);
    renderEngineerList(result.content);
    updatePagination(result.page);
  } catch (error) {
    showErrorMessage('検索中にエラーが発生しました: ' + error.message);
  } finally {
    hideLoading('#engineerList');
  }
};

// オートコンプリート機能（スキル検索）
const setupSkillAutocomplete = () => {
  const keywordInput = document.getElementById('keywordSearch');
  let timeout;
  
  keywordInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      const keyword = e.target.value;
      if (keyword.length >= 2) {
        const suggestions = await fetchSkillSuggestions(keyword);
        showAutocompleteDropdown(suggestions, keywordInput);
      }
    }, 300);
  });
};

// スキル候補取得
const fetchSkillSuggestions = async (keyword) => {
  const response = await fetch(`/api/skills/suggestions?q=${encodeURIComponent(keyword)}`);
  return response.json();
};
```

---

## 👤 2. 技術者詳細画面

### 2.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | ENG-002 |
| **画面名** | 技術者詳細画面 |
| **URL** | `/engineers/{id}` |
| **アクセス権限** | 営業担当、PM、技術マネージャー、管理者 |
| **表示方式** | タブ形式詳細表示 |

### 2.2 機能要件

#### 主要機能
1. **プロフィール表示**
   - 基本情報・連絡先
   - プロフィール写真
   - 稼働状況・可用性

2. **スキル詳細表示**
   - スキルレーダーチャート
   - スキル別経験年数
   - 資格・認定情報

3. **経歴・実績表示**
   - プロジェクト経歴
   - 担当業務詳細
   - 評価・フィードバック

4. **操作機能**
   - 編集（権限に応じて）
   - スキルシート出力
   - マッチング候補表示
   - 連絡・メール送信

#### タブ構成
1. **プロフィールタブ**
2. **スキル詳細タブ**
3. **プロジェクト経歴タブ**
4. **評価・フィードバックタブ**
5. **稼働履歴タブ**

### 2.3 プロフィールタブ

#### レイアウト設計
```html
<div class="tab-pane active" id="profile-tab">
  <div class="row">
    <!-- 左カラム: 基本情報 -->
    <div class="col-md-8">
      <div class="card">
        <div class="card-header">
          <h5><i class="bi bi-person"></i> 基本情報</h5>
          <button class="btn btn-sm btn-outline-primary" onclick="editProfile()">
            <i class="bi bi-pencil"></i> 編集
          </button>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <table class="table table-borderless">
                <tr>
                  <th width="120">氏名</th>
                  <td id="fullName">田中太郎</td>
                </tr>
                <tr>
                  <th>フリガナ</th>
                  <td id="nameKana">タナカ タロウ</td>
                </tr>
                <tr>
                  <th>社員番号</th>
                  <td id="employeeNumber">EMP-2025-001</td>
                </tr>
                <tr>
                  <th>メールアドレス</th>
                  <td>
                    <a href="mailto:tanaka@company.com" id="email">
                      tanaka@company.com
                    </a>
                  </td>
                </tr>
                <tr>
                  <th>電話番号</th>
                  <td id="phoneNumber">090-1234-5678</td>
                </tr>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-borderless">
                <tr>
                  <th width="120">所属</th>
                  <td id="department">開発部</td>
                </tr>
                <tr>
                  <th>役職</th>
                  <td id="position">シニアエンジニア</td>
                </tr>
                <tr>
                  <th>雇用形態</th>
                  <td>
                    <span class="badge bg-primary" id="employmentType">正社員</span>
                  </td>
                </tr>
                <tr>
                  <th>入社日</th>
                  <td id="joinDate">2020/04/01</td>
                </tr>
                <tr>
                  <th>総経験年数</th>
                  <td>
                    <strong id="totalExperience">8年</strong>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 希望条件・特記事項 -->
      <div class="card mt-3">
        <div class="card-header">
          <h5><i class="bi bi-star"></i> 希望条件・特記事項</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6>勤務地</h6>
              <p id="preferredLocation">東京・神奈川（リモート併用希望）</p>
              
              <h6>稼働時間</h6>
              <p id="workingHours">フルタイム（月140-180時間）</p>
            </div>
            <div class="col-md-6">
              <h6>希望単価</h6>
              <p id="preferredRate">¥800,000 - ¥1,000,000 / 月</p>
              
              <h6>その他条件</h6>
              <p id="additionalConditions">新技術習得機会のあるプロジェクト希望</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右カラム: ステータス・画像 -->
    <div class="col-md-4">
      <!-- プロフィール画像 -->
      <div class="card">
        <div class="card-body text-center">
          <img src="/api/engineers/profile-image/123" 
               class="rounded-circle mb-3" 
               width="150" height="150" 
               alt="プロフィール画像"
               id="profileImage">
          <br>
          <button class="btn btn-sm btn-outline-secondary" onclick="changeProfileImage()">
            画像変更
          </button>
        </div>
      </div>
      
      <!-- 現在の稼働状況 -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-activity"></i> 稼働状況</h6>
        </div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>ステータス</span>
            <span class="badge bg-success" id="workStatusBadge">待機中</span>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>稼働率</span>
            <span id="currentUtilization">0%</span>
          </div>
          
          <div class="progress mb-3" style="height: 8px;">
            <div class="progress-bar" role="progressbar" style="width: 0%" 
                 id="utilizationProgress"></div>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>参画可能日</span>
            <span id="availableFrom">即日</span>
          </div>
          
          <div class="d-flex justify-content-between align-items-center">
            <span>リモート対応</span>
            <span id="remoteCapable">
              <i class="bi bi-check-circle text-success"></i> 対応可
            </span>
          </div>
          
          <hr>
          
          <button class="btn btn-primary btn-sm w-100" onclick="updateWorkStatus()">
            <i class="bi bi-pencil"></i> ステータス更新
          </button>
        </div>
      </div>
      
      <!-- クイックアクション -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-lightning"></i> クイックアクション</h6>
        </div>
        <div class="card-body">
          <div class="d-grid gap-2">
            <button class="btn btn-outline-primary btn-sm" onclick="generateSkillSheet()">
              <i class="bi bi-file-text"></i> スキルシート出力
            </button>
            <button class="btn btn-outline-info btn-sm" onclick="findMatchingProjects()">
              <i class="bi bi-search"></i> マッチング案件検索
            </button>
            <button class="btn btn-outline-success btn-sm" onclick="sendEmail()">
              <i class="bi bi-envelope"></i> メール送信
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 2.4 スキル詳細タブ

#### スキルレーダーチャート
```html
<div class="tab-pane" id="skills-tab">
  <div class="row">
    <!-- スキルレーダーチャート -->
    <div class="col-md-6">
      <div class="card">
        <div class="card-header">
          <h5><i class="bi bi-graph-up"></i> スキルレーダーチャート</h5>
        </div>
        <div class="card-body">
          <canvas id="skillRadarChart" width="400" height="400"></canvas>
        </div>
      </div>
    </div>
    
    <!-- スキルカテゴリ別詳細 -->
    <div class="col-md-6">
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5><i class="bi bi-list-ul"></i> スキル詳細</h5>
          <button class="btn btn-sm btn-outline-primary" onclick="editSkills()">
            <i class="bi bi-pencil"></i> 編集
          </button>
        </div>
        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
          <div class="skill-category" data-category="programming">
            <h6 class="text-primary">
              <i class="bi bi-code-slash"></i> プログラミング言語
            </h6>
            <div class="skill-items">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Java</span>
                <div>
                  <span class="badge bg-warning">上級</span>
                  <small class="text-muted">8年</small>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>JavaScript</span>
                <div>
                  <span class="badge bg-primary">中級</span>
                  <small class="text-muted">5年</small>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Python</span>
                <div>
                  <span class="badge bg-info">初級</span>
                  <small class="text-muted">2年</small>
                </div>
              </div>
            </div>
          </div>
          
          <hr>
          
          <div class="skill-category" data-category="framework">
            <h6 class="text-success">
              <i class="bi bi-layers"></i> フレームワーク
            </h6>
            <div class="skill-items">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Spring Boot</span>
                <div>
                  <span class="badge bg-warning">上級</span>
                  <small class="text-muted">6年</small>
                </div>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>React</span>
                <div>
                  <span class="badge bg-primary">中級</span>
                  <small class="text-muted">3年</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 他のスキルカテゴリ... -->
        </div>
      </div>
    </div>
  </div>
  
  <!-- 資格・認定情報 -->
  <div class="row mt-3">
    <div class="col-12">
      <div class="card">
        <div class="card-header">
          <h5><i class="bi bi-award"></i> 資格・認定</h5>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <h6>IT系資格</h6>
              <ul class="list-unstyled">
                <li>
                  <i class="bi bi-check-circle text-success"></i>
                  基本情報技術者試験 (2018年取得)
                </li>
                <li>
                  <i class="bi bi-check-circle text-success"></i>
                  応用情報技術者試験 (2020年取得)
                </li>
                <li>
                  <i class="bi bi-check-circle text-success"></i>
                  AWS Solutions Architect Associate (2022年取得)
                </li>
              </ul>
            </div>
            <div class="col-md-6">
              <h6>ベンダー認定</h6>
              <ul class="list-unstyled">
                <li>
                  <i class="bi bi-check-circle text-success"></i>
                  Oracle Certified Java Programmer Gold (2021年取得)
                </li>
                <li>
                  <i class="bi bi-check-circle text-success"></i>
                  Microsoft Azure Fundamentals (2023年取得)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### Chart.js レーダーチャート実装
```javascript
// スキルレーダーチャート生成
const createSkillRadarChart = (skillData) => {
  const ctx = document.getElementById('skillRadarChart').getContext('2d');
  
  const chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: [
        'プログラミング言語',
        'フレームワーク',
        'データベース',
        'インフラ',
        'クラウド',
        'フロントエンド',
        'テスト・品質',
        'プロジェクト管理'
      ],
      datasets: [{
        label: 'スキルレベル',
        data: skillData.levels, // [4, 3, 3, 2, 3, 3, 2, 2] (1-5スケール)
        backgroundColor: 'rgba(13, 110, 253, 0.2)',
        borderColor: 'rgba(13, 110, 253, 1)',
        pointBackgroundColor: 'rgba(13, 110, 253, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(13, 110, 253, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1,
            callback: function(value) {
              const levels = ['', '初級', '中級下', '中級', '上級', 'エキスパート'];
              return levels[value];
            }
          },
          pointLabels: {
            font: {
              size: 12
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const levels = ['', '初級', '中級下', '中級', '上級', 'エキスパート'];
              return `${context.label}: ${levels[context.raw]}`;
            }
          }
        }
      }
    }
  });
  
  return chart;
};

// スキルデータ取得・チャート更新
const loadSkillChart = async (engineerId) => {
  try {
    const response = await fetch(`/api/engineers/${engineerId}/skills/summary`);
    const skillData = await response.json();
    
    createSkillRadarChart(skillData);
  } catch (error) {
    console.error('スキルデータの読み込みに失敗:', error);
    showErrorMessage('スキルデータの読み込みに失敗しました');
  }
};
```

---

## ➕ 3. 技術者新規登録・編集画面

### 3.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | ENG-003 |
| **画面名** | 技術者新規登録・編集画面 |
| **URL** | `/engineers/new`, `/engineers/{id}/edit` |
| **アクセス権限** | HR、技術マネージャー、管理者 |
| **表示方式** | ステップ形式フォーム |

### 3.2 ステップ構成

1. **Step 1: 基本情報入力**
2. **Step 2: スキル・経験入力**
3. **Step 3: 希望条件入力**
4. **Step 4: 確認・保存**

### 3.3 Step 2: スキル・経験入力

#### スキル入力UI
```html
<div class="wizard-step" data-step="2">
  <div class="step-header">
    <h4>スキル・経験を入力してください</h4>
    <div class="progress">
      <div class="progress-bar" style="width: 50%"></div>
    </div>
  </div>
  
  <div class="row">
    <!-- スキル入力エリア -->
    <div class="col-md-8">
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <h5>スキル詳細</h5>
          <button type="button" class="btn btn-sm btn-primary" onclick="addSkillModal()">
            <i class="bi bi-plus"></i> スキル追加
          </button>
        </div>
        <div class="card-body">
          <div id="skillsList">
            <!-- 動的に生成されるスキル項目 -->
            <div class="skill-item border rounded p-3 mb-3" data-skill-id="java">
              <div class="row align-items-center">
                <div class="col-md-3">
                  <strong>Java</strong>
                  <br><small class="text-muted">プログラミング言語</small>
                </div>
                <div class="col-md-2">
                  <label class="form-label">経験年数</label>
                  <input type="number" class="form-control" name="skills[java][years]" 
                         value="8" min="0" max="50">
                </div>
                <div class="col-md-3">
                  <label class="form-label">レベル</label>
                  <select class="form-select" name="skills[java][level]">
                    <option value="BEGINNER">初級</option>
                    <option value="INTERMEDIATE">中級</option>
                    <option value="ADVANCED" selected>上級</option>
                    <option value="EXPERT">エキスパート</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label">最終使用</label>
                  <input type="date" class="form-control" name="skills[java][lastUsed]" 
                         value="2025-05-01">
                </div>
                <div class="col-md-1">
                  <button type="button" class="btn btn-sm btn-outline-danger" 
                          onclick="removeSkill('java')">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              
              <!-- 詳細説明（オプション） -->
              <div class="mt-2">
                <label class="form-label">詳細・実績</label>
                <textarea class="form-control" name="skills[java][description]" rows="2" 
                          placeholder="具体的な使用経験、作成したシステム等">Spring Boot を使用したWebアプリケーション開発、REST API設計・実装</textarea>
              </div>
            </div>
            
            <!-- 他のスキル項目... -->
          </div>
        </div>
      </div>
    </div>
    
    <!-- スキル統計・プレビュー -->
    <div class="col-md-4">
      <div class="card">
        <div class="card-header">
          <h6>スキル統計</h6>
        </div>
        <div class="card-body">
          <div class="text-center mb-3">
            <canvas id="skillPreviewChart" width="200" height="200"></canvas>
          </div>
          
          <div class="skill-summary">
            <div class="d-flex justify-content-between mb-2">
              <span>登録スキル数</span>
              <span class="badge bg-primary" id="totalSkills">12</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>上級以上</span>
              <span class="badge bg-success" id="advancedSkills">5</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span>平均経験年数</span>
              <span id="avgExperience">4.2年</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 推奨スキル -->
      <div class="card mt-3">
        <div class="card-header">
          <h6>追加推奨スキル</h6>
        </div>
        <div class="card-body">
          <div class="d-flex flex-wrap gap-1">
            <button type="button" class="btn btn-outline-secondary btn-sm" 
                    onclick="addRecommendedSkill('Spring Security')">
              + Spring Security
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" 
                    onclick="addRecommendedSkill('JUnit')">
              + JUnit
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" 
                    onclick="addRecommendedSkill('Maven')">
              + Maven
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="wizard-actions mt-4">
    <button type="button" class="btn btn-outline-secondary" onclick="previousStep()">戻る</button>
    <button type="button" class="btn btn-primary" onclick="nextStep()">次へ</button>
  </div>
</div>

<!-- スキル追加モーダル -->
<div class="modal fade" id="addSkillModal">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">スキル追加</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label">スキルカテゴリ</label>
          <select class="form-select" id="newSkillCategory" onchange="loadSkillsByCategory()">
            <option value="">選択してください</option>
            <option value="PROGRAMMING">プログラミング言語</option>
            <option value="FRAMEWORK">フレームワーク</option>
            <option value="DATABASE">データベース</option>
            <option value="INFRASTRUCTURE">インフラ</option>
            <option value="CLOUD">クラウド</option>
          </select>
        </div>
        
        <div class="mb-3">
          <label class="form-label">スキル名</label>
          <select class="form-select" id="newSkillName">
            <option value="">カテゴリを選択してください</option>
          </select>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <label class="form-label">経験年数</label>
            <input type="number" class="form-control" id="newSkillYears" 
                   min="0" max="50" step="0.5">
          </div>
          <div class="col-md-6">
            <label class="form-label">レベル</label>
            <select class="form-select" id="newSkillLevel">
              <option value="BEGINNER">初級</option>
              <option value="INTERMEDIATE">中級</option>
              <option value="ADVANCED">上級</option>
              <option value="EXPERT">エキスパート</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
        <button type="button" class="btn btn-primary" onclick="confirmAddSkill()">追加</button>
      </div>
    </div>
  </div>
</div>
```

### 3.4 スキル管理JavaScript

```javascript
// スキル管理クラス
class SkillManager {
  constructor() {
    this.skills = new Map();
    this.skillMasterData = null;
    this.previewChart = null;
  }
  
  // スキルマスタデータ読み込み
  async loadSkillMasterData() {
    try {
      const response = await fetch('/api/skills/master');
      this.skillMasterData = await response.json();
    } catch (error) {
      console.error('スキルマスタの読み込みに失敗:', error);
    }
  }
  
  // カテゴリ別スキル読み込み
  loadSkillsByCategory() {
    const category = document.getElementById('newSkillCategory').value;
    const skillSelect = document.getElementById('newSkillName');
    
    // オプションクリア
    skillSelect.innerHTML = '<option value="">選択してください</option>';
    
    if (category && this.skillMasterData) {
      const skills = this.skillMasterData[category] || [];
      skills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill.id;
        option.textContent = skill.name;
        skillSelect.appendChild(option);
      });
    }
  }
  
  // スキル追加
  addSkill(skillData) {
    const skillId = skillData.id;
    
    // 重複チェック
    if (this.skills.has(skillId)) {
      showWarningMessage('このスキルは既に登録されています');
      return false;
    }
    
    // バリデーション
    if (!this.validateSkillData(skillData)) {
      return false;
    }
    
    // スキル追加
    this.skills.set(skillId, skillData);
    this.renderSkillItem(skillData);
    this.updateSkillStatistics();
    this.updatePreviewChart();
    
    return true;
  }
  
  // スキル削除
  removeSkill(skillId) {
    if (this.skills.has(skillId)) {
      this.skills.delete(skillId);
      document.querySelector(`[data-skill-id="${skillId}"]`).remove();
      this.updateSkillStatistics();
      this.updatePreviewChart();
    }
  }
  
  // スキルデータバリデーション
  validateSkillData(skillData) {
    if (!skillData.name || skillData.name.trim() === '') {
      showErrorMessage('スキル名は必須です');
      return false;
    }
    
    if (skillData.years < 0 || skillData.years > 50) {
      showErrorMessage('経験年数は0-50年の範囲で入力してください');
      return false;
    }
    
    // レベルと経験年数の整合性チェック
    const levelYearsMap = {
      'BEGINNER': { min: 0, max: 2 },
      'INTERMEDIATE': { min: 1, max: 5 },
      'ADVANCED': { min: 3, max: 15 },
      'EXPERT': { min: 8, max: 50 }
    };
    
    const levelRange = levelYearsMap[skillData.level];
    if (skillData.years < levelRange.min || skillData.years > levelRange.max) {
      showWarningMessage(
        `${skillData.level}レベルの推奨経験年数は${levelRange.min}-${levelRange.max}年です`
      );
    }
    
    return true;
  }
  
  // スキル項目レンダリング
  renderSkillItem(skillData) {
    const template = `
      <div class="skill-item border rounded p-3 mb-3" data-skill-id="${skillData.id}">
        <div class="row align-items-center">
          <div class="col-md-3">
            <strong>${skillData.name}</strong>
            <br><small class="text-muted">${skillData.category}</small>
          </div>
          <div class="col-md-2">
            <label class="form-label">経験年数</label>
            <input type="number" class="form-control" name="skills[${skillData.id}][years]" 
                   value="${skillData.years}" min="0" max="50" 
                   onchange="skillManager.updateSkillYears('${skillData.id}', this.value)">
          </div>
          <div class="col-md-3">
            <label class="form-label">レベル</label>
            <select class="form-select" name="skills[${skillData.id}][level]"
                    onchange="skillManager.updateSkillLevel('${skillData.id}', this.value)">
              <option value="BEGINNER" ${skillData.level === 'BEGINNER' ? 'selected' : ''}>初級</option>
              <option value="INTERMEDIATE" ${skillData.level === 'INTERMEDIATE' ? 'selected' : ''}>中級</option>
              <option value="ADVANCED" ${skillData.level === 'ADVANCED' ? 'selected' : ''}>上級</option>
              <option value="EXPERT" ${skillData.level === 'EXPERT' ? 'selected' : ''}>エキスパート</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">最終使用</label>
            <input type="date" class="form-control" name="skills[${skillData.id}][lastUsed]" 
                   value="${skillData.lastUsed || ''}"
                   onchange="skillManager.updateSkillLastUsed('${skillData.id}', this.value)">
          </div>
          <div class="col-md-1">
            <button type="button" class="btn btn-sm btn-outline-danger" 
                    onclick="skillManager.removeSkill('${skillData.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="mt-2">
          <label class="form-label">詳細・実績</label>
          <textarea class="form-control" name="skills[${skillData.id}][description]" rows="2" 
                    placeholder="具体的な使用経験、作成したシステム等"
                    onchange="skillManager.updateSkillDescription('${skillData.id}', this.value)">${skillData.description || ''}</textarea>
        </div>
      </div>
    `;
    
    document.getElementById('skillsList').insertAdjacentHTML('beforeend', template);
  }
  
  // スキル統計更新
  updateSkillStatistics() {
    const totalSkills = this.skills.size;
    const advancedSkills = Array.from(this.skills.values())
      .filter(skill => ['ADVANCED', 'EXPERT'].includes(skill.level)).length;
    
    const avgExperience = totalSkills > 0 
      ? (Array.from(this.skills.values())
          .reduce((sum, skill) => sum + skill.years, 0) / totalSkills).toFixed(1)
      : 0;
    
    document.getElementById('totalSkills').textContent = totalSkills;
    document.getElementById('advancedSkills').textContent = advancedSkills;
    document.getElementById('avgExperience').textContent = avgExperience + '年';
  }
  
  // プレビューチャート更新
  updatePreviewChart() {
    const skillCategories = this.groupSkillsByCategory();
    const ctx = document.getElementById('skillPreviewChart').getContext('2d');
    
    if (this.previewChart) {
      this.previewChart.destroy();
    }
    
    this.previewChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(skillCategories),
        datasets: [{
          data: Object.values(skillCategories),
          backgroundColor: [
            '#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { size: 10 }
            }
          }
        }
      }
    });
  }
  
  // カテゴリ別スキルグループ化
  groupSkillsByCategory() {
    const categories = {};
    
    this.skills.forEach(skill => {
      const category = skill.category || 'その他';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }
}

// グローバルインスタンス
const skillManager = new SkillManager();

// スキル追加モーダル関連
const addSkillModal = () => {
  const modal = new bootstrap.Modal(document.getElementById('addSkillModal'));
  modal.show();
};

const confirmAddSkill = () => {
  const skillData = {
    id: document.getElementById('newSkillName').value,
    name: document.getElementById('newSkillName').selectedOptions[0].text,
    category: document.getElementById('newSkillCategory').selectedOptions[0].text,
    years: parseFloat(document.getElementById('newSkillYears').value) || 0,
    level: document.getElementById('newSkillLevel').value,
    lastUsed: null,
    description: ''
  };
  
  if (skillManager.addSkill(skillData)) {
    bootstrap.Modal.getInstance(document.getElementById('addSkillModal')).hide();
    
    // フォームリセット
    document.getElementById('newSkillCategory').value = '';
    document.getElementById('newSkillName').innerHTML = '<option value="">カテゴリを選択してください</option>';
    document.getElementById('newSkillYears').value = '';
    document.getElementById('newSkillLevel').value = 'INTERMEDIATE';
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  skillManager.loadSkillMasterData();
});
```

---

## 📊 4. スキルマトリックス評価画面

### 4.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | ENG-004 |
| **画面名** | スキルマトリックス評価画面 |
| **URL** | `/engineers/skills/matrix` |
| **アクセス権限** | 技術マネージャー、管理者 |
| **表示方式** | マトリックス表示 |

### 4.2 機能要件

#### 主要機能
1. **スキルマトリックス表示**
   - 技術者×スキルのマトリックス表形式
   - ヒートマップによる視覚化
   - フィルタリング・ソート機能

2. **評価機能**
   - 一括評価・個別評価
   - 評価履歴管理
   - コメント・フィードバック

3. **分析機能**
   - スキルギャップ分析
   - チーム全体のスキル分布
   - 育成計画立案支援

### 4.3 マトリックス表示

```html
<div class="skills-matrix-container">
  <!-- フィルタ・操作エリア -->
  <div class="matrix-controls mb-4">
    <div class="row align-items-center">
      <div class="col-md-3">
        <select class="form-select" id="departmentFilter" onchange="filterMatrix()">
          <option value="">全部署</option>
          <option value="development">開発部</option>
          <option value="infrastructure">インフラ部</option>
          <option value="qa">QA部</option>
        </select>
      </div>
      <div class="col-md-3">
        <select class="form-select" id="skillCategoryFilter" onchange="filterMatrix()">
          <option value="">全スキルカテゴリ</option>
          <option value="PROGRAMMING">プログラミング言語</option>
          <option value="FRAMEWORK">フレームワーク</option>
          <option value="DATABASE">データベース</option>
          <option value="INFRASTRUCTURE">インフラ</option>
        </select>
      </div>
      <div class="col-md-3">
        <select class="form-select" id="experienceFilter" onchange="filterMatrix()">
          <option value="">全経験レベル</option>
          <option value="0-2">0-2年</option>
          <option value="3-5">3-5年</option>
          <option value="6-10">6-10年</option>
          <option value="10+">10年以上</option>
        </select>
      </div>
      <div class="col-md-3">
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-outline-primary" onclick="exportMatrix()">
            <i class="bi bi-download"></i> エクスポート
          </button>
          <button type="button" class="btn btn-outline-success" onclick="bulkEvaluationModal()">
            <i class="bi bi-check-all"></i> 一括評価
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- マトリックス表示エリア -->
  <div class="matrix-table-wrapper">
    <div class="table-responsive" style="max-height: 600px;">
      <table class="table table-sm table-bordered skills-matrix-table" id="skillsMatrix">
        <thead class="sticky-top bg-light">
          <tr>
            <th class="engineer-name-col sticky-left">技術者名</th>
            <th class="skill-col text-center">Java</th>
            <th class="skill-col text-center">JavaScript</th>
            <th class="skill-col text-center">Python</th>
            <th class="skill-col text-center">Spring Boot</th>
            <th class="skill-col text-center">React</th>
            <th class="skill-col text-center">PostgreSQL</th>
            <th class="skill-col text-center">AWS</th>
            <th class="skill-col text-center">Docker</th>
            <!-- 動的生成されるスキル列 -->
          </tr>
        </thead>
        <tbody>
          <tr data-engineer-id="eng-001">
            <td class="engineer-name sticky-left">
              <div class="d-flex align-items-center">
                <img src="/api/engineers/avatar/eng-001" class="rounded-circle me-2" 
                     width="24" height="24" alt="田中太郎">
                <span>田中太郎</span>
              </div>
            </td>
            <td class="skill-cell text-center" data-skill="java" data-level="4">
              <div class="skill-level-indicator level-4" 
                   onclick="editSkillLevel('eng-001', 'java', 4)"
                   title="上級 (8年)">
                4
              </div>
            </td>
            <td class="skill-cell text-center" data-skill="javascript" data-level="3">
              <div class="skill-level-indicator level-3" 
                   onclick="editSkillLevel('eng-001', 'javascript', 3)"
                   title="中級 (5年)">
                3
              </div>
            </td>
            <td class="skill-cell text-center" data-skill="python" data-level="2">
              <div class="skill-level-indicator level-2" 
                   onclick="editSkillLevel('eng-001', 'python', 2)"
                   title="初級 (2年)">
                2
              </div>
            </td>
            <!-- 他のスキル列... -->
          </tr>
          
          <tr data-engineer-id="eng-002">
            <td class="engineer-name sticky-left">
              <div class="d-flex align-items-center">
                <img src="/api/engineers/avatar/eng-002" class="rounded-circle me-2" 
                     width="24" height="24" alt="佐藤花子">
                <span>佐藤花子</span>
              </div>
            </td>
            <!-- スキルレベル表示... -->
          </tr>
          
          <!-- 他の技術者行... -->
        </tbody>
      </table>
    </div>
  </div>
  
  <!-- 統計・分析エリア -->
  <div class="row mt-4">
    <div class="col-md-8">
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-graph-up"></i> スキル分布分析</h6>
        </div>
        <div class="card-body">
          <canvas id="skillDistributionChart" height="100"></canvas>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-exclamation-triangle"></i> スキルギャップ</h6>
        </div>
        <div class="card-body">
          <div class="skill-gap-item mb-3">
            <div class="d-flex justify-content-between">
              <span>React</span>
              <span class="text-danger">不足</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar bg-danger" style="width: 30%"></div>
            </div>
            <small class="text-muted">必要: 5名, 現在: 2名</small>
          </div>
          
          <div class="skill-gap-item mb-3">
            <div class="d-flex justify-content-between">
              <span>AWS</span>
              <span class="text-warning">やや不足</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar bg-warning" style="width: 60%"></div>
            </div>
            <small class="text-muted">必要: 4名, 現在: 3名</small>
          </div>
          
          <div class="skill-gap-item mb-3">
            <div class="d-flex justify-content-between">
              <span>Java</span>
              <span class="text-success">充足</span>
            </div>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar bg-success" style="width: 100%"></div>
            </div>
            <small class="text-muted">必要: 6名, 現在: 8名</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 4.4 マトリックス機能実装

```javascript
// スキルマトリックス管理クラス
class SkillMatrix {
  constructor() {
    this.matrix = new Map();
    this.engineers = [];
    this.skills = [];
    this.filters = {
      department: '',
      skillCategory: '',
      experience: ''
    };
  }
  
  // マトリックスデータ読み込み
  async loadMatrix() {
    try {
      const response = await fetch('/api/engineers/skills/matrix');
      const data = await response.json();
      
      this.engineers = data.engineers;
      this.skills = data.skills;
      this.matrix = new Map(data.matrix);
      
      this.renderMatrix();
      this.updateStatistics();
    } catch (error) {
      console.error('マトリックスデータの読み込みに失敗:', error);
      showErrorMessage('データの読み込みに失敗しました');
    }
  }
  
  // マトリックステーブル描画
  renderMatrix() {
    const table = document.getElementById('skillsMatrix');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');
    
    // ヘッダー生成（スキル列）
    thead.innerHTML = '<th class="engineer-name-col sticky-left">技術者名</th>';
    this.skills.forEach(skill => {
      if (this.shouldShowSkill(skill)) {
        thead.innerHTML += `
          <th class="skill-col text-center" data-skill="${skill.id}">
            <div class="skill-header">
              <span class="skill-name">${skill.name}</span>
              <br><small class="skill-category">${skill.category}</small>
            </div>
          </th>
        `;
      }
    });
    
    // ボディ生成（技術者行）
    tbody.innerHTML = '';
    this.engineers.forEach(engineer => {
      if (this.shouldShowEngineer(engineer)) {
        const row = this.createEngineerRow(engineer);
        tbody.appendChild(row);
      }
    });
  }
  
  // 技術者行作成
  createEngineerRow(engineer) {
    const row = document.createElement('tr');
    row.dataset.engineerId = engineer.id;
    
    // 技術者名列
    row.innerHTML = `
      <td class="engineer-name sticky-left">
        <div class="d-flex align-items-center">
          <img src="${engineer.avatarUrl || '/default-avatar.png'}" 
               class="rounded-circle me-2" width="24" height="24" alt="${engineer.name}">
          <span>${engineer.name}</span>
        </div>
      </td>
    `;
    
    // スキル列
    this.skills.forEach(skill => {
      if (this.shouldShowSkill(skill)) {
        const skillLevel = this.getSkillLevel(engineer.id, skill.id);
        const cell = this.createSkillCell(engineer.id, skill.id, skillLevel);
        row.appendChild(cell);
      }
    });
    
    return row;
  }
  
  // スキルセル作成
  createSkillCell(engineerId, skillId, level) {
    const cell = document.createElement('td');
    cell.className = 'skill-cell text-center';
    cell.dataset.skill = skillId;
    cell.dataset.level = level;
    
    if (level > 0) {
      const skillData = this.getSkillData(engineerId, skillId);
      cell.innerHTML = `
        <div class="skill-level-indicator level-${level}" 
             onclick="skillMatrix.editSkillLevel('${engineerId}', '${skillId}', ${level})"
             title="${this.getLevelText(level)} (${skillData.years}年)">
          ${level}
        </div>
      `;
    } else {
      cell.innerHTML = `
        <div class="skill-level-indicator level-0" 
             onclick="skillMatrix.editSkillLevel('${engineerId}', '${skillId}', 0)"
             title="未習得">
          -
        </div>
      `;
    }
    
    return cell;
  }
  
  // スキルレベル編集モーダル
  editSkillLevel(engineerId, skillId, currentLevel) {
    const engineer = this.engineers.find(e => e.id === engineerId);
    const skill = this.skills.find(s => s.id === skillId);
    const skillData = this.getSkillData(engineerId, skillId);
    
    const modalHtml = `
      <div class="modal fade" id="editSkillModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">スキルレベル編集</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label"><strong>技術者:</strong> ${engineer.name}</label>
              </div>
              <div class="mb-3">
                <label class="form-label"><strong>スキル:</strong> ${skill.name}</label>
              </div>
              
              <div class="mb-3">
                <label class="form-label">レベル</label>
                <select class="form-select" id="editSkillLevel" value="${currentLevel}">
                  <option value="0">0: 未習得</option>
                  <option value="1">1: 初級</option>
                  <option value="2">2: 中級下</option>
                  <option value="3">3: 中級</option>
                  <option value="4">4: 上級</option>
                  <option value="5">5: エキスパート</option>
                </select>
              </div>
              
              <div class="mb-3">
                <label class="form-label">経験年数</label>
                <input type="number" class="form-control" id="editSkillYears" 
                       value="${skillData.years || 0}" min="0" max="50" step="0.5">
              </div>
              
              <div class="mb-3">
                <label class="form-label">評価コメント</label>
                <textarea class="form-control" id="editSkillComment" rows="3" 
                          placeholder="スキルレベルの根拠や今後の課題等">${skillData.comment || ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
              <button type="button" class="btn btn-primary" 
                      onclick="skillMatrix.saveSkillLevel('${engineerId}', '${skillId}')">
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // 既存のモーダルを削除して新しいモーダルを追加
    const existingModal = document.getElementById('editSkillModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // レベル初期値設定
    document.getElementById('editSkillLevel').value = currentLevel;
    
    const modal = new bootstrap.Modal(document.getElementById('editSkillModal'));
    modal.show();
  }
  
  // スキルレベル保存
  async saveSkillLevel(engineerId, skillId) {
    const level = parseInt(document.getElementById('editSkillLevel').value);
    const years = parseFloat(document.getElementById('editSkillYears').value);
    const comment = document.getElementById('editSkillComment').value;
    
    try {
      const response = await fetch('/api/engineers/skills/assessment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          engineerId,
          skillId,
          level,
          years,
          comment,
          assessedAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('スキル評価の保存に失敗しました');
      }
      
      // マトリックス更新
      this.updateSkillData(engineerId, skillId, { level, years, comment });
      this.renderMatrix();
      this.updateStatistics();
      
      // モーダルを閉じる
      bootstrap.Modal.getInstance(document.getElementById('editSkillModal')).hide();
      
      showSuccessMessage('スキル評価を保存しました');
      
    } catch (error) {
      console.error('スキル評価保存エラー:', error);
      showErrorMessage('スキル評価の保存に失敗しました');
    }
  }
  
  // フィルタリング
  filterMatrix() {
    this.filters.department = document.getElementById('departmentFilter').value;
    this.filters.skillCategory = document.getElementById('skillCategoryFilter').value;
    this.filters.experience = document.getElementById('experienceFilter').value;
    
    this.renderMatrix();
  }
  
  // 技術者表示判定
  shouldShowEngineer(engineer) {
    if (this.filters.department && engineer.department !== this.filters.department) {
      return false;
    }
    
    if (this.filters.experience) {
      const range = this.filters.experience.split('-');
      const minExp = parseInt(range[0]);
      const maxExp = range[1] === '+' ? Infinity : parseInt(range[1]);
      
      if (engineer.totalExperience < minExp || engineer.totalExperience > maxExp) {
        return false;
      }
    }
    
    return true;
  }
  
  // スキル表示判定
  shouldShowSkill(skill) {
    if (this.filters.skillCategory && skill.category !== this.filters.skillCategory) {
      return false;
    }
    
    return true;
  }
  
  // 統計更新
  updateStatistics() {
    this.updateSkillDistributionChart();
    this.updateSkillGapAnalysis();
  }
  
  // スキル分布チャート
  updateSkillDistributionChart() {
    const ctx = document.getElementById('skillDistributionChart').getContext('2d');
    
    // 既存チャートを破棄
    if (this.distributionChart) {
      this.distributionChart.destroy();
    }
    
    const skillStats = this.calculateSkillDistribution();
    
    this.distributionChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: skillStats.labels,
        datasets: [{
          label: '平均スキルレベル',
          data: skillStats.averageLevels,
          backgroundColor: 'rgba(13, 110, 253, 0.8)',
          borderColor: 'rgba(13, 110, 253, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: function(value) {
                const levels = ['未習得', '初級', '中級下', '中級', '上級', 'エキスパート'];
                return levels[value];
              }
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const levels = ['未習得', '初級', '中級下', '中級', '上級', 'エキスパート'];
                return `平均レベル: ${levels[Math.round(context.raw)]} (${context.raw.toFixed(1)})`;
              }
            }
          }
        }
      }
    });
  }
  
  // ユーティリティメソッド
  getSkillLevel(engineerId, skillId) {
    const key = `${engineerId}-${skillId}`;
    return this.matrix.get(key)?.level || 0;
  }
  
  getSkillData(engineerId, skillId) {
    const key = `${engineerId}-${skillId}`;
    return this.matrix.get(key) || { level: 0, years: 0, comment: '' };
  }
  
  updateSkillData(engineerId, skillId, data) {
    const key = `${engineerId}-${skillId}`;
    this.matrix.set(key, { ...this.getSkillData(engineerId, skillId), ...data });
  }
  
  getLevelText(level) {
    const levels = ['未習得', '初級', '中級下', '中級', '上級', 'エキスパート'];
    return levels[level] || '未習得';
  }
}

// グローバルインスタンス
const skillMatrix = new SkillMatrix();

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  skillMatrix.loadMatrix();
});
```

### 4.5 CSS スタイル

```css
/* スキルマトリックス専用スタイル */
.skills-matrix-table {
  font-size: 0.875rem;
}

.skills-matrix-table .sticky-left {
  position: sticky;
  left: 0;
  background-color: #fff;
  z-index: 2;
  border-right: 2px solid #dee2e6;
}

.skills-matrix-table .sticky-top {
  position: sticky;
  top: 0;
  z-index: 3;
}

.engineer-name-col {
  min-width: 180px;
  max-width: 180px;
}

.skill-col {
  min-width: 80px;
  max-width: 80px;
}

.skill-header {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skill-name {
  font-weight: 600;
}

.skill-category {
  color: #6c757d;
  font-size: 0.7rem;
}

.skill-level-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  cursor: pointer;
  margin: 0 auto;
  transition: all 0.2s ease;
}

.skill-level-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.skill-level-indicator.level-0 {
  background-color: #e9ecef;
  color: #6c757d;
}

.skill-level-indicator.level-1 {
  background-color: #dc3545;
}

.skill-level-indicator.level-2 {
  background-color: #fd7e14;
}

.skill-level-indicator.level-3 {
  background-color: #ffc107;
  color: #212529;
}

.skill-level-indicator.level-4 {
  background-color: #198754;
}

.skill-level-indicator.level-5 {
  background-color: #6f42c1;
}

.skill-gap-item {
  padding: 0.5rem 0;
}

.skill-gap-item:not(:last-child) {
  border-bottom: 1px solid #e9ecef;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .matrix-table-wrapper {
    font-size: 0.75rem;
  }
  
  .engineer-name-col {
    min-width: 120px;
    max-width: 120px;
  }
  
  .skill-col {
    min-width: 60px;
    max-width: 60px;
  }
  
  .skill-level-indicator {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
  }
  
  .skill-header {
    height: 80px;
    font-size: 0.7rem;
  }
}
```

---

## 🚀 5. パフォーマンス・セキュリティ・品質要件

### 5.1 パフォーマンス要件

| 操作 | 目標時間 | 最大許容時間 |
|------|----------|--------------|
| 技術者一覧表示 | < 1秒 | < 2秒 |
| スキル検索 | < 500ms | < 1秒 |
| 詳細画面表示 | < 800ms | < 1.5秒 |
| スキル評価保存 | < 1秒 | < 2秒 |
| マトリックス表示 | < 2秒 | < 3秒 |
| チャート描画 | < 1秒 | < 2秒 |

### 5.2 スキル検索最適化

```javascript
// 検索デバウンス・キャッシュ実装
class SearchOptimizer {
  constructor() {
    this.cache = new Map();
    this.debounceTimeout = null;
    this.cacheTTL = 5 * 60 * 1000; // 5分
  }
  
  // デバウンス検索
  debouncedSearch(query, callback, delay = 300) {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = setTimeout(() => {
      this.performSearch(query, callback);
    }, delay);
  }
  
  // キャッシュ付き検索
  async performSearch(query, callback) {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.cache.get(cacheKey);
    
    // キャッシュヒット判定
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      callback(cached.data);
      return;
    }
    
    try {
      const result = await this.fetchSearchResults(query);
      
      // キャッシュに保存
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      callback(result);
    } catch (error) {
      console.error('検索エラー:', error);
      callback({ engineers: [], total: 0 });
    }
  }
  
  generateCacheKey(query) {
    return btoa(JSON.stringify(query));
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

### 5.3 セキュリティ要件

#### 個人情報保護
```javascript
// 個人情報マスキング
const maskPersonalInfo = (data, userRole) => {
  const maskedData = { ...data };
  
  // 一般ユーザーには機密情報をマスク
  if (!['ADMIN', 'HR_MANAGER'].includes(userRole)) {
    maskedData.phoneNumber = maskPhoneNumber(data.phoneNumber);
    maskedData.email = maskEmail(data.email);
    maskedData.salary = undefined;
    maskedData.address = undefined;
  }
  
  return maskedData;
};

const maskPhoneNumber = (phone) => {
  return phone?.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
};

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
};
```

#### 操作ログ記録
```javascript
// 操作ログ記録
const logUserAction = async (action, targetId, details = {}) => {
  const logData = {
    userId: getCurrentUserId(),
    action,
    targetType: 'ENGINEER',
    targetId,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    ipAddress: await getClientIP()
  };
  
  try {
    await fetch('/api/audit/logs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    console.error('ログ記録に失敗:', error);
  }
};

// 使用例
const viewEngineerDetail = async (engineerId) => {
  await logUserAction('VIEW_ENGINEER_DETAIL', engineerId);
  // 詳細表示処理...
};

const updateSkillAssessment = async (engineerId, skillData) => {
  await logUserAction('UPDATE_SKILL_ASSESSMENT', engineerId, {
    skillId: skillData.skillId,
    oldLevel: skillData.oldLevel,
    newLevel: skillData.newLevel
  });
  // スキル更新処理...
};
```

---

## 📚 6. 関連資料・運用

### 6.1 参照ドキュメント
- **API設計書**: `Engineer_Context_API.md`
- **ドメインモデル設計**: `Engineer集約詳細設計.md`
- **データベース設計**: `Engineer_Context_物理テーブル設計.md`
- **共通レイアウト設計**: `01_基本レイアウト構造.md`

### 6.2 外部ライブラリ・依存関係
- **Bootstrap**: 5.3.2
- **Bootstrap Icons**: 1.11.2
- **Chart.js**: 4.4.0
- **Alpine.js**: 3.x
- **htmx**: 1.9.x

### 6.3 テストケース例

#### E2Eテスト
```javascript
// Cypress テストケース
describe('Engineer Management', () => {
  beforeEach(() => {
    cy.login('hr_manager');
    cy.visit('/engineers');
  });
  
  it('should search engineers by skill', () => {
    cy.get('#keywordSearch').type('Java');
    cy.get('button[onclick="performSearch()"]').click();
    
    cy.get('[data-testid="engineer-list"]').should('be.visible');
    cy.get('[data-testid="engineer-item"]').should('contain', 'Java');
  });
  
  it('should update skill assessment in matrix', () => {
    cy.visit('/engineers/skills/matrix');
    cy.get('[data-engineer-id="eng-001"] [data-skill="java"]').click();
    
    cy.get('#editSkillLevel').select('4');
    cy.get('#editSkillYears').clear().type('8');
    cy.get('button[onclick*="saveSkillLevel"]').click();
    
    cy.get('[data-engineer-id="eng-001"] [data-skill="java"]')
      .should('contain', '4');
  });
});
```

---

**文書管理**:
- **作成者**: プロジェクトチーム
- **レビュアー**: UI/UXデザイナー、技術マネージャー
- **承認者**: アーキテクト、プロジェクトマネージャー
- **最終更新**: 2025年6月1日
- **次回レビュー**: 2025年7月1日