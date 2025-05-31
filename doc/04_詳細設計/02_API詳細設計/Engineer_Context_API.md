# Engineer Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Engineer Management Service
- **ベースURL**: `https://api.ses-mgr.com/engineer/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 技術者のプロフィール管理
- スキルセットの管理と評価
- 稼働状況・可用性の追跡
- 技術者の検索とマッチング支援

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Engineer Management API
  description: SES案件管理システムの技術者管理API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/engineer/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/engineer/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 技術者管理 ====================
  /engineers:
    get:
      summary: 技術者一覧取得
      description: 技術者の一覧を取得します。フィルタリングとページングに対応しています。
      tags:
        - Engineers
      parameters:
        - name: status
          in: query
          description: 稼働ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/WorkStatus'
        - name: skills
          in: query
          description: スキルでフィルタ (カンマ区切り)
          schema:
            type: string
            example: "Java,Spring,React"
        - name: experienceLevel
          in: query
          description: 経験レベルでフィルタ
          schema:
            $ref: '#/components/schemas/ExperienceLevel'
        - name: location
          in: query
          description: 勤務可能地域でフィルタ
          schema:
            type: string
        - name: availableFrom
          in: query
          description: 参画可能日でフィルタ
          schema:
            type: string
            format: date
        - name: keyword
          in: query
          description: キーワード検索 (名前、スキル、経験)
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
          description: ソート条件
          schema:
            type: string
            default: "name,asc"
      responses:
        '200':
          description: 技術者一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規技術者登録
      description: 新しい技術者を登録します。
      tags:
        - Engineers
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateEngineerRequest'
      responses:
        '201':
          description: 技術者登録成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: 技術者IDまたはメールアドレスの重複
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /engineers/{engineerId}:
    get:
      summary: 技術者詳細取得
      description: 指定されたIDの技術者詳細を取得します。
      tags:
        - Engineers
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 技術者詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerDetailResponse'
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
      summary: 技術者情報更新
      description: 技術者の基本情報を更新します。
      tags:
        - Engineers
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateEngineerRequest'
      responses:
        '200':
          description: 技術者情報更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerResponse'
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
      summary: 技術者削除
      description: 技術者を削除します。進行中のプロジェクトがある場合は削除できません。
      tags:
        - Engineers
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 技術者削除成功
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

  # ==================== スキル管理 ====================
  /engineers/{engineerId}/skills:
    get:
      summary: 技術者スキル一覧取得
      description: 技術者のスキル一覧を取得します。
      tags:
        - Skills
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: スキル一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillSetResponse'
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
      summary: 技術者スキル更新
      description: 技術者のスキルセットを更新します。
      tags:
        - Skills
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateSkillSetRequest'
      responses:
        '200':
          description: スキル更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillSetResponse'
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

  /engineers/{engineerId}/skills/{skillName}:
    post:
      summary: スキル追加
      description: 技術者に新しいスキルを追加します。
      tags:
        - Skills
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
        - name: skillName
          in: path
          required: true
          description: スキル名
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AddSkillRequest'
      responses:
        '201':
          description: スキル追加成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: スキルが既に存在
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

    put:
      summary: スキルレベル更新
      description: 既存スキルのレベルを更新します。
      tags:
        - Skills
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
        - name: skillName
          in: path
          required: true
          description: スキル名
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateSkillRequest'
      responses:
        '200':
          description: スキル更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillResponse'
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
      summary: スキル削除
      description: 技術者からスキルを削除します。
      tags:
        - Skills
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
        - name: skillName
          in: path
          required: true
          description: スキル名
          schema:
            type: string
      responses:
        '204':
          description: スキル削除成功
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

  # ==================== 稼働状況管理 ====================
  /engineers/{engineerId}/availability:
    get:
      summary: 稼働状況取得
      description: 技術者の現在の稼働状況を取得します。
      tags:
        - Availability
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 稼働状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvailabilityResponse'
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
      summary: 稼働状況更新
      description: 技術者の稼働状況を更新します。
      tags:
        - Availability
      parameters:
        - name: engineerId
          in: path
          required: true
          description: 技術者ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAvailabilityRequest'
      responses:
        '200':
          description: 稼働状況更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AvailabilityResponse'
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

  # ==================== 検索・マッチング ====================
  /engineers/search:
    post:
      summary: 高度な技術者検索
      description: 複数条件での高度な技術者検索を実行します。
      tags:
        - Search
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EngineerSearchRequest'
      responses:
        '200':
          description: 検索成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /engineers/match:
    post:
      summary: 技術者マッチング
      description: 指定された要件に対して技術者のマッチングスコアを計算します。
      tags:
        - Matching
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MatchingRequest'
      responses:
        '200':
          description: マッチング成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchingResultResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 統計・分析 ====================
  /engineers/statistics:
    get:
      summary: 技術者統計情報取得
      description: 技術者の統計情報を取得します。
      tags:
        - Statistics
      parameters:
        - name: period
          in: query
          description: 集計期間 (月単位: 2024-01)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: groupBy
          in: query
          description: グルーピング条件
          schema:
            type: string
            enum: [skill, experience, status, location]
      responses:
        '200':
          description: 統計情報取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EngineerStatisticsResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== スキルマスタ管理 ====================
  /skills:
    get:
      summary: スキルマスタ一覧取得
      description: システムで管理されているスキルマスタの一覧を取得します。
      tags:
        - Skills Master
      parameters:
        - name: category
          in: query
          description: スキルカテゴリでフィルタ
          schema:
            $ref: '#/components/schemas/SkillCategory'
        - name: keyword
          in: query
          description: スキル名でのキーワード検索
          schema:
            type: string
      responses:
        '200':
          description: スキルマスタ一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SkillMasterResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規スキル追加
      description: スキルマスタに新しいスキルを追加します。
      tags:
        - Skills Master
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSkillMasterRequest'
      responses:
        '201':
          description: スキル追加成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SkillMasterResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: スキル名の重複
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
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
    EngineerResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 技術者ID
        name:
          type: string
          description: 技術者名
        email:
          type: string
          format: email
          description: メールアドレス
        profile:
          $ref: '#/components/schemas/Profile'
        workStatus:
          $ref: '#/components/schemas/WorkStatus'
        availability:
          $ref: '#/components/schemas/Availability'
        skillCount:
          type: integer
          description: 保有スキル数
        experienceLevel:
          $ref: '#/components/schemas/ExperienceLevel'
        totalExperienceYears:
          type: number
          format: double
          description: 総経験年数
        createdAt:
          type: string
          format: date-time
          description: 登録日時
        updatedAt:
          type: string
          format: date-time
          description: 更新日時
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    EngineerDetailResponse:
      allOf:
        - $ref: '#/components/schemas/EngineerResponse'
        - type: object
          properties:
            skillSet:
              $ref: '#/components/schemas/SkillSetResponse'
            workHistory:
              type: array
              items:
                $ref: '#/components/schemas/WorkHistory'
            certifications:
              type: array
              items:
                $ref: '#/components/schemas/Certification'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateEngineerRequest:
      type: object
      required:
        - name
        - email
        - profile
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: 技術者名
        email:
          type: string
          format: email
          description: メールアドレス
        profile:
          $ref: '#/components/schemas/Profile'
        initialSkills:
          type: array
          items:
            $ref: '#/components/schemas/CreateSkillRequest'
          description: 初期スキル設定

    UpdateEngineerRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: 技術者名
        profile:
          $ref: '#/components/schemas/Profile'
        workStatus:
          $ref: '#/components/schemas/WorkStatus'
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    # ==================== Profile ====================
    Profile:
      type: object
      properties:
        birthDate:
          type: string
          format: date
          description: 生年月日
        phoneNumber:
          type: string
          description: 電話番号
        location:
          type: string
          description: 居住地
        nearestStation:
          type: string
          description: 最寄り駅
        workableLocations:
          type: array
          items:
            type: string
          description: 勤務可能地域
        preferredWorkStyle:
          type: string
          enum: [ONSITE, REMOTE, HYBRID]
          description: 希望勤務形態
        bio:
          type: string
          maxLength: 1000
          description: 自己紹介
        linkedInUrl:
          type: string
          format: uri
          description: LinkedIn URL
        githubUrl:
          type: string
          format: uri
          description: GitHub URL

    # ==================== Skills ====================
    SkillSetResponse:
      type: object
      properties:
        engineerId:
          type: string
          format: uuid
          description: 技術者ID
        skills:
          type: array
          items:
            $ref: '#/components/schemas/SkillResponse'
        primarySkills:
          type: array
          items:
            type: string
          description: 主要スキル
        skillCategories:
          type: object
          additionalProperties:
            type: integer
          description: カテゴリ別スキル数
        averageLevel:
          type: number
          format: double
          description: 平均スキルレベル
        lastUpdatedAt:
          type: string
          format: date-time
          description: 最終更新日時

    SkillResponse:
      type: object
      properties:
        name:
          type: string
          description: スキル名
        category:
          $ref: '#/components/schemas/SkillCategory'
        level:
          type: integer
          minimum: 1
          maximum: 5
          description: スキルレベル (1-5)
        experienceYears:
          type: number
          format: double
          description: 経験年数
        certificationLevel:
          type: string
          enum: [NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT]
          description: 認定レベル
        lastUsedDate:
          type: string
          format: date
          description: 最終使用日
        businessExperience:
          type: boolean
          description: 業務経験有無
        addedAt:
          type: string
          format: date-time
          description: 追加日時

    UpdateSkillSetRequest:
      type: object
      properties:
        skills:
          type: array
          items:
            $ref: '#/components/schemas/UpdateSkillRequest'

    AddSkillRequest:
      type: object
      required:
        - level
        - experienceYears
      properties:
        level:
          type: integer
          minimum: 1
          maximum: 5
          description: スキルレベル
        experienceYears:
          type: number
          format: double
          minimum: 0
          description: 経験年数
        certificationLevel:
          type: string
          enum: [NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT]
          default: NONE
          description: 認定レベル
        lastUsedDate:
          type: string
          format: date
          description: 最終使用日
        businessExperience:
          type: boolean
          default: false
          description: 業務経験有無

    UpdateSkillRequest:
      type: object
      properties:
        name:
          type: string
          description: スキル名
        level:
          type: integer
          minimum: 1
          maximum: 5
          description: スキルレベル
        experienceYears:
          type: number
          format: double
          minimum: 0
          description: 経験年数
        certificationLevel:
          type: string
          enum: [NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT]
          description: 認定レベル
        lastUsedDate:
          type: string
          format: date
          description: 最終使用日
        businessExperience:
          type: boolean
          description: 業務経験有無

    CreateSkillRequest:
      type: object
      required:
        - name
        - level
        - experienceYears
      properties:
        name:
          type: string
          description: スキル名
        level:
          type: integer
          minimum: 1
          maximum: 5
          description: スキルレベル
        experienceYears:
          type: number
          format: double
          minimum: 0
          description: 経験年数
        certificationLevel:
          type: string
          enum: [NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT]
          default: NONE
          description: 認定レベル
        businessExperience:
          type: boolean
          default: false
          description: 業務経験有無

    # ==================== Availability ====================
    AvailabilityResponse:
      type: object
      properties:
        workStatus:
          $ref: '#/components/schemas/WorkStatus'
        availableFrom:
          type: string
          format: date
          description: 参画可能日
        currentProjectId:
          type: string
          format: uuid
          description: 現在のプロジェクトID
        currentProjectEndDate:
          type: string
          format: date
          description: 現在プロジェクトの終了予定日
        workCapacity:
          type: integer
          minimum: 0
          maximum: 100
          description: 稼働率 (%)
        preferredNextProject:
          type: object
          properties:
            skillRequirements:
              type: array
              items:
                type: string
            workLocation:
              type: string
            projectDuration:
              type: string
        lastUpdatedAt:
          type: string
          format: date-time
          description: 最終更新日時

    UpdateAvailabilityRequest:
      type: object
      properties:
        workStatus:
          $ref: '#/components/schemas/WorkStatus'
        availableFrom:
          type: string
          format: date
          description: 参画可能日
        workCapacity:
          type: integer
          minimum: 0
          maximum: 100
          description: 稼働率
        preferredNextProject:
          type: object
          properties:
            skillRequirements:
              type: array
              items:
                type: string
            workLocation:
              type: string
            projectDuration:
              type: string

    # ==================== Search & Matching ====================
    EngineerSearchRequest:
      type: object
      properties:
        keyword:
          type: string
          description: キーワード検索
        workStatuses:
          type: array
          items:
            $ref: '#/components/schemas/WorkStatus'
          description: 稼働ステータス条件
        skills:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              minLevel:
                type: integer
                minimum: 1
                maximum: 5
          description: スキル条件
        experienceLevel:
          $ref: '#/components/schemas/ExperienceLevel'
        totalExperienceRange:
          type: object
          properties:
            min:
              type: number
              format: double
            max:
              type: number
              format: double
          description: 総経験年数範囲
        workableLocations:
          type: array
          items:
            type: string
          description: 勤務可能地域
        availableFrom:
          type: string
          format: date
          description: 参画可能日
        availableTo:
          type: string
          format: date
          description: 参画可能期限
        page:
          type: integer
          minimum: 0
          default: 0
        size:
          type: integer
          minimum: 1
          maximum: 100
          default: 20
        sort:
          type: string
          default: "name,asc"

    MatchingRequest:
      type: object
      required:
        - requiredSkills
      properties:
        requiredSkills:
          type: array
          items:
            type: object
            properties:
              name:
                type: string
              requiredLevel:
                type: integer
                minimum: 1
                maximum: 5
              weight:
                type: number
                format: double
                minimum: 0
                maximum: 1
          description: 必要スキル
        experienceLevel:
          $ref: '#/components/schemas/ExperienceLevel'
        workLocation:
          type: string
          description: 勤務地
        projectStartDate:
          type: string
          format: date
          description: プロジェクト開始日
        projectDuration:
          type: integer
          description: プロジェクト期間 (月)
        candidateLimit:
          type: integer
          minimum: 1
          maximum: 50
          default: 10
          description: 候補者数上限

    MatchingResultResponse:
      type: object
      properties:
        requestId:
          type: string
          format: uuid
          description: マッチングリクエストID
        candidates:
          type: array
          items:
            $ref: '#/components/schemas/MatchingCandidate'
        totalCandidates:
          type: integer
          description: 総候補者数
        averageScore:
          type: number
          format: double
          description: 平均マッチングスコア
        executedAt:
          type: string
          format: date-time
          description: 実行日時

    MatchingCandidate:
      type: object
      properties:
        engineer:
          $ref: '#/components/schemas/EngineerResponse'
        matchingScore:
          type: number
          format: double
          minimum: 0
          maximum: 1
          description: マッチングスコア
        skillMatch:
          type: object
          properties:
            overallScore:
              type: number
              format: double
            skillScores:
              type: object
              additionalProperties:
                type: number
                format: double
        experienceMatch:
          type: number
          format: double
          description: 経験マッチ度
        availabilityMatch:
          type: number
          format: double
          description: 稼働可能性マッチ度
        recommendationReason:
          type: string
          description: 推薦理由

    # ==================== Statistics ====================
    EngineerStatisticsResponse:
      type: object
      properties:
        period:
          type: string
          description: 集計期間
        totalEngineers:
          type: integer
          description: 総技術者数
        statusDistribution:
          type: object
          additionalProperties:
            type: integer
          description: ステータス別分布
        skillDistribution:
          type: array
          items:
            type: object
            properties:
              skill:
                type: string
              count:
                type: integer
              percentage:
                type: number
                format: double
          description: スキル分布
        experienceDistribution:
          type: object
          additionalProperties:
            type: integer
          description: 経験レベル分布
        locationDistribution:
          type: object
          additionalProperties:
            type: integer
          description: 地域分布
        averageExperience:
          type: number
          format: double
          description: 平均経験年数

    # ==================== Skills Master ====================
    SkillMasterResponse:
      type: object
      properties:
        name:
          type: string
          description: スキル名
        category:
          $ref: '#/components/schemas/SkillCategory'
        description:
          type: string
          description: スキル説明
        aliases:
          type: array
          items:
            type: string
          description: エイリアス
        relatedSkills:
          type: array
          items:
            type: string
          description: 関連スキル
        marketDemand:
          type: string
          enum: [LOW, MEDIUM, HIGH, VERY_HIGH]
          description: 市場需要
        isActive:
          type: boolean
          description: アクティブ状態
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    CreateSkillMasterRequest:
      type: object
      required:
        - name
        - category
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
          description: スキル名
        category:
          $ref: '#/components/schemas/SkillCategory'
        description:
          type: string
          maxLength: 500
          description: スキル説明
        aliases:
          type: array
          items:
            type: string
          description: エイリアス
        relatedSkills:
          type: array
          items:
            type: string
          description: 関連スキル
        marketDemand:
          type: string
          enum: [LOW, MEDIUM, HIGH, VERY_HIGH]
          default: MEDIUM
          description: 市場需要

    # ==================== Enums ====================
    WorkStatus:
      type: string
      enum:
        - AVAILABLE
        - ASSIGNED
        - BUSY
        - UNAVAILABLE
      description: |
        稼働ステータス:
        - AVAILABLE: 稼働可能
        - ASSIGNED: アサイン済
        - BUSY: 繁忙
        - UNAVAILABLE: 稼働不可

    ExperienceLevel:
      type: string
      enum:
        - JUNIOR
        - MIDDLE
        - SENIOR
        - EXPERT
      description: |
        経験レベル:
        - JUNIOR: 初級 (0-2年)
        - MIDDLE: 中級 (3-5年)
        - SENIOR: 上級 (6-10年)
        - EXPERT: エキスパート (11年以上)

    SkillCategory:
      type: string
      enum:
        - PROGRAMMING_LANGUAGE
        - FRAMEWORK
        - DATABASE
        - CLOUD
        - DEVOPS
        - FRONTEND
        - BACKEND
        - MOBILE
        - TESTING
        - PROJECT_MANAGEMENT
        - BUSINESS_SKILL
        - OTHER
      description: スキルカテゴリ

    # ==================== Supporting Objects ====================
    WorkHistory:
      type: object
      properties:
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        projectName:
          type: string
          description: プロジェクト名
        role:
          type: string
          description: 役割
        startDate:
          type: string
          format: date
          description: 開始日
        endDate:
          type: string
          format: date
          description: 終了日
        technologies:
          type: array
          items:
            type: string
          description: 使用技術
        achievements:
          type: string
          description: 成果

    Certification:
      type: object
      properties:
        name:
          type: string
          description: 資格名
        issuer:
          type: string
          description: 発行者
        issuedDate:
          type: string
          format: date
          description: 取得日
        expiryDate:
          type: string
          format: date
          description: 有効期限
        credentialId:
          type: string
          description: 認定ID
        verificationUrl:
          type: string
          format: uri
          description: 検証URL

    # ==================== Pagination ====================
    EngineerPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/EngineerResponse'
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
@RequestMapping("/api/v1/engineers")
@Validated
public class EngineerController {
    
    private final EngineerApplicationService engineerService;
    private final EngineerAssembler engineerAssembler;
    
    @GetMapping
    public ResponseEntity<PagedModel<EngineerResponse>> getEngineers(
            @RequestParam(required = false) WorkStatus status,
            @RequestParam(required = false) String skills,
            @RequestParam(required = false) ExperienceLevel experienceLevel,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate availableFrom,
            @RequestParam(required = false) String keyword,
            Pageable pageable) {
        
        EngineerSearchCriteria criteria = EngineerSearchCriteria.builder()
            .status(status)
            .skills(parseSkills(skills))
            .experienceLevel(experienceLevel)
            .location(location)
            .availableFrom(availableFrom)
            .keyword(keyword)
            .build();
            
        Page<Engineer> engineers = engineerService.searchEngineers(criteria, pageable);
        
        return ResponseEntity.ok(
            engineerAssembler.toPagedModel(engineers)
        );
    }
    
    @PostMapping
    public ResponseEntity<EngineerResponse> createEngineer(
            @Valid @RequestBody CreateEngineerRequest request) {
        
        CreateEngineerCommand command = CreateEngineerCommand.builder()
            .name(request.getName())
            .email(request.getEmail())
            .profile(request.getProfile())
            .initialSkills(request.getInitialSkills())
            .build();
            
        Engineer engineer = engineerService.createEngineer(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(engineerAssembler.toModel(engineer));
    }
    
    @GetMapping("/{engineerId}")
    public ResponseEntity<EngineerDetailResponse> getEngineer(
            @PathVariable UUID engineerId) {
        
        Engineer engineer = engineerService.getEngineer(engineerId);
        
        return ResponseEntity.ok(
            engineerAssembler.toDetailModel(engineer)
        );
    }
    
    @PostMapping("/match")
    public ResponseEntity<MatchingResultResponse> matchEngineers(
            @Valid @RequestBody MatchingRequest request) {
        
        MatchingCommand command = MatchingCommand.builder()
            .requiredSkills(request.getRequiredSkills())
            .experienceLevel(request.getExperienceLevel())
            .workLocation(request.getWorkLocation())
            .projectStartDate(request.getProjectStartDate())
            .projectDuration(request.getProjectDuration())
            .candidateLimit(request.getCandidateLimit())
            .build();
            
        MatchingResult result = engineerService.matchEngineers(command);
        
        return ResponseEntity.ok(
            engineerAssembler.toMatchingResultModel(result)
        );
    }
    
    private List<String> parseSkills(String skills) {
        return skills != null ? 
            Arrays.asList(skills.split(",")) : 
            Collections.emptyList();
    }
}
```

### 3.2 スキル管理コントローラー

```java
@RestController
@RequestMapping("/api/v1/engineers/{engineerId}/skills")
@Validated
public class EngineerSkillController {
    
    private final EngineerApplicationService engineerService;
    private final SkillAssembler skillAssembler;
    
    @GetMapping
    public ResponseEntity<SkillSetResponse> getSkills(
            @PathVariable UUID engineerId) {
        
        SkillSet skillSet = engineerService.getEngineerSkills(engineerId);
        
        return ResponseEntity.ok(
            skillAssembler.toSkillSetModel(skillSet)
        );
    }
    
    @PostMapping("/{skillName}")
    public ResponseEntity<SkillResponse> addSkill(
            @PathVariable UUID engineerId,
            @PathVariable String skillName,
            @Valid @RequestBody AddSkillRequest request) {
        
        AddSkillCommand command = AddSkillCommand.builder()
            .engineerId(engineerId)
            .skillName(skillName)
            .level(request.getLevel())
            .experienceYears(request.getExperienceYears())
            .certificationLevel(request.getCertificationLevel())
            .lastUsedDate(request.getLastUsedDate())
            .businessExperience(request.getBusinessExperience())
            .build();
            
        Skill skill = engineerService.addSkill(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(skillAssembler.toModel(skill));
    }
    
    @PutMapping("/{skillName}")
    public ResponseEntity<SkillResponse> updateSkill(
            @PathVariable UUID engineerId,
            @PathVariable String skillName,
            @Valid @RequestBody UpdateSkillRequest request) {
        
        UpdateSkillCommand command = UpdateSkillCommand.builder()
            .engineerId(engineerId)
            .skillName(skillName)
            .level(request.getLevel())
            .experienceYears(request.getExperienceYears())
            .certificationLevel(request.getCertificationLevel())
            .lastUsedDate(request.getLastUsedDate())
            .businessExperience(request.getBusinessExperience())
            .build();
            
        Skill skill = engineerService.updateSkill(command);
        
        return ResponseEntity.ok(
            skillAssembler.toModel(skill)
        );
    }
    
    @DeleteMapping("/{skillName}")
    public ResponseEntity<Void> removeSkill(
            @PathVariable UUID engineerId,
            @PathVariable String skillName) {
        
        engineerService.removeSkill(engineerId, skillName);
        
        return ResponseEntity.noContent().build();
    }
}
```

### 3.3 アプリケーションサービス

```java
@Service
@Transactional
public class EngineerApplicationService {
    
    private final EngineerRepository engineerRepository;
    private final EngineerDomainService engineerDomainService;
    private final ApplicationEventPublisher eventPublisher;
    
    public Page<Engineer> searchEngineers(EngineerSearchCriteria criteria, Pageable pageable) {
        return engineerRepository.findByCriteria(criteria, pageable);
    }
    
    public Engineer createEngineer(CreateEngineerCommand command) {
        // ドメインサービスで技術者作成
        Engineer engineer = engineerDomainService.createEngineer(
            command.getName(),
            command.getEmail(),
            command.getProfile()
        );
        
        // 初期スキル設定
        if (command.getInitialSkills() != null) {
            for (CreateSkillRequest skillRequest : command.getInitialSkills()) {
                engineer.addSkill(
                    skillRequest.getName(),
                    skillRequest.getLevel(),
                    skillRequest.getExperienceYears(),
                    skillRequest.getCertificationLevel(),
                    skillRequest.getBusinessExperience()
                );
            }
        }
        
        // 保存
        Engineer savedEngineer = engineerRepository.save(engineer);
        
        // イベント発行
        publishEngineerEvents(savedEngineer);
        
        return savedEngineer;
    }
    
    public MatchingResult matchEngineers(MatchingCommand command) {
        // マッチング実行
        return engineerDomainService.matchEngineers(
            command.getRequiredSkills(),
            command.getExperienceLevel(),
            command.getWorkLocation(),
            command.getProjectStartDate(),
            command.getCandidateLimit()
        );
    }
    
    public Skill addSkill(AddSkillCommand command) {
        Engineer engineer = engineerRepository.findById(command.getEngineerId())
            .orElseThrow(() -> new EngineerNotFoundException(command.getEngineerId()));
            
        engineer.addSkill(
            command.getSkillName(),
            command.getLevel(),
            command.getExperienceYears(),
            command.getCertificationLevel(),
            command.getBusinessExperience()
        );
        
        Engineer savedEngineer = engineerRepository.save(engineer);
        publishEngineerEvents(savedEngineer);
        
        return engineer.getSkillSet().getSkill(command.getSkillName());
    }
    
    private void publishEngineerEvents(Engineer engineer) {
        engineer.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        engineer.markEventsAsCommitted();
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC + ABAC (Attribute-Based Access Control)
- **権限レベル**:
  - `engineer:read` - 技術者情報参照
  - `engineer:write` - 技術者情報更新
  - `engineer:admin` - 全技術者管理
  - `engineer:self` - 自身の情報管理

### 4.2 データプライバシー
- 個人情報の暗号化保存
- アクセスログの記録
- GDPR対応 (削除権、忘れられる権利)
- データ匿名化オプション

## 5. パフォーマンス要件

### 5.1 応答時間
- 技術者一覧取得: < 500ms
- 技術者詳細取得: < 200ms
- スキル更新: < 300ms
- マッチング実行: < 2s

### 5.2 キャッシュ戦略
- 技術者基本情報: Redis (30分)
- スキルマスタ: Application Cache (1時間)
- 検索結果: Redis (5分)

## 6. 監視・ロギング

### 6.1 業務ログ
- 技術者登録・更新・削除
- スキル変更履歴
- マッチング実行履歴
- 検索クエリログ

### 6.2 パフォーマンス監視
- API応答時間
- データベースクエリ性能
- キャッシュヒット率
- マッチングアルゴリズムの精度

---

**作成者**: システム化プロジェクトチーム