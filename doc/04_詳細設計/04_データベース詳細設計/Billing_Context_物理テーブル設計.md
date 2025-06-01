# Billing Context 物理テーブル設計

## 概要

Billing Context（請求・支払管理）の物理データベース設計。月次請求書作成、支払処理、会計システム連携（MoneyForward）の効率的な実現を目指す。

### 対象集約
- **Invoice集約**: 請求書ライフサイクル管理の中核
- **AccountingEntry集約**: 会計仕訳データ管理
- **Payment集約**: 支払記録管理

---

## テーブル設計

### 1. invoices（請求書テーブル）

```sql
-- Invoice集約ルート
CREATE TABLE invoices (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連エンティティ ===
    customer_id                 UUID NOT NULL,
    contract_id                 UUID NOT NULL,
    project_id                  UUID NOT NULL,
    
    -- === 請求基本情報 ===
    invoice_number              VARCHAR(50) UNIQUE NOT NULL,
    billing_period_year         INTEGER NOT NULL,
    billing_period_month        INTEGER NOT NULL CHECK (billing_period_month >= 1 AND billing_period_month <= 12),
    issue_date                  DATE,
    due_date                    DATE,
    
    -- === 請求書種別・ステータス ===
    invoice_type                VARCHAR(20) NOT NULL DEFAULT 'REGULAR' CHECK (invoice_type IN (
        'REGULAR',              -- 通常請求
        'CORRECTION',           -- 修正請求
        'CANCELLATION',         -- キャンセル請求
        'ADVANCE'               -- 前払い請求
    )),
    status                      VARCHAR(30) NOT NULL DEFAULT 'CALCULATING' CHECK (status IN (
        'CALCULATING',          -- 算出中
        'CALCULATED',           -- 算出完了
        'ISSUED',               -- 発行済み
        'PARTIALLY_PAID',       -- 一部支払済み
        'PAID',                 -- 支払完了
        'OVERDUE',              -- 期限超過
        'CANCELLED'             -- キャンセル
    )),
    
    -- === 金額情報 ===
    subtotal_amount             DECIMAL(15,2) DEFAULT 0.00,
    tax_amount                  DECIMAL(15,2) DEFAULT 0.00,
    total_amount                DECIMAL(15,2) DEFAULT 0.00,
    currency                    VARCHAR(3) DEFAULT 'JPY',
    
    -- === 割引・調整情報 ===
    discount_amount             DECIMAL(15,2) DEFAULT 0.00,
    discount_reason             TEXT,
    adjustment_amount           DECIMAL(15,2) DEFAULT 0.00,
    adjustment_reason           TEXT,
    
    -- === 支払情報 ===
    paid_amount                 DECIMAL(15,2) DEFAULT 0.00,
    remaining_amount            DECIMAL(15,2) DEFAULT 0.00,
    payment_count               INTEGER DEFAULT 0,
    
    -- === 税金計算情報 ===
    tax_rate                    DECIMAL(5,4) DEFAULT 0.10,
    tax_calculation_method      VARCHAR(20) DEFAULT 'ROUND_DOWN' CHECK (tax_calculation_method IN (
        'ROUND_UP',             -- 切り上げ
        'ROUND_DOWN',           -- 切り捨て
        'ROUND_HALF_UP'         -- 四捨五入
    )),
    tax_effective_date          DATE,
    
    -- === 工数表情報 ===
    timesheet_ids               JSONB,
    /*
    timesheet_ids構造:
    [
        {
            "timesheetId": "uuid1",
            "period": "2025-06",
            "engineerId": "uuid2"
        }
    ]
    */
    
    -- === ドキュメント情報 ===
    invoice_document_url        VARCHAR(500),
    invoice_document_path       VARCHAR(500),
    invoice_template_id         UUID,
    
    -- === 会計連携情報 ===
    is_accounting_synced        BOOLEAN DEFAULT FALSE,
    accounting_synced_at        TIMESTAMP WITH TIME ZONE,
    moneyforward_invoice_id     VARCHAR(100),
    accounting_sync_error       TEXT,
    
    -- === 期限・通知情報 ===
    payment_terms_days          INTEGER DEFAULT 30,
    reminder_sent_count         INTEGER DEFAULT 0,
    last_reminder_sent_at       TIMESTAMP WITH TIME ZONE,
    collection_notice_sent      BOOLEAN DEFAULT FALSE,
    
    -- === 修正・関連情報 ===
    original_invoice_id         UUID REFERENCES invoices(id),
    correction_reason           TEXT,
    
    -- === 自動計算フィールド ===
    final_amount                DECIMAL(15,2) GENERATED ALWAYS AS (
        subtotal_amount + tax_amount - discount_amount + adjustment_amount
    ) STORED,
    payment_rate                DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_amount > 0 
            THEN ROUND((paid_amount / total_amount) * 100, 2)
            ELSE 0
        END
    ) STORED,
    days_since_issue            INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN issue_date IS NOT NULL 
            THEN EXTRACT(DAYS FROM CURRENT_DATE - issue_date)
            ELSE NULL
        END
    ) STORED,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_contract_period UNIQUE(contract_id, billing_period_year, billing_period_month) WHERE deleted_at IS NULL,
    CONSTRAINT valid_billing_dates CHECK (
        issue_date IS NULL OR due_date IS NULL OR issue_date <= due_date
    ),
    CONSTRAINT valid_amounts CHECK (
        subtotal_amount >= 0 AND
        tax_amount >= 0 AND
        total_amount >= 0 AND
        paid_amount >= 0 AND
        paid_amount <= total_amount
    ),
    CONSTRAINT valid_discount CHECK (
        discount_amount >= 0 AND discount_amount <= subtotal_amount
    ),
    CONSTRAINT valid_tax_rate CHECK (
        tax_rate >= 0 AND tax_rate <= 1
    )
);

-- インデックス
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_contract_id ON invoices(contract_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_project_id ON invoices(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_period ON invoices(billing_period_year, billing_period_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE deleted_at IS NULL;

-- 支払・期限管理用インデックス
CREATE INDEX idx_invoices_payment_status ON invoices(status, paid_amount, total_amount) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_overdue ON invoices(due_date, status) 
WHERE deleted_at IS NULL AND status IN ('ISSUED', 'PARTIALLY_PAID');

-- 会計連携用インデックス
CREATE INDEX idx_invoices_accounting_sync ON invoices(is_accounting_synced) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_moneyforward ON invoices(moneyforward_invoice_id) WHERE deleted_at IS NULL;

-- 修正請求書検索用インデックス
CREATE INDEX idx_invoices_original ON invoices(original_invoice_id) WHERE deleted_at IS NULL;

-- 工数表情報検索用GINインデックス
CREATE INDEX idx_invoices_timesheet_ids ON invoices USING GIN (timesheet_ids);

-- 複合インデックス（統計・レポート用）
CREATE INDEX idx_invoices_customer_period ON invoices(customer_id, billing_period_year, billing_period_month) 
WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status_amount ON invoices(status, total_amount DESC) WHERE deleted_at IS NULL;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. invoice_billing_items（請求項目テーブル）

```sql
-- 請求項目詳細テーブル
CREATE TABLE invoice_billing_items (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id                  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- === 項目情報 ===
    item_type                   VARCHAR(30) NOT NULL CHECK (item_type IN (
        'BASIC_WORK',           -- 基本労働
        'OVERTIME',             -- 時間外労働
        'HOLIDAY_WORK',         -- 休日勤務
        'NIGHT_WORK',           -- 深夜勤務
        'SPECIAL_WORK',         -- 特別作業
        'TRAVEL_EXPENSE',       -- 交通費
        'MATERIAL_COST',        -- 材料費
        'EQUIPMENT_COST',       -- 機器費用
        'OTHER'                 -- その他
    )),
    
    -- === 項目詳細 ===
    item_name                   VARCHAR(200) NOT NULL,
    item_description            TEXT,
    item_category               VARCHAR(50),
    
    -- === 数量・単価 ===
    quantity                    DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit                        VARCHAR(20) NOT NULL DEFAULT 'hours',
    unit_price                  DECIMAL(12,2) NOT NULL,
    amount                      DECIMAL(15,2) NOT NULL,
    
    -- === 税金関連 ===
    tax_category                VARCHAR(20) DEFAULT 'STANDARD' CHECK (tax_category IN (
        'STANDARD',             -- 標準税率
        'REDUCED',              -- 軽減税率
        'EXEMPT'                -- 非課税
    )),
    applicable_tax_rate         DECIMAL(5,4) DEFAULT 0.10,
    tax_amount                  DECIMAL(15,2) DEFAULT 0.00,
    amount_with_tax             DECIMAL(15,2) DEFAULT 0.00,
    
    -- === 工数関連情報 ===
    source_data                 JSONB,
    /*
    source_data構造:
    {
        "timesheetId": "uuid1",
        "workDate": "2025-06-15",
        "workHours": 8,
        "workType": "REGULAR",
        "engineerId": "uuid2",
        "workLocation": "CLIENT_SITE"
    }
    */
    
    -- === 項目順序・グループ ===
    item_order                  INTEGER DEFAULT 1,
    item_group                  VARCHAR(50),
    
    -- === 承認・検証情報 ===
    is_verified                 BOOLEAN DEFAULT FALSE,
    verified_by                 UUID,
    verified_at                 TIMESTAMP WITH TIME ZONE,
    verification_comment        TEXT,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_billing_item_amounts CHECK (
        quantity > 0 AND
        unit_price >= 0 AND
        amount >= 0 AND
        tax_amount >= 0 AND
        amount_with_tax >= amount
    ),
    CONSTRAINT valid_tax_rate CHECK (
        applicable_tax_rate >= 0 AND applicable_tax_rate <= 1
    ),
    CONSTRAINT amount_calculation_consistency CHECK (
        ABS(unit_price * quantity - amount) < 0.01
    )
);

-- インデックス
CREATE INDEX idx_invoice_billing_items_invoice_id ON invoice_billing_items(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_billing_items_type ON invoice_billing_items(item_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_billing_items_category ON invoice_billing_items(item_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_billing_items_verified ON invoice_billing_items(is_verified) WHERE deleted_at IS NULL;

-- 項目順序・グループ検索用インデックス
CREATE INDEX idx_invoice_billing_items_order ON invoice_billing_items(invoice_id, item_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_billing_items_group ON invoice_billing_items(item_group) WHERE deleted_at IS NULL;

-- ソースデータ検索用GINインデックス
CREATE INDEX idx_invoice_billing_items_source ON invoice_billing_items USING GIN (source_data);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_invoice_billing_items_updated_at
    BEFORE UPDATE ON invoice_billing_items
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. invoice_payments（請求書支払テーブル）

```sql
-- 請求書支払記録テーブル
CREATE TABLE invoice_payments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id                  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- === 支払基本情報 ===
    payment_amount              DECIMAL(15,2) NOT NULL,
    payment_date                DATE NOT NULL,
    payment_method              VARCHAR(20) NOT NULL CHECK (payment_method IN (
        'BANK_TRANSFER',        -- 銀行振込
        'CREDIT_CARD',          -- クレジットカード
        'CASH',                 -- 現金
        'CHECK',                -- 小切手
        'ELECTRONIC',           -- 電子マネー
        'OFFSET',               -- 相殺
        'OTHER'                 -- その他
    )),
    currency                    VARCHAR(3) DEFAULT 'JPY',
    
    -- === 支払詳細情報 ===
    payment_reference           VARCHAR(100),
    bank_name                   VARCHAR(100),
    account_number              VARCHAR(50),
    payer_name                  VARCHAR(200),
    
    -- === 支払処理情報 ===
    payment_status              VARCHAR(20) NOT NULL DEFAULT 'RECORDED' CHECK (payment_status IN (
        'RECORDED',             -- 記録済み
        'CONFIRMED',            -- 確認済み
        'RECONCILED',           -- 消込済み
        'CANCELLED',            -- 取消
        'DISPUTED'              -- 異議あり
    )),
    
    -- === 処理担当者情報 ===
    processed_by                UUID NOT NULL,
    confirmed_by                UUID,
    confirmed_at                TIMESTAMP WITH TIME ZONE,
    reconciled_by               UUID,
    reconciled_at               TIMESTAMP WITH TIME ZONE,
    
    -- === 銀行取引情報 ===
    bank_transaction_id         VARCHAR(100),
    bank_statement_date         DATE,
    bank_fees                   DECIMAL(10,2) DEFAULT 0.00,
    
    -- === 通貨・為替情報 ===
    exchange_rate               DECIMAL(10,6),
    original_currency           VARCHAR(3),
    original_amount             DECIMAL(15,2),
    
    -- === 分割・複数支払情報 ===
    payment_sequence            INTEGER DEFAULT 1,
    total_payments_expected     INTEGER DEFAULT 1,
    is_partial_payment          BOOLEAN DEFAULT FALSE,
    
    -- === コメント・備考 ===
    payment_comment             TEXT,
    internal_memo               TEXT,
    
    -- === 会計連携情報 ===
    is_accounting_synced        BOOLEAN DEFAULT FALSE,
    accounting_synced_at        TIMESTAMP WITH TIME ZONE,
    moneyforward_receipt_id     VARCHAR(100),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_payment_amount CHECK (payment_amount > 0),
    CONSTRAINT valid_payment_date CHECK (payment_date <= CURRENT_DATE),
    CONSTRAINT valid_exchange_rate CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    CONSTRAINT valid_bank_fees CHECK (bank_fees >= 0),
    CONSTRAINT valid_payment_sequence CHECK (
        payment_sequence > 0 AND payment_sequence <= total_payments_expected
    )
);

-- インデックス
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_date ON invoice_payments(payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_method ON invoice_payments(payment_method) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_status ON invoice_payments(payment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_reference ON invoice_payments(payment_reference) WHERE deleted_at IS NULL;

-- 処理担当者検索用インデックス
CREATE INDEX idx_invoice_payments_processed_by ON invoice_payments(processed_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_confirmed_by ON invoice_payments(confirmed_by) WHERE deleted_at IS NULL;

-- 銀行取引検索用インデックス
CREATE INDEX idx_invoice_payments_bank_transaction ON invoice_payments(bank_transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_statement_date ON invoice_payments(bank_statement_date) WHERE deleted_at IS NULL;

-- 会計連携用インデックス
CREATE INDEX idx_invoice_payments_accounting_sync ON invoice_payments(is_accounting_synced) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_payments_moneyforward ON invoice_payments(moneyforward_receipt_id) WHERE deleted_at IS NULL;

-- 複合インデックス（統計・集計用）
CREATE INDEX idx_invoice_payments_date_amount ON invoice_payments(payment_date, payment_amount DESC) 
WHERE deleted_at IS NULL;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_invoice_payments_updated_at
    BEFORE UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. accounting_entries（会計仕訳テーブル）

```sql
-- 会計仕訳エントリテーブル
CREATE TABLE accounting_entries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id                  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- === 仕訳基本情報 ===
    entry_type                  VARCHAR(30) NOT NULL CHECK (entry_type IN (
        'RECEIVABLE',           -- 売上債権
        'SALES',                -- 売上高
        'TAX_PAYABLE',          -- 仮受消費税
        'CASH',                 -- 現金
        'BANK',                 -- 普通預金
        'DISCOUNT',             -- 売上割引
        'BAD_DEBT',             -- 貸倒損失
        'OTHER'                 -- その他
    )),
    description                 VARCHAR(200) NOT NULL,
    
    -- === 勘定科目情報 ===
    account_code                VARCHAR(20) NOT NULL,
    account_name                VARCHAR(100) NOT NULL,
    sub_account_code            VARCHAR(20),
    sub_account_name            VARCHAR(100),
    
    -- === 金額・方向 ===
    amount                      DECIMAL(15,2) NOT NULL,
    currency                    VARCHAR(3) DEFAULT 'JPY',
    accounting_side             VARCHAR(10) NOT NULL CHECK (accounting_side IN ('DEBIT', 'CREDIT')),
    
    -- === 会計期間 ===
    accounting_date             DATE NOT NULL,
    fiscal_year                 INTEGER NOT NULL,
    fiscal_period_month         INTEGER NOT NULL CHECK (fiscal_period_month >= 1 AND fiscal_period_month <= 12),
    
    -- === 外部システム連携 ===
    external_system_id          VARCHAR(100),
    is_synced                   BOOLEAN DEFAULT FALSE,
    synced_at                   TIMESTAMP WITH TIME ZONE,
    sync_error_message          TEXT,
    
    -- === MoneyForward連携情報 ===
    moneyforward_journal_id     VARCHAR(100),
    moneyforward_transaction_id VARCHAR(100),
    
    -- === 仕訳詳細情報 ===
    journal_details             JSONB,
    /*
    journal_details構造:
    {
        "transactionType": "SALES_INVOICE",
        "originalDocument": "INV-2025-06-001",
        "customerCode": "CUST001",
        "projectCode": "PROJ001",
        "departmentCode": "SALES",
        "responsiblePerson": "田中太郎",
        "memo": "6月分作業代金"
    }
    */
    
    -- === 承認・確定情報 ===
    is_confirmed                BOOLEAN DEFAULT FALSE,
    confirmed_by                UUID,
    confirmed_at                TIMESTAMP WITH TIME ZONE,
    confirmation_comment        TEXT,
    
    -- === 修正・取消情報 ===
    is_reversed                 BOOLEAN DEFAULT FALSE,
    reversed_by                 UUID,
    reversed_at                 TIMESTAMP WITH TIME ZONE,
    reversal_reason             TEXT,
    original_entry_id           UUID REFERENCES accounting_entries(id),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_accounting_amount CHECK (amount > 0),
    CONSTRAINT valid_fiscal_period CHECK (
        fiscal_year >= 2020 AND fiscal_year <= 2100
    ),
    CONSTRAINT valid_accounting_date CHECK (
        accounting_date >= '2020-01-01' AND accounting_date <= CURRENT_DATE + INTERVAL '1 year'
    )
);

-- インデックス
CREATE INDEX idx_accounting_entries_invoice_id ON accounting_entries(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_type ON accounting_entries(entry_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_account_code ON accounting_entries(account_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_accounting_date ON accounting_entries(accounting_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_fiscal_period ON accounting_entries(fiscal_year, fiscal_period_month) WHERE deleted_at IS NULL;

-- 外部システム連携用インデックス
CREATE INDEX idx_accounting_entries_external_system ON accounting_entries(external_system_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_synced ON accounting_entries(is_synced) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_moneyforward ON accounting_entries(moneyforward_journal_id) WHERE deleted_at IS NULL;

-- 承認・確定状況検索用インデックス
CREATE INDEX idx_accounting_entries_confirmed ON accounting_entries(is_confirmed) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_reversed ON accounting_entries(is_reversed) WHERE deleted_at IS NULL;

-- 仕訳詳細検索用GINインデックス
CREATE INDEX idx_accounting_entries_details ON accounting_entries USING GIN (journal_details);

-- 複合インデックス（会計レポート用）
CREATE INDEX idx_accounting_entries_account_period ON accounting_entries(account_code, fiscal_year, fiscal_period_month) 
WHERE deleted_at IS NULL;
CREATE INDEX idx_accounting_entries_side_amount ON accounting_entries(accounting_side, amount DESC) 
WHERE deleted_at IS NULL;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_accounting_entries_updated_at
    BEFORE UPDATE ON accounting_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 5. invoice_corrections（請求書修正履歴テーブル）

```sql
-- 請求書修正・履歴管理テーブル
CREATE TABLE invoice_corrections (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_invoice_id         UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    corrected_invoice_id        UUID REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- === 修正情報 ===
    correction_type             VARCHAR(30) NOT NULL CHECK (correction_type IN (
        'AMOUNT_CORRECTION',    -- 金額修正
        'ITEM_CORRECTION',      -- 項目修正
        'DATE_CORRECTION',      -- 日付修正
        'CUSTOMER_CORRECTION',  -- 顧客情報修正
        'TAX_CORRECTION',       -- 税額修正
        'FULL_CANCELLATION',    -- 全額取消
        'OTHER'                 -- その他
    )),
    correction_reason           TEXT NOT NULL,
    correction_description      TEXT,
    
    -- === 修正前後の値 ===
    correction_details          JSONB NOT NULL,
    /*
    correction_details構造:
    {
        "fieldChanges": [
            {
                "fieldName": "total_amount",
                "oldValue": 1080000,
                "newValue": 1188000,
                "changeReason": "残業時間追加計上"
            },
            {
                "fieldName": "tax_amount",
                "oldValue": 98181,
                "newValue": 108000,
                "changeReason": "税額再計算"
            }
        ],
        "itemChanges": [
            {
                "action": "ADD",
                "itemType": "OVERTIME",
                "quantity": 10,
                "unitPrice": 10800,
                "amount": 108000
            }
        ],
        "impactAreas": ["BILLING", "ACCOUNTING", "REPORTING"]
    }
    */
    
    -- === 承認情報 ===
    correction_status           VARCHAR(20) DEFAULT 'PENDING' CHECK (correction_status IN (
        'PENDING',              -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 却下
        'EXECUTED',             -- 実行済み
        'CANCELLED'             -- 取消
    )),
    requested_by                UUID NOT NULL,
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    executed_at                 TIMESTAMP WITH TIME ZONE,
    
    -- === 影響範囲 ===
    affects_accounting          BOOLEAN DEFAULT TRUE,
    affects_payment             BOOLEAN DEFAULT TRUE,
    affects_reporting           BOOLEAN DEFAULT TRUE,
    requires_customer_notice    BOOLEAN DEFAULT TRUE,
    
    -- === 関連文書 ===
    supporting_documents        JSONB,
    /*
    supporting_documents構造:
    [
        {
            "documentType": "TIMESHEET_CORRECTION",
            "fileName": "corrected_timesheet.pdf",
            "fileUrl": "/attachments/corrections/uuid/file.pdf",
            "uploadedAt": "2025-06-01T10:00:00Z"
        },
        {
            "documentType": "EMAIL_APPROVAL",
            "fileName": "customer_approval.pdf",
            "fileUrl": "/attachments/corrections/uuid/approval.pdf",
            "uploadedAt": "2025-06-01T11:00:00Z"
        }
    ]
    */
    
    -- === 会計処理情報 ===
    accounting_treatment        VARCHAR(30) CHECK (accounting_treatment IN (
        'REVERSE_AND_REISSUE',  -- 逆仕訳＋再発行
        'ADJUSTMENT_ENTRY',     -- 調整仕訳
        'MEMO_ENTRY',           -- 備忘仕訳
        'NO_ACCOUNTING_IMPACT'  -- 会計影響なし
    )),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_invoice_corrections_original ON invoice_corrections(original_invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_corrections_corrected ON invoice_corrections(corrected_invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_corrections_type ON invoice_corrections(correction_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_corrections_status ON invoice_corrections(correction_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_corrections_requested_by ON invoice_corrections(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoice_corrections_approved_by ON invoice_corrections(approved_by) WHERE deleted_at IS NULL;

-- 修正詳細・文書検索用GINインデックス
CREATE INDEX idx_invoice_corrections_details ON invoice_corrections USING GIN (correction_details);
CREATE INDEX idx_invoice_corrections_documents ON invoice_corrections USING GIN (supporting_documents);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_invoice_corrections_updated_at
    BEFORE UPDATE ON invoice_corrections
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. invoice_summary_view（請求書サマリービュー）

```sql
-- 請求書一覧表示用のビュー
CREATE VIEW invoice_summary_view AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_type,
    i.status,
    i.billing_period_year,
    i.billing_period_month,
    i.issue_date,
    i.due_date,
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,
    i.payment_rate,
    i.currency,
    i.created_at,
    i.updated_at,
    
    -- 期間表示
    i.billing_period_year || '-' || LPAD(i.billing_period_month::TEXT, 2, '0') as period_display,
    
    -- 顧客情報（Customer Contextから）
    c.name as customer_name,
    c.industry as customer_industry,
    
    -- プロジェクト情報（Project Contextから）
    p.name as project_name,
    p.status as project_status,
    
    -- 契約情報（Contract Contextから）
    cont.contract_number,
    cont.title as contract_title,
    
    -- 期限状況
    CASE 
        WHEN i.status = 'ISSUED' AND i.due_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN i.status = 'PARTIALLY_PAID' AND i.due_date < CURRENT_DATE THEN 'OVERDUE_PARTIAL'
        WHEN i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'DUE_SOON'
        WHEN i.status = 'PAID' THEN 'PAID'
        ELSE 'NORMAL'
    END as payment_status,
    
    -- 期限からの日数
    CASE 
        WHEN i.due_date IS NOT NULL 
        THEN EXTRACT(DAYS FROM CURRENT_DATE - i.due_date)
        ELSE NULL
    END as days_from_due,
    
    -- 請求項目統計
    billing_stats.total_items,
    billing_stats.item_categories,
    billing_stats.total_hours,
    
    -- 支払統計
    payment_stats.payment_count,
    payment_stats.last_payment_date,
    payment_stats.last_payment_amount,
    
    -- 会計連携状況
    i.is_accounting_synced,
    i.accounting_synced_at,
    i.moneyforward_invoice_id,
    
    -- 修正・履歴情報
    correction_stats.correction_count,
    correction_stats.has_corrections,
    correction_stats.latest_correction_date
    
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN contracts cont ON i.contract_id = cont.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_items,
        COUNT(DISTINCT item_category) as item_categories,
        COALESCE(SUM(CASE WHEN unit = 'hours' THEN quantity ELSE 0 END), 0) as total_hours
    FROM invoice_billing_items ibi 
    WHERE ibi.invoice_id = i.id 
      AND ibi.deleted_at IS NULL
) billing_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as payment_count,
        MAX(payment_date) as last_payment_date,
        (SELECT payment_amount FROM invoice_payments ip2 
         WHERE ip2.invoice_id = i.id AND ip2.payment_date = MAX(ip.payment_date) 
         LIMIT 1) as last_payment_amount
    FROM invoice_payments ip 
    WHERE ip.invoice_id = i.id 
      AND ip.deleted_at IS NULL
      AND ip.payment_status = 'CONFIRMED'
) payment_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as correction_count,
        COUNT(*) > 0 as has_corrections,
        MAX(created_at) as latest_correction_date
    FROM invoice_corrections ic 
    WHERE ic.original_invoice_id = i.id 
      AND ic.deleted_at IS NULL
) correction_stats ON true
WHERE i.deleted_at IS NULL;
```

### 2. accounts_receivable_view（売掛金管理ビュー）

```sql
-- 売掛金・未収金管理ビュー
CREATE VIEW accounts_receivable_view AS
SELECT 
    i.id as invoice_id,
    i.invoice_number,
    i.customer_id,
    c.name as customer_name,
    i.total_amount,
    i.paid_amount,
    i.remaining_amount,
    i.issue_date,
    i.due_date,
    
    -- 期限超過日数
    GREATEST(0, EXTRACT(DAYS FROM CURRENT_DATE - i.due_date)) as days_overdue,
    
    -- 年齢区分
    CASE 
        WHEN i.due_date >= CURRENT_DATE THEN 'CURRENT'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1_30_DAYS'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31_60_DAYS'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61_90_DAYS'
        ELSE 'OVER_90_DAYS'
    END as aging_bucket,
    
    -- リスクレベル
    CASE 
        WHEN i.due_date >= CURRENT_DATE THEN 'LOW'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '14 days' THEN 'MEDIUM'
        WHEN i.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'HIGH'
        ELSE 'CRITICAL'
    END as risk_level,
    
    -- 顧客与信情報
    c.credit_rating,
    c.payment_terms,
    
    -- 最終支払情報
    last_payment.payment_date as last_payment_date,
    last_payment.payment_amount as last_payment_amount,
    
    -- 督促情報
    i.reminder_sent_count,
    i.last_reminder_sent_at,
    i.collection_notice_sent
    
FROM invoices i
JOIN customers c ON i.customer_id = c.id
LEFT JOIN LATERAL (
    SELECT payment_date, payment_amount
    FROM invoice_payments ip 
    WHERE ip.invoice_id = i.id 
      AND ip.deleted_at IS NULL
      AND ip.payment_status = 'CONFIRMED'
    ORDER BY payment_date DESC 
    LIMIT 1
) last_payment ON true
WHERE i.deleted_at IS NULL
  AND i.status IN ('ISSUED', 'PARTIALLY_PAID')
  AND i.remaining_amount > 0
ORDER BY i.due_date, i.remaining_amount DESC;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- invoices のパーティショニング（年次）
CREATE TABLE invoices_partitioned (
    LIKE invoices INCLUDING ALL
) PARTITION BY RANGE (billing_period_year);

-- 年次パーティション作成例
CREATE TABLE invoices_2024 
PARTITION OF invoices_partitioned
FOR VALUES FROM (2024) TO (2025);

CREATE TABLE invoices_2025 
PARTITION OF invoices_partitioned
FOR VALUES FROM (2025) TO (2026);

-- デフォルトパーティション
CREATE TABLE invoices_default 
PARTITION OF invoices_partitioned
DEFAULT;
```

### 2. マテリアライズドビュー

```sql
-- 月次売上統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW monthly_billing_stats AS
SELECT 
    i.billing_period_year,
    i.billing_period_month,
    i.customer_id,
    c.name as customer_name,
    c.industry,
    COUNT(*) as invoice_count,
    SUM(i.total_amount) as total_billed,
    SUM(i.paid_amount) as total_paid,
    SUM(i.remaining_amount) as total_outstanding,
    AVG(i.payment_rate) as avg_payment_rate,
    COUNT(*) FILTER (WHERE i.status = 'PAID') as paid_invoice_count,
    COUNT(*) FILTER (WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date < CURRENT_DATE) as overdue_invoice_count
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.deleted_at IS NULL
  AND i.status NOT IN ('CALCULATING', 'CALCULATED')
  AND i.billing_period_year >= 2024
GROUP BY 
    i.billing_period_year,
    i.billing_period_month,
    i.customer_id,
    c.name,
    c.industry;

-- 統計ビュー用インデックス
CREATE INDEX idx_monthly_billing_stats_period ON monthly_billing_stats(billing_period_year, billing_period_month);
CREATE INDEX idx_monthly_billing_stats_customer ON monthly_billing_stats(customer_id);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_billing_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_billing_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. 請求書金額自動更新

```sql
-- 請求書金額自動更新関数
CREATE OR REPLACE FUNCTION update_invoice_amounts()
RETURNS TRIGGER AS $$
DECLARE
    invoice_id_val UUID;
BEGIN
    -- invoiceのIDを取得
    IF TG_TABLE_NAME = 'invoice_billing_items' THEN
        invoice_id_val := COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSIF TG_TABLE_NAME = 'invoice_payments' THEN
        invoice_id_val := COALESCE(NEW.invoice_id, OLD.invoice_id);
    END IF;
    
    -- 請求書金額再計算
    UPDATE invoices SET
        subtotal_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM invoice_billing_items ibi 
            WHERE ibi.invoice_id = invoice_id_val 
              AND ibi.deleted_at IS NULL
        ),
        tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM invoice_billing_items ibi 
            WHERE ibi.invoice_id = invoice_id_val 
              AND ibi.deleted_at IS NULL
        ),
        paid_amount = (
            SELECT COALESCE(SUM(payment_amount), 0)
            FROM invoice_payments ip 
            WHERE ip.invoice_id = invoice_id_val 
              AND ip.payment_status = 'CONFIRMED'
              AND ip.deleted_at IS NULL
        ),
        payment_count = (
            SELECT COUNT(*)
            FROM invoice_payments ip 
            WHERE ip.invoice_id = invoice_id_val 
              AND ip.payment_status = 'CONFIRMED'
              AND ip.deleted_at IS NULL
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = invoice_id_val;
    
    -- 支払状況に応じたステータス更新
    UPDATE invoices SET
        status = CASE 
            WHEN paid_amount >= total_amount THEN 'PAID'
            WHEN paid_amount > 0 THEN 'PARTIALLY_PAID'
            WHEN status IN ('PAID', 'PARTIALLY_PAID') AND paid_amount = 0 THEN 'ISSUED'
            ELSE status
        END,
        remaining_amount = total_amount - paid_amount
    WHERE id = invoice_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 金額更新トリガー
CREATE TRIGGER trigger_update_invoice_amounts_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_billing_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_amounts();

CREATE TRIGGER trigger_update_invoice_amounts_payments
    AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
    FOR EACH ROW
    WHEN (NEW.payment_status = 'CONFIRMED' OR OLD.payment_status = 'CONFIRMED')
    EXECUTE FUNCTION update_invoice_amounts();
```

### 2. 請求書期限超過自動検出

```sql
-- 請求書期限超過自動検出関数
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS VOID AS $$
BEGIN
    -- 期限超過請求書のステータス更新
    UPDATE invoices 
    SET status = 'OVERDUE'
    WHERE status IN ('ISSUED', 'PARTIALLY_PAID')
      AND due_date < CURRENT_DATE
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 日次実行用の関数（スケジューラーから呼び出し）
CREATE OR REPLACE FUNCTION daily_invoice_maintenance()
RETURNS VOID AS $$
BEGIN
    -- 期限超過チェック
    PERFORM update_overdue_invoices();
    
    -- 統計ビューの更新
    PERFORM refresh_billing_stats();
END;
$$ LANGUAGE plpgsql;
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_billing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- 顧客は自分の請求書のみ参照可能
CREATE POLICY invoice_customer_access ON invoices
    FOR SELECT
    TO ses_customer_role
    USING (customer_id = current_setting('app.current_user_id')::UUID);

-- 経理担当者は全請求書アクセス可能
CREATE POLICY invoice_finance_access ON invoices
    FOR ALL
    TO ses_finance_role
    USING (true);

-- 営業担当者は担当顧客の請求書のみアクセス可能
CREATE POLICY invoice_sales_access ON invoices
    FOR SELECT
    TO ses_sales_role
    USING (
        customer_id IN (
            SELECT id FROM customers 
            WHERE sales_representative_id = current_setting('app.current_user_id')::UUID
        )
    );
```

---

## 運用・保守設計

### 1. データアーカイブ

```sql
-- 古い請求書データのアーカイブ
CREATE OR REPLACE FUNCTION archive_old_invoices(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 3年前の支払済み請求書をアーカイブ
    WITH archived_invoices AS (
        UPDATE invoices 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE status = 'PAID' 
          AND issue_date < cutoff_date
          AND deleted_at IS NULL
        RETURNING id
    )
    UPDATE invoice_billing_items 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE invoice_id IN (SELECT id FROM archived_invoices)
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. 売掛金レポート

```sql
-- 売掛金年齢分析レポート関数
CREATE OR REPLACE FUNCTION aging_analysis_report(analysis_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    customer_id UUID, 
    customer_name VARCHAR, 
    current_amount DECIMAL,
    days_1_30 DECIMAL,
    days_31_60 DECIMAL,
    days_61_90 DECIMAL,
    over_90_days DECIMAL,
    total_outstanding DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.customer_id,
        c.name,
        SUM(CASE WHEN i.due_date >= analysis_date THEN i.remaining_amount ELSE 0 END),
        SUM(CASE WHEN i.due_date < analysis_date AND i.due_date >= analysis_date - INTERVAL '30 days' 
                 THEN i.remaining_amount ELSE 0 END),
        SUM(CASE WHEN i.due_date < analysis_date - INTERVAL '30 days' AND i.due_date >= analysis_date - INTERVAL '60 days' 
                 THEN i.remaining_amount ELSE 0 END),
        SUM(CASE WHEN i.due_date < analysis_date - INTERVAL '60 days' AND i.due_date >= analysis_date - INTERVAL '90 days' 
                 THEN i.remaining_amount ELSE 0 END),
        SUM(CASE WHEN i.due_date < analysis_date - INTERVAL '90 days' 
                 THEN i.remaining_amount ELSE 0 END),
        SUM(i.remaining_amount)
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.deleted_at IS NULL
      AND i.status IN ('ISSUED', 'PARTIALLY_PAID')
      AND i.remaining_amount > 0
    GROUP BY i.customer_id, c.name
    HAVING SUM(i.remaining_amount) > 0
    ORDER BY SUM(i.remaining_amount) DESC;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Billing集約詳細設計  
**次回レビュー**: 2025年7月1日