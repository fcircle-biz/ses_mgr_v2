# SES業務システム UI・UX設計ガイドライン

## 目次

1. [概要](#概要)
2. [デザインシステム](#デザインシステム)
3. [技術仕様](#技術仕様)
4. [コンポーネントライブラリ](#コンポーネントライブラリ)
5. [画面設計標準](#画面設計標準)
6. [アクセシビリティ基準](#アクセシビリティ基準)
7. [レスポンシブデザイン](#レスポンシブデザイン)
8. [ユーザビリティ指針](#ユーザビリティ指針)
9. [実装ガイドライン](#実装ガイドライン)
10. [品質基準](#品質基準)

---

## 概要

### 目的
SES業務システムにおける統一されたユーザーエクスペリエンスの提供と、効率的な開発・保守のためのUI/UX設計指針を定める。

### 対象システム
- **プロジェクト**: SES案件管理システム
- **ユーザー**: 営業担当、人事/採用、技術者、PM、経理、経営層
- **デバイス**: デスクトップ、タブレット、モバイル

### 設計原則

#### 1. ユーザー中心設計
- **使いやすさ優先**: 業務効率化を最優先
- **学習コスト最小**: 直感的な操作性
- **エラー防止**: 操作ミスを未然に防ぐ設計

#### 2. 一貫性
- **統一されたデザインシステム**: 全画面で統一されたUI
- **予測可能性**: 同様の操作は同様の結果
- **ブランド統一**: 企業イメージの一貫性

#### 3. アクセシビリティ
- **WCAG 2.1 AA準拠**: アクセシビリティ標準への準拠
- **多様なユーザー対応**: 障害の有無に関わらず利用可能
- **技術的配慮**: スクリーンリーダー、キーボード操作対応

#### 4. パフォーマンス
- **高速レスポンス**: 2秒以内の画面表示
- **効率的な情報表示**: 必要な情報への素早いアクセス
- **軽量設計**: モバイル環境での快適な動作

---

## デザインシステム

### カラーパレット

#### プライマリカラー
```css
:root {
  /* ブランドカラー */
  --ses-primary: #0d6efd;        /* メインブルー */
  --ses-primary-dark: #0b5ed7;   /* 濃いブルー */
  --ses-primary-light: #6ea8fe;  /* 薄いブルー */
  
  /* セカンダリカラー */
  --ses-secondary: #6c757d;      /* グレー */
  --ses-secondary-dark: #495057; /* 濃いグレー */
  --ses-secondary-light: #adb5bd; /* 薄いグレー */
}
```

#### 機能カラー
```css
:root {
  /* 状態表示カラー */
  --ses-success: #198754;    /* 成功・承認 */
  --ses-info: #0dcaf0;       /* 情報・通知 */
  --ses-warning: #ffc107;    /* 警告・注意 */
  --ses-danger: #dc3545;     /* エラー・危険 */
  
  /* 背景カラー */
  --ses-light: #f8f9fa;      /* 背景・区切り */
  --ses-dark: #212529;       /* テキスト・強調 */
  --ses-white: #ffffff;      /* 背景・カード */
  
  /* 境界線・シャドウ */
  --border-light: #dee2e6;   /* 薄い境界線 */
  --border-medium: #ced4da;  /* 標準境界線 */
  --border-dark: #adb5bd;    /* 濃い境界線 */
  --shadow-sm: 0 0.125rem 0.25rem rgba(0,0,0,0.075);
  --shadow-md: 0 0.5rem 1rem rgba(0,0,0,0.15);
  --shadow-lg: 0 1rem 3rem rgba(0,0,0,0.175);
}
```

#### ダークモード対応
```css
[data-bs-theme="dark"] {
  --ses-primary: #6ea8fe;
  --ses-secondary: #adb5bd;
  --ses-success: #75b798;
  --ses-info: #6edff6;
  --ses-warning: #ffda6a;
  --ses-danger: #ea868f;
  --ses-light: #343a40;
  --ses-dark: #f8f9fa;
  --ses-white: #212529;
}
```

### タイポグラフィ

#### フォントファミリー
```css
:root {
  /* 日本語対応フォント */
  --font-family-base: 
    "Hiragino Sans", 
    "ヒラギノ角ゴ ProN W3", 
    "Hiragino Kaku Gothic ProN", 
    "メイリオ", 
    "Meiryo", 
    "sans-serif";
    
  /* 英数字フォント */
  --font-family-code: 
    "SFMono-Regular", 
    "Consolas", 
    "Liberation Mono", 
    "Menlo", 
    "monospace";
}
```

#### フォントサイズ
```css
:root {
  /* フォントサイズ階層 */
  --font-size-xs: 0.75rem;   /* 12px - 補足情報 */
  --font-size-sm: 0.875rem;  /* 14px - 小見出し */
  --font-size-base: 1rem;    /* 16px - 基本テキスト */
  --font-size-lg: 1.125rem;  /* 18px - 重要テキスト */
  --font-size-xl: 1.25rem;   /* 20px - 見出し */
  --font-size-2xl: 1.5rem;   /* 24px - 大見出し */
  --font-size-3xl: 1.875rem; /* 30px - ページタイトル */
  
  /* 行の高さ */
  --line-height-tight: 1.25;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.75;
}
```

### 間隔・レイアウト

#### スペーシング
```css
:root {
  /* マージン・パディング */
  --spacing-1: 0.25rem;  /* 4px */
  --spacing-2: 0.5rem;   /* 8px */
  --spacing-3: 0.75rem;  /* 12px */
  --spacing-4: 1rem;     /* 16px */
  --spacing-5: 1.25rem;  /* 20px */
  --spacing-6: 1.5rem;   /* 24px */
  --spacing-8: 2rem;     /* 32px */
  --spacing-10: 2.5rem;  /* 40px */
  --spacing-12: 3rem;    /* 48px */
  --spacing-16: 4rem;    /* 64px */
}
```

#### ブレークポイント
```css
:root {
  /* レスポンシブブレークポイント */
  --breakpoint-sm: 576px;   /* 小型タブレット */
  --breakpoint-md: 768px;   /* タブレット */
  --breakpoint-lg: 1024px;  /* 小型デスクトップ */
  --breakpoint-xl: 1280px;  /* デスクトップ */
  --breakpoint-2xl: 1536px; /* 大型デスクトップ */
}
```

---

## 技術仕様

### フロントエンド技術スタック

#### 基盤技術
- **テンプレートエンジン**: Thymeleaf 3.1.x
- **CSSフレームワーク**: Bootstrap 5.3.x
- **JavaScript**: Alpine.js 3.x（軽量フレームワーク）
- **AJAX**: htmx 1.9.x（動的コンテンツ）
- **チャート**: Chart.js 4.x（グラフ・ダッシュボード）

#### ライブラリ構成
```html
<!-- CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
<link href="/css/ses-theme.css" rel="stylesheet">

<!-- JavaScript -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
<script src="https://unpkg.com/htmx.org@1.9.8"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
```

### パフォーマンス要件

#### ページ読み込み時間
- **初回表示**: < 2秒
- **画面遷移**: < 1秒
- **AJAX更新**: < 500ms
- **検索結果**: < 1秒

#### 最適化手法
- **CSS/JS圧縮**: 本番環境での最小化
- **画像最適化**: WebP形式、適切なサイズ
- **キャッシュ活用**: ブラウザキャッシュ、CDN利用
- **遅延読み込み**: 画像・チャートの必要時読み込み

---

## コンポーネントライブラリ

### 基本コンポーネント

#### 1. ボタン
```html
<!-- プライマリボタン -->
<button class="btn btn-primary">
  <i class="bi bi-plus me-2"></i>新規作成
</button>

<!-- セカンダリボタン -->
<button class="btn btn-outline-secondary">
  <i class="bi bi-download me-2"></i>エクスポート
</button>

<!-- 危険ボタン -->
<button class="btn btn-danger">
  <i class="bi bi-trash me-2"></i>削除
</button>

<!-- サイズバリエーション -->
<button class="btn btn-primary btn-sm">小</button>
<button class="btn btn-primary">標準</button>
<button class="btn btn-primary btn-lg">大</button>
```

#### 2. カード
```html
<!-- 基本カード -->
<div class="card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="card-title mb-0">タイトル</h5>
    <div class="card-actions">
      <button class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-three-dots"></i>
      </button>
    </div>
  </div>
  <div class="card-body">
    <p class="card-text">コンテンツ</p>
  </div>
  <div class="card-footer text-muted">
    <small>最終更新: 2025/06/01</small>
  </div>
</div>

<!-- 統計カード -->
<div class="card stats-card">
  <div class="card-body">
    <div class="d-flex align-items-center">
      <div class="stats-icon bg-primary text-white">
        <i class="bi bi-people"></i>
      </div>
      <div class="ms-3">
        <div class="stats-value">245</div>
        <div class="stats-label">技術者数</div>
      </div>
    </div>
    <div class="stats-trend mt-2">
      <span class="text-success">
        <i class="bi bi-arrow-up"></i> +5.2%
      </span>
      <span class="text-muted ms-1">前月比</span>
    </div>
  </div>
</div>
```

#### 3. テーブル
```html
<!-- データテーブル -->
<div class="table-responsive">
  <table class="table table-hover">
    <thead class="table-light">
      <tr>
        <th scope="col">
          <input type="checkbox" class="form-check-input">
        </th>
        <th scope="col">
          <button class="btn btn-link p-0 text-decoration-none">
            名前 <i class="bi bi-arrow-down-up"></i>
          </button>
        </th>
        <th scope="col">ステータス</th>
        <th scope="col">更新日</th>
        <th scope="col">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <input type="checkbox" class="form-check-input">
        </td>
        <td>
          <div class="d-flex align-items-center">
            <img src="/images/avatar.png" class="rounded-circle me-2" width="32" height="32">
            <div>
              <div class="fw-medium">田中太郎</div>
              <small class="text-muted">t.tanaka@example.com</small>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-success">稼働中</span>
        </td>
        <td>
          <time datetime="2025-06-01">2025/06/01</time>
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-secondary">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### 4. フォーム
```html
<!-- 標準フォーム -->
<form class="needs-validation" novalidate>
  <div class="row">
    <div class="col-md-6 mb-3">
      <label for="firstName" class="form-label">姓 <span class="text-danger">*</span></label>
      <input type="text" class="form-control" id="firstName" required>
      <div class="invalid-feedback">姓を入力してください。</div>
    </div>
    <div class="col-md-6 mb-3">
      <label for="lastName" class="form-label">名 <span class="text-danger">*</span></label>
      <input type="text" class="form-control" id="lastName" required>
      <div class="invalid-feedback">名を入力してください。</div>
    </div>
  </div>
  
  <div class="mb-3">
    <label for="email" class="form-label">メールアドレス <span class="text-danger">*</span></label>
    <input type="email" class="form-control" id="email" required>
    <div class="form-text">有効なメールアドレスを入力してください。</div>
    <div class="invalid-feedback">正しいメールアドレスを入力してください。</div>
  </div>
  
  <div class="mb-3">
    <label for="skills" class="form-label">スキル</label>
    <select class="form-select" id="skills" multiple>
      <option value="java">Java</option>
      <option value="python">Python</option>
      <option value="javascript">JavaScript</option>
    </select>
  </div>
  
  <div class="d-flex justify-content-end gap-2">
    <button type="button" class="btn btn-outline-secondary">キャンセル</button>
    <button type="submit" class="btn btn-primary">保存</button>
  </div>
</form>
```

#### 5. モーダル
```html
<!-- 標準モーダル -->
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
            <h6>この操作を実行しますか？</h6>
            <p class="text-muted mb-0">この操作は取り消すことができません。</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">キャンセル</button>
        <button type="button" class="btn btn-danger">実行</button>
      </div>
    </div>
  </div>
</div>
```

#### 6. 通知・アラート
```html
<!-- 成功アラート -->
<div class="alert alert-success alert-dismissible fade show" role="alert">
  <div class="d-flex align-items-start">
    <i class="bi bi-check-circle-fill me-2 mt-1"></i>
    <div>
      <strong>成功!</strong> データが正常に保存されました。
    </div>
  </div>
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>

<!-- エラーアラート -->
<div class="alert alert-danger alert-dismissible fade show" role="alert">
  <div class="d-flex align-items-start">
    <i class="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
    <div>
      <strong>エラー!</strong> データの保存に失敗しました。
      <ul class="mb-0 mt-2">
        <li>メールアドレスの形式が正しくありません</li>
        <li>必須項目が入力されていません</li>
      </ul>
    </div>
  </div>
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
</div>

<!-- トーストメッセージ -->
<div class="toast-container position-fixed top-0 end-0 p-3">
  <div class="toast show" role="alert">
    <div class="toast-header">
      <i class="bi bi-bell-fill text-primary me-2"></i>
      <strong class="me-auto">通知</strong>
      <small>2分前</small>
      <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">
      新しいメッセージが届きました。
    </div>
  </div>
</div>
```

### 専用コンポーネント

#### 1. データフィルター
```html
<!-- フィルターパネル -->
<div class="filter-panel bg-light p-3 rounded mb-4">
  <div class="row g-3">
    <div class="col-md-3">
      <label class="form-label">ステータス</label>
      <select class="form-select">
        <option value="">すべて</option>
        <option value="active">稼働中</option>
        <option value="inactive">待機中</option>
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label">スキル</label>
      <input type="text" class="form-control" placeholder="Java, Python...">
    </div>
    <div class="col-md-3">
      <label class="form-label">経験年数</label>
      <select class="form-select">
        <option value="">指定なし</option>
        <option value="1-3">1-3年</option>
        <option value="4-7">4-7年</option>
        <option value="8+">8年以上</option>
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label">&nbsp;</label>
      <div class="d-flex gap-2">
        <button class="btn btn-primary">検索</button>
        <button class="btn btn-outline-secondary">リセット</button>
      </div>
    </div>
  </div>
</div>
```

#### 2. プログレスステップ
```html
<!-- ステップインジケーター -->
<div class="progress-steps mb-4">
  <div class="step completed">
    <div class="step-indicator">
      <i class="bi bi-check"></i>
    </div>
    <div class="step-label">基本情報</div>
  </div>
  <div class="step active">
    <div class="step-indicator">2</div>
    <div class="step-label">スキル設定</div>
  </div>
  <div class="step">
    <div class="step-indicator">3</div>
    <div class="step-label">確認</div>
  </div>
</div>
```

#### 3. ダッシュボードウィジェット
```html
<!-- KPIウィジェット -->
<div class="row">
  <div class="col-md-3">
    <div class="card kpi-card">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-muted">今月の売上</h6>
            <h2 class="card-title">¥2,450,000</h2>
            <div class="kpi-trend text-success">
              <i class="bi bi-arrow-up"></i> +12.5%
            </div>
          </div>
          <div class="kpi-icon bg-success">
            <i class="bi bi-currency-yen"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- 他のKPIカード... -->
</div>
```

---

## 画面設計標準

### ページレイアウト構成

#### 1. 基本画面構造
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ページタイトル - SES業務システム</title>
</head>
<body>
  <!-- ヘッダー -->
  <header class="navbar">
    <!-- ヘッダーコンポーネント -->
  </header>
  
  <!-- メインコンテンツ -->
  <div class="d-flex">
    <!-- サイドバー -->
    <nav class="sidebar">
      <!-- ナビゲーション -->
    </nav>
    
    <!-- ページコンテンツ -->
    <main class="main-content">
      <div class="container-fluid p-4">
        <!-- ページヘッダー -->
        <div class="page-header mb-4">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h1 class="h3 mb-2">ページタイトル</h1>
              <p class="text-muted mb-0">ページの説明</p>
            </div>
            <div class="page-actions">
              <button class="btn btn-primary">アクション</button>
            </div>
          </div>
        </div>
        
        <!-- アラート -->
        <div class="alerts-container mb-4">
          <!-- 通知メッセージ -->
        </div>
        
        <!-- メインコンテンツ -->
        <div class="page-content">
          <!-- ページ固有のコンテンツ -->
        </div>
      </div>
    </main>
  </div>
  
  <!-- フッター -->
  <footer class="footer">
    <!-- フッターコンテンツ -->
  </footer>
</body>
</html>
```

#### 2. 一覧画面テンプレート
```html
<!-- 一覧画面構成 -->
<div class="page-content">
  <!-- フィルター・検索エリア -->
  <div class="filter-section mb-4">
    <!-- フィルターコンポーネント -->
  </div>
  
  <!-- 操作エリア -->
  <div class="actions-bar d-flex justify-content-between align-items-center mb-3">
    <div class="selection-info">
      <span class="text-muted">245件中 1-20件を表示</span>
    </div>
    <div class="bulk-actions">
      <button class="btn btn-outline-secondary" disabled>
        <i class="bi bi-download me-1"></i>エクスポート
      </button>
      <button class="btn btn-outline-danger" disabled>
        <i class="bi bi-trash me-1"></i>削除
      </button>
    </div>
  </div>
  
  <!-- データテーブル -->
  <div class="table-container">
    <!-- テーブルコンポーネント -->
  </div>
  
  <!-- ページネーション -->
  <div class="pagination-container mt-4">
    <nav aria-label="ページネーション">
      <ul class="pagination justify-content-center">
        <!-- ページネーション -->
      </ul>
    </nav>
  </div>
</div>
```

#### 3. 詳細・編集画面テンプレート
```html
<!-- 詳細画面構成 -->
<div class="page-content">
  <!-- タブナビゲーション -->
  <ul class="nav nav-tabs mb-4" role="tablist">
    <li class="nav-item">
      <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#basic">
        基本情報
      </button>
    </li>
    <li class="nav-item">
      <button class="nav-link" data-bs-toggle="tab" data-bs-target="#skills">
        スキル
      </button>
    </li>
    <li class="nav-item">
      <button class="nav-link" data-bs-toggle="tab" data-bs-target="#history">
        履歴
      </button>
    </li>
  </ul>
  
  <!-- タブコンテンツ -->
  <div class="tab-content">
    <div class="tab-pane fade show active" id="basic">
      <div class="row">
        <div class="col-lg-8">
          <!-- メインコンテンツ -->
          <div class="card">
            <div class="card-body">
              <!-- フォームまたは詳細情報 -->
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <!-- サイドバー情報 -->
          <div class="card">
            <div class="card-body">
              <!-- 関連情報 -->
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 他のタブ... -->
  </div>
</div>
```

#### 4. ダッシュボード画面テンプレート
```html
<!-- ダッシュボード構成 -->
<div class="page-content">
  <!-- KPIカード -->
  <div class="row mb-4">
    <div class="col-md-3">
      <div class="card kpi-card">
        <!-- KPI表示 -->
      </div>
    </div>
    <!-- 他のKPIカード... -->
  </div>
  
  <!-- チャート・グラフエリア -->
  <div class="row mb-4">
    <div class="col-lg-8">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title">売上推移</h5>
        </div>
        <div class="card-body">
          <canvas id="salesChart"></canvas>
        </div>
      </div>
    </div>
    <div class="col-lg-4">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title">スキル分布</h5>
        </div>
        <div class="card-body">
          <canvas id="skillChart"></canvas>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 最新情報・通知エリア -->
  <div class="row">
    <div class="col-lg-6">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title">最新の案件</h5>
        </div>
        <div class="card-body">
          <!-- 案件リスト -->
        </div>
      </div>
    </div>
    <div class="col-lg-6">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title">通知</h5>
        </div>
        <div class="card-body">
          <!-- 通知リスト -->
        </div>
      </div>
    </div>
  </div>
</div>
```

### ワイヤーフレーム指針

#### 1. 情報階層
```
Level 1: ページタイトル（H1）
├─ Level 2: セクション見出し（H2）
   ├─ Level 3: サブセクション（H3）
   └─ Level 4: 詳細項目（H4）
```

#### 2. コンテンツグループ化
- **カード単位**: 関連する情報をカードでグループ化
- **セクション分割**: 明確な区切り線や背景色で分離
- **視覚的階層**: 重要度に応じたサイズ・色・位置

#### 3. アクション配置
- **プライマリアクション**: 右上、または目立つ位置
- **セカンダリアクション**: プライマリの隣、または左側
- **危険なアクション**: 分離、確認ダイアログ必須

---

## アクセシビリティ基準

### WCAG 2.1 AA準拠

#### 1. 知覚可能（Perceivable）
- **代替テキスト**: 画像・アイコンに適切なalt属性
- **カラーコントラスト**: 4.5:1以上の比率維持
- **テキストサイズ**: 200%まで拡大可能
- **音声コンテンツ**: 字幕・手話対応

#### 2. 操作可能（Operable）
- **キーボード操作**: 全機能がキーボードで操作可能
- **フォーカス表示**: 明確なフォーカスインジケーター
- **時間制限**: 十分な時間または延長オプション
- **発作防止**: 点滅コンテンツの制限

#### 3. 理解可能（Understandable）
- **言語設定**: 適切なlang属性
- **一貫性**: 予測可能なナビゲーション
- **エラー処理**: 明確なエラーメッセージと修正方法
- **ヘルプ**: 複雑な入力への支援

#### 4. 堅牢性（Robust）
- **マークアップ**: 有効なHTML
- **支援技術**: スクリーンリーダー対応
- **将来性**: 技術変化への対応

### 実装方法

#### ARIA属性の使用
```html
<!-- ランドマーク -->
<nav role="navigation" aria-label="メインナビゲーション">
<main role="main" aria-label="メインコンテンツ">
<aside role="complementary" aria-label="関連情報">

<!-- 状態表示 -->
<button aria-expanded="false" aria-controls="menu">メニュー</button>
<div id="menu" aria-hidden="true">

<!-- ライブリージョン -->
<div aria-live="polite" aria-atomic="true">
  <!-- 動的に更新されるメッセージ -->
</div>

<!-- フォームラベル -->
<label for="email">メールアドレス</label>
<input type="email" id="email" aria-describedby="email-help" required>
<div id="email-help">有効なメールアドレスを入力してください</div>
```

#### キーボードナビゲーション
```javascript
// キーボードショートカット
document.addEventListener('keydown', (e) => {
  // Alt + 1: メインコンテンツへスキップ
  if (e.altKey && e.key === '1') {
    document.getElementById('main-content').focus();
  }
  
  // Alt + 2: ナビゲーションへ移動
  if (e.altKey && e.key === '2') {
    document.querySelector('[role="navigation"]').focus();
  }
  
  // Escape: モーダル・ドロップダウンを閉じる
  if (e.key === 'Escape') {
    closeActiveModals();
  }
});
```

#### スクリーンリーダー対応
```html
<!-- 読み上げ専用テキスト -->
<span class="visually-hidden">
  ページ内容が読み込まれました
</span>

<!-- データテーブルのヘッダー関連付け -->
<table>
  <thead>
    <tr>
      <th id="name">名前</th>
      <th id="status">ステータス</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td headers="name">田中太郎</td>
      <td headers="status">稼働中</td>
    </tr>
  </tbody>
</table>
```

---

## レスポンシブデザイン

### デバイス対応

#### ブレークポイント戦略
```css
/* Mobile First アプローチ */

/* スマートフォン (デフォルト) */
.container { width: 100%; padding: 1rem; }

/* タブレット (768px以上) */
@media (min-width: 768px) {
  .container { padding: 1.5rem; }
  .sidebar { display: block; }
}

/* デスクトップ (1024px以上) */
@media (min-width: 1024px) {
  .container { max-width: 1200px; margin: 0 auto; }
  .sidebar { width: 280px; }
}

/* 大型デスクトップ (1280px以上) */
@media (min-width: 1280px) {
  .container { max-width: 1400px; }
}
```

#### コンポーネント適応
```html
<!-- レスポンシブテーブル -->
<div class="table-responsive">
  <table class="table">
    <thead>
      <tr>
        <th>名前</th>
        <th class="d-none d-md-table-cell">メール</th>
        <th class="d-none d-lg-table-cell">電話</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div>田中太郎</div>
          <small class="d-md-none text-muted">t.tanaka@example.com</small>
        </td>
        <td class="d-none d-md-table-cell">t.tanaka@example.com</td>
        <td class="d-none d-lg-table-cell">090-1234-5678</td>
        <td>
          <button class="btn btn-sm btn-outline-primary">
            <i class="bi bi-eye"></i>
            <span class="d-none d-sm-inline"> 詳細</span>
          </button>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- レスポンシブカードグリッド -->
<div class="row">
  <div class="col-12 col-md-6 col-lg-4 mb-3">
    <div class="card">
      <!-- カードコンテンツ -->
    </div>
  </div>
</div>
```

#### ナビゲーション適応
```html
<!-- デスクトップ: サイドバー -->
<nav class="sidebar d-none d-lg-block">
  <!-- フルナビゲーション -->
</nav>

<!-- タブレット: 折りたたみサイドバー -->
<nav class="sidebar d-none d-md-block d-lg-none collapsed">
  <!-- アイコンのみ -->
</nav>

<!-- モバイル: オフキャンバス -->
<div class="offcanvas offcanvas-start d-md-none" id="mobileNav">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">メニュー</h5>
    <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
  </div>
  <div class="offcanvas-body">
    <!-- モバイルナビゲーション -->
  </div>
</div>
```

### タッチ最適化

#### タッチターゲット
```css
/* 最小タッチサイズ: 44px × 44px */
.btn, .nav-link, .form-control {
  min-height: 44px;
  min-width: 44px;
}

/* タッチ余白 */
.touch-target {
  padding: 0.75rem;
  margin: 0.25rem;
}

/* ホバー効果をタッチデバイスで無効化 */
@media (hover: hover) {
  .btn:hover {
    /* ホバー効果 */
  }
}
```

#### ジェスチャー対応
```javascript
// スワイプナビゲーション
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // 左スワイプ: サイドバー閉じる
      closeSidebar();
    } else {
      // 右スワイプ: サイドバー開く
      openSidebar();
    }
  }
}
```

---

## ユーザビリティ指針

### 認知負荷軽減

#### 1. 情報密度の調整
- **適切な余白**: コンテンツ間に十分なスペース
- **視覚的グループ化**: 関連情報をまとめて表示
- **段階的情報開示**: 詳細は必要時に展開

#### 2. 一貫性の確保
- **操作パターン**: 同じ操作は同じ方法で
- **視覚的手がかり**: 同じ機能には同じアイコン・色
- **用語統一**: システム全体で一貫した用語使用

#### 3. フィードバック提供
- **即座のレスポンス**: アクション結果の即座表示
- **進行状況表示**: 長時間処理のプログレスバー
- **状態表示**: 現在の状態を明確に示す

### エラー防止・回復

#### 1. 入力支援
```html
<!-- 入力制約とヒント -->
<div class="mb-3">
  <label for="password" class="form-label">パスワード</label>
  <input type="password" class="form-control" id="password" 
         minlength="8" maxlength="50" required
         pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$">
  <div class="form-text">
    8文字以上、大文字・小文字・数字を含む
  </div>
  <div class="invalid-feedback">
    パスワードは要件を満たしていません
  </div>
</div>

<!-- 入力候補・オートコンプリート -->
<input type="text" class="form-control" list="skills" placeholder="スキルを選択">
<datalist id="skills">
  <option value="Java">
  <option value="Python">
  <option value="JavaScript">
</datalist>
```

#### 2. 確認・取り消し
```html
<!-- 危険なアクション確認 -->
<button type="button" class="btn btn-danger" 
        data-bs-toggle="modal" data-bs-target="#deleteConfirm">
  削除
</button>

<!-- 確認モーダル -->
<div class="modal fade" id="deleteConfirm">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">削除確認</h5>
      </div>
      <div class="modal-body">
        <div class="alert alert-warning">
          <strong>注意:</strong> この操作は取り消せません。
        </div>
        <p>「<strong id="targetName"></strong>」を削除しますか？</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
          キャンセル
        </button>
        <button type="button" class="btn btn-danger">
          削除する
        </button>
      </div>
    </div>
  </div>
</div>
```

#### 3. 自動保存・復元
```javascript
// フォーム自動保存
function enableAutoSave(formSelector) {
  const form = document.querySelector(formSelector);
  const storageKey = `autosave_${form.id}`;
  
  // 既存データ復元
  const savedData = localStorage.getItem(storageKey);
  if (savedData) {
    const data = JSON.parse(savedData);
    Object.entries(data).forEach(([name, value]) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = value;
    });
  }
  
  // 自動保存
  form.addEventListener('input', debounce(() => {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, 1000));
  
  // 送信時にクリア
  form.addEventListener('submit', () => {
    localStorage.removeItem(storageKey);
  });
}
```

### 効率性向上

#### 1. キーボードショートカット
```javascript
// グローバルショートカット
const shortcuts = {
  'ctrl+s': () => saveCurrentForm(),
  'ctrl+n': () => createNew(),
  'ctrl+f': () => focusSearch(),
  'ctrl+shift+/': () => showShortcutHelp(),
  'alt+m': () => toggleMenu(),
  'escape': () => closeModals()
};

document.addEventListener('keydown', (e) => {
  const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.altKey ? 'alt+' : ''}${e.key.toLowerCase()}`;
  if (shortcuts[key]) {
    e.preventDefault();
    shortcuts[key]();
  }
});
```

#### 2. 一括操作
```html
<!-- 一括選択・操作 -->
<div class="bulk-actions-bar" style="display: none;">
  <div class="d-flex align-items-center">
    <span class="selected-count me-3">3件選択中</span>
    <div class="btn-group">
      <button class="btn btn-outline-primary">
        <i class="bi bi-download"></i> エクスポート
      </button>
      <button class="btn btn-outline-warning">
        <i class="bi bi-pencil"></i> 一括編集
      </button>
      <button class="btn btn-outline-danger">
        <i class="bi bi-trash"></i> 一括削除
      </button>
    </div>
    <button class="btn btn-link ms-auto">選択解除</button>
  </div>
</div>
```

#### 3. 検索・フィルタリング
```html
<!-- 高度検索 -->
<div class="search-advanced">
  <div class="input-group mb-3">
    <input type="text" class="form-control" placeholder="キーワード検索..."
           hx-get="/api/search" hx-trigger="keyup changed delay:300ms" hx-target="#search-results">
    <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
      フィルタ
    </button>
    <div class="dropdown-menu dropdown-menu-end p-3" style="min-width: 300px;">
      <div class="mb-3">
        <label class="form-label">期間</label>
        <select class="form-select">
          <option>今日</option>
          <option>今週</option>
          <option>今月</option>
        </select>
      </div>
      <div class="mb-3">
        <label class="form-label">ステータス</label>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" value="active" id="filter-active">
          <label class="form-check-label" for="filter-active">稼働中</label>
        </div>
      </div>
      <button class="btn btn-primary btn-sm">適用</button>
    </div>
  </div>
</div>
```

---

## 実装ガイドライン

### 開発フロー

#### 1. コンポーネント駆動開発
```
1. デザインシステム確認
   ↓
2. 既存コンポーネント検索
   ↓
3. 新規コンポーネント作成（必要時）
   ↓
4. ページ実装
   ↓
5. レスポンシブ対応
   ↓
6. アクセシビリティテスト
   ↓
7. ユーザビリティテスト
```

#### 2. CSS設計ルール
```css
/* BEM記法使用 */
.component {}
.component__element {}
.component--modifier {}

/* 具体例 */
.card {}
.card__header {}
.card__body {}
.card__footer {}
.card--highlighted {}

/* ユーティリティクラス */
.u-text-center { text-align: center !important; }
.u-margin-large { margin: 2rem !important; }
```

#### 3. JavaScript実装パターン
```javascript
// Alpine.js コンポーネント
Alpine.data('dataTable', () => ({
  items: [],
  selectedItems: [],
  loading: false,
  
  init() {
    this.loadData();
  },
  
  async loadData() {
    this.loading = true;
    try {
      const response = await fetch('/api/data');
      this.items = await response.json();
    } catch (error) {
      this.showError('データの読み込みに失敗しました');
    } finally {
      this.loading = false;
    }
  },
  
  toggleSelection(item) {
    const index = this.selectedItems.indexOf(item);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(item);
    }
  },
  
  get hasSelection() {
    return this.selectedItems.length > 0;
  }
}));
```

### コードレビュー観点

#### 1. UI品質チェック
- [ ] デザインシステム準拠
- [ ] レスポンシブ対応
- [ ] ブラウザ互換性
- [ ] アクセシビリティ
- [ ] パフォーマンス

#### 2. UX品質チェック
- [ ] 操作性・直感性
- [ ] エラーハンドリング
- [ ] フィードバック
- [ ] 一貫性
- [ ] 効率性

#### 3. 技術品質チェック
- [ ] マークアップ妥当性
- [ ] CSS最適化
- [ ] JavaScript品質
- [ ] セキュリティ
- [ ] 保守性

---

## 品質基準

### パフォーマンス基準

#### 読み込み速度
- **初回表示**: 2秒以内
- **画面遷移**: 1秒以内
- **検索結果**: 500ms以内
- **フォーム送信**: 1秒以内

#### Core Web Vitals
- **LCP (Largest Contentful Paint)**: 2.5秒以下
- **FID (First Input Delay)**: 100ms以下
- **CLS (Cumulative Layout Shift)**: 0.1以下

### アクセシビリティ基準

#### 自動テスト（必須）
- **axe-core**: 0件のエラー
- **WAVE**: 0件のエラー
- **Lighthouse**: 90点以上

#### 手動テスト（推奨）
- **キーボード操作**: 全機能操作可能
- **スクリーンリーダー**: 適切な読み上げ
- **色覚多様性**: 色以外での情報伝達

### ユーザビリティ基準

#### 操作性
- **学習時間**: 新機能5分以内で理解
- **タスク完了時間**: 既存比50%短縮
- **エラー発生率**: 5%以下
- **満足度**: 4.0/5.0以上

#### 互換性
- **ブラウザ**: Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
- **デバイス**: iPhone 12+、Android 10+、iPad、Windows、Mac
- **画面サイズ**: 320px〜2560px

### 保守性基準

#### コード品質
- **CSS**: 明確なクラス命名、適切な構造化
- **JavaScript**: ESLint準拠、適切なコメント
- **HTML**: 妥当なマークアップ、セマンティック

#### ドキュメント
- **スタイルガイド**: 全コンポーネント文書化
- **使用例**: 実装パターン明記
- **更新履歴**: 変更内容の記録

---

## 更新履歴

| バージョン | 更新日 | 更新内容 |
|------------|--------|----------|
| 1.0.0 | 2025/06/01 | 初版作成 |

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**承認者**: [承認者名]  
**次回レビュー**: 2025年7月1日