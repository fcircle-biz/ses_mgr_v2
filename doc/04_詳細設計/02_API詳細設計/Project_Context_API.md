# Project Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Project Management Service
- **ベースURL**: `https://api.ses-mgr.com/project/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 案件の受注から提案までのライフサイクル管理
- 案件要件の定義と管理
- 顧客情報の管理
- 案件ステータスの追跡

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Project Management API
  description: SES案件管理システムのプロジェクト管理API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/project/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/project/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 案件管理 ====================
  /projects:
    get:
      summary: 案件一覧取得
      description: 案件の一覧を取得します。フィルタリングとページングに対応しています。
      tags:
        - Projects
      parameters:
        - name: status
          in: query
          description: 案件ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/ProjectStatus'
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: skillCategory
          in: query
          description: 必要スキルカテゴリでフィルタ
          schema:
            type: string
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
          description: ソート条件 (createdAt,desc など)
          schema:
            type: string
            default: "createdAt,desc"
      responses:
        '200':
          description: 案件一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規案件作成
      description: 新しい案件を作成します。
      tags:
        - Projects
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
      responses:
        '201':
          description: 案件作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: 案件名の重複エラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /projects/{projectId}:
    get:
      summary: 案件詳細取得
      description: 指定されたIDの案件詳細を取得します。
      tags:
        - Projects
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 案件詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectDetailResponse'
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
      summary: 案件情報更新
      description: 案件の基本情報を更新します。
      tags:
        - Projects
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProjectRequest'
      responses:
        '200':
          description: 案件更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
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

    delete:
      summary: 案件削除
      description: 案件を削除します。提案開始後は削除できません。
      tags:
        - Projects
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 案件削除成功
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

  # ==================== 案件ステータス管理 ====================
  /projects/{projectId}/status:
    patch:
      summary: 案件ステータス更新
      description: 案件のステータスを更新します。
      tags:
        - Projects
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProjectStatusRequest'
      responses:
        '200':
          description: ステータス更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 無効なステータス遷移
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 提案管理 ====================
  /projects/{projectId}/proposals:
    get:
      summary: 提案一覧取得
      description: 案件に対する提案の一覧を取得します。
      tags:
        - Proposals
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 提案一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ProposalResponse'
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
      summary: 提案開始
      description: 案件の提案プロセスを開始します。
      tags:
        - Proposals
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StartProposalRequest'
      responses:
        '201':
          description: 提案開始成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProposalResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 提案開始不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /projects/{projectId}/proposals/{proposalId}:
    put:
      summary: 提案内容更新
      description: 提案の内容を更新します。
      tags:
        - Proposals
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
        - name: proposalId
          in: path
          required: true
          description: 提案ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProposalRequest'
      responses:
        '200':
          description: 提案更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProposalResponse'
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

  /projects/{projectId}/proposals/{proposalId}/submit:
    post:
      summary: 提案提出
      description: 提案を顧客に提出します。
      tags:
        - Proposals
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
        - name: proposalId
          in: path
          required: true
          description: 提案ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 提案提出成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProposalResponse'
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

  # ==================== 受注管理 ====================
  /projects/{projectId}/accept-order:
    post:
      summary: 受注確定
      description: 案件の受注を確定します。
      tags:
        - Projects
      parameters:
        - name: projectId
          in: path
          required: true
          description: 案件ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AcceptOrderRequest'
      responses:
        '200':
          description: 受注確定成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 受注確定不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 検索・統計 ====================
  /projects/search:
    post:
      summary: 高度な案件検索
      description: 複数条件での高度な案件検索を実行します。
      tags:
        - Projects
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProjectSearchRequest'
      responses:
        '200':
          description: 検索成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /projects/statistics:
    get:
      summary: 案件統計情報取得
      description: 案件の統計情報を取得します。
      tags:
        - Statistics
      parameters:
        - name: period
          in: query
          description: 集計期間 (月単位: 2024-01)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
      responses:
        '200':
          description: 統計情報取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectStatisticsResponse'
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
    ProjectResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 案件ID
        name:
          type: string
          description: 案件名
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        status:
          $ref: '#/components/schemas/ProjectStatus'
        requirement:
          $ref: '#/components/schemas/ProjectRequirement'
        period:
          $ref: '#/components/schemas/ProjectPeriod'
        budget:
          $ref: '#/components/schemas/Budget'
        proposalDeadline:
          type: string
          format: date-time
          description: 提案期限
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

    ProjectDetailResponse:
      allOf:
        - $ref: '#/components/schemas/ProjectResponse'
        - type: object
          properties:
            proposals:
              type: array
              items:
                $ref: '#/components/schemas/ProposalResponse'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateProjectRequest:
      type: object
      required:
        - name
        - customerId
        - requirement
        - period
        - budget
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200
          description: 案件名
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        requirement:
          $ref: '#/components/schemas/ProjectRequirement'
        period:
          $ref: '#/components/schemas/ProjectPeriod'
        budget:
          $ref: '#/components/schemas/Budget'
        proposalDeadline:
          type: string
          format: date-time
          description: 提案期限

    UpdateProjectRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 200
          description: 案件名
        requirement:
          $ref: '#/components/schemas/ProjectRequirement'
        budget:
          $ref: '#/components/schemas/Budget'
        proposalDeadline:
          type: string
          format: date-time
          description: 提案期限
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    UpdateProjectStatusRequest:
      type: object
      required:
        - status
        - version
      properties:
        status:
          $ref: '#/components/schemas/ProjectStatus'
        reason:
          type: string
          description: ステータス変更理由
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    AcceptOrderRequest:
      type: object
      required:
        - contractTerms
        - version
      properties:
        contractTerms:
          type: object
          description: 契約条件
        estimatedStartDate:
          type: string
          format: date
          description: 開始予定日
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    # ==================== Proposal Entities ====================
    ProposalResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 提案ID
        version:
          type: integer
          description: 提案バージョン
        status:
          $ref: '#/components/schemas/ProposalStatus'
        content:
          $ref: '#/components/schemas/ProposalContent'
        submittedAt:
          type: string
          format: date-time
          description: 提出日時
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    StartProposalRequest:
      type: object
      required:
        - proposalDeadline
      properties:
        proposalDeadline:
          type: string
          format: date-time
          description: 提案期限

    UpdateProposalRequest:
      type: object
      properties:
        content:
          $ref: '#/components/schemas/ProposalContent'

    ProposalContent:
      type: object
      properties:
        summary:
          type: string
          description: 提案概要
        approach:
          type: string
          description: アプローチ
        timeline:
          type: string
          description: スケジュール
        teamStructure:
          type: string
          description: チーム構成
        riskManagement:
          type: string
          description: リスク管理
        estimatedCost:
          type: number
          format: double
          description: 見積金額

    # ==================== Value Objects ====================
    ProjectRequirement:
      type: object
      properties:
        description:
          type: string
          description: 要件説明
        requiredSkills:
          type: array
          items:
            type: string
          description: 必要スキル
        experienceLevel:
          type: string
          enum: [JUNIOR, MIDDLE, SENIOR, EXPERT]
          description: 経験レベル
        workLocation:
          type: string
          enum: [REMOTE, CLIENT_SITE, HYBRID]
          description: 勤務地
        teamSize:
          type: integer
          minimum: 1
          description: チームサイズ
        specialRequirements:
          type: array
          items:
            type: string
          description: 特別要件

    ProjectPeriod:
      type: object
      properties:
        estimatedStartDate:
          type: string
          format: date
          description: 開始予定日
        estimatedEndDate:
          type: string
          format: date
          description: 終了予定日
        estimatedDurationMonths:
          type: integer
          minimum: 1
          description: 期間 (月)

    Budget:
      type: object
      properties:
        minAmount:
          type: number
          format: double
          minimum: 0
          description: 最小予算
        maxAmount:
          type: number
          format: double
          minimum: 0
          description: 最大予算
        currency:
          type: string
          enum: [JPY, USD]
          default: JPY
          description: 通貨

    # ==================== Enums ====================
    ProjectStatus:
      type: string
      enum:
        - INQUIRY
        - NEGOTIATING
        - PROPOSING
        - PROPOSAL_SUBMITTED
        - ORDERED
        - CANCELLED
      description: |
        案件ステータス:
        - INQUIRY: 問い合わせ
        - NEGOTIATING: 交渉中
        - PROPOSING: 提案作成中
        - PROPOSAL_SUBMITTED: 提案提出済
        - ORDERED: 受注
        - CANCELLED: キャンセル

    ProposalStatus:
      type: string
      enum:
        - DRAFT
        - SUBMITTED
        - ACCEPTED
        - REJECTED
      description: |
        提案ステータス:
        - DRAFT: ドラフト
        - SUBMITTED: 提出済
        - ACCEPTED: 受諾
        - REJECTED: 拒否

    # ==================== Search & Statistics ====================
    ProjectSearchRequest:
      type: object
      properties:
        keyword:
          type: string
          description: キーワード検索
        statuses:
          type: array
          items:
            $ref: '#/components/schemas/ProjectStatus'
          description: ステータス条件
        customerIds:
          type: array
          items:
            type: string
            format: uuid
          description: 顧客ID条件
        requiredSkills:
          type: array
          items:
            type: string
          description: 必要スキル条件
        budgetRange:
          type: object
          properties:
            min:
              type: number
              format: double
            max:
              type: number
              format: double
          description: 予算範囲
        periodRange:
          type: object
          properties:
            startFrom:
              type: string
              format: date
            startTo:
              type: string
              format: date
          description: 開始日範囲
        page:
          type: integer
          minimum: 0
          default: 0
          description: ページ番号
        size:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
          description: ページサイズ
        sort:
          type: string
          default: "createdAt,desc"
          description: ソート条件

    ProjectPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/ProjectResponse'
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

    ProjectStatisticsResponse:
      type: object
      properties:
        period:
          type: string
          description: 集計期間
        totalProjects:
          type: integer
          description: 総案件数
        statusDistribution:
          type: object
          additionalProperties:
            type: integer
          description: ステータス別分布
        averageBudget:
          type: number
          format: double
          description: 平均予算
        averageDuration:
          type: number
          format: double
          description: 平均期間 (月)
        topRequiredSkills:
          type: array
          items:
            type: object
            properties:
              skill:
                type: string
              count:
                type: integer
          description: 上位必要スキル

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

    # ==================== エラーレスポンス（強化版） ====================
    ErrorResponse:
      type: object
      required:
        - timestamp
        - status
        - errorCode
        - message
        - correlationId
        - severity
      properties:
        timestamp:
          type: string
          format: date-time
          description: エラー発生時刻
        status:
          type: integer
          description: HTTPステータスコード
        errorCode:
          type: string
          description: エラーコード（例：PROJECT_NOT_FOUND、PROPOSAL_DEADLINE_EXCEEDED）
          enum:
            # Project固有エラー
            - PROJECT_NOT_FOUND
            - PROJECT_STATUS_TRANSITION_INVALID
            - PROPOSAL_DEADLINE_EXCEEDED
            - BUDGET_CURRENCY_MISMATCH
            - FINAL_PROPOSAL_REQUIRED
            - PROJECT_ALREADY_ORDERED
            - CUSTOMER_NOT_FOUND
            - PROPOSAL_NOT_FOUND
            - PROPOSAL_ALREADY_SUBMITTED
            - PROJECT_BUDGET_EXCEEDED
            - PROPOSAL_COUNT_LIMIT_EXCEEDED
            - PROJECT_ASSIGNMENT_CONFLICT
            # 共通エラー
            - VALIDATION_ERROR
            - BUSINESS_RULE_VIOLATION
            - ENTITY_NOT_FOUND
            - ACCESS_DENIED
            - EXTERNAL_SERVICE_ERROR
            - SYSTEM_ERROR
        error:
          type: string
          description: エラー種別
        message:
          type: string
          description: 技術者向けエラーメッセージ
        userMessage:
          type: string
          description: エンドユーザー向けメッセージ
        path:
          type: string
          description: リクエストパス
        correlationId:
          type: string
          format: uuid
          description: 相関ID（ログ追跡用）
        severity:
          type: string
          enum: [LOW, MEDIUM, HIGH, CRITICAL]
          description: 重要度レベル
        retryable:
          type: boolean
          description: リトライ可能フラグ
        context:
          type: object
          additionalProperties: true
          description: エラーコンテキスト情報
        validationErrors:
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
          description: バリデーションエラー詳細
        stackTrace:
          type: string
          description: スタックトレース（開発環境のみ）

    ValidationError:
      type: object
      properties:
        field:
          type: string
          description: エラーフィールド名
        code:
          type: string
          description: エラーコード
        message:
          type: string
          description: エラーメッセージ
        rejectedValue:
          type: object
          description: 拒否された値

    # ビジネスルール違反エラー
    BusinessRuleViolationError:
      allOf:
        - $ref: '#/components/schemas/ErrorResponse'
        - type: object
          properties:
            ruleName:
              type: string
              description: 違反したルール名
            aggregateType:
              type: string
              description: 集約タイプ
            aggregateId:
              type: string
              description: 集約ID

    # 外部サービスエラー
    ExternalServiceError:
      allOf:
        - $ref: '#/components/schemas/ErrorResponse'
        - type: object
          properties:
            serviceName:
              type: string
              description: 外部サービス名
            operation:
              type: string
              description: 実行操作
            externalErrorCode:
              type: string
              description: 外部サービスのエラーコード
            retryAfter:
              type: integer
              description: リトライまでの秒数

  responses:
    # 400番台エラー
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

    Conflict:
      description: リソースの競合
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/BusinessRuleViolationError'

    UnprocessableEntity:
      description: 処理不可能なエンティティ
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    # 500番台エラー
    InternalServerError:
      description: 内部サーバーエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    BadGateway:
      description: 外部サービス連携エラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ExternalServiceError'

    ServiceUnavailable:
      description: サービス利用不可
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    GatewayTimeout:
      description: ゲートウェイタイムアウト
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ExternalServiceError'
```

## 3. Spring Boot 実装例

### 3.1 コントローラー実装

```java
@RestController
@RequestMapping("/api/v1/projects")
@Validated
public class ProjectController {
    
    private final ProjectApplicationService projectService;
    
    @GetMapping
    public ResponseEntity<PagedModel<ProjectResponse>> getProjects(
            @RequestParam(required = false) ProjectStatus status,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) String skillCategory,
            Pageable pageable) {
        
        ProjectSearchCriteria criteria = ProjectSearchCriteria.builder()
            .status(status)
            .customerId(customerId)
            .skillCategory(skillCategory)
            .build();
            
        Page<Project> projects = projectService.searchProjects(criteria, pageable);
        
        return ResponseEntity.ok(
            projectAssembler.toPagedModel(projects)
        );
    }
    
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request) {
        
        CreateProjectCommand command = CreateProjectCommand.builder()
            .name(request.getName())
            .customerId(request.getCustomerId())
            .requirement(request.getRequirement())
            .period(request.getPeriod())
            .budget(request.getBudget())
            .proposalDeadline(request.getProposalDeadline())
            .build();
            
        Project project = projectService.createProject(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(projectAssembler.toModel(project));
    }
    
    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectDetailResponse> getProject(
            @PathVariable UUID projectId) {
        
        Project project = projectService.getProject(projectId);
        
        return ResponseEntity.ok(
            projectAssembler.toDetailModel(project)
        );
    }
    
    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable UUID projectId,
            @Valid @RequestBody UpdateProjectRequest request) {
        
        UpdateProjectCommand command = UpdateProjectCommand.builder()
            .projectId(projectId)
            .name(request.getName())
            .requirement(request.getRequirement())
            .budget(request.getBudget())
            .proposalDeadline(request.getProposalDeadline())
            .version(request.getVersion())
            .build();
            
        Project project = projectService.updateProject(command);
        
        return ResponseEntity.ok(
            projectAssembler.toModel(project)
        );
    }
    
    @PostMapping("/{projectId}/accept-order")
    public ResponseEntity<ProjectResponse> acceptOrder(
            @PathVariable UUID projectId,
            @Valid @RequestBody AcceptOrderRequest request) {
        
        AcceptOrderCommand command = AcceptOrderCommand.builder()
            .projectId(projectId)
            .contractTerms(request.getContractTerms())
            .estimatedStartDate(request.getEstimatedStartDate())
            .version(request.getVersion())
            .build();
            
        Project project = projectService.acceptOrder(command);
        
        return ResponseEntity.ok(
            projectAssembler.toModel(project)
        );
    }
}
```

### 3.2 アプリケーションサービス

```java
@Service
@Transactional
public class ProjectApplicationService {
    
    private final ProjectRepository projectRepository;
    private final ProjectDomainService projectDomainService;
    private final ApplicationEventPublisher eventPublisher;
    
    public Page<Project> searchProjects(ProjectSearchCriteria criteria, Pageable pageable) {
        return projectRepository.findByCriteria(criteria, pageable);
    }
    
    public Project createProject(CreateProjectCommand command) {
        // ドメインサービスで案件作成
        Project project = projectDomainService.createProject(
            command.getName(),
            command.getCustomerId(),
            command.getRequirement(),
            command.getPeriod(),
            command.getBudget(),
            command.getProposalDeadline()
        );
        
        // 保存
        Project savedProject = projectRepository.save(project);
        
        // イベント発行
        publishProjectEvents(savedProject);
        
        return savedProject;
    }
    
    public Project acceptOrder(AcceptOrderCommand command) {
        // 案件取得
        Project project = projectRepository.findById(command.getProjectId())
            .orElseThrow(() -> new ProjectNotFoundException(command.getProjectId()));
            
        // バージョンチェック（楽観的ロック）
        if (!project.getVersion().equals(command.getVersion())) {
            throw new OptimisticLockException("プロジェクトが他のユーザーによって更新されています");
        }
        
        // 受注確定
        project.acceptOrder();
        
        // 保存
        Project savedProject = projectRepository.save(project);
        
        // イベント発行
        publishProjectEvents(savedProject);
        
        return savedProject;
    }
    
    private void publishProjectEvents(Project project) {
        project.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        project.markEventsAsCommitted();
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC (Role-Based Access Control)
- **権限レベル**:
  - `project:read` - 案件参照
  - `project:write` - 案件作成・更新
  - `project:delete` - 案件削除
  - `project:admin` - 全案件管理

### 4.2 APIセキュリティ
- HTTPS必須
- レート制限: 1000 req/min per user
- CORS設定: フロントエンド ドメインのみ許可
- 入力値検証: Bean Validation
- SQLインジェクション対策: PreparedStatement使用

## 5. エラーハンドリング

### 5.1 エラーレスポンス形式
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "案件名は必須です",
  "path": "/api/v1/projects",
  "validationErrors": [
    {
      "field": "name",
      "message": "案件名は必須です"
    }
  ]
}
```

### 5.2 主要なエラーコード
- `400` - バリデーションエラー
- `401` - 認証エラー 
- `403` - 権限不足
- `404` - リソース未発見
- `409` - ビジネスルール違反
- `500` - 内部サーバーエラー

## 6. パフォーマンス要件

### 6.1 応答時間
- 案件一覧取得: < 500ms
- 案件詳細取得: < 200ms
- 案件作成: < 1s
- 案件更新: < 1s

### 6.2 スループット
- 最大同時接続数: 1000
- 最大リクエスト数: 10000 req/min

## 7. 監視・ロギング

### 7.1 ログレベル
- `ERROR`: エラー・例外
- `WARN`: 警告・注意事項
- `INFO`: 業務イベント
- `DEBUG`: デバッグ情報

### 7.2 監視項目
- API応答時間
- エラー率
- スループット
- データベースパフォーマンス

---

**作成者**: システム化プロジェクトチーム