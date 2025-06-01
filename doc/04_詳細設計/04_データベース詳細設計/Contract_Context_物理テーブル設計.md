# Contract Context 物理テーブル設計

## 概要

Contract Context（契約管理）の物理データベース設計。電子契約プロセス、CloudSign連携、契約条件管理の効率的な実現を目指す。

### 対象集約
- **Contract集約**: 契約書ライフサイクル管理の中核
- **ContractTemplate集約**: 契約書テンプレート管理
- **DigitalSignature集約**: 電子署名プロセス管理

---

## テーブル設計

### 1. contracts（契約テーブル）

```sql
-- Contract集約ルート
CREATE TABLE contracts (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連エンティティ ===
    project_id                  UUID NOT NULL,
    customer_id                 UUID NOT NULL,
    contractor_company_id       UUID NOT NULL,
    
    -- === 契約基本情報 ===
    contract_number             VARCHAR(50) UNIQUE NOT NULL,
    title                       VARCHAR(200) NOT NULL,
    contract_type               VARCHAR(30) NOT NULL CHECK (contract_type IN (
        'EMPLOYMENT_AGREEMENT',  -- 準委任契約
        'DISPATCH_AGREEMENT',    -- 派遣契約
        'SUBCONTRACTING',        -- 請負契約
        'CONSULTING',            -- コンサルティング契約
        'MAINTENANCE',           -- 保守契約
        'LICENSE'                -- ライセンス契約
    )),
    
    -- === ステータス管理 ===
    status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'PENDING_SIGNATURE',    -- 署名待ち
        'ACTIVE',               -- 有効
        'EXPIRED',              -- 期限切れ
        'TERMINATED',           -- 終了
        'CANCELLED'             -- キャンセル
    )),
    
    -- === 期間情報 ===
    start_date                  DATE NOT NULL,
    end_date                    DATE NOT NULL,
    is_indefinite               BOOLEAN DEFAULT FALSE,
    renewal_type                VARCHAR(20) CHECK (renewal_type IN (
        'MANUAL',               -- 手動更新
        'AUTOMATIC',            -- 自動更新
        'NON_RENEWABLE'         -- 更新不可
    )),
    
    -- === 金額情報 ===
    pricing_type                VARCHAR(20) NOT NULL CHECK (pricing_type IN (
        'MONTHLY',              -- 月額固定
        'HOURLY',               -- 時間単価
        'PROJECT'               -- プロジェクト単価
    )),
    monthly_cost                DECIMAL(12,2),
    hourly_rate                 DECIMAL(8,2),
    total_amount                DECIMAL(15,2),
    currency                    VARCHAR(3) DEFAULT 'JPY',
    tax_inclusion_type          VARCHAR(10) DEFAULT 'EXCLUSIVE' CHECK (tax_inclusion_type IN (
        'INCLUSIVE',            -- 税込
        'EXCLUSIVE'             -- 税別
    )),
    
    -- === 特別料金 ===
    overtime_rate               DECIMAL(8,2),
    holiday_rate                DECIMAL(8,2),
    allowances                  JSONB,
    /*
    allowances構造:
    [
        {
            "type": "TRANSPORTATION",
            "name": "交通費",
            "amount": 10000,
            "frequency": "MONTHLY"
        },
        {
            "type": "COMMUNICATION",
            "name": "通信費",
            "amount": 5000,
            "frequency": "MONTHLY"
        }
    ]
    */
    
    -- === 勤務条件 ===
    work_location               VARCHAR(20) CHECK (work_location IN (
        'CLIENT_SITE',          -- 客先
        'REMOTE',               -- リモート
        'HYBRID',               -- ハイブリッド
        'OFFICE'                -- 自社オフィス
    )),
    working_hours               JSONB,
    /*
    working_hours構造:
    {
        "standardHours": 8,
        "startTime": "09:00",
        "endTime": "18:00",
        "breakTime": 60,
        "flexibleTime": true,
        "coreTime": {
            "start": "10:00",
            "end": "15:00"
        }
    }
    */
    
    -- === 業務内容 ===
    job_description             TEXT NOT NULL,
    responsibilities            JSONB,
    /*
    responsibilities構造:
    [
        "システム設計・開発",
        "コードレビュー",
        "技術指導",
        "ドキュメント作成"
    ]
    */
    performance_requirements    JSONB,
    
    -- === 法的条件 ===
    confidentiality_clause      JSONB,
    /*
    confidentiality_clause構造:
    {
        "isApplicable": true,
        "scope": "プロジェクト関連情報全般",
        "duration": "契約終了後2年間",
        "penalties": "損害賠償請求"
    }
    */
    intellectual_property_clause JSONB,
    termination_clause          JSONB,
    special_clauses             JSONB,
    
    -- === テンプレート情報 ===
    template_id                 UUID,
    version_number              INTEGER DEFAULT 1,
    
    -- === CloudSign連携 ===
    cloudsign_document_id       VARCHAR(100),
    document_url                VARCHAR(500),
    cloudsign_status            VARCHAR(30),
    
    -- === 技術者情報 ===
    engineer_assignments        JSONB NOT NULL,
    /*
    engineer_assignments構造:
    [
        {
            "engineerId": "uuid1",
            "role": "主担当",
            "startDate": "2025-04-01",
            "endDate": "2025-09-30",
            "monthlyCost": 800000,
            "hourlyRate": 5000
        }
    ]
    */
    
    -- === 支払条件 ===
    payment_terms               JSONB,
    /*
    payment_terms構造:
    {
        "paymentCycle": "MONTHLY",
        "paymentDate": "月末締め翌月末支払い",
        "paymentMethod": "BANK_TRANSFER",
        "invoiceSubmissionDeadline": "翌月5日",
        "lateFee": 0.015
    }
    */
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_contract_dates CHECK (
        start_date <= end_date
    ),
    CONSTRAINT valid_monthly_cost CHECK (
        pricing_type != 'MONTHLY' OR monthly_cost IS NOT NULL
    ),
    CONSTRAINT valid_hourly_rate CHECK (
        pricing_type != 'HOURLY' OR hourly_rate IS NOT NULL
    ),
    CONSTRAINT valid_indefinite_contract CHECK (
        NOT is_indefinite OR end_date >= start_date + INTERVAL '10 years'
    )
);

-- インデックス
CREATE INDEX idx_contracts_status ON contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_project_id ON contracts(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_customer_id ON contracts(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_contractor_company ON contracts(contractor_company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_contract_number ON contracts(contract_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_cloudsign ON contracts(cloudsign_document_id) WHERE deleted_at IS NULL;

-- 技術者アサイン検索用GINインデックス
CREATE INDEX idx_contracts_engineer_assignments ON contracts USING GIN (engineer_assignments);

-- 契約条件検索用GINインデックス
CREATE INDEX idx_contracts_responsibilities ON contracts USING GIN (responsibilities);
CREATE INDEX idx_contracts_allowances ON contracts USING GIN (allowances);
CREATE INDEX idx_contracts_payment_terms ON contracts USING GIN (payment_terms);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. contract_signatures（契約署名テーブル）

```sql
-- 電子署名管理テーブル
CREATE TABLE contract_signatures (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id                 UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    
    -- === 署名者情報 ===
    signatory_type              VARCHAR(20) NOT NULL CHECK (signatory_type IN (
        'CUSTOMER',             -- 顧客
        'CONTRACTOR',           -- 受託会社
        'ENGINEER',             -- 技術者
        'GUARANTOR'             -- 連帯保証人
    )),
    signatory_email             VARCHAR(200) NOT NULL,
    signatory_name              VARCHAR(200),
    signatory_organization      VARCHAR(200),
    
    -- === 署名状態 ===
    signature_status            VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (signature_status IN (
        'PENDING',              -- 待機
        'SENT',                 -- 送信済
        'VIEWED',               -- 閲覧済
        'COMPLETED',            -- 完了
        'REJECTED',             -- 拒否
        'EXPIRED',              -- 期限切れ
        'NOT_REQUIRED'          -- 署名不要
    )),
    
    -- === 署名処理情報 ===
    requested_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at                     TIMESTAMP WITH TIME ZONE,
    viewed_at                   TIMESTAMP WITH TIME ZONE,
    signed_at                   TIMESTAMP WITH TIME ZONE,
    signed_by                   VARCHAR(200),
    rejection_reason            TEXT,
    
    -- === CloudSign連携情報 ===
    cloudsign_signature_id      VARCHAR(100),
    signature_url               VARCHAR(500),
    signing_deadline            TIMESTAMP WITH TIME ZONE,
    
    -- === 署名設定 ===
    signature_order             INTEGER DEFAULT 1,
    is_required                 BOOLEAN DEFAULT TRUE,
    reminder_settings           JSONB,
    /*
    reminder_settings構造:
    {
        "reminderDays": [7, 3, 1],
        "lastReminderSent": "2025-06-01T10:00:00Z",
        "maxReminders": 3,
        "reminderCount": 0
    }
    */
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_contract_signatory UNIQUE(contract_id, signatory_type) WHERE deleted_at IS NULL,
    CONSTRAINT valid_signature_dates CHECK (
        requested_at <= COALESCE(sent_at, requested_at) AND
        sent_at <= COALESCE(signed_at, sent_at)
    )
);

-- インデックス
CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_signatures_status ON contract_signatures(signature_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_signatures_signatory_type ON contract_signatures(signatory_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_signatures_deadline ON contract_signatures(signing_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_signatures_cloudsign ON contract_signatures(cloudsign_signature_id) WHERE deleted_at IS NULL;

-- 署名順序検索用複合インデックス
CREATE INDEX idx_contract_signatures_order ON contract_signatures(contract_id, signature_order) 
WHERE deleted_at IS NULL;

-- リマインダー設定検索用GINインデックス
CREATE INDEX idx_contract_signatures_reminders ON contract_signatures USING GIN (reminder_settings);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_contract_signatures_updated_at
    BEFORE UPDATE ON contract_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. contract_templates（契約テンプレートテーブル）

```sql
-- 契約テンプレート管理テーブル
CREATE TABLE contract_templates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === テンプレート基本情報 ===
    template_name               VARCHAR(200) NOT NULL,
    template_code               VARCHAR(50) UNIQUE NOT NULL,
    description                 TEXT,
    applicable_type             VARCHAR(30) NOT NULL CHECK (applicable_type IN (
        'EMPLOYMENT_AGREEMENT',
        'DISPATCH_AGREEMENT',
        'SUBCONTRACTING',
        'CONSULTING',
        'MAINTENANCE',
        'LICENSE'
    )),
    
    -- === バージョン管理 ===
    version_number              VARCHAR(20) NOT NULL,
    version_description         TEXT,
    is_active                   BOOLEAN DEFAULT FALSE,
    is_default                  BOOLEAN DEFAULT FALSE,
    
    -- === テンプレート内容 ===
    template_content            TEXT NOT NULL,
    template_format             VARCHAR(20) DEFAULT 'HTML' CHECK (template_format IN (
        'HTML', 'MARKDOWN', 'DOCX', 'PDF'
    )),
    
    -- === テンプレート変数 ===
    template_variables          JSONB,
    /*
    template_variables構造:
    [
        {
            "placeholder": "{{CONTRACT_NUMBER}}",
            "variableName": "contractNumber",
            "dataType": "STRING",
            "description": "契約番号",
            "isRequired": true,
            "defaultValue": ""
        },
        {
            "placeholder": "{{ENGINEER_NAME}}",
            "variableName": "engineerName",
            "dataType": "STRING",
            "description": "技術者氏名",
            "isRequired": true
        }
    ]
    */
    
    -- === 適用条件 ===
    applicable_conditions       JSONB,
    /*
    applicable_conditions構造:
    {
        "customerTypes": ["PUBLIC", "PRIVATE"],
        "projectTypes": ["WEB_APPLICATION", "MOBILE_APPLICATION"],
        "contractAmountRange": {
            "min": 0,
            "max": 5000000
        },
        "industries": ["金融", "製造"],
        "specialRequirements": ["機密性レベル3"]
    }
    */
    
    -- === 承認情報 ===
    approval_status             VARCHAR(20) DEFAULT 'DRAFT' CHECK (approval_status IN (
        'DRAFT',                -- 下書き
        'PENDING_APPROVAL',     -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 却下
        'ARCHIVED'              -- アーカイブ
    )),
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    approval_comments           TEXT,
    
    -- === 使用統計 ===
    usage_count                 INTEGER DEFAULT 0,
    last_used_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_template_version UNIQUE(template_code, version_number) WHERE deleted_at IS NULL,
    CONSTRAINT single_default_template EXCLUDE (applicable_type WITH =, is_default WITH =) 
        WHERE (is_default = true AND deleted_at IS NULL)
);

-- インデックス
CREATE INDEX idx_contract_templates_name ON contract_templates(template_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_templates_code ON contract_templates(template_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_templates_type ON contract_templates(applicable_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_templates_active ON contract_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_templates_default ON contract_templates(is_default) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_templates_approval ON contract_templates(approval_status) WHERE deleted_at IS NULL;

-- テンプレート変数検索用GINインデックス
CREATE INDEX idx_contract_templates_variables ON contract_templates USING GIN (template_variables);
CREATE INDEX idx_contract_templates_conditions ON contract_templates USING GIN (applicable_conditions);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_contract_templates_updated_at
    BEFORE UPDATE ON contract_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. contract_amendments（契約変更履歴テーブル）

```sql
-- 契約変更・更新履歴テーブル
CREATE TABLE contract_amendments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id                 UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    
    -- === 変更情報 ===
    amendment_type              VARCHAR(30) NOT NULL CHECK (amendment_type IN (
        'PERIOD_EXTENSION',     -- 期間延長
        'AMOUNT_CHANGE',        -- 金額変更
        'SCOPE_CHANGE',         -- 業務範囲変更
        'TERMS_MODIFICATION',   -- 条件変更
        'ENGINEER_CHANGE',      -- 技術者変更
        'TERMINATION',          -- 契約終了
        'RENEWAL'               -- 契約更新
    )),
    amendment_title             VARCHAR(200) NOT NULL,
    amendment_description       TEXT NOT NULL,
    amendment_reason            TEXT,
    
    -- === 変更内容詳細 ===
    changes_detail              JSONB NOT NULL,
    /*
    changes_detail構造:
    {
        "fieldChanges": [
            {
                "fieldName": "end_date",
                "oldValue": "2025-09-30",
                "newValue": "2025-12-31",
                "changeReason": "プロジェクト期間延長"
            }
        ],
        "additionalTerms": [
            "延長期間中の月額単価は据え置き"
        ],
        "affectedAreas": ["工数管理", "請求処理"]
    }
    */
    
    -- === 効力発生情報 ===
    effective_date              DATE NOT NULL,
    expiration_date             DATE,
    
    -- === 承認プロセス ===
    approval_status             VARCHAR(20) DEFAULT 'DRAFT' CHECK (approval_status IN (
        'DRAFT',                -- 下書き
        'PENDING_APPROVAL',     -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 却下
        'EFFECTIVE'             -- 効力発生済み
    )),
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    
    -- === 署名情報 ===
    requires_signature          BOOLEAN DEFAULT TRUE,
    signature_completed         BOOLEAN DEFAULT FALSE,
    signature_completed_at      TIMESTAMP WITH TIME ZONE,
    
    -- === 関連ドキュメント ===
    amendment_document_url      VARCHAR(500),
    cloudsign_amendment_id      VARCHAR(100),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_amendment_dates CHECK (
        effective_date >= created_at::DATE AND
        (expiration_date IS NULL OR expiration_date >= effective_date)
    )
);

-- インデックス
CREATE INDEX idx_contract_amendments_contract_id ON contract_amendments(contract_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_amendments_type ON contract_amendments(amendment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_amendments_status ON contract_amendments(approval_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_amendments_effective_date ON contract_amendments(effective_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_contract_amendments_cloudsign ON contract_amendments(cloudsign_amendment_id) WHERE deleted_at IS NULL;

-- 変更内容検索用GINインデックス
CREATE INDEX idx_contract_amendments_changes ON contract_amendments USING GIN (changes_detail);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_contract_amendments_updated_at
    BEFORE UPDATE ON contract_amendments
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. contract_summary_view（契約サマリービュー）

```sql
-- 契約一覧表示用のビュー
CREATE VIEW contract_summary_view AS
SELECT 
    c.id,
    c.contract_number,
    c.title,
    c.contract_type,
    c.status,
    c.start_date,
    c.end_date,
    c.pricing_type,
    c.monthly_cost,
    c.total_amount,
    c.currency,
    c.work_location,
    c.created_at,
    c.updated_at,
    
    -- プロジェクト情報（Project Contextから）
    p.name as project_name,
    p.status as project_status,
    
    -- 顧客情報（Customer Contextから）
    cust.name as customer_name,
    cust.industry as customer_industry,
    
    -- 署名統計
    sig_stats.total_signatures,
    sig_stats.completed_signatures,
    sig_stats.pending_signatures,
    sig_stats.all_signatures_completed,
    
    -- 技術者情報
    engineer_info.engineer_count,
    engineer_info.primary_engineer,
    
    -- 契約期間情報
    CASE 
        WHEN c.end_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN c.start_date > CURRENT_DATE THEN 'FUTURE'
        ELSE 'CURRENT'
    END as period_status,
    
    -- CloudSign連携状況
    c.cloudsign_document_id IS NOT NULL as is_cloudsign_enabled,
    c.cloudsign_status
    
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_signatures,
        COUNT(*) FILTER (WHERE signature_status = 'COMPLETED') as completed_signatures,
        COUNT(*) FILTER (WHERE signature_status IN ('PENDING', 'SENT')) as pending_signatures,
        COUNT(*) = COUNT(*) FILTER (WHERE signature_status = 'COMPLETED') as all_signatures_completed
    FROM contract_signatures cs 
    WHERE cs.contract_id = c.id 
      AND cs.deleted_at IS NULL
      AND cs.is_required = true
) sig_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        jsonb_array_length(c.engineer_assignments) as engineer_count,
        (c.engineer_assignments->0->>'engineerId')::UUID as primary_engineer
) engineer_info ON true
WHERE c.deleted_at IS NULL;
```

### 2. contract_expiring_view（契約期限アラートビュー）

```sql
-- 契約期限アラート用のビュー
CREATE VIEW contract_expiring_view AS
SELECT 
    c.id,
    c.contract_number,
    c.title,
    c.end_date,
    c.renewal_type,
    c.project_id,
    c.customer_id,
    
    -- 期限までの日数
    c.end_date - CURRENT_DATE as days_to_expiry,
    
    -- アラートレベル
    CASE 
        WHEN c.end_date - CURRENT_DATE <= 7 THEN 'CRITICAL'
        WHEN c.end_date - CURRENT_DATE <= 30 THEN 'WARNING'
        WHEN c.end_date - CURRENT_DATE <= 60 THEN 'INFO'
        ELSE 'NORMAL'
    END as alert_level,
    
    -- 自動更新可否
    c.renewal_type = 'AUTOMATIC' as auto_renewable,
    
    -- 通知必要性
    CASE 
        WHEN c.renewal_type = 'NON_RENEWABLE' AND c.end_date - CURRENT_DATE <= 30 THEN true
        WHEN c.renewal_type = 'MANUAL' AND c.end_date - CURRENT_DATE <= 60 THEN true
        ELSE false
    END as notification_required,
    
    -- 顧客・プロジェクト情報
    cust.name as customer_name,
    p.name as project_name,
    
    -- 技術者情報
    (c.engineer_assignments->0->>'engineerId')::UUID as primary_engineer_id
    
FROM contracts c
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN projects p ON c.project_id = p.id
WHERE c.deleted_at IS NULL
  AND c.status = 'ACTIVE'
  AND c.end_date >= CURRENT_DATE
  AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY c.end_date;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- contract_amendments のパーティショニング（年次）
CREATE TABLE contract_amendments_partitioned (
    LIKE contract_amendments INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 年次パーティション作成例
CREATE TABLE contract_amendments_2025 
PARTITION OF contract_amendments_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE contract_amendments_2026 
PARTITION OF contract_amendments_partitioned
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- デフォルトパーティション
CREATE TABLE contract_amendments_default 
PARTITION OF contract_amendments_partitioned
DEFAULT;
```

### 2. マテリアライズドビュー

```sql
-- 契約統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW contract_monthly_stats AS
SELECT 
    date_trunc('month', c.created_at) as month,
    c.contract_type,
    c.status,
    COUNT(*) as contract_count,
    AVG(c.monthly_cost) as avg_monthly_cost,
    SUM(c.total_amount) as total_contract_value,
    COUNT(*) FILTER (WHERE sig_stats.all_signatures_completed) as fully_signed_count,
    AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at))/86400) as avg_processing_days
FROM contracts c
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) = COUNT(*) FILTER (WHERE signature_status = 'COMPLETED') as all_signatures_completed
    FROM contract_signatures cs 
    WHERE cs.contract_id = c.id 
      AND cs.deleted_at IS NULL
      AND cs.is_required = true
) sig_stats ON true
WHERE c.deleted_at IS NULL
  AND c.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    date_trunc('month', c.created_at),
    c.contract_type,
    c.status;

-- 統計ビュー用インデックス
CREATE INDEX idx_contract_monthly_stats_month ON contract_monthly_stats(month);
CREATE INDEX idx_contract_monthly_stats_type ON contract_monthly_stats(contract_type);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_contract_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY contract_monthly_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. ビジネスルール制約

```sql
-- 契約ステータス遷移制約
CREATE OR REPLACE FUNCTION validate_contract_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed_transitions TEXT[][] := ARRAY[
        ['DRAFT', 'PENDING_SIGNATURE'],
        ['DRAFT', 'CANCELLED'],
        ['PENDING_SIGNATURE', 'ACTIVE'],
        ['PENDING_SIGNATURE', 'CANCELLED'],
        ['ACTIVE', 'EXPIRED'],
        ['ACTIVE', 'TERMINATED']
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

CREATE TRIGGER trigger_validate_contract_status_transition
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION validate_contract_status_transition();
```

### 2. 署名完了チェック関数

```sql
-- 全署名完了チェック関数
CREATE OR REPLACE FUNCTION check_all_signatures_completed()
RETURNS TRIGGER AS $$
DECLARE
    contract_id_val UUID;
    required_signature_count INTEGER;
    completed_signature_count INTEGER;
BEGIN
    contract_id_val := NEW.contract_id;
    
    -- 必要な署名数
    SELECT COUNT(*) INTO required_signature_count
    FROM contract_signatures 
    WHERE contract_id = contract_id_val 
      AND is_required = true 
      AND deleted_at IS NULL;
    
    -- 完了した署名数
    SELECT COUNT(*) INTO completed_signature_count
    FROM contract_signatures 
    WHERE contract_id = contract_id_val 
      AND signature_status = 'COMPLETED' 
      AND is_required = true 
      AND deleted_at IS NULL;
    
    -- 全署名完了時の契約ステータス更新
    IF required_signature_count > 0 AND required_signature_count = completed_signature_count THEN
        UPDATE contracts 
        SET status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = contract_id_val 
          AND status = 'PENDING_SIGNATURE';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_signatures_completed
    AFTER INSERT OR UPDATE ON contract_signatures
    FOR EACH ROW
    WHEN (NEW.signature_status = 'COMPLETED')
    EXECUTE FUNCTION check_all_signatures_completed();
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- 営業担当者は自分の案件の契約のみアクセス可能
CREATE POLICY contract_sales_access ON contracts
    FOR ALL
    TO ses_sales_role
    USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE sales_representative_id = current_setting('app.current_user_id')::UUID
        )
    );

-- 人事・管理者は全契約アクセス可能
CREATE POLICY contract_admin_access ON contracts
    FOR ALL
    TO ses_admin_role, ses_hr_role
    USING (true);

-- 技術者は自分が関与する契約のみ参照可能
CREATE POLICY contract_engineer_access ON contracts
    FOR SELECT
    TO ses_engineer_role
    USING (
        engineer_assignments @> 
        jsonb_build_array(
            jsonb_build_object('engineerId', current_setting('app.current_user_id'))
        )
    );
```

### 2. 機密データ暗号化

```sql
-- 契約内容暗号化トリガー
CREATE OR REPLACE FUNCTION encrypt_contract_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 給与・金額情報の暗号化処理
    IF NEW.monthly_cost IS NOT NULL THEN
        -- 実際の暗号化実装は要件に応じて
        -- NEW.monthly_cost := encrypt_sensitive_data(NEW.monthly_cost::TEXT)::DECIMAL;
    END IF;
    
    -- 技術者個人情報の暗号化
    IF NEW.engineer_assignments IS NOT NULL THEN
        -- 個人情報部分の暗号化処理
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_encrypt_contract_data
    BEFORE INSERT OR UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_contract_sensitive_data();
```

---

## 運用・保守設計

### 1. データアーカイブ

```sql
-- 古い契約データのアーカイブ
CREATE OR REPLACE FUNCTION archive_old_contracts(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 5年前に終了した契約をアーカイブ
    WITH archived_contracts AS (
        UPDATE contracts 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE status IN ('EXPIRED', 'TERMINATED') 
          AND end_date < cutoff_date
          AND deleted_at IS NULL
        RETURNING id
    )
    UPDATE contract_signatures 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE contract_id IN (SELECT id FROM archived_contracts)
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. 契約期限監視

```sql
-- 契約期限アラート関数
CREATE OR REPLACE FUNCTION check_contract_expiration_alerts()
RETURNS TABLE(
    contract_id UUID, 
    contract_number VARCHAR, 
    customer_name VARCHAR,
    days_to_expiry INTEGER,
    alert_level VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.contract_number,
        cust.name,
        (c.end_date - CURRENT_DATE)::INTEGER,
        CASE 
            WHEN c.end_date - CURRENT_DATE <= 7 THEN 'CRITICAL'
            WHEN c.end_date - CURRENT_DATE <= 30 THEN 'WARNING'
            ELSE 'INFO'
        END
    FROM contracts c
    JOIN customers cust ON c.customer_id = cust.id
    WHERE c.deleted_at IS NULL
      AND c.status = 'ACTIVE'
      AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND c.renewal_type != 'AUTOMATIC'
    ORDER BY c.end_date;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Contract集約詳細設計  
**次回レビュー**: 2025年7月1日