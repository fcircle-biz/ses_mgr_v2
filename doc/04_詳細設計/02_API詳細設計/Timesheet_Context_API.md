# Timesheet Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Timesheet Management Service
- **ベースURL**: `https://api.ses-mgr.com/timesheet/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 月次工数表の作成・管理・ライフサイクル制御
- 日次勤怠データの記録・検証・集計
- 承認ワークフロー（技術者→PM→顧客）の管理
- 残業・休暇管理と法的コンプライアンスチェック
- 工数表テンプレート管理
- レポーティング機能とエクスポート
- 労働基準法対応とヘルスケア監視

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Timesheet Management API
  description: SES案件管理システムの工数表管理API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/timesheet/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/timesheet/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 工数表管理 ====================
  /timesheets:
    get:
      summary: 工数表一覧取得
      description: 工数表の一覧を取得します。フィルタリングとページングに対応しています。
      tags:
        - Timesheets
      parameters:
        - name: engineerId
          in: query
          description: 技術者IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: projectId
          in: query
          description: プロジェクトIDでフィルタ
          schema:
            type: string
            format: uuid
        - name: contractId
          in: query
          description: 契約IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          description: ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/TimesheetStatus'
        - name: period
          in: query
          description: 対象月でフィルタ (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
            example: "2024-03"
        - name: periodFrom
          in: query
          description: 期間開始月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: periodTo
          in: query
          description: 期間終了月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: dueWithinDays
          in: query
          description: 指定日数以内に期限が切れる工数表のみ
          schema:
            type: integer
            minimum: 1
            maximum: 30
        - name: isOverdue
          in: query
          description: 期限超過工数表のみ
          schema:
            type: boolean
        - name: isHealthRisk
          in: query
          description: 健康リスクレベルの工数表のみ（残業80時間超）
          schema:
            type: boolean
        - name: page
          in: query
          description: ページ番号 (0-based)
          schema:
            type: integer
            minimum: 0
            default: 0
        - name: size
          in: query
          description: ページサイズ
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: sort
          in: query
          description: ソート条件
          schema:
            type: string
            default: "period,desc"
      responses:
        '200':
          description: 工数表一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規工数表作成
      description: 新しい工数表を作成します。
      tags:
        - Timesheets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTimesheetRequest'
      responses:
        '201':
          description: 工数表作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: 同一期間の工数表が既に存在
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/bulk:
    post:
      summary: 月次工数表一括作成
      description: 指定月のアクティブ契約に対して工数表を一括作成します。
      tags:
        - Timesheets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkCreateTimesheetRequest'
      responses:
        '201':
          description: 一括作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BulkCreateTimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/{timesheetId}:
    get:
      summary: 工数表詳細取得
      description: 指定されたIDの工数表詳細を取得します。
      tags:
        - Timesheets
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 工数表詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetDetailResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    put:
      summary: 工数表情報更新
      description: 工数表の基本情報を更新します。
      tags:
        - Timesheets
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateTimesheetRequest'
      responses:
        '200':
          description: 工数表更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 編集不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: 工数表削除
      description: 工数表を削除します。ドラフト状態のみ削除可能です。
      tags:
        - Timesheets
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 工数表削除成功
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 削除不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 勤怠データ管理 ====================
  /timesheets/{timesheetId}/attendances:
    get:
      summary: 勤怠データ一覧取得
      description: 工数表の勤怠データ一覧を取得します。
      tags:
        - Attendances
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: dateFrom
          in: query
          description: 開始日
          schema:
            type: string
            format: date
        - name: dateTo
          in: query
          description: 終了日
          schema:
            type: string
            format: date
        - name: attendanceType
          in: query
          description: 勤怠種別でフィルタ
          schema:
            $ref: '#/components/schemas/AttendanceType'
      responses:
        '200':
          description: 勤怠データ一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AttendanceListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 勤怠データ一括更新
      description: 複数日の勤怠データを一括で更新します。
      tags:
        - Attendances
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkUpdateAttendanceRequest'
      responses:
        '200':
          description: 勤怠データ更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AttendanceListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 編集不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/{timesheetId}/attendances/{date}:
    get:
      summary: 日次勤怠データ取得
      description: 指定日の勤怠データを取得します。
      tags:
        - Attendances
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: date
          in: path
          required: true
          description: 対象日 (YYYY-MM-DD形式)
          schema:
            type: string
            format: date
      responses:
        '200':
          description: 勤怠データ取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AttendanceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    put:
      summary: 日次勤怠データ更新
      description: 指定日の勤怠データを更新します。
      tags:
        - Attendances
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: date
          in: path
          required: true
          description: 対象日 (YYYY-MM-DD形式)
          schema:
            type: string
            format: date
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAttendanceRequest'
      responses:
        '200':
          description: 勤怠データ更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AttendanceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 編集不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: 日次勤怠データ削除
      description: 指定日の勤怠データを削除します。
      tags:
        - Attendances
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: date
          in: path
          required: true
          description: 対象日 (YYYY-MM-DD形式)
          schema:
            type: string
            format: date
      responses:
        '204':
          description: 勤怠データ削除成功
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 削除不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 特別作業管理 ====================
  /timesheets/{timesheetId}/special-works:
    get:
      summary: 特別作業一覧取得
      description: 工数表の特別作業（残業、休日出勤等）一覧を取得します。
      tags:
        - Special Works
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: workType
          in: query
          description: 特別作業種別でフィルタ
          schema:
            $ref: '#/components/schemas/SpecialWorkType'
      responses:
        '200':
          description: 特別作業一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SpecialWorkListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 特別作業追加
      description: 新しい特別作業を追加します。
      tags:
        - Special Works
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddSpecialWorkRequest'
      responses:
        '201':
          description: 特別作業追加成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SpecialWorkResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 編集不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 承認ワークフロー ====================
  /timesheets/{timesheetId}/submit:
    post:
      summary: 承認依頼提出
      description: 工数表を承認依頼として提出します。
      tags:
        - Approval Workflow
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmitTimesheetRequest'
      responses:
        '200':
          description: 提出成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 提出不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/{timesheetId}/approve:
    post:
      summary: 工数表承認
      description: 工数表を承認します。
      tags:
        - Approval Workflow
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ApproveTimesheetRequest'
      responses:
        '200':
          description: 承認成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 承認不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/{timesheetId}/reject:
    post:
      summary: 工数表差し戻し
      description: 工数表を差し戻します。
      tags:
        - Approval Workflow
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RejectTimesheetRequest'
      responses:
        '200':
          description: 差し戻し成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 差し戻し不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/bulk-approve:
    post:
      summary: 工数表一括承認
      description: 複数の工数表を一括で承認します。
      tags:
        - Approval Workflow
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkApproveTimesheetRequest'
      responses:
        '200':
          description: 一括承認成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BulkApproveTimesheetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 調整項目管理 ====================
  /timesheets/{timesheetId}/adjustments:
    get:
      summary: 調整項目一覧取得
      description: 工数表の調整項目一覧を取得します。
      tags:
        - Adjustments
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 調整項目一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdjustmentListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 調整項目追加
      description: 新しい調整項目を追加します。承認者のみ実行可能です。
      tags:
        - Adjustments
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddAdjustmentRequest'
      responses:
        '201':
          description: 調整項目追加成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AdjustmentResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 工数表テンプレート ====================
  /timesheet-templates:
    get:
      summary: 工数表テンプレート一覧取得
      description: 利用可能な工数表テンプレートの一覧を取得します。
      tags:
        - Templates
      parameters:
        - name: projectType
          in: query
          description: プロジェクト種別でフィルタ
          schema:
            type: string
        - name: contractType
          in: query
          description: 契約種別でフィルタ
          schema:
            type: string
        - name: isActive
          in: query
          description: アクティブテンプレートのみ
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: テンプレート一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetTemplateListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 工数表テンプレート作成
      description: 新しい工数表テンプレートを作成します。
      tags:
        - Templates
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTimesheetTemplateRequest'
      responses:
        '201':
          description: テンプレート作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetTemplateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheet-templates/{templateId}:
    get:
      summary: 工数表テンプレート詳細取得
      description: 指定されたIDのテンプレート詳細を取得します。
      tags:
        - Templates
      parameters:
        - name: templateId
          in: path
          required: true
          description: テンプレートID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: テンプレート詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetTemplateDetailResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== レポート・統計 ====================
  /timesheets/reports/work-hours:
    get:
      summary: 労働時間レポート取得
      description: 指定期間の労働時間統計レポートを取得します。
      tags:
        - Reports
      parameters:
        - name: engineerIds
          in: query
          description: 技術者IDリスト (カンマ区切り)
          schema:
            type: string
        - name: projectIds
          in: query
          description: プロジェクトIDリスト (カンマ区切り)
          schema:
            type: string
        - name: periodFrom
          in: query
          required: true
          description: 期間開始月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: periodTo
          in: query
          required: true
          description: 期間終了月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: groupBy
          in: query
          description: グルーピング条件
          schema:
            type: string
            enum: [engineer, project, month]
            default: engineer
        - name: includeOvertime
          in: query
          description: 残業詳細を含む
          schema:
            type: boolean
            default: true
        - name: format
          in: query
          description: レポート形式
          schema:
            type: string
            enum: [json, csv, excel]
            default: json
      responses:
        '200':
          description: レポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkHoursReportResponse'
            text/csv:
              schema:
                type: string
                format: binary
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
              schema:
                type: string
                format: binary
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/reports/compliance:
    get:
      summary: コンプライアンスレポート取得
      description: 労働基準法コンプライアンスレポートを取得します。
      tags:
        - Reports
      parameters:
        - name: engineerIds
          in: query
          description: 技術者IDリスト (カンマ区切り)
          schema:
            type: string
        - name: periodFrom
          in: query
          required: true
          description: 期間開始月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: periodTo
          in: query
          required: true
          description: 期間終了月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: riskLevel
          in: query
          description: リスクレベルでフィルタ
          schema:
            type: string
            enum: [low, medium, high, critical]
        - name: violationType
          in: query
          description: 違反種別でフィルタ
          schema:
            type: string
            enum: [overtime_limit, consecutive_work_days, legal_working_hours]
      responses:
        '200':
          description: コンプライアンスレポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ComplianceReportResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/reports/approval-status:
    get:
      summary: 承認状況レポート取得
      description: 工数表の承認状況レポートを取得します。
      tags:
        - Reports
      parameters:
        - name: projectIds
          in: query
          description: プロジェクトIDリスト (カンマ区切り)
          schema:
            type: string
        - name: period
          in: query
          required: true
          description: 対象月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: approverIds
          in: query
          description: 承認者IDリスト (カンマ区切り)
          schema:
            type: string
        - name: status
          in: query
          description: 承認ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/TimesheetStatus'
      responses:
        '200':
          description: 承認状況レポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApprovalStatusReportResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== エクスポート機能 ====================
  /timesheets/{timesheetId}/export:
    get:
      summary: 工数表エクスポート
      description: 工数表を指定形式でエクスポートします。
      tags:
        - Export
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
        - name: format
          in: query
          required: true
          description: エクスポート形式
          schema:
            type: string
            enum: [pdf, excel, csv]
        - name: template
          in: query
          description: 使用テンプレート
          schema:
            type: string
            enum: [standard, customer_format, detailed]
            default: standard
        - name: includeSignatures
          in: query
          description: 電子署名を含む (PDF形式時)
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: エクスポート成功
          content:
            application/pdf:
              schema:
                type: string
                format: binary
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
              schema:
                type: string
                format: binary
            text/csv:
              schema:
                type: string
                format: binary
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /timesheets/bulk-export:
    post:
      summary: 工数表一括エクスポート
      description: 複数の工数表を一括でエクスポートします。
      tags:
        - Export
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkExportTimesheetRequest'
      responses:
        '200':
          description: 一括エクスポート成功（ZIPファイル）
          content:
            application/zip:
              schema:
                type: string
                format: binary
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== バリデーション ====================
  /timesheets/{timesheetId}/validate:
    post:
      summary: 工数表バリデーション
      description: 工数表の詳細バリデーションを実行します。
      tags:
        - Validation
      parameters:
        - name: timesheetId
          in: path
          required: true
          description: 工数表ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ValidationConfigRequest'
      responses:
        '200':
          description: バリデーション実行成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationResultResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 統計・分析 ====================
  /timesheets/analytics/dashboard:
    get:
      summary: ダッシュボード統計情報取得
      description: 工数表管理ダッシュボード用の統計情報を取得します。
      tags:
        - Analytics
      parameters:
        - name: period
          in: query
          description: 対象月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: projectIds
          in: query
          description: プロジェクトIDリスト (カンマ区切り)
          schema:
            type: string
        - name: engineerIds
          in: query
          description: 技術者IDリスト (カンマ区切り)
          schema:
            type: string
      responses:
        '200':
          description: ダッシュボード統計取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TimesheetDashboardResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # ==================== Core Entities ====================
    TimesheetResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 工数表ID
        engineerId:
          type: string
          format: uuid
          description: 技術者ID
        engineerName:
          type: string
          description: 技術者名
        contractId:
          type: string
          format: uuid
          description: 契約ID
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        projectName:
          type: string
          description: プロジェクト名
        period:
          type: string
          description: 対象月 (YYYY-MM形式)
          pattern: '^[0-9]{4}-[0-9]{2}$'
        status:
          $ref: '#/components/schemas/TimesheetStatus'
        submissionDeadline:
          type: string
          format: date
          description: 提出期限
        approvalDeadline:
          type: string
          format: date
          description: 承認期限
        summary:
          $ref: '#/components/schemas/WorkHoursSummary'
        approvalFlow:
          $ref: '#/components/schemas/ApprovalFlow'
        engineerComment:
          type: string
          description: 技術者コメント
        validationErrors:
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
        isLocked:
          type: boolean
          description: ロック状態
        isEditable:
          type: boolean
          description: 編集可能状態
        isSubmittable:
          type: boolean
          description: 提出可能状態
        isOverdue:
          type: boolean
          description: 期限超過状態
        completionRate:
          type: number
          format: float
          minimum: 0
          maximum: 1
          description: 完了率
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        updatedAt:
          type: string
          format: date-time
          description: 更新日時
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    TimesheetDetailResponse:
      allOf:
        - $ref: '#/components/schemas/TimesheetResponse'
        - type: object
          properties:
            attendances:
              type: array
              items:
                $ref: '#/components/schemas/AttendanceResponse'
            specialWorks:
              type: array
              items:
                $ref: '#/components/schemas/SpecialWorkResponse'
            adjustments:
              type: array
              items:
                $ref: '#/components/schemas/AdjustmentResponse'
            approvalHistory:
              type: array
              items:
                $ref: '#/components/schemas/ApprovalHistoryEntry'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateTimesheetRequest:
      type: object
      required:
        - engineerId
        - contractId
        - projectId
        - period
      properties:
        engineerId:
          type: string
          format: uuid
          description: 技術者ID
        contractId:
          type: string
          format: uuid
          description: 契約ID
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        period:
          type: string
          description: 対象月 (YYYY-MM形式)
          pattern: '^[0-9]{4}-[0-9]{2}$'
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID
        engineerComment:
          type: string
          maxLength: 1000
          description: 技術者コメント

    UpdateTimesheetRequest:
      type: object
      properties:
        engineerComment:
          type: string
          maxLength: 1000
          description: 技術者コメント
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    BulkCreateTimesheetRequest:
      type: object
      required:
        - period
      properties:
        period:
          type: string
          description: 対象月 (YYYY-MM形式)
          pattern: '^[0-9]{4}-[0-9]{2}$'
        contractIds:
          type: array
          items:
            type: string
            format: uuid
          description: 対象契約IDリスト（指定なしの場合は全アクティブ契約）
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID

    BulkCreateTimesheetResponse:
      type: object
      properties:
        totalCreated:
          type: integer
          description: 作成された工数表数
        totalSkipped:
          type: integer
          description: スキップされた工数表数
        createdTimesheets:
          type: array
          items:
            $ref: '#/components/schemas/TimesheetResponse'
        skippedContracts:
          type: array
          items:
            type: object
            properties:
              contractId:
                type: string
                format: uuid
              reason:
                type: string
        summary:
          type: object
          properties:
            period:
              type: string
            totalContracts:
              type: integer
            successRate:
              type: number
              format: float

    # ==================== Attendance ====================
    AttendanceResponse:
      type: object
      properties:
        date:
          type: string
          format: date
          description: 対象日
        type:
          $ref: '#/components/schemas/AttendanceType'
        startTime:
          type: string
          format: time
          description: 開始時刻
        endTime:
          type: string
          format: time
          description: 終了時刻
        breakStartTime:
          type: string
          format: time
          description: 休憩開始時刻
        breakEndTime:
          type: string
          format: time
          description: 休憩終了時刻
        scheduledHours:
          type: integer
          description: 所定労働時間
        actualWorkingHours:
          type: integer
          description: 実労働時間
        overtimeHours:
          type: integer
          description: 残業時間
        breakMinutes:
          type: integer
          description: 休憩時間（分）
        workLocation:
          $ref: '#/components/schemas/WorkLocation'
        workLocationDetails:
          type: string
          description: 勤務地詳細
        dailyComment:
          type: string
          description: 日報コメント
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/WorkTask'
        isWorkingDay:
          type: boolean
          description: 勤務日判定
        isOvertimeWork:
          type: boolean
          description: 時間外労働判定
        isHolidayWork:
          type: boolean
          description: 休日勤務判定
        validationErrors:
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'

    UpdateAttendanceRequest:
      type: object
      required:
        - type
      properties:
        type:
          $ref: '#/components/schemas/AttendanceType'
        startTime:
          type: string
          format: time
          description: 開始時刻
        endTime:
          type: string
          format: time
          description: 終了時刻
        breakStartTime:
          type: string
          format: time
          description: 休憩開始時刻
        breakEndTime:
          type: string
          format: time
          description: 休憩終了時刻
        workLocation:
          $ref: '#/components/schemas/WorkLocation'
        workLocationDetails:
          type: string
          maxLength: 500
          description: 勤務地詳細
        dailyComment:
          type: string
          maxLength: 1000
          description: 日報コメント
        tasks:
          type: array
          items:
            $ref: '#/components/schemas/WorkTask'
          maxItems: 10

    BulkUpdateAttendanceRequest:
      type: object
      required:
        - attendances
      properties:
        attendances:
          type: array
          items:
            type: object
            required:
              - date
              - attendanceData
            properties:
              date:
                type: string
                format: date
              attendanceData:
                $ref: '#/components/schemas/UpdateAttendanceRequest'
          maxItems: 31

    AttendanceListResponse:
      type: object
      properties:
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        period:
          type: string
          description: 対象月
        attendances:
          type: array
          items:
            $ref: '#/components/schemas/AttendanceResponse'
        summary:
          $ref: '#/components/schemas/WorkHoursSummary'
        validationSummary:
          type: object
          properties:
            totalDays:
              type: integer
            completedDays:
              type: integer
            errorDays:
              type: integer
            warningDays:
              type: integer

    # ==================== Special Work ====================
    SpecialWorkResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 特別作業ID
        date:
          type: string
          format: date
          description: 対象日
        workType:
          $ref: '#/components/schemas/SpecialWorkType'
        hours:
          type: integer
          minimum: 1
          description: 作業時間
        description:
          type: string
          description: 作業内容説明
        approvalRequired:
          type: boolean
          description: 承認要否
        isApproved:
          type: boolean
          description: 承認状態
        approvedBy:
          type: string
          format: uuid
          description: 承認者ID
        approvedAt:
          type: string
          format: date-time
          description: 承認日時
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    AddSpecialWorkRequest:
      type: object
      required:
        - date
        - workType
        - hours
        - description
      properties:
        date:
          type: string
          format: date
          description: 対象日
        workType:
          $ref: '#/components/schemas/SpecialWorkType'
        hours:
          type: integer
          minimum: 1
          maximum: 24
          description: 作業時間
        description:
          type: string
          minLength: 1
          maxLength: 500
          description: 作業内容説明

    SpecialWorkListResponse:
      type: object
      properties:
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        specialWorks:
          type: array
          items:
            $ref: '#/components/schemas/SpecialWorkResponse'
        totalHours:
          type: integer
          description: 特別作業総時間
        summary:
          type: object
          additionalProperties:
            type: integer
          description: 種別別集計

    # ==================== Approval Workflow ====================
    ApprovalFlow:
      type: object
      properties:
        status:
          $ref: '#/components/schemas/ApprovalStatus'
        steps:
          type: array
          items:
            $ref: '#/components/schemas/ApprovalStep'
        currentStep:
          $ref: '#/components/schemas/ApprovalStep'
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        completedAt:
          type: string
          format: date-time
          description: 完了日時
        isCompleted:
          type: boolean
          description: 完了状態

    ApprovalStep:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: ステップID
        level:
          $ref: '#/components/schemas/ApprovalLevel'
        stepName:
          type: string
          description: ステップ名
        isRequired:
          type: boolean
          description: 必須フラグ
        status:
          $ref: '#/components/schemas/ApprovalStepStatus'
        approverId:
          type: string
          format: uuid
          description: 承認者ID
        approverName:
          type: string
          description: 承認者名
        approvedAt:
          type: string
          format: date-time
          description: 承認日時
        approvalComment:
          type: string
          description: 承認コメント
        activatedAt:
          type: string
          format: date-time
          description: アクティブ化日時
        rejectedAt:
          type: string
          format: date-time
          description: 差し戻し日時
        rejectionReason:
          type: string
          description: 差し戻し理由
        isOverdue:
          type: boolean
          description: 期限超過状態

    SubmitTimesheetRequest:
      type: object
      properties:
        finalComment:
          type: string
          maxLength: 1000
          description: 最終コメント
        forceSubmit:
          type: boolean
          default: false
          description: 強制提出フラグ（バリデーションエラー無視）

    ApproveTimesheetRequest:
      type: object
      required:
        - approvalLevel
      properties:
        approvalLevel:
          $ref: '#/components/schemas/ApprovalLevel'
        approvalComment:
          type: string
          maxLength: 1000
          description: 承認コメント
        adjustments:
          type: array
          items:
            $ref: '#/components/schemas/AddAdjustmentRequest'
          description: 承認時の調整項目

    RejectTimesheetRequest:
      type: object
      required:
        - rejectionReason
      properties:
        rejectionReason:
          type: string
          minLength: 1
          maxLength: 1000
          description: 差し戻し理由
        rejectionCategory:
          type: string
          enum: [incomplete_data, policy_violation, calculation_error, other]
          description: 差し戻しカテゴリ
        requiredActions:
          type: array
          items:
            type: string
          description: 必要な対応項目

    BulkApproveTimesheetRequest:
      type: object
      required:
        - timesheetIds
        - approvalLevel
      properties:
        timesheetIds:
          type: array
          items:
            type: string
            format: uuid
          minItems: 1
          maxItems: 50
          description: 工数表IDリスト
        approvalLevel:
          $ref: '#/components/schemas/ApprovalLevel'
        approvalComment:
          type: string
          maxLength: 1000
          description: 承認コメント
        continueOnError:
          type: boolean
          default: true
          description: エラー発生時も処理継続

    BulkApproveTimesheetResponse:
      type: object
      properties:
        totalRequested:
          type: integer
          description: リクエスト総数
        totalApproved:
          type: integer
          description: 承認成功数
        totalFailed:
          type: integer
          description: 承認失敗数
        approvedTimesheets:
          type: array
          items:
            $ref: '#/components/schemas/TimesheetResponse'
        failedTimesheets:
          type: array
          items:
            type: object
            properties:
              timesheetId:
                type: string
                format: uuid
              error:
                type: string
              errorCode:
                type: string

    ApprovalHistoryEntry:
      type: object
      properties:
        stepId:
          type: string
          format: uuid
          description: ステップID
        level:
          $ref: '#/components/schemas/ApprovalLevel'
        action:
          type: string
          enum: [approved, rejected, submitted, withdrawn]
          description: アクション
        actorId:
          type: string
          format: uuid
          description: 実行者ID
        actorName:
          type: string
          description: 実行者名
        comment:
          type: string
          description: コメント
        performedAt:
          type: string
          format: date-time
          description: 実行日時

    # ==================== Adjustments ====================
    AdjustmentResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 調整項目ID
        type:
          $ref: '#/components/schemas/AdjustmentType'
        date:
          type: string
          format: date
          description: 対象日
        adjustmentHours:
          type: integer
          description: 調整時間
        reason:
          type: string
          description: 調整理由
        description:
          type: string
          description: 調整内容説明
        adjusterId:
          type: string
          format: uuid
          description: 調整者ID
        adjusterName:
          type: string
          description: 調整者名
        adjustedAt:
          type: string
          format: date-time
          description: 調整日時
        approvalRequired:
          type: boolean
          description: 承認要否
        isApproved:
          type: boolean
          description: 承認状態

    AddAdjustmentRequest:
      type: object
      required:
        - type
        - adjustmentHours
        - reason
      properties:
        type:
          $ref: '#/components/schemas/AdjustmentType'
        date:
          type: string
          format: date
          description: 対象日（日別調整の場合）
        adjustmentHours:
          type: integer
          description: 調整時間
        reason:
          type: string
          minLength: 1
          maxLength: 500
          description: 調整理由
        description:
          type: string
          maxLength: 1000
          description: 調整内容説明

    AdjustmentListResponse:
      type: object
      properties:
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        adjustments:
          type: array
          items:
            $ref: '#/components/schemas/AdjustmentResponse'
        totalAdjustmentHours:
          type: integer
          description: 総調整時間

    # ==================== Templates ====================
    TimesheetTemplateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: テンプレートID
        name:
          type: string
          description: テンプレート名
        description:
          type: string
          description: テンプレート説明
        projectType:
          type: string
          description: プロジェクト種別
        contractType:
          type: string
          description: 契約種別
        defaultWorkingHours:
          type: integer
          description: デフォルト労働時間
        defaultBreakMinutes:
          type: integer
          description: デフォルト休憩時間
        isActive:
          type: boolean
          description: アクティブ状態
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        updatedAt:
          type: string
          format: date-time
          description: 更新日時

    TimesheetTemplateDetailResponse:
      allOf:
        - $ref: '#/components/schemas/TimesheetTemplateResponse'
        - type: object
          properties:
            workingDaySettings:
              type: object
              properties:
                mondayToFriday:
                  $ref: '#/components/schemas/DaySettings'
                saturday:
                  $ref: '#/components/schemas/DaySettings'
                sunday:
                  $ref: '#/components/schemas/DaySettings'
            validationRules:
              type: array
              items:
                $ref: '#/components/schemas/ValidationRule'
            approvalFlowTemplate:
              $ref: '#/components/schemas/ApprovalFlowTemplate'

    CreateTimesheetTemplateRequest:
      type: object
      required:
        - name
        - projectType
        - contractType
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: テンプレート名
        description:
          type: string
          maxLength: 500
          description: テンプレート説明
        projectType:
          type: string
          description: プロジェクト種別
        contractType:
          type: string
          description: 契約種別
        defaultWorkingHours:
          type: integer
          minimum: 1
          maximum: 12
          default: 8
          description: デフォルト労働時間
        defaultBreakMinutes:
          type: integer
          minimum: 0
          maximum: 480
          default: 60
          description: デフォルト休憩時間
        workingDaySettings:
          type: object
          properties:
            mondayToFriday:
              $ref: '#/components/schemas/DaySettings'
            saturday:
              $ref: '#/components/schemas/DaySettings'
            sunday:
              $ref: '#/components/schemas/DaySettings'

    TimesheetTemplateListResponse:
      type: object
      properties:
        templates:
          type: array
          items:
            $ref: '#/components/schemas/TimesheetTemplateResponse'
        totalCount:
          type: integer
          description: 総テンプレート数

    # ==================== Work Hours Summary ====================
    WorkHoursSummary:
      type: object
      properties:
        totalWorkingDays:
          type: integer
          description: 総勤務日数
        totalWorkingHours:
          type: integer
          description: 総労働時間
        totalOvertimeHours:
          type: integer
          description: 総残業時間
        totalSpecialWorkHours:
          type: integer
          description: 総特別作業時間
        totalAdjustmentHours:
          type: integer
          description: 総調整時間
        holidayWorkDays:
          type: integer
          description: 休日勤務日数
        holidayWorkHours:
          type: integer
          description: 休日勤務時間
        nightWorkHours:
          type: integer
          description: 深夜勤務時間
        paidLeaveDays:
          type: integer
          description: 有給休暇日数
        sickLeaveDays:
          type: integer
          description: 病気休暇日数
        specialLeaveDays:
          type: integer
          description: 特別休暇日数
        basicWorkingHours:
          type: integer
          description: 基本労働時間（残業除く）
        actualWorkingHours:
          type: integer
          description: 実労働時間（調整含む）
        averageDailyHours:
          type: number
          format: float
          description: 平均日労働時間
        overtimeRate:
          type: number
          format: float
          description: 残業率
        attendanceRate:
          type: number
          format: float
          description: 勤怠率
        isOverLegalWorkingHours:
          type: boolean
          description: 法定労働時間超過判定
        isHealthRiskLevel:
          type: boolean
          description: 健康管理注意判定
        summaryReport:
          type: string
          description: サマリーレポート

    # ==================== Reports ====================
    WorkHoursReportResponse:
      type: object
      properties:
        reportId:
          type: string
          format: uuid
          description: レポートID
        periodFrom:
          type: string
          description: 期間開始月
        periodTo:
          type: string
          description: 期間終了月
        groupBy:
          type: string
          description: グルーピング条件
        totalEntries:
          type: integer
          description: 総エントリ数
        summary:
          $ref: '#/components/schemas/WorkHoursSummary'
        details:
          type: array
          items:
            $ref: '#/components/schemas/WorkHoursReportEntry'
        generatedAt:
          type: string
          format: date-time
          description: 生成日時

    WorkHoursReportEntry:
      type: object
      properties:
        groupKey:
          type: string
          description: グループキー（技術者ID、プロジェクトIDなど）
        groupName:
          type: string
          description: グループ名
        period:
          type: string
          description: 期間
        summary:
          $ref: '#/components/schemas/WorkHoursSummary'
        timesheets:
          type: array
          items:
            type: object
            properties:
              timesheetId:
                type: string
                format: uuid
              period:
                type: string
              status:
                $ref: '#/components/schemas/TimesheetStatus'
              summary:
                $ref: '#/components/schemas/WorkHoursSummary'

    ComplianceReportResponse:
      type: object
      properties:
        reportId:
          type: string
          format: uuid
          description: レポートID
        periodFrom:
          type: string
          description: 期間開始月
        periodTo:
          type: string
          description: 期間終了月
        totalEngineers:
          type: integer
          description: 対象技術者数
        totalViolations:
          type: integer
          description: 総違反数
        riskSummary:
          type: object
          properties:
            critical:
              type: integer
            high:
              type: integer
            medium:
              type: integer
            low:
              type: integer
        violations:
          type: array
          items:
            $ref: '#/components/schemas/ComplianceViolation'
        recommendations:
          type: array
          items:
            type: string
        generatedAt:
          type: string
          format: date-time
          description: 生成日時

    ComplianceViolation:
      type: object
      properties:
        engineerId:
          type: string
          format: uuid
          description: 技術者ID
        engineerName:
          type: string
          description: 技術者名
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        period:
          type: string
          description: 対象月
        violationType:
          type: string
          enum: [overtime_limit, consecutive_work_days, legal_working_hours, night_work_limit]
          description: 違反種別
        riskLevel:
          type: string
          enum: [low, medium, high, critical]
          description: リスクレベル
        description:
          type: string
          description: 違反内容説明
        actualValue:
          type: number
          description: 実際の値
        legalLimit:
          type: number
          description: 法的上限
        recommendedAction:
          type: string
          description: 推奨対応

    ApprovalStatusReportResponse:
      type: object
      properties:
        reportId:
          type: string
          format: uuid
          description: レポートID
        period:
          type: string
          description: 対象月
        totalTimesheets:
          type: integer
          description: 総工数表数
        statusSummary:
          type: object
          additionalProperties:
            type: integer
          description: ステータス別集計
        approvalProgress:
          type: object
          properties:
            submitted:
              type: integer
            firstApprovalCompleted:
              type: integer
            secondApprovalCompleted:
              type: integer
            finalApprovalCompleted:
              type: integer
        overdueTimesheets:
          type: array
          items:
            type: object
            properties:
              timesheetId:
                type: string
                format: uuid
              engineerId:
                type: string
                format: uuid
              engineerName:
                type: string
              projectName:
                type: string
              daysOverdue:
                type: integer
              currentApprovalLevel:
                $ref: '#/components/schemas/ApprovalLevel'
        approverWorkload:
          type: array
          items:
            type: object
            properties:
              approverId:
                type: string
                format: uuid
              approverName:
                type: string
              pendingCount:
                type: integer
              avgApprovalTime:
                type: number
                format: float
        generatedAt:
          type: string
          format: date-time
          description: 生成日時

    # ==================== Export ====================
    BulkExportTimesheetRequest:
      type: object
      required:
        - timesheetIds
        - format
      properties:
        timesheetIds:
          type: array
          items:
            type: string
            format: uuid
          minItems: 1
          maxItems: 100
          description: 工数表IDリスト
        format:
          type: string
          enum: [pdf, excel, csv]
          description: エクスポート形式
        template:
          type: string
          enum: [standard, customer_format, detailed]
          default: standard
          description: 使用テンプレート
        includeSignatures:
          type: boolean
          default: false
          description: 電子署名を含む
        groupByProject:
          type: boolean
          default: false
          description: プロジェクト別にグループ化

    # ==================== Validation ====================
    ValidationConfigRequest:
      type: object
      properties:
        enableLegalCompliance:
          type: boolean
          default: true
          description: 法的コンプライアンスチェック有効
        enableBusinessRules:
          type: boolean
          default: true
          description: ビジネスルールチェック有効
        enableDetailedValidation:
          type: boolean
          default: false
          description: 詳細バリデーション有効
        customRules:
          type: array
          items:
            $ref: '#/components/schemas/ValidationRule'
          description: カスタムバリデーションルール

    ValidationResultResponse:
      type: object
      properties:
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        isValid:
          type: boolean
          description: バリデーション結果
        errors:
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
        warnings:
          type: array
          items:
            $ref: '#/components/schemas/ValidationWarning'
        summary:
          type: object
          properties:
            totalErrors:
              type: integer
            totalWarnings:
              type: integer
            criticalErrors:
              type: integer
            legalComplianceIssues:
              type: integer
        validatedAt:
          type: string
          format: date-time
          description: バリデーション実行日時

    ValidationError:
      type: object
      properties:
        code:
          type: string
          description: エラーコード
        message:
          type: string
          description: エラーメッセージ
        field:
          type: string
          description: 対象フィールド
        value:
          type: string
          description: 問題のある値
        severity:
          type: string
          enum: [error, warning, info]
          description: 重要度
        category:
          type: string
          enum: [legal_compliance, business_rule, data_integrity, performance]
          description: エラーカテゴリ

    ValidationWarning:
      type: object
      properties:
        code:
          type: string
          description: 警告コード
        message:
          type: string
          description: 警告メッセージ
        field:
          type: string
          description: 対象フィールド
        recommendation:
          type: string
          description: 推奨対応

    ValidationRule:
      type: object
      properties:
        name:
          type: string
          description: ルール名
        condition:
          type: string
          description: 条件
        message:
          type: string
          description: エラーメッセージ
        severity:
          type: string
          enum: [error, warning, info]
          description: 重要度

    # ==================== Analytics ====================
    TimesheetDashboardResponse:
      type: object
      properties:
        period:
          type: string
          description: 対象月
        summary:
          type: object
          properties:
            totalTimesheets:
              type: integer
            draftTimesheets:
              type: integer
            pendingApprovalTimesheets:
              type: integer
            approvedTimesheets:
              type: integer
            rejectedTimesheets:
              type: integer
            overdueTimesheets:
              type: integer
            healthRiskTimesheets:
              type: integer
        workHoursTrends:
          type: array
          items:
            type: object
            properties:
              period:
                type: string
              totalHours:
                type: integer
              overtimeHours:
                type: integer
              averageHours:
                type: number
                format: float
        complianceStatus:
          type: object
          properties:
            compliantTimesheets:
              type: integer
            violationCount:
              type: integer
            criticalViolations:
              type: integer
            complianceRate:
              type: number
              format: float
        approvalMetrics:
          type: object
          properties:
            averageApprovalTime:
              type: number
              format: float
            firstApprovalRate:
              type: number
              format: float
            rejectionRate:
              type: number
              format: float
        topMetrics:
          type: object
          properties:
            highestOvertimeEngineers:
              type: array
              items:
                type: object
                properties:
                  engineerId:
                    type: string
                    format: uuid
                  engineerName:
                    type: string
                  overtimeHours:
                    type: integer
            mostActiveProjects:
              type: array
              items:
                type: object
                properties:
                  projectId:
                    type: string
                    format: uuid
                  projectName:
                    type: string
                  timesheetCount:
                    type: integer
                  totalHours:
                    type: integer
        alerts:
          type: array
          items:
            type: object
            properties:
              type:
                type: string
                enum: [overdue, health_risk, compliance_violation, approval_delay]
              message:
                type: string
              count:
                type: integer
              severity:
                type: string
                enum: [low, medium, high, critical]
        generatedAt:
          type: string
          format: date-time
          description: 生成日時

    # ==================== Supporting Objects ====================
    WorkTask:
      type: object
      properties:
        taskName:
          type: string
          description: タスク名
        description:
          type: string
          description: タスク内容
        hours:
          type: number
          format: float
          description: 作業時間
        category:
          type: string
          description: カテゴリ

    DaySettings:
      type: object
      properties:
        isWorkingDay:
          type: boolean
          description: 勤務日フラグ
        defaultStartTime:
          type: string
          format: time
          description: デフォルト開始時刻
        defaultEndTime:
          type: string
          format: time
          description: デフォルト終了時刻
        defaultBreakMinutes:
          type: integer
          description: デフォルト休憩時間

    ApprovalFlowTemplate:
      type: object
      properties:
        steps:
          type: array
          items:
            type: object
            properties:
              level:
                $ref: '#/components/schemas/ApprovalLevel'
              stepName:
                type: string
              isRequired:
                type: boolean
              approverRoles:
                type: array
                items:
                  type: string

    # ==================== Enums ====================
    TimesheetStatus:
      type: string
      enum:
        - DRAFT
        - PENDING_APPROVAL
        - APPROVED
        - REJECTED
      description: |
        工数表ステータス:
        - DRAFT: ドラフト
        - PENDING_APPROVAL: 承認待ち
        - APPROVED: 承認済
        - REJECTED: 差し戻し

    AttendanceType:
      type: string
      enum:
        - WORK
        - PAID_LEAVE
        - SICK_LEAVE
        - SPECIAL_LEAVE
        - UNPAID_LEAVE
        - HOLIDAY
      description: |
        勤怠種別:
        - WORK: 勤務
        - PAID_LEAVE: 有給休暇
        - SICK_LEAVE: 病気休暇
        - SPECIAL_LEAVE: 特別休暇
        - UNPAID_LEAVE: 無給休暇
        - HOLIDAY: 休日

    WorkLocation:
      type: string
      enum:
        - CLIENT_OFFICE
        - COMPANY_OFFICE
        - REMOTE
        - OTHER
      description: |
        勤務地:
        - CLIENT_OFFICE: 顧客先
        - COMPANY_OFFICE: 自社オフィス
        - REMOTE: リモート
        - OTHER: その他

    SpecialWorkType:
      type: string
      enum:
        - OVERTIME
        - HOLIDAY_WORK
        - NIGHT_WORK
        - EMERGENCY_WORK
        - TRAINING
        - MEETING
      description: |
        特別作業種別:
        - OVERTIME: 残業
        - HOLIDAY_WORK: 休日出勤
        - NIGHT_WORK: 深夜作業
        - EMERGENCY_WORK: 緊急作業
        - TRAINING: 研修
        - MEETING: 会議

    ApprovalStatus:
      type: string
      enum:
        - NOT_STARTED
        - IN_PROGRESS
        - COMPLETED
        - REJECTED
      description: |
        承認フローステータス:
        - NOT_STARTED: 未開始
        - IN_PROGRESS: 承認中
        - COMPLETED: 承認完了
        - REJECTED: 差し戻し

    ApprovalLevel:
      type: string
      enum:
        - FIRST_APPROVAL
        - SECOND_APPROVAL
        - FINAL_APPROVAL
      description: |
        承認レベル:
        - FIRST_APPROVAL: 一次承認（PM・TL）
        - SECOND_APPROVAL: 二次承認（顧客・連携先）
        - FINAL_APPROVAL: 最終承認（管理部門）

    ApprovalStepStatus:
      type: string
      enum:
        - NOT_STARTED
        - PENDING
        - APPROVED
        - REJECTED
      description: |
        承認ステップステータス:
        - NOT_STARTED: 未開始
        - PENDING: 承認待ち
        - APPROVED: 承認済
        - REJECTED: 差し戻し

    AdjustmentType:
      type: string
      enum:
        - OVERTIME_ADJUSTMENT
        - WORKING_HOURS_CORRECTION
        - LEAVE_ADJUSTMENT
        - CALCULATION_ERROR_FIX
        - POLICY_COMPLIANCE
      description: |
        調整種別:
        - OVERTIME_ADJUSTMENT: 残業時間調整
        - WORKING_HOURS_CORRECTION: 労働時間修正
        - LEAVE_ADJUSTMENT: 休暇調整
        - CALCULATION_ERROR_FIX: 計算エラー修正
        - POLICY_COMPLIANCE: ポリシー準拠調整

    # ==================== Pagination ====================
    TimesheetPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/TimesheetResponse'
        page:
          $ref: '#/components/schemas/PageInfo'

    PageInfo:
      type: object
      properties:
        number:
          type: integer
          description: 現在のページ番号
        size:
          type: integer
          description: ページサイズ
        totalElements:
          type: integer
          format: int64
          description: 総要素数
        totalPages:
          type: integer
          description: 総ページ数
        first:
          type: boolean
          description: 最初のページかどうか
        last:
          type: boolean
          description: 最後のページかどうか

    # ==================== Common Objects ====================
    AuditInfo:
      type: object
      properties:
        createdBy:
          type: string
          format: uuid
          description: 作成者ID
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        lastModifiedBy:
          type: string
          format: uuid
          description: 最終更新者ID
        lastModifiedAt:
          type: string
          format: date-time
          description: 最終更新日時

    ErrorResponse:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
          description: エラー発生時刻
        status:
          type: integer
          description: HTTPステータスコード
        error:
          type: string
          description: エラー種別
        message:
          type: string
          description: エラーメッセージ
        path:
          type: string
          description: リクエストパス
        validationErrors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
          description: バリデーションエラー詳細

  responses:
    BadRequest:
      description: 不正なリクエスト
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    Unauthorized:
      description: 認証エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    Forbidden:
      description: 権限エラー
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

    InternalServerError:
      description: 内部サーバーエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

## 3. Spring Boot 実装例

### 3.1 コントローラー実装

```java
@RestController
@RequestMapping("/api/v1/timesheets")
@Validated
public class TimesheetController {
    
    private final TimesheetApplicationService timesheetService;
    private final TimesheetAssembler timesheetAssembler;
    
    @GetMapping
    public ResponseEntity<PagedModel<TimesheetResponse>> getTimesheets(
            @RequestParam(required = false) UUID engineerId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID contractId,
            @RequestParam(required = false) TimesheetStatus status,
            @RequestParam(required = false) @Pattern(regexp = "^[0-9]{4}-[0-9]{2}$") String period,
            @RequestParam(required = false) @Pattern(regexp = "^[0-9]{4}-[0-9]{2}$") String periodFrom,
            @RequestParam(required = false) @Pattern(regexp = "^[0-9]{4}-[0-9]{2}$") String periodTo,
            @RequestParam(required = false) Integer dueWithinDays,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false) Boolean isHealthRisk,
            Pageable pageable) {
        
        TimesheetSearchCriteria criteria = TimesheetSearchCriteria.builder()
            .engineerId(engineerId)
            .projectId(projectId)
            .contractId(contractId)
            .status(status)
            .period(period != null ? YearMonth.parse(period) : null)
            .periodFrom(periodFrom != null ? YearMonth.parse(periodFrom) : null)
            .periodTo(periodTo != null ? YearMonth.parse(periodTo) : null)
            .dueWithinDays(dueWithinDays)
            .isOverdue(isOverdue)
            .isHealthRisk(isHealthRisk)
            .build();
            
        Page<Timesheet> timesheets = timesheetService.searchTimesheets(criteria, pageable);
        
        return ResponseEntity.ok(
            timesheetAssembler.toPagedModel(timesheets)
        );
    }
    
    @PostMapping
    public ResponseEntity<TimesheetResponse> createTimesheet(
            @Valid @RequestBody CreateTimesheetRequest request) {
        
        CreateTimesheetCommand command = CreateTimesheetCommand.builder()
            .engineerId(request.getEngineerId())
            .contractId(request.getContractId())
            .projectId(request.getProjectId())
            .period(YearMonth.parse(request.getPeriod()))
            .templateId(request.getTemplateId())
            .engineerComment(request.getEngineerComment())
            .build();
            
        Timesheet timesheet = timesheetService.createTimesheet(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(timesheetAssembler.toModel(timesheet));
    }
    
    @PostMapping("/bulk")
    public ResponseEntity<BulkCreateTimesheetResponse> bulkCreateTimesheets(
            @Valid @RequestBody BulkCreateTimesheetRequest request) {
        
        BulkCreateTimesheetCommand command = BulkCreateTimesheetCommand.builder()
            .period(YearMonth.parse(request.getPeriod()))
            .contractIds(request.getContractIds())
            .templateId(request.getTemplateId())
            .build();
            
        BulkCreateTimesheetResult result = timesheetService.bulkCreateTimesheets(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(timesheetAssembler.toBulkCreateModel(result));
    }
    
    @GetMapping("/{timesheetId}")
    public ResponseEntity<TimesheetDetailResponse> getTimesheet(
            @PathVariable UUID timesheetId) {
        
        Timesheet timesheet = timesheetService.getTimesheet(timesheetId);
        
        return ResponseEntity.ok(
            timesheetAssembler.toDetailModel(timesheet)
        );
    }
    
    @PutMapping("/{timesheetId}")
    public ResponseEntity<TimesheetResponse> updateTimesheet(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody UpdateTimesheetRequest request) {
        
        UpdateTimesheetCommand command = UpdateTimesheetCommand.builder()
            .timesheetId(timesheetId)
            .engineerComment(request.getEngineerComment())
            .version(request.getVersion())
            .build();
            
        Timesheet timesheet = timesheetService.updateTimesheet(command);
        
        return ResponseEntity.ok(
            timesheetAssembler.toModel(timesheet)
        );
    }
    
    @DeleteMapping("/{timesheetId}")
    public ResponseEntity<Void> deleteTimesheet(
            @PathVariable UUID timesheetId) {
        
        timesheetService.deleteTimesheet(timesheetId);
        
        return ResponseEntity.noContent().build();
    }
}
```

### 3.2 勤怠データ管理コントローラー

```java
@RestController
@RequestMapping("/api/v1/timesheets/{timesheetId}/attendances")
@Validated
public class AttendanceController {
    
    private final TimesheetApplicationService timesheetService;
    private final AttendanceAssembler attendanceAssembler;
    
    @GetMapping
    public ResponseEntity<AttendanceListResponse> getAttendances(
            @PathVariable UUID timesheetId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) AttendanceType attendanceType) {
        
        AttendanceSearchCriteria criteria = AttendanceSearchCriteria.builder()
            .timesheetId(timesheetId)
            .dateFrom(dateFrom)
            .dateTo(dateTo)
            .attendanceType(attendanceType)
            .build();
            
        List<DailyAttendance> attendances = timesheetService.getAttendances(criteria);
        
        return ResponseEntity.ok(
            attendanceAssembler.toListModel(timesheetId, attendances)
        );
    }
    
    @PutMapping("/{date}")
    public ResponseEntity<AttendanceResponse> updateAttendance(
            @PathVariable UUID timesheetId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @Valid @RequestBody UpdateAttendanceRequest request) {
        
        UpdateAttendanceCommand command = UpdateAttendanceCommand.builder()
            .timesheetId(timesheetId)
            .date(date)
            .type(request.getType())
            .startTime(request.getStartTime())
            .endTime(request.getEndTime())
            .breakStartTime(request.getBreakStartTime())
            .breakEndTime(request.getBreakEndTime())
            .workLocation(request.getWorkLocation())
            .workLocationDetails(request.getWorkLocationDetails())
            .dailyComment(request.getDailyComment())
            .tasks(request.getTasks())
            .build();
            
        DailyAttendance attendance = timesheetService.updateAttendance(command);
        
        return ResponseEntity.ok(
            attendanceAssembler.toModel(attendance)
        );
    }
    
    @PostMapping
    public ResponseEntity<AttendanceListResponse> bulkUpdateAttendances(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody BulkUpdateAttendanceRequest request) {
        
        List<UpdateAttendanceCommand> commands = request.getAttendances().stream()
            .map(entry -> UpdateAttendanceCommand.builder()
                .timesheetId(timesheetId)
                .date(entry.getDate())
                .type(entry.getAttendanceData().getType())
                .startTime(entry.getAttendanceData().getStartTime())
                .endTime(entry.getAttendanceData().getEndTime())
                .breakStartTime(entry.getAttendanceData().getBreakStartTime())
                .breakEndTime(entry.getAttendanceData().getBreakEndTime())
                .workLocation(entry.getAttendanceData().getWorkLocation())
                .workLocationDetails(entry.getAttendanceData().getWorkLocationDetails())
                .dailyComment(entry.getAttendanceData().getDailyComment())
                .tasks(entry.getAttendanceData().getTasks())
                .build())
            .collect(toList());
            
        List<DailyAttendance> attendances = timesheetService.bulkUpdateAttendances(commands);
        
        return ResponseEntity.ok(
            attendanceAssembler.toListModel(timesheetId, attendances)
        );
    }
}
```

### 3.3 承認ワークフローコントローラー

```java
@RestController
@RequestMapping("/api/v1/timesheets")
@Validated
public class TimesheetApprovalController {
    
    private final TimesheetApplicationService timesheetService;
    private final TimesheetAssembler timesheetAssembler;
    
    @PostMapping("/{timesheetId}/submit")
    public ResponseEntity<TimesheetResponse> submitTimesheet(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody SubmitTimesheetRequest request) {
        
        SubmitTimesheetCommand command = SubmitTimesheetCommand.builder()
            .timesheetId(timesheetId)
            .finalComment(request.getFinalComment())
            .forceSubmit(request.getForceSubmit())
            .build();
            
        Timesheet timesheet = timesheetService.submitTimesheet(command);
        
        return ResponseEntity.ok(
            timesheetAssembler.toModel(timesheet)
        );
    }
    
    @PostMapping("/{timesheetId}/approve")
    public ResponseEntity<TimesheetResponse> approveTimesheet(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody ApproveTimesheetRequest request,
            Authentication authentication) {
        
        ApproveTimesheetCommand command = ApproveTimesheetCommand.builder()
            .timesheetId(timesheetId)
            .approverId(UUID.fromString(authentication.getName()))
            .approvalLevel(request.getApprovalLevel())
            .approvalComment(request.getApprovalComment())
            .adjustments(request.getAdjustments())
            .build();
            
        Timesheet timesheet = timesheetService.approveTimesheet(command);
        
        return ResponseEntity.ok(
            timesheetAssembler.toModel(timesheet)
        );
    }
    
    @PostMapping("/{timesheetId}/reject")
    public ResponseEntity<TimesheetResponse> rejectTimesheet(
            @PathVariable UUID timesheetId,
            @Valid @RequestBody RejectTimesheetRequest request,
            Authentication authentication) {
        
        RejectTimesheetCommand command = RejectTimesheetCommand.builder()
            .timesheetId(timesheetId)
            .rejectorId(UUID.fromString(authentication.getName()))
            .rejectionReason(request.getRejectionReason())
            .rejectionCategory(request.getRejectionCategory())
            .requiredActions(request.getRequiredActions())
            .build();
            
        Timesheet timesheet = timesheetService.rejectTimesheet(command);
        
        return ResponseEntity.ok(
            timesheetAssembler.toModel(timesheet)
        );
    }
    
    @PostMapping("/bulk-approve")
    public ResponseEntity<BulkApproveTimesheetResponse> bulkApproveTimesheets(
            @Valid @RequestBody BulkApproveTimesheetRequest request,
            Authentication authentication) {
        
        BulkApproveTimesheetCommand command = BulkApproveTimesheetCommand.builder()
            .timesheetIds(request.getTimesheetIds())
            .approverId(UUID.fromString(authentication.getName()))
            .approvalLevel(request.getApprovalLevel())
            .approvalComment(request.getApprovalComment())
            .continueOnError(request.getContinueOnError())
            .build();
            
        BulkApproveTimesheetResult result = timesheetService.bulkApproveTimesheets(command);
        
        return ResponseEntity.ok(
            timesheetAssembler.toBulkApproveModel(result)
        );
    }
}
```

### 3.4 アプリケーションサービス

```java
@Service
@Transactional
public class TimesheetApplicationService {
    
    private final TimesheetRepository timesheetRepository;
    private final TimesheetDomainService timesheetDomainService;
    private final TimesheetValidationService validationService;
    private final ContractRepository contractRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    public Page<Timesheet> searchTimesheets(TimesheetSearchCriteria criteria, Pageable pageable) {
        return timesheetRepository.findByCriteria(criteria, pageable);
    }
    
    public Timesheet createTimesheet(CreateTimesheetCommand command) {
        // 契約の取得と検証
        Contract contract = contractRepository.findById(command.getContractId())
            .orElseThrow(() -> new ContractNotFoundException(command.getContractId()));
            
        // 重複チェック
        Optional<Timesheet> existing = timesheetRepository.findByEngineerAndPeriod(
            command.getEngineerId(), command.getPeriod());
        if (existing.isPresent()) {
            throw new TimesheetAlreadyExistsException(command.getEngineerId(), command.getPeriod());
        }
        
        // ドメインサービスで工数表作成
        Timesheet timesheet = Timesheet.create(
            command.getEngineerId(),
            command.getContractId(),
            command.getProjectId(),
            command.getPeriod(),
            contract
        );
        
        // 初期コメント設定
        if (command.getEngineerComment() != null) {
            timesheet.setEngineerComment(command.getEngineerComment());
        }
        
        // 保存
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);
        
        // イベント発行
        publishTimesheetEvents(savedTimesheet);
        
        return savedTimesheet;
    }
    
    public BulkCreateTimesheetResult bulkCreateTimesheets(BulkCreateTimesheetCommand command) {
        return timesheetDomainService.createMonthlyTimesheets(
            command.getPeriod(),
            command.getContractIds()
        );
    }
    
    public Timesheet submitTimesheet(SubmitTimesheetCommand command) {
        Timesheet timesheet = timesheetRepository.findById(command.getTimesheetId())
            .orElseThrow(() -> new TimesheetNotFoundException(command.getTimesheetId()));
            
        // バリデーション実行
        if (!command.getForceSubmit()) {
            List<ValidationError> errors = validationService.validateTimesheet(timesheet);
            if (!errors.isEmpty()) {
                throw new TimesheetValidationException(errors);
            }
        }
        
        // 最終コメント設定
        if (command.getFinalComment() != null) {
            timesheet.setEngineerComment(command.getFinalComment());
        }
        
        // 提出処理
        timesheet.submitForApproval();
        
        // 保存
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);
        publishTimesheetEvents(savedTimesheet);
        
        return savedTimesheet;
    }
    
    public Timesheet approveTimesheet(ApproveTimesheetCommand command) {
        Timesheet timesheet = timesheetRepository.findById(command.getTimesheetId())
            .orElseThrow(() -> new TimesheetNotFoundException(command.getTimesheetId()));
            
        // 調整項目の追加
        if (command.getAdjustments() != null) {
            for (AddAdjustmentRequest adjustmentRequest : command.getAdjustments()) {
                AttendanceAdjustment adjustment = new AttendanceAdjustment(
                    adjustmentRequest.getType(),
                    adjustmentRequest.getDate(),
                    adjustmentRequest.getAdjustmentHours(),
                    adjustmentRequest.getReason(),
                    adjustmentRequest.getDescription()
                );
                timesheet.addAdjustment(adjustment, command.getApproverId());
            }
        }
        
        // 承認処理
        timesheet.approve(
            command.getApproverId(),
            command.getApprovalLevel(),
            command.getApprovalComment()
        );
        
        // 保存
        Timesheet savedTimesheet = timesheetRepository.save(timesheet);
        publishTimesheetEvents(savedTimesheet);
        
        return savedTimesheet;
    }
    
    public DailyAttendance updateAttendance(UpdateAttendanceCommand command) {
        Timesheet timesheet = timesheetRepository.findById(command.getTimesheetId())
            .orElseThrow(() -> new TimesheetNotFoundException(command.getTimesheetId()));
            
        // 勤怠データの作成
        AttendanceData attendanceData = AttendanceData.builder()
            .type(command.getType())
            .startTime(command.getStartTime())
            .endTime(command.getEndTime())
            .breakStartTime(command.getBreakStartTime())
            .breakEndTime(command.getBreakEndTime())
            .workLocation(command.getWorkLocation())
            .workLocationDetails(command.getWorkLocationDetails())
            .dailyComment(command.getDailyComment())
            .tasks(command.getTasks())
            .build();
            
        // 勤怠データ更新
        timesheet.addOrUpdateAttendance(command.getDate(), attendanceData);
        
        // 保存
        timesheetRepository.save(timesheet);
        publishTimesheetEvents(timesheet);
        
        // 更新された勤怠データを返す
        return timesheet.getAttendances().stream()
            .filter(attendance -> attendance.getDate().equals(command.getDate()))
            .findFirst()
            .orElseThrow(() -> new IllegalStateException("勤怠データの更新に失敗しました"));
    }
    
    private void publishTimesheetEvents(Timesheet timesheet) {
        timesheet.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        timesheet.markEventsAsCommitted();
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC + ABAC (Attribute-Based Access Control)
- **権限レベル**:
  - `timesheet:read` - 工数表情報参照
  - `timesheet:write` - 工数表情報更新
  - `timesheet:approve` - 工数表承認
  - `timesheet:admin` - 全工数表管理
  - `timesheet:self` - 自身の工数表管理
  - `timesheet:export` - 工数表エクスポート

### 4.2 データプライバシー
- 個人勤怠データの暗号化保存
- アクセスログの詳細記録
- GDPR対応 (削除権、忘れられる権利)
- 匿名化オプション
- 労働時間データの機密性保護

### 4.3 承認権限制御
- 階層的承認権限の管理
- プロジェクト別承認者設定
- 一括承認権限の制限
- 調整項目追加権限の制御

## 5. パフォーマンス要件

### 5.1 応答時間
- 工数表一覧取得: < 800ms
- 工数表詳細取得: < 400ms
- 勤怠データ更新: < 300ms
- 承認処理: < 500ms
- レポート生成: < 3s
- 一括操作: < 10s

### 5.2 キャッシュ戦略
- 工数表基本情報: Redis (1時間)
- 承認フロー設定: Application Cache (30分)
- テンプレート情報: Application Cache (1時間)
- 統計データ: Redis (15分)
- バリデーションルール: Application Cache (1時間)

### 5.3 バッチ処理最適化
- 月次工数表一括作成の最適化
- 承認期限通知の効率化
- レポート生成の非同期処理
- 大量データエクスポートの分割処理

## 6. 法的コンプライアンス

### 6.1 労働基準法対応
- 法定労働時間監視 (週40時間、月160時間)
- 時間外労働上限チェック (月45時間、年360時間)
- 休憩時間確保の監視
- 連続労働日数制限 (最大6日)
- 深夜労働時間管理

### 6.2 健康管理対応
- 過労死ライン監視 (月80時間残業)
- ストレスチェック対象者識別
- 健康診断対象者管理
- 医師面接指導対象者抽出

### 6.3 コンプライアンス報告
- 労働時間法違反レポート
- 健康リスク従業員リスト
- 改善勧告自動生成
- 監督署対応資料作成

## 7. 監視・ロギング

### 7.1 業務ログ
- 工数表作成・更新・削除・承認履歴
- 勤怠データ変更履歴
- 承認フロー実行履歴
- 調整項目追加履歴
- バリデーションエラー発生履歴
- エクスポート実行履歴

### 7.2 パフォーマンス監視
- API応答時間
- データベースクエリ性能
- バッチ処理実行時間
- キャッシュヒット率
- 承認処理完了率
- レポート生成時間

### 7.3 アラート設定
- 期限超過工数表アラート
- 法的コンプライアンス違反アラート
- 健康リスクレベル到達アラート
- 承認遅延アラート
- システム異常アラート

---

**作成者**: システム化プロジェクトチーム