# Notification Context API 詳細設計書

## 1. 概要

### 1.1 目的
Notification Context APIは、SESマネジメントシステムにおける通知機能を担当するマイクロサービスのAPI仕様を定義します。

### 1.2 スコープ
- 多チャンネル通知システム（Email, Slack, Push, SMS）
- 通知テンプレート管理とバージョニング
- 通知ルールエンジンとトリガー
- 配信追跡と分析
- 通知スケジューリングとキューイング
- バッチ通知処理
- ユーザー設定管理
- 通知履歴と監査
- リアルタイム配信ステータス更新
- 通知再試行メカニズム
- 外部システム連携（Slack、Email サービス）

### 1.3 対象読者
- バックエンド開発者
- フロントエンド開発者
- QAエンジニア
- DevOpsエンジニア

## 2. アーキテクチャ概要

### 2.1 マイクロサービス構成
```
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Context                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Notification   │  │    Template     │  │      Rule       │ │
│  │   Management    │  │   Management    │  │    Engine       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    Delivery     │  │   Scheduling    │  │   Analytics     │ │
│  │    Service      │  │    Service      │  │    Service      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Integration   │  │   Preference    │  │     Audit       │ │
│  │    Service      │  │    Service      │  │    Service      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 技術スタック
- **Framework**: Spring Boot 3.x
- **Database**: PostgreSQL (メイン), Redis (キャッシュ・キュー)
- **Message Queue**: Redis Streams / Apache Kafka
- **External Services**: SendGrid, Slack API, FCM, Twilio
- **Monitoring**: Micrometer, OpenTelemetry

## 3. ドメインモデル

### 3.1 主要エンティティ

#### 3.1.1 Notification
```json
{
  "id": "string (UUID)",
  "type": "EMAIL|SLACK|PUSH|SMS",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "status": "PENDING|PROCESSING|SENT|DELIVERED|FAILED|CANCELLED",
  "recipientId": "string",
  "recipientType": "USER|GROUP|ROLE",
  "templateId": "string",
  "templateVersion": "integer",
  "subject": "string",
  "content": "string",
  "variables": "object",
  "scheduledAt": "datetime",
  "sentAt": "datetime",
  "deliveredAt": "datetime",
  "metadata": "object",
  "retryCount": "integer",
  "maxRetries": "integer",
  "errorMessage": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 3.1.2 NotificationTemplate
```json
{
  "id": "string (UUID)",
  "name": "string",
  "category": "string",
  "type": "EMAIL|SLACK|PUSH|SMS",
  "version": "integer",
  "isActive": "boolean",
  "subject": "string",
  "bodyTemplate": "string",
  "variables": "array",
  "metadata": "object",
  "createdBy": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 3.1.3 NotificationRule
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "eventType": "string",
  "conditions": "object",
  "templateId": "string",
  "recipientRules": "object",
  "isActive": "boolean",
  "priority": "LOW|NORMAL|HIGH|URGENT",
  "delayMinutes": "integer",
  "batchEnabled": "boolean",
  "batchSize": "integer",
  "batchWindowMinutes": "integer",
  "createdBy": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

#### 3.1.4 UserPreference
```json
{
  "id": "string (UUID)",
  "userId": "string",
  "emailEnabled": "boolean",
  "slackEnabled": "boolean",
  "pushEnabled": "boolean",
  "smsEnabled": "boolean",
  "emailAddress": "string",
  "slackUserId": "string",
  "pushTokens": "array",
  "phoneNumber": "string",
  "timezone": "string",
  "quietHours": "object",
  "categoryPreferences": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## 4. OpenAPI 3.0 仕様

### 4.1 基本情報

```yaml
openapi: 3.0.3
info:
  title: Notification Context API
  description: SESマネジメントシステム 通知コンテキスト API
  version: 1.0.0
  contact:
    name: Development Team
    email: dev@company.com
servers:
  - url: https://api.ses-manager.com/notification/v1
    description: Production Server
  - url: https://staging-api.ses-manager.com/notification/v1
    description: Staging Server
  - url: http://localhost:8108/notification/v1
    description: Development Server

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 4.2 通知管理エンドポイント

#### 4.2.1 通知送信

```yaml
paths:
  /notifications:
    post:
      tags:
        - Notifications
      summary: 通知送信
      description: 新しい通知を送信します
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendNotificationRequest'
            examples:
              email_notification:
                summary: Email通知例
                value:
                  type: "EMAIL"
                  priority: "NORMAL"
                  recipientId: "user-123"
                  recipientType: "USER"
                  templateId: "welcome-email"
                  variables:
                    userName: "田中太郎"
                    projectName: "新プロジェクト"
                  scheduledAt: "2024-01-01T10:00:00Z"
              slack_notification:
                summary: Slack通知例
                value:
                  type: "SLACK"
                  priority: "HIGH"
                  recipientId: "engineering-team"
                  recipientType: "GROUP"
                  templateId: "deployment-alert"
                  variables:
                    serviceName: "notification-service"
                    environment: "production"
      responses:
        '201':
          description: 通知送信成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

    get:
      tags:
        - Notifications
      summary: 通知一覧取得
      description: 通知の一覧を取得します
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, PROCESSING, SENT, DELIVERED, FAILED, CANCELLED]
        - name: type
          in: query
          schema:
            type: string
            enum: [EMAIL, SLACK, PUSH, SMS]
        - name: recipientId
          in: query
          schema:
            type: string
        - name: priority
          in: query
          schema:
            type: string
            enum: [LOW, NORMAL, HIGH, URGENT]
        - name: fromDate
          in: query
          schema:
            type: string
            format: date-time
        - name: toDate
          in: query
          schema:
            type: string
            format: date-time
        - name: page
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: size
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: sort
          in: query
          schema:
            type: string
            default: "createdAt,desc"
      responses:
        '200':
          description: 通知一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationListResponse'

  /notifications/{id}:
    get:
      tags:
        - Notifications
      summary: 通知詳細取得
      description: 指定した通知の詳細情報を取得します
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 通知詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'
        '404':
          $ref: '#/components/responses/NotFound'

    patch:
      tags:
        - Notifications
      summary: 通知更新
      description: 通知の状態やメタデータを更新します
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateNotificationRequest'
      responses:
        '200':
          description: 通知更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'

    delete:
      tags:
        - Notifications
      summary: 通知キャンセル
      description: 未送信の通知をキャンセルします
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 通知キャンセル成功
        '409':
          description: キャンセル不可（既に送信済み）

  /notifications/{id}/retry:
    post:
      tags:
        - Notifications
      summary: 通知再送信
      description: 失敗した通知を再送信します
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 再送信成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/NotificationResponse'
        '409':
          description: 再送信不可
```

### 4.3 テンプレート管理エンドポイント

```yaml
  /templates:
    post:
      tags:
        - Templates
      summary: テンプレート作成
      description: 新しい通知テンプレートを作成します
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTemplateRequest'
            examples:
              email_template:
                summary: Emailテンプレート例
                value:
                  name: "プロジェクト参加通知"
                  category: "project"
                  type: "EMAIL"
                  subject: "新しいプロジェクトに参加しました - {{projectName}}"
                  bodyTemplate: |
                    {{userName}} 様

                    お疲れ様です。
                    新しいプロジェクト「{{projectName}}」に参加しました。

                    プロジェクト詳細：
                    - 開始日：{{startDate}}
                    - 終了予定日：{{endDate}}
                    - 担当ロール：{{role}}

                    よろしくお願いします。
                  variables:
                    - name: "userName"
                      type: "string"
                      required: true
                    - name: "projectName"
                      type: "string"
                      required: true
                    - name: "startDate"
                      type: "date"
                      required: true
                    - name: "endDate"
                      type: "date"
                      required: false
                    - name: "role"
                      type: "string"
                      required: true
      responses:
        '201':
          description: テンプレート作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateResponse'

    get:
      tags:
        - Templates
      summary: テンプレート一覧取得
      description: テンプレートの一覧を取得します
      parameters:
        - name: category
          in: query
          schema:
            type: string
        - name: type
          in: query
          schema:
            type: string
            enum: [EMAIL, SLACK, PUSH, SMS]
        - name: isActive
          in: query
          schema:
            type: boolean
        - name: page
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: size
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: テンプレート一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateListResponse'

  /templates/{id}:
    get:
      tags:
        - Templates
      summary: テンプレート詳細取得
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: version
          in: query
          schema:
            type: integer
          description: 特定バージョンを取得（未指定時は最新版）
      responses:
        '200':
          description: テンプレート詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateResponse'

    put:
      tags:
        - Templates
      summary: テンプレート更新
      description: テンプレートを更新し、新しいバージョンを作成します
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTemplateRequest'
      responses:
        '200':
          description: テンプレート更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplateResponse'

    delete:
      tags:
        - Templates
      summary: テンプレート無効化
      description: テンプレートを無効化します（物理削除はしません）
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: テンプレート無効化成功

  /templates/{id}/preview:
    post:
      tags:
        - Templates
      summary: テンプレートプレビュー
      description: 変数を適用したテンプレートのプレビューを生成します
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TemplatePreviewRequest'
      responses:
        '200':
          description: プレビュー生成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TemplatePreviewResponse'
```

### 4.4 ルール管理エンドポイント

```yaml
  /rules:
    post:
      tags:
        - Rules
      summary: 通知ルール作成
      description: 新しい通知ルールを作成します
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateRuleRequest'
            examples:
              project_assignment_rule:
                summary: プロジェクトアサイン通知ルール
                value:
                  name: "プロジェクトアサイン通知"
                  description: "エンジニアがプロジェクトにアサインされた時の通知"
                  eventType: "PROJECT_ASSIGNMENT_CREATED"
                  conditions:
                    projectType: ["DEVELOPMENT", "MAINTENANCE"]
                    priority: ["HIGH", "URGENT"]
                  templateId: "project-assignment-notification"
                  recipientRules:
                    - type: "ASSIGNED_ENGINEER"
                    - type: "PROJECT_MANAGER"
                    - type: "ROLE"
                      value: "ADMIN"
                  priority: "NORMAL"
                  delayMinutes: 0
                  batchEnabled: false
                  isActive: true
      responses:
        '201':
          description: ルール作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RuleResponse'

    get:
      tags:
        - Rules
      summary: 通知ルール一覧取得
      parameters:
        - name: eventType
          in: query
          schema:
            type: string
        - name: isActive
          in: query
          schema:
            type: boolean
        - name: page
          in: query
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: size
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        '200':
          description: ルール一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RuleListResponse'

  /rules/{id}:
    get:
      tags:
        - Rules
      summary: 通知ルール詳細取得
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: ルール詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RuleResponse'

    put:
      tags:
        - Rules
      summary: 通知ルール更新
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateRuleRequest'
      responses:
        '200':
          description: ルール更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RuleResponse'

    delete:
      tags:
        - Rules
      summary: 通知ルール削除
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: ルール削除成功

  /rules/{id}/test:
    post:
      tags:
        - Rules
      summary: 通知ルールテスト
      description: 指定したイベントデータでルールをテストします
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RuleTestRequest'
      responses:
        '200':
          description: ルールテスト成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RuleTestResponse'
```

### 4.5 ユーザー設定管理エンドポイント

```yaml
  /users/{userId}/preferences:
    get:
      tags:
        - User Preferences
      summary: ユーザー通知設定取得
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 設定取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserPreferenceResponse'

    put:
      tags:
        - User Preferences
      summary: ユーザー通知設定更新
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserPreferenceRequest'
            examples:
              user_preferences:
                summary: ユーザー設定例
                value:
                  emailEnabled: true
                  slackEnabled: true
                  pushEnabled: false
                  smsEnabled: false
                  emailAddress: "tanaka@example.com"
                  slackUserId: "U1234567890"
                  pushTokens: []
                  phoneNumber: "+81-90-1234-5678"
                  timezone: "Asia/Tokyo"
                  quietHours:
                    enabled: true
                    startTime: "22:00"
                    endTime: "08:00"
                  categoryPreferences:
                    project: 
                      email: true
                      slack: true
                      push: false
                    timesheet:
                      email: false
                      slack: true
                      push: false
                    system:
                      email: true
                      slack: false
                      push: false
      responses:
        '200':
          description: 設定更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserPreferenceResponse'

  /users/{userId}/preferences/tokens:
    post:
      tags:
        - User Preferences
      summary: プッシュトークン追加
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddPushTokenRequest'
      responses:
        '201':
          description: トークン追加成功

    delete:
      tags:
        - User Preferences
      summary: プッシュトークン削除
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
        - name: token
          in: query
          required: true
          schema:
            type: string
      responses:
        '204':
          description: トークン削除成功
```

### 4.6 分析・統計エンドポイント

```yaml
  /analytics/delivery-stats:
    get:
      tags:
        - Analytics
      summary: 配信統計取得
      description: 通知の配信統計情報を取得します
      parameters:
        - name: fromDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: toDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: type
          in: query
          schema:
            type: string
            enum: [EMAIL, SLACK, PUSH, SMS]
        - name: groupBy
          in: query
          schema:
            type: string
            enum: [HOUR, DAY, WEEK, MONTH]
            default: DAY
      responses:
        '200':
          description: 統計取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeliveryStatsResponse'

  /analytics/performance:
    get:
      tags:
        - Analytics
      summary: パフォーマンス統計取得
      description: 通知システムのパフォーマンス統計を取得します
      parameters:
        - name: fromDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: toDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
      responses:
        '200':
          description: パフォーマンス統計取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PerformanceStatsResponse'

  /analytics/user-engagement:
    get:
      tags:
        - Analytics
      summary: ユーザーエンゲージメント統計
      description: ユーザーの通知エンゲージメント統計を取得します
      parameters:
        - name: fromDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: toDate
          in: query
          required: true
          schema:
            type: string
            format: date-time
        - name: userId
          in: query
          schema:
            type: string
          description: 特定ユーザーの統計（管理者のみ）
      responses:
        '200':
          description: エンゲージメント統計取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserEngagementStatsResponse'
```

### 4.7 バッチ処理・キュー管理エンドポイント

```yaml
  /batch/notifications:
    post:
      tags:
        - Batch Processing
      summary: バッチ通知送信
      description: 複数の通知をバッチで送信します
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchNotificationRequest'
            examples:
              batch_email:
                summary: バッチEmail送信例
                value:
                  notifications:
                    - type: "EMAIL"
                      recipientId: "user-123"
                      recipientType: "USER"
                      templateId: "monthly-report"
                      variables:
                        userName: "田中太郎"
                        month: "2024年1月"
                    - type: "EMAIL"
                      recipientId: "user-456"
                      recipientType: "USER"
                      templateId: "monthly-report"
                      variables:
                        userName: "佐藤花子"
                        month: "2024年1月"
                  batchOptions:
                    concurrency: 10
                    delayBetweenBatches: 1000
                    failureThreshold: 0.1
      responses:
        '202':
          description: バッチ処理開始
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchJobResponse'

  /batch/jobs/{jobId}:
    get:
      tags:
        - Batch Processing
      summary: バッチジョブ状態取得
      parameters:
        - name: jobId
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: ジョブ状態取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchJobStatusResponse'

  /queue/status:
    get:
      tags:
        - Queue Management
      summary: キュー状態取得
      description: 通知キューの状態を取得します
      responses:
        '200':
          description: キュー状態取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueueStatusResponse'

  /queue/pause:
    post:
      tags:
        - Queue Management
      summary: キュー一時停止
      description: 通知キューを一時停止します（管理者のみ）
      security:
        - BearerAuth: []
      responses:
        '200':
          description: キュー一時停止成功

  /queue/resume:
    post:
      tags:
        - Queue Management
      summary: キュー再開
      description: 一時停止したキューを再開します（管理者のみ）
      security:
        - BearerAuth: []
      responses:
        '200':
          description: キュー再開成功
```

### 4.8 リアルタイム配信状況エンドポイント

```yaml
  /realtime/delivery-status:
    get:
      tags:
        - Real-time
      summary: リアルタイム配信状況
      description: WebSocketで配信状況をリアルタイム取得
      responses:
        '101':
          description: WebSocket接続確立
        '400':
          description: WebSocket接続失敗

  /webhooks/delivery-status:
    post:
      tags:
        - Webhooks
      summary: 配信状況Webhook
      description: 外部サービスからの配信状況通知を受信
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DeliveryWebhookRequest'
      responses:
        '200':
          description: Webhook受信成功
        '400':
          description: 不正なWebhookデータ

  /webhooks/bounce:
    post:
      tags:
        - Webhooks
      summary: バウンス通知Webhook
      description: メール配信のバウンス通知を受信
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BounceWebhookRequest'
      responses:
        '200':
          description: バウンス通知受信成功

  /webhooks/slack/events:
    post:
      tags:
        - Webhooks
      summary: Slackイベント受信
      description: Slackからのイベント通知を受信
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SlackEventRequest'
      responses:
        '200':
          description: Slackイベント受信成功
```

## 5. データスキーマ定義

### 5.1 リクエスト/レスポンススキーマ

```yaml
components:
  schemas:
    # 通知関連スキーマ
    SendNotificationRequest:
      type: object
      required:
        - type
        - recipientId
        - recipientType
        - templateId
      properties:
        type:
          type: string
          enum: [EMAIL, SLACK, PUSH, SMS]
        priority:
          type: string
          enum: [LOW, NORMAL, HIGH, URGENT]
          default: NORMAL
        recipientId:
          type: string
        recipientType:
          type: string
          enum: [USER, GROUP, ROLE]
        templateId:
          type: string
          format: uuid
        variables:
          type: object
          additionalProperties: true
        scheduledAt:
          type: string
          format: date-time
        metadata:
          type: object
          additionalProperties: true

    NotificationResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        type:
          type: string
          enum: [EMAIL, SLACK, PUSH, SMS]
        priority:
          type: string
          enum: [LOW, NORMAL, HIGH, URGENT]
        status:
          type: string
          enum: [PENDING, PROCESSING, SENT, DELIVERED, FAILED, CANCELLED]
        recipientId:
          type: string
        recipientType:
          type: string
          enum: [USER, GROUP, ROLE]
        templateId:
          type: string
          format: uuid
        templateVersion:
          type: integer
        subject:
          type: string
        content:
          type: string
        variables:
          type: object
          additionalProperties: true
        scheduledAt:
          type: string
          format: date-time
        sentAt:
          type: string
          format: date-time
        deliveredAt:
          type: string
          format: date-time
        metadata:
          type: object
          additionalProperties: true
        retryCount:
          type: integer
        maxRetries:
          type: integer
        errorMessage:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    NotificationListResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/NotificationResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer
        last:
          type: boolean
        first:
          type: boolean
        numberOfElements:
          type: integer

    UpdateNotificationRequest:
      type: object
      properties:
        status:
          type: string
          enum: [PENDING, PROCESSING, SENT, DELIVERED, FAILED, CANCELLED]
        metadata:
          type: object
          additionalProperties: true
        errorMessage:
          type: string

    # テンプレート関連スキーマ
    CreateTemplateRequest:
      type: object
      required:
        - name
        - type
        - bodyTemplate
      properties:
        name:
          type: string
          maxLength: 100
        category:
          type: string
          maxLength: 50
        type:
          type: string
          enum: [EMAIL, SLACK, PUSH, SMS]
        subject:
          type: string
          maxLength: 200
        bodyTemplate:
          type: string
          maxLength: 10000
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'
        metadata:
          type: object
          additionalProperties: true

    TemplateVariable:
      type: object
      required:
        - name
        - type
        - required
      properties:
        name:
          type: string
        type:
          type: string
          enum: [string, number, boolean, date, array, object]
        required:
          type: boolean
        defaultValue:
          type: string
        description:
          type: string

    TemplateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        category:
          type: string
        type:
          type: string
          enum: [EMAIL, SLACK, PUSH, SMS]
        version:
          type: integer
        isActive:
          type: boolean
        subject:
          type: string
        bodyTemplate:
          type: string
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'
        metadata:
          type: object
          additionalProperties: true
        createdBy:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    TemplateListResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/TemplateResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer
        last:
          type: boolean
        first:
          type: boolean
        numberOfElements:
          type: integer

    UpdateTemplateRequest:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        category:
          type: string
          maxLength: 50
        subject:
          type: string
          maxLength: 200
        bodyTemplate:
          type: string
          maxLength: 10000
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'
        metadata:
          type: object
          additionalProperties: true

    TemplatePreviewRequest:
      type: object
      required:
        - variables
      properties:
        variables:
          type: object
          additionalProperties: true

    TemplatePreviewResponse:
      type: object
      properties:
        subject:
          type: string
        content:
          type: string
        warnings:
          type: array
          items:
            type: string

    # ルール関連スキーマ
    CreateRuleRequest:
      type: object
      required:
        - name
        - eventType
        - templateId
        - recipientRules
      properties:
        name:
          type: string
          maxLength: 100
        description:
          type: string
          maxLength: 500
        eventType:
          type: string
        conditions:
          type: object
          additionalProperties: true
        templateId:
          type: string
          format: uuid
        recipientRules:
          type: array
          items:
            $ref: '#/components/schemas/RecipientRule'
        isActive:
          type: boolean
          default: true
        priority:
          type: string
          enum: [LOW, NORMAL, HIGH, URGENT]
          default: NORMAL
        delayMinutes:
          type: integer
          minimum: 0
          default: 0
        batchEnabled:
          type: boolean
          default: false
        batchSize:
          type: integer
          minimum: 1
          maximum: 1000
        batchWindowMinutes:
          type: integer
          minimum: 1
          maximum: 1440

    RecipientRule:
      type: object
      required:
        - type
      properties:
        type:
          type: string
          enum: [USER, GROUP, ROLE, ASSIGNED_ENGINEER, PROJECT_MANAGER, CUSTOM]
        value:
          type: string
        conditions:
          type: object
          additionalProperties: true

    RuleResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        eventType:
          type: string
        conditions:
          type: object
          additionalProperties: true
        templateId:
          type: string
          format: uuid
        recipientRules:
          type: array
          items:
            $ref: '#/components/schemas/RecipientRule'
        isActive:
          type: boolean
        priority:
          type: string
          enum: [LOW, NORMAL, HIGH, URGENT]
        delayMinutes:
          type: integer
        batchEnabled:
          type: boolean
        batchSize:
          type: integer
        batchWindowMinutes:
          type: integer
        createdBy:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    RuleListResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/RuleResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer
        last:
          type: boolean
        first:
          type: boolean
        numberOfElements:
          type: integer

    UpdateRuleRequest:
      type: object
      properties:
        name:
          type: string
          maxLength: 100
        description:
          type: string
          maxLength: 500
        conditions:
          type: object
          additionalProperties: true
        templateId:
          type: string
          format: uuid
        recipientRules:
          type: array
          items:
            $ref: '#/components/schemas/RecipientRule'
        isActive:
          type: boolean
        priority:
          type: string
          enum: [LOW, NORMAL, HIGH, URGENT]
        delayMinutes:
          type: integer
          minimum: 0
        batchEnabled:
          type: boolean
        batchSize:
          type: integer
          minimum: 1
          maximum: 1000
        batchWindowMinutes:
          type: integer
          minimum: 1
          maximum: 1440

    RuleTestRequest:
      type: object
      required:
        - eventData
      properties:
        eventData:
          type: object
          additionalProperties: true

    RuleTestResponse:
      type: object
      properties:
        matched:
          type: boolean
        recipients:
          type: array
          items:
            $ref: '#/components/schemas/RecipientInfo'
        evaluationDetails:
          type: object
          additionalProperties: true

    RecipientInfo:
      type: object
      properties:
        recipientId:
          type: string
        recipientType:
          type: string
        contactInfo:
          type: object
          additionalProperties: true

    # ユーザー設定関連スキーマ
    UserPreferenceResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
        emailEnabled:
          type: boolean
        slackEnabled:
          type: boolean
        pushEnabled:
          type: boolean
        smsEnabled:
          type: boolean
        emailAddress:
          type: string
          format: email
        slackUserId:
          type: string
        pushTokens:
          type: array
          items:
            type: string
        phoneNumber:
          type: string
        timezone:
          type: string
        quietHours:
          $ref: '#/components/schemas/QuietHours'
        categoryPreferences:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/CategoryPreference'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    QuietHours:
      type: object
      properties:
        enabled:
          type: boolean
        startTime:
          type: string
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
        endTime:
          type: string
          pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'

    CategoryPreference:
      type: object
      properties:
        email:
          type: boolean
        slack:
          type: boolean
        push:
          type: boolean
        sms:
          type: boolean

    UpdateUserPreferenceRequest:
      type: object
      properties:
        emailEnabled:
          type: boolean
        slackEnabled:
          type: boolean
        pushEnabled:
          type: boolean
        smsEnabled:
          type: boolean
        emailAddress:
          type: string
          format: email
        slackUserId:
          type: string
        pushTokens:
          type: array
          items:
            type: string
        phoneNumber:
          type: string
        timezone:
          type: string
        quietHours:
          $ref: '#/components/schemas/QuietHours'
        categoryPreferences:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/CategoryPreference'

    AddPushTokenRequest:
      type: object
      required:
        - token
        - platform
      properties:
        token:
          type: string
        platform:
          type: string
          enum: [IOS, ANDROID, WEB]
        deviceId:
          type: string

    # 統計・分析関連スキーマ
    DeliveryStatsResponse:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/DatePeriod'
        stats:
          type: array
          items:
            $ref: '#/components/schemas/DeliveryStatsPeriod'
        summary:
          $ref: '#/components/schemas/DeliveryStatsSummary'

    DatePeriod:
      type: object
      properties:
        fromDate:
          type: string
          format: date-time
        toDate:
          type: string
          format: date-time

    DeliveryStatsPeriod:
      type: object
      properties:
        period:
          type: string
          format: date-time
        totalSent:
          type: integer
        totalDelivered:
          type: integer
        totalFailed:
          type: integer
        deliveryRate:
          type: number
          format: double
        averageDeliveryTime:
          type: number
          format: double
        byType:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/TypeStats'

    TypeStats:
      type: object
      properties:
        sent:
          type: integer
        delivered:
          type: integer
        failed:
          type: integer
        deliveryRate:
          type: number
          format: double
        averageDeliveryTime:
          type: number
          format: double

    DeliveryStatsSummary:
      type: object
      properties:
        totalSent:
          type: integer
        totalDelivered:
          type: integer
        totalFailed:
          type: integer
        overallDeliveryRate:
          type: number
          format: double
        averageDeliveryTime:
          type: number
          format: double

    PerformanceStatsResponse:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/DatePeriod'
        throughput:
          $ref: '#/components/schemas/ThroughputStats'
        latency:
          $ref: '#/components/schemas/LatencyStats'
        errorRate:
          $ref: '#/components/schemas/ErrorRateStats'
        queueMetrics:
          $ref: '#/components/schemas/QueueMetrics'

    ThroughputStats:
      type: object
      properties:
        averagePerSecond:
          type: number
          format: double
        peakPerSecond:
          type: number
          format: double
        totalProcessed:
          type: integer

    LatencyStats:
      type: object
      properties:
        averageMs:
          type: number
          format: double
        p50Ms:
          type: number
          format: double
        p95Ms:
          type: number
          format: double
        p99Ms:
          type: number
          format: double

    ErrorRateStats:
      type: object
      properties:
        rate:
          type: number
          format: double
        totalErrors:
          type: integer
        byCategory:
          type: object
          additionalProperties:
            type: integer

    QueueMetrics:
      type: object
      properties:
        currentSize:
          type: integer
        averageSize:
          type: number
          format: double
        peakSize:
          type: integer
        averageWaitTimeMs:
          type: number
          format: double

    UserEngagementStatsResponse:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/DatePeriod'
        totalUsers:
          type: integer
        activeUsers:
          type: integer
        engagementRate:
          type: number
          format: double
        byChannel:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/ChannelEngagement'
        topCategories:
          type: array
          items:
            $ref: '#/components/schemas/CategoryEngagement'

    ChannelEngagement:
      type: object
      properties:
        users:
          type: integer
        notifications:
          type: integer
        engagementRate:
          type: number
          format: double

    CategoryEngagement:
      type: object
      properties:
        category:
          type: string
        notifications:
          type: integer
        engagementRate:
          type: number
          format: double

    # バッチ処理関連スキーマ
    BatchNotificationRequest:
      type: object
      required:
        - notifications
      properties:
        notifications:
          type: array
          items:
            $ref: '#/components/schemas/SendNotificationRequest'
        batchOptions:
          $ref: '#/components/schemas/BatchOptions'

    BatchOptions:
      type: object
      properties:
        concurrency:
          type: integer
          minimum: 1
          maximum: 100
          default: 10
        delayBetweenBatches:
          type: integer
          minimum: 0
          default: 1000
        failureThreshold:
          type: number
          format: double
          minimum: 0
          maximum: 1
          default: 0.1

    BatchJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [CREATED, RUNNING, COMPLETED, FAILED, CANCELLED]
        totalNotifications:
          type: integer
        processedNotifications:
          type: integer
        failedNotifications:
          type: integer
        estimatedCompletion:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time

    BatchJobStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [CREATED, RUNNING, COMPLETED, FAILED, CANCELLED]
        progress:
          type: number
          format: double
          minimum: 0
          maximum: 1
        totalNotifications:
          type: integer
        processedNotifications:
          type: integer
        successfulNotifications:
          type: integer
        failedNotifications:
          type: integer
        errors:
          type: array
          items:
            $ref: '#/components/schemas/BatchError'
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time

    BatchError:
      type: object
      properties:
        notificationIndex:
          type: integer
        errorCode:
          type: string
        errorMessage:
          type: string

    QueueStatusResponse:
      type: object
      properties:
        queues:
          type: array
          items:
            $ref: '#/components/schemas/QueueInfo'
        totalPending:
          type: integer
        totalProcessing:
          type: integer
        isHealthy:
          type: boolean

    QueueInfo:
      type: object
      properties:
        name:
          type: string
        type:
          type: string
        size:
          type: integer
        processing:
          type: integer
        isPaused:
          type: boolean
        lastProcessedAt:
          type: string
          format: date-time

    # Webhook関連スキーマ
    DeliveryWebhookRequest:
      type: object
      required:
        - notificationId
        - status
        - timestamp
      properties:
        notificationId:
          type: string
          format: uuid
        status:
          type: string
          enum: [DELIVERED, FAILED, BOUNCED, CLICKED, OPENED]
        timestamp:
          type: string
          format: date-time
        details:
          type: object
          additionalProperties: true
        externalId:
          type: string

    BounceWebhookRequest:
      type: object
      required:
        - notificationId
        - bounceType
        - timestamp
      properties:
        notificationId:
          type: string
          format: uuid
        bounceType:
          type: string
          enum: [HARD, SOFT, COMPLAINT]
        reason:
          type: string
        timestamp:
          type: string
          format: date-time
        emailAddress:
          type: string
          format: email

    SlackEventRequest:
      type: object
      required:
        - type
        - event
      properties:
        type:
          type: string
        event:
          type: object
          additionalProperties: true
        challenge:
          type: string

    # 共通スキーマ
    Pageable:
      type: object
      properties:
        sort:
          $ref: '#/components/schemas/Sort'
        pageNumber:
          type: integer
        pageSize:
          type: integer
        offset:
          type: integer
          format: int64
        paged:
          type: boolean
        unpaged:
          type: boolean

    Sort:
      type: object
      properties:
        sorted:
          type: boolean
        unsorted:
          type: boolean
        empty:
          type: boolean

    # エラーレスポンス
    ErrorResponse:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        status:
          type: integer
        error:
          type: string
        message:
          type: string
        path:
          type: string
        details:
          type: array
          items:
            type: string

  responses:
    BadRequest:
      description: 不正なリクエスト
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    Unauthorized:
      description: 認証が必要
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    Forbidden:
      description: アクセス権限なし
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    NotFound:
      description: リソースが見つからない
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    Conflict:
      description: リソースの競合
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    
    InternalServerError:
      description: サーバー内部エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

## 6. Spring Boot実装例

### 6.1 コントローラー実装

```java
@RestController
@RequestMapping("/notification/v1")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notification Management", description = "通知管理API")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;

    @PostMapping("/notifications")
    @Operation(summary = "通知送信")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "通知送信成功"),
        @ApiResponse(responseCode = "400", description = "不正なリクエスト"),
        @ApiResponse(responseCode = "401", description = "認証が必要")
    })
    public ResponseEntity<NotificationResponse> sendNotification(
            @Valid @RequestBody SendNotificationRequest request) {
        
        log.info("通知送信要求: type={}, recipientId={}", 
                request.getType(), request.getRecipientId());
        
        NotificationCommand command = notificationMapper.toCommand(request);
        Notification notification = notificationService.sendNotification(command);
        NotificationResponse response = notificationMapper.toResponse(notification);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/notifications")
    @Operation(summary = "通知一覧取得")
    public ResponseEntity<NotificationListResponse> getNotifications(
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) NotificationType type,
            @RequestParam(required = false) String recipientId,
            @RequestParam(required = false) NotificationPriority priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        NotificationSearchCriteria criteria = NotificationSearchCriteria.builder()
                .status(status)
                .type(type)
                .recipientId(recipientId)
                .priority(priority)
                .fromDate(fromDate)
                .toDate(toDate)
                .build();
        
        Page<Notification> notifications = notificationService.searchNotifications(criteria, pageable);
        NotificationListResponse response = notificationMapper.toListResponse(notifications);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/notifications/{id}")
    @Operation(summary = "通知詳細取得")
    public ResponseEntity<NotificationResponse> getNotification(
            @PathVariable @Valid @NotNull UUID id) {
        
        Notification notification = notificationService.getNotification(id);
        NotificationResponse response = notificationMapper.toResponse(notification);
        
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/notifications/{id}")
    @Operation(summary = "通知更新")
    public ResponseEntity<NotificationResponse> updateNotification(
            @PathVariable @Valid @NotNull UUID id,
            @Valid @RequestBody UpdateNotificationRequest request) {
        
        UpdateNotificationCommand command = notificationMapper.toUpdateCommand(request);
        Notification notification = notificationService.updateNotification(id, command);
        NotificationResponse response = notificationMapper.toResponse(notification);
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/notifications/{id}")
    @Operation(summary = "通知キャンセル")
    public ResponseEntity<Void> cancelNotification(
            @PathVariable @Valid @NotNull UUID id) {
        
        notificationService.cancelNotification(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/notifications/{id}/retry")
    @Operation(summary = "通知再送信")
    public ResponseEntity<NotificationResponse> retryNotification(
            @PathVariable @Valid @NotNull UUID id) {
        
        Notification notification = notificationService.retryNotification(id);
        NotificationResponse response = notificationMapper.toResponse(notification);
        
        return ResponseEntity.ok(response);
    }
}
```

### 6.2 サービス実装

```java
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final NotificationRuleRepository ruleRepository;
    private final UserPreferenceRepository preferenceRepository;
    private final NotificationDeliveryService deliveryService;
    private final NotificationRuleEngine ruleEngine;
    private final NotificationQueue notificationQueue;
    private final ApplicationEventPublisher eventPublisher;

    public Notification sendNotification(NotificationCommand command) {
        log.info("通知送信処理開始: {}", command);

        // テンプレート取得とバリデーション
        NotificationTemplate template = templateRepository.findById(command.getTemplateId())
                .orElseThrow(() -> new TemplateNotFoundException(command.getTemplateId()));

        // 受信者設定確認
        UserPreference preference = getUserPreference(command.getRecipientId());
        if (!isNotificationEnabled(preference, template.getType(), template.getCategory())) {
            throw new NotificationDisabledException(command.getRecipientId(), template.getType());
        }

        // 通知作成
        Notification notification = createNotification(command, template);
        
        // サイレント時間チェック
        if (isQuietHours(preference)) {
            notification.scheduleFor(getNextAvailableTime(preference));
        }

        // 保存
        notification = notificationRepository.save(notification);

        // 配信キューに追加
        if (notification.getScheduledAt() == null || 
            notification.getScheduledAt().isBefore(LocalDateTime.now())) {
            queueForDelivery(notification);
        } else {
            scheduleNotification(notification);
        }

        // イベント発行
        eventPublisher.publishEvent(new NotificationCreatedEvent(notification));

        log.info("通知送信処理完了: id={}", notification.getId());
        return notification;
    }

    @Transactional(readOnly = true)
    public Page<Notification> searchNotifications(
            NotificationSearchCriteria criteria, Pageable pageable) {
        
        return notificationRepository.findByCriteria(criteria, pageable);
    }

    @Transactional(readOnly = true)
    public Notification getNotification(UUID id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException(id));
    }

    public Notification updateNotification(UUID id, UpdateNotificationCommand command) {
        Notification notification = getNotification(id);
        
        if (command.getStatus() != null) {
            notification.updateStatus(command.getStatus());
        }
        
        if (command.getMetadata() != null) {
            notification.updateMetadata(command.getMetadata());
        }
        
        if (command.getErrorMessage() != null) {
            notification.setErrorMessage(command.getErrorMessage());
        }

        notification = notificationRepository.save(notification);
        
        // ステータス変更イベント発行
        eventPublisher.publishEvent(new NotificationStatusChangedEvent(notification));
        
        return notification;
    }

    public void cancelNotification(UUID id) {
        Notification notification = getNotification(id);
        
        if (!notification.isCancellable()) {
            throw new NotificationNotCancellableException(id, notification.getStatus());
        }
        
        notification.cancel();
        notificationRepository.save(notification);
        
        // キューから削除
        notificationQueue.remove(notification);
        
        eventPublisher.publishEvent(new NotificationCancelledEvent(notification));
    }

    public Notification retryNotification(UUID id) {
        Notification notification = getNotification(id);
        
        if (!notification.isRetryable()) {
            throw new NotificationNotRetryableException(id, notification.getStatus());
        }
        
        notification.retry();
        notification = notificationRepository.save(notification);
        
        // 再配信キューに追加
        queueForDelivery(notification);
        
        return notification;
    }

    // プライベートメソッド
    private Notification createNotification(
            NotificationCommand command, NotificationTemplate template) {
        
        String content = templateEngine.process(template.getBodyTemplate(), command.getVariables());
        String subject = template.getSubject() != null ? 
                templateEngine.process(template.getSubject(), command.getVariables()) : null;

        return Notification.builder()
                .type(command.getType())
                .priority(command.getPriority())
                .recipientId(command.getRecipientId())
                .recipientType(command.getRecipientType())
                .templateId(template.getId())
                .templateVersion(template.getVersion())
                .subject(subject)
                .content(content)
                .variables(command.getVariables())
                .scheduledAt(command.getScheduledAt())
                .metadata(command.getMetadata())
                .maxRetries(getMaxRetries(command.getPriority()))
                .build();
    }

    private UserPreference getUserPreference(String userId) {
        return preferenceRepository.findByUserId(userId)
                .orElse(UserPreference.defaultPreference(userId));
    }

    private boolean isNotificationEnabled(
            UserPreference preference, NotificationType type, String category) {
        
        // 全体設定チェック
        boolean globalEnabled = switch (type) {
            case EMAIL -> preference.isEmailEnabled();
            case SLACK -> preference.isSlackEnabled();
            case PUSH -> preference.isPushEnabled();
            case SMS -> preference.isSmsEnabled();
        };

        if (!globalEnabled) {
            return false;
        }

        // カテゴリ別設定チェック
        CategoryPreference categoryPref = preference.getCategoryPreferences().get(category);
        if (categoryPref != null) {
            return switch (type) {
                case EMAIL -> categoryPref.isEmail();
                case SLACK -> categoryPref.isSlack();
                case PUSH -> categoryPref.isPush();
                case SMS -> categoryPref.isSms();
            };
        }

        return true;
    }

    private boolean isQuietHours(UserPreference preference) {
        QuietHours quietHours = preference.getQuietHours();
        if (quietHours == null || !quietHours.isEnabled()) {
            return false;
        }

        LocalTime now = LocalTime.now(ZoneId.of(preference.getTimezone()));
        return quietHours.isQuietTime(now);
    }

    private LocalDateTime getNextAvailableTime(UserPreference preference) {
        QuietHours quietHours = preference.getQuietHours();
        ZoneId timezone = ZoneId.of(preference.getTimezone());
        LocalDateTime now = LocalDateTime.now(timezone);
        
        return quietHours.getNextAvailableTime(now);
    }

    private void queueForDelivery(Notification notification) {
        NotificationDeliveryTask task = NotificationDeliveryTask.builder()
                .notificationId(notification.getId())
                .priority(notification.getPriority())
                .scheduledAt(notification.getScheduledAt())
                .build();
        
        notificationQueue.enqueue(task);
    }

    private void scheduleNotification(Notification notification) {
        // スケジューラーに登録（例：Spring Task Scheduler）
        taskScheduler.schedule(
                () -> queueForDelivery(notification),
                Date.from(notification.getScheduledAt().atZone(ZoneId.systemDefault()).toInstant())
        );
    }

    private int getMaxRetries(NotificationPriority priority) {
        return switch (priority) {
            case URGENT -> 5;
            case HIGH -> 3;
            case NORMAL -> 2;
            case LOW -> 1;
        };
    }
}
```

### 6.3 配信サービス実装

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationDeliveryService {

    private final Map<NotificationType, NotificationChannel> channels;
    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Async("notificationExecutor")
    public CompletableFuture<DeliveryResult> deliverNotification(UUID notificationId) {
        try {
            Notification notification = notificationRepository.findById(notificationId)
                    .orElseThrow(() -> new NotificationNotFoundException(notificationId));

            log.info("通知配信開始: id={}, type={}", notificationId, notification.getType());

            // ステータス更新
            notification.markAsProcessing();
            notificationRepository.save(notification);

            // 適切なチャンネルで配信
            NotificationChannel channel = channels.get(notification.getType());
            if (channel == null) {
                throw new UnsupportedNotificationTypeException(notification.getType());
            }

            DeliveryResult result = channel.deliver(notification);

            // 結果に基づくステータス更新
            if (result.isSuccess()) {
                notification.markAsSent(result.getExternalId());
            } else {
                notification.markAsFailed(result.getErrorMessage());
            }

            notificationRepository.save(notification);

            // イベント発行
            eventPublisher.publishEvent(new NotificationDeliveredEvent(notification, result));

            log.info("通知配信完了: id={}, success={}", notificationId, result.isSuccess());
            return CompletableFuture.completedFuture(result);

        } catch (Exception e) {
            log.error("通知配信エラー: id={}", notificationId, e);
            handleDeliveryError(notificationId, e);
            return CompletableFuture.failedFuture(e);
        }
    }

    private void handleDeliveryError(UUID notificationId, Exception error) {
        try {
            Notification notification = notificationRepository.findById(notificationId)
                    .orElse(null);
            
            if (notification != null) {
                notification.markAsFailed(error.getMessage());
                notificationRepository.save(notification);
                
                eventPublisher.publishEvent(
                    new NotificationDeliveryFailedEvent(notification, error));
            }
        } catch (Exception e) {
            log.error("配信エラー処理中に例外発生: notificationId={}", notificationId, e);
        }
    }
}

// Email配信チャンネル実装例
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationChannel implements NotificationChannel {

    private final SendGridService sendGridService;
    private final UserPreferenceRepository preferenceRepository;

    @Override
    public NotificationType getType() {
        return NotificationType.EMAIL;
    }

    @Override
    public DeliveryResult deliver(Notification notification) {
        try {
            // 受信者情報取得
            UserPreference preference = preferenceRepository
                    .findByUserId(notification.getRecipientId())
                    .orElseThrow(() -> new UserPreferenceNotFoundException(notification.getRecipientId()));

            String emailAddress = preference.getEmailAddress();
            if (emailAddress == null || emailAddress.isBlank()) {
                return DeliveryResult.failure("Email address not configured");
            }

            // SendGrid API呼び出し
            SendGridRequest request = SendGridRequest.builder()
                    .to(emailAddress)
                    .subject(notification.getSubject())
                    .content(notification.getContent())
                    .metadata(Map.of(
                            "notificationId", notification.getId().toString(),
                            "userId", notification.getRecipientId()
                    ))
                    .build();

            SendGridResponse response = sendGridService.sendEmail(request);

            if (response.isSuccess()) {
                return DeliveryResult.success(response.getMessageId());
            } else {
                return DeliveryResult.failure(response.getErrorMessage());
            }

        } catch (Exception e) {
            log.error("Email配信エラー: notificationId={}", notification.getId(), e);
            return DeliveryResult.failure(e.getMessage());
        }
    }

    @Override
    public boolean isAvailable() {
        return sendGridService.isHealthy();
    }
}
```

### 6.4 ルールエンジン実装

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationRuleEngine {

    private final NotificationRuleRepository ruleRepository;
    private final NotificationService notificationService;
    private final UserService userService;

    @EventListener
    @Async("ruleEngineExecutor")
    public void handleDomainEvent(DomainEvent event) {
        log.info("ドメインイベント受信: type={}", event.getEventType());

        List<NotificationRule> rules = ruleRepository.findByEventTypeAndIsActiveTrue(event.getEventType());
        
        for (NotificationRule rule : rules) {
            try {
                evaluateAndExecuteRule(rule, event);
            } catch (Exception e) {
                log.error("ルール実行エラー: ruleId={}, eventType={}", 
                        rule.getId(), event.getEventType(), e);
            }
        }
    }

    private void evaluateAndExecuteRule(NotificationRule rule, DomainEvent event) {
        log.debug("ルール評価開始: ruleId={}, ruleName={}", rule.getId(), rule.getName());

        // 条件評価
        if (!evaluateConditions(rule.getConditions(), event.getData())) {
            log.debug("ルール条件不一致: ruleId={}", rule.getId());
            return;
        }

        // 受信者解決
        List<String> recipients = resolveRecipients(rule.getRecipientRules(), event.getData());
        if (recipients.isEmpty()) {
            log.debug("受信者なし: ruleId={}", rule.getId());
            return;
        }

        // 通知作成・送信
        for (String recipientId : recipients) {
            try {
                sendNotificationForRule(rule, recipientId, event.getData());
            } catch (Exception e) {
                log.error("ルール通知送信エラー: ruleId={}, recipientId={}", 
                        rule.getId(), recipientId, e);
            }
        }

        log.info("ルール実行完了: ruleId={}, recipients={}", rule.getId(), recipients.size());
    }

    private boolean evaluateConditions(Map<String, Object> conditions, Map<String, Object> eventData) {
        if (conditions == null || conditions.isEmpty()) {
            return true;
        }

        return conditions.entrySet().stream()
                .allMatch(entry -> evaluateCondition(entry.getKey(), entry.getValue(), eventData));
    }

    @SuppressWarnings("unchecked")
    private boolean evaluateCondition(String field, Object expectedValue, Map<String, Object> eventData) {
        Object actualValue = getNestedValue(eventData, field);
        
        if (expectedValue instanceof List<?> expectedList) {
            // IN条件
            return expectedList.contains(actualValue);
        } else if (expectedValue instanceof Map<?, ?> conditionMap) {
            // 複雑な条件（例：範囲、正規表現など）
            return evaluateComplexCondition((Map<String, Object>) conditionMap, actualValue);
        } else {
            // 等値条件
            return Objects.equals(expectedValue, actualValue);
        }
    }

    private boolean evaluateComplexCondition(Map<String, Object> condition, Object actualValue) {
        // $gt, $lt, $in, $regex などの演算子をサポート
        for (Map.Entry<String, Object> entry : condition.entrySet()) {
            String operator = entry.getKey();
            Object operand = entry.getValue();
            
            switch (operator) {
                case "$gt" -> {
                    if (!(actualValue instanceof Comparable) || !(operand instanceof Comparable)) {
                        return false;
                    }
                    return ((Comparable) actualValue).compareTo(operand) > 0;
                }
                case "$lt" -> {
                    if (!(actualValue instanceof Comparable) || !(operand instanceof Comparable)) {
                        return false;
                    }
                    return ((Comparable) actualValue).compareTo(operand) < 0;
                }
                case "$in" -> {
                    if (!(operand instanceof List)) {
                        return false;
                    }
                    return ((List<?>) operand).contains(actualValue);
                }
                case "$regex" -> {
                    if (!(actualValue instanceof String) || !(operand instanceof String)) {
                        return false;
                    }
                    return Pattern.matches((String) operand, (String) actualValue);
                }
                default -> {
                    return false;
                }
            }
        }
        return true;
    }

    private Object getNestedValue(Map<String, Object> data, String path) {
        String[] parts = path.split("\\.");
        Object current = data;
        
        for (String part : parts) {
            if (current instanceof Map) {
                current = ((Map<?, ?>) current).get(part);
            } else {
                return null;
            }
        }
        
        return current;
    }

    private List<String> resolveRecipients(
            List<RecipientRule> recipientRules, Map<String, Object> eventData) {
        
        Set<String> recipients = new HashSet<>();
        
        for (RecipientRule rule : recipientRules) {
            recipients.addAll(resolveRecipientRule(rule, eventData));
        }
        
        return new ArrayList<>(recipients);
    }

    private List<String> resolveRecipientRule(RecipientRule rule, Map<String, Object> eventData) {
        return switch (rule.getType()) {
            case USER -> List.of(rule.getValue());
            case GROUP -> userService.getUserIdsByGroup(rule.getValue());
            case ROLE -> userService.getUserIdsByRole(rule.getValue());
            case ASSIGNED_ENGINEER -> resolveAssignedEngineers(eventData);
            case PROJECT_MANAGER -> resolveProjectManagers(eventData);
            case CUSTOM -> resolveCustomRecipients(rule, eventData);
        };
    }

    private List<String> resolveAssignedEngineers(Map<String, Object> eventData) {
        Object projectId = eventData.get("projectId");
        if (projectId != null) {
            return userService.getAssignedEngineers(projectId.toString());
        }
        return Collections.emptyList();
    }

    private List<String> resolveProjectManagers(Map<String, Object> eventData) {
        Object projectId = eventData.get("projectId");
        if (projectId != null) {
            return userService.getProjectManagers(projectId.toString());
        }
        return Collections.emptyList();
    }

    private List<String> resolveCustomRecipients(RecipientRule rule, Map<String, Object> eventData) {
        // カスタムロジック実装
        // 例：特定の条件に基づく動的な受信者解決
        return Collections.emptyList();
    }

    private void sendNotificationForRule(
            NotificationRule rule, String recipientId, Map<String, Object> eventData) {
        
        NotificationCommand command = NotificationCommand.builder()
                .type(NotificationType.EMAIL) // デフォルト、テンプレートから取得可能
                .priority(rule.getPriority())
                .recipientId(recipientId)
                .recipientType(RecipientType.USER)
                .templateId(rule.getTemplateId())
                .variables(eventData)
                .scheduledAt(rule.getDelayMinutes() > 0 ? 
                        LocalDateTime.now().plusMinutes(rule.getDelayMinutes()) : null)
                .metadata(Map.of(
                        "ruleId", rule.getId().toString(),
                        "eventType", eventData.get("eventType").toString()
                ))
                .build();
        
        notificationService.sendNotification(command);
    }
}
```

## 7. セキュリティ仕様

### 7.1 認証・認可

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> 
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    // 公開エンドポイント
                    .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                    .requestMatchers("/webhooks/**").permitAll()
                    
                    // 管理者のみ
                    .requestMatchers(HttpMethod.DELETE, "/notification/v1/templates/**")
                        .hasRole("ADMIN")
                    .requestMatchers("/notification/v1/queue/**")
                        .hasRole("ADMIN")
                    .requestMatchers("/notification/v1/analytics/**")
                        .hasAnyRole("ADMIN", "MANAGER")
                    
                    // 認証が必要
                    .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                    .jwt(jwt -> jwt
                        .jwtAuthenticationConverter(jwtAuthenticationConverter())
                    )
                )
                .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authoritiesConverter = 
            new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthorityPrefix("ROLE_");
        authoritiesConverter.setAuthoritiesClaimName("roles");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
        return converter;
    }
}

// メソッドレベルセキュリティ
@PreAuthorize("hasRole('ADMIN') or @notificationSecurityService.canAccessNotification(#id, authentication.name)")
public NotificationResponse getNotification(@PathVariable UUID id) {
    // ...
}

@Component
public class NotificationSecurityService {
    
    public boolean canAccessNotification(UUID notificationId, String userId) {
        // 通知の受信者または作成者のみアクセス可能
        return notificationRepository.existsByIdAndRecipientIdOrCreatedBy(
            notificationId, userId, userId);
    }
    
    public boolean canManageTemplate(UUID templateId, String userId) {
        // テンプレートの作成者または管理者のみ管理可能
        return userService.hasRole(userId, "ADMIN") ||
               templateRepository.existsByIdAndCreatedBy(templateId, userId);
    }
}
```

### 7.2 データ暗号化・PII保護

```java
@Entity
@Table(name = "notifications")
public class Notification {
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "content")
    private String content; // 通知内容を暗号化
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "subject")
    private String subject; // 件名を暗号化
    
    // 個人情報をマスク
    @JsonIgnore
    @Column(name = "recipient_info")
    private String recipientInfo;
    
    @JsonProperty("recipientInfo")
    public String getMaskedRecipientInfo() {
        return PiiMaskingUtil.maskEmail(recipientInfo);
    }
}

@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {
    
    @Autowired
    private EncryptionService encryptionService;
    
    @Override
    public String convertToDatabaseColumn(String attribute) {
        return attribute != null ? encryptionService.encrypt(attribute) : null;
    }
    
    @Override
    public String convertToEntityAttribute(String dbData) {
        return dbData != null ? encryptionService.decrypt(dbData) : null;
    }
}
```

### 7.3 監査ログ

```java
@Component
@Slf4j
public class NotificationAuditLogger {
    
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        AuditLog auditLog = AuditLog.builder()
                .eventType(event.getClass().getSimpleName())
                .resourceType("NOTIFICATION")
                .resourceId(event.getNotificationId().toString())
                .userId(getCurrentUserId())
                .timestamp(LocalDateTime.now())
                .details(objectMapper.writeValueAsString(event))
                .ipAddress(getClientIpAddress())
                .userAgent(getUserAgent())
                .build();
        
        auditLogRepository.save(auditLog);
        
        // 重要な操作は外部監査システムにも送信
        if (isImportantEvent(event)) {
            externalAuditService.sendAuditLog(auditLog);
        }
    }
    
    private boolean isImportantEvent(NotificationEvent event) {
        return event instanceof NotificationCreatedEvent ||
               event instanceof NotificationDeliveredEvent ||
               event instanceof NotificationFailedEvent;
    }
}
```

## 8. パフォーマンス要件

### 8.1 スループット要件

| 通知タイプ | 目標スループット | 最大スループット |
|------------|------------------|------------------|
| Email      | 1,000件/分       | 5,000件/分       |
| Slack      | 500件/分         | 2,000件/分       |
| Push       | 2,000件/分       | 10,000件/分      |
| SMS        | 100件/分         | 500件/分         |

### 8.2 応答時間要件

| エンドポイント | 平均応答時間 | 95%ile | 99%ile |
|----------------|--------------|--------|--------|
| 通知送信       | < 200ms      | < 500ms| < 1s   |
| 通知一覧取得   | < 100ms      | < 200ms| < 500ms|
| テンプレート管理| < 150ms     | < 300ms| < 1s   |
| 統計取得       | < 500ms      | < 1s   | < 2s   |

### 8.3 パフォーマンス最適化

```java
// キャッシュ設定
@Configuration
@EnableCaching
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        RedisCacheManager.Builder builder = RedisCacheManager
                .RedisCacheManagerBuilder
                .fromConnectionFactory(redisConnectionFactory())
                .cacheDefaults(cacheConfiguration());
        
        return builder.build();
    }
    
    private RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}

// 非同期処理設定
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean("notificationExecutor")
    public ThreadPoolTaskExecutor notificationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("notification-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
    
    @Bean("batchExecutor")
    public ThreadPoolTaskExecutor batchExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("batch-");
        executor.initialize();
        return executor;
    }
}

// データベース最適化
@Repository
public class NotificationRepository extends JpaRepository<Notification, UUID> {
    
    // インデックスを活用したクエリ
    @Query("""
        SELECT n FROM Notification n 
        WHERE n.status = :status 
        AND n.createdAt >= :fromDate 
        AND n.createdAt <= :toDate
        ORDER BY n.priority DESC, n.createdAt ASC
        """)
    Page<Notification> findForDelivery(
            @Param("status") NotificationStatus status,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            Pageable pageable);
    
    // バッチ更新
    @Modifying
    @Query("UPDATE Notification n SET n.status = :status WHERE n.id IN :ids")
    int updateStatusBatch(@Param("ids") List<UUID> ids, @Param("status") NotificationStatus status);
}

// 接続プール設定
spring:
  datasource:
    hikari:
      minimum-idle: 10
      maximum-pool-size: 50
      idle-timeout: 300000
      max-lifetime: 600000
      connection-timeout: 20000
  
  redis:
    lettuce:
      pool:
        max-active: 20
        max-idle: 10
        min-idle: 5
```

## 9. 監視・ヘルスチェック

### 9.1 ヘルスチェック実装

```java
@Component
public class NotificationHealthIndicator implements HealthIndicator {
    
    private final NotificationDeliveryService deliveryService;
    private final NotificationQueue notificationQueue;
    private final RedisTemplate<String, Object> redisTemplate;
    
    @Override
    public Health health() {
        Health.Builder builder = Health.up();
        
        // キューヘルス
        try {
            int queueSize = notificationQueue.size();
            builder.withDetail("queueSize", queueSize);
            
            if (queueSize > 10000) {
                builder.down().withDetail("reason", "Queue size too large");
            }
        } catch (Exception e) {
            builder.down().withException(e);
        }
        
        // Redis接続
        try {
            redisTemplate.opsForValue().set("health-check", "ok", Duration.ofSeconds(10));
            builder.withDetail("redis", "UP");
        } catch (Exception e) {
            builder.down().withDetail("redis", "DOWN").withException(e);
        }
        
        // 外部サービス
        builder.withDetail("externalServices", checkExternalServices());
        
        return builder.build();
    }
    
    private Map<String, String> checkExternalServices() {
        Map<String, String> status = new HashMap<>();
        
        // SendGrid
        try {
            boolean sendGridHealthy = sendGridService.isHealthy();
            status.put("sendgrid", sendGridHealthy ? "UP" : "DOWN");
        } catch (Exception e) {
            status.put("sendgrid", "ERROR");
        }
        
        // Slack
        try {
            boolean slackHealthy = slackService.isHealthy();
            status.put("slack", slackHealthy ? "UP" : "DOWN");
        } catch (Exception e) {
            status.put("slack", "ERROR");
        }
        
        return status;
    }
}

// カスタムメトリクス
@Component
public class NotificationMetrics {
    
    private final Counter notificationsSent;
    private final Counter notificationsDelivered;
    private final Counter notificationsFailed;
    private final Timer deliveryTime;
    private final Gauge queueSize;
    
    public NotificationMetrics(MeterRegistry meterRegistry, NotificationQueue queue) {
        this.notificationsSent = Counter.builder("notifications.sent")
                .description("Total notifications sent")
                .tag("type", "all")
                .register(meterRegistry);
        
        this.notificationsDelivered = Counter.builder("notifications.delivered")
                .description("Total notifications delivered")
                .register(meterRegistry);
        
        this.notificationsFailed = Counter.builder("notifications.failed")
                .description("Total notifications failed")
                .register(meterRegistry);
        
        this.deliveryTime = Timer.builder("notifications.delivery.time")
                .description("Notification delivery time")
                .register(meterRegistry);
        
        this.queueSize = Gauge.builder("notifications.queue.size")
                .description("Current queue size")
                .register(meterRegistry, queue, NotificationQueue::size);
    }
    
    public void recordNotificationSent(NotificationType type) {
        notificationsSent.increment(Tags.of("type", type.name()));
    }
    
    public void recordNotificationDelivered(NotificationType type, Duration duration) {
        notificationsDelivered.increment(Tags.of("type", type.name()));
        deliveryTime.record(duration);
    }
    
    public void recordNotificationFailed(NotificationType type, String reason) {
        notificationsFailed.increment(Tags.of("type", type.name(), "reason", reason));
    }
}
```

## 10. エラーハンドリング

### 10.1 グローバルエラーハンドラー

```java
@ControllerAdvice
@Slf4j
public class NotificationExceptionHandler {
    
    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotificationNotFound(
            NotificationNotFoundException ex, HttpServletRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Notification Not Found")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(TemplateNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTemplateNotFound(
            TemplateNotFoundException ex, HttpServletRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Template Not Found")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
    
    @ExceptionHandler(NotificationNotCancellableException.class)
    public ResponseEntity<ErrorResponse> handleNotificationNotCancellable(
            NotificationNotCancellableException ex, HttpServletRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error("Notification Not Cancellable")
                .message(ex.getMessage())
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }
    
    @ExceptionHandler(DeliveryFailedException.class)
    public ResponseEntity<ErrorResponse> handleDeliveryFailed(
            DeliveryFailedException ex, HttpServletRequest request) {
        
        log.error("Delivery failed", ex);
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Delivery Failed")
                .message("通知の配信に失敗しました")
                .path(request.getRequestURI())
                .details(List.of(ex.getMessage()))
                .build();
        
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationError(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.toList());
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("入力値に問題があります")
                .path(request.getRequestURI())
                .details(details)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericError(
            Exception ex, HttpServletRequest request) {
        
        log.error("Unexpected error", ex);
        
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("予期しないエラーが発生しました")
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

// カスタム例外クラス
public class NotificationException extends RuntimeException {
    private final String errorCode;
    
    public NotificationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public NotificationException(String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
}

public class NotificationNotFoundException extends NotificationException {
    public NotificationNotFoundException(UUID notificationId) {
        super("NOTIFICATION_NOT_FOUND", 
              "Notification not found: " + notificationId);
    }
}

public class NotificationNotCancellableException extends NotificationException {
    public NotificationNotCancellableException(UUID notificationId, NotificationStatus status) {
        super("NOTIFICATION_NOT_CANCELLABLE", 
              String.format("Notification %s cannot be cancelled (status: %s)", 
                           notificationId, status));
    }
}
```

## 11. テスト戦略

### 11.1 単体テスト

```java
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    
    @Mock
    private NotificationRepository notificationRepository;
    
    @Mock
    private NotificationTemplateRepository templateRepository;
    
    @Mock
    private UserPreferenceRepository preferenceRepository;
    
    @Mock
    private NotificationDeliveryService deliveryService;
    
    @Mock
    private ApplicationEventPublisher eventPublisher;
    
    @InjectMocks
    private NotificationService notificationService;
    
    @Test
    void sendNotification_Success() {
        // Given
        NotificationTemplate template = createTestTemplate();
        UserPreference preference = createTestPreference();
        NotificationCommand command = createTestCommand();
        
        when(templateRepository.findById(command.getTemplateId()))
                .thenReturn(Optional.of(template));
        when(preferenceRepository.findByUserId(command.getRecipientId()))
                .thenReturn(Optional.of(preference));
        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        
        // When
        Notification result = notificationService.sendNotification(command);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(result.getType()).isEqualTo(command.getType());
        assertThat(result.getRecipientId()).isEqualTo(command.getRecipientId());
        
        verify(notificationRepository).save(any(Notification.class));
        verify(eventPublisher).publishEvent(any(NotificationCreatedEvent.class));
    }
    
    @Test
    void sendNotification_TemplateNotFound() {
        // Given
        NotificationCommand command = createTestCommand();
        when(templateRepository.findById(command.getTemplateId()))
                .thenReturn(Optional.empty());
        
        // When & Then
        assertThatThrownBy(() -> notificationService.sendNotification(command))
                .isInstanceOf(TemplateNotFoundException.class);
    }
    
    @Test
    void sendNotification_NotificationDisabled() {
        // Given
        NotificationTemplate template = createTestTemplate();
        UserPreference preference = createTestPreference();
        preference.setEmailEnabled(false); // Email通知を無効化
        
        NotificationCommand command = createTestCommand();
        command.setType(NotificationType.EMAIL);
        
        when(templateRepository.findById(command.getTemplateId()))
                .thenReturn(Optional.of(template));
        when(preferenceRepository.findByUserId(command.getRecipientId()))
                .thenReturn(Optional.of(preference));
        
        // When & Then
        assertThatThrownBy(() -> notificationService.sendNotification(command))
                .isInstanceOf(NotificationDisabledException.class);
    }
    
    private NotificationTemplate createTestTemplate() {
        return NotificationTemplate.builder()
                .id(UUID.randomUUID())
                .name("Test Template")
                .type(NotificationType.EMAIL)
                .bodyTemplate("Hello {{userName}}")
                .subject("Test Subject")
                .version(1)
                .isActive(true)
                .build();
    }
    
    private UserPreference createTestPreference() {
        return UserPreference.builder()
                .userId("user-123")
                .emailEnabled(true)
                .emailAddress("test@example.com")
                .timezone("Asia/Tokyo")
                .build();
    }
    
    private NotificationCommand createTestCommand() {
        return NotificationCommand.builder()
                .type(NotificationType.EMAIL)
                .priority(NotificationPriority.NORMAL)
                .recipientId("user-123")
                .recipientType(RecipientType.USER)
                .templateId(UUID.randomUUID())
                .variables(Map.of("userName", "Test User"))
                .build();
    }
}
```

### 11.2 統合テスト

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.redis.host=localhost",
    "spring.redis.port=6379"
})
@Testcontainers
class NotificationControllerIntegrationTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    @Autowired
    private NotificationTemplateRepository templateRepository;
    
    @MockBean
    private SendGridService sendGridService;
    
    @Test
    void sendNotification_Integration() {
        // Given
        NotificationTemplate template = createAndSaveTemplate();
        SendNotificationRequest request = SendNotificationRequest.builder()
                .type(NotificationType.EMAIL)
                .recipientId("user-123")
                .recipientType(RecipientType.USER)
                .templateId(template.getId())
                .variables(Map.of("userName", "Test User"))
                .build();
        
        when(sendGridService.isHealthy()).thenReturn(true);
        
        // When
        ResponseEntity<NotificationResponse> response = restTemplate
                .withBasicAuth("test-user", "password")
                .postForEntity("/notification/v1/notifications", request, NotificationResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getType()).isEqualTo(NotificationType.EMAIL);
        
        // データベース確認
        Optional<Notification> saved = notificationRepository.findById(response.getBody().getId());
        assertThat(saved).isPresent();
        assertThat(saved.get().getRecipientId()).isEqualTo("user-123");
    }
    
    @Test
    void getNotifications_WithFilters() {
        // Given
        createTestNotifications();
        
        // When
        ResponseEntity<NotificationListResponse> response = restTemplate
                .withBasicAuth("test-user", "password")
                .getForEntity("/notification/v1/notifications?status=PENDING&type=EMAIL", 
                             NotificationListResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).isNotEmpty();
    }
    
    private NotificationTemplate createAndSaveTemplate() {
        NotificationTemplate template = NotificationTemplate.builder()
                .name("Test Template")
                .type(NotificationType.EMAIL)
                .bodyTemplate("Hello {{userName}}")
                .subject("Test Subject")
                .version(1)
                .isActive(true)
                .createdBy("test-user")
                .build();
        
        return templateRepository.save(template);
    }
    
    private void createTestNotifications() {
        NotificationTemplate template = createAndSaveTemplate();
        
        for (int i = 0; i < 5; i++) {
            Notification notification = Notification.builder()
                    .type(NotificationType.EMAIL)
                    .status(NotificationStatus.PENDING)
                    .recipientId("user-" + i)
                    .recipientType(RecipientType.USER)
                    .templateId(template.getId())
                    .content("Test content " + i)
                    .build();
            
            notificationRepository.save(notification);
        }
    }
}
```

## 12. 運用・保守

### 12.1 ログ設定

```yaml
logging:
  level:
    com.company.notification: INFO
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{traceId},%X{spanId}] %logger{36} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level [%X{traceId},%X{spanId}] %logger{36} - %msg%n"
  file:
    name: /var/log/notification-service/application.log
  logback:
    rollingpolicy:
      max-file-size: 100MB
      max-history: 30
      total-size-cap: 3GB
```

### 12.2 設定管理

```yaml
# application.yaml
spring:
  application:
    name: notification-service
  
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/notification}
    username: ${DB_USERNAME:notification}
    password: ${DB_PASSWORD:password}
    hikari:
      minimum-idle: ${DB_POOL_MIN:5}
      maximum-pool-size: ${DB_POOL_MAX:20}
  
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    timeout: ${REDIS_TIMEOUT:2000}
    lettuce:
      pool:
        max-active: ${REDIS_POOL_MAX:20}
        max-idle: ${REDIS_POOL_MAX_IDLE:10}
        min-idle: ${REDIS_POOL_MIN_IDLE:5}

notification:
  delivery:
    retry:
      max-attempts: ${DELIVERY_MAX_RETRIES:3}
      backoff-multiplier: ${DELIVERY_BACKOFF_MULTIPLIER:2.0}
      initial-interval: ${DELIVERY_INITIAL_INTERVAL:1000}
    timeout: ${DELIVERY_TIMEOUT:30000}
  
  queue:
    size-limit: ${QUEUE_SIZE_LIMIT:10000}
    batch-size: ${QUEUE_BATCH_SIZE:100}
    processing-interval: ${QUEUE_PROCESSING_INTERVAL:5000}
  
  external:
    sendgrid:
      api-key: ${SENDGRID_API_KEY}
      from-email: ${SENDGRID_FROM_EMAIL:noreply@company.com}
      from-name: ${SENDGRID_FROM_NAME:SES Management System}
    
    slack:
      bot-token: ${SLACK_BOT_TOKEN}
      webhook-url: ${SLACK_WEBHOOK_URL}
    
    twilio:
      account-sid: ${TWILIO_ACCOUNT_SID}
      auth-token: ${TWILIO_AUTH_TOKEN}
      from-phone: ${TWILIO_FROM_PHONE}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true
```

### 12.3 デプロイメント設定

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: notification-service:latest
        ports:
        - containerPort: 8108
        env:
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: db-url
        - name: SENDGRID_API_KEY
          valueFrom:
            secretKeyRef:
              name: notification-secrets
              key: sendgrid-api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8108
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8108
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
spec:
  selector:
    app: notification-service
  ports:
  - port: 8108
    targetPort: 8108
  type: ClusterIP
```

---

## まとめ

本Notification Context APIの詳細設計により、SESマネジメントシステムの通知機能が完全に定義されました。

### 主要な特徴：

1. **多チャンネル対応**: Email, Slack, Push, SMS
2. **高度なルールエンジン**: 柔軟な条件設定と受信者解決
3. **テンプレート管理**: バージョニングとプレビュー機能
4. **スケーラブル設計**: 非同期処理とキューイング
5. **包括的な監視**: メトリクス、ヘルスチェック、監査ログ
6. **セキュリティ**: 暗号化、認可、PII保護
7. **高可用性**: エラーハンドリングと再試行メカニズム

これで8つのマイクロサービスAPI（Engineer Context、Project Context、Contract Context、Matching Context、Timesheet Context、Billing Context、Report Context、Notification Context）の詳細設計が完了し、API詳細設計フェーズが完成しました。