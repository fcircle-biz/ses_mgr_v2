# Matching Context 画面仕様書

## 目次

1. [概要](#概要)
2. [画面一覧](#画面一覧)
3. [01_マッチング検索・条件設定画面](#01_マッチング検索条件設定画面)
4. [02_マッチング結果・候補者表示画面](#02_マッチング結果候補者表示画面)
5. [03_マッチング評価・判定画面](#03_マッチング評価判定画面)
6. [04_マッチング履歴・統計画面](#04_マッチング履歴統計画面)
7. [共通仕様](#共通仕様)
8. [技術仕様](#技術仕様)

---

## 概要

### 目的
SES業務システムにおけるマッチング機能の画面仕様を定義し、プロジェクトと技術者の効果的なマッチングを支援するUIを提供する。

### 対象ユーザー
- **プライマリ**: 営業担当者、プロジェクトマネージャー
- **セカンダリ**: 人事担当者、管理者

### 設計方針
- **効率性重視**: 迅速なマッチング実行と結果確認
- **視覚的分かりやすさ**: マッチングスコアと評価の直感的表示
- **操作性向上**: ワンクリックでの候補者選定・拒否
- **データ駆動**: 統計データに基づく意思決定支援

---

## 画面一覧

| 画面ID | 画面名 | 主要機能 | 対応API |
|--------|--------|----------|---------|
| MTG-01 | マッチング検索・条件設定画面 | 条件設定、マッチング要求作成・実行 | POST /matching-requests<br>POST /matching-requests/{id}/execute |
| MTG-02 | マッチング結果・候補者表示画面 | 候補者一覧表示、ソート・フィルタ | GET /matching-requests/{id}/candidates |
| MTG-03 | マッチング評価・判定画面 | 候補者詳細、選定・拒否判定 | GET /matching-requests/{id}/candidates/{id}<br>POST /matching-requests/{id}/candidates/{id}/select<br>POST /matching-requests/{id}/candidates/{id}/reject |
| MTG-04 | マッチング履歴・統計画面 | 過去履歴、統計分析、KPI表示 | GET /matching-requests<br>GET /matching-requests/statistics |

---

## 01_マッチング検索・条件設定画面

### 画面概要
- **画面ID**: MTG-01
- **画面名**: マッチング検索・条件設定画面
- **URL**: `/matching/search`
- **目的**: プロジェクトに適した技術者を見つけるための検索条件を設定し、マッチング要求を作成・実行する

### レイアウト構成
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー                                                    │
├─────────────────────────────────────────────────────────────┤
│ ページタイトル: マッチング検索        [新規マッチング要求] │
├─────────────────────────────────────────────────────────────┤
│ プロジェクト選択セクション                                  │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │プロジェクト選択 │ │プロジェクト概要 │                     │
│ └─────────────────┘ └─────────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│ マッチング条件設定セクション                                │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ 必要スキル | 経験レベル | 勤務条件 | 予算・期間 | 特別要件 ││
│ └───────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ 実行設定・オプション                                        │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │実行パラメータ   │ │通知設定         │                     │
│ └─────────────────┘ └─────────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│ アクションエリア                                            │
│                    [プレビュー] [保存] [マッチング実行]    │
└─────────────────────────────────────────────────────────────┘
```

### 詳細仕様

#### プロジェクト選択セクション
```html
<div class="row mb-4">
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-folder2-open me-2"></i>プロジェクト選択
        </h5>
      </div>
      <div class="card-body">
        <div class="mb-3">
          <label for="projectSearch" class="form-label">プロジェクト検索</label>
          <div class="input-group">
            <input type="text" class="form-control" id="projectSearch" 
                   placeholder="プロジェクト名または番号で検索..."
                   hx-get="/api/projects/search" 
                   hx-trigger="keyup changed delay:300ms"
                   hx-target="#projectResults">
            <button class="btn btn-outline-secondary" type="button">
              <i class="bi bi-search"></i>
            </button>
          </div>
        </div>
        <div id="projectResults" class="project-results">
          <!-- 検索結果をここに表示 -->
        </div>
      </div>
    </div>
  </div>
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-info-circle me-2"></i>選択プロジェクト概要
        </h5>
      </div>
      <div class="card-body" id="selectedProjectInfo">
        <div class="text-muted text-center py-4">
          <i class="bi bi-arrow-left-circle fs-3 mb-2"></i>
          <p class="mb-0">左側からプロジェクトを選択してください</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### マッチング条件設定セクション
```html
<div class="card mb-4">
  <div class="card-header">
    <h5 class="card-title mb-0">
      <i class="bi bi-sliders me-2"></i>マッチング条件設定
    </h5>
  </div>
  <div class="card-body">
    <!-- タブナビゲーション -->
    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#skills-tab">
          <i class="bi bi-code-square me-1"></i>必要スキル
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#experience-tab">
          <i class="bi bi-award me-1"></i>経験レベル
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#work-conditions-tab">
          <i class="bi bi-geo-alt me-1"></i>勤務条件
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#budget-tab">
          <i class="bi bi-currency-yen me-1"></i>予算・期間
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#special-tab">
          <i class="bi bi-star me-1"></i>特別要件
        </button>
      </li>
    </ul>

    <!-- タブコンテンツ -->
    <div class="tab-content">
      <!-- 必要スキルタブ -->
      <div class="tab-pane fade show active" id="skills-tab">
        <div class="skill-requirements-section">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">必要スキル一覧</h6>
            <button type="button" class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#addSkillModal">
              <i class="bi bi-plus-circle me-1"></i>スキル追加
            </button>
          </div>
          <div id="skillList" class="skill-list">
            <!-- 動的に追加されるスキル項目 -->
          </div>
        </div>
      </div>

      <!-- 経験レベルタブ -->
      <div class="tab-pane fade" id="experience-tab">
        <div class="row">
          <div class="col-md-6">
            <label for="experienceLevel" class="form-label">必要経験レベル</label>
            <select class="form-select" id="experienceLevel">
              <option value="">選択してください</option>
              <option value="JUNIOR">ジュニア（1-2年）</option>
              <option value="MIDDLE">ミドル（3-5年）</option>
              <option value="SENIOR">シニア（6-10年）</option>
              <option value="EXPERT">エキスパート（10年以上）</option>
            </select>
          </div>
          <div class="col-md-6">
            <label for="domainExperience" class="form-label">業界経験</label>
            <input type="text" class="form-control" id="domainExperience" 
                   placeholder="金融、EC、製造業など">
          </div>
        </div>
      </div>

      <!-- 勤務条件タブ -->
      <div class="tab-pane fade" id="work-conditions-tab">
        <div class="row">
          <div class="col-md-4">
            <label for="workLocation" class="form-label">勤務地</label>
            <input type="text" class="form-control" id="workLocation" 
                   placeholder="東京都港区">
          </div>
          <div class="col-md-4">
            <label for="workStyle" class="form-label">勤務形態</label>
            <select class="form-select" id="workStyle">
              <option value="">選択してください</option>
              <option value="ONSITE">オンサイト</option>
              <option value="REMOTE">リモート</option>
              <option value="HYBRID">ハイブリッド</option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="startDate" class="form-label">開始予定日</label>
            <input type="date" class="form-control" id="startDate">
          </div>
        </div>
      </div>

      <!-- 予算・期間タブ -->
      <div class="tab-pane fade" id="budget-tab">
        <div class="row">
          <div class="col-md-6">
            <label class="form-label">予算範囲（月額）</label>
            <div class="row">
              <div class="col-6">
                <div class="input-group">
                  <span class="input-group-text">¥</span>
                  <input type="number" class="form-control" id="budgetMin" 
                         placeholder="下限">
                </div>
              </div>
              <div class="col-6">
                <div class="input-group">
                  <span class="input-group-text">¥</span>
                  <input type="number" class="form-control" id="budgetMax" 
                         placeholder="上限">
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <label for="projectDuration" class="form-label">プロジェクト期間</label>
            <div class="input-group">
              <input type="number" class="form-control" id="projectDuration" 
                     placeholder="6">
              <span class="input-group-text">ヶ月</span>
            </div>
          </div>
          <div class="col-md-3">
            <label for="teamSize" class="form-label">チームサイズ</label>
            <div class="input-group">
              <input type="number" class="form-control" id="teamSize" 
                     placeholder="5">
              <span class="input-group-text">名</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 特別要件タブ -->
      <div class="tab-pane fade" id="special-tab">
        <div class="mb-3">
          <label for="specialRequirements" class="form-label">特別要件</label>
          <textarea class="form-control" id="specialRequirements" rows="4" 
                    placeholder="その他の特別な要件があれば記載してください"></textarea>
        </div>
        <div class="row">
          <div class="col-md-6">
            <label for="candidateLimit" class="form-label">候補者数上限</label>
            <input type="number" class="form-control" id="candidateLimit" 
                   value="10" min="1" max="50">
          </div>
          <div class="col-md-6">
            <label for="deadline" class="form-label">選定期限</label>
            <input type="datetime-local" class="form-control" id="deadline">
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 実行設定・オプション
```html
<div class="row mb-4">
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h6 class="card-title mb-0">
          <i class="bi bi-gear me-2"></i>実行パラメータ
        </h6>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-6">
            <label for="maxCandidates" class="form-label">最大候補者数</label>
            <input type="number" class="form-control" id="maxCandidates" 
                   value="10" min="1" max="100">
          </div>
          <div class="col-6">
            <label for="minMatchingScore" class="form-label">最小マッチングスコア</label>
            <input type="number" class="form-control" id="minMatchingScore" 
                   value="0.3" min="0" max="1" step="0.1">
          </div>
        </div>
        <div class="form-check mt-3">
          <input class="form-check-input" type="checkbox" id="includeUnavailable">
          <label class="form-check-label" for="includeUnavailable">
            稼働不可の技術者も含める
          </label>
        </div>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="prioritizeAvailability" checked>
          <label class="form-check-label" for="prioritizeAvailability">
            稼働可能性を優先
          </label>
        </div>
      </div>
    </div>
  </div>
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h6 class="card-title mb-0">
          <i class="bi bi-bell me-2"></i>通知設定
        </h6>
      </div>
      <div class="card-body">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="notifyOnCompletion" checked>
          <label class="form-check-label" for="notifyOnCompletion">
            完了時に通知
          </label>
        </div>
        <div class="mt-3">
          <label for="notifyRecipients" class="form-label">通知先</label>
          <select class="form-select" id="notifyRecipients" multiple>
            <option value="user1">田中太郎</option>
            <option value="user2">佐藤花子</option>
            <option value="user3">鈴木一郎</option>
          </select>
          <div class="form-text">
            Ctrlキーを押しながらクリックで複数選択
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### アクションエリア
```html
<div class="d-flex justify-content-between align-items-center">
  <div>
    <span class="text-muted">
      <i class="bi bi-info-circle me-1"></i>
      条件に基づいて技術者をマッチングします
    </span>
  </div>
  <div class="btn-group">
    <button type="button" class="btn btn-outline-secondary" id="previewBtn">
      <i class="bi bi-eye me-1"></i>プレビュー
    </button>
    <button type="button" class="btn btn-secondary" id="saveBtn">
      <i class="bi bi-bookmark me-1"></i>保存
    </button>
    <button type="button" class="btn btn-primary" id="executeBtn">
      <i class="bi bi-play-circle me-1"></i>マッチング実行
    </button>
  </div>
</div>
```

### 画面遷移
- **実行成功時**: MTG-02（マッチング結果・候補者表示画面）へ
- **保存時**: 現在画面にとどまり、成功メッセージ表示
- **キャンセル時**: ダッシュボードまたは前画面へ戻る

### バリデーション
- **必須項目**: プロジェクト選択、最低1つのスキル設定
- **形式チェック**: 予算範囲（下限 ≤ 上限）、日付（未来日）
- **業務ルール**: 候補者数上限（1-50）、スコア範囲（0-1）

---

## 02_マッチング結果・候補者表示画面

### 画面概要
- **画面ID**: MTG-02
- **画面名**: マッチング結果・候補者表示画面
- **URL**: `/matching/results/{requestId}`
- **目的**: マッチング実行結果として生成された候補者一覧を表示し、効率的な候補者選択を支援する

### レイアウト構成
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー                                                    │
├─────────────────────────────────────────────────────────────┤
│ 戻る | マッチング結果: プロジェクト名     [再実行] [エクスポート] │
├─────────────────────────────────────────────────────────────┤
│ マッチング概要サマリー                                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │候補者数 │ │平均スコア│ │実行時間 │ │ステータス│         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
├─────────────────────────────────────────────────────────────┤
│ フィルター・ソート・操作エリア                              │
│ [スコア範囲][ステータス][スキル] ソート▼ [一括操作▼]      │
├─────────────────────────────────────────────────────────────┤
│ 候補者一覧（カードビュー/テーブルビュー切替）               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │候補者カード1（マッチングスコア、スキル、アクション）    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │候補者カード2                                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │候補者カード3                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ページネーション                                            │
└─────────────────────────────────────────────────────────────┘
```

### 詳細仕様

#### マッチング概要サマリー
```html
<div class="row mb-4">
  <div class="col-md-3">
    <div class="card stats-card border-primary">
      <div class="card-body text-center">
        <div class="stats-icon bg-primary text-white mb-2">
          <i class="bi bi-people"></i>
        </div>
        <h3 class="stats-value text-primary" id="candidateCount">8</h3>
        <p class="stats-label text-muted mb-0">候補者数</p>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card stats-card border-success">
      <div class="card-body text-center">
        <div class="stats-icon bg-success text-white mb-2">
          <i class="bi bi-graph-up"></i>
        </div>
        <h3 class="stats-value text-success" id="averageScore">0.78</h3>
        <p class="stats-label text-muted mb-0">平均スコア</p>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card stats-card border-info">
      <div class="card-body text-center">
        <div class="stats-icon bg-info text-white mb-2">
          <i class="bi bi-clock"></i>
        </div>
        <h3 class="stats-value text-info" id="executionTime">2.4s</h3>
        <p class="stats-label text-muted mb-0">実行時間</p>
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <div class="card stats-card border-warning">
      <div class="card-body text-center">
        <div class="stats-icon bg-warning text-white mb-2">
          <i class="bi bi-check-circle"></i>
        </div>
        <h3 class="stats-value text-warning" id="status">完了</h3>
        <p class="stats-label text-muted mb-0">ステータス</p>
      </div>
    </div>
  </div>
</div>
```

#### フィルター・ソートエリア
```html
<div class="filter-sort-panel bg-light p-3 rounded mb-4">
  <div class="row align-items-end">
    <div class="col-md-2">
      <label class="form-label">スコア範囲</label>
      <select class="form-select" id="scoreFilter">
        <option value="">すべて</option>
        <option value="0.8-1.0">0.8以上</option>
        <option value="0.6-0.8">0.6-0.8</option>
        <option value="0.4-0.6">0.4-0.6</option>
        <option value="0.0-0.4">0.4未満</option>
      </select>
    </div>
    <div class="col-md-2">
      <label class="form-label">ステータス</label>
      <select class="form-select" id="statusFilter">
        <option value="">すべて</option>
        <option value="GENERATED">生成済</option>
        <option value="REVIEWED">確認済</option>
        <option value="SHORTLISTED">候補者リスト入り</option>
        <option value="SELECTED">選定</option>
        <option value="REJECTED">拒否</option>
      </select>
    </div>
    <div class="col-md-2">
      <label class="form-label">スキル</label>
      <input type="text" class="form-control" id="skillFilter" 
             placeholder="Java, Python...">
    </div>
    <div class="col-md-2">
      <label class="form-label">ソート</label>
      <select class="form-select" id="sortOrder">
        <option value="matchingScore,desc">スコア（高い順）</option>
        <option value="matchingScore,asc">スコア（低い順）</option>
        <option value="rank,asc">ランク順</option>
        <option value="availability.availableFrom,asc">参画可能日</option>
      </select>
    </div>
    <div class="col-md-2">
      <label class="form-label">表示形式</label>
      <div class="btn-group w-100" role="group">
        <input type="radio" class="btn-check" name="viewMode" id="cardView" checked>
        <label class="btn btn-outline-secondary" for="cardView">
          <i class="bi bi-grid"></i>
        </label>
        <input type="radio" class="btn-check" name="viewMode" id="tableView">
        <label class="btn btn-outline-secondary" for="tableView">
          <i class="bi bi-list"></i>
        </label>
      </div>
    </div>
    <div class="col-md-2">
      <div class="dropdown">
        <button class="btn btn-outline-primary dropdown-toggle w-100" type="button" 
                data-bs-toggle="dropdown">
          一括操作
        </button>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" href="#" id="bulkShortlist">
            <i class="bi bi-star me-2"></i>一括候補者リスト入り</a></li>
          <li><a class="dropdown-item" href="#" id="bulkReject">
            <i class="bi bi-x-circle me-2"></i>一括拒否</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="#" id="exportCandidates">
            <i class="bi bi-download me-2"></i>候補者エクスポート</a></li>
        </ul>
      </div>
    </div>
  </div>
</div>
```

#### 候補者カードビュー
```html
<div id="candidatesContainer" class="candidates-container">
  <div class="row" id="candidateCards">
    <!-- 候補者カード (動的生成) -->
    <div class="col-lg-6 col-xl-4 mb-4">
      <div class="card candidate-card h-100" data-candidate-id="candidate-001">
        <div class="card-header d-flex justify-content-between align-items-start">
          <div class="d-flex align-items-center">
            <input type="checkbox" class="form-check-input me-2" value="candidate-001">
            <span class="badge bg-primary rank-badge">#1</span>
          </div>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
              <i class="bi bi-three-dots"></i>
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item" href="#" data-action="view">
                <i class="bi bi-eye me-2"></i>詳細表示</a></li>
              <li><a class="dropdown-item" href="#" data-action="shortlist">
                <i class="bi bi-star me-2"></i>候補者リスト入り</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-success" href="#" data-action="select">
                <i class="bi bi-check-circle me-2"></i>選定</a></li>
              <li><a class="dropdown-item text-danger" href="#" data-action="reject">
                <i class="bi bi-x-circle me-2"></i>拒否</a></li>
            </ul>
          </div>
        </div>
        
        <div class="card-body">
          <!-- 技術者基本情報 -->
          <div class="engineer-info mb-3">
            <div class="d-flex align-items-center mb-2">
              <img src="/images/avatar-placeholder.png" 
                   class="rounded-circle me-3" width="48" height="48" 
                   alt="技術者アバター">
              <div>
                <h6 class="mb-1">田中太郎</h6>
                <small class="text-muted">シニアエンジニア</small>
              </div>
            </div>
          </div>
          
          <!-- マッチングスコア -->
          <div class="matching-score mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-medium">総合スコア</span>
              <span class="badge bg-success fs-6">0.85</span>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar bg-success" style="width: 85%"></div>
            </div>
            
            <!-- 詳細スコア -->
            <div class="score-details">
              <div class="row text-center">
                <div class="col-3">
                  <small class="text-muted d-block">スキル</small>
                  <strong class="score-value">0.9</strong>
                </div>
                <div class="col-3">
                  <small class="text-muted d-block">経験</small>
                  <strong class="score-value">0.8</strong>
                </div>
                <div class="col-3">
                  <small class="text-muted d-block">稼働</small>
                  <strong class="score-value">0.9</strong>
                </div>
                <div class="col-3">
                  <small class="text-muted d-block">立地</small>
                  <strong class="score-value">0.8</strong>
                </div>
              </div>
            </div>
          </div>
          
          <!-- スキル -->
          <div class="skills mb-3">
            <div class="mb-2">
              <small class="text-muted">マッチしたスキル</small>
            </div>
            <div class="skill-tags">
              <span class="badge bg-primary me-1 mb-1">Java</span>
              <span class="badge bg-primary me-1 mb-1">Spring Boot</span>
              <span class="badge bg-secondary me-1 mb-1">AWS</span>
              <span class="badge bg-secondary me-1 mb-1">Docker</span>
            </div>
          </div>
          
          <!-- 稼働情報 -->
          <div class="availability mb-3">
            <div class="row">
              <div class="col-6">
                <small class="text-muted d-block">参画可能日</small>
                <strong>2025/07/01</strong>
              </div>
              <div class="col-6">
                <small class="text-muted d-block">稼働率</small>
                <strong>100%</strong>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="row">
            <div class="col-6">
              <button class="btn btn-outline-success btn-sm w-100" data-action="select">
                <i class="bi bi-check-circle me-1"></i>選定
              </button>
            </div>
            <div class="col-6">
              <button class="btn btn-outline-danger btn-sm w-100" data-action="reject">
                <i class="bi bi-x-circle me-1"></i>拒否
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 他の候補者カード... -->
  </div>
</div>
```

#### 候補者テーブルビュー
```html
<div id="candidateTable" class="table-responsive" style="display: none;">
  <table class="table table-hover">
    <thead class="table-light">
      <tr>
        <th width="50">
          <input type="checkbox" class="form-check-input" id="selectAll">
        </th>
        <th>ランク</th>
        <th>技術者</th>
        <th>総合スコア</th>
        <th>主要スキル</th>
        <th>参画可能日</th>
        <th>ステータス</th>
        <th width="150">操作</th>
      </tr>
    </thead>
    <tbody id="candidateTableBody">
      <tr data-candidate-id="candidate-001">
        <td>
          <input type="checkbox" class="form-check-input" value="candidate-001">
        </td>
        <td>
          <span class="badge bg-primary">#1</span>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <img src="/images/avatar-placeholder.png" 
                 class="rounded-circle me-2" width="32" height="32">
            <div>
              <div class="fw-medium">田中太郎</div>
              <small class="text-muted">シニアエンジニア</small>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center">
            <span class="badge bg-success me-2">0.85</span>
            <div class="progress" style="width: 60px; height: 6px;">
              <div class="progress-bar bg-success" style="width: 85%"></div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-primary me-1">Java</span>
          <span class="badge bg-secondary me-1">Spring</span>
          <span class="badge bg-secondary">+2</span>
        </td>
        <td>
          <time datetime="2025-07-01">2025/07/01</time>
        </td>
        <td>
          <span class="badge bg-light text-dark">生成済</span>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" data-action="view" title="詳細">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-success" data-action="select" title="選定">
              <i class="bi bi-check"></i>
            </button>
            <button class="btn btn-outline-danger" data-action="reject" title="拒否">
              <i class="bi bi-x"></i>
            </button>
          </div>
        </td>
      </tr>
      <!-- 他の候補者行... -->
    </tbody>
  </table>
</div>
```

### JavaScript機能
```javascript
// Alpine.js データコンポーネント
Alpine.data('candidateList', () => ({
  candidates: [],
  filteredCandidates: [],
  selectedCandidates: [],
  viewMode: 'card',
  filters: {
    scoreRange: '',
    status: '',
    skill: ''
  },
  sortOrder: 'matchingScore,desc',
  loading: false,

  init() {
    this.loadCandidates();
  },

  async loadCandidates() {
    this.loading = true;
    try {
      const response = await fetch(`/api/matching-requests/${this.requestId}/candidates`);
      this.candidates = await response.json();
      this.applyFilters();
    } catch (error) {
      this.showError('候補者の読み込みに失敗しました');
    } finally {
      this.loading = false;
    }
  },

  applyFilters() {
    let filtered = [...this.candidates];
    
    // スコア範囲フィルタ
    if (this.filters.scoreRange) {
      const [min, max] = this.filters.scoreRange.split('-').map(Number);
      filtered = filtered.filter(c => 
        c.matchingScore.overall >= min && c.matchingScore.overall <= max
      );
    }
    
    // ステータスフィルタ
    if (this.filters.status) {
      filtered = filtered.filter(c => c.status === this.filters.status);
    }
    
    // スキルフィルタ
    if (this.filters.skill) {
      const skills = this.filters.skill.toLowerCase().split(',').map(s => s.trim());
      filtered = filtered.filter(c => 
        skills.some(skill => 
          c.engineer.skills.some(s => s.name.toLowerCase().includes(skill))
        )
      );
    }
    
    this.filteredCandidates = filtered;
    this.applySorting();
  },

  applySorting() {
    const [field, direction] = this.sortOrder.split(',');
    this.filteredCandidates.sort((a, b) => {
      let aVal = this.getNestedValue(a, field);
      let bVal = this.getNestedValue(b, field);
      
      if (direction === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });
  },

  async selectCandidate(candidateId, reason = '') {
    try {
      await fetch(`/api/matching-requests/${this.requestId}/candidates/${candidateId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionReason: reason })
      });
      
      this.showSuccess('候補者を選定しました');
      this.loadCandidates();
    } catch (error) {
      this.showError('選定に失敗しました');
    }
  },

  async rejectCandidate(candidateId, reason) {
    try {
      await fetch(`/api/matching-requests/${this.requestId}/candidates/${candidateId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason })
      });
      
      this.showSuccess('候補者を拒否しました');
      this.loadCandidates();
    } catch (error) {
      this.showError('拒否に失敗しました');
    }
  }
}));
```

### 画面遷移
- **候補者詳細**: MTG-03（マッチング評価・判定画面）へ
- **再実行**: MTG-01（条件設定画面）へ戻る
- **選定完了**: プロジェクト詳細画面またはダッシュボードへ

---

## 03_マッチング評価・判定画面

### 画面概要
- **画面ID**: MTG-03
- **画面名**: マッチング評価・判定画面
- **URL**: `/matching/evaluation/{requestId}/{candidateId}`
- **目的**: 候補者の詳細情報とマッチング分析結果を表示し、選定・拒否の判断を支援する

### レイアウト構成
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー                                                    │
├─────────────────────────────────────────────────────────────┤
│ 戻る | 候補者詳細: 田中太郎           [前候補者][次候補者]  │
├─────────────────────────────────────────────────────────────┤
│ 候補者基本情報 & マッチングサマリー                         │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │技術者プロフィール│ │マッチングスコア │                     │
│ └─────────────────┘ └─────────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│ 詳細分析タブ                                                │
│ [スキル分析][経験分析][稼働状況][マッチング履歴][評価コメント] │
│ ┌───────────────────────────────────────────────────────────┐│
│ │タブコンテンツエリア                                       ││
│ └───────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ 判定・アクションエリア                                      │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │選定理由・備考   │ │アクションボタン │                     │
│ └─────────────────┘ └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### 詳細仕様

#### 候補者基本情報 & マッチングサマリー
```html
<div class="row mb-4">
  <!-- 技術者プロフィール -->
  <div class="col-lg-4">
    <div class="card">
      <div class="card-body text-center">
        <img src="/images/avatar-placeholder.png" 
             class="rounded-circle mb-3" width="100" height="100" 
             alt="技術者アバター">
        <h5 class="card-title">田中太郎</h5>
        <p class="card-text text-muted">シニアJavaエンジニア</p>
        
        <div class="row text-center mb-3">
          <div class="col-4">
            <strong class="d-block">8年</strong>
            <small class="text-muted">経験年数</small>
          </div>
          <div class="col-4">
            <strong class="d-block">15</strong>
            <small class="text-muted">プロジェクト数</small>
          </div>
          <div class="col-4">
            <strong class="d-block">4.8</strong>
            <small class="text-muted">評価平均</small>
          </div>
        </div>
        
        <div class="contact-info">
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-envelope me-2 text-muted"></i>
            <small>t.tanaka@example.com</small>
          </div>
          <div class="d-flex align-items-center mb-2">
            <i class="bi bi-telephone me-2 text-muted"></i>
            <small>090-1234-5678</small>
          </div>
          <div class="d-flex align-items-center">
            <i class="bi bi-geo-alt me-2 text-muted"></i>
            <small>東京都港区</small>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- マッチングスコア詳細 -->
  <div class="col-lg-8">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-graph-up me-2"></i>マッチング分析結果
        </h5>
      </div>
      <div class="card-body">
        <!-- 総合スコア -->
        <div class="overall-score mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">総合マッチングスコア</h6>
            <span class="badge bg-success fs-5">0.85</span>
          </div>
          <div class="progress mb-2" style="height: 12px;">
            <div class="progress-bar bg-success" style="width: 85%"></div>
          </div>
          <small class="text-muted">
            この候補者は要件に高度にマッチしています
          </small>
        </div>
        
        <!-- 詳細スコア内訳 -->
        <div class="score-breakdown">
          <div class="row">
            <div class="col-md-6 mb-3">
              <div class="score-item">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-medium">
                    <i class="bi bi-code-square me-1 text-primary"></i>
                    スキルマッチ
                  </span>
                  <span class="badge bg-primary">0.90</span>
                </div>
                <div class="progress mt-1" style="height: 6px;">
                  <div class="progress-bar bg-primary" style="width: 90%"></div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="score-item">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-medium">
                    <i class="bi bi-award me-1 text-info"></i>
                    経験マッチ
                  </span>
                  <span class="badge bg-info">0.80</span>
                </div>
                <div class="progress mt-1" style="height: 6px;">
                  <div class="progress-bar bg-info" style="width: 80%"></div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="score-item">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-medium">
                    <i class="bi bi-calendar-check me-1 text-success"></i>
                    稼働可能性
                  </span>
                  <span class="badge bg-success">0.95</span>
                </div>
                <div class="progress mt-1" style="height: 6px;">
                  <div class="progress-bar bg-success" style="width: 95%"></div>
                </div>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="score-item">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-medium">
                    <i class="bi bi-geo-alt me-1 text-warning"></i>
                    勤務地マッチ
                  </span>
                  <span class="badge bg-warning">0.75</span>
                </div>
                <div class="progress mt-1" style="height: 6px;">
                  <div class="progress-bar bg-warning" style="width: 75%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 推薦理由 -->
        <div class="recommendation mt-3">
          <h6 class="text-success">
            <i class="bi bi-check-circle me-1"></i>推薦理由
          </h6>
          <p class="text-muted mb-0">
            Java、Spring Bootの豊富な経験があり、AWSでの開発実績も十分です。
            即座に参画可能で、プロジェクトの要件を満たす最適な候補者です。
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 詳細分析タブ
```html
<div class="card mb-4">
  <div class="card-header">
    <ul class="nav nav-tabs card-header-tabs" role="tablist">
      <li class="nav-item">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#skill-analysis">
          <i class="bi bi-code-square me-1"></i>スキル分析
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#experience-analysis">
          <i class="bi bi-briefcase me-1"></i>経験分析
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#availability-analysis">
          <i class="bi bi-calendar me-1"></i>稼働状況
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#matching-history">
          <i class="bi bi-clock-history me-1"></i>マッチング履歴
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#evaluation-comments">
          <i class="bi bi-chat-square-text me-1"></i>評価コメント
        </button>
      </li>
    </ul>
  </div>
  
  <div class="card-body">
    <div class="tab-content">
      <!-- スキル分析タブ -->
      <div class="tab-pane fade show active" id="skill-analysis">
        <div class="row">
          <div class="col-md-6">
            <h6 class="text-success mb-3">
              <i class="bi bi-check-circle me-1"></i>マッチしたスキル
            </h6>
            <div class="skill-matches">
              <div class="skill-match-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-medium">Java</span>
                  <span class="badge bg-success">Perfect Match</span>
                </div>
                <div class="row">
                  <div class="col-6">
                    <small class="text-muted">要求レベル: 4</small>
                  </div>
                  <div class="col-6">
                    <small class="text-success">実際レベル: 5</small>
                  </div>
                </div>
                <div class="progress mt-1" style="height: 4px;">
                  <div class="progress-bar bg-success" style="width: 100%"></div>
                </div>
              </div>
              
              <div class="skill-match-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-medium">Spring Boot</span>
                  <span class="badge bg-success">Excellent</span>
                </div>
                <div class="row">
                  <div class="col-6">
                    <small class="text-muted">要求レベル: 3</small>
                  </div>
                  <div class="col-6">
                    <small class="text-success">実際レベル: 4</small>
                  </div>
                </div>
                <div class="progress mt-1" style="height: 4px;">
                  <div class="progress-bar bg-success" style="width: 85%"></div>
                </div>
              </div>
              
              <div class="skill-match-item mb-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="fw-medium">AWS</span>
                  <span class="badge bg-primary">Good</span>
                </div>
                <div class="row">
                  <div class="col-6">
                    <small class="text-muted">要求レベル: 3</small>
                  </div>
                  <div class="col-6">
                    <small class="text-primary">実際レベル: 3</small>
                  </div>
                </div>
                <div class="progress mt-1" style="height: 4px;">
                  <div class="progress-bar bg-primary" style="width: 75%"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <h6 class="text-warning mb-3">
              <i class="bi bi-exclamation-triangle me-1"></i>不足スキル
            </h6>
            <div class="missing-skills">
              <div class="missing-skill-item mb-2">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-medium">Kubernetes</span>
                  <span class="badge bg-warning">Low Impact</span>
                </div>
                <small class="text-muted">要求レベル: 2, 実際レベル: 0</small>
              </div>
            </div>
            
            <h6 class="text-info mb-3 mt-4">
              <i class="bi bi-plus-circle me-1"></i>追加スキル
            </h6>
            <div class="additional-skills">
              <span class="badge bg-secondary me-1 mb-1">Docker</span>
              <span class="badge bg-secondary me-1 mb-1">PostgreSQL</span>
              <span class="badge bg-secondary me-1 mb-1">React</span>
              <span class="badge bg-secondary me-1 mb-1">TypeScript</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 経験分析タブ -->
      <div class="tab-pane fade" id="experience-analysis">
        <div class="row">
          <div class="col-md-4">
            <div class="experience-summary">
              <h6 class="mb-3">経験サマリー</h6>
              <div class="experience-item mb-3">
                <div class="d-flex justify-content-between">
                  <span>総経験年数</span>
                  <strong>8.5年</strong>
                </div>
              </div>
              <div class="experience-item mb-3">
                <div class="d-flex justify-content-between">
                  <span>関連経験年数</span>
                  <strong>6.2年</strong>
                </div>
              </div>
              <div class="experience-item mb-3">
                <div class="d-flex justify-content-between">
                  <span>リーダー経験</span>
                  <strong>3.1年</strong>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-8">
            <h6 class="mb-3">ドメイン経験</h6>
            <div class="domain-experience">
              <div class="experience-bar mb-2">
                <div class="d-flex justify-content-between mb-1">
                  <span>金融・Fintech</span>
                  <span>4.2年</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-primary" style="width: 70%"></div>
                </div>
              </div>
              <div class="experience-bar mb-2">
                <div class="d-flex justify-content-between mb-1">
                  <span>Eコマース</span>
                  <span>2.8年</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-info" style="width: 47%"></div>
                </div>
              </div>
              <div class="experience-bar mb-2">
                <div class="d-flex justify-content-between mb-1">
                  <span>SaaS</span>
                  <span>1.5年</span>
                </div>
                <div class="progress" style="height: 8px;">
                  <div class="progress-bar bg-secondary" style="width: 25%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 稼働状況タブ -->
      <div class="tab-pane fade" id="availability-analysis">
        <div class="row">
          <div class="col-md-6">
            <div class="availability-info">
              <h6 class="mb-3">稼働可能性</h6>
              <div class="status-item mb-3">
                <div class="d-flex align-items-center">
                  <span class="status-icon bg-success text-white rounded-circle me-3">
                    <i class="bi bi-check"></i>
                  </span>
                  <div>
                    <strong>即座に参画可能</strong>
                    <div class="text-muted">2025/07/01から</div>
                  </div>
                </div>
              </div>
              
              <div class="status-item mb-3">
                <div class="d-flex align-items-center">
                  <span class="status-icon bg-primary text-white rounded-circle me-3">
                    <i class="bi bi-calendar"></i>
                  </span>
                  <div>
                    <strong>コミットレベル: 100%</strong>
                    <div class="text-muted">フルタイム稼働</div>
                  </div>
                </div>
              </div>
              
              <div class="status-item mb-3">
                <div class="d-flex align-items-center">
                  <span class="status-icon bg-info text-white rounded-circle me-3">
                    <i class="bi bi-geo-alt"></i>
                  </span>
                  <div>
                    <strong>勤務地対応</strong>
                    <div class="text-muted">オンサイト・リモート両方可</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <h6 class="mb-3">競合プロジェクト</h6>
            <div class="conflicting-projects">
              <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                <strong>競合なし</strong><br>
                <small>他のプロジェクトとの競合はありません</small>
              </div>
            </div>
            
            <h6 class="mb-3 mt-4">柔軟性</h6>
            <div class="flexibility-score">
              <div class="d-flex justify-content-between mb-2">
                <span>柔軟性スコア</span>
                <span class="badge bg-success">9.2/10</span>
              </div>
              <div class="progress" style="height: 8px;">
                <div class="progress-bar bg-success" style="width: 92%"></div>
              </div>
              <small class="text-muted">
                プロジェクト要件への適応性が非常に高い
              </small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- マッチング履歴タブ -->
      <div class="tab-pane fade" id="matching-history">
        <div class="matching-history-list">
          <div class="history-item border-bottom pb-3 mb-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-1">ECサイトリニューアルプロジェクト</h6>
                <div class="text-muted">2024/03/01 - 2024/12/31</div>
                <div class="mt-2">
                  <span class="badge bg-success me-1">Java</span>
                  <span class="badge bg-success me-1">Spring Boot</span>
                  <span class="badge bg-secondary me-1">React</span>
                </div>
              </div>
              <div class="text-end">
                <span class="badge bg-success">完了</span>
                <div class="text-muted mt-1">評価: 4.8/5</div>
              </div>
            </div>
          </div>
          
          <div class="history-item border-bottom pb-3 mb-3">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h6 class="mb-1">決済システム刷新プロジェクト</h6>
                <div class="text-muted">2023/06/01 - 2024/02/28</div>
                <div class="mt-2">
                  <span class="badge bg-success me-1">Java</span>
                  <span class="badge bg-success me-1">AWS</span>
                  <span class="badge bg-secondary me-1">Kubernetes</span>
                </div>
              </div>
              <div class="text-end">
                <span class="badge bg-success">完了</span>
                <div class="text-muted mt-1">評価: 4.9/5</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 評価コメントタブ -->
      <div class="tab-pane fade" id="evaluation-comments">
        <div class="evaluation-comments">
          <div class="comment-item border-bottom pb-3 mb-3">
            <div class="d-flex align-items-start">
              <img src="/images/avatar-pm.png" class="rounded-circle me-3" width="40" height="40">
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <strong>山田PM</strong>
                  <small class="text-muted">2024/12/15</small>
                </div>
                <div class="rating mb-2">
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <span class="ms-2">5.0</span>
                </div>
                <p class="mb-0">
                  技術力が非常に高く、チームのメンバーとのコミュニケーションも優秀でした。
                  難しい要件にも柔軟に対応してくれ、プロジェクトの成功に大きく貢献しました。
                </p>
              </div>
            </div>
          </div>
          
          <div class="comment-item">
            <div class="d-flex align-items-start">
              <img src="/images/avatar-lead.png" class="rounded-circle me-3" width="40" height="40">
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <strong>佐藤TL</strong>
                  <small class="text-muted">2024/02/20</small>
                </div>
                <div class="rating mb-2">
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star-fill text-warning"></i>
                  <i class="bi bi-star text-warning"></i>
                  <span class="ms-2">4.5</span>
                </div>
                <p class="mb-0">
                  Java、Springの知識が深く、チーム開発での経験も豊富です。
                  新しい技術への学習意欲も高く、安心してタスクを任せられます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 判定・アクションエリア
```html
<div class="row">
  <!-- 判定理由・備考 -->
  <div class="col-lg-8">
    <div class="card">
      <div class="card-header">
        <h6 class="card-title mb-0">
          <i class="bi bi-chat-square-text me-2"></i>判定理由・備考
        </h6>
      </div>
      <div class="card-body">
        <div class="mb-3">
          <label for="judgmentType" class="form-label">判定</label>
          <div class="btn-group w-100" role="group">
            <input type="radio" class="btn-check" name="judgment" id="select" value="select">
            <label class="btn btn-outline-success" for="select">
              <i class="bi bi-check-circle me-1"></i>選定
            </label>
            <input type="radio" class="btn-check" name="judgment" id="shortlist" value="shortlist">
            <label class="btn btn-outline-primary" for="shortlist">
              <i class="bi bi-star me-1"></i>候補者リスト
            </label>
            <input type="radio" class="btn-check" name="judgment" id="reject" value="reject">
            <label class="btn btn-outline-danger" for="reject">
              <i class="bi bi-x-circle me-1"></i>拒否
            </label>
          </div>
        </div>
        
        <div class="mb-3">
          <label for="judgmentReason" class="form-label">理由 <span class="text-danger">*</span></label>
          <textarea class="form-control" id="judgmentReason" rows="3" 
                    placeholder="判定理由を入力してください" required></textarea>
          <div class="invalid-feedback">
            判定理由を入力してください
          </div>
        </div>
        
        <div class="mb-3">
          <label for="additionalNotes" class="form-label">追加備考</label>
          <textarea class="form-control" id="additionalNotes" rows="2" 
                    placeholder="追加で記録したい情報があれば入力してください"></textarea>
        </div>
      </div>
    </div>
  </div>
  
  <!-- アクションボタン -->
  <div class="col-lg-4">
    <div class="card">
      <div class="card-header">
        <h6 class="card-title mb-0">
          <i class="bi bi-gear me-2"></i>アクション
        </h6>
      </div>
      <div class="card-body">
        <div class="d-grid gap-2">
          <button type="button" class="btn btn-success btn-lg" id="confirmSelectBtn" style="display: none;">
            <i class="bi bi-check-circle me-2"></i>選定確定
          </button>
          
          <button type="button" class="btn btn-primary btn-lg" id="confirmShortlistBtn" style="display: none;">
            <i class="bi bi-star me-2"></i>候補者リスト追加
          </button>
          
          <button type="button" class="btn btn-danger btn-lg" id="confirmRejectBtn" style="display: none;">
            <i class="bi bi-x-circle me-2"></i>拒否確定
          </button>
          
          <button type="button" class="btn btn-outline-secondary" id="saveForLaterBtn">
            <i class="bi bi-bookmark me-2"></i>後で判定
          </button>
          
          <hr>
          
          <button type="button" class="btn btn-outline-info" id="contactEngineerBtn">
            <i class="bi bi-telephone me-2"></i>技術者に連絡
          </button>
          
          <button type="button" class="btn btn-outline-warning" id="requestInterviewBtn">
            <i class="bi bi-camera-video me-2"></i>面談設定
          </button>
        </div>
        
        <div class="mt-3">
          <small class="text-muted">
            <i class="bi bi-info-circle me-1"></i>
            判定後は取り消しできません。慎重に選択してください。
          </small>
        </div>
      </div>
    </div>
  </div>
</div>
```

### JavaScript機能
```javascript
Alpine.data('candidateEvaluation', () => ({
  candidate: null,
  judgment: '',
  judgmentReason: '',
  additionalNotes: '',
  loading: false,

  init() {
    this.loadCandidateDetails();
    this.watchJudgmentSelection();
  },

  async loadCandidateDetails() {
    this.loading = true;
    try {
      const response = await fetch(`/api/matching-requests/${this.requestId}/candidates/${this.candidateId}`);
      this.candidate = await response.json();
    } catch (error) {
      this.showError('候補者詳細の読み込みに失敗しました');
    } finally {
      this.loading = false;
    }
  },

  watchJudgmentSelection() {
    document.querySelectorAll('input[name="judgment"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.judgment = e.target.value;
        this.updateActionButtons();
      });
    });
  },

  updateActionButtons() {
    // すべてのボタンを非表示
    document.getElementById('confirmSelectBtn').style.display = 'none';
    document.getElementById('confirmShortlistBtn').style.display = 'none';
    document.getElementById('confirmRejectBtn').style.display = 'none';
    
    // 選択された判定に応じてボタンを表示
    if (this.judgment === 'select') {
      document.getElementById('confirmSelectBtn').style.display = 'block';
    } else if (this.judgment === 'shortlist') {
      document.getElementById('confirmShortlistBtn').style.display = 'block';
    } else if (this.judgment === 'reject') {
      document.getElementById('confirmRejectBtn').style.display = 'block';
    }
  },

  async confirmAction() {
    if (!this.judgment || !this.judgmentReason.trim()) {
      this.showError('判定と理由を入力してください');
      return;
    }

    this.loading = true;
    try {
      let endpoint, method, body;

      if (this.judgment === 'select') {
        endpoint = `/api/matching-requests/${this.requestId}/candidates/${this.candidateId}/select`;
        method = 'POST';
        body = {
          selectionReason: this.judgmentReason,
          additionalNotes: this.additionalNotes
        };
      } else if (this.judgment === 'reject') {
        endpoint = `/api/matching-requests/${this.requestId}/candidates/${this.candidateId}/reject`;
        method = 'POST';
        body = {
          rejectionReason: this.judgmentReason,
          additionalNotes: this.additionalNotes
        };
      } else if (this.judgment === 'shortlist') {
        endpoint = `/api/matching-requests/${this.requestId}/candidates/${this.candidateId}`;
        method = 'PUT';
        body = {
          status: 'SHORTLISTED',
          notes: this.judgmentReason + (this.additionalNotes ? '\n\n' + this.additionalNotes : '')
        };
      }

      await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      this.showSuccess('判定を確定しました');
      
      // 結果画面に戻る
      setTimeout(() => {
        window.location.href = `/matching/results/${this.requestId}`;
      }, 1500);

    } catch (error) {
      this.showError('判定の確定に失敗しました');
    } finally {
      this.loading = false;
    }
  }
}));
```

### 画面遷移
- **判定完了**: MTG-02（マッチング結果画面）へ戻る
- **次候補者**: 同画面の次の候補者へ
- **面談設定**: 面談スケジュール画面へ
- **技術者連絡**: 連絡手段選択ダイアログ表示

---

## 04_マッチング履歴・統計画面

### 画面概要
- **画面ID**: MTG-04
- **画面名**: マッチング履歴・統計画面
- **URL**: `/matching/analytics`
- **目的**: 過去のマッチング履歴と統計データを表示し、マッチング精度の向上と意思決定を支援する

### レイアウト構成
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー                                                    │
├─────────────────────────────────────────────────────────────┤
│ マッチング分析ダッシュボード               [期間選択▼]      │
├─────────────────────────────────────────────────────────────┤
│ KPI概要                                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │総要求数 │ │完了率   │ │平均時間 │ │選定率   │         │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
├─────────────────────────────────────────────────────────────┤
│ チャート・グラフエリア                                      │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │マッチング推移   │ │スキル要求分析   │                     │
│ └─────────────────┘ └─────────────────┘                     │
├─────────────────────────────────────────────────────────────┤
│ 詳細データテーブル                                          │
│ [フィルター] [検索] [エクスポート]                          │
│ ┌───────────────────────────────────────────────────────────┐│
│ │履歴一覧テーブル                                           ││
│ └───────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ ページネーション                                            │
└─────────────────────────────────────────────────────────────┘
```

### 詳細仕様

#### 期間選択・フィルター
```html
<div class="d-flex justify-content-between align-items-center mb-4">
  <div>
    <h1 class="h3 mb-0">マッチング分析</h1>
    <p class="text-muted">マッチング履歴と統計データの分析</p>
  </div>
  <div class="d-flex gap-2">
    <div class="dropdown">
      <button class="btn btn-outline-secondary dropdown-toggle" type="button" 
              data-bs-toggle="dropdown">
        <i class="bi bi-calendar me-1"></i>
        <span id="periodLabel">今月</span>
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item" href="#" data-period="today">今日</a></li>
        <li><a class="dropdown-item" href="#" data-period="week">今週</a></li>
        <li><a class="dropdown-item" href="#" data-period="month">今月</a></li>
        <li><a class="dropdown-item" href="#" data-period="quarter">四半期</a></li>
        <li><a class="dropdown-item" href="#" data-period="year">今年</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="#" data-period="custom">カスタム期間</a></li>
      </ul>
    </div>
    <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#exportModal">
      <i class="bi bi-download me-1"></i>エクスポート
    </button>
    <button class="btn btn-primary" id="refreshDataBtn">
      <i class="bi bi-arrow-clockwise me-1"></i>更新
    </button>
  </div>
</div>
```

#### KPI概要カード
```html
<div class="row mb-4">
  <div class="col-md-3">
    <div class="card kpi-card border-primary">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-subtitle text-muted mb-2">総マッチング要求数</h6>
            <h2 class="card-title text-primary mb-0" id="totalRequests">156</h2>
            <div class="kpi-trend mt-2">
              <span class="text-success">
                <i class="bi bi-arrow-up"></i> +12.5%
              </span>
              <small class="text-muted ms-1">前月比</small>
            </div>
          </div>
          <div class="kpi-icon bg-primary text-white">
            <i class="bi bi-clipboard-data"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card kpi-card border-success">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-subtitle text-muted mb-2">完了率</h6>
            <h2 class="card-title text-success mb-0" id="completionRate">84.6%</h2>
            <div class="kpi-trend mt-2">
              <span class="text-success">
                <i class="bi bi-arrow-up"></i> +2.3%
              </span>
              <small class="text-muted ms-1">前月比</small>
            </div>
          </div>
          <div class="kpi-icon bg-success text-white">
            <i class="bi bi-check-circle"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card kpi-card border-info">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-subtitle text-muted mb-2">平均実行時間</h6>
            <h2 class="card-title text-info mb-0" id="averageTime">3.2分</h2>
            <div class="kpi-trend mt-2">
              <span class="text-success">
                <i class="bi bi-arrow-down"></i> -15%
              </span>
              <small class="text-muted ms-1">前月比</small>
            </div>
          </div>
          <div class="kpi-icon bg-info text-white">
            <i class="bi bi-clock"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card kpi-card border-warning">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="card-subtitle text-muted mb-2">選定率</h6>
            <h2 class="card-title text-warning mb-0" id="selectionRate">67.3%</h2>
            <div class="kpi-trend mt-2">
              <span class="text-danger">
                <i class="bi bi-arrow-down"></i> -3.1%
              </span>
              <small class="text-muted ms-1">前月比</small>
            </div>
          </div>
          <div class="kpi-icon bg-warning text-white">
            <i class="bi bi-person-check"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### チャート・グラフエリア
```html
<div class="row mb-4">
  <!-- マッチング推移チャート -->
  <div class="col-lg-8">
    <div class="card">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="card-title mb-0">
            <i class="bi bi-graph-up me-2"></i>マッチング推移
          </h5>
          <div class="btn-group btn-group-sm" role="group">
            <input type="radio" class="btn-check" name="chartPeriod" id="daily" checked>
            <label class="btn btn-outline-secondary" for="daily">日別</label>
            <input type="radio" class="btn-check" name="chartPeriod" id="weekly">
            <label class="btn btn-outline-secondary" for="weekly">週別</label>
            <input type="radio" class="btn-check" name="chartPeriod" id="monthly">
            <label class="btn btn-outline-secondary" for="monthly">月別</label>
          </div>
        </div>
      </div>
      <div class="card-body">
        <canvas id="matchingTrendChart" height="300"></canvas>
      </div>
    </div>
  </div>
  
  <!-- スキル要求分析 -->
  <div class="col-lg-4">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-pie-chart me-2"></i>人気スキル分析
        </h5>
      </div>
      <div class="card-body">
        <canvas id="skillDemandChart" height="300"></canvas>
        <div class="skill-ranking mt-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center">
              <span class="badge bg-primary me-2">1</span>
              <span>Java</span>
            </div>
            <strong>45件</strong>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center">
              <span class="badge bg-secondary me-2">2</span>
              <span>Python</span>
            </div>
            <strong>38件</strong>
          </div>
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center">
              <span class="badge bg-secondary me-2">3</span>
              <span>JavaScript</span>
            </div>
            <strong>32件</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="row mb-4">
  <!-- 成功率分析 -->
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-bullseye me-2"></i>成功率分析
        </h5>
      </div>
      <div class="card-body">
        <canvas id="successRateChart" height="250"></canvas>
      </div>
    </div>
  </div>
  
  <!-- 実行時間分布 -->
  <div class="col-lg-6">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">
          <i class="bi bi-hourglass me-2"></i>実行時間分布
        </h5>
      </div>
      <div class="card-body">
        <canvas id="executionTimeChart" height="250"></canvas>
      </div>
    </div>
  </div>
</div>
```

#### 詳細データテーブル
```html
<div class="card">
  <div class="card-header">
    <div class="d-flex justify-content-between align-items-center">
      <h5 class="card-title mb-0">
        <i class="bi bi-table me-2"></i>マッチング履歴
      </h5>
      <div class="d-flex gap-2">
        <div class="input-group" style="width: 250px;">
          <input type="text" class="form-control" id="searchInput" 
                 placeholder="プロジェクト名で検索...">
          <button class="btn btn-outline-secondary" type="button">
            <i class="bi bi-search"></i>
          </button>
        </div>
        <div class="dropdown">
          <button class="btn btn-outline-secondary dropdown-toggle" type="button" 
                  data-bs-toggle="dropdown">
            <i class="bi bi-funnel me-1"></i>フィルター
          </button>
          <div class="dropdown-menu p-3" style="min-width: 300px;">
            <div class="mb-3">
              <label class="form-label">ステータス</label>
              <select class="form-select" id="statusFilterHistory">
                <option value="">すべて</option>
                <option value="COMPLETED">完了</option>
                <option value="FAILED">失敗</option>
                <option value="CANCELLED">キャンセル</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">要求者</label>
              <select class="form-select" id="requesterFilter">
                <option value="">すべて</option>
                <option value="user1">田中太郎</option>
                <option value="user2">佐藤花子</option>
              </select>
            </div>
            <button class="btn btn-primary btn-sm w-100">適用</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th>
              <button class="btn btn-link p-0 text-decoration-none">
                実行日時 <i class="bi bi-arrow-down-up"></i>
              </button>
            </th>
            <th>プロジェクト</th>
            <th>要求者</th>
            <th>
              <button class="btn btn-link p-0 text-decoration-none">
                候補者数 <i class="bi bi-arrow-down-up"></i>
              </button>
            </th>
            <th>
              <button class="btn btn-link p-0 text-decoration-none">
                平均スコア <i class="bi bi-arrow-down-up"></i>
              </button>
            </th>
            <th>
              <button class="btn btn-link p-0 text-decoration-none">
                実行時間 <i class="bi bi-arrow-down-up"></i>
              </button>
            </th>
            <th>選定結果</th>
            <th>ステータス</th>
            <th width="100">操作</th>
          </tr>
        </thead>
        <tbody id="historyTableBody">
          <tr>
            <td>
              <time datetime="2025-06-01T10:30:00">
                2025/06/01<br>
                <small class="text-muted">10:30</small>
              </time>
            </td>
            <td>
              <div>
                <div class="fw-medium">ECサイトリニューアル</div>
                <small class="text-muted">プロジェクトID: PRJ-001</small>
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <img src="/images/avatar-user1.png" 
                     class="rounded-circle me-2" width="24" height="24">
                <span>田中太郎</span>
              </div>
            </td>
            <td>
              <span class="badge bg-primary">8名</span>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <span class="badge bg-success me-1">0.78</span>
                <div class="progress" style="width: 40px; height: 4px;">
                  <div class="progress-bar bg-success" style="width: 78%"></div>
                </div>
              </div>
            </td>
            <td>
              <span class="text-success">2.4秒</span>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle text-success me-1"></i>
                <span>選定済</span>
              </div>
            </td>
            <td>
              <span class="badge bg-success">完了</span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" data-action="view" title="詳細">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-outline-secondary" data-action="export" title="エクスポート">
                  <i class="bi bi-download"></i>
                </button>
              </div>
            </td>
          </tr>
          
          <tr>
            <td>
              <time datetime="2025-05-28T14:15:00">
                2025/05/28<br>
                <small class="text-muted">14:15</small>
              </time>
            </td>
            <td>
              <div>
                <div class="fw-medium">決済システム構築</div>
                <small class="text-muted">プロジェクトID: PRJ-002</small>
              </div>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <img src="/images/avatar-user2.png" 
                     class="rounded-circle me-2" width="24" height="24">
                <span>佐藤花子</span>
              </div>
            </td>
            <td>
              <span class="badge bg-warning">3名</span>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <span class="badge bg-warning me-1">0.65</span>
                <div class="progress" style="width: 40px; height: 4px;">
                  <div class="progress-bar bg-warning" style="width: 65%"></div>
                </div>
              </div>
            </td>
            <td>
              <span class="text-info">4.1秒</span>
            </td>
            <td>
              <div class="d-flex align-items-center">
                <i class="bi bi-clock text-warning me-1"></i>
                <span>検討中</span>
              </div>
            </td>
            <td>
              <span class="badge bg-warning">実行中</span>
            </td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" data-action="view" title="詳細">
                  <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-outline-secondary" data-action="export" title="エクスポート">
                  <i class="bi bi-download"></i>
                </button>
              </div>
            </td>
          </tr>
          <!-- 他の履歴行... -->
        </tbody>
      </table>
    </div>
  </div>
  
  <div class="card-footer">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <span class="text-muted">156件中 1-20件を表示</span>
      </div>
      <nav aria-label="ページネーション">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item disabled">
            <span class="page-link">前へ</span>
          </li>
          <li class="page-item active">
            <span class="page-link">1</span>
          </li>
          <li class="page-item">
            <a class="page-link" href="#">2</a>
          </li>
          <li class="page-item">
            <a class="page-link" href="#">3</a>
          </li>
          <li class="page-item">
            <a class="page-link" href="#">次へ</a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</div>
```

#### Chart.js実装
```javascript
// マッチング推移チャート
const matchingTrendCtx = document.getElementById('matchingTrendChart').getContext('2d');
const matchingTrendChart = new Chart(matchingTrendCtx, {
  type: 'line',
  data: {
    labels: ['6/1', '6/2', '6/3', '6/4', '6/5', '6/6', '6/7'],
    datasets: [
      {
        label: 'マッチング要求数',
        data: [12, 8, 15, 10, 14, 9, 11],
        borderColor: 'rgb(13, 110, 253)',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        tension: 0.1
      },
      {
        label: '成功数',
        data: [10, 7, 13, 8, 12, 8, 9],
        borderColor: 'rgb(25, 135, 84)',
        backgroundColor: 'rgba(25, 135, 84, 0.1)',
        tension: 0.1
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});

// スキル要求分析チャート
const skillDemandCtx = document.getElementById('skillDemandChart').getContext('2d');
const skillDemandChart = new Chart(skillDemandCtx, {
  type: 'doughnut',
  data: {
    labels: ['Java', 'Python', 'JavaScript', 'AWS', 'React', 'その他'],
    datasets: [{
      data: [45, 38, 32, 28, 22, 15],
      backgroundColor: [
        '#0d6efd',
        '#6f42c1',
        '#d63384',
        '#fd7e14',
        '#ffc107',
        '#6c757d'
      ]
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: false
      }
    }
  }
});

// 成功率分析チャート
const successRateCtx = document.getElementById('successRateChart').getContext('2d');
const successRateChart = new Chart(successRateCtx, {
  type: 'bar',
  data: {
    labels: ['Web系', 'インフラ', 'モバイル', 'AI/ML', 'SaaS'],
    datasets: [{
      label: '成功率 (%)',
      data: [85, 72, 78, 65, 88],
      backgroundColor: [
        'rgba(13, 110, 253, 0.8)',
        'rgba(25, 135, 84, 0.8)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(220, 53, 69, 0.8)',
        'rgba(111, 66, 193, 0.8)'
      ]
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  }
});

// 実行時間分布チャート
const executionTimeCtx = document.getElementById('executionTimeChart').getContext('2d');
const executionTimeChart = new Chart(executionTimeCtx, {
  type: 'histogram',
  data: {
    labels: ['0-2秒', '2-5秒', '5-10秒', '10-30秒', '30秒以上'],
    datasets: [{
      label: '件数',
      data: [45, 68, 32, 8, 3],
      backgroundColor: 'rgba(13, 202, 240, 0.8)'
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});
```

### 画面遷移
- **詳細表示**: MTG-02（マッチング結果画面）へ
- **新規マッチング**: MTG-01（条件設定画面）へ
- **エクスポート**: ファイルダウンロード

---

## 共通仕様

### 共通コンポーネント

#### エラーハンドリング
```html
<!-- エラーアラート -->
<div class="alert alert-danger alert-dismissible fade" id="errorAlert" style="display: none;">
  <div class="d-flex align-items-start">
    <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
    <div>
      <strong>エラーが発生しました</strong>
      <p class="mb-0" id="errorMessage"></p>
    </div>
  </div>
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>
```

#### ローディング表示
```html
<!-- ローディングオーバーレイ -->
<div class="loading-overlay" id="loadingOverlay" style="display: none;">
  <div class="loading-spinner">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">読み込み中...</span>
    </div>
    <p class="mt-2 text-muted">データを読み込んでいます...</p>
  </div>
</div>
```

#### 確認ダイアログ
```html
<!-- 確認モーダル -->
<div class="modal fade" id="confirmModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">確認</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="d-flex align-items-start">
          <div class="modal-icon bg-warning text-white rounded-circle me-3">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
          <div>
            <h6 id="confirmTitle">操作の確認</h6>
            <p class="text-muted mb-0" id="confirmMessage">この操作を実行しますか？</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">キャンセル</button>
        <button type="button" class="btn btn-primary" id="confirmActionBtn">実行</button>
      </div>
    </div>
  </div>
</div>
```

### セキュリティ仕様

#### 認証・認可
- **認証**: Keycloak OAuth2/OIDC
- **権限**: ロールベースアクセス制御（RBAC）
- **セッション**: JWT Token使用

#### データ保護
- **暗号化**: 技術者個人情報のAES-256暗号化
- **監査ログ**: 全操作の記録・追跡
- **データマスキング**: 表示時の個人情報保護

### パフォーマンス仕様

#### 応答時間目標
- **画面表示**: 2秒以内
- **検索・フィルタ**: 500ms以内
- **マッチング実行**: 10秒以内
- **データエクスポート**: 30秒以内

#### 最適化手法
- **仮想スクロール**: 大量データの効率表示
- **遅延読み込み**: 画像・チャートの必要時読み込み
- **キャッシュ活用**: API結果のクライアントサイドキャッシュ

---

## 技術仕様

### フロントエンド技術スタック
- **テンプレートエンジン**: Thymeleaf 3.1.x
- **CSSフレームワーク**: Bootstrap 5.3.x
- **JavaScript**: Alpine.js 3.x
- **AJAX**: htmx 1.9.x
- **チャート**: Chart.js 4.x

### APIインテグレーション
- **ベースURL**: `https://api.ses-mgr.com/matching/v1`
- **認証**: Bearer Token (JWT)
- **フォーマット**: JSON
- **エラーハンドリング**: 統一エラーレスポンス

### ブラウザサポート
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### レスポンシブ対応
- **モバイル**: 320px-767px
- **タブレット**: 768px-1023px
- **デスクトップ**: 1024px+

### アクセシビリティ
- **準拠基準**: WCAG 2.1 AA
- **キーボード**: 全機能操作可能
- **スクリーンリーダー**: 適切なARIA属性
- **色覚**: カラーコントラスト4.5:1以上

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月2日  
**承認者**: [承認者名]  
**バージョン**: 1.0.0