# Timesheet Context 物理テーブル設計

## 概要

Timesheet Context（勤怠・工数管理）の物理データベース設計。月次工数表管理、日次勤怠記録、承認ワークフロー、労働時間集計の効率的な実現を目指す。

### 対象集約
- **Timesheet集約**: 月次工数表ライフサイクル管理の中核
- **DailyAttendance集約**: 日次勤怠データ管理
- **ApprovalFlow集約**: 承認ワークフロー管理

---

## テーブル設計

### 1. timesheets（工数表テーブル）

```sql
-- Timesheet集約ルート
CREATE TABLE timesheets (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 関連エンティティ ===
    engineer_id                 UUID NOT NULL,
    contract_id                 UUID NOT NULL,
    project_id                  UUID NOT NULL,
    
    -- === 期間情報 ===
    period_year                 INTEGER NOT NULL,
    period_month                INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    submission_deadline         DATE NOT NULL,
    approval_deadline           DATE NOT NULL,
    
    -- === ステータス管理 ===
    status                      VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',                -- 下書き
        'PENDING_APPROVAL',     -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 差し戻し
        'CANCELLED',            -- キャンセル
        'LOCKED'                -- ロック済み
    )),
    
    -- === コメント・特記事項 ===
    engineer_comment            TEXT,
    special_notes               TEXT,
    
    -- === ロック・制御情報 ===
    is_locked                   BOOLEAN DEFAULT FALSE,
    lock_reason                 VARCHAR(200),
    locked_at                   TIMESTAMP WITH TIME ZONE,
    locked_by                   UUID,
    
    -- === サマリー情報（正規化） ===
    total_working_days          INTEGER DEFAULT 0,
    total_working_hours         INTEGER DEFAULT 0,
    total_overtime_hours        INTEGER DEFAULT 0,
    total_special_work_hours    INTEGER DEFAULT 0,
    total_adjustment_hours      INTEGER DEFAULT 0,
    
    -- === 種別別集計 ===
    holiday_work_days           INTEGER DEFAULT 0,
    holiday_work_hours          INTEGER DEFAULT 0,
    night_work_hours            INTEGER DEFAULT 0,
    
    -- === 休暇統計 ===
    paid_leave_days             INTEGER DEFAULT 0,
    sick_leave_days             INTEGER DEFAULT 0,
    special_leave_days          INTEGER DEFAULT 0,
    
    -- === バリデーション情報 ===
    validation_errors           JSONB,
    /*
    validation_errors構造:
    [
        {
            "errorCode": "MISSING_ATTENDANCE",
            "message": "2025-06-15の勤怠データが未入力です",
            "severity": "ERROR",
            "fieldName": "attendance",
            "date": "2025-06-15"
        }
    ]
    */
    completion_rate             DECIMAL(5,2) DEFAULT 0.00,
    
    -- === 承認フロー情報（基本） ===
    approval_status             VARCHAR(20) DEFAULT 'NOT_STARTED' CHECK (approval_status IN (
        'NOT_STARTED',          -- 未開始
        'IN_PROGRESS',          -- 承認中
        'COMPLETED',            -- 承認完了
        'REJECTED'              -- 差し戻し
    )),
    approval_started_at         TIMESTAMP WITH TIME ZONE,
    approval_completed_at       TIMESTAMP WITH TIME ZONE,
    final_approver_id           UUID,
    
    -- === 自動計算フィールド ===
    basic_working_hours         INTEGER GENERATED ALWAYS AS (total_working_hours - total_overtime_hours) STORED,
    actual_working_hours        INTEGER GENERATED ALWAYS AS (total_working_hours + total_adjustment_hours) STORED,
    overtime_rate               DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_working_hours > 0 
            THEN ROUND((total_overtime_hours::DECIMAL / total_working_hours) * 100, 2)
            ELSE 0
        END
    ) STORED,
    attendance_rate             DECIMAL(5,2),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    last_modified_at            TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_engineer_period UNIQUE(engineer_id, period_year, period_month) WHERE deleted_at IS NULL,
    CONSTRAINT valid_period_dates CHECK (
        submission_deadline <= approval_deadline
    ),
    CONSTRAINT valid_working_hours CHECK (
        total_working_hours >= 0 AND
        total_overtime_hours >= 0 AND
        total_working_hours >= total_overtime_hours
    ),
    CONSTRAINT valid_completion_rate CHECK (
        completion_rate >= 0 AND completion_rate <= 100
    )
);

-- インデックス
CREATE INDEX idx_timesheets_engineer_id ON timesheets(engineer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_contract_id ON timesheets(contract_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_project_id ON timesheets(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_status ON timesheets(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_period ON timesheets(period_year, period_month) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_submission_deadline ON timesheets(submission_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_approval_deadline ON timesheets(approval_deadline) WHERE deleted_at IS NULL;

-- 承認関連検索用インデックス
CREATE INDEX idx_timesheets_approval_status ON timesheets(approval_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_final_approver ON timesheets(final_approver_id) WHERE deleted_at IS NULL;

-- 複合インデックス
CREATE INDEX idx_timesheets_status_deadline ON timesheets(status, submission_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheets_engineer_period ON timesheets(engineer_id, period_year, period_month) WHERE deleted_at IS NULL;

-- バリデーションエラー検索用GINインデックス
CREATE INDEX idx_timesheets_validation_errors ON timesheets USING GIN (validation_errors);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_timesheets_updated_at
    BEFORE UPDATE ON timesheets
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. daily_attendances（日次勤怠テーブル）

```sql
-- 日次勤怠データテーブル
CREATE TABLE daily_attendances (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id                UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    
    -- === 日付・種別 ===
    attendance_date             DATE NOT NULL,
    attendance_type             VARCHAR(20) NOT NULL CHECK (attendance_type IN (
        'WORK',                 -- 勤務
        'PAID_LEAVE',           -- 有給休暇
        'SICK_LEAVE',           -- 病気休暇
        'SPECIAL_LEAVE',        -- 特別休暇
        'UNPAID_LEAVE',         -- 無給休暇
        'HOLIDAY'               -- 休日
    )),
    
    -- === 時刻情報 ===
    start_time                  TIME,
    end_time                    TIME,
    break_start_time            TIME,
    break_end_time              TIME,
    
    -- === 労働時間（分単位で格納、時間計算は自動） ===
    scheduled_minutes           INTEGER DEFAULT 0,
    actual_working_minutes      INTEGER DEFAULT 0,
    overtime_minutes            INTEGER DEFAULT 0,
    break_minutes               INTEGER DEFAULT 60,
    
    -- === 労働時間（時間単位・計算済み） ===
    scheduled_hours             INTEGER GENERATED ALWAYS AS (scheduled_minutes / 60) STORED,
    actual_working_hours        INTEGER GENERATED ALWAYS AS (actual_working_minutes / 60) STORED,
    overtime_hours              INTEGER GENERATED ALWAYS AS (overtime_minutes / 60) STORED,
    
    -- === 勤務地情報 ===
    work_location               VARCHAR(20) CHECK (work_location IN (
        'CLIENT_SITE',          -- 客先
        'REMOTE',               -- リモート
        'OFFICE',               -- 自社オフィス
        'HYBRID'                -- ハイブリッド
    )),
    work_location_details       VARCHAR(200),
    work_address                TEXT,
    
    -- === 作業内容 ===
    daily_comment               TEXT,
    work_tasks                  JSONB,
    /*
    work_tasks構造:
    [
        {
            "taskName": "機能設計",
            "description": "ユーザー管理機能の詳細設計",
            "category": "DESIGN",
            "timeSpent": 240,
            "priority": "HIGH"
        },
        {
            "taskName": "コーディング",
            "description": "API実装",
            "category": "DEVELOPMENT",
            "timeSpent": 180,
            "priority": "MEDIUM"
        }
    ]
    */
    
    -- === 特別勤務フラグ ===
    is_holiday_work             BOOLEAN DEFAULT FALSE,
    is_night_work               BOOLEAN DEFAULT FALSE,
    is_overtime_work            BOOLEAN DEFAULT FALSE,
    
    -- === 申請・承認情報 ===
    requires_approval           BOOLEAN DEFAULT FALSE,
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    approval_comment            TEXT,
    
    -- === バリデーション情報 ===
    validation_status           VARCHAR(20) DEFAULT 'VALID' CHECK (validation_status IN (
        'VALID',                -- 有効
        'WARNING',              -- 警告あり
        'ERROR'                 -- エラーあり
    )),
    validation_messages         JSONB,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_timesheet_date UNIQUE(timesheet_id, attendance_date) WHERE deleted_at IS NULL,
    CONSTRAINT valid_time_range CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    ),
    CONSTRAINT valid_break_time CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_start_time < break_end_time)
    ),
    CONSTRAINT valid_working_minutes CHECK (
        actual_working_minutes >= 0 AND
        overtime_minutes >= 0 AND
        actual_working_minutes >= overtime_minutes
    ),
    CONSTRAINT work_data_consistency CHECK (
        (attendance_type = 'WORK' AND start_time IS NOT NULL AND end_time IS NOT NULL) OR
        (attendance_type != 'WORK' AND actual_working_minutes = 0)
    )
);

-- インデックス
CREATE INDEX idx_daily_attendances_timesheet_id ON daily_attendances(timesheet_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_attendances_date ON daily_attendances(attendance_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_attendances_type ON daily_attendances(attendance_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_daily_attendances_work_location ON daily_attendances(work_location) WHERE deleted_at IS NULL;

-- 特別勤務検索用インデックス
CREATE INDEX idx_daily_attendances_holiday_work ON daily_attendances(is_holiday_work) 
WHERE deleted_at IS NULL AND is_holiday_work = true;
CREATE INDEX idx_daily_attendances_overtime ON daily_attendances(is_overtime_work) 
WHERE deleted_at IS NULL AND is_overtime_work = true;

-- 承認関連インデックス
CREATE INDEX idx_daily_attendances_approved_by ON daily_attendances(approved_by) WHERE deleted_at IS NULL;

-- 作業内容検索用GINインデックス
CREATE INDEX idx_daily_attendances_work_tasks ON daily_attendances USING GIN (work_tasks);
CREATE INDEX idx_daily_attendances_validation ON daily_attendances USING GIN (validation_messages);

-- 複合インデックス（統計用）
CREATE INDEX idx_daily_attendances_timesheet_type ON daily_attendances(timesheet_id, attendance_type) 
WHERE deleted_at IS NULL;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_daily_attendances_updated_at
    BEFORE UPDATE ON daily_attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. timesheet_approval_steps（承認ステップテーブル）

```sql
-- 工数表承認ステップテーブル
CREATE TABLE timesheet_approval_steps (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id                UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    
    -- === ステップ情報 ===
    approval_level              INTEGER NOT NULL CHECK (approval_level >= 1 AND approval_level <= 10),
    step_name                   VARCHAR(100) NOT NULL,
    step_description            TEXT,
    is_required                 BOOLEAN DEFAULT TRUE,
    step_order                  INTEGER NOT NULL,
    
    -- === 承認者情報 ===
    assigned_approver_id        UUID,
    assigned_approver_role      VARCHAR(50),
    approver_type               VARCHAR(20) CHECK (approver_type IN (
        'PROJECT_MANAGER',      -- プロジェクトマネージャー
        'TEAM_LEADER',          -- チームリーダー
        'CLIENT_CONTACT',       -- 顧客担当者
        'HR_MANAGER',           -- 人事担当者
        'FINANCE_MANAGER',      -- 経理担当者
        'SYSTEM_AUTO'           -- システム自動承認
    )),
    
    -- === ステップ状態 ===
    step_status                 VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' CHECK (step_status IN (
        'NOT_STARTED',          -- 未開始
        'PENDING',              -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 差し戻し
        'SKIPPED',              -- スキップ
        'AUTO_APPROVED'         -- 自動承認
    )),
    
    -- === 承認処理情報 ===
    activated_at                TIMESTAMP WITH TIME ZONE,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    approved_by                 UUID,
    approval_comment            TEXT,
    
    -- === 差し戻し情報 ===
    rejected_at                 TIMESTAMP WITH TIME ZONE,
    rejected_by                 UUID,
    rejection_reason            TEXT,
    
    -- === 期限管理 ===
    approval_deadline           TIMESTAMP WITH TIME ZONE,
    reminder_sent_count         INTEGER DEFAULT 0,
    last_reminder_sent_at       TIMESTAMP WITH TIME ZONE,
    
    -- === 承認設定 ===
    approval_settings           JSONB,
    /*
    approval_settings構造:
    {
        "autoApprovalEnabled": false,
        "autoApprovalConditions": {
            "maxOvertimeHours": 20,
            "maxTotalHours": 180
        },
        "reminderSettings": {
            "reminderDays": [3, 1],
            "maxReminders": 3
        },
        "escalationSettings": {
            "escalationDays": 5,
            "escalationTo": "uuid-of-escalation-approver"
        }
    }
    */
    
    -- === 委任・代理承認 ===
    delegated_from              UUID,
    delegation_reason           TEXT,
    delegation_period_start     TIMESTAMP WITH TIME ZONE,
    delegation_period_end       TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_timesheet_step_order UNIQUE(timesheet_id, step_order) WHERE deleted_at IS NULL,
    CONSTRAINT valid_approval_dates CHECK (
        activated_at <= COALESCE(approved_at, activated_at) AND
        activated_at <= COALESCE(rejected_at, activated_at)
    ),
    CONSTRAINT valid_delegation_period CHECK (
        (delegated_from IS NULL) OR
        (delegation_period_start IS NOT NULL AND delegation_period_end IS NOT NULL AND 
         delegation_period_start < delegation_period_end)
    )
);

-- インデックス
CREATE INDEX idx_timesheet_approval_steps_timesheet_id ON timesheet_approval_steps(timesheet_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_approval_steps_status ON timesheet_approval_steps(step_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_approval_steps_approver ON timesheet_approval_steps(assigned_approver_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_approval_steps_deadline ON timesheet_approval_steps(approval_deadline) WHERE deleted_at IS NULL;

-- 承認フロー検索用複合インデックス
CREATE INDEX idx_timesheet_approval_steps_flow ON timesheet_approval_steps(timesheet_id, step_order) 
WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_approval_steps_pending ON timesheet_approval_steps(assigned_approver_id, step_status) 
WHERE deleted_at IS NULL AND step_status = 'PENDING';

-- 委任検索用インデックス
CREATE INDEX idx_timesheet_approval_steps_delegated ON timesheet_approval_steps(delegated_from) 
WHERE deleted_at IS NULL AND delegated_from IS NOT NULL;

-- 承認設定検索用GINインデックス
CREATE INDEX idx_timesheet_approval_steps_settings ON timesheet_approval_steps USING GIN (approval_settings);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_timesheet_approval_steps_updated_at
    BEFORE UPDATE ON timesheet_approval_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. timesheet_special_works（特別作業テーブル）

```sql
-- 特別作業記録テーブル
CREATE TABLE timesheet_special_works (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id                UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    
    -- === 作業情報 ===
    work_date                   DATE NOT NULL,
    work_type                   VARCHAR(30) NOT NULL CHECK (work_type IN (
        'OVERTIME_WEEKDAY',     -- 平日残業
        'OVERTIME_WEEKEND',     -- 休日残業
        'NIGHT_WORK',           -- 深夜作業
        'HOLIDAY_WORK',         -- 祝日作業
        'EMERGENCY_WORK',       -- 緊急作業
        'ON_CALL',              -- オンコール
        'TRAVEL',               -- 出張
        'TRAINING',             -- 研修
        'MEETING'               -- 会議
    )),
    
    -- === 時間情報 ===
    start_time                  TIME NOT NULL,
    end_time                    TIME NOT NULL,
    duration_minutes            INTEGER NOT NULL,
    duration_hours              INTEGER GENERATED ALWAYS AS (duration_minutes / 60) STORED,
    
    -- === 作業内容 ===
    work_title                  VARCHAR(200) NOT NULL,
    work_description            TEXT NOT NULL,
    work_location               VARCHAR(20),
    work_category               VARCHAR(50),
    
    -- === 承認・請求情報 ===
    is_billable                 BOOLEAN DEFAULT TRUE,
    billing_rate_multiplier     DECIMAL(3,2) DEFAULT 1.00,
    requires_approval           BOOLEAN DEFAULT TRUE,
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    approval_comment            TEXT,
    
    -- === 関連情報 ===
    related_project_id          UUID,
    related_task_id             UUID,
    emergency_reason            TEXT,
    
    -- === 費用情報 ===
    additional_costs            JSONB,
    /*
    additional_costs構造:
    {
        "transportationCost": 2000,
        "mealCost": 1500,
        "accommodationCost": 8000,
        "otherCosts": [
            {
                "item": "資料代",
                "amount": 500,
                "description": "技術書籍購入"
            }
        ],
        "currency": "JPY"
    }
    */
    
    -- === 証跡情報 ===
    evidence_files              JSONB,
    /*
    evidence_files構造:
    [
        {
            "fileName": "overtime_approval.pdf",
            "fileUrl": "/attachments/timesheet/uuid/file.pdf",
            "fileSize": 125432,
            "uploadedAt": "2025-06-01T10:00:00Z"
        }
    ]
    */
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_special_work_time CHECK (
        start_time < end_time AND
        duration_minutes > 0 AND
        duration_minutes = EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ),
    CONSTRAINT valid_billing_rate CHECK (
        billing_rate_multiplier >= 0.00 AND billing_rate_multiplier <= 10.00
    )
);

-- インデックス
CREATE INDEX idx_timesheet_special_works_timesheet_id ON timesheet_special_works(timesheet_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_special_works_date ON timesheet_special_works(work_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_special_works_type ON timesheet_special_works(work_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_special_works_approved_by ON timesheet_special_works(approved_by) WHERE deleted_at IS NULL;

-- 複合インデックス
CREATE INDEX idx_timesheet_special_works_timesheet_date ON timesheet_special_works(timesheet_id, work_date) 
WHERE deleted_at IS NULL;

-- 費用・証跡検索用GINインデックス
CREATE INDEX idx_timesheet_special_works_costs ON timesheet_special_works USING GIN (additional_costs);
CREATE INDEX idx_timesheet_special_works_evidence ON timesheet_special_works USING GIN (evidence_files);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_timesheet_special_works_updated_at
    BEFORE UPDATE ON timesheet_special_works
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 5. timesheet_adjustments（勤怠調整テーブル）

```sql
-- 勤怠調整記録テーブル
CREATE TABLE timesheet_adjustments (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timesheet_id                UUID NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
    
    -- === 調整情報 ===
    adjustment_type             VARCHAR(30) NOT NULL CHECK (adjustment_type IN (
        'HOURS_ADDITION',       -- 時間追加
        'HOURS_REDUCTION',      -- 時間削減
        'DAY_ADDITION',         -- 日数追加
        'DAY_REDUCTION',        -- 日数削減
        'OVERTIME_ADJUSTMENT',  -- 残業時間調整
        'LEAVE_ADJUSTMENT',     -- 休暇調整
        'ERROR_CORRECTION',     -- エラー修正
        'SYSTEM_ADJUSTMENT'     -- システム調整
    )),
    adjustment_title            VARCHAR(200) NOT NULL,
    adjustment_description      TEXT NOT NULL,
    
    -- === 調整値 ===
    adjustment_hours            INTEGER DEFAULT 0,
    adjustment_days             INTEGER DEFAULT 0,
    adjustment_amount           DECIMAL(10,2),
    
    -- === 対象日付 ===
    target_date                 DATE,
    effective_date              DATE NOT NULL,
    
    -- === 調整理由 ===
    adjustment_reason           VARCHAR(50) NOT NULL CHECK (adjustment_reason IN (
        'INPUT_ERROR',          -- 入力誤り
        'CALCULATION_ERROR',    -- 計算誤り
        'SYSTEM_ERROR',         -- システムエラー
        'POLICY_CHANGE',        -- ポリシー変更
        'CLIENT_REQUEST',       -- 顧客要請
        'LABOR_LAW_COMPLIANCE', -- 労働法準拠
        'SPECIAL_CIRCUMSTANCE', -- 特別事情
        'RETROACTIVE_CHANGE'    -- 遡及変更
    )),
    detailed_reason             TEXT,
    
    -- === 承認情報 ===
    adjustment_status           VARCHAR(20) DEFAULT 'PENDING' CHECK (adjustment_status IN (
        'PENDING',              -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED',             -- 却下
        'APPLIED'               -- 適用済み
    )),
    requested_by                UUID NOT NULL,
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    applied_at                  TIMESTAMP WITH TIME ZONE,
    approval_comment            TEXT,
    
    -- === 影響範囲 ===
    affects_billing             BOOLEAN DEFAULT TRUE,
    affects_payroll             BOOLEAN DEFAULT TRUE,
    affects_reporting           BOOLEAN DEFAULT TRUE,
    
    -- === 関連情報 ===
    related_adjustment_id       UUID REFERENCES timesheet_adjustments(id),
    reference_documents         JSONB,
    /*
    reference_documents構造:
    [
        {
            "documentType": "EMAIL",
            "fileName": "client_request.pdf",
            "fileUrl": "/attachments/adjustments/uuid/file.pdf",
            "uploadedAt": "2025-06-01T10:00:00Z"
        }
    ]
    */
    
    -- === 原本データ（調整前） ===
    original_values             JSONB,
    /*
    original_values構造:
    {
        "originalHours": 160,
        "originalOvertimeHours": 20,
        "originalWorkingDays": 22,
        "snapshotDate": "2025-06-01T10:00:00Z"
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
    CONSTRAINT valid_adjustment_values CHECK (
        NOT (adjustment_hours = 0 AND adjustment_days = 0 AND adjustment_amount IS NULL)
    ),
    CONSTRAINT valid_effective_date CHECK (
        effective_date >= target_date OR target_date IS NULL
    )
);

-- インデックス
CREATE INDEX idx_timesheet_adjustments_timesheet_id ON timesheet_adjustments(timesheet_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_adjustments_type ON timesheet_adjustments(adjustment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_adjustments_status ON timesheet_adjustments(adjustment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_adjustments_requested_by ON timesheet_adjustments(requested_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_adjustments_approved_by ON timesheet_adjustments(approved_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_timesheet_adjustments_effective_date ON timesheet_adjustments(effective_date) WHERE deleted_at IS NULL;

-- 関連調整検索用インデックス
CREATE INDEX idx_timesheet_adjustments_related ON timesheet_adjustments(related_adjustment_id) 
WHERE deleted_at IS NULL AND related_adjustment_id IS NOT NULL;

-- 文書・原本データ検索用GINインデックス
CREATE INDEX idx_timesheet_adjustments_documents ON timesheet_adjustments USING GIN (reference_documents);
CREATE INDEX idx_timesheet_adjustments_original ON timesheet_adjustments USING GIN (original_values);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_timesheet_adjustments_updated_at
    BEFORE UPDATE ON timesheet_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. timesheet_summary_view（工数表サマリービュー）

```sql
-- 工数表一覧表示用のビュー
CREATE VIEW timesheet_summary_view AS
SELECT 
    t.id,
    t.engineer_id,
    t.contract_id,
    t.project_id,
    t.period_year,
    t.period_month,
    t.status,
    t.approval_status,
    t.submission_deadline,
    t.approval_deadline,
    t.is_locked,
    t.completion_rate,
    t.created_at,
    t.updated_at,
    
    -- 期間表示
    t.period_year || '-' || LPAD(t.period_month::TEXT, 2, '0') as period_display,
    
    -- エンジニア情報（Engineer Contextから）
    e.last_name || ' ' || e.first_name as engineer_name,
    e.work_status as engineer_work_status,
    
    -- プロジェクト情報（Project Contextから）
    p.name as project_name,
    p.status as project_status,
    
    -- 契約情報（Contract Contextから）
    c.contract_number,
    c.title as contract_title,
    
    -- 労働時間統計
    t.total_working_days,
    t.total_working_hours,
    t.total_overtime_hours,
    t.overtime_rate,
    t.attendance_rate,
    
    -- 期限状況
    CASE 
        WHEN t.status = 'DRAFT' AND t.submission_deadline < CURRENT_DATE THEN 'OVERDUE'
        WHEN t.status = 'PENDING_APPROVAL' AND t.approval_deadline < CURRENT_DATE THEN 'APPROVAL_OVERDUE'
        WHEN t.status = 'DRAFT' AND t.submission_deadline <= CURRENT_DATE + INTERVAL '3 days' THEN 'DUE_SOON'
        ELSE 'NORMAL'
    END as deadline_status,
    
    -- 承認統計
    approval_stats.total_steps,
    approval_stats.completed_steps,
    approval_stats.pending_steps,
    approval_stats.current_approver,
    
    -- 勤怠統計
    attendance_stats.total_attendance_days,
    attendance_stats.work_days,
    attendance_stats.leave_days,
    attendance_stats.missing_days,
    
    -- 調整・特別作業統計
    adjustment_stats.total_adjustments,
    special_work_stats.total_special_works
    
FROM timesheets t
LEFT JOIN engineers e ON t.engineer_id = e.id
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN contracts c ON t.contract_id = c.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_steps,
        COUNT(*) FILTER (WHERE step_status = 'APPROVED') as completed_steps,
        COUNT(*) FILTER (WHERE step_status = 'PENDING') as pending_steps,
        (SELECT assigned_approver_id FROM timesheet_approval_steps tas2 
         WHERE tas2.timesheet_id = t.id AND tas2.step_status = 'PENDING' 
         ORDER BY tas2.step_order LIMIT 1) as current_approver
    FROM timesheet_approval_steps tas 
    WHERE tas.timesheet_id = t.id 
      AND tas.deleted_at IS NULL
) approval_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_attendance_days,
        COUNT(*) FILTER (WHERE attendance_type = 'WORK') as work_days,
        COUNT(*) FILTER (WHERE attendance_type LIKE '%LEAVE%') as leave_days,
        -- 営業日数から出勤日数を引いた未入力日数
        (SELECT COUNT(*) FROM generate_series(
            make_date(t.period_year, t.period_month, 1),
            (make_date(t.period_year, t.period_month, 1) + INTERVAL '1 month - 1 day')::DATE,
            '1 day'::INTERVAL
        ) as d(date) 
        WHERE EXTRACT(DOW FROM d.date) NOT IN (0, 6)) - COUNT(*) as missing_days
    FROM daily_attendances da 
    WHERE da.timesheet_id = t.id 
      AND da.deleted_at IS NULL
) attendance_stats ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as total_adjustments
    FROM timesheet_adjustments ta 
    WHERE ta.timesheet_id = t.id 
      AND ta.deleted_at IS NULL
) adjustment_stats ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as total_special_works
    FROM timesheet_special_works tsw 
    WHERE tsw.timesheet_id = t.id 
      AND tsw.deleted_at IS NULL
) special_work_stats ON true
WHERE t.deleted_at IS NULL;
```

### 2. approval_pending_view（承認待ちビュー）

```sql
-- 承認待ち工数表ビュー
CREATE VIEW approval_pending_view AS
SELECT 
    t.id as timesheet_id,
    t.engineer_id,
    t.period_year,
    t.period_month,
    t.submission_deadline,
    t.approval_deadline,
    t.total_working_hours,
    t.total_overtime_hours,
    
    -- 承認ステップ情報
    tas.id as approval_step_id,
    tas.approval_level,
    tas.step_name,
    tas.assigned_approver_id,
    tas.approver_type,
    tas.activated_at,
    tas.approval_deadline as step_deadline,
    
    -- エンジニア情報
    e.last_name || ' ' || e.first_name as engineer_name,
    
    -- プロジェクト情報
    p.name as project_name,
    
    -- 期限状況
    CASE 
        WHEN tas.approval_deadline < CURRENT_TIMESTAMP THEN 'OVERDUE'
        WHEN tas.approval_deadline <= CURRENT_TIMESTAMP + INTERVAL '1 day' THEN 'DUE_TODAY'
        WHEN tas.approval_deadline <= CURRENT_TIMESTAMP + INTERVAL '3 days' THEN 'DUE_SOON'
        ELSE 'NORMAL'
    END as urgency_level,
    
    -- 待機日数
    EXTRACT(DAYS FROM CURRENT_TIMESTAMP - tas.activated_at) as days_pending
    
FROM timesheets t
JOIN timesheet_approval_steps tas ON t.id = tas.timesheet_id
LEFT JOIN engineers e ON t.engineer_id = e.id
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.deleted_at IS NULL
  AND tas.deleted_at IS NULL
  AND tas.step_status = 'PENDING'
  AND t.status = 'PENDING_APPROVAL'
ORDER BY tas.approval_deadline, t.created_at;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- daily_attendances のパーティショニング（月次）
CREATE TABLE daily_attendances_partitioned (
    LIKE daily_attendances INCLUDING ALL
) PARTITION BY RANGE (attendance_date);

-- 月次パーティション作成例
CREATE TABLE daily_attendances_2025_01 
PARTITION OF daily_attendances_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE daily_attendances_2025_02 
PARTITION OF daily_attendances_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- デフォルトパーティション
CREATE TABLE daily_attendances_default 
PARTITION OF daily_attendances_partitioned
DEFAULT;
```

### 2. マテリアライズドビュー

```sql
-- 月次労働時間統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW monthly_work_hours_stats AS
SELECT 
    t.period_year,
    t.period_month,
    t.engineer_id,
    e.company_id,
    COUNT(*) as total_timesheets,
    AVG(t.total_working_hours) as avg_working_hours,
    AVG(t.total_overtime_hours) as avg_overtime_hours,
    AVG(t.overtime_rate) as avg_overtime_rate,
    SUM(t.total_working_hours) as total_hours,
    MAX(t.total_working_hours) as max_hours,
    MIN(t.total_working_hours) as min_hours
FROM timesheets t
JOIN engineers e ON t.engineer_id = e.id
WHERE t.deleted_at IS NULL
  AND t.status = 'APPROVED'
  AND t.period_year >= 2024
GROUP BY 
    t.period_year,
    t.period_month,
    t.engineer_id,
    e.company_id;

-- 統計ビュー用インデックス
CREATE INDEX idx_monthly_work_hours_stats_period ON monthly_work_hours_stats(period_year, period_month);
CREATE INDEX idx_monthly_work_hours_stats_engineer ON monthly_work_hours_stats(engineer_id);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_work_hours_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_work_hours_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. 工数表サマリー自動更新

```sql
-- 工数表サマリー自動更新関数
CREATE OR REPLACE FUNCTION update_timesheet_summary()
RETURNS TRIGGER AS $$
DECLARE
    timesheet_id_val UUID;
BEGIN
    -- timesheetのIDを取得
    IF TG_TABLE_NAME = 'daily_attendances' THEN
        timesheet_id_val := COALESCE(NEW.timesheet_id, OLD.timesheet_id);
    ELSIF TG_TABLE_NAME = 'timesheet_special_works' THEN
        timesheet_id_val := COALESCE(NEW.timesheet_id, OLD.timesheet_id);
    ELSIF TG_TABLE_NAME = 'timesheet_adjustments' THEN
        timesheet_id_val := COALESCE(NEW.timesheet_id, OLD.timesheet_id);
    END IF;
    
    -- サマリー再計算
    UPDATE timesheets SET
        total_working_days = (
            SELECT COUNT(*) 
            FROM daily_attendances da 
            WHERE da.timesheet_id = timesheet_id_val 
              AND da.attendance_type = 'WORK' 
              AND da.deleted_at IS NULL
        ),
        total_working_hours = (
            SELECT COALESCE(SUM(actual_working_hours), 0)
            FROM daily_attendances da 
            WHERE da.timesheet_id = timesheet_id_val 
              AND da.deleted_at IS NULL
        ) + (
            SELECT COALESCE(SUM(duration_hours), 0)
            FROM timesheet_special_works tsw 
            WHERE tsw.timesheet_id = timesheet_id_val 
              AND tsw.deleted_at IS NULL
        ),
        total_overtime_hours = (
            SELECT COALESCE(SUM(overtime_hours), 0)
            FROM daily_attendances da 
            WHERE da.timesheet_id = timesheet_id_val 
              AND da.deleted_at IS NULL
        ),
        total_adjustment_hours = (
            SELECT COALESCE(SUM(adjustment_hours), 0)
            FROM timesheet_adjustments ta 
            WHERE ta.timesheet_id = timesheet_id_val 
              AND ta.adjustment_status = 'APPLIED'
              AND ta.deleted_at IS NULL
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = timesheet_id_val;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- サマリー更新トリガー
CREATE TRIGGER trigger_update_timesheet_summary_da
    AFTER INSERT OR UPDATE OR DELETE ON daily_attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheet_summary();

CREATE TRIGGER trigger_update_timesheet_summary_tsw
    AFTER INSERT OR UPDATE OR DELETE ON timesheet_special_works
    FOR EACH ROW
    EXECUTE FUNCTION update_timesheet_summary();

CREATE TRIGGER trigger_update_timesheet_summary_ta
    AFTER INSERT OR UPDATE OR DELETE ON timesheet_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_status = 'APPLIED' OR OLD.adjustment_status = 'APPLIED')
    EXECUTE FUNCTION update_timesheet_summary();
```

### 2. 労働時間バリデーション

```sql
-- 労働時間バリデーション関数
CREATE OR REPLACE FUNCTION validate_working_hours()
RETURNS TRIGGER AS $$
BEGIN
    -- 日別最大労働時間チェック（12時間）
    IF NEW.actual_working_hours > 12 THEN
        RAISE EXCEPTION 'Daily working hours cannot exceed 12 hours';
    END IF;
    
    -- 残業時間の妥当性チェック
    IF NEW.overtime_hours > NEW.actual_working_hours THEN
        RAISE EXCEPTION 'Overtime hours cannot exceed total working hours';
    END IF;
    
    -- 勤務時の必須項目チェック
    IF NEW.attendance_type = 'WORK' THEN
        IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
            RAISE EXCEPTION 'Start time and end time are required for work days';
        END IF;
        
        IF NEW.work_location IS NULL THEN
            RAISE EXCEPTION 'Work location is required for work days';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_working_hours
    BEFORE INSERT OR UPDATE ON daily_attendances
    FOR EACH ROW
    EXECUTE FUNCTION validate_working_hours();
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_approval_steps ENABLE ROW LEVEL SECURITY;

-- 技術者は自分の工数表のみアクセス可能
CREATE POLICY timesheet_engineer_access ON timesheets
    FOR ALL
    TO ses_engineer_role
    USING (engineer_id = current_setting('app.current_user_id')::UUID);

-- 承認者は承認対象の工数表にアクセス可能
CREATE POLICY timesheet_approver_access ON timesheets
    FOR SELECT
    TO ses_approver_role
    USING (
        id IN (
            SELECT timesheet_id FROM timesheet_approval_steps 
            WHERE assigned_approver_id = current_setting('app.current_user_id')::UUID
        )
    );

-- 管理者は全工数表アクセス可能
CREATE POLICY timesheet_admin_access ON timesheets
    FOR ALL
    TO ses_admin_role, ses_hr_role
    USING (true);
```

---

## 運用・保守設計

### 1. データアーカイブ

```sql
-- 古い工数表データのアーカイブ
CREATE OR REPLACE FUNCTION archive_old_timesheets(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 2年前の承認済み工数表をアーカイブ
    WITH archived_timesheets AS (
        UPDATE timesheets 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE status = 'APPROVED' 
          AND make_date(period_year, period_month, 1) < cutoff_date
          AND deleted_at IS NULL
        RETURNING id
    )
    UPDATE daily_attendances 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE timesheet_id IN (SELECT id FROM archived_timesheets)
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Timesheet集約詳細設計  
**次回レビュー**: 2025年7月1日