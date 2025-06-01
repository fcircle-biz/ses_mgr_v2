# Report Context 画面モック

## 概要

Report Context（レポート・分析）の画面モック集です。SES業務システムにおけるビジネスインテリジェンス、データ分析、レポーティング機能を網羅する4つの画面で構成されています。

## 画面構成

| ファイル名 | 画面名 | 主要機能 |
|-----------|--------|----------|
| `01_ダッシュボード・KPI表示画面.html` | 経営ダッシュボード | リアルタイムKPI監視、統計サマリー、ウィジェット管理 |
| `02_売上・収益分析レポート画面.html` | 売上・収益分析 | 財務パフォーマンス、収益予測、期間比較分析 |
| `03_技術者・案件分析レポート画面.html` | 技術者・案件分析 | 人材パフォーマンス、案件成功率、スキルトレンド |
| `04_カスタムレポート作成画面.html` | レポートビルダー | ドラッグ&ドロップレポート作成、テンプレート管理 |

## 技術仕様

### フロントエンド技術スタック
- **テンプレートエンジン**: Thymeleaf (Spring Boot連携対応)
- **CSSフレームワーク**: Bootstrap 5.3.2
- **JavaScriptフレームワーク**: Alpine.js 3.13.3
- **データ視覚化**: Chart.js 4.4.0
- **UI操作**: Sortable.js 1.15.0 (ドラッグ&ドロップ)

### 対応バックエンドAPI
- **Report Context API**: OpenAPI 3.0準拠
- **AnalyticsData集約**: CQRS読み取り専用モデル
- **ReportTemplate管理**: バージョン管理対応
- **Dashboard管理**: 動的ウィジェット構成

### レスポンシブ対応
- **デスクトップ**: 1200px以上（3カラムレイアウト）
- **タブレット**: 768px-1199px（2カラムレイアウト）
- **モバイル**: 767px以下（1カラムレイアウト）

## 詳細画面説明

### 1. ダッシュボード・KPI表示画面

**目的**: 経営陣・管理者向けのリアルタイム経営指標監視

**主要機能**:
- 📊 **KPI監視**: 売上成長率、稼働率、顧客満足度など6つの主要KPI
- 🚀 **クイック統計**: 今月売上、稼働案件数、技術者数、稼働率
- ⚡ **リアルタイム更新**: 5分間隔での自動データ更新
- 🎛️ **ダッシュボードカスタマイズ**: ウィジェット配置・表示期間変更
- 📈 **ドリルダウン**: KPIクリックで詳細分析画面へ遷移

**対応API**:
- `GET /analytics/dashboard/executive`
- `GET /kpis/current`
- `PUT /dashboards/{id}/layout`

### 2. 売上・収益分析レポート画面

**目的**: 財務担当者・経営陣向けの財務パフォーマンス分析

**主要機能**:
- 💰 **売上分析**: 月次売上推移、利益率、成長率
- 📊 **期間比較**: 前月比、前年同期比、予算比較
- 🔮 **収益予測**: 機械学習による今後3ヶ月の売上予測
- 🎯 **セグメント分析**: プロジェクト別、顧客別、技術領域別売上内訳
- 📄 **エクスポート**: CSV、Excel、PDF形式での出力

**対応API**:
- `GET /analytics/sales/revenue-trend`
- `GET /analytics/sales/forecast`
- `GET /analytics/sales/breakdown`
- `POST /reports/revenue/export`

### 3. 技術者・案件分析レポート画面

**目的**: 人事・運用担当者向けの人材・案件パフォーマンス分析

**主要機能**:
- 👥 **技術者分析**: 稼働率、評価、スキルレベル分布
- 📋 **案件分析**: 成功率、規模別分析、進行状況
- 🎯 **スキルトレンド**: 技術需要分析、スキルギャップ特定
- 💝 **マッチング分析**: 成功率、所要時間、効率性
- 📊 **タブ切り替え**: 技術者・案件・スキル・マッチングの4つの視点

**対応API**:
- `GET /analytics/engineers/utilization`
- `GET /analytics/projects/success-rate`
- `GET /analytics/skills/trend`
- `GET /analytics/matching/efficiency`

### 4. カスタムレポート作成画面

**目的**: 全ユーザー向けの柔軟なレポート作成ツール

**主要機能**:
- 🎨 **ドラッグ&ドロップ**: 直感的なレポート構築インターフェース
- 🧩 **コンポーネントパレット**: グラフ、テーブル、メトリクス、テキスト、画像
- 🔧 **設定パネル**: セクション設定、スケジュール、共有設定
- 👁️ **リアルタイムプレビュー**: 編集内容の即座反映
- ⏰ **スケジュール生成**: 日次/週次/月次の自動レポート生成
- 📧 **配信設定**: メールアドレス管理と自動配信

**対応API**:
- `POST /report-templates`
- `PUT /report-templates/{id}`
- `POST /report-templates/{id}/generate`
- `POST /report-templates/{id}/schedule`

## Alpine.js データ構造

### 共通パターン

```javascript
// 基本画面データ構造
Alpine.data('screenName', () => ({
    // UI状態管理
    selectedPeriod: 'month',
    isUpdating: false,
    lastUpdated: '15:30',
    
    // フィルター・設定
    filters: {
        period: 'month',
        category: 'all'
    },
    
    // データ
    metrics: {},
    chartData: [],
    
    // 初期化
    init() {
        this.initializeCharts();
        this.startAutoRefresh();
    },
    
    // チャート作成
    createChart(elementId, config) {
        const ctx = document.getElementById(elementId);
        return new Chart(ctx, config);
    }
}));
```

### カスタムレポートビルダー専用

```javascript
Alpine.data('customReportBuilder', () => ({
    // レポート設定
    reportConfig: {
        name: '',
        type: 'monthly',
        dataSources: []
    },
    
    // セクション管理
    reportSections: [],
    selectedSection: null,
    
    // ドラッグ&ドロップ
    draggedComponent: null,
    
    // ソート機能統合
    initSortable() {
        Sortable.create(element, {
            handle: '.drag-handle',
            onEnd: (evt) => {
                // セクション順序更新
            }
        });
    }
}));
```

## Chart.js 設定パターン

### 基本チャート設定

```javascript
// 線グラフ
{
    type: 'line',
    data: {
        labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
        datasets: [{
            label: 'データ系列',
            data: [65, 72, 68, 75, 80, 85],
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            tension: 0.4,
            fill: true
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' }
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
}

// 二軸グラフ（売上・利益率）
{
    type: 'line',
    data: {
        datasets: [{
            label: '売上',
            data: [65000000, 72000000, 85000000],
            yAxisID: 'y'
        }, {
            label: '利益率',
            data: [30.0, 30.0, 30.0],
            yAxisID: 'y1',
            type: 'line'
        }]
    },
    options: {
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                ticks: {
                    callback: (value) => (value / 1000000) + 'M円'
                }
            },
            y1: {
                type: 'linear',
                position: 'right',
                ticks: {
                    callback: (value) => value + '%'
                }
            }
        }
    }
}
```

## SESブランドカラーパレット

```css
:root {
    /* 基本色 */
    --ses-primary: #0d6efd;    /* メインブルー */
    --ses-secondary: #6c757d;   /* グレー */
    --ses-success: #198754;     /* グリーン */
    --ses-warning: #ffc107;     /* イエロー */
    --ses-danger: #dc3545;      /* レッド */
    --ses-info: #0dcaf0;        /* ライトブルー */
    
    /* 画面別アクセント色 */
    --revenue-color: #667eea;   /* 売上分析 */
    --engineer-color: #4facfe;  /* 技術者分析 */
    --project-color: #43e97b;   /* 案件分析 */
    --builder-primary: #6f42c1; /* レポートビルダー */
    
    /* KPI状態色 */
    --kpi-achieved: #00b894;    /* KPI達成 */
    --kpi-warning: #fdcb6e;     /* KPI注意 */
    --kpi-danger: #e17055;      /* KPI未達成 */
}
```

## パフォーマンス最適化

### Chart.js 最適化
- `maintainAspectRatio: false` でレスポンシブ対応
- 大量データの場合は `elements.point.radius: 0` で描画軽量化
- アニメーション無効化: `animation: false`

### Alpine.js 最適化
- `x-cloak` でFOUC（Flash of Unstyled Content）防止
- `$nextTick()` でDOM更新待機
- イベントリスナーの適切な削除

### CSS最適化
- CSS Grid/Flexboxによる効率的レイアウト
- `transform` を使用した滑らかなアニメーション
- メディアクエリによる段階的レスポンシブ対応

## 開発・保守ガイド

### 新しいチャート追加

1. **Alpine.jsデータに追加**:
```javascript
createNewChart() {
    const ctx = document.getElementById('newChart');
    return new Chart(ctx, {/* 設定 */});
}
```

2. **HTMLテンプレート追加**:
```html
<div class="chart-canvas">
    <canvas id="newChart"></canvas>
</div>
```

3. **初期化処理に追加**:
```javascript
init() {
    this.$nextTick(() => {
        this.createNewChart();
    });
}
```

### 新しいKPI追加

1. **データ構造拡張**:
```javascript
kpis: [{
    id: 'new-kpi',
    name: '新KPI',
    value: 0,
    target: 100,
    unit: '%',
    status: 'achieved'
}]
```

2. **表示ロジック追加**:
```javascript
formatKPIValue(value, unit) {
    if (unit === '%') return value.toFixed(1) + '%';
    return value.toString();
}
```

### カスタムコンポーネント追加

1. **コンポーネントパレットに追加**:
```html
<div class="component-item" draggable="true" @dragstart="startDrag($event, 'newType')">
    <i class="bi bi-new-icon component-icon"></i>
    <div class="component-name">新コンポーネント</div>
</div>
```

2. **処理ロジック追加**:
```javascript
getDefaultTitle(type) {
    const titles = {
        // 既存...
        newType: '新コンポーネント'
    };
    return titles[type] || 'セクション';
}
```

## セキュリティ考慮事項

- XSS対策: Alpine.jsの `x-text` 使用（HTML出力なし）
- CSRF対策: Thymeleafの自動CSRF トークン埋め込み
- 入力検証: フロントエンド・バックエンド双方での検証
- 認証連携: Keycloakとの統合前提

## 今後の拡張予定

- 📱 PWA対応（オフライン分析機能）
- 🤖 AI支援レポート生成
- 🔔 プッシュ通知連携
- 📊 リアルタイムデータストリーミング
- 🌍 多言語対応（i18n）

---

**作成日**: 2025年6月1日  
**更新日**: 2025年6月1日  
**作成者**: SES業務システム開発チーム