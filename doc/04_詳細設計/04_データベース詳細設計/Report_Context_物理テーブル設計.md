# Report Context 物理テーブル設計

## 概要

Report Context（レポート・分析管理）の物理データベース設計。CQRSパターンによる統計データ集約、KPI管理、ダッシュボード、レポート生成の効率的な実現を目指す。

### 対象集約
- **AnalyticsData集約**: 統計データ集約・分析の中核
- **Dashboard集約**: ダッシュボード管理
- **ReportTemplate集約**: レポートテンプレート管理

---

## テーブル設計

### 1. analytics_data（統計データテーブル）

```sql
-- AnalyticsData集約ルート
CREATE TABLE analytics_data (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 基本情報 ===
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SALES',                -- 売上統計
        'MATCHING',             -- マッチング統計
        'WORK_HOURS',           -- 労働時間統計
        'PROJECT',              -- 案件統計
        'ENGINEER',             -- 技術者統計
        'CUSTOMER',             -- 顧客統計
        'FINANCIAL'             -- 財務統計
    )),
    analytics_type              VARCHAR(20) NOT NULL CHECK (analytics_type IN (
        'DAILY',                -- 日次
        'WEEKLY',               -- 週次
        'MONTHLY',              -- 月次
        'QUARTERLY',            -- 四半期
        'YEARLY'                -- 年次
    )),
    
    -- === 対象期間 ===
    target_date                 DATE,
    target_year                 INTEGER,
    target_month                INTEGER CHECK (target_month >= 1 AND target_month <= 12),
    target_quarter              INTEGER CHECK (target_quarter >= 1 AND target_quarter <= 4),
    
    -- === 集計情報 ===
    aggregation_level           VARCHAR(20) NOT NULL CHECK (aggregation_level IN (
        'DAILY',                -- 日次
        'MONTHLY',              -- 月次
        'AGGREGATED'            -- 集約
    )),
    aggregation_key             VARCHAR(200) NOT NULL,
    
    -- === メトリクスデータ ===
    metrics                     JSONB NOT NULL,
    /*
    metrics構造:
    {
        "dailySales": 1000000,
        "invoiceCount": 5,
        "paymentReceived": 800000,
        "matchingSuccessRate": 85.5,
        "averageWorkingHours": 8.2,
        "customerSatisfaction": 4.3
    }
    */
    numeric_values              JSONB,
    /*
    numeric_values構造:
    {
        "total_amount": 1000000.00,
        "average_rate": 85.50,
        "count": 25
    }
    */
    text_values                 JSONB,
    /*
    text_values構造:
    {
        "status": "EXCELLENT",
        "trend": "INCREASING",
        "note": "順調な成長傾向"
    }
    */
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'CALCULATED' CHECK (status IN (
        'CALCULATING',          -- 算出中
        'CALCULATED',           -- 算出完了
        'ARCHIVED'              -- アーカイブ
    )),
    calculated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- === バージョン管理 ===
    version                     INTEGER NOT NULL DEFAULT 1,
    is_latest                   BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- === 関連情報 ===
    source_context              VARCHAR(50),
    source_event_ids            JSONB,
    /*
    source_event_ids構造:
    [
        {
            "eventType": "InvoiceIssued",
            "eventId": "uuid1",
            "occurredAt": "2025-06-01T10:00:00Z"
        }
    ]
    */
    
    -- === 計算設定 ===
    calculation_formula         TEXT,
    calculation_parameters      JSONB,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    data_version                INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_latest_analytics UNIQUE(category, analytics_type, aggregation_key) 
        WHERE is_latest = true AND deleted_at IS NULL,
    CONSTRAINT valid_target_period CHECK (
        (analytics_type = 'DAILY' AND target_date IS NOT NULL) OR
        (analytics_type = 'MONTHLY' AND target_year IS NOT NULL AND target_month IS NOT NULL) OR
        (analytics_type = 'QUARTERLY' AND target_year IS NOT NULL AND target_quarter IS NOT NULL) OR
        (analytics_type = 'YEARLY' AND target_year IS NOT NULL)
    ),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- インデックス
CREATE INDEX idx_analytics_data_category ON analytics_data(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_type ON analytics_data(analytics_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_target_date ON analytics_data(target_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_target_period ON analytics_data(target_year, target_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_status ON analytics_data(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_latest ON analytics_data(is_latest) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_calculated_at ON analytics_data(calculated_at) WHERE deleted_at IS NULL;

-- 複合インデックス（検索最適化）
CREATE INDEX idx_analytics_data_category_type ON analytics_data(category, analytics_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_category_date ON analytics_data(category, target_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_analytics_data_latest_category ON analytics_data(category, target_date, is_latest) WHERE deleted_at IS NULL;

-- メトリクス検索用GINインデックス
CREATE INDEX idx_analytics_data_metrics ON analytics_data USING GIN (metrics);
CREATE INDEX idx_analytics_data_numeric_values ON analytics_data USING GIN (numeric_values);
CREATE INDEX idx_analytics_data_text_values ON analytics_data USING GIN (text_values);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_analytics_data_updated_at
    BEFORE UPDATE ON analytics_data
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. kpi_definitions（KPI定義テーブル）

```sql
-- KPI定義マスターテーブル
CREATE TABLE kpi_definitions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === KPI基本情報 ===
    kpi_code                    VARCHAR(50) UNIQUE NOT NULL,
    kpi_name                    VARCHAR(200) NOT NULL,
    description                 TEXT,
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SALES',                -- 売上系
        'OPERATION',            -- 運用系
        'FINANCIAL',            -- 財務系
        'QUALITY',              -- 品質系
        'EFFICIENCY'            -- 効率系
    )),
    
    -- === 計算設定 ===
    calculation_formula         TEXT NOT NULL,
    formula_parameters          JSONB,
    /*
    formula_parameters構造:
    {
        "variables": [
            {
                "name": "total_sales",
                "source": "analytics_data",
                "field": "metrics.dailySales",
                "aggregation": "SUM"
            },
            {
                "name": "target_sales",
                "source": "static",
                "value": 10000000
            }
        ],
        "formula": "(total_sales / target_sales) * 100"
    }
    */
    
    -- === 目標値設定 ===
    target_value                DECIMAL(15,4),
    target_type                 VARCHAR(20) CHECK (target_type IN (
        'FIXED',                -- 固定値
        'PERCENTAGE',           -- パーセンテージ
        'RELATIVE',             -- 相対値
        'DYNAMIC'               -- 動的計算
    )),
    unit                        VARCHAR(20),
    
    -- === しきい値設定 ===
    thresholds                  JSONB,
    /*
    thresholds構造:
    {
        "excellent": {"min": 120, "color": "#4CAF50"},
        "good": {"min": 100, "color": "#8BC34A"},
        "warning": {"min": 80, "color": "#FF9800"},
        "critical": {"min": 0, "color": "#F44336"}
    }
    */
    
    -- === 表示設定 ===
    display_format              VARCHAR(20) DEFAULT 'NUMBER' CHECK (display_format IN (
        'NUMBER',               -- 数値
        'PERCENTAGE',           -- パーセンテージ
        'CURRENCY',             -- 通貨
        'DURATION'              -- 期間
    )),
    decimal_places              INTEGER DEFAULT 2,
    chart_type                  VARCHAR(20) DEFAULT 'LINE' CHECK (chart_type IN (
        'LINE',                 -- 線グラフ
        'BAR',                  -- 棒グラフ
        'GAUGE',                -- ゲージ
        'NUMBER'                -- 数値表示
    )),
    
    -- === 計算期間 ===
    calculation_period          VARCHAR(20) NOT NULL CHECK (calculation_period IN (
        'DAILY',                -- 日次
        'WEEKLY',               -- 週次
        'MONTHLY',              -- 月次
        'QUARTERLY',            -- 四半期
        'YEARLY'                -- 年次
    )),
    historical_periods          INTEGER DEFAULT 12,
    
    -- === アクセス制御 ===
    visibility_level            VARCHAR(20) DEFAULT 'DEPARTMENT' CHECK (visibility_level IN (
        'PUBLIC',               -- 全社公開
        'DEPARTMENT',           -- 部門限定
        'MANAGEMENT',           -- 管理職限定
        'EXECUTIVE'             -- 経営陣限定
    )),
    authorized_roles            JSONB,
    
    -- === ステータス ===
    is_active                   BOOLEAN DEFAULT TRUE,
    is_auto_calculate           BOOLEAN DEFAULT TRUE,
    calculation_schedule        VARCHAR(50),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_kpi_definitions_code ON kpi_definitions(kpi_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_definitions_category ON kpi_definitions(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_definitions_active ON kpi_definitions(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_definitions_period ON kpi_definitions(calculation_period) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_definitions_visibility ON kpi_definitions(visibility_level) WHERE deleted_at IS NULL;

-- パラメータ検索用GINインデックス
CREATE INDEX idx_kpi_definitions_parameters ON kpi_definitions USING GIN (formula_parameters);
CREATE INDEX idx_kpi_definitions_thresholds ON kpi_definitions USING GIN (thresholds);
CREATE INDEX idx_kpi_definitions_roles ON kpi_definitions USING GIN (authorized_roles);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_kpi_definitions_updated_at
    BEFORE UPDATE ON kpi_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. kpi_values（KPI値テーブル）

```sql
-- KPI値・計算結果テーブル
CREATE TABLE kpi_values (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_definition_id           UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
    
    -- === 計算対象期間 ===
    target_year                 INTEGER NOT NULL,
    target_month                INTEGER CHECK (target_month >= 1 AND target_month <= 12),
    target_quarter              INTEGER CHECK (target_quarter >= 1 AND target_quarter <= 4),
    target_date                 DATE,
    
    -- === KPI値 ===
    calculated_value            DECIMAL(18,6) NOT NULL,
    target_value                DECIMAL(18,6),
    achievement_rate            DECIMAL(8,4),
    
    -- === ステータス ===
    kpi_status                  VARCHAR(20) NOT NULL CHECK (kpi_status IN (
        'ACHIEVED',             -- 達成
        'WARNING',              -- 注意
        'NOT_ACHIEVED',         -- 未達成
        'UNKNOWN'               -- 不明
    )),
    status_color                VARCHAR(7) DEFAULT '#9E9E9E',
    
    -- === トレンド情報 ===
    previous_value              DECIMAL(18,6),
    change_amount               DECIMAL(18,6),
    change_rate                 DECIMAL(8,4),
    trend_direction             VARCHAR(20) CHECK (trend_direction IN (
        'INCREASING',           -- 上昇
        'DECREASING',           -- 下降
        'STABLE',               -- 安定
        'VOLATILE'              -- 変動
    )),
    
    -- === 計算詳細 ===
    calculation_details         JSONB,
    /*
    calculation_details構造:
    {
        "sourceData": {
            "total_sales": 10000000,
            "target_sales": 12000000
        },
        "calculationSteps": [
            "total_sales = 10,000,000",
            "target_sales = 12,000,000", 
            "achievement_rate = (10,000,000 / 12,000,000) * 100 = 83.33%"
        ],
        "dataQuality": "HIGH",
        "missingData": []
    }
    */
    
    -- === 計算情報 ===
    calculated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    calculation_duration_ms     INTEGER,
    is_estimated                BOOLEAN DEFAULT FALSE,
    estimation_reason           TEXT,
    
    -- === 検証情報 ===
    is_verified                 BOOLEAN DEFAULT FALSE,
    verified_by                 UUID,
    verified_at                 TIMESTAMP WITH TIME ZONE,
    verification_notes          TEXT,
    
    -- === アラート情報 ===
    alert_level                 VARCHAR(20) CHECK (alert_level IN (
        'NONE',                 -- アラートなし
        'INFO',                 -- 情報
        'WARNING',              -- 警告
        'CRITICAL'              -- 重大
    )),
    alert_message               TEXT,
    alert_sent                  BOOLEAN DEFAULT FALSE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_kpi_period UNIQUE(kpi_definition_id, target_year, target_month, target_date) 
        WHERE deleted_at IS NULL,
    CONSTRAINT valid_achievement_rate CHECK (achievement_rate >= 0),
    CONSTRAINT valid_change_rate CHECK (change_rate >= -100)
);

-- インデックス
CREATE INDEX idx_kpi_values_definition_id ON kpi_values(kpi_definition_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_target_date ON kpi_values(target_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_target_period ON kpi_values(target_year, target_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_status ON kpi_values(kpi_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_calculated_at ON kpi_values(calculated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_alert_level ON kpi_values(alert_level) WHERE deleted_at IS NULL;

-- トレンド分析用複合インデックス
CREATE INDEX idx_kpi_values_trend ON kpi_values(kpi_definition_id, target_year, target_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_kpi_values_achievement ON kpi_values(kpi_definition_id, achievement_rate DESC) WHERE deleted_at IS NULL;

-- 計算詳細検索用GINインデックス
CREATE INDEX idx_kpi_values_calculation_details ON kpi_values USING GIN (calculation_details);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_kpi_values_updated_at
    BEFORE UPDATE ON kpi_values
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. dashboards（ダッシュボードテーブル）

```sql
-- ダッシュボード定義テーブル
CREATE TABLE dashboards (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === ダッシュボード基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    dashboard_type              VARCHAR(20) NOT NULL CHECK (dashboard_type IN (
        'EXECUTIVE',            -- 経営ダッシュボード
        'SALES',                -- 営業ダッシュボード
        'OPERATIONAL',          -- 運用ダッシュボード
        'FINANCIAL',            -- 財務ダッシュボード
        'PERSONAL'              -- 個人ダッシュボード
    )),
    
    -- === レイアウト設定 ===
    layout_config               JSONB,
    /*
    layout_config構造:
    {
        "gridSize": 12,
        "rowHeight": 100,
        "margin": [10, 10],
        "responsive": true,
        "breakpoints": {
            "lg": 1200,
            "md": 996,
            "sm": 768,
            "xs": 480
        }
    }
    */
    theme                       VARCHAR(20) DEFAULT 'DEFAULT' CHECK (theme IN (
        'DEFAULT',              -- デフォルト
        'DARK',                 -- ダーク
        'LIGHT',                -- ライト
        'CORPORATE'             -- コーポレート
    )),
    
    -- === アクセス制御 ===
    visibility                  VARCHAR(20) DEFAULT 'PRIVATE' CHECK (visibility IN (
        'PUBLIC',               -- 全社公開
        'DEPARTMENT',           -- 部門公開
        'TEAM',                 -- チーム公開
        'PRIVATE'               -- 個人
    )),
    owner_id                    UUID NOT NULL,
    authorized_users            JSONB,
    /*
    authorized_users構造:
    [
        {
            "userId": "uuid1",
            "userName": "田中太郎",
            "permission": "READ"
        },
        {
            "userId": "uuid2", 
            "userName": "佐藤花子",
            "permission": "WRITE"
        }
    ]
    */
    authorized_roles            JSONB,
    
    -- === 更新設定 ===
    auto_refresh                BOOLEAN DEFAULT TRUE,
    refresh_interval_minutes    INTEGER DEFAULT 15 CHECK (refresh_interval_minutes > 0),
    last_refreshed_at           TIMESTAMP WITH TIME ZONE,
    
    -- === 使用統計 ===
    view_count                  INTEGER DEFAULT 0,
    last_viewed_at              TIMESTAMP WITH TIME ZONE,
    favorite_count              INTEGER DEFAULT 0,
    
    -- === ステータス ===
    is_active                   BOOLEAN DEFAULT TRUE,
    is_template                 BOOLEAN DEFAULT FALSE,
    template_category           VARCHAR(50),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_dashboards_name ON dashboards(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_type ON dashboards(dashboard_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_owner ON dashboards(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_visibility ON dashboards(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_active ON dashboards(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_template ON dashboards(is_template) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboards_last_viewed ON dashboards(last_viewed_at) WHERE deleted_at IS NULL;

-- アクセス制御検索用GINインデックス
CREATE INDEX idx_dashboards_authorized_users ON dashboards USING GIN (authorized_users);
CREATE INDEX idx_dashboards_authorized_roles ON dashboards USING GIN (authorized_roles);
CREATE INDEX idx_dashboards_layout_config ON dashboards USING GIN (layout_config);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_dashboards_updated_at
    BEFORE UPDATE ON dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 5. dashboard_widgets（ダッシュボードウィジェットテーブル）

```sql
-- ダッシュボードウィジェットテーブル
CREATE TABLE dashboard_widgets (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id                UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    
    -- === ウィジェット基本情報 ===
    title                       VARCHAR(200) NOT NULL,
    description                 TEXT,
    widget_type                 VARCHAR(20) NOT NULL CHECK (widget_type IN (
        'CHART',                -- グラフ
        'NUMBER',               -- 数値
        'TABLE',                -- テーブル
        'GAUGE',                -- ゲージ
        'TEXT',                 -- テキスト
        'KPI',                  -- KPI表示
        'LIST'                  -- リスト
    )),
    
    -- === レイアウト設定 ===
    position_x                  INTEGER NOT NULL DEFAULT 0,
    position_y                  INTEGER NOT NULL DEFAULT 0,
    width                       INTEGER NOT NULL DEFAULT 1,
    height                      INTEGER NOT NULL DEFAULT 1,
    position_order              INTEGER DEFAULT 0,
    
    -- === データソース設定 ===
    data_source_type            VARCHAR(20) NOT NULL CHECK (data_source_type IN (
        'ANALYTICS',            -- 統計データ
        'KPI',                  -- KPI
        'QUERY',                -- カスタムクエリ
        'API',                  -- 外部API
        'STATIC'                -- 静的データ
    )),
    data_source_config          JSONB,
    /*
    data_source_config構造:
    {
        "sourceTable": "analytics_data",
        "category": "SALES",
        "metrics": ["daily_sales", "invoice_count"],
        "filters": {
            "target_date": "LAST_30_DAYS",
            "status": "CALCULATED"
        },
        "aggregation": "SUM",
        "groupBy": "target_date"
    }
    */
    
    -- === 表示設定 ===
    chart_config                JSONB,
    /*
    chart_config構造:
    {
        "chartType": "LINE",
        "colors": ["#1f77b4", "#ff7f0e", "#2ca02c"],
        "legend": true,
        "grid": true,
        "axes": {
            "x": {"label": "日付", "format": "YYYY-MM-DD"},
            "y": {"label": "売上金額", "format": "CURRENCY"}
        },
        "annotations": []
    }
    */
    display_options             JSONB,
    /*
    display_options構造:
    {
        "showTitle": true,
        "showBorder": true,
        "backgroundColor": "#ffffff",
        "fontSize": 14,
        "numberFormat": {
            "style": "CURRENCY",
            "currency": "JPY",
            "minimumFractionDigits": 0
        }
    }
    */
    
    -- === キャッシュ設定 ===
    cache_enabled               BOOLEAN DEFAULT TRUE,
    cache_duration_minutes      INTEGER DEFAULT 15,
    cached_data                 JSONB,
    cache_expires_at            TIMESTAMP WITH TIME ZONE,
    last_data_fetch_at          TIMESTAMP WITH TIME ZONE,
    
    -- === リフレッシュ設定 ===
    auto_refresh                BOOLEAN DEFAULT TRUE,
    refresh_interval_minutes    INTEGER DEFAULT 5,
    last_refreshed_at           TIMESTAMP WITH TIME ZONE,
    
    -- === フィルター設定 ===
    filters                     JSONB,
    /*
    filters構造:
    [
        {
            "field": "target_date",
            "operator": "BETWEEN",
            "value": ["2025-05-01", "2025-05-31"],
            "label": "対象期間"
        },
        {
            "field": "category",
            "operator": "IN",
            "value": ["SALES", "FINANCIAL"],
            "label": "カテゴリ"
        }
    ]
    */
    
    -- === アラート設定 ===
    alert_enabled               BOOLEAN DEFAULT FALSE,
    alert_conditions            JSONB,
    /*
    alert_conditions構造:
    {
        "thresholds": [
            {
                "metric": "achievement_rate",
                "operator": "LT",
                "value": 80,
                "severity": "WARNING",
                "message": "目標達成率が80%を下回りました"
            }
        ],
        "recipients": ["admin@company.com"]
    }
    */
    
    -- === ステータス ===
    is_visible                  BOOLEAN DEFAULT TRUE,
    is_loading                  BOOLEAN DEFAULT FALSE,
    error_message               TEXT,
    error_occurred_at           TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_position CHECK (position_x >= 0 AND position_y >= 0),
    CONSTRAINT valid_size CHECK (width > 0 AND height > 0),
    CONSTRAINT valid_refresh_interval CHECK (refresh_interval_minutes > 0)
);

-- インデックス
CREATE INDEX idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(widget_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_widgets_position ON dashboard_widgets(dashboard_id, position_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_widgets_data_source ON dashboard_widgets(data_source_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_widgets_visible ON dashboard_widgets(is_visible) WHERE deleted_at IS NULL;
CREATE INDEX idx_dashboard_widgets_cache_expires ON dashboard_widgets(cache_expires_at) WHERE deleted_at IS NULL;

-- 設定検索用GINインデックス
CREATE INDEX idx_dashboard_widgets_data_config ON dashboard_widgets USING GIN (data_source_config);
CREATE INDEX idx_dashboard_widgets_chart_config ON dashboard_widgets USING GIN (chart_config);
CREATE INDEX idx_dashboard_widgets_filters ON dashboard_widgets USING GIN (filters);
CREATE INDEX idx_dashboard_widgets_alert_conditions ON dashboard_widgets USING GIN (alert_conditions);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_dashboard_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 6. report_templates（レポートテンプレートテーブル）

```sql
-- レポートテンプレートテーブル
CREATE TABLE report_templates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === テンプレート基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    template_code               VARCHAR(50) UNIQUE NOT NULL,
    report_type                 VARCHAR(20) NOT NULL CHECK (report_type IN (
        'DAILY',                -- 日次
        'WEEKLY',               -- 週次  
        'MONTHLY',              -- 月次
        'QUARTERLY',            -- 四半期
        'YEARLY',               -- 年次
        'AD_HOC'                -- アドホック
    )),
    report_category             VARCHAR(20) NOT NULL CHECK (report_category IN (
        'SALES',                -- 売上レポート
        'FINANCIAL',            -- 財務レポート
        'OPERATIONAL',          -- 運用レポート
        'HR',                   -- 人事レポート
        'EXECUTIVE'             -- 経営レポート
    )),
    
    -- === テンプレート定義 ===
    template_content            TEXT NOT NULL,
    template_format             VARCHAR(20) DEFAULT 'HTML' CHECK (template_format IN (
        'HTML',                 -- HTML
        'MARKDOWN',             -- Markdown
        'PDF',                  -- PDF
        'EXCEL',                -- Excel
        'JSON'                  -- JSON
    )),
    template_engine             VARCHAR(20) DEFAULT 'THYMELEAF' CHECK (template_engine IN (
        'THYMELEAF',            -- Thymeleaf
        'VELOCITY',             -- Velocity
        'FREEMARKER',           -- FreeMarker
        'CUSTOM'                -- カスタム
    )),
    
    -- === パラメータ定義 ===
    parameters                  JSONB,
    /*
    parameters構造:
    [
        {
            "name": "target_period",
            "type": "DATE_RANGE",
            "required": true,
            "defaultValue": "LAST_MONTH",
            "description": "対象期間"
        },
        {
            "name": "include_details",
            "type": "BOOLEAN",
            "required": false,
            "defaultValue": true,
            "description": "詳細情報を含める"
        }
    ]
    */
    
    -- === データソース定義 ===
    data_sources                JSONB,
    /*
    data_sources構造:
    [
        {
            "name": "sales_analytics",
            "type": "ANALYTICS_DATA",
            "category": "SALES",
            "aggregation": "MONTHLY",
            "fields": ["total_sales", "invoice_count"]
        },
        {
            "name": "kpi_data",
            "type": "KPI_VALUES",
            "kpiCodes": ["SALES_GROWTH", "CUSTOMER_SATISFACTION"]
        }
    ]
    */
    
    -- === 生成設定 ===
    is_active                   BOOLEAN DEFAULT TRUE,
    auto_generate               BOOLEAN DEFAULT FALSE,
    generation_schedule         JSONB,
    /*
    generation_schedule構造:
    {
        "enabled": true,
        "cronExpression": "0 0 9 1 * ?",
        "timezone": "Asia/Tokyo",
        "description": "毎月1日 9:00に実行"
    }
    */
    
    -- === 配信設定 ===
    distribution_enabled        BOOLEAN DEFAULT FALSE,
    recipients                  JSONB,
    /*
    recipients構造:
    [
        {
            "type": "EMAIL",
            "address": "manager@company.com",
            "name": "部長",
            "format": "PDF"
        },
        {
            "type": "SLACK",
            "channel": "#management",
            "format": "HTML"
        }
    ]
    */
    
    -- === セクション定義 ===
    sections                    JSONB,
    /*
    sections構造:
    [
        {
            "id": "summary",
            "name": "サマリー",
            "order": 1,
            "type": "OVERVIEW",
            "dataSource": "sales_analytics",
            "template": "<h2>売上サマリー</h2>..."
        },
        {
            "id": "charts",
            "name": "グラフ",
            "order": 2,
            "type": "CHART",
            "chartConfig": {...}
        }
    ]
    */
    
    -- === バージョン管理 ===
    version                     INTEGER NOT NULL DEFAULT 1,
    is_latest_version           BOOLEAN DEFAULT TRUE,
    parent_template_id          UUID REFERENCES report_templates(id),
    
    -- === 使用統計 ===
    usage_count                 INTEGER DEFAULT 0,
    last_generated_at           TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    template_version            INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_template_code_version UNIQUE(template_code, version) WHERE deleted_at IS NULL,
    CONSTRAINT single_latest_version EXCLUDE (template_code WITH =, is_latest_version WITH =) 
        WHERE (is_latest_version = true AND deleted_at IS NULL)
);

-- インデックス
CREATE INDEX idx_report_templates_name ON report_templates(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_code ON report_templates(template_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_type ON report_templates(report_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_category ON report_templates(report_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_active ON report_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_auto_generate ON report_templates(auto_generate) WHERE deleted_at IS NULL;
CREATE INDEX idx_report_templates_latest ON report_templates(is_latest_version) WHERE deleted_at IS NULL;

-- テンプレート設定検索用GINインデックス
CREATE INDEX idx_report_templates_parameters ON report_templates USING GIN (parameters);
CREATE INDEX idx_report_templates_data_sources ON report_templates USING GIN (data_sources);
CREATE INDEX idx_report_templates_recipients ON report_templates USING GIN (recipients);
CREATE INDEX idx_report_templates_sections ON report_templates USING GIN (sections);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 7. generated_reports（生成レポートテーブル）

```sql
-- 生成レポート履歴テーブル
CREATE TABLE generated_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_template_id          UUID NOT NULL REFERENCES report_templates(id),
    
    -- === レポート基本情報 ===
    report_name                 VARCHAR(200) NOT NULL,
    report_title                VARCHAR(300),
    target_period_start         DATE,
    target_period_end           DATE,
    target_year                 INTEGER,
    target_month                INTEGER,
    
    -- === 生成情報 ===
    generation_status           VARCHAR(20) NOT NULL DEFAULT 'GENERATING' CHECK (generation_status IN (
        'GENERATING',           -- 生成中
        'COMPLETED',            -- 完了
        'FAILED',               -- 失敗
        'CANCELLED'             -- キャンセル
    )),
    generated_at                TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generation_duration_ms      INTEGER,
    
    -- === レポート内容 ===
    report_content              TEXT,
    report_format               VARCHAR(20) NOT NULL,
    file_path                   VARCHAR(500),
    file_size_bytes             BIGINT,
    
    -- === 生成パラメータ ===
    generation_parameters       JSONB,
    /*
    generation_parameters構造:
    {
        "targetPeriod": "2025-05",
        "includeDetails": true,
        "format": "PDF",
        "locale": "ja_JP",
        "timezone": "Asia/Tokyo"
    }
    */
    
    -- === データ統計 ===
    data_source_summary         JSONB,
    /*
    data_source_summary構造:
    {
        "analytics_data": {
            "recordCount": 31,
            "dateRange": "2025-05-01 to 2025-05-31"
        },
        "kpi_values": {
            "recordCount": 12,
            "kpiCodes": ["SALES_GROWTH", "CUSTOMER_SATISFACTION"]
        }
    }
    */
    
    -- === エラー情報 ===
    error_message               TEXT,
    error_details               JSONB,
    retry_count                 INTEGER DEFAULT 0,
    
    -- === 配信情報 ===
    distribution_status         VARCHAR(20) DEFAULT 'PENDING' CHECK (distribution_status IN (
        'PENDING',              -- 配信待ち
        'DISTRIBUTING',         -- 配信中
        'DISTRIBUTED',          -- 配信完了
        'FAILED',               -- 配信失敗
        'SKIPPED'               -- スキップ
    )),
    distributed_at              TIMESTAMP WITH TIME ZONE,
    distribution_log            JSONB,
    
    -- === アクセス制御 ===
    visibility                  VARCHAR(20) DEFAULT 'PRIVATE' CHECK (visibility IN (
        'PUBLIC',               -- 全社公開
        'DEPARTMENT',           -- 部門公開
        'PRIVATE'               -- 限定公開
    )),
    authorized_users            JSONB,
    download_count              INTEGER DEFAULT 0,
    last_accessed_at            TIMESTAMP WITH TIME ZONE,
    
    -- === 有効期限 ===
    expires_at                  TIMESTAMP WITH TIME ZONE,
    auto_delete_after_days      INTEGER DEFAULT 90,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_target_period CHECK (
        target_period_start IS NULL OR target_period_end IS NULL OR 
        target_period_start <= target_period_end
    ),
    CONSTRAINT valid_generation_duration CHECK (generation_duration_ms >= 0),
    CONSTRAINT valid_file_size CHECK (file_size_bytes >= 0)
);

-- インデックス
CREATE INDEX idx_generated_reports_template_id ON generated_reports(report_template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_status ON generated_reports(generation_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_generated_at ON generated_reports(generated_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_target_period ON generated_reports(target_year, target_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_expires_at ON generated_reports(expires_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_distribution_status ON generated_reports(distribution_status) WHERE deleted_at IS NULL;

-- レポート履歴検索用複合インデックス
CREATE INDEX idx_generated_reports_template_period ON generated_reports(report_template_id, target_year, target_month) 
WHERE deleted_at IS NULL;
CREATE INDEX idx_generated_reports_name_date ON generated_reports(report_name, generated_at DESC) WHERE deleted_at IS NULL;

-- パラメータ検索用GINインデックス
CREATE INDEX idx_generated_reports_parameters ON generated_reports USING GIN (generation_parameters);
CREATE INDEX idx_generated_reports_data_summary ON generated_reports USING GIN (data_source_summary);
CREATE INDEX idx_generated_reports_authorized_users ON generated_reports USING GIN (authorized_users);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_generated_reports_updated_at
    BEFORE UPDATE ON generated_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. analytics_summary_view（統計サマリービュー）

```sql
-- 統計データサマリー表示用のビュー
CREATE VIEW analytics_summary_view AS
SELECT 
    a.id,
    a.category,
    a.analytics_type,
    a.target_date,
    a.target_year,
    a.target_month,
    a.aggregation_level,
    a.status,
    a.calculated_at,
    a.last_updated_at,
    a.version,
    a.is_latest,
    
    -- 期間表示
    CASE 
        WHEN a.analytics_type = 'DAILY' THEN a.target_date::TEXT
        WHEN a.analytics_type = 'MONTHLY' THEN a.target_year || '-' || LPAD(a.target_month::TEXT, 2, '0')
        WHEN a.analytics_type = 'YEARLY' THEN a.target_year::TEXT
        ELSE 'Unknown'
    END as period_display,
    
    -- メトリクス統計
    jsonb_object_keys(a.metrics) as metric_keys,
    jsonb_array_length(COALESCE(jsonb_path_query_array(a.metrics, '$.*'), '[]'::jsonb)) as metric_count,
    
    -- 数値データ統計
    (SELECT COUNT(*) FROM jsonb_object_keys(a.numeric_values)) as numeric_value_count,
    (SELECT AVG((value::TEXT)::NUMERIC) FROM jsonb_each(a.numeric_values) WHERE value::TEXT ~ '^-?\d+\.?\d*$') as avg_numeric_value,
    
    -- データ鮮度
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.last_updated_at))/3600 as hours_since_update,
    
    -- ステータス表示
    CASE 
        WHEN a.status = 'CALCULATED' AND a.last_updated_at > CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'FRESH'
        WHEN a.status = 'CALCULATED' AND a.last_updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'RECENT'
        WHEN a.status = 'CALCULATED' THEN 'STALE'
        ELSE a.status
    END as freshness_status
    
FROM analytics_data a
WHERE a.deleted_at IS NULL
  AND a.is_latest = true;
```

### 2. kpi_dashboard_view（KPIダッシュボードビュー）

```sql
-- KPIダッシュボード表示用のビュー
CREATE VIEW kpi_dashboard_view AS
SELECT 
    kd.id as kpi_definition_id,
    kd.kpi_code,
    kd.kpi_name,
    kd.category,
    kd.target_value,
    kd.unit,
    kd.display_format,
    kd.chart_type,
    
    -- 最新KPI値
    kv.id as kpi_value_id,
    kv.calculated_value,
    kv.achievement_rate,
    kv.kpi_status,
    kv.status_color,
    kv.target_year,
    kv.target_month,
    kv.calculated_at,
    
    -- トレンド情報
    kv.previous_value,
    kv.change_amount,
    kv.change_rate,
    kv.trend_direction,
    
    -- アラート情報
    kv.alert_level,
    kv.alert_message,
    
    -- 表示用フォーマット
    CASE kd.display_format
        WHEN 'PERCENTAGE' THEN ROUND(kv.calculated_value, 2) || '%'
        WHEN 'CURRENCY' THEN '¥' || TO_CHAR(kv.calculated_value, 'FM999,999,999')
        WHEN 'NUMBER' THEN TO_CHAR(kv.calculated_value, 'FM999,999,999.00')
        ELSE kv.calculated_value::TEXT
    END as formatted_value,
    
    -- 達成状況表示
    CASE 
        WHEN kv.achievement_rate >= 100 THEN 'EXCELLENT'
        WHEN kv.achievement_rate >= 90 THEN 'GOOD'
        WHEN kv.achievement_rate >= 80 THEN 'WARNING'
        ELSE 'POOR'
    END as performance_level
    
FROM kpi_definitions kd
LEFT JOIN LATERAL (
    SELECT *
    FROM kpi_values kv2 
    WHERE kv2.kpi_definition_id = kd.id 
      AND kv2.deleted_at IS NULL
    ORDER BY kv2.target_year DESC, kv2.target_month DESC 
    LIMIT 1
) kv ON true
WHERE kd.deleted_at IS NULL
  AND kd.is_active = true
ORDER BY kd.category, kd.kpi_code;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- analytics_data のパーティショニング（年次）
CREATE TABLE analytics_data_partitioned (
    LIKE analytics_data INCLUDING ALL
) PARTITION BY RANGE (target_year);

-- 年次パーティション作成例
CREATE TABLE analytics_data_2024 
PARTITION OF analytics_data_partitioned
FOR VALUES FROM (2024) TO (2025);

CREATE TABLE analytics_data_2025 
PARTITION OF analytics_data_partitioned
FOR VALUES FROM (2025) TO (2026);

-- デフォルトパーティション
CREATE TABLE analytics_data_default 
PARTITION OF analytics_data_partitioned
DEFAULT;
```

### 2. マテリアライズドビュー

```sql
-- 月次KPI統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW monthly_kpi_stats AS
SELECT 
    kd.category,
    kv.target_year,
    kv.target_month,
    COUNT(*) as kpi_count,
    AVG(kv.achievement_rate) as avg_achievement_rate,
    COUNT(*) FILTER (WHERE kv.kpi_status = 'ACHIEVED') as achieved_count,
    COUNT(*) FILTER (WHERE kv.kpi_status = 'WARNING') as warning_count,
    COUNT(*) FILTER (WHERE kv.kpi_status = 'NOT_ACHIEVED') as not_achieved_count,
    MAX(kv.calculated_at) as last_calculated_at
FROM kpi_definitions kd
JOIN kpi_values kv ON kd.id = kv.kpi_definition_id
WHERE kd.deleted_at IS NULL
  AND kv.deleted_at IS NULL
  AND kd.is_active = true
  AND kv.target_year >= 2024
GROUP BY 
    kd.category,
    kv.target_year,
    kv.target_month;

-- 統計ビュー用インデックス
CREATE INDEX idx_monthly_kpi_stats_period ON monthly_kpi_stats(target_year, target_month);
CREATE INDEX idx_monthly_kpi_stats_category ON monthly_kpi_stats(category);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_kpi_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_kpi_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. 統計データ整合性チェック

```sql
-- 統計データ整合性チェック関数
CREATE OR REPLACE FUNCTION validate_analytics_data_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- 最新フラグの一意性チェック
    IF NEW.is_latest = true THEN
        UPDATE analytics_data 
        SET is_latest = false
        WHERE category = NEW.category 
          AND analytics_type = NEW.analytics_type
          AND aggregation_key = NEW.aggregation_key
          AND id != NEW.id
          AND deleted_at IS NULL;
    END IF;
    
    -- バージョン番号の自動増分
    IF NEW.version IS NULL OR NEW.version = 0 THEN
        NEW.version := COALESCE(
            (SELECT MAX(version) + 1 
             FROM analytics_data 
             WHERE category = NEW.category 
               AND aggregation_key = NEW.aggregation_key
               AND deleted_at IS NULL), 
            1
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_analytics_data_consistency
    BEFORE INSERT OR UPDATE ON analytics_data
    FOR EACH ROW
    EXECUTE FUNCTION validate_analytics_data_consistency();
```

### 2. KPI計算自動更新

```sql
-- KPI値自動計算関数
CREATE OR REPLACE FUNCTION update_kpi_calculations()
RETURNS TRIGGER AS $$
DECLARE
    kpi_def RECORD;
    calculated_value DECIMAL(18,6);
BEGIN
    -- 関連するKPI定義を取得
    FOR kpi_def IN 
        SELECT * FROM kpi_definitions 
        WHERE is_active = true 
          AND is_auto_calculate = true
          AND deleted_at IS NULL
    LOOP
        -- KPI値の計算（簡略化）
        calculated_value := 100.0; -- 実際の計算ロジックに置き換え
        
        -- KPI値の更新または作成
        INSERT INTO kpi_values (
            kpi_definition_id,
            target_year,
            target_month,
            calculated_value,
            calculated_at,
            created_by,
            updated_by
        ) VALUES (
            kpi_def.id,
            EXTRACT(YEAR FROM NEW.target_date),
            EXTRACT(MONTH FROM NEW.target_date),
            calculated_value,
            CURRENT_TIMESTAMP,
            NEW.updated_by,
            NEW.updated_by
        )
        ON CONFLICT (kpi_definition_id, target_year, target_month) 
        DO UPDATE SET
            calculated_value = EXCLUDED.calculated_value,
            calculated_at = EXCLUDED.calculated_at,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kpi_calculations
    AFTER INSERT OR UPDATE ON analytics_data
    FOR EACH ROW
    WHEN (NEW.status = 'CALCULATED')
    EXECUTE FUNCTION update_kpi_calculations();
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

-- 管理者は全データアクセス可能
CREATE POLICY analytics_admin_access ON analytics_data
    FOR ALL
    TO ses_admin_role, ses_report_admin_role
    USING (true);

-- 部門管理者は部門関連データのみアクセス可能
CREATE POLICY analytics_department_access ON analytics_data
    FOR SELECT
    TO ses_department_manager_role
    USING (
        category IN (
            SELECT accessible_categories 
            FROM user_department_permissions 
            WHERE user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- ダッシュボードのアクセス制御
CREATE POLICY dashboard_owner_access ON dashboards
    FOR ALL
    TO ses_user_role
    USING (
        owner_id = current_setting('app.current_user_id')::UUID OR
        authorized_users @> jsonb_build_array(
            jsonb_build_object('userId', current_setting('app.current_user_id'))
        )
    );
```

---

## 運用・保守設計

### 1. データアーカイブ

```sql
-- 古い統計データのアーカイブ
CREATE OR REPLACE FUNCTION archive_old_analytics_data(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 1年前の統計データをアーカイブ
    UPDATE analytics_data 
    SET status = 'ARCHIVED',
        deleted_at = CURRENT_TIMESTAMP
    WHERE target_date < cutoff_date
      AND status = 'CALCULATED'
      AND is_latest = false
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. レポート自動生成

```sql
-- レポート自動生成関数
CREATE OR REPLACE FUNCTION generate_scheduled_reports()
RETURNS TABLE(
    template_id UUID,
    template_name VARCHAR,
    generation_status VARCHAR,
    error_message TEXT
) AS $$
DECLARE
    template_rec RECORD;
    report_id UUID;
BEGIN
    -- スケジュール対象のテンプレートを取得
    FOR template_rec IN 
        SELECT * FROM report_templates
        WHERE is_active = true
          AND auto_generate = true
          AND deleted_at IS NULL
    LOOP
        BEGIN
            -- レポート生成処理
            INSERT INTO generated_reports (
                report_template_id,
                report_name,
                target_year,
                target_month,
                generation_status,
                created_by,
                updated_by
            ) VALUES (
                template_rec.id,
                template_rec.name || ' - ' || TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
                EXTRACT(YEAR FROM CURRENT_DATE),
                EXTRACT(MONTH FROM CURRENT_DATE),
                'GENERATING',
                template_rec.created_by,
                template_rec.updated_by
            ) RETURNING id INTO report_id;
            
            -- 生成成功
            RETURN QUERY SELECT 
                template_rec.id,
                template_rec.name,
                'COMPLETED'::VARCHAR,
                NULL::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            -- 生成失敗
            RETURN QUERY SELECT 
                template_rec.id,
                template_rec.name,
                'FAILED'::VARCHAR,
                SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Report集約詳細設計  
**次回レビュー**: 2025年7月1日