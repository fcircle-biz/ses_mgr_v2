# Matching Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Matching Service
- **ベースURL**: `https://api.ses-mgr.com/matching/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- プロジェクトと技術者のマッチング処理
- 候補者の生成と管理
- マッチングスコアの計算とランキング
- 候補者選定プロセスの管理

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Matching Service API
  description: SES案件管理システムのマッチングAPI
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/matching/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/matching/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== マッチング要求管理 ====================
  /matching-requests:
    get:
      summary: マッチング要求一覧取得
      description: マッチング要求の一覧を取得します。
      tags:
        - Matching Requests
      parameters:
        - name: projectId
          in: query
          description: プロジェクトIDでフィルタ
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          description: ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/MatchingStatus'
        - name: requestedBy
          in: query
          description: 要求者でフィルタ
          schema:
            type: string
            format: uuid
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
            default: "requestedAt,desc"
      responses:
        '200':
          description: マッチング要求一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingRequestPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規マッチング要求作成
      description: 新しいマッチング要求を作成します。
      tags:
        - Matching Requests
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateMatchingRequestRequest'
      responses:
        '201':
          description: マッチング要求作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingRequestResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: 重複するマッチング要求
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /matching-requests/{requestId}:
    get:
      summary: マッチング要求詳細取得
      description: 指定されたIDのマッチング要求詳細を取得します。
      tags:
        - Matching Requests
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: マッチング要求詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingRequestDetailResponse'
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
      summary: マッチング要求更新
      description: マッチング要求の情報を更新します。
      tags:
        - Matching Requests
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateMatchingRequestRequest'
      responses:
        '200':
          description: マッチング要求更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingRequestResponse'
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
      summary: マッチング要求削除
      description: マッチング要求を削除します。実行中の場合は削除できません。
      tags:
        - Matching Requests
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: マッチング要求削除成功
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

  # ==================== マッチング実行 ====================
  /matching-requests/{requestId}/execute:
    post:
      summary: マッチング実行
      description: マッチング要求に対してマッチング処理を実行します。
      tags:
        - Matching Execution
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExecuteMatchingRequest'
      responses:
        '200':
          description: マッチング実行成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingExecutionResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 実行不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /matching-requests/{requestId}/retry:
    post:
      summary: マッチング再実行
      description: 失敗したマッチング要求を再実行します。
      tags:
        - Matching Execution
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RetryMatchingRequest'
      responses:
        '200':
          description: マッチング再実行成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingExecutionResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 再実行不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 候補者管理 ====================
  /matching-requests/{requestId}/candidates:
    get:
      summary: 候補者一覧取得
      description: マッチング要求の候補者一覧を取得します。
      tags:
        - Candidates
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          description: 候補者ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/CandidateStatus'
        - name: minScore
          in: query
          description: 最小マッチングスコア
          schema:
            type: number
            format: double
            minimum: 0
            maximum: 1
        - name: sort
          in: query
          description: ソート条件
          schema:
            type: string
            default: "matchingScore,desc"
      responses:
        '200':
          description: 候補者一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CandidateResponse'
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

  /matching-requests/{requestId}/candidates/{candidateId}:
    get:
      summary: 候補者詳細取得
      description: 候補者の詳細情報とマッチング結果を取得します。
      tags:
        - Candidates
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
        - name: candidateId
          in: path
          required: true
          description: 候補者ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 候補者詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CandidateDetailResponse'
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
      summary: 候補者ステータス更新
      description: 候補者のステータスを更新します。
      tags:
        - Candidates
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
        - name: candidateId
          in: path
          required: true
          description: 候補者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateCandidateRequest'
      responses:
        '200':
          description: 候補者ステータス更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CandidateResponse'
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

  # ==================== 候補者選定 ====================
  /matching-requests/{requestId}/candidates/{candidateId}/select:
    post:
      summary: 候補者選定
      description: 候補者を選定します。
      tags:
        - Selection
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
        - name: candidateId
          in: path
          required: true
          description: 候補者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: false
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SelectCandidateRequest'
      responses:
        '200':
          description: 候補者選定成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CandidateSelectionResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 選定不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /matching-requests/{requestId}/candidates/{candidateId}/reject:
    post:
      summary: 候補者拒否
      description: 候補者を拒否します。
      tags:
        - Selection
      parameters:
        - name: requestId
          in: path
          required: true
          description: マッチング要求ID
          schema:
            type: string
            format: uuid
        - name: candidateId
          in: path
          required: true
          description: 候補者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RejectCandidateRequest'
      responses:
        '200':
          description: 候補者拒否成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CandidateResponse'
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
  /matching-requests/statistics:
    get:
      summary: マッチング統計情報取得
      description: マッチングの統計情報を取得します。
      tags:
        - Statistics
      parameters:
        - name: period
          in: query
          description: 集計期間 (月単位: 2024-01)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: projectId
          in: query
          description: プロジェクトIDでフィルタ
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 統計情報取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingStatisticsResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== バッチ処理 ====================
  /matching-requests/batch/execute:
    post:
      summary: バッチマッチング実行
      description: 複数のマッチング要求を一括実行します。
      tags:
        - Batch Operations
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BatchMatchingRequest'
      responses:
        '202':
          description: バッチマッチング開始
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchMatchingResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /matching-requests/batch/{batchId}/status:
    get:
      summary: バッチ処理状況取得
      description: バッチマッチング処理の状況を取得します。
      tags:
        - Batch Operations
      parameters:
        - name: batchId
          in: path
          required: true
          description: バッチID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: バッチ処理状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BatchStatusResponse'
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

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # ==================== Core Entities ====================
    MatchingRequestResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: マッチング要求ID
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        projectName:
          type: string
          description: プロジェクト名
        requestedBy:
          type: string
          format: uuid
          description: 要求者ID
        requestedByName:
          type: string
          description: 要求者名
        status:
          $ref: '#/components/schemas/MatchingStatus'
        requirements:
          $ref: '#/components/schemas/MatchingRequirements'
        candidateCount:
          type: integer
          description: 候補者数
        selectedCandidateId:
          type: string
          format: uuid
          description: 選定候補者ID
        deadline:
          type: string
          format: date-time
          description: 選定期限
        requestedAt:
          type: string
          format: date-time
          description: 要求日時
        executedAt:
          type: string
          format: date-time
          description: 実行日時
        completedAt:
          type: string
          format: date-time
          description: 完了日時
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    MatchingRequestDetailResponse:
      allOf:
        - $ref: '#/components/schemas/MatchingRequestResponse'
        - type: object
          properties:
            candidates:
              type: array
              items:
                $ref: '#/components/schemas/CandidateResponse'
            executionHistory:
              type: array
              items:
                $ref: '#/components/schemas/ExecutionHistory'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateMatchingRequestRequest:
      type: object
      required:
        - projectId
        - requirements
        - deadline
      properties:
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        requirements:
          $ref: '#/components/schemas/MatchingRequirements'
        deadline:
          type: string
          format: date-time
          description: 選定期限
        priority:
          type: string
          enum: [LOW, MEDIUM, HIGH, URGENT]
          default: MEDIUM
          description: 優先度
        autoExecute:
          type: boolean
          default: false
          description: 自動実行フラグ

    UpdateMatchingRequestRequest:
      type: object
      properties:
        requirements:
          $ref: '#/components/schemas/MatchingRequirements'
        deadline:
          type: string
          format: date-time
          description: 選定期限
        priority:
          type: string
          enum: [LOW, MEDIUM, HIGH, URGENT]
          description: 優先度
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    # ==================== Requirements ====================
    MatchingRequirements:
      type: object
      properties:
        requiredSkills:
          type: array
          items:
            $ref: '#/components/schemas/RequiredSkill'
          description: 必要スキル
        experienceLevel:
          type: string
          enum: [JUNIOR, MIDDLE, SENIOR, EXPERT]
          description: 必要経験レベル
        workLocation:
          type: string
          description: 勤務地
        workStyle:
          type: string
          enum: [ONSITE, REMOTE, HYBRID]
          description: 勤務形態
        projectDuration:
          type: integer
          description: プロジェクト期間 (月)
        startDate:
          type: string
          format: date
          description: 開始予定日
        budget:
          type: object
          properties:
            min:
              type: number
              format: double
            max:
              type: number
              format: double
            currency:
              type: string
              default: JPY
          description: 予算範囲
        teamSize:
          type: integer
          description: チームサイズ
        specialRequirements:
          type: array
          items:
            type: string
          description: 特別要件
        candidateLimit:
          type: integer
          minimum: 1
          maximum: 50
          default: 10
          description: 候補者数上限

    RequiredSkill:
      type: object
      required:
        - name
        - requiredLevel
        - weight
      properties:
        name:
          type: string
          description: スキル名
        requiredLevel:
          type: integer
          minimum: 1
          maximum: 5
          description: 必要レベル
        weight:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 重み
        mandatory:
          type: boolean
          default: false
          description: 必須フラグ

    # ==================== Candidates ====================
    CandidateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 候補者ID
        engineerId:
          type: string
          format: uuid
          description: 技術者ID
        engineerName:
          type: string
          description: 技術者名
        status:
          $ref: '#/components/schemas/CandidateStatus'
        matchingScore:
          $ref: '#/components/schemas/MatchingScore'
        rank:
          type: integer
          description: ランキング
        availability:
          type: object
          properties:
            availableFrom:
              type: string
              format: date
            workCapacity:
              type: integer
        recommendationReason:
          type: string
          description: 推薦理由
        generatedAt:
          type: string
          format: date-time
          description: 生成日時
        reviewedAt:
          type: string
          format: date-time
          description: 確認日時
        reviewedBy:
          type: string
          format: uuid
          description: 確認者ID

    CandidateDetailResponse:
      allOf:
        - $ref: '#/components/schemas/CandidateResponse'
        - type: object
          properties:
            engineer:
              type: object
              description: 技術者詳細情報
            skillAnalysis:
              $ref: '#/components/schemas/SkillAnalysis'
            experienceAnalysis:
              $ref: '#/components/schemas/ExperienceAnalysis'
            availabilityAnalysis:
              $ref: '#/components/schemas/AvailabilityAnalysis'
            strengths:
              type: array
              items:
                type: string
              description: 強み
            concerns:
              type: array
              items:
                type: string
              description: 懸念点

    UpdateCandidateRequest:
      type: object
      properties:
        status:
          $ref: '#/components/schemas/CandidateStatus'
        notes:
          type: string
          description: 備考

    # ==================== Execution ====================
    ExecuteMatchingRequest:
      type: object
      properties:
        parameters:
          type: object
          properties:
            maxCandidates:
              type: integer
              minimum: 1
              maximum: 100
              default: 10
            minMatchingScore:
              type: number
              format: double
              minimum: 0
              maximum: 1
              default: 0.3
            includeUnavailable:
              type: boolean
              default: false
            prioritizeAvailability:
              type: boolean
              default: true
        notifications:
          type: object
          properties:
            notifyOnCompletion:
              type: boolean
              default: true
            notifyRecipients:
              type: array
              items:
                type: string
                format: uuid

    RetryMatchingRequest:
      type: object
      properties:
        retryReason:
          type: string
          description: 再実行理由
        modifiedRequirements:
          $ref: '#/components/schemas/MatchingRequirements'
        parameters:
          type: object
          properties:
            maxCandidates:
              type: integer
            minMatchingScore:
              type: number
              format: double

    MatchingExecutionResponse:
      type: object
      properties:
        requestId:
          type: string
          format: uuid
          description: マッチング要求ID
        executionId:
          type: string
          format: uuid
          description: 実行ID
        status:
          type: string
          enum: [STARTED, RUNNING, COMPLETED, FAILED]
          description: 実行ステータス
        progress:
          type: object
          properties:
            currentStep:
              type: string
            totalSteps:
              type: integer
            completedSteps:
              type: integer
            percentage:
              type: number
              format: double
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        estimatedCompletionAt:
          type: string
          format: date-time
          description: 完了予定日時
        result:
          type: object
          properties:
            candidatesGenerated:
              type: integer
            averageMatchingScore:
              type: number
              format: double
            topCandidateScore:
              type: number
              format: double

    # ==================== Selection ====================
    SelectCandidateRequest:
      type: object
      properties:
        selectionReason:
          type: string
          description: 選定理由
        additionalNotes:
          type: string
          description: 追加備考

    RejectCandidateRequest:
      type: object
      required:
        - rejectionReason
      properties:
        rejectionReason:
          type: string
          description: 拒否理由
        additionalNotes:
          type: string
          description: 追加備考

    CandidateSelectionResponse:
      type: object
      properties:
        requestId:
          type: string
          format: uuid
          description: マッチング要求ID
        selectedCandidateId:
          type: string
          format: uuid
          description: 選定候補者ID
        selectedEngineerId:
          type: string
          format: uuid
          description: 選定技術者ID
        selectionReason:
          type: string
          description: 選定理由
        selectedAt:
          type: string
          format: date-time
          description: 選定日時
        selectedBy:
          type: string
          format: uuid
          description: 選定者ID
        nextSteps:
          type: array
          items:
            type: string
          description: 次のステップ

    # ==================== Value Objects ====================
    MatchingScore:
      type: object
      properties:
        overall:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 総合スコア
        skillMatch:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: スキルマッチスコア
        experienceMatch:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 経験マッチスコア
        availabilityMatch:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 稼働可能性スコア
        locationMatch:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 勤務地マッチスコア
        budgetMatch:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: 予算マッチスコア

    SkillAnalysis:
      type: object
      properties:
        matchedSkills:
          type: array
          items:
            type: object
            properties:
              skillName:
                type: string
              requiredLevel:
                type: integer
              actualLevel:
                type: integer
              matchScore:
                type: number
                format: double
        missingSkills:
          type: array
          items:
            type: object
            properties:
              skillName:
                type: string
              requiredLevel:
                type: integer
              impact:
                type: string
                enum: [LOW, MEDIUM, HIGH, CRITICAL]
        additionalSkills:
          type: array
          items:
            type: string
          description: 追加で持っているスキル
        skillGapAnalysis:
          type: string
          description: スキルギャップ分析

    ExperienceAnalysis:
      type: object
      properties:
        totalExperience:
          type: number
          format: double
          description: 総経験年数
        relevantExperience:
          type: number
          format: double
          description: 関連経験年数
        domainExperience:
          type: array
          items:
            type: object
            properties:
              domain:
                type: string
              years:
                type: number
                format: double
        roleExperience:
          type: array
          items:
            type: object
            properties:
              role:
                type: string
              years:
                type: number
                format: double
        projectScale:
          type: array
          items:
            type: string
          description: 経験プロジェクト規模

    AvailabilityAnalysis:
      type: object
      properties:
        currentStatus:
          type: string
          description: 現在のステータス
        availableFrom:
          type: string
          format: date
          description: 参画可能日
        commitmentLevel:
          type: integer
          minimum: 0
          maximum: 100
          description: コミットレベル (%)
        conflictingProjects:
          type: array
          items:
            type: object
            properties:
              projectId:
                type: string
                format: uuid
              conflictLevel:
                type: string
                enum: [LOW, MEDIUM, HIGH]
        flexibilityScore:
          type: number
          format: double
          description: 柔軟性スコア

    # ==================== Enums ====================
    MatchingStatus:
      type: string
      enum:
        - REQUESTED
        - EXECUTING
        - COMPLETED
        - FAILED
        - CANCELLED
        - EXPIRED
      description: |
        マッチングステータス:
        - REQUESTED: 要求済
        - EXECUTING: 実行中
        - COMPLETED: 完了
        - FAILED: 失敗
        - CANCELLED: キャンセル
        - EXPIRED: 期限切れ

    CandidateStatus:
      type: string
      enum:
        - GENERATED
        - REVIEWED
        - SHORTLISTED
        - REJECTED
        - SELECTED
        - WITHDRAWN
      description: |
        候補者ステータス:
        - GENERATED: 生成済
        - REVIEWED: 確認済
        - SHORTLISTED: 候補者リスト入り
        - REJECTED: 拒否
        - SELECTED: 選定
        - WITHDRAWN: 辞退

    # ==================== Statistics ====================
    MatchingStatisticsResponse:
      type: object
      properties:
        period:
          type: string
          description: 集計期間
        totalRequests:
          type: integer
          description: 総要求数
        completedRequests:
          type: integer
          description: 完了要求数
        averageExecutionTime:
          type: number
          format: double
          description: 平均実行時間 (分)
        averageCandidatesPerRequest:
          type: number
          format: double
          description: 要求あたり平均候補者数
        averageMatchingScore:
          type: number
          format: double
          description: 平均マッチングスコア
        selectionRate:
          type: number
          format: double
          description: 選定率
        topSkillRequests:
          type: array
          items:
            type: object
            properties:
              skill:
                type: string
              count:
                type: integer
          description: 要求の多いスキル
        statusDistribution:
          type: object
          additionalProperties:
            type: integer
          description: ステータス分布

    # ==================== Batch Operations ====================
    BatchMatchingRequest:
      type: object
      required:
        - requestIds
      properties:
        requestIds:
          type: array
          items:
            type: string
            format: uuid
          description: マッチング要求ID一覧
        parameters:
          type: object
          properties:
            maxParallelExecutions:
              type: integer
              minimum: 1
              maximum: 10
              default: 3
            executionTimeout:
              type: integer
              description: タイムアウト (分)
        notifications:
          type: object
          properties:
            notifyOnCompletion:
              type: boolean
              default: true
            notifyOnFailure:
              type: boolean
              default: true

    BatchMatchingResponse:
      type: object
      properties:
        batchId:
          type: string
          format: uuid
          description: バッチID
        totalRequests:
          type: integer
          description: 総要求数
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED, PARTIALLY_COMPLETED]
          description: バッチステータス
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        estimatedCompletionAt:
          type: string
          format: date-time
          description: 完了予定日時

    BatchStatusResponse:
      type: object
      properties:
        batchId:
          type: string
          format: uuid
          description: バッチID
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED, PARTIALLY_COMPLETED]
          description: バッチステータス
        progress:
          type: object
          properties:
            total:
              type: integer
            completed:
              type: integer
            failed:
              type: integer
            remaining:
              type: integer
            percentage:
              type: number
              format: double
        results:
          type: array
          items:
            type: object
            properties:
              requestId:
                type: string
                format: uuid
              status:
                type: string
              candidatesGenerated:
                type: integer
              error:
                type: string
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time

    # ==================== Supporting Objects ====================
    ExecutionHistory:
      type: object
      properties:
        executionId:
          type: string
          format: uuid
          description: 実行ID
        executedAt:
          type: string
          format: date-time
          description: 実行日時
        status:
          type: string
          description: 実行ステータス
        candidatesGenerated:
          type: integer
          description: 生成候補者数
        executionTime:
          type: number
          format: double
          description: 実行時間 (秒)
        parameters:
          type: object
          description: 実行パラメータ
        errorMessage:
          type: string
          description: エラーメッセージ

    # ==================== Pagination ====================
    MatchingRequestPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/MatchingRequestResponse'
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
          description: エラーコード（例：MATCHING_REQUEST_NOT_FOUND、MATCHING_ALGORITHM_FAILED）
          enum:
            # Matching固有エラー
            - MATCHING_REQUEST_NOT_FOUND
            - MATCHING_ALGORITHM_FAILED
            - CANDIDATE_NOT_FOUND
            - MATCHING_CRITERIA_INVALID
            - SKILL_MISMATCH
            - AVAILABILITY_CONFLICT
            - BUDGET_MISMATCH
            - EXPERIENCE_REQUIREMENT_NOT_MET
            - MATCHING_SCORE_CALCULATION_FAILED
            - BULK_MATCHING_FAILED
            - CANDIDATE_POOL_EMPTY
            - MATCHING_REQUEST_EXPIRED
            - AI_MODEL_UNAVAILABLE
            - PERFORMANCE_THRESHOLD_EXCEEDED
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
@RequestMapping("/api/v1/matching-requests")
@Validated
public class MatchingRequestController {
    
    private final MatchingApplicationService matchingService;
    private final MatchingRequestAssembler requestAssembler;
    
    @PostMapping
    public ResponseEntity<MatchingRequestResponse> createMatchingRequest(
            @Valid @RequestBody CreateMatchingRequestRequest request) {
        
        CreateMatchingRequestCommand command = CreateMatchingRequestCommand.builder()
            .projectId(request.getProjectId())
            .requirements(request.getRequirements())
            .deadline(request.getDeadline())
            .priority(request.getPriority())
            .autoExecute(request.getAutoExecute())
            .build();
            
        MatchingRequest matchingRequest = matchingService.createMatchingRequest(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(requestAssembler.toModel(matchingRequest));
    }
    
    @PostMapping("/{requestId}/execute")
    public ResponseEntity<MatchingExecutionResponse> executeMatching(
            @PathVariable UUID requestId,
            @RequestBody(required = false) ExecuteMatchingRequest request) {
        
        ExecuteMatchingCommand command = ExecuteMatchingCommand.builder()
            .requestId(requestId)
            .parameters(request != null ? request.getParameters() : null)
            .notifications(request != null ? request.getNotifications() : null)
            .build();
            
        MatchingExecution execution = matchingService.executeMatching(command);
        
        return ResponseEntity.ok(
            requestAssembler.toExecutionModel(execution)
        );
    }
    
    @GetMapping("/{requestId}/candidates")
    public ResponseEntity<List<CandidateResponse>> getCandidates(
            @PathVariable UUID requestId,
            @RequestParam(required = false) CandidateStatus status,
            @RequestParam(required = false) Double minScore,
            @RequestParam(defaultValue = "matchingScore,desc") String sort) {
        
        CandidateSearchCriteria criteria = CandidateSearchCriteria.builder()
            .requestId(requestId)
            .status(status)
            .minScore(minScore)
            .sort(sort)
            .build();
            
        List<Candidate> candidates = matchingService.getCandidates(criteria);
        
        return ResponseEntity.ok(
            candidates.stream()
                .map(requestAssembler::toCandidateModel)
                .collect(toList())
        );
    }
    
    @PostMapping("/{requestId}/candidates/{candidateId}/select")
    public ResponseEntity<CandidateSelectionResponse> selectCandidate(
            @PathVariable UUID requestId,
            @PathVariable UUID candidateId,
            @RequestBody(required = false) SelectCandidateRequest request) {
        
        SelectCandidateCommand command = SelectCandidateCommand.builder()
            .requestId(requestId)
            .candidateId(candidateId)
            .selectionReason(request != null ? request.getSelectionReason() : null)
            .additionalNotes(request != null ? request.getAdditionalNotes() : null)
            .build();
            
        CandidateSelection selection = matchingService.selectCandidate(command);
        
        return ResponseEntity.ok(
            requestAssembler.toSelectionModel(selection)
        );
    }
}
```

### 3.2 アプリケーションサービス

```java
@Service
@Transactional
public class MatchingApplicationService {
    
    private final MatchingRequestRepository matchingRequestRepository;
    private final MatchingDomainService matchingDomainService;
    private final ApplicationEventPublisher eventPublisher;
    
    public MatchingRequest createMatchingRequest(CreateMatchingRequestCommand command) {
        // プロジェクト情報取得
        Project project = projectService.getProject(command.getProjectId());
        
        // マッチング要求作成
        MatchingRequest matchingRequest = MatchingRequest.create(
            command.getProjectId(),
            command.getRequirements(),
            command.getDeadline(),
            command.getPriority()
        );
        
        // 自動実行フラグが有効な場合は即座に実行
        if (command.getAutoExecute()) {
            matchingRequest.requestExecution();
        }
        
        // 保存
        MatchingRequest savedRequest = matchingRequestRepository.save(matchingRequest);
        
        // イベント発行
        publishMatchingEvents(savedRequest);
        
        return savedRequest;
    }
    
    public MatchingExecution executeMatching(ExecuteMatchingCommand command) {
        MatchingRequest matchingRequest = matchingRequestRepository
            .findById(command.getRequestId())
            .orElseThrow(() -> new MatchingRequestNotFoundException(command.getRequestId()));
            
        // マッチング実行
        MatchingExecution execution = matchingDomainService.executeMatching(
            matchingRequest,
            command.getParameters()
        );
        
        // 結果を要求に反映
        matchingRequest.updateCandidates(execution.getCandidates());
        matchingRequestRepository.save(matchingRequest);
        
        // イベント発行
        publishMatchingEvents(matchingRequest);
        
        return execution;
    }
    
    public CandidateSelection selectCandidate(SelectCandidateCommand command) {
        MatchingRequest matchingRequest = matchingRequestRepository
            .findById(command.getRequestId())
            .orElseThrow(() -> new MatchingRequestNotFoundException(command.getRequestId()));
            
        // 候補者選定
        matchingRequest.selectCandidate(
            command.getCandidateId(),
            command.getSelectionReason()
        );
        
        // 保存
        MatchingRequest savedRequest = matchingRequestRepository.save(matchingRequest);
        
        // イベント発行
        publishMatchingEvents(savedRequest);
        
        return new CandidateSelection(
            command.getRequestId(),
            command.getCandidateId(),
            matchingRequest.getSelectedCandidate().getEngineerId(),
            command.getSelectionReason(),
            LocalDateTime.now()
        );
    }
    
    private void publishMatchingEvents(MatchingRequest matchingRequest) {
        matchingRequest.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        matchingRequest.markEventsAsCommitted();
    }
}
```

### 3.3 ドメインサービス

```java
@DomainService
public class MatchingDomainService {
    
    private final EngineerRepository engineerRepository;
    private final MatchingAlgorithmService algorithmService;
    
    public MatchingExecution executeMatching(
            MatchingRequest matchingRequest,
            MatchingParameters parameters) {
        
        // 利用可能な技術者を取得
        List<Engineer> availableEngineers = getAvailableEngineers(
            matchingRequest.getRequirements()
        );
        
        // マッチングアルゴリズム実行
        List<Candidate> candidates = algorithmService.generateCandidates(
            matchingRequest.getRequirements(),
            availableEngineers,
            parameters
        );
        
        return new MatchingExecution(
            matchingRequest.getId(),
            candidates,
            LocalDateTime.now()
        );
    }
    
    private List<Engineer> getAvailableEngineers(MatchingRequirements requirements) {
        EngineerSearchCriteria criteria = EngineerSearchCriteria.builder()
            .workStatuses(Arrays.asList(WorkStatus.AVAILABLE))
            .availableFrom(requirements.getStartDate())
            .workableLocations(Arrays.asList(requirements.getWorkLocation()))
            .build();
            
        return engineerRepository.findByCriteria(criteria, Pageable.unpaged())
            .getContent();
    }
}
```

## 4. 非同期処理とバッチ

### 4.1 非同期マッチング実行

```java
@Service
public class AsyncMatchingService {
    
    @Async("matchingExecutor")
    public CompletableFuture<MatchingExecution> executeMatchingAsync(
            UUID requestId, MatchingParameters parameters) {
        
        try {
            MatchingExecution execution = matchingService.executeMatching(
                ExecuteMatchingCommand.builder()
                    .requestId(requestId)
                    .parameters(parameters)
                    .build()
            );
            
            return CompletableFuture.completedFuture(execution);
        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);
        }
    }
}
```

### 4.2 バッチ処理

```java
@Component
public class MatchingBatchProcessor {
    
    @Scheduled(fixedDelay = 300000) // 5分間隔
    public void processScheduledMatching() {
        List<MatchingRequest> pendingRequests = 
            matchingRequestRepository.findPendingRequests();
            
        for (MatchingRequest request : pendingRequests) {
            if (request.shouldAutoExecute()) {
                asyncMatchingService.executeMatchingAsync(
                    request.getId(), 
                    MatchingParameters.defaultParameters()
                );
            }
        }
    }
}
```

## 5. パフォーマンス要件

### 5.1 応答時間
- マッチング要求作成: < 500ms
- マッチング実行: < 10s (非同期)
- 候補者一覧取得: < 300ms
- 候補者選定: < 1s

### 5.2 スループット
- 同時マッチング実行数: 最大10件
- マッチング要求数: 1000件/日

## 6. 監視・ロギング

### 6.1 業務ログ
- マッチング要求作成・実行・完了
- 候補者生成・選定・拒否
- マッチングスコア計算履歴
- バッチ処理実行結果

### 6.2 パフォーマンス監視
- マッチング実行時間
- マッチングアルゴリズムの精度
- 候補者生成数の分布
- 選定率の推移

---

**作成者**: システム化プロジェクトチーム