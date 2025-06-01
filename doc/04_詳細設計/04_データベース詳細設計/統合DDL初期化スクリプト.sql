-- ================================================================
-- SES管理システム 統合データベース初期化スクリプト
-- PostgreSQL 15対応
-- 
-- 実行順序:
-- 1. 基本設定・拡張機能
-- 2. スキーマ作成
-- 3. 共通関数・トリガー
-- 4. Core Contexts (Project, Engineer, Contract)
-- 5. Supporting Contexts (Matching, Timesheet, Billing)  
-- 6. Generic Contexts (Report, Notification)
-- 7. 統合ビュー・インデックス最適化
-- 8. セキュリティ設定
-- ================================================================

\echo 'Starting SES Database Initialization...'

-- ================================================================
-- 1. 基本設定・拡張機能
-- ================================================================

\echo '1. Setting up basic configuration and extensions...'

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- データベース設定
ALTER DATABASE CURRENT SET timezone = 'Asia/Tokyo';
ALTER DATABASE CURRENT SET datestyle = 'ISO, YMD';

-- ================================================================
-- 2. スキーマ作成
-- ================================================================

\echo '2. Creating schemas...'

-- コンテキスト別スキーマ作成
CREATE SCHEMA IF NOT EXISTS project_context;
CREATE SCHEMA IF NOT EXISTS engineer_context;
CREATE SCHEMA IF NOT EXISTS matching_context;
CREATE SCHEMA IF NOT EXISTS contract_context;
CREATE SCHEMA IF NOT EXISTS timesheet_context;
CREATE SCHEMA IF NOT EXISTS billing_context;
CREATE SCHEMA IF NOT EXISTS report_context;
CREATE SCHEMA IF NOT EXISTS notification_context;

-- 共通スキーマ
CREATE SCHEMA IF NOT EXISTS shared_functions;
CREATE SCHEMA IF NOT EXISTS audit_log;

-- ================================================================
-- 3. 共通関数・トリガー
-- ================================================================

\echo '3. Creating common functions and triggers...'

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION shared_functions.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- バージョン自動増分関数
CREATE OR REPLACE FUNCTION shared_functions.increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- UUID生成関数
CREATE OR REPLACE FUNCTION shared_functions.generate_uuid()
RETURNS UUID AS $$
BEGIN
    RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- 参照整合性チェック関数
CREATE OR REPLACE FUNCTION shared_functions.validate_cross_context_reference(
    target_schema TEXT,
    target_table TEXT,
    target_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    record_exists BOOLEAN;
    query_sql TEXT;
BEGIN
    query_sql := format(
        'SELECT EXISTS(SELECT 1 FROM %I.%I WHERE id = $1 AND deleted_at IS NULL)',
        target_schema, target_table
    );
    
    EXECUTE query_sql INTO record_exists USING target_id;
    
    RETURN record_exists;
END;
$$ LANGUAGE plpgsql;

-- 機密データ暗号化関数
CREATE OR REPLACE FUNCTION shared_functions.encrypt_personal_data(data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(pgp_sym_encrypt(data, current_setting('app.encryption_key', true)), 'base64');
EXCEPTION WHEN OTHERS THEN
    -- フォールバック: 暗号化キーが設定されていない場合
    RETURN data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 復号化関数
CREATE OR REPLACE FUNCTION shared_functions.decrypt_personal_data(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), current_setting('app.encryption_key', true));
EXCEPTION WHEN OTHERS THEN
    -- フォールバック: 復号化に失敗した場合
    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 4. Core Contexts テーブル作成
-- ================================================================

\echo '4. Creating Core Contexts tables...'

-- ----------------------------------------------------------------
-- 4.1 Project Context
-- ----------------------------------------------------------------

\echo '4.1 Creating Project Context tables...'

-- projects テーブル
CREATE TABLE project_context.projects (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code                VARCHAR(50) UNIQUE NOT NULL,
    
    -- === 基本情報 ===
    project_name                VARCHAR(200) NOT NULL,
    description                 TEXT,
    project_type                VARCHAR(20) NOT NULL CHECK (project_type IN (
        'DEVELOPMENT',          -- システム開発
        'MAINTENANCE',          -- 保守運用
        'CONSULTING',           -- コンサルティング
        'INFRASTRUCTURE'        -- インフラ構築
    )),
    
    -- === 期間・予算 ===
    start_date                  DATE NOT NULL,
    end_date                    DATE,
    planned_duration_months     INTEGER,
    budget_amount               DECIMAL(15,2),
    currency                    VARCHAR(3) DEFAULT 'JPY',
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'PLANNING' CHECK (status IN (
        'PLANNING',             -- 企画中
        'ACTIVE',               -- 進行中
        'ON_HOLD',              -- 保留
        'COMPLETED',            -- 完了
        'CANCELLED'             -- キャンセル
    )),
    priority                    VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    )),
    progress_percentage         INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- === 要件定義 ===
    requirements                JSONB,
    technical_requirements      JSONB,
    business_requirements       JSONB,
    
    -- === 体制情報 ===
    customer_id                 UUID NOT NULL,
    project_manager_id          UUID,
    sales_manager_id            UUID,
    technical_lead_id           UUID,
    
    -- === リスク・課題 ===
    risks                       JSONB,
    issues                      JSONB,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_project_period CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_budget CHECK (budget_amount IS NULL OR budget_amount >= 0)
);

-- project_requirements テーブル
CREATE TABLE project_context.project_requirements (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL REFERENCES project_context.projects(id) ON DELETE CASCADE,
    
    requirement_type            VARCHAR(20) NOT NULL CHECK (requirement_type IN (
        'FUNCTIONAL',           -- 機能要件
        'NON_FUNCTIONAL',       -- 非機能要件
        'TECHNICAL',            -- 技術要件
        'BUSINESS'              -- 業務要件
    )),
    title                       VARCHAR(200) NOT NULL,
    description                 TEXT NOT NULL,
    priority                    VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    )),
    status                      VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'REVIEW', 'APPROVED', 'REJECTED'
    )),
    
    -- 詳細情報
    acceptance_criteria         TEXT,
    estimated_effort_hours      INTEGER,
    assigned_to                 UUID,
    
    -- 監査情報
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- ----------------------------------------------------------------
-- 4.2 Engineer Context
-- ----------------------------------------------------------------

\echo '4.2 Creating Engineer Context tables...'

-- engineers テーブル
CREATE TABLE engineer_context.engineers (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number             VARCHAR(20) UNIQUE NOT NULL,
    
    -- === 基本情報 ===
    name                        VARCHAR(100) NOT NULL,
    name_kana                   VARCHAR(100),
    email                       VARCHAR(255) UNIQUE NOT NULL,
    phone_number                VARCHAR(20),
    birth_date                  DATE,
    gender                      VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    
    -- === 雇用情報 ===
    employment_type             VARCHAR(20) NOT NULL CHECK (employment_type IN (
        'FULL_TIME',            -- 正社員
        'CONTRACT',             -- 契約社員
        'PART_TIME',            -- パートタイム
        'FREELANCE'             -- フリーランス
    )),
    join_date                   DATE NOT NULL,
    department                  VARCHAR(100),
    position                    VARCHAR(100),
    
    -- === スキル情報 ===
    skills                      JSONB,
    skill_level                 VARCHAR(20) DEFAULT 'INTERMEDIATE' CHECK (skill_level IN (
        'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
    )),
    
    -- === 稼働状況 ===
    availability_status         VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (availability_status IN (
        'AVAILABLE',            -- 稼働可能
        'BUSY',                 -- 稼働中
        'PARTIALLY_AVAILABLE',  -- 部分的稼働可能
        'UNAVAILABLE'           -- 稼働不可
    )),
    current_utilization_rate    INTEGER DEFAULT 0 CHECK (current_utilization_rate >= 0 AND current_utilization_rate <= 100),
    max_workload_hours          INTEGER DEFAULT 160,
    
    -- === 評価情報 ===
    performance_rating          VARCHAR(20) CHECK (performance_rating IN (
        'EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'
    )),
    last_evaluation_date        DATE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_birth_date CHECK (birth_date < CURRENT_DATE),
    CONSTRAINT valid_join_date CHECK (join_date <= CURRENT_DATE)
);

-- skill_assessments テーブル
CREATE TABLE engineer_context.skill_assessments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineer_id                 UUID NOT NULL REFERENCES engineer_context.engineers(id) ON DELETE CASCADE,
    
    skill_category              VARCHAR(50) NOT NULL,
    skill_name                  VARCHAR(100) NOT NULL,
    skill_level                 VARCHAR(20) NOT NULL CHECK (skill_level IN (
        'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
    )),
    skill_level_numeric         INTEGER GENERATED ALWAYS AS (
        CASE skill_level
            WHEN 'BEGINNER' THEN 1
            WHEN 'INTERMEDIATE' THEN 2
            WHEN 'ADVANCED' THEN 3
            WHEN 'EXPERT' THEN 4
        END
    ) STORED,
    
    years_of_experience         DECIMAL(4,1) CHECK (years_of_experience >= 0),
    last_used_date              DATE,
    certification_level         VARCHAR(50),
    assessment_date             DATE NOT NULL DEFAULT CURRENT_DATE,
    assessed_by                 UUID,
    
    -- 監査情報
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- 制約
    CONSTRAINT unique_engineer_skill UNIQUE(engineer_id, skill_category, skill_name) WHERE deleted_at IS NULL
);

-- ----------------------------------------------------------------
-- 4.3 Contract Context
-- ----------------------------------------------------------------

\echo '4.3 Creating Contract Context tables...'

-- contracts テーブル
CREATE TABLE contract_context.contracts (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連情報 ===
    project_id                  UUID NOT NULL,
    customer_id                 UUID NOT NULL,
    contractor_company_id       UUID NOT NULL,
    contract_number             VARCHAR(50) UNIQUE NOT NULL,
    
    -- === 契約基本情報 ===
    contract_name               VARCHAR(200) NOT NULL,
    contract_type               VARCHAR(20) NOT NULL CHECK (contract_type IN (
        'FIXED_PRICE',          -- 固定価格契約
        'TIME_AND_MATERIAL',    -- 準委任契約
        'MAINTENANCE',          -- 保守契約
        'SLA'                   -- SLA契約
    )),
    
    -- === 契約期間 ===
    start_date                  DATE NOT NULL,
    end_date                    DATE NOT NULL,
    contract_period_months      INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM AGE(end_date, start_date)) * 12 + 
        EXTRACT(MONTH FROM AGE(end_date, start_date))
    ) STORED,
    
    -- === 契約金額 ===
    total_amount                DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    currency                    VARCHAR(3) DEFAULT 'JPY',
    tax_rate                    DECIMAL(5,4) DEFAULT 0.10,
    tax_amount                  DECIMAL(15,2) GENERATED ALWAYS AS (
        total_amount * tax_rate
    ) STORED,
    
    -- === 支払条件 ===
    payment_terms               JSONB,
    billing_cycle               VARCHAR(20) DEFAULT 'MONTHLY' CHECK (billing_cycle IN (
        'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY', 'ONE_TIME'
    )),
    payment_due_days            INTEGER DEFAULT 30,
    
    -- === 契約条項 ===
    contract_terms              JSONB,
    sla_terms                   JSONB,
    deliverables                JSONB,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'PENDING_APPROVAL',     -- 承認待ち
        'ACTIVE',               -- 有効
        'SUSPENDED',            -- 停止
        'TERMINATED',           -- 終了
        'EXPIRED'               -- 期限切れ
    )),
    
    -- === 電子署名情報 ===
    digital_signature_status    VARCHAR(20) DEFAULT 'PENDING' CHECK (digital_signature_status IN (
        'PENDING',              -- 署名待ち
        'PARTIALLY_SIGNED',     -- 一部署名済み
        'FULLY_SIGNED',         -- 全署名完了
        'EXPIRED',              -- 署名期限切れ
        'CANCELLED'             -- 署名キャンセル
    )),
    cloudsign_document_id       VARCHAR(100),
    signature_request_date      TIMESTAMP WITH TIME ZONE,
    signature_completed_date    TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_contract_period CHECK (end_date > start_date),
    CONSTRAINT valid_payment_due_days CHECK (payment_due_days > 0)
);

-- ================================================================
-- 5. Supporting Contexts テーブル作成
-- ================================================================

\echo '5. Creating Supporting Contexts tables...'

-- ----------------------------------------------------------------
-- 5.1 Matching Context
-- ----------------------------------------------------------------

\echo '5.1 Creating Matching Context tables...'

-- matching_requests テーブル
CREATE TABLE matching_context.matching_requests (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code                VARCHAR(50) UNIQUE NOT NULL,
    
    -- === 関連情報 ===
    project_id                  UUID NOT NULL,
    requested_by                UUID NOT NULL,
    
    -- === 要求仕様 ===
    position_title              VARCHAR(200) NOT NULL,
    required_skills             JSONB NOT NULL,
    preferred_skills            JSONB,
    required_experience_years   INTEGER CHECK (required_experience_years >= 0),
    required_skill_level        VARCHAR(20) CHECK (required_skill_level IN (
        'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'
    )),
    
    -- === 条件 ===
    work_location               VARCHAR(200),
    work_style                  VARCHAR(20) CHECK (work_style IN (
        'ONSITE', 'REMOTE', 'HYBRID'
    )),
    start_date                  DATE NOT NULL,
    end_date                    DATE,
    workload_percentage         INTEGER DEFAULT 100 CHECK (workload_percentage > 0 AND workload_percentage <= 100),
    
    -- === 予算 ===
    budget_min                  DECIMAL(10,2),
    budget_max                  DECIMAL(10,2),
    budget_currency             VARCHAR(3) DEFAULT 'JPY',
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN (
        'OPEN',                 -- 募集中
        'IN_PROGRESS',          -- マッチング中
        'MATCHED',              -- マッチング完了
        'CLOSED',               -- 終了
        'CANCELLED'             -- キャンセル
    )),
    urgency                     VARCHAR(10) DEFAULT 'NORMAL' CHECK (urgency IN (
        'LOW', 'NORMAL', 'HIGH', 'URGENT'
    )),
    
    -- === 期限 ===
    application_deadline        TIMESTAMP WITH TIME ZONE,
    response_required_by        TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_matching_period CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT valid_budget_range CHECK (budget_max IS NULL OR budget_min IS NULL OR budget_max >= budget_min)
);

-- matching_results テーブル
CREATE TABLE matching_context.matching_results (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matching_request_id         UUID NOT NULL REFERENCES matching_context.matching_requests(id) ON DELETE CASCADE,
    engineer_id                 UUID NOT NULL,
    
    -- === マッチングスコア ===
    matching_score              DECIMAL(5,2) NOT NULL CHECK (matching_score >= 0 AND matching_score <= 100),
    skill_match_score           DECIMAL(5,2) CHECK (skill_match_score >= 0 AND skill_match_score <= 100),
    experience_match_score      DECIMAL(5,2) CHECK (experience_match_score >= 0 AND experience_match_score <= 100),
    availability_match_score    DECIMAL(5,2) CHECK (availability_match_score >= 0 AND availability_match_score <= 100),
    
    -- === マッチング詳細 ===
    matched_skills              JSONB,
    missing_skills              JSONB,
    additional_skills           JSONB,
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'CANDIDATE' CHECK (status IN (
        'CANDIDATE',            -- 候補
        'CONTACTED',            -- 連絡済み
        'INTERVIEWED',          -- 面談済み
        'SELECTED',             -- 選出
        'REJECTED',             -- 不採用
        'WITHDRAWN'             -- 辞退
    )),
    
    -- === 評価・フィードバック ===
    client_feedback             TEXT,
    engineer_feedback           TEXT,
    recommendation_reason       TEXT,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_matching_engineer UNIQUE(matching_request_id, engineer_id) WHERE deleted_at IS NULL
);

-- ----------------------------------------------------------------
-- 5.2 Timesheet Context
-- ----------------------------------------------------------------

\echo '5.2 Creating Timesheet Context tables...'

-- timesheets テーブル
CREATE TABLE timesheet_context.timesheets (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連情報 ===
    engineer_id                 UUID NOT NULL,
    contract_id                 UUID NOT NULL,
    
    -- === 期間情報 ===
    period_year                 INTEGER NOT NULL,
    period_month                INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_date                 DATE GENERATED ALWAYS AS (
        MAKE_DATE(period_year, period_month, 1)
    ) STORED,
    
    -- === 勤務時間集計 ===
    total_work_hours            DECIMAL(6,2) DEFAULT 0 CHECK (total_work_hours >= 0),
    regular_work_hours          DECIMAL(6,2) DEFAULT 0 CHECK (regular_work_hours >= 0),
    overtime_hours              DECIMAL(6,2) DEFAULT 0 CHECK (overtime_hours >= 0),
    holiday_work_hours          DECIMAL(6,2) DEFAULT 0 CHECK (holiday_work_hours >= 0),
    
    -- === 出勤統計 ===
    total_work_days             INTEGER DEFAULT 0 CHECK (total_work_days >= 0),
    actual_work_days            INTEGER DEFAULT 0 CHECK (actual_work_days >= 0),
    absence_days                INTEGER DEFAULT 0 CHECK (absence_days >= 0),
    paid_leave_days             INTEGER DEFAULT 0 CHECK (paid_leave_days >= 0),
    
    -- === 作業概要 ===
    work_summary                JSONB,
    major_accomplishments       TEXT,
    challenges_faced            TEXT,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'SUBMITTED',            -- 提出済み
        'UNDER_REVIEW',         -- 確認中
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 却下
        'NEEDS_REVISION'        -- 修正要求
    )),
    
    -- === 提出・承認情報 ===
    submitted_at                TIMESTAMP WITH TIME ZONE,
    submitted_by                UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    approved_by                 UUID,
    approval_comments           TEXT,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_engineer_period UNIQUE(engineer_id, period_year, period_month) WHERE deleted_at IS NULL,
    CONSTRAINT valid_work_hours CHECK (
        total_work_hours = regular_work_hours + overtime_hours + holiday_work_hours
    ),
    CONSTRAINT valid_work_days CHECK (
        actual_work_days + absence_days + paid_leave_days <= total_work_days
    )
);

-- ----------------------------------------------------------------
-- 5.3 Billing Context
-- ----------------------------------------------------------------

\echo '5.3 Creating Billing Context tables...'

-- invoices テーブル
CREATE TABLE billing_context.invoices (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連情報 ===
    customer_id                 UUID NOT NULL,
    contract_id                 UUID NOT NULL,
    timesheet_id                UUID,
    
    -- === 請求書基本情報 ===
    invoice_number              VARCHAR(50) UNIQUE NOT NULL,
    invoice_title               VARCHAR(200) NOT NULL,
    
    -- === 請求期間 ===
    billing_period_year         INTEGER NOT NULL,
    billing_period_month        INTEGER NOT NULL CHECK (billing_period_month >= 1 AND billing_period_month <= 12),
    billing_period_from         DATE NOT NULL,
    billing_period_to           DATE NOT NULL,
    
    -- === 金額情報 ===
    subtotal_amount             DECIMAL(15,2) NOT NULL CHECK (subtotal_amount >= 0),
    tax_rate                    DECIMAL(5,4) DEFAULT 0.10,
    tax_amount                  DECIMAL(15,2) GENERATED ALWAYS AS (
        subtotal_amount * tax_rate
    ) STORED,
    total_amount                DECIMAL(15,2) GENERATED ALWAYS AS (
        subtotal_amount + (subtotal_amount * tax_rate)
    ) STORED,
    currency                    VARCHAR(3) DEFAULT 'JPY',
    
    -- === 請求詳細 ===
    billing_details             JSONB,
    work_hours_summary          JSONB,
    
    -- === 発行・支払情報 ===
    issue_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date                    DATE NOT NULL,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'ISSUED',               -- 発行済み
        'SENT',                 -- 送付済み
        'PAID',                 -- 支払済み
        'OVERDUE',              -- 期限超過
        'CANCELLED',            -- キャンセル
        'DISPUTED'              -- 異議申し立て
    )),
    
    -- === 外部連携情報 ===
    moneyforward_invoice_id     VARCHAR(100),
    external_system_status      VARCHAR(20),
    sync_status                 VARCHAR(20) DEFAULT 'PENDING' CHECK (sync_status IN (
        'PENDING', 'SYNCED', 'FAILED', 'NOT_REQUIRED'
    )),
    last_sync_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_billing_period CHECK (billing_period_to >= billing_period_from),
    CONSTRAINT valid_due_date CHECK (due_date >= issue_date)
);

-- ================================================================
-- 6. Generic Contexts テーブル作成
-- ================================================================

\echo '6. Creating Generic Contexts tables...'

-- ----------------------------------------------------------------
-- 6.1 Report Context
-- ----------------------------------------------------------------

\echo '6.1 Creating Report Context tables...'

-- analytics_data テーブル
CREATE TABLE report_context.analytics_data (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 基本情報 ===
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SALES', 'MATCHING', 'WORK_HOURS', 'PROJECT', 'ENGINEER', 'CUSTOMER', 'FINANCIAL'
    )),
    analytics_type              VARCHAR(20) NOT NULL CHECK (analytics_type IN (
        'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'
    )),
    
    -- === 対象期間 ===
    target_date                 DATE,
    target_year                 INTEGER,
    target_month                INTEGER CHECK (target_month >= 1 AND target_month <= 12),
    target_quarter              INTEGER CHECK (target_quarter >= 1 AND target_quarter <= 4),
    
    -- === 集計情報 ===
    aggregation_level           VARCHAR(20) NOT NULL CHECK (aggregation_level IN (
        'DAILY', 'MONTHLY', 'AGGREGATED'
    )),
    aggregation_key             VARCHAR(200) NOT NULL,
    
    -- === メトリクスデータ ===
    metrics                     JSONB NOT NULL,
    numeric_values              JSONB,
    text_values                 JSONB,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'CALCULATED' CHECK (status IN (
        'CALCULATING', 'CALCULATED', 'ARCHIVED'
    )),
    calculated_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- === バージョン管理 ===
    version                     INTEGER NOT NULL DEFAULT 1,
    is_latest                   BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    data_version                INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_latest_analytics UNIQUE(category, analytics_type, aggregation_key) 
        WHERE is_latest = true AND deleted_at IS NULL
);

-- ----------------------------------------------------------------
-- 6.2 Notification Context
-- ----------------------------------------------------------------

\echo '6.2 Creating Notification Context tables...'

-- notifications テーブル
CREATE TABLE notification_context.notifications (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 通知基本情報 ===
    notification_type           VARCHAR(20) NOT NULL CHECK (notification_type IN (
        'INFO', 'WARNING', 'ERROR', 'ALERT', 'REMINDER'
    )),
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SYSTEM', 'BUSINESS', 'APPROVAL', 'DEADLINE', 'SECURITY'
    )),
    priority                    VARCHAR(10) NOT NULL CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    )),
    priority_level              INTEGER GENERATED ALWAYS AS (
        CASE priority
            WHEN 'LOW' THEN 1
            WHEN 'MEDIUM' THEN 2
            WHEN 'HIGH' THEN 3
            WHEN 'URGENT' THEN 4
        END
    ) STORED,
    
    -- === コンテンツ ===
    title                       VARCHAR(500) NOT NULL,
    message                     TEXT NOT NULL,
    action_url                  VARCHAR(1000),
    
    -- === 受信者情報 ===
    audience                    VARCHAR(20) NOT NULL CHECK (audience IN (
        'ALL_USERS', 'SPECIFIC_USERS', 'ROLE_BASED', 'DEPARTMENT'
    )),
    recipient_users             JSONB,
    recipient_roles             JSONB,
    
    -- === 送信設定 ===
    timing                      VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE' CHECK (timing IN (
        'IMMEDIATE', 'SCHEDULED', 'DELAYED'
    )),
    scheduled_at                TIMESTAMP WITH TIME ZONE,
    delay_minutes               INTEGER,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'SCHEDULED', 'SENDING', 'SENT', 'PARTIALLY_SENT', 
        'FAILED', 'RETRYING', 'CANCELLED'
    )),
    
    -- === 配信統計 ===
    total_recipients            INTEGER DEFAULT 0,
    successful_deliveries       INTEGER DEFAULT 0,
    failed_deliveries           INTEGER DEFAULT 0,
    delivery_success_rate       DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_recipients > 0 
            THEN ROUND((successful_deliveries::DECIMAL / total_recipients) * 100, 2)
            ELSE 0
        END
    ) STORED,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- 7. 統合インデックス・パフォーマンス最適化
-- ================================================================

\echo '7. Creating integrated indexes and performance optimization...'

-- 共通インデックス（全テーブル）
DO $$
DECLARE
    table_record RECORD;
    index_sql TEXT;
BEGIN
    -- 全テーブルに共通インデックスを作成
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
    LOOP
        -- created_at インデックス
        index_sql := format(
            'CREATE INDEX IF NOT EXISTS idx_%s_%s_created_at ON %I.%I(created_at) WHERE deleted_at IS NULL',
            table_record.schemaname, table_record.tablename,
            table_record.schemaname, table_record.tablename
        );
        EXECUTE index_sql;
        
        -- updated_at インデックス
        index_sql := format(
            'CREATE INDEX IF NOT EXISTS idx_%s_%s_updated_at ON %I.%I(updated_at) WHERE deleted_at IS NULL',
            table_record.schemaname, table_record.tablename,
            table_record.schemaname, table_record.tablename
        );
        EXECUTE index_sql;
        
        -- deleted_at インデックス
        index_sql := format(
            'CREATE INDEX IF NOT EXISTS idx_%s_%s_deleted_at ON %I.%I(deleted_at) WHERE deleted_at IS NOT NULL',
            table_record.schemaname, table_record.tablename,
            table_record.schemaname, table_record.tablename
        );
        EXECUTE index_sql;
    END LOOP;
END $$;

-- コンテキスト固有の複合インデックス
CREATE INDEX IF NOT EXISTS idx_projects_status_priority ON project_context.projects(status, priority) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_engineers_availability_skill ON engineer_context.engineers(availability_status, skill_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_matching_score_status ON matching_context.matching_results(matching_score DESC, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_status_period ON contract_context.contracts(status, start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timesheets_period_status ON timesheet_context.timesheets(period_year, period_month, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON billing_context.invoices(status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_category_date ON report_context.analytics_data(category, target_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_priority_status ON notification_context.notifications(priority_level DESC, status) WHERE deleted_at IS NULL;

-- JSONB検索用GINインデックス
CREATE INDEX IF NOT EXISTS idx_projects_requirements_gin ON project_context.projects USING GIN (requirements);
CREATE INDEX IF NOT EXISTS idx_engineers_skills_gin ON engineer_context.engineers USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_matching_required_skills_gin ON matching_context.matching_requests USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_contracts_terms_gin ON contract_context.contracts USING GIN (contract_terms);
CREATE INDEX IF NOT EXISTS idx_timesheets_work_summary_gin ON timesheet_context.timesheets USING GIN (work_summary);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_details_gin ON billing_context.invoices USING GIN (billing_details);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_gin ON report_context.analytics_data USING GIN (metrics);
CREATE INDEX IF NOT EXISTS idx_notifications_recipients_gin ON notification_context.notifications USING GIN (recipient_users);

-- ================================================================
-- 8. 統合ビュー作成
-- ================================================================

\echo '8. Creating integrated views...'

-- 統合ダッシュボード統計ビュー
CREATE OR REPLACE VIEW shared_functions.integrated_dashboard_stats AS
SELECT 
    -- Project統計
    (SELECT COUNT(*) FROM project_context.projects WHERE status = 'ACTIVE' AND deleted_at IS NULL) as active_projects,
    (SELECT COUNT(*) FROM project_context.projects WHERE status = 'COMPLETED' AND deleted_at IS NULL) as completed_projects,
    
    -- Engineer統計
    (SELECT COUNT(*) FROM engineer_context.engineers WHERE availability_status = 'AVAILABLE' AND deleted_at IS NULL) as available_engineers,
    (SELECT COUNT(*) FROM engineer_context.engineers WHERE deleted_at IS NULL) as total_engineers,
    
    -- Contract統計
    (SELECT COUNT(*) FROM contract_context.contracts WHERE status = 'ACTIVE' AND deleted_at IS NULL) as active_contracts,
    
    -- Billing統計
    (SELECT COALESCE(SUM(total_amount), 0) FROM billing_context.invoices WHERE status = 'PAID' AND deleted_at IS NULL) as total_revenue,
    (SELECT COUNT(*) FROM billing_context.invoices WHERE status = 'UNPAID' AND deleted_at IS NULL) as unpaid_invoices,
    
    -- 更新日時
    CURRENT_TIMESTAMP as last_updated;

-- パフォーマンス監視ビュー
CREATE OR REPLACE VIEW shared_functions.performance_metrics AS
SELECT 
    'Database Size' as metric_name,
    pg_size_pretty(pg_database_size(current_database())) as metric_value
UNION ALL
SELECT 
    'Active Connections',
    COUNT(*)::TEXT
FROM pg_stat_activity 
WHERE state = 'active'
UNION ALL
SELECT 
    'Cache Hit Ratio',
    ROUND(
        (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
    )::TEXT || '%'
FROM pg_statio_user_tables;

-- ================================================================
-- 9. 全テーブルトリガー設定
-- ================================================================

\echo '9. Setting up triggers for all tables...'

-- 更新日時自動更新トリガーを全テーブルに適用
DO $$
DECLARE
    table_record RECORD;
    trigger_sql TEXT;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
        AND tablename NOT LIKE '%_partitioned'
    LOOP
        trigger_sql := format(
            'CREATE TRIGGER IF NOT EXISTS trigger_%s_%s_updated_at
             BEFORE UPDATE ON %I.%I
             FOR EACH ROW
             EXECUTE FUNCTION shared_functions.update_updated_at()',
            table_record.schemaname, table_record.tablename,
            table_record.schemaname, table_record.tablename
        );
        
        BEGIN
            EXECUTE trigger_sql;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create trigger for %.%: %', table_record.schemaname, table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ================================================================
-- 10. データベース設定最適化
-- ================================================================

\echo '10. Optimizing database settings...'

-- パフォーマンス最適化設定
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 1000;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- ログ設定
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- ================================================================
-- 初期化完了
-- ================================================================

\echo 'SES Database Initialization completed successfully!'
\echo 'Please restart PostgreSQL to apply system-level configuration changes.'

-- 統計情報表示
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname IN (
    'project_context', 'engineer_context', 'matching_context', 
    'contract_context', 'timesheet_context', 'billing_context', 
    'report_context', 'notification_context'
)
GROUP BY schemaname
ORDER BY schemaname;

\echo 'Database schema creation completed. Tables created by context:';