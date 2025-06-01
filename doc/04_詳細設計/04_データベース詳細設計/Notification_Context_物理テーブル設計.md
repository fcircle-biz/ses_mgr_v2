# Notification Context 物理テーブル設計

## 概要

Notification Context（通知管理）の物理データベース設計。マルチチャネル通知配信、テンプレート管理、通知ルール制御、配信結果追跡の効率的な実現を目指す。

### 対象集約
- **Notification集約**: 通知ライフサイクル管理の中核
- **NotificationTemplate集約**: 通知テンプレート管理
- **NotificationRule集約**: 通知ルール・トリガー管理

---

## テーブル設計

### 1. notifications（通知テーブル）

```sql
-- Notification集約ルート
CREATE TABLE notifications (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 通知基本情報 ===
    notification_type           VARCHAR(20) NOT NULL CHECK (notification_type IN (
        'INFO',                 -- 情報
        'WARNING',              -- 警告
        'ERROR',                -- エラー
        'ALERT',                -- アラート
        'REMINDER'              -- リマインダー
    )),
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SYSTEM',               -- システム
        'BUSINESS',             -- 業務
        'APPROVAL',             -- 承認
        'DEADLINE',             -- 期限
        'SECURITY'              -- セキュリティ
    )),
    priority                    VARCHAR(10) NOT NULL CHECK (priority IN (
        'LOW',                  -- 低
        'MEDIUM',               -- 中
        'HIGH',                 -- 高
        'URGENT'                -- 緊急
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
        'ALL_USERS',            -- 全ユーザー
        'SPECIFIC_USERS',       -- 特定ユーザー
        'ROLE_BASED',           -- ロールベース
        'DEPARTMENT'            -- 部署
    )),
    recipient_users             JSONB,
    /*
    recipient_users構造:
    [
        {
            "userId": "uuid1",
            "userName": "田中太郎",
            "email": "tanaka@company.com",
            "deliveryPreferences": {
                "email": true,
                "slack": false,
                "push": true
            }
        }
    ]
    */
    recipient_roles             JSONB,
    /*
    recipient_roles構造:
    [
        {
            "role": "SALES_MANAGER",
            "description": "営業部長",
            "userCount": 5
        },
        {
            "role": "PROJECT_MANAGER",
            "description": "プロジェクトマネージャー", 
            "userCount": 12
        }
    ]
    */
    
    -- === 送信設定 ===
    timing                      VARCHAR(20) NOT NULL DEFAULT 'IMMEDIATE' CHECK (timing IN (
        'IMMEDIATE',            -- 即座
        'SCHEDULED',            -- スケジュール
        'DELAYED'               -- 遅延
    )),
    scheduled_at                TIMESTAMP WITH TIME ZONE,
    delay_minutes               INTEGER,
    
    -- === ステータス管理 ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',              -- 待機
        'SCHEDULED',            -- スケジュール済
        'SENDING',              -- 送信中
        'SENT',                 -- 送信済
        'PARTIALLY_SENT',       -- 一部送信済
        'FAILED',               -- 送信失敗
        'RETRYING',             -- リトライ中
        'CANCELLED'             -- キャンセル
    )),
    
    -- === リトライ管理 ===
    retry_count                 INTEGER DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),
    max_retry_count             INTEGER DEFAULT 3,
    last_retry_at               TIMESTAMP WITH TIME ZONE,
    next_retry_at               TIMESTAMP WITH TIME ZONE,
    
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
    
    -- === テンプレート情報 ===
    template_id                 UUID,
    template_version            VARCHAR(20),
    template_data               JSONB,
    /*
    template_data構造:
    {
        "projectId": "uuid1",
        "customerId": "uuid2",
        "totalAmount": 1000000,
        "dueDate": "2025-06-30",
        "customerName": "株式会社サンプル",
        "projectName": "Webシステム開発"
    }
    */
    
    -- === 配信チャネル設定 ===
    delivery_channels           JSONB NOT NULL,
    /*
    delivery_channels構造:
    [
        {
            "type": "EMAIL",
            "name": "メール通知",
            "isEnabled": true,
            "priority": 1,
            "settings": {
                "smtpServer": "smtp.company.com",
                "fromAddress": "noreply@company.com"
            }
        },
        {
            "type": "SLACK",
            "name": "Slack通知",
            "isEnabled": true,
            "priority": 2,
            "settings": {
                "webhookUrl": "https://hooks.slack.com/...",
                "channel": "#notifications"
            }
        }
    ]
    */
    
    -- === 送信結果 ===
    delivery_results            JSONB,
    /*
    delivery_results構造:
    [
        {
            "channelType": "EMAIL",
            "status": "SUCCESS",
            "message": "送信成功",
            "deliveredAt": "2025-06-01T10:00:00Z",
            "deliveryTime": 1500,
            "externalId": "msg_12345",
            "recipientCount": 5,
            "successCount": 5,
            "failureCount": 0
        },
        {
            "channelType": "SLACK",
            "status": "FAILED",
            "message": "webhook URL無効",
            "deliveredAt": "2025-06-01T10:00:15Z",
            "deliveryTime": 3000,
            "recipientCount": 1,
            "successCount": 0,
            "failureCount": 1
        }
    ]
    */
    
    -- === 発生元情報 ===
    source_event_type           VARCHAR(100),
    source_event_id             UUID,
    source_context              VARCHAR(50),
    source_data                 JSONB,
    
    -- === 添付ファイル ===
    attachments                 JSONB,
    /*
    attachments構造:
    [
        {
            "fileName": "report.pdf",
            "fileSize": 1024000,
            "fileType": "application/pdf",
            "fileUrl": "/attachments/notifications/uuid/report.pdf",
            "uploadedAt": "2025-06-01T09:30:00Z"
        }
    ]
    */
    
    -- === 閲覧・反応追跡 ===
    read_count                  INTEGER DEFAULT 0,
    click_count                 INTEGER DEFAULT 0,
    first_read_at               TIMESTAMP WITH TIME ZONE,
    last_read_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 有効期限 ===
    expires_at                  TIMESTAMP WITH TIME ZONE,
    auto_delete_after_days      INTEGER DEFAULT 30,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_scheduled_time CHECK (
        (timing != 'SCHEDULED') OR (scheduled_at IS NOT NULL AND scheduled_at > created_at)
    ),
    CONSTRAINT valid_retry_timing CHECK (
        retry_count = 0 OR last_retry_at IS NOT NULL
    ),
    CONSTRAINT valid_delivery_stats CHECK (
        total_recipients >= 0 AND
        successful_deliveries >= 0 AND
        failed_deliveries >= 0 AND
        successful_deliveries + failed_deliveries <= total_recipients
    ),
    CONSTRAINT valid_expires_at CHECK (
        expires_at IS NULL OR expires_at > created_at
    )
);

-- インデックス
CREATE INDEX idx_notifications_type ON notifications(notification_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_category ON notifications(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_priority ON notifications(priority_level DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_status ON notifications(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_audience ON notifications(audience) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE deleted_at IS NULL;

-- 送信処理用インデックス
CREATE INDEX idx_notifications_pending ON notifications(status, priority_level DESC, created_at) 
WHERE deleted_at IS NULL AND status = 'PENDING';
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at, status) 
WHERE deleted_at IS NULL AND status = 'SCHEDULED';
CREATE INDEX idx_notifications_retry ON notifications(next_retry_at, retry_count) 
WHERE deleted_at IS NULL AND status IN ('FAILED', 'RETRYING');

-- テンプレート・ソース検索用インデックス
CREATE INDEX idx_notifications_template ON notifications(template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_source_event ON notifications(source_event_type, source_event_id) WHERE deleted_at IS NULL;

-- 受信者検索用GINインデックス
CREATE INDEX idx_notifications_recipient_users ON notifications USING GIN (recipient_users);
CREATE INDEX idx_notifications_recipient_roles ON notifications USING GIN (recipient_roles);
CREATE INDEX idx_notifications_delivery_channels ON notifications USING GIN (delivery_channels);
CREATE INDEX idx_notifications_delivery_results ON notifications USING GIN (delivery_results);
CREATE INDEX idx_notifications_template_data ON notifications USING GIN (template_data);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. notification_templates（通知テンプレートテーブル）

```sql
-- 通知テンプレート管理テーブル
CREATE TABLE notification_templates (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === テンプレート基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    description                 TEXT,
    template_code               VARCHAR(50) UNIQUE NOT NULL,
    notification_type           VARCHAR(20) NOT NULL CHECK (notification_type IN (
        'INFO', 'WARNING', 'ERROR', 'ALERT', 'REMINDER'
    )),
    category                    VARCHAR(20) NOT NULL CHECK (category IN (
        'SYSTEM', 'BUSINESS', 'APPROVAL', 'DEADLINE', 'SECURITY'
    )),
    
    -- === テンプレート内容 ===
    title_template              TEXT NOT NULL,
    message_template            TEXT NOT NULL,
    action_url_template         VARCHAR(1000),
    
    -- === チャネル別テンプレート ===
    channel_templates           JSONB,
    /*
    channel_templates構造:
    {
        "EMAIL": {
            "subject": "{{title}}",
            "body": "<html><body>{{message}}</body></html>",
            "format": "HTML"
        },
        "SLACK": {
            "text": "{{title}}\n{{message}}",
            "color": "{{color}}",
            "fields": [
                {"title": "詳細", "value": "{{details}}", "short": false}
            ]
        },
        "SMS": {
            "text": "{{title}}: {{message}}",
            "maxLength": 160
        }
    }
    */
    
    -- === テンプレート変数 ===
    template_variables          JSONB,
    /*
    template_variables構造:
    [
        {
            "name": "projectName",
            "type": "STRING",
            "required": true,
            "description": "プロジェクト名",
            "defaultValue": "",
            "validation": {
                "maxLength": 100
            }
        },
        {
            "name": "totalAmount",
            "type": "NUMBER",
            "required": true,
            "description": "請求金額",
            "format": "CURRENCY"
        },
        {
            "name": "dueDate",
            "type": "DATE",
            "required": false,
            "description": "期限日",
            "format": "YYYY-MM-DD"
        }
    ]
    */
    
    -- === デフォルト設定 ===
    default_priority            VARCHAR(10) DEFAULT 'MEDIUM' CHECK (default_priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    )),
    default_channels            JSONB,
    /*
    default_channels構造:
    [
        {
            "type": "EMAIL",
            "isEnabled": true,
            "priority": 1
        },
        {
            "type": "SLACK", 
            "isEnabled": false,
            "priority": 2
        }
    ]
    */
    default_delay_minutes       INTEGER DEFAULT 0,
    
    -- === 適用条件 ===
    applicable_events           JSONB,
    /*
    applicable_events構造:
    [
        {
            "eventType": "ProjectOrdered",
            "conditions": {
                "projectBudget": {"operator": "GTE", "value": 1000000}
            }
        },
        {
            "eventType": "InvoiceIssued",
            "conditions": {
                "totalAmount": {"operator": "GTE", "value": 500000}
            }
        }
    ]
    */
    applicable_roles            JSONB,
    /*
    applicable_roles構造:
    [
        "SALES_MANAGER",
        "PROJECT_MANAGER", 
        "FINANCE_MANAGER"
    ]
    */
    
    -- === バージョン管理 ===
    version                     VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active                   BOOLEAN DEFAULT TRUE,
    is_latest_version           BOOLEAN DEFAULT TRUE,
    parent_template_id          UUID REFERENCES notification_templates(id),
    
    -- === 使用統計 ===
    usage_count                 INTEGER DEFAULT 0,
    last_used_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 承認情報 ===
    approval_status             VARCHAR(20) DEFAULT 'APPROVED' CHECK (approval_status IN (
        'DRAFT',                -- 下書き
        'PENDING_APPROVAL',     -- 承認待ち
        'APPROVED',             -- 承認済み
        'REJECTED'              -- 却下
    )),
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    
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
CREATE INDEX idx_notification_templates_name ON notification_templates(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_code ON notification_templates(template_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_type ON notification_templates(notification_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_category ON notification_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_latest ON notification_templates(is_latest_version) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_templates_approval ON notification_templates(approval_status) WHERE deleted_at IS NULL;

-- テンプレート設定検索用GINインデックス
CREATE INDEX idx_notification_templates_channel_templates ON notification_templates USING GIN (channel_templates);
CREATE INDEX idx_notification_templates_variables ON notification_templates USING GIN (template_variables);
CREATE INDEX idx_notification_templates_events ON notification_templates USING GIN (applicable_events);
CREATE INDEX idx_notification_templates_roles ON notification_templates USING GIN (applicable_roles);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. notification_rules（通知ルールテーブル）

```sql
-- 通知ルール・トリガー管理テーブル
CREATE TABLE notification_rules (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === ルール基本情報 ===
    rule_name                   VARCHAR(200) NOT NULL,
    description                 TEXT,
    rule_type                   VARCHAR(20) NOT NULL CHECK (rule_type IN (
        'EVENT_BASED',          -- イベントベース
        'SCHEDULE_BASED',       -- スケジュールベース
        'THRESHOLD_BASED'       -- 閾値ベース
    )),
    
    -- === 発動条件 ===
    event_type                  VARCHAR(100),
    event_conditions            JSONB,
    /*
    event_conditions構造:
    {
        "filters": [
            {
                "field": "totalAmount",
                "operator": "GTE",
                "value": 1000000,
                "description": "請求金額が100万円以上"
            },
            {
                "field": "priority",
                "operator": "EQ", 
                "value": "URGENT",
                "description": "緊急度が高い"
            }
        ],
        "logicalOperator": "AND"
    }
    */
    schedule_expression         VARCHAR(100),
    
    -- === アクション設定 ===
    template_id                 UUID NOT NULL REFERENCES notification_templates(id),
    target_priority             VARCHAR(10) DEFAULT 'MEDIUM' CHECK (target_priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    )),
    target_audience             VARCHAR(20) DEFAULT 'ROLE_BASED' CHECK (target_audience IN (
        'ALL_USERS', 'SPECIFIC_USERS', 'ROLE_BASED', 'DEPARTMENT'
    )),
    target_roles                JSONB,
    /*
    target_roles構造:
    [
        {
            "role": "SALES_MANAGER",
            "description": "営業部長",
            "condition": "project.salesManagerId"
        },
        {
            "role": "PROJECT_MANAGER", 
            "description": "プロジェクトマネージャー",
            "condition": "project.projectManagerId"
        }
    ]
    */
    target_users                JSONB,
    target_channels             JSONB,
    /*
    target_channels構造:
    [
        {
            "type": "EMAIL",
            "isEnabled": true,
            "priority": 1,
            "condition": "user.emailEnabled"
        },
        {
            "type": "SLACK",
            "isEnabled": true,
            "priority": 2,
            "condition": "user.slackEnabled"
        }
    ]
    */
    
    -- === 制限・制御設定 ===
    cooldown_minutes            INTEGER DEFAULT 15,
    max_notifications_per_hour  INTEGER DEFAULT 10,
    max_notifications_per_day   INTEGER DEFAULT 50,
    
    -- === 有効期間 ===
    effective_from              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_until             TIMESTAMP WITH TIME ZONE,
    
    -- === ステータス ===
    is_active                   BOOLEAN DEFAULT TRUE,
    is_test_mode                BOOLEAN DEFAULT FALSE,
    
    -- === 実行統計 ===
    trigger_count               INTEGER DEFAULT 0,
    last_triggered_at           TIMESTAMP WITH TIME ZONE,
    last_notification_id        UUID,
    success_count               INTEGER DEFAULT 0,
    failure_count               INTEGER DEFAULT 0,
    
    -- === エラー・デバッグ情報 ===
    last_error_message          TEXT,
    last_error_at               TIMESTAMP WITH TIME ZONE,
    debug_mode                  BOOLEAN DEFAULT FALSE,
    debug_log                   JSONB,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_effective_period CHECK (
        effective_until IS NULL OR effective_until > effective_from
    ),
    CONSTRAINT valid_notification_limits CHECK (
        max_notifications_per_hour > 0 AND 
        max_notifications_per_day > 0 AND
        max_notifications_per_day >= max_notifications_per_hour
    ),
    CONSTRAINT event_or_schedule_required CHECK (
        (rule_type = 'EVENT_BASED' AND event_type IS NOT NULL) OR
        (rule_type = 'SCHEDULE_BASED' AND schedule_expression IS NOT NULL) OR
        (rule_type = 'THRESHOLD_BASED' AND event_conditions IS NOT NULL)
    )
);

-- インデックス
CREATE INDEX idx_notification_rules_name ON notification_rules(rule_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_rules_type ON notification_rules(rule_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_rules_event_type ON notification_rules(event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_rules_template_id ON notification_rules(template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_rules_active ON notification_rules(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_rules_effective_period ON notification_rules(effective_from, effective_until) WHERE deleted_at IS NULL;

-- 発動制御用インデックス
CREATE INDEX idx_notification_rules_event_active ON notification_rules(event_type, is_active) 
WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_notification_rules_last_triggered ON notification_rules(last_triggered_at) WHERE deleted_at IS NULL;

-- 条件検索用GINインデックス
CREATE INDEX idx_notification_rules_event_conditions ON notification_rules USING GIN (event_conditions);
CREATE INDEX idx_notification_rules_target_roles ON notification_rules USING GIN (target_roles);
CREATE INDEX idx_notification_rules_target_channels ON notification_rules USING GIN (target_channels);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notification_rules_updated_at
    BEFORE UPDATE ON notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. notification_deliveries（配信結果詳細テーブル）

```sql
-- 配信結果詳細追跡テーブル
CREATE TABLE notification_deliveries (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id             UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- === 配信基本情報 ===
    recipient_id                UUID NOT NULL,
    recipient_type              VARCHAR(20) NOT NULL CHECK (recipient_type IN (
        'USER',                 -- ユーザー
        'ROLE',                 -- ロール
        'EMAIL',                -- メールアドレス
        'PHONE'                 -- 電話番号
    )),
    recipient_address           VARCHAR(500) NOT NULL,
    recipient_name              VARCHAR(200),
    
    -- === 配信チャネル情報 ===
    channel_type                VARCHAR(20) NOT NULL CHECK (channel_type IN (
        'EMAIL',                -- メール
        'SLACK',                -- Slack
        'PUSH',                 -- プッシュ通知
        'SMS',                  -- SMS
        'IN_APP'                -- アプリ内通知
    )),
    channel_name                VARCHAR(100),
    channel_settings            JSONB,
    
    -- === 配信ステータス ===
    delivery_status             VARCHAR(20) NOT NULL CHECK (delivery_status IN (
        'PENDING',              -- 配信待ち
        'SENDING',              -- 送信中
        'SUCCESS',              -- 成功
        'FAILED',               -- 失敗
        'DISABLED',             -- 無効
        'UNSUPPORTED'           -- 非サポート
    )),
    
    -- === 配信結果詳細 ===
    delivered_at                TIMESTAMP WITH TIME ZONE,
    delivery_duration_ms        INTEGER,
    external_message_id         VARCHAR(200),
    external_response           JSONB,
    
    -- === エラー情報 ===
    error_code                  VARCHAR(50),
    error_message               TEXT,
    error_details               JSONB,
    is_retryable                BOOLEAN DEFAULT FALSE,
    
    -- === リトライ情報 ===
    retry_count                 INTEGER DEFAULT 0,
    max_retry_count             INTEGER DEFAULT 3,
    next_retry_at               TIMESTAMP WITH TIME ZONE,
    last_retry_at               TIMESTAMP WITH TIME ZONE,
    
    -- === 受信者反応追跡 ===
    is_read                     BOOLEAN DEFAULT FALSE,
    read_at                     TIMESTAMP WITH TIME ZONE,
    is_clicked                  BOOLEAN DEFAULT FALSE,
    clicked_at                  TIMESTAMP WITH TIME ZONE,
    click_count                 INTEGER DEFAULT 0,
    
    -- === コンテンツ情報 ===
    delivered_title             VARCHAR(500),
    delivered_message           TEXT,
    delivered_content           JSONB,
    content_size_bytes          INTEGER,
    
    -- === デバイス・環境情報 ===
    user_agent                  TEXT,
    device_info                 JSONB,
    ip_address                  INET,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_delivery_duration CHECK (delivery_duration_ms >= 0),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retry_count),
    CONSTRAINT valid_content_size CHECK (content_size_bytes >= 0),
    CONSTRAINT valid_read_clicked_timing CHECK (
        read_at IS NULL OR delivered_at IS NULL OR read_at >= delivered_at
    )
);

-- インデックス
CREATE INDEX idx_notification_deliveries_notification_id ON notification_deliveries(notification_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_deliveries_recipient ON notification_deliveries(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_deliveries_channel ON notification_deliveries(channel_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_deliveries_status ON notification_deliveries(delivery_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_deliveries_delivered_at ON notification_deliveries(delivered_at) WHERE deleted_at IS NULL;

-- 配信処理用インデックス
CREATE INDEX idx_notification_deliveries_pending ON notification_deliveries(notification_id, delivery_status) 
WHERE deleted_at IS NULL AND delivery_status = 'PENDING';
CREATE INDEX idx_notification_deliveries_retry ON notification_deliveries(next_retry_at, retry_count) 
WHERE deleted_at IS NULL AND delivery_status = 'FAILED' AND next_retry_at IS NOT NULL;

-- 統計分析用複合インデックス
CREATE INDEX idx_notification_deliveries_stats ON notification_deliveries(channel_type, delivery_status, delivered_at) 
WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_deliveries_recipient_channel ON notification_deliveries(recipient_id, channel_type, delivered_at) 
WHERE deleted_at IS NULL;

-- 外部ID検索用インデックス
CREATE INDEX idx_notification_deliveries_external_id ON notification_deliveries(external_message_id) WHERE deleted_at IS NULL;

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notification_deliveries_updated_at
    BEFORE UPDATE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 5. notification_channels（配信チャネル設定テーブル）

```sql
-- 配信チャネル設定管理テーブル
CREATE TABLE notification_channels (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === チャネル基本情報 ===
    channel_name                VARCHAR(100) UNIQUE NOT NULL,
    channel_type                VARCHAR(20) NOT NULL CHECK (channel_type IN (
        'EMAIL', 'SLACK', 'PUSH', 'SMS', 'IN_APP'
    )),
    description                 TEXT,
    
    -- === チャネル設定 ===
    channel_config              JSONB NOT NULL,
    /*
    channel_config構造（EMAIL）:
    {
        "smtpServer": "smtp.company.com",
        "smtpPort": 587,
        "smtpSecurity": "TLS",
        "fromAddress": "noreply@company.com",
        "fromName": "SESシステム",
        "replyToAddress": "support@company.com",
        "authentication": {
            "username": "smtp_user",
            "password": "encrypted_password"
        },
        "maxRecipientsPerMessage": 50,
        "rateLimit": {
            "messagesPerMinute": 100,
            "messagesPerHour": 1000
        }
    }
    
    channel_config構造（SLACK）:
    {
        "webhookUrl": "https://hooks.slack.com/services/...",
        "defaultChannel": "#notifications",
        "botToken": "xoxb-...",
        "botName": "SESBot",
        "iconEmoji": ":robot_face:",
        "colorMapping": {
            "LOW": "#36a64f",
            "MEDIUM": "#ff9900",
            "HIGH": "#ff0000",
            "URGENT": "#990000"
        }
    }
    */
    
    -- === 配信制限 ===
    rate_limit_per_minute       INTEGER DEFAULT 60,
    rate_limit_per_hour         INTEGER DEFAULT 1000,
    rate_limit_per_day          INTEGER DEFAULT 10000,
    max_content_size_bytes      INTEGER DEFAULT 1048576,
    
    -- === ステータス・制御 ===
    is_enabled                  BOOLEAN DEFAULT TRUE,
    is_test_mode                BOOLEAN DEFAULT FALSE,
    maintenance_mode            BOOLEAN DEFAULT FALSE,
    maintenance_message         TEXT,
    
    -- === 優先度・フォールバック ===
    priority_order              INTEGER DEFAULT 1,
    fallback_channel_id         UUID REFERENCES notification_channels(id),
    health_check_enabled        BOOLEAN DEFAULT TRUE,
    health_check_interval_minutes INTEGER DEFAULT 5,
    
    -- === 統計情報 ===
    total_sent_count            INTEGER DEFAULT 0,
    total_success_count         INTEGER DEFAULT 0,
    total_failure_count         INTEGER DEFAULT 0,
    last_success_at             TIMESTAMP WITH TIME ZONE,
    last_failure_at             TIMESTAMP WITH TIME ZONE,
    last_health_check_at        TIMESTAMP WITH TIME ZONE,
    health_status               VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (health_status IN (
        'HEALTHY',              -- 正常
        'WARNING',              -- 警告
        'UNHEALTHY',            -- 異常
        'UNKNOWN'               -- 不明
    )),
    
    -- === エラー・障害情報 ===
    last_error_message          TEXT,
    last_error_details          JSONB,
    consecutive_failure_count   INTEGER DEFAULT 0,
    circuit_breaker_open        BOOLEAN DEFAULT FALSE,
    circuit_breaker_opened_at   TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_rate_limits CHECK (
        rate_limit_per_minute > 0 AND
        rate_limit_per_hour > 0 AND 
        rate_limit_per_day > 0 AND
        rate_limit_per_day >= rate_limit_per_hour AND
        rate_limit_per_hour >= rate_limit_per_minute
    ),
    CONSTRAINT valid_content_size CHECK (max_content_size_bytes > 0),
    CONSTRAINT valid_health_check CHECK (health_check_interval_minutes > 0)
);

-- インデックス
CREATE INDEX idx_notification_channels_name ON notification_channels(channel_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_channels_type ON notification_channels(channel_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_channels_enabled ON notification_channels(is_enabled) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_channels_priority ON notification_channels(priority_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_channels_health ON notification_channels(health_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_channels_maintenance ON notification_channels(maintenance_mode) WHERE deleted_at IS NULL;

-- フォールバック検索用インデックス
CREATE INDEX idx_notification_channels_fallback ON notification_channels(fallback_channel_id) WHERE deleted_at IS NULL;

-- ヘルスチェック用インデックス
CREATE INDEX idx_notification_channels_health_check ON notification_channels(health_check_enabled, last_health_check_at) 
WHERE deleted_at IS NULL AND health_check_enabled = true;

-- 設定検索用GINインデックス
CREATE INDEX idx_notification_channels_config ON notification_channels USING GIN (channel_config);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notification_channels_updated_at
    BEFORE UPDATE ON notification_channels
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 6. notification_subscriptions（通知購読設定テーブル）

```sql
-- ユーザー通知購読設定テーブル
CREATE TABLE notification_subscriptions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 購読者情報 ===
    user_id                     UUID NOT NULL,
    user_email                  VARCHAR(255),
    user_phone                  VARCHAR(20),
    user_slack_id               VARCHAR(50),
    
    -- === 購読設定 ===
    subscription_type           VARCHAR(20) NOT NULL CHECK (subscription_type IN (
        'ALL',                  -- 全通知
        'CATEGORY',             -- カテゴリ別
        'TYPE',                 -- タイプ別
        'PRIORITY',             -- 優先度別
        'CUSTOM'                -- カスタム
    )),
    
    -- === カテゴリ・タイプ設定 ===
    subscribed_categories       JSONB,
    /*
    subscribed_categories構造:
    [
        {
            "category": "BUSINESS",
            "isEnabled": true,
            "channels": ["EMAIL", "SLACK"]
        },
        {
            "category": "APPROVAL", 
            "isEnabled": true,
            "channels": ["EMAIL", "PUSH"]
        }
    ]
    */
    subscribed_types            JSONB,
    subscribed_priorities       JSONB,
    
    -- === チャネル別設定 ===
    channel_preferences         JSONB NOT NULL,
    /*
    channel_preferences構造:
    {
        "EMAIL": {
            "isEnabled": true,
            "address": "user@company.com",
            "format": "HTML",
            "frequency": "IMMEDIATE",
            "quietHours": {
                "start": "22:00",
                "end": "08:00"
            }
        },
        "SLACK": {
            "isEnabled": true,
            "userId": "U1234567",
            "dmEnabled": true,
            "channelMentions": false
        },
        "PUSH": {
            "isEnabled": false,
            "deviceTokens": ["token1", "token2"],
            "quietHours": {
                "start": "22:00", 
                "end": "08:00"
            }
        },
        "SMS": {
            "isEnabled": false,
            "phoneNumber": "+81-90-1234-5678",
            "urgentOnly": true
        }
    }
    */
    
    -- === 配信頻度制御 ===
    delivery_frequency          VARCHAR(20) DEFAULT 'IMMEDIATE' CHECK (delivery_frequency IN (
        'IMMEDIATE',            -- 即座
        'BATCHED_HOURLY',       -- 1時間ごと
        'BATCHED_DAILY',        -- 1日ごと
        'BATCHED_WEEKLY'        -- 1週間ごと
    )),
    batch_delivery_time         TIME DEFAULT '09:00',
    max_notifications_per_hour  INTEGER DEFAULT 20,
    max_notifications_per_day   INTEGER DEFAULT 100,
    
    -- === 静寂時間設定 ===
    quiet_hours_enabled         BOOLEAN DEFAULT TRUE,
    quiet_hours_start           TIME DEFAULT '22:00',
    quiet_hours_end             TIME DEFAULT '08:00',
    quiet_hours_timezone        VARCHAR(50) DEFAULT 'Asia/Tokyo',
    
    -- === フィルター設定 ===
    keyword_filters             JSONB,
    /*
    keyword_filters構造:
    {
        "includeKeywords": ["緊急", "重要", "請求"],
        "excludeKeywords": ["テスト", "デモ"],
        "caseSensitive": false
    }
    */
    sender_filters              JSONB,
    custom_rules                JSONB,
    
    -- === 言語・地域設定 ===
    language                    VARCHAR(10) DEFAULT 'ja',
    timezone                    VARCHAR(50) DEFAULT 'Asia/Tokyo',
    date_format                 VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    
    -- === ステータス ===
    is_active                   BOOLEAN DEFAULT TRUE,
    is_verified                 BOOLEAN DEFAULT FALSE,
    verification_code           VARCHAR(10),
    verification_expires_at     TIMESTAMP WITH TIME ZONE,
    
    -- === 統計情報 ===
    total_received_count        INTEGER DEFAULT 0,
    total_read_count            INTEGER DEFAULT 0,
    total_clicked_count         INTEGER DEFAULT 0,
    last_notification_at        TIMESTAMP WITH TIME ZONE,
    last_read_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_user_subscription UNIQUE(user_id) WHERE deleted_at IS NULL,
    CONSTRAINT valid_notification_limits CHECK (
        max_notifications_per_hour > 0 AND
        max_notifications_per_day > 0 AND
        max_notifications_per_day >= max_notifications_per_hour
    ),
    CONSTRAINT valid_quiet_hours CHECK (
        NOT quiet_hours_enabled OR 
        (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
    )
);

-- インデックス
CREATE INDEX idx_notification_subscriptions_user_id ON notification_subscriptions(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_subscriptions_active ON notification_subscriptions(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_subscriptions_verified ON notification_subscriptions(is_verified) WHERE deleted_at IS NULL;
CREATE INDEX idx_notification_subscriptions_frequency ON notification_subscriptions(delivery_frequency) WHERE deleted_at IS NULL;

-- 設定検索用GINインデックス
CREATE INDEX idx_notification_subscriptions_categories ON notification_subscriptions USING GIN (subscribed_categories);
CREATE INDEX idx_notification_subscriptions_channels ON notification_subscriptions USING GIN (channel_preferences);
CREATE INDEX idx_notification_subscriptions_filters ON notification_subscriptions USING GIN (keyword_filters);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_notification_subscriptions_updated_at
    BEFORE UPDATE ON notification_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. notification_dashboard_view（通知ダッシュボードビュー）

```sql
-- 通知管理ダッシュボード用のビュー
CREATE VIEW notification_dashboard_view AS
SELECT 
    n.id,
    n.notification_type,
    n.category,
    n.priority,
    n.priority_level,
    n.title,
    n.status,
    n.audience,
    n.total_recipients,
    n.successful_deliveries,
    n.failed_deliveries,
    n.delivery_success_rate,
    n.retry_count,
    n.created_at,
    n.scheduled_at,
    n.template_id,
    
    -- ステータス表示
    CASE 
        WHEN n.status = 'SENT' AND n.delivery_success_rate = 100 THEN 'SUCCESS'
        WHEN n.status = 'SENT' AND n.delivery_success_rate >= 80 THEN 'MOSTLY_SUCCESS'
        WHEN n.status = 'PARTIALLY_SENT' THEN 'PARTIAL'
        WHEN n.status = 'FAILED' THEN 'FAILED'
        WHEN n.status = 'CANCELLED' THEN 'CANCELLED'
        WHEN n.status IN ('PENDING', 'SCHEDULED') THEN 'WAITING'
        ELSE 'PROCESSING'
    END as display_status,
    
    -- 緊急度表示
    CASE n.priority
        WHEN 'URGENT' THEN '#FF0000'
        WHEN 'HIGH' THEN '#FF9900'
        WHEN 'MEDIUM' THEN '#36A64F'
        WHEN 'LOW' THEN '#0084FF'
    END as priority_color,
    
    -- 経過時間
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - n.created_at))/3600 as hours_since_created,
    
    -- テンプレート情報
    nt.name as template_name,
    nt.template_code,
    
    -- 配信チャネル統計
    delivery_stats.email_count,
    delivery_stats.slack_count,
    delivery_stats.push_count,
    delivery_stats.sms_count,
    delivery_stats.total_channels,
    
    -- 期限情報
    CASE 
        WHEN n.scheduled_at IS NOT NULL AND n.scheduled_at < CURRENT_TIMESTAMP AND n.status = 'SCHEDULED' 
        THEN 'OVERDUE'
        WHEN n.scheduled_at IS NOT NULL AND n.scheduled_at <= CURRENT_TIMESTAMP + INTERVAL '1 hour' 
        THEN 'DUE_SOON'
        ELSE 'NORMAL'
    END as urgency_status
    
FROM notifications n
LEFT JOIN notification_templates nt ON n.template_id = nt.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) FILTER (WHERE (delivery_results->0->>'channelType') = 'EMAIL') as email_count,
        COUNT(*) FILTER (WHERE (delivery_results->0->>'channelType') = 'SLACK') as slack_count,
        COUNT(*) FILTER (WHERE (delivery_results->0->>'channelType') = 'PUSH') as push_count,
        COUNT(*) FILTER (WHERE (delivery_results->0->>'channelType') = 'SMS') as sms_count,
        jsonb_array_length(n.delivery_channels) as total_channels
    FROM unnest(ARRAY[1]) -- dummy lateral join
) delivery_stats ON true
WHERE n.deleted_at IS NULL;
```

### 2. notification_performance_view（通知パフォーマンスビュー）

```sql
-- 通知配信パフォーマンス分析用のビュー
CREATE VIEW notification_performance_view AS
SELECT 
    nd.channel_type,
    nd.delivery_status,
    nc.channel_name,
    nc.health_status,
    date_trunc('hour', nd.delivered_at) as delivery_hour,
    
    -- 配信統計
    COUNT(*) as delivery_count,
    COUNT(*) FILTER (WHERE nd.delivery_status = 'SUCCESS') as success_count,
    COUNT(*) FILTER (WHERE nd.delivery_status = 'FAILED') as failure_count,
    ROUND(
        (COUNT(*) FILTER (WHERE nd.delivery_status = 'SUCCESS')::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate,
    
    -- パフォーマンス統計
    AVG(nd.delivery_duration_ms) as avg_delivery_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY nd.delivery_duration_ms) as median_delivery_time_ms,
    MAX(nd.delivery_duration_ms) as max_delivery_time_ms,
    MIN(nd.delivery_duration_ms) as min_delivery_time_ms,
    
    -- エラー統計
    COUNT(DISTINCT nd.error_code) as unique_error_count,
    array_agg(DISTINCT nd.error_code) FILTER (WHERE nd.error_code IS NOT NULL) as error_codes,
    
    -- リトライ統計
    AVG(nd.retry_count) as avg_retry_count,
    MAX(nd.retry_count) as max_retry_count,
    COUNT(*) FILTER (WHERE nd.retry_count > 0) as retry_required_count,
    
    -- 受信者反応統計
    COUNT(*) FILTER (WHERE nd.is_read = true) as read_count,
    COUNT(*) FILTER (WHERE nd.is_clicked = true) as click_count,
    ROUND(
        (COUNT(*) FILTER (WHERE nd.is_read = true)::DECIMAL / 
         COUNT(*) FILTER (WHERE nd.delivery_status = 'SUCCESS')) * 100, 2
    ) as read_rate,
    ROUND(
        (COUNT(*) FILTER (WHERE nd.is_clicked = true)::DECIMAL / 
         COUNT(*) FILTER (WHERE nd.is_read = true)) * 100, 2
    ) as click_through_rate
    
FROM notification_deliveries nd
LEFT JOIN notification_channels nc ON nd.channel_type = nc.channel_type
WHERE nd.deleted_at IS NULL
  AND nd.delivered_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY 
    nd.channel_type,
    nd.delivery_status,
    nc.channel_name,
    nc.health_status,
    date_trunc('hour', nd.delivered_at)
ORDER BY delivery_hour DESC, nd.channel_type;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- notifications のパーティショニング（月次）
CREATE TABLE notifications_partitioned (
    LIKE notifications INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 月次パーティション作成例
CREATE TABLE notifications_2025_06 
PARTITION OF notifications_partitioned
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE notifications_2025_07 
PARTITION OF notifications_partitioned
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

-- デフォルトパーティション
CREATE TABLE notifications_default 
PARTITION OF notifications_partitioned
DEFAULT;

-- notification_deliveries のパーティショニング（月次）
CREATE TABLE notification_deliveries_partitioned (
    LIKE notification_deliveries INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 月次パーティション作成例
CREATE TABLE notification_deliveries_2025_06 
PARTITION OF notification_deliveries_partitioned
FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE notification_deliveries_2025_07 
PARTITION OF notification_deliveries_partitioned
FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
```

### 2. マテリアライズドビュー

```sql
-- 時間別通知統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW hourly_notification_stats AS
SELECT 
    date_trunc('hour', n.created_at) as hour,
    n.notification_type,
    n.category,
    n.priority,
    COUNT(*) as notification_count,
    COUNT(*) FILTER (WHERE n.status = 'SENT') as sent_count,
    COUNT(*) FILTER (WHERE n.status = 'FAILED') as failed_count,
    AVG(n.delivery_success_rate) as avg_success_rate,
    SUM(n.total_recipients) as total_recipients,
    SUM(n.successful_deliveries) as total_successful_deliveries,
    AVG(EXTRACT(EPOCH FROM (n.updated_at - n.created_at))/60) as avg_processing_time_minutes
FROM notifications n
WHERE n.deleted_at IS NULL
  AND n.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY 
    date_trunc('hour', n.created_at),
    n.notification_type,
    n.category,
    n.priority;

-- 統計ビュー用インデックス
CREATE INDEX idx_hourly_notification_stats_hour ON hourly_notification_stats(hour);
CREATE INDEX idx_hourly_notification_stats_type ON hourly_notification_stats(notification_type);

-- チャネル別配信統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW channel_delivery_stats AS
SELECT 
    nd.channel_type,
    date_trunc('day', nd.delivered_at) as delivery_date,
    COUNT(*) as total_deliveries,
    COUNT(*) FILTER (WHERE nd.delivery_status = 'SUCCESS') as successful_deliveries,
    COUNT(*) FILTER (WHERE nd.delivery_status = 'FAILED') as failed_deliveries,
    AVG(nd.delivery_duration_ms) as avg_delivery_time_ms,
    COUNT(*) FILTER (WHERE nd.is_read = true) as read_count,
    COUNT(*) FILTER (WHERE nd.is_clicked = true) as click_count
FROM notification_deliveries nd
WHERE nd.deleted_at IS NULL
  AND nd.delivered_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY 
    nd.channel_type,
    date_trunc('day', nd.delivered_at);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_notification_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_notification_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY channel_delivery_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. 通知配信統計自動更新

```sql
-- 通知配信統計自動更新関数
CREATE OR REPLACE FUNCTION update_notification_delivery_stats()
RETURNS TRIGGER AS $$
DECLARE
    notification_id_val UUID;
    total_count INTEGER;
    success_count INTEGER;
    failure_count INTEGER;
BEGIN
    notification_id_val := COALESCE(NEW.notification_id, OLD.notification_id);
    
    -- 配信結果集計
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE delivery_status = 'SUCCESS'),
        COUNT(*) FILTER (WHERE delivery_status = 'FAILED')
    INTO total_count, success_count, failure_count
    FROM notification_deliveries 
    WHERE notification_id = notification_id_val 
      AND deleted_at IS NULL;
    
    -- 通知テーブルの統計更新
    UPDATE notifications 
    SET 
        total_recipients = total_count,
        successful_deliveries = success_count,
        failed_deliveries = failure_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = notification_id_val;
    
    -- ステータス自動更新
    UPDATE notifications 
    SET status = CASE 
        WHEN success_count = total_count AND total_count > 0 THEN 'SENT'
        WHEN failure_count = total_count AND total_count > 0 THEN 'FAILED'
        WHEN success_count > 0 AND failure_count > 0 THEN 'PARTIALLY_SENT'
        ELSE status
    END
    WHERE id = notification_id_val
      AND status = 'SENDING';
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_delivery_stats
    AFTER INSERT OR UPDATE OR DELETE ON notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_delivery_stats();
```

### 2. 通知ルール発動制御

```sql
-- 通知ルール発動制御関数
CREATE OR REPLACE FUNCTION check_notification_rule_limits()
RETURNS TRIGGER AS $$
DECLARE
    hourly_count INTEGER;
    daily_count INTEGER;
    last_trigger TIMESTAMP WITH TIME ZONE;
    cooldown_period INTERVAL;
BEGIN
    -- クールダウン期間チェック
    cooldown_period := INTERVAL '1 minute' * NEW.cooldown_minutes;
    
    IF NEW.last_triggered_at IS NOT NULL AND 
       NEW.last_triggered_at + cooldown_period > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Rule is in cooldown period until %', 
            (NEW.last_triggered_at + cooldown_period);
    END IF;
    
    -- 時間当たり制限チェック
    SELECT COUNT(*) INTO hourly_count
    FROM notifications 
    WHERE source_event_type = NEW.event_type
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      AND deleted_at IS NULL;
      
    IF hourly_count >= NEW.max_notifications_per_hour THEN
        RAISE EXCEPTION 'Hourly notification limit exceeded for rule %', NEW.rule_name;
    END IF;
    
    -- 日当たり制限チェック
    SELECT COUNT(*) INTO daily_count
    FROM notifications 
    WHERE source_event_type = NEW.event_type
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 day'
      AND deleted_at IS NULL;
      
    IF daily_count >= NEW.max_notifications_per_day THEN
        RAISE EXCEPTION 'Daily notification limit exceeded for rule %', NEW.rule_name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_notification_rule_limits
    BEFORE UPDATE ON notification_rules
    FOR EACH ROW
    WHEN (NEW.last_triggered_at IS DISTINCT FROM OLD.last_triggered_at)
    EXECUTE FUNCTION check_notification_rule_limits();
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分宛の通知のみアクセス可能
CREATE POLICY notification_recipient_access ON notifications
    FOR SELECT
    TO ses_user_role
    USING (
        recipient_users @> jsonb_build_array(
            jsonb_build_object('userId', current_setting('app.current_user_id'))
        ) OR
        recipient_roles @> jsonb_build_array(
            current_setting('app.current_user_role')
        )
    );

-- 管理者は全通知アクセス可能
CREATE POLICY notification_admin_access ON notifications
    FOR ALL
    TO ses_admin_role, ses_notification_admin_role
    USING (true);

-- 購読設定は本人のみアクセス可能
CREATE POLICY subscription_owner_access ON notification_subscriptions
    FOR ALL
    TO ses_user_role
    USING (user_id = current_setting('app.current_user_id')::UUID);
```

### 2. 機密データ暗号化

```sql
-- 通知内容暗号化トリガー
CREATE OR REPLACE FUNCTION encrypt_notification_sensitive_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 個人情報の暗号化処理
    IF NEW.template_data IS NOT NULL THEN
        -- 実際の暗号化実装は要件に応じて
        -- NEW.template_data := encrypt_sensitive_json(NEW.template_data);
    END IF;
    
    -- 受信者情報の暗号化
    IF NEW.recipient_users IS NOT NULL THEN
        -- 個人情報部分の暗号化処理
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_encrypt_notification_data
    BEFORE INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_notification_sensitive_data();
```

---

## 運用・保守設計

### 1. データアーカイブ

```sql
-- 古い通知データのアーカイブ
CREATE OR REPLACE FUNCTION archive_old_notifications(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 30日前の送信済み通知をアーカイブ
    WITH archived_notifications AS (
        UPDATE notifications 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE status = 'SENT' 
          AND created_at < cutoff_date::TIMESTAMP
          AND deleted_at IS NULL
        RETURNING id
    )
    UPDATE notification_deliveries 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE notification_id IN (SELECT id FROM archived_notifications)
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

### 2. 通知配信キュー処理

```sql
-- 通知配信キュー処理関数
CREATE OR REPLACE FUNCTION process_notification_queue()
RETURNS TABLE(
    notification_id UUID,
    status VARCHAR,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
DECLARE
    notification_rec RECORD;
BEGIN
    -- 配信待ち通知の取得
    FOR notification_rec IN 
        SELECT * FROM notifications
        WHERE status = 'PENDING'
          AND (scheduled_at IS NULL OR scheduled_at <= CURRENT_TIMESTAMP)
          AND deleted_at IS NULL
        ORDER BY priority_level DESC, created_at ASC
        LIMIT 100
    LOOP
        BEGIN
            -- 通知配信処理のシミュレーション
            UPDATE notifications 
            SET status = 'SENDING',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = notification_rec.id;
            
            -- 実際の配信処理をここで実行
            -- delivery_service.send(notification_rec);
            
            UPDATE notifications 
            SET status = 'SENT',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = notification_rec.id;
            
            RETURN QUERY SELECT 
                notification_rec.id,
                'SENT'::VARCHAR,
                CURRENT_TIMESTAMP,
                NULL::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            UPDATE notifications 
            SET status = 'FAILED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = notification_rec.id;
            
            RETURN QUERY SELECT 
                notification_rec.id,
                'FAILED'::VARCHAR,
                CURRENT_TIMESTAMP,
                SQLERRM::TEXT;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 3. 通知配信レポート

```sql
-- 通知配信レポート関数
CREATE OR REPLACE FUNCTION notification_delivery_report(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    summary_date DATE,
    total_notifications INTEGER,
    sent_notifications INTEGER,
    failed_notifications INTEGER,
    success_rate DECIMAL,
    avg_delivery_time_minutes DECIMAL,
    top_failure_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(n.created_at) as summary_date,
        COUNT(*)::INTEGER as total_notifications,
        COUNT(*) FILTER (WHERE n.status = 'SENT')::INTEGER as sent_notifications,
        COUNT(*) FILTER (WHERE n.status = 'FAILED')::INTEGER as failed_notifications,
        ROUND(
            (COUNT(*) FILTER (WHERE n.status = 'SENT')::DECIMAL / COUNT(*)) * 100, 2
        ) as success_rate,
        ROUND(
            AVG(EXTRACT(EPOCH FROM (n.updated_at - n.created_at))/60), 2
        ) as avg_delivery_time_minutes,
        (
            SELECT error_message 
            FROM notification_deliveries nd
            WHERE nd.notification_id = n.id 
              AND nd.delivery_status = 'FAILED'
            GROUP BY error_message 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as top_failure_reason
    FROM notifications n
    WHERE n.deleted_at IS NULL
      AND DATE(n.created_at) BETWEEN start_date AND end_date
    GROUP BY DATE(n.created_at)
    ORDER BY summary_date DESC;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Notification集約詳細設計  
**次回レビュー**: 2025年7月1日