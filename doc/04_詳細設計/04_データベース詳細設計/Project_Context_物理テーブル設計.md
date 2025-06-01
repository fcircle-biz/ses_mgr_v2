# Project Context 物理テーブル設計

## 概要

Project Context（案件管理）の物理データベース設計。ドメインモデル設計に基づくPostgreSQL DDL定義とパフォーマンス最適化設計。

### 対象集約
- **Project集約**: 案件ライフサイクル管理の中核
- **Customer集約**: 顧客情報管理
- **Proposal集約**: 提案管理

---

## テーブル設計

### 1. projects（案件テーブル）

```sql
-- Project集約ルート
CREATE TABLE projects (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    customer_id                 UUID NOT NULL,
    
    -- === ステータス管理 ===
    status                      VARCHAR(30) NOT NULL CHECK (status IN (
        'LEAD',                 -- リード
        'PROPOSING',            -- 提案作成中
        'PROPOSAL_SUBMITTED',   -- 提案提出済
        'NEGOTIATING',          -- 交渉中
        'ORDERED',              -- 受注
        'IN_PROGRESS',          -- 進行中
        'COMPLETED',            -- 完了
        'CANCELLED'             -- キャンセル
    )),
    phase_history               JSONB,          -- フェーズ変更履歴
    
    -- === 期間・予算 ===
    estimated_start_date        DATE,
    estimated_end_date          DATE,
    estimated_duration_months   INTEGER,
    actual_start_date           DATE,
    actual_end_date             DATE,
    
    -- 予算情報
    budget_min_amount           DECIMAL(15,2),
    budget_max_amount           DECIMAL(15,2),
    budget_currency             VARCHAR(3) DEFAULT 'JPY',
    budget_finalized            BOOLEAN DEFAULT FALSE,
    
    -- 商流情報
    business_flow               VARCHAR(20) NOT NULL CHECK (business_flow IN (
        'DIRECT',               -- 直請
        'PRIMARY',              -- 一次請
        'SECONDARY',            -- 二次請
        'TERTIARY'              -- 三次請以降
    )),
    
    -- === 要件情報（JSONB） ===
    requirement                 JSONB NOT NULL,
    /*
    requirement構造:
    {
        "description": "要件説明",
        "requiredSkills": ["Java", "Spring", "PostgreSQL"],
        "experienceLevel": "SENIOR",
        "workLocation": "HYBRID",
        "teamSize": 5,
        "specialRequirements": ["セキュリティ要件", "24時間対応"]
    }
    */
    
    -- === 営業情報 ===
    sales_representative_id     UUID,
    proposal_deadline           TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,        -- 論理削除
    
    -- === 制約 ===
    CONSTRAINT valid_dates CHECK (
        estimated_start_date IS NULL OR estimated_end_date IS NULL OR 
        estimated_start_date <= estimated_end_date
    ),
    CONSTRAINT valid_budget CHECK (
        budget_min_amount IS NULL OR budget_max_amount IS NULL OR 
        budget_min_amount <= budget_max_amount
    ),
    CONSTRAINT valid_actual_dates CHECK (
        actual_start_date IS NULL OR actual_end_date IS NULL OR 
        actual_start_date <= actual_end_date
    )
);

-- インデックス
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_customer_id ON projects(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_sales_rep ON projects(sales_representative_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_created_at ON projects(created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_proposal_deadline ON projects(proposal_deadline) WHERE deleted_at IS NULL;

-- 要件検索用GINインデックス
CREATE INDEX idx_projects_requirement_skills ON projects USING GIN ((requirement->'requiredSkills'));
CREATE INDEX idx_projects_requirement_level ON projects USING BTREE ((requirement->>'experienceLevel'));

-- 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. customers（顧客テーブル）

```sql
-- Customer集約
CREATE TABLE customers (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    name_kana                   VARCHAR(200),
    legal_name                  VARCHAR(200),           -- 正式法人名
    
    -- === 企業情報 ===
    industry                    VARCHAR(100),
    employee_count              INTEGER,
    annual_revenue              DECIMAL(15,2),
    listing_status              VARCHAR(20) CHECK (listing_status IN (
        'PUBLIC',               -- 上場企業
        'PRIVATE',              -- 非上場企業
        'STARTUP',              -- スタートアップ
        'GOVERNMENT',           -- 官公庁
        'NON_PROFIT'            -- 非営利団体
    )),
    
    -- === 連絡先情報（JSONB） ===
    contact_info                JSONB NOT NULL,
    /*
    contact_info構造:
    {
        "headquarters": {
            "address": "東京都渋谷区...",
            "phone": "03-1234-5678",
            "fax": "03-1234-5679"
        },
        "primaryContact": {
            "name": "田中太郎",
            "title": "情報システム部長",
            "email": "tanaka@customer.com",
            "phone": "03-1234-5678"
        },
        "billingContact": {...},
        "technicalContact": {...}
    }
    */
    
    -- === ビジネス情報 ===
    preferred_business_flow     VARCHAR(20) CHECK (preferred_business_flow IN (
        'DIRECT', 'PRIMARY', 'SECONDARY', 'TERTIARY'
    )),
    credit_rating               VARCHAR(10) CHECK (credit_rating IN (
        'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'CC', 'C', 'D'
    )),
    payment_terms               INTEGER DEFAULT 30,     -- 支払いサイト（日）
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE',               -- 取引中
        'INACTIVE',             -- 休眠
        'BLACKLISTED',          -- ブラックリスト
        'PROSPECT'              -- 見込み客
    )),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_customer_name UNIQUE(name) WHERE deleted_at IS NULL
);

-- インデックス
CREATE INDEX idx_customers_name ON customers(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_status ON customers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_industry ON customers(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_listing_status ON customers(listing_status) WHERE deleted_at IS NULL;

-- 連絡先検索用GINインデックス
CREATE INDEX idx_customers_contact_info ON customers USING GIN (contact_info);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. proposals（提案テーブル）

```sql
-- Proposal集約
CREATE TABLE proposals (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL REFERENCES projects(id),
    
    -- === 提案情報 ===
    title                       VARCHAR(200) NOT NULL,
    content                     TEXT,
    proposal_type               VARCHAR(20) NOT NULL CHECK (proposal_type IN (
        'INITIAL',              -- 初回提案
        'REVISED',              -- 修正提案
        'FINAL',                -- 最終提案
        'COUNTER'               -- カウンター提案
    )),
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'SUBMITTED',            -- 提出済み
        'REVIEWED',             -- レビュー済み
        'ACCEPTED',             -- 承認
        'REJECTED',             -- 却下
        'WITHDRAWN'             -- 取り下げ
    )),
    
    -- === 提案内容（JSONB） ===
    proposal_details            JSONB NOT NULL,
    /*
    proposal_details構造:
    {
        "technicalApproach": "技術的アプローチ",
        "teamComposition": [
            {
                "role": "PL",
                "skillLevel": "SENIOR",
                "monthlyRate": 800000,
                "assignmentPeriod": "6ヶ月"
            }
        ],
        "timeline": {
            "phases": [
                {
                    "name": "要件定義",
                    "duration": "1ヶ月",
                    "deliverables": ["要件定義書"]
                }
            ]
        },
        "riskMitigation": "リスク対策",
        "qualityAssurance": "品質保証"
    }
    */
    
    -- === 見積情報 ===
    total_amount                DECIMAL(15,2),
    currency                    VARCHAR(3) DEFAULT 'JPY',
    payment_schedule            JSONB,          -- 支払いスケジュール
    
    -- === 期限・日程 ===
    submission_deadline         TIMESTAMP WITH TIME ZONE,
    submitted_at                TIMESTAMP WITH TIME ZONE,
    response_deadline           TIMESTAMP WITH TIME ZONE,
    
    -- === 添付ファイル ===
    attachments                 JSONB,          -- ファイル情報のJSON配列
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_proposals_project_id ON proposals(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_proposals_status ON proposals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_proposals_type ON proposals(proposal_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_proposals_submission_deadline ON proposals(submission_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_proposals_submitted_at ON proposals(submitted_at) WHERE deleted_at IS NULL;

-- 提案内容検索用GINインデックス
CREATE INDEX idx_proposals_details ON proposals USING GIN (proposal_details);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. project_phase_histories（フェーズ履歴テーブル）

```sql
-- Project フェーズ変更履歴（正規化バージョン）
CREATE TABLE project_phase_histories (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL REFERENCES projects(id),
    
    -- === フェーズ情報 ===
    from_status                 VARCHAR(30),
    to_status                   VARCHAR(30) NOT NULL,
    changed_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- === 変更理由・コメント ===
    reason                      TEXT,
    comment                     TEXT,
    
    -- === 変更者情報 ===
    changed_by                  UUID NOT NULL,
    
    -- === 承認情報（必要な場合） ===
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_project_phase_histories_project_id ON project_phase_histories(project_id);
CREATE INDEX idx_project_phase_histories_changed_at ON project_phase_histories(changed_at);
CREATE INDEX idx_project_phase_histories_to_status ON project_phase_histories(to_status);
```

---

## ビュー定義

### 1. project_summary_view（案件サマリービュー）

```sql
-- 案件一覧表示用のビュー
CREATE VIEW project_summary_view AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.estimated_start_date,
    p.estimated_end_date,
    p.estimated_duration_months,
    p.budget_min_amount,
    p.budget_max_amount,
    p.budget_currency,
    p.business_flow,
    p.requirement->>'experienceLevel' as required_experience_level,
    p.requirement->'requiredSkills' as required_skills,
    p.sales_representative_id,
    p.proposal_deadline,
    p.created_at,
    p.updated_at,
    
    -- 顧客情報
    c.name as customer_name,
    c.industry as customer_industry,
    c.status as customer_status,
    
    -- 最新提案情報
    latest_proposal.title as latest_proposal_title,
    latest_proposal.status as latest_proposal_status,
    latest_proposal.submitted_at as latest_proposal_submitted_at,
    
    -- 提案数
    proposal_stats.total_proposals,
    proposal_stats.submitted_proposals
    
FROM projects p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN LATERAL (
    SELECT 
        title, 
        status, 
        submitted_at
    FROM proposals pr 
    WHERE pr.project_id = p.id 
      AND pr.deleted_at IS NULL
    ORDER BY pr.created_at DESC 
    LIMIT 1
) latest_proposal ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_proposals,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') as submitted_proposals
    FROM proposals pr 
    WHERE pr.project_id = p.id 
      AND pr.deleted_at IS NULL
) proposal_stats ON true
WHERE p.deleted_at IS NULL
  AND c.deleted_at IS NULL;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- project_phase_histories のパーティショニング（月次）
-- 大量の履歴データが蓄積されることを想定

-- 親テーブルを作成し直す（パーティション対応）
CREATE TABLE project_phase_histories_partitioned (
    LIKE project_phase_histories INCLUDING ALL
) PARTITION BY RANGE (changed_at);

-- 月次パーティション作成例
CREATE TABLE project_phase_histories_2025_01 
PARTITION OF project_phase_histories_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE project_phase_histories_2025_02 
PARTITION OF project_phase_histories_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- 今後のパーティション自動作成のためのストアドプロシージャ
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
    
    EXECUTE format('CREATE INDEX idx_%s_project_id ON %I(project_id)',
                   partition_name, partition_name);
END;
$$ LANGUAGE plpgsql;
```

### 2. マテリアライズドビュー

```sql
-- 統計用マテリアライズドビュー（日次更新）
CREATE MATERIALIZED VIEW project_daily_stats AS
SELECT 
    date_trunc('day', created_at) as date,
    status,
    business_flow,
    requirement->>'experienceLevel' as experience_level,
    COUNT(*) as project_count,
    AVG(budget_max_amount) as avg_budget,
    MIN(budget_min_amount) as min_budget,
    MAX(budget_max_amount) as max_budget
FROM projects
WHERE deleted_at IS NULL
  AND created_at >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY 
    date_trunc('day', created_at),
    status,
    business_flow,
    requirement->>'experienceLevel';

-- 統計ビュー用インデックス
CREATE INDEX idx_project_daily_stats_date ON project_daily_stats(date);
CREATE INDEX idx_project_daily_stats_status ON project_daily_stats(status);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_project_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_daily_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. ビジネスルール制約

```sql
-- ステータス遷移制約
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed_transitions TEXT[][] := ARRAY[
        ['LEAD', 'PROPOSING'],
        ['LEAD', 'CANCELLED'],
        ['PROPOSING', 'PROPOSAL_SUBMITTED'],
        ['PROPOSING', 'CANCELLED'],
        ['PROPOSAL_SUBMITTED', 'NEGOTIATING'],
        ['PROPOSAL_SUBMITTED', 'CANCELLED'],
        ['NEGOTIATING', 'ORDERED'],
        ['NEGOTIATING', 'CANCELLED'],
        ['ORDERED', 'IN_PROGRESS'],
        ['IN_PROGRESS', 'COMPLETED'],
        ['IN_PROGRESS', 'CANCELLED']
    ];
    transition TEXT[];
BEGIN
    -- 新規作成の場合はスキップ
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- ステータス変更がない場合はスキップ
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- 許可された遷移かチェック
    transition := ARRAY[OLD.status, NEW.status];
    
    IF NOT (transition = ANY(allowed_transitions)) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_project_status_transition
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION validate_project_status_transition();
```

### 2. データ品質チェック

```sql
-- データ品質チェック関数
CREATE OR REPLACE FUNCTION check_project_data_quality()
RETURNS TABLE(project_id UUID, issue_type TEXT, issue_description TEXT) AS $$
BEGIN
    -- 必須要件が欠けている案件
    RETURN QUERY
    SELECT p.id, 'MISSING_REQUIREMENTS', 'Required skills or experience level not specified'
    FROM projects p
    WHERE p.deleted_at IS NULL
      AND (p.requirement->>'requiredSkills' IS NULL 
           OR p.requirement->>'experienceLevel' IS NULL);
    
    -- 予算情報が不完全な受注案件
    RETURN QUERY
    SELECT p.id, 'INCOMPLETE_BUDGET', 'Budget information incomplete for ordered project'
    FROM projects p
    WHERE p.deleted_at IS NULL
      AND p.status = 'ORDERED'
      AND (p.budget_min_amount IS NULL OR p.budget_max_amount IS NULL);
    
    -- 期限切れの提案
    RETURN QUERY
    SELECT p.id, 'OVERDUE_PROPOSAL', 'Proposal deadline passed without submission'
    FROM projects p
    WHERE p.deleted_at IS NULL
      AND p.status IN ('PROPOSING', 'PROPOSAL_SUBMITTED')
      AND p.proposal_deadline < CURRENT_TIMESTAMP;
    
END;
$$ LANGUAGE plpgsql;
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- 営業担当者は自分の案件のみアクセス可能
CREATE POLICY project_sales_access ON projects
    FOR ALL
    TO ses_sales_role
    USING (sales_representative_id = current_setting('app.current_user_id')::UUID);

-- 管理者は全データアクセス可能
CREATE POLICY project_admin_access ON projects
    FOR ALL
    TO ses_admin_role
    USING (true);

-- 読み取り専用ユーザーは削除済みデータ以外参照可能
CREATE POLICY project_readonly_access ON projects
    FOR SELECT
    TO ses_readonly_role
    USING (deleted_at IS NULL);
```

### 2. 機密データ暗号化

```sql
-- 機密情報暗号化拡張
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 機密情報暗号化関数
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(data, current_setting('app.encryption_key')), 'base64');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

---

## 運用・保守設計

### 1. バックアップ戦略

```sql
-- バックアップ対象テーブル一覧
COMMENT ON TABLE projects IS 'Project Context Core Table - Critical Data - Daily Backup Required';
COMMENT ON TABLE customers IS 'Customer Master Data - Critical Data - Daily Backup Required';
COMMENT ON TABLE proposals IS 'Proposal Data - Important Data - Daily Backup Required';
COMMENT ON TABLE project_phase_histories IS 'Audit Trail - Archive Monthly - Retention 7 Years';

-- バックアップ優先度
-- Critical: projects, customers (0 RPO)
-- Important: proposals (1 hour RPO)
-- Archive: project_phase_histories (24 hour RPO)
```

### 2. データアーカイブ

```sql
-- アーカイブプロシージャ（完了案件の履歴移動）
CREATE OR REPLACE FUNCTION archive_completed_projects(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 3年前に完了した案件の履歴をアーカイブテーブルに移動
    WITH archived_histories AS (
        DELETE FROM project_phase_histories
        WHERE project_id IN (
            SELECT id FROM projects 
            WHERE status = 'COMPLETED' 
              AND actual_end_date < cutoff_date
        )
        RETURNING *
    )
    INSERT INTO project_phase_histories_archive
    SELECT * FROM archived_histories;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Project集約詳細設計  
**次回レビュー**: 2025年7月1日