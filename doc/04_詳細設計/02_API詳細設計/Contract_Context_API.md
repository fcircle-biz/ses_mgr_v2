# Contract Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Contract Management Service
- **ベースURL**: `https://api.ses-mgr.com/contract/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 契約書の生成・管理・バージョン管理
- 電子署名プロセスの制御と状態管理
- 契約条件の管理と変更履歴の保持
- CloudSign連携による電子契約サービス統合
- 契約書テンプレート管理
- 契約ライフサイクル管理（作成→署名→実行→更新→終了）

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Contract Management API
  description: SES案件管理システムの契約管理API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/contract/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/contract/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 契約管理 ====================
  /contracts:
    get:
      summary: 契約一覧取得
      description: 契約の一覧を取得します。フィルタリングとページングに対応しています。
      tags:
        - Contracts
      parameters:
        - name: status
          in: query
          description: 契約ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/ContractStatus'
        - name: projectId
          in: query
          description: プロジェクトIDでフィルタ
          schema:
            type: string
            format: uuid
        - name: engineerId
          in: query
          description: 技術者IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: contractType
          in: query
          description: 契約種別でフィルタ
          schema:
            $ref: '#/components/schemas/ContractType'
        - name: expiringDays
          in: query
          description: 指定日数以内に期限が切れる契約のみ
          schema:
            type: integer
            minimum: 1
            maximum: 365
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
          description: 契約一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 新規契約作成
      description: マッチング結果から新しい契約を作成します。
      tags:
        - Contracts
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateContractRequest'
      responses:
        '201':
          description: 契約作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: ビジネスルール違反
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /contracts/{contractId}:
    get:
      summary: 契約詳細取得
      description: 指定されたIDの契約詳細を取得します。
      tags:
        - Contracts
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 契約詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractDetailResponse'
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
      summary: 契約情報更新
      description: 契約の基本情報を更新します。ドラフト状態でのみ更新可能です。
      tags:
        - Contracts
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateContractRequest'
      responses:
        '200':
          description: 契約更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 更新不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: 契約削除
      description: 契約を削除します。ドラフト状態でのみ削除可能です。
      tags:
        - Contracts
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 契約削除成功
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

  # ==================== 契約条件管理 ====================
  /contracts/{contractId}/terms:
    put:
      summary: 契約条件設定
      description: 契約の条件を設定・更新します。ドラフト状態でのみ設定可能です。
      tags:
        - Contract Terms
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ContractTermsRequest'
      responses:
        '200':
          description: 契約条件設定成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 条件設定不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 電子署名管理 ====================
  /contracts/{contractId}/signature:
    post:
      summary: 署名依頼開始
      description: CloudSignを使用して電子署名依頼を開始します。
      tags:
        - Digital Signature
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestSignatureRequest'
      responses:
        '200':
          description: 署名依頼開始成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SignatureRequestResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 署名依頼不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /contracts/{contractId}/signature/status:
    get:
      summary: 署名状況取得
      description: 契約の署名状況を取得します。
      tags:
        - Digital Signature
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 署名状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SignatureStatusResponse'
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

  # ==================== 契約ライフサイクル管理 ====================
  /contracts/{contractId}/cancel:
    post:
      summary: 契約キャンセル
      description: 契約をキャンセルします。署名完了後はキャンセル不可です。
      tags:
        - Contract Lifecycle
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CancelContractRequest'
      responses:
        '200':
          description: 契約キャンセル成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: キャンセル不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /contracts/{contractId}/extend:
    post:
      summary: 契約期間延長
      description: 契約期間を延長します。署名完了後のみ実行可能です。
      tags:
        - Contract Lifecycle
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExtendContractRequest'
      responses:
        '200':
          description: 契約期間延長成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 延長不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /contracts/{contractId}/terminate:
    post:
      summary: 契約終了
      description: 契約を終了します。署名完了後のみ実行可能です。
      tags:
        - Contract Lifecycle
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TerminateContractRequest'
      responses:
        '200':
          description: 契約終了成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 終了不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 契約書ドキュメント管理 ====================
  /contracts/{contractId}/document:
    get:
      summary: 契約書ドキュメント取得
      description: 契約書のPDFドキュメントを取得します。
      tags:
        - Document Management
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 契約書ドキュメント取得成功
          content:
            application/pdf:
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

  /contracts/{contractId}/document/preview:
    get:
      summary: 契約書プレビュー取得
      description: 契約書のプレビューHTMLを取得します。
      tags:
        - Document Management
      parameters:
        - name: contractId
          in: path
          required: true
          description: 契約ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 契約書プレビュー取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DocumentPreviewResponse'
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

  # ==================== 契約テンプレート管理 ====================
  /templates:
    get:
      summary: 契約テンプレート一覧取得
      description: 契約テンプレートの一覧を取得します。
      tags:
        - Contract Templates
      parameters:
        - name: contractType
          in: query
          description: 契約種別でフィルタ
          schema:
            $ref: '#/components/schemas/ContractType'
        - name: active
          in: query
          description: アクティブ状態でフィルタ
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: テンプレート一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ContractTemplateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 契約テンプレート作成
      description: 新しい契約テンプレートを作成します。
      tags:
        - Contract Templates
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateContractTemplateRequest'
      responses:
        '201':
          description: テンプレート作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractTemplateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /templates/{templateId}:
    get:
      summary: 契約テンプレート詳細取得
      description: 指定されたIDの契約テンプレート詳細を取得します。
      tags:
        - Contract Templates
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
                $ref: '#/components/schemas/ContractTemplateDetailResponse'
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
      summary: 契約テンプレート更新
      description: 契約テンプレートを更新します。新バージョンとして作成されます。
      tags:
        - Contract Templates
      parameters:
        - name: templateId
          in: path
          required: true
          description: テンプレートID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateContractTemplateRequest'
      responses:
        '200':
          description: テンプレート更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractTemplateResponse'
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

  /templates/{templateId}/activate:
    post:
      summary: 契約テンプレートアクティブ化
      description: 契約テンプレートをアクティブにします。
      tags:
        - Contract Templates
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
          description: テンプレートアクティブ化成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContractTemplateResponse'
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

  # ==================== CloudSign Webhook ====================
  /webhooks/cloudsign:
    post:
      summary: CloudSign Webhook
      description: CloudSignからの署名完了通知を受信します。
      tags:
        - Webhooks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CloudSignWebhookPayload'
      responses:
        '200':
          description: Webhook処理成功
        '400':
          description: 不正なWebhookペイロード
        '500':
          $ref: '#/components/responses/InternalServerError'
      security: []  # Webhookは認証不要

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    # ==================== Core Entities ====================
    ContractResponse:
      type: object
      properties:
        id:
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
        engineerIds:
          type: array
          items:
            type: string
            format: uuid
          description: 技術者ID一覧
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        contractorCompanyId:
          type: string
          format: uuid
          description: 受託会社ID
        contractorCompanyName:
          type: string
          description: 受託会社名
        contractNumber:
          type: string
          description: 契約番号
        title:
          type: string
          description: 契約タイトル
        type:
          $ref: '#/components/schemas/ContractType'
        status:
          $ref: '#/components/schemas/ContractStatus'
        terms:
          $ref: '#/components/schemas/ContractTerms'
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID
        version:
          type: string
          description: 契約バージョン
        cloudSignDocumentId:
          type: string
          description: CloudSignドキュメントID
        documentUrl:
          type: string
          format: uri
          description: 契約書URL
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        updatedAt:
          type: string
          format: date-time
          description: 更新日時

    ContractDetailResponse:
      allOf:
        - $ref: '#/components/schemas/ContractResponse'
        - type: object
          properties:
            signatures:
              type: array
              items:
                $ref: '#/components/schemas/DigitalSignature'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateContractRequest:
      type: object
      required:
        - projectId
        - engineerIds
        - customerId
        - contractorCompanyId
        - type
        - templateId
      properties:
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        engineerIds:
          type: array
          items:
            type: string
            format: uuid
          minItems: 1
          description: 技術者ID一覧
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        contractorCompanyId:
          type: string
          format: uuid
          description: 受託会社ID
        type:
          $ref: '#/components/schemas/ContractType'
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID
        title:
          type: string
          maxLength: 200
          description: 契約タイトル

    UpdateContractRequest:
      type: object
      properties:
        title:
          type: string
          maxLength: 200
          description: 契約タイトル
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    ContractTermsRequest:
      type: object
      required:
        - period
        - amount
        - workLocation
      properties:
        period:
          $ref: '#/components/schemas/ContractPeriod'
        amount:
          $ref: '#/components/schemas/ContractAmount'
        workLocation:
          $ref: '#/components/schemas/WorkLocation'
        workingHours:
          $ref: '#/components/schemas/WorkingHours'
        jobDescription:
          type: string
          maxLength: 2000
          description: 業務内容
        responsibilities:
          type: array
          items:
            type: string
          description: 責任範囲
        performanceRequirements:
          type: string
          maxLength: 1000
          description: 成果物要件
        confidentialityClause:
          type: string
          maxLength: 1000
          description: 機密保持条項
        ipClause:
          type: string
          maxLength: 1000
          description: 知的財産条項
        terminationClause:
          type: string
          maxLength: 1000
          description: 解約条項
        specialClauses:
          type: array
          items:
            $ref: '#/components/schemas/SpecialClause'
          description: 特別条項

    RequestSignatureRequest:
      type: object
      properties:
        signatories:
          type: array
          items:
            $ref: '#/components/schemas/SignatoryInfo'
          description: 署名者情報（省略時はデフォルト署名者）

    CancelContractRequest:
      type: object
      required:
        - reason
      properties:
        reason:
          type: string
          maxLength: 500
          description: キャンセル理由

    ExtendContractRequest:
      type: object
      required:
        - newEndDate
        - reason
      properties:
        newEndDate:
          type: string
          format: date
          description: 新しい終了日
        reason:
          type: string
          maxLength: 500
          description: 延長理由

    TerminateContractRequest:
      type: object
      required:
        - terminationDate
        - reason
      properties:
        terminationDate:
          type: string
          format: date
          description: 終了日
        reason:
          $ref: '#/components/schemas/ContractTerminationReason'
        terminationReasonDetail:
          type: string
          maxLength: 500
          description: 終了理由詳細

    # ==================== Value Objects ====================
    ContractTerms:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/ContractPeriod'
        amount:
          $ref: '#/components/schemas/ContractAmount'
        workLocation:
          $ref: '#/components/schemas/WorkLocation'
        workingHours:
          $ref: '#/components/schemas/WorkingHours'
        jobDescription:
          type: string
          description: 業務内容
        responsibilities:
          type: array
          items:
            type: string
          description: 責任範囲
        performanceRequirements:
          type: string
          description: 成果物要件
        confidentialityClause:
          type: string
          description: 機密保持条項
        ipClause:
          type: string
          description: 知的財産条項
        terminationClause:
          type: string
          description: 解約条項
        specialClauses:
          type: array
          items:
            $ref: '#/components/schemas/SpecialClause'
          description: 特別条項

    ContractPeriod:
      type: object
      required:
        - startDate
        - endDate
      properties:
        startDate:
          type: string
          format: date
          description: 開始日
        endDate:
          type: string
          format: date
          description: 終了日
        isIndefinite:
          type: boolean
          description: 期間の定めなし
        renewalType:
          $ref: '#/components/schemas/RenewalType'

    ContractAmount:
      type: object
      required:
        - pricingType
      properties:
        monthlyCost:
          $ref: '#/components/schemas/Money'
        hourlyRate:
          $ref: '#/components/schemas/Money'
        totalAmount:
          $ref: '#/components/schemas/Money'
        pricingType:
          $ref: '#/components/schemas/PricingType'
        paymentTerms:
          type: string
          description: 支払条件
        taxType:
          $ref: '#/components/schemas/TaxInclusionType'
        overtimeRate:
          $ref: '#/components/schemas/Money'
        holidayRate:
          $ref: '#/components/schemas/Money'
        allowances:
          type: array
          items:
            $ref: '#/components/schemas/AllowanceItem'

    WorkLocation:
      type: object
      properties:
        type:
          type: string
          enum: [CLIENT_SITE, REMOTE, HYBRID]
          description: 勤務形態
        address:
          type: string
          description: 勤務先住所
        remoteRatio:
          type: integer
          minimum: 0
          maximum: 100
          description: リモート勤務比率(%)

    WorkingHours:
      type: object
      properties:
        startTime:
          type: string
          format: time
          description: 開始時間
        endTime:
          type: string
          format: time
          description: 終了時間
        breakTime:
          type: integer
          description: 休憩時間（分）
        weeklyHours:
          type: integer
          description: 週間労働時間
        flexibleTime:
          type: boolean
          description: フレックスタイム制

    DigitalSignature:
      type: object
      properties:
        signatoryType:
          $ref: '#/components/schemas/SignatoryType'
        signatoryEmail:
          type: string
          format: email
          description: 署名者メールアドレス
        signatoryName:
          type: string
          description: 署名者氏名
        status:
          $ref: '#/components/schemas/SignatureStatus'
        requestedAt:
          type: string
          format: date-time
          description: 署名依頼日時
        signedAt:
          type: string
          format: date-time
          description: 署名完了日時
        signedBy:
          type: string
          description: 実際の署名者
        cloudSignSignatureId:
          type: string
          description: CloudSign署名者ID
        signatureUrl:
          type: string
          format: uri
          description: 署名用URL

    SpecialClause:
      type: object
      properties:
        title:
          type: string
          description: 条項タイトル
        content:
          type: string
          description: 条項内容
        mandatory:
          type: boolean
          description: 必須条項

    AllowanceItem:
      type: object
      properties:
        name:
          type: string
          description: 手当名
        amount:
          $ref: '#/components/schemas/Money'
        description:
          type: string
          description: 手当詳細

    Money:
      type: object
      properties:
        amount:
          type: number
          description: 金額
        currency:
          type: string
          default: "JPY"
          description: 通貨

    SignatoryInfo:
      type: object
      required:
        - type
        - email
        - name
      properties:
        type:
          $ref: '#/components/schemas/SignatoryType'
        email:
          type: string
          format: email
          description: 署名者メールアドレス
        name:
          type: string
          description: 署名者氏名

    # ==================== Response Objects ====================
    ContractPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/ContractResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer
        size:
          type: integer
        number:
          type: integer
        numberOfElements:
          type: integer
        first:
          type: boolean
        last:
          type: boolean
        empty:
          type: boolean

    SignatureRequestResponse:
      type: object
      properties:
        contractId:
          type: string
          format: uuid
          description: 契約ID
        cloudSignDocumentId:
          type: string
          description: CloudSignドキュメントID
        documentUrl:
          type: string
          format: uri
          description: 契約書URL
        signatures:
          type: array
          items:
            $ref: '#/components/schemas/DigitalSignature'

    SignatureStatusResponse:
      type: object
      properties:
        contractId:
          type: string
          format: uuid
          description: 契約ID
        overallStatus:
          $ref: '#/components/schemas/ContractStatus'
        signatures:
          type: array
          items:
            $ref: '#/components/schemas/DigitalSignature'
        completedCount:
          type: integer
          description: 完了済み署名数
        totalCount:
          type: integer
          description: 総署名数

    DocumentPreviewResponse:
      type: object
      properties:
        contractId:
          type: string
          format: uuid
          description: 契約ID
        htmlContent:
          type: string
          description: プレビューHTML
        generatedAt:
          type: string
          format: date-time
          description: 生成日時

    # ==================== Contract Templates ====================
    ContractTemplateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: テンプレートID
        templateName:
          type: string
          description: テンプレート名
        contractType:
          $ref: '#/components/schemas/ContractType'
        version:
          type: string
          description: テンプレートバージョン
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

    ContractTemplateDetailResponse:
      allOf:
        - $ref: '#/components/schemas/ContractTemplateResponse'
        - type: object
          properties:
            templateContent:
              type: string
              description: テンプレート本文
            variables:
              type: array
              items:
                $ref: '#/components/schemas/TemplateVariable'

    CreateContractTemplateRequest:
      type: object
      required:
        - templateName
        - contractType
        - templateContent
      properties:
        templateName:
          type: string
          maxLength: 100
          description: テンプレート名
        contractType:
          $ref: '#/components/schemas/ContractType'
        templateContent:
          type: string
          description: テンプレート本文
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'

    UpdateContractTemplateRequest:
      type: object
      properties:
        templateContent:
          type: string
          description: テンプレート本文
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'

    TemplateVariable:
      type: object
      properties:
        name:
          type: string
          description: 変数名
        placeholder:
          type: string
          description: プレースホルダー
        description:
          type: string
          description: 変数説明
        required:
          type: boolean
          description: 必須フラグ

    # ==================== CloudSign Integration ====================
    CloudSignWebhookPayload:
      type: object
      properties:
        eventType:
          type: string
          enum: [SIGNATURE_COMPLETED, DOCUMENT_COMPLETED, SIGNATURE_REJECTED]
          description: イベント種別
        documentId:
          type: string
          description: CloudSignドキュメントID
        signatoryId:
          type: string
          description: 署名者ID
        signedBy:
          type: string
          description: 署名者
        signedAt:
          type: string
          format: date-time
          description: 署名日時
        rejectionReason:
          type: string
          description: 拒否理由

    # ==================== Enums ====================
    ContractStatus:
      type: string
      enum:
        - DRAFT
        - PENDING_SIGNATURE
        - ACTIVE
        - CANCELLED
        - TERMINATED
      description: |
        契約ステータス
        * DRAFT - ドラフト
        * PENDING_SIGNATURE - 署名待ち
        * ACTIVE - アクティブ
        * CANCELLED - キャンセル
        * TERMINATED - 終了

    ContractType:
      type: string
      enum:
        - EMPLOYMENT_AGREEMENT
        - SUBCONTRACT_AGREEMENT
        - CONSULTING_AGREEMENT
        - DISPATCH_AGREEMENT
      description: |
        契約種別
        * EMPLOYMENT_AGREEMENT - 準委任契約
        * SUBCONTRACT_AGREEMENT - 請負契約
        * CONSULTING_AGREEMENT - コンサルティング契約
        * DISPATCH_AGREEMENT - 派遣契約

    SignatoryType:
      type: string
      enum:
        - CUSTOMER
        - CONTRACTOR
        - ENGINEER
        - GUARANTOR
      description: |
        署名者種別
        * CUSTOMER - 顧客
        * CONTRACTOR - 受託会社
        * ENGINEER - 技術者
        * GUARANTOR - 連帯保証人

    SignatureStatus:
      type: string
      enum:
        - PENDING
        - SENT
        - COMPLETED
        - REJECTED
        - NOT_REQUIRED
      description: |
        署名ステータス
        * PENDING - 待機
        * SENT - 送信済
        * COMPLETED - 完了
        * REJECTED - 拒否
        * NOT_REQUIRED - 署名不要

    PricingType:
      type: string
      enum:
        - MONTHLY
        - HOURLY
        - PROJECT
      description: |
        料金体系
        * MONTHLY - 月額固定
        * HOURLY - 時間単価
        * PROJECT - プロジェクト単価

    TaxInclusionType:
      type: string
      enum:
        - INCLUSIVE
        - EXCLUSIVE
      description: |
        税込/税別
        * INCLUSIVE - 税込
        * EXCLUSIVE - 税別

    RenewalType:
      type: string
      enum:
        - MANUAL
        - AUTOMATIC
        - NON_RENEWABLE
      description: |
        更新種別
        * MANUAL - 手動更新
        * AUTOMATIC - 自動更新
        * NON_RENEWABLE - 更新不可

    ContractTerminationReason:
      type: string
      enum:
        - PROJECT_COMPLETION
        - MUTUAL_AGREEMENT
        - BREACH_OF_CONTRACT
        - FORCE_MAJEURE
        - OTHER
      description: |
        契約終了理由
        * PROJECT_COMPLETION - プロジェクト完了
        * MUTUAL_AGREEMENT - 双方合意
        * BREACH_OF_CONTRACT - 契約違反
        * FORCE_MAJEURE - 不可抗力
        * OTHER - その他

    # ==================== Common Objects ====================
    Pageable:
      type: object
      properties:
        page:
          type: integer
          description: ページ番号
        size:
          type: integer
          description: ページサイズ
        sort:
          type: array
          items:
            type: string
          description: ソート条件

    AuditInfo:
      type: object
      properties:
        createdBy:
          type: string
          description: 作成者
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        lastModifiedBy:
          type: string
          description: 最終更新者
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
          description: エラーコード（例：CONTRACT_NOT_FOUND、CLOUDSIGN_API_ERROR）
          enum:
            # Contract固有エラー
            - CONTRACT_NOT_FOUND
            - CONTRACT_ALREADY_SIGNED
            - CLOUDSIGN_API_ERROR
            - SIGNATURE_TIMEOUT
            - CONTRACT_AMOUNT_INVALID
            - APPROVAL_REQUIRED
            - TEMPLATE_NOT_FOUND
            - ELECTRONIC_SIGNATURE_FAILED
            - CONTRACT_EXPIRATION_DATE_INVALID
            - SIGNATORY_INVALID
            - WEBHOOK_SIGNATURE_INVALID
            - CONTRACT_STATUS_TRANSITION_INVALID
            - PDF_GENERATION_FAILED
            - DOCUMENT_ENCRYPTION_FAILED
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
@RequestMapping("/api/v1/contracts")
@Validated
public class ContractController {
    
    private final ContractApplicationService contractService;
    private final ContractAssembler contractAssembler;
    
    @GetMapping
    public ResponseEntity<PagedModel<ContractResponse>> getContracts(
            @RequestParam(required = false) ContractStatus status,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID engineerId,
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) ContractType contractType,
            @RequestParam(required = false) Integer expiringDays,
            Pageable pageable) {
        
        ContractSearchCriteria criteria = ContractSearchCriteria.builder()
            .status(status)
            .projectId(projectId)
            .engineerId(engineerId)
            .customerId(customerId)
            .contractType(contractType)
            .expiringDays(expiringDays)
            .build();
            
        Page<Contract> contracts = contractService.searchContracts(criteria, pageable);
        
        return ResponseEntity.ok(
            contractAssembler.toPagedModel(contracts)
        );
    }
    
    @PostMapping
    public ResponseEntity<ContractResponse> createContract(
            @Valid @RequestBody CreateContractRequest request) {
        
        CreateContractCommand command = CreateContractCommand.builder()
            .projectId(request.getProjectId())
            .engineerIds(request.getEngineerIds())
            .customerId(request.getCustomerId())
            .contractorCompanyId(request.getContractorCompanyId())
            .type(request.getType())
            .templateId(request.getTemplateId())
            .title(request.getTitle())
            .build();
            
        Contract contract = contractService.createContract(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(contractAssembler.toModel(contract));
    }
    
    @GetMapping("/{contractId}")
    public ResponseEntity<ContractDetailResponse> getContract(
            @PathVariable UUID contractId) {
        
        Contract contract = contractService.getContract(contractId);
        
        return ResponseEntity.ok(
            contractAssembler.toDetailModel(contract)
        );
    }
    
    @PutMapping("/{contractId}/terms")
    public ResponseEntity<ContractResponse> setTerms(
            @PathVariable UUID contractId,
            @Valid @RequestBody ContractTermsRequest request) {
        
        SetContractTermsCommand command = SetContractTermsCommand.builder()
            .contractId(contractId)
            .period(request.getPeriod())
            .amount(request.getAmount())
            .workLocation(request.getWorkLocation())
            .workingHours(request.getWorkingHours())
            .jobDescription(request.getJobDescription())
            .responsibilities(request.getResponsibilities())
            .performanceRequirements(request.getPerformanceRequirements())
            .confidentialityClause(request.getConfidentialityClause())
            .ipClause(request.getIpClause())
            .terminationClause(request.getTerminationClause())
            .specialClauses(request.getSpecialClauses())
            .build();
            
        Contract contract = contractService.setTerms(command);
        
        return ResponseEntity.ok(
            contractAssembler.toModel(contract)
        );
    }
    
    @PostMapping("/{contractId}/signature")
    public ResponseEntity<SignatureRequestResponse> requestSignature(
            @PathVariable UUID contractId,
            @Valid @RequestBody RequestSignatureRequest request) {
        
        RequestSignatureCommand command = RequestSignatureCommand.builder()
            .contractId(contractId)
            .signatories(request.getSignatories())
            .build();
            
        SignatureRequestResult result = contractService.requestSignature(command);
        
        return ResponseEntity.ok(
            contractAssembler.toSignatureRequestResponse(result)
        );
    }
    
    @GetMapping("/{contractId}/signature/status")
    public ResponseEntity<SignatureStatusResponse> getSignatureStatus(
            @PathVariable UUID contractId) {
        
        Contract contract = contractService.getContract(contractId);
        
        return ResponseEntity.ok(
            contractAssembler.toSignatureStatusResponse(contract)
        );
    }
    
    @PostMapping("/{contractId}/extend")
    public ResponseEntity<ContractResponse> extendContract(
            @PathVariable UUID contractId,
            @Valid @RequestBody ExtendContractRequest request) {
        
        ExtendContractCommand command = ExtendContractCommand.builder()
            .contractId(contractId)
            .newEndDate(request.getNewEndDate())
            .reason(request.getReason())
            .build();
            
        Contract contract = contractService.extendContract(command);
        
        return ResponseEntity.ok(
            contractAssembler.toModel(contract)
        );
    }
    
    @PostMapping("/{contractId}/terminate")
    public ResponseEntity<ContractResponse> terminateContract(
            @PathVariable UUID contractId,
            @Valid @RequestBody TerminateContractRequest request) {
        
        TerminateContractCommand command = TerminateContractCommand.builder()
            .contractId(contractId)
            .terminationDate(request.getTerminationDate())
            .reason(request.getReason())
            .terminationReasonDetail(request.getTerminationReasonDetail())
            .build();
            
        Contract contract = contractService.terminateContract(command);
        
        return ResponseEntity.ok(
            contractAssembler.toModel(contract)
        );
    }
    
    @GetMapping("/{contractId}/document")
    public ResponseEntity<Resource> getContractDocument(
            @PathVariable UUID contractId) {
        
        byte[] pdfData = contractService.getContractDocument(contractId);
        
        ByteArrayResource resource = new ByteArrayResource(pdfData);
        
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .contentLength(pdfData.length)
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                "attachment; filename=\"contract_" + contractId + ".pdf\"")
            .body(resource);
    }
    
    @GetMapping("/{contractId}/document/preview")
    public ResponseEntity<DocumentPreviewResponse> getDocumentPreview(
            @PathVariable UUID contractId) {
        
        String htmlContent = contractService.generateDocumentPreview(contractId);
        
        DocumentPreviewResponse response = DocumentPreviewResponse.builder()
            .contractId(contractId)
            .htmlContent(htmlContent)
            .generatedAt(LocalDateTime.now())
            .build();
        
        return ResponseEntity.ok(response);
    }
}
```

### 3.2 アプリケーションサービス

```java
@Service
@Transactional
public class ContractApplicationService {
    
    private final ContractRepository contractRepository;
    private final ContractDomainService contractDomainService;
    private final CloudSignIntegrationService cloudSignService;
    private final ContractDocumentService documentService;
    private final ApplicationEventPublisher eventPublisher;
    
    public Page<Contract> searchContracts(ContractSearchCriteria criteria, Pageable pageable) {
        return contractRepository.findByCriteria(criteria, pageable);
    }
    
    public Contract createContract(CreateContractCommand command) {
        // ドメインサービスで契約作成
        Contract contract = contractDomainService.createContractFromMatching(
            command.getProjectId(),
            command.getEngineerIds(),
            command.getCustomerId(),
            command.getContractorCompanyId(),
            command.getType(),
            command.getTemplateId(),
            command.getTitle()
        );
        
        // 保存
        Contract savedContract = contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(savedContract);
        
        return savedContract;
    }
    
    public Contract setTerms(SetContractTermsCommand command) {
        // 契約取得
        Contract contract = contractRepository.findById(command.getContractId())
            .orElseThrow(() -> new ContractNotFoundException(command.getContractId()));
        
        // 契約条件設定
        ContractTerms terms = ContractTerms.builder()
            .period(command.getPeriod())
            .amount(command.getAmount())
            .workLocation(command.getWorkLocation())
            .workingHours(command.getWorkingHours())
            .jobDescription(command.getJobDescription())
            .responsibilities(command.getResponsibilities())
            .performanceRequirements(command.getPerformanceRequirements())
            .confidentialityClause(command.getConfidentialityClause())
            .ipClause(command.getIpClause())
            .terminationClause(command.getTerminationClause())
            .specialClauses(command.getSpecialClauses())
            .build();
            
        contract.setTerms(terms);
        
        // 保存
        Contract savedContract = contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(savedContract);
        
        return savedContract;
    }
    
    public SignatureRequestResult requestSignature(RequestSignatureCommand command) {
        // 契約取得
        Contract contract = contractRepository.findById(command.getContractId())
            .orElseThrow(() -> new ContractNotFoundException(command.getContractId()));
        
        // 署名依頼開始
        contract.requestSignature(cloudSignService);
        
        // 保存
        Contract savedContract = contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(savedContract);
        
        return SignatureRequestResult.builder()
            .contract(savedContract)
            .cloudSignDocumentId(savedContract.getCloudSignDocumentId())
            .documentUrl(savedContract.getDocumentUrl())
            .build();
    }
    
    public Contract extendContract(ExtendContractCommand command) {
        // 契約取得
        Contract contract = contractRepository.findById(command.getContractId())
            .orElseThrow(() -> new ContractNotFoundException(command.getContractId()));
        
        // 期間延長
        contract.extendPeriod(command.getNewEndDate(), command.getReason());
        
        // 保存
        Contract savedContract = contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(savedContract);
        
        return savedContract;
    }
    
    public Contract terminateContract(TerminateContractCommand command) {
        // 契約取得
        Contract contract = contractRepository.findById(command.getContractId())
            .orElseThrow(() -> new ContractNotFoundException(command.getContractId()));
        
        // 契約終了
        contract.terminate(
            command.getTerminationDate(),
            command.getReason()
        );
        
        // 保存
        Contract savedContract = contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(savedContract);
        
        return savedContract;
    }
    
    public byte[] getContractDocument(UUID contractId) {
        // 契約取得
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new ContractNotFoundException(contractId));
        
        // PDFドキュメント生成
        return documentService.generatePdf(contract);
    }
    
    public String generateDocumentPreview(UUID contractId) {
        // 契約取得
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> new ContractNotFoundException(contractId));
        
        // HTMLプレビュー生成
        return documentService.generateHtmlPreview(contract);
    }
    
    private void publishContractEvents(Contract contract) {
        contract.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        contract.markEventsAsCommitted();
    }
}
```

### 3.3 CloudSign Webhook ハンドラー

```java
@RestController
@RequestMapping("/api/v1/webhooks")
@Slf4j
public class WebhookController {
    
    private final ContractApplicationService contractService;
    private final CloudSignWebhookService webhookService;
    
    @PostMapping("/cloudsign")
    public ResponseEntity<Void> handleCloudSignWebhook(
            @RequestBody CloudSignWebhookPayload payload,
            HttpServletRequest request) {
        
        try {
            // Webhookの検証
            webhookService.validateWebhook(payload, request);
            
            // 署名完了処理
            if (payload.getEventType() == CloudSignEventType.SIGNATURE_COMPLETED) {
                webhookService.handleSignatureCompleted(payload);
            } else if (payload.getEventType() == CloudSignEventType.DOCUMENT_COMPLETED) {
                webhookService.handleDocumentCompleted(payload);
            } else if (payload.getEventType() == CloudSignEventType.SIGNATURE_REJECTED) {
                webhookService.handleSignatureRejected(payload);
            }
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            log.error("CloudSign Webhook処理エラー", e);
            return ResponseEntity.badRequest().build();
        }
    }
}

@Service
@Transactional
public class CloudSignWebhookService {
    
    private final ContractRepository contractRepository;
    private final ApplicationEventPublisher eventPublisher;
    
    public void handleSignatureCompleted(CloudSignWebhookPayload payload) {
        // 契約取得
        Contract contract = findContractByCloudSignDocumentId(payload.getDocumentId());
        
        // 署名完了処理
        SignatoryType signatoryType = mapToSignatoryType(payload.getSignatoryId());
        contract.completeSignature(
            signatoryType,
            payload.getSignedBy(),
            payload.getSignedAt()
        );
        
        // 保存
        contractRepository.save(contract);
        
        // イベント発行
        publishContractEvents(contract);
    }
    
    public void handleDocumentCompleted(CloudSignWebhookPayload payload) {
        // 全署名完了処理
        Contract contract = findContractByCloudSignDocumentId(payload.getDocumentId());
        
        // 契約アクティブ化は署名完了時に自動実行されるため、
        // ここでは追加処理があれば実装
        
        log.info("契約書署名完了: contractId={}", contract.getId());
    }
    
    public void handleSignatureRejected(CloudSignWebhookPayload payload) {
        // 署名拒否処理
        Contract contract = findContractByCloudSignDocumentId(payload.getDocumentId());
        
        SignatoryType signatoryType = mapToSignatoryType(payload.getSignatoryId());
        
        // 署名拒否処理の実装
        // 必要に応じて契約をキャンセル状態にする
        
        log.warn("契約書署名拒否: contractId={}, reason={}", 
            contract.getId(), payload.getRejectionReason());
    }
    
    private Contract findContractByCloudSignDocumentId(String cloudSignDocumentId) {
        return contractRepository.findByCloudSignDocumentId(cloudSignDocumentId)
            .orElseThrow(() -> new IllegalArgumentException(
                "CloudSign Document IDに対応する契約が見つかりません: " + cloudSignDocumentId));
    }
    
    private SignatoryType mapToSignatoryType(String signatoryId) {
        // CloudSignの署名者IDからSignatoryTypeにマッピング
        // 実装は使用するCloudSignのAPI仕様による
        return SignatoryType.CUSTOMER; // 仮実装
    }
    
    private void publishContractEvents(Contract contract) {
        contract.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        contract.markEventsAsCommitted();
    }
}
```

### 3.4 契約書ドキュメント生成サービス

```java
@Service
public class ContractDocumentService {
    
    private final ContractTemplateRepository templateRepository;
    private final PdfGenerationService pdfService;
    private final TemplateEngine templateEngine;
    
    public byte[] generatePdf(Contract contract) {
        // テンプレート取得
        ContractTemplate template = templateRepository.findById(contract.getTemplateId())
            .orElseThrow(() -> new IllegalStateException("契約テンプレートが見つかりません"));
        
        // ドキュメント生成
        String htmlContent = template.generateContractDocument(contract);
        
        // PDF生成
        return pdfService.generatePdf(htmlContent);
    }
    
    public String generateHtmlPreview(Contract contract) {
        // テンプレート取得
        ContractTemplate template = templateRepository.findById(contract.getTemplateId())
            .orElseThrow(() -> new IllegalStateException("契約テンプレートが見つかりません"));
        
        // ドキュメント生成
        return template.generateContractDocument(contract);
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC (Role-Based Access Control)
- **権限レベル**:
  - `contract:read` - 契約参照
  - `contract:write` - 契約作成・更新
  - `contract:signature` - 署名依頼・管理
  - `contract:admin` - 全契約管理
  - `template:read` - テンプレート参照
  - `template:write` - テンプレート作成・更新

### 4.2 APIセキュリティ
- JWTトークンによる認証
- OAuth 2.0スコープによる認可
- CORS設定
- Rate Limiting
- 入力値検証・サニタイゼーション

### 4.3 データ保護
- 個人情報の暗号化
- 監査ログの記録
- データマスキング（開発環境）
- GDPR対応（データ削除要求）

## 5. CloudSign連携仕様

### 5.1 API連携フロー
1. 契約書ドキュメント作成
2. CloudSignでドキュメント登録
3. 署名者設定・署名依頼送信
4. Webhook経由での署名状況受信
5. 署名完了後の契約アクティブ化

### 5.2 エラーハンドリング
- CloudSign API呼び出し失敗時のリトライ
- Webhook受信失敗時の再送対応
- 署名タイムアウト時の処理

### 5.3 セキュリティ
- Webhook署名検証
- API Key管理
- 通信暗号化（TLS 1.3）

## 6. エラーハンドリング

### 6.1 主要なエラーパターン

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "契約条件は必須です",
  "path": "/api/v1/contracts/12345/terms",
  "validationErrors": [
    {
      "field": "period.startDate",
      "message": "開始日は必須です"
    },
    {
      "field": "amount.monthlyCost",
      "message": "月額費用は正の値である必要があります"
    }
  ]
}
```

### 6.2 主要なエラーコード
- `400` - バリデーションエラー
- `401` - 認証エラー
- `403` - 権限不足
- `404` - リソース未発見
- `409` - ビジネスルール違反（状態不正、期限切れなど）
- `500` - 内部サーバーエラー
- `502` - CloudSign API連携エラー
- `503` - サービス一時停止

## 7. パフォーマンス要件

### 7.1 応答時間
- 契約一覧取得: < 500ms
- 契約詳細取得: < 200ms
- 契約作成: < 1s
- 契約条件設定: < 1s
- 署名依頼開始: < 3s (CloudSign API連携含む)
- 契約書PDF生成: < 2s

### 7.2 スループット
- 最大同時接続数: 1000
- 最大リクエスト数: 5000 req/min
- Webhook処理: < 1s

### 7.3 可用性
- 稼働率: 99.9%
- CloudSign連携失敗時の代替フロー
- 非同期処理による応答性向上

## 8. 監視・ロギング

### 8.1 ログレベル
- `ERROR`: エラー・例外・CloudSign連携失敗
- `WARN`: 警告・業務ルール違反・署名タイムアウト
- `INFO`: 業務イベント・契約状態変更・署名完了
- `DEBUG`: デバッグ情報・API呼び出し詳細

### 8.2 監視項目
- API応答時間
- エラー率
- CloudSign API連携状況
- 署名完了率
- 契約書生成処理時間
- Webhook処理状況

### 8.3 業務監視
- 署名期限切れアラート
- 契約期限切れアラート
- 異常な契約キャンセル率
- CloudSign連携エラー率

---

**作成者**: システム化プロジェクトチーム