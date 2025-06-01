# Billing Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Billing Management Service
- **ベースURL**: `https://api.ses-mgr.com/billing/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 承認済み工数表からの請求書自動生成
- 顧客別請求管理と請求条件制御
- 支払処理と追跡管理
- MoneyForward会計システム統合
- 消費税・源泉税の自動計算と処理
- 与信管理と債権追跡
- 請求書テンプレートとカスタマイズ
- 多通貨対応と為替レート管理
- 入金消込と支払照合
- 請求分析レポートと収益管理

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Billing Management API
  description: SES案件管理システムの請求管理API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/billing/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/billing/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 請求書管理 ====================
  /invoices:
    get:
      summary: 請求書一覧取得
      description: 請求書の一覧を取得します。フィルタリングとページングに対応しています。
      tags:
        - Invoices
      parameters:
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
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
          description: 請求書ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/InvoiceStatus'
        - name: billingPeriod
          in: query
          description: 請求対象月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
            example: "2024-03"
        - name: issueDateFrom
          in: query
          description: 発行日開始
          schema:
            type: string
            format: date
        - name: issueDateTo
          in: query
          description: 発行日終了
          schema:
            type: string
            format: date
        - name: dueDateFrom
          in: query
          description: 支払期限開始
          schema:
            type: string
            format: date
        - name: dueDateTo
          in: query
          description: 支払期限終了
          schema:
            type: string
            format: date
        - name: isOverdue
          in: query
          description: 支払期限超過のみ
          schema:
            type: boolean
        - name: currency
          in: query
          description: 通貨でフィルタ
          schema:
            type: string
            default: "JPY"
        - name: minAmount
          in: query
          description: 最小金額
          schema:
            type: number
            minimum: 0
        - name: maxAmount
          in: query
          description: 最大金額
          schema:
            type: number
            minimum: 0
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
            default: "issueDate,desc"
      responses:
        '200':
          description: 請求書一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoicePageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 請求書手動作成
      description: 工数表から手動で請求書を作成します。
      tags:
        - Invoices
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateInvoiceRequest'
      responses:
        '201':
          description: 請求書作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceResponse'
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

  /invoices/generate:
    post:
      summary: 請求書自動生成
      description: 承認済み工数表から請求書を自動生成します。
      tags:
        - Invoices
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateInvoiceRequest'
      responses:
        '201':
          description: 請求書生成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BulkInvoiceGenerationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /invoices/{invoiceId}:
    get:
      summary: 請求書詳細取得
      description: 指定されたIDの請求書詳細を取得します。
      tags:
        - Invoices
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 請求書詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceDetailResponse'
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
      summary: 請求書更新
      description: 請求書情報を更新します。ドラフト状態でのみ更新可能です。
      tags:
        - Invoices
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateInvoiceRequest'
      responses:
        '200':
          description: 請求書更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceResponse'
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
      summary: 請求書削除
      description: 請求書を削除します。ドラフト状態でのみ削除可能です。
      tags:
        - Invoices
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 請求書削除成功
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

  # ==================== 請求書ライフサイクル ====================
  /invoices/{invoiceId}/issue:
    post:
      summary: 請求書発行
      description: ドラフト状態の請求書を発行します。
      tags:
        - Invoice Lifecycle
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 請求書発行成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 発行不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /invoices/{invoiceId}/send:
    post:
      summary: 請求書送付
      description: 発行済み請求書を顧客に送付します。
      tags:
        - Invoice Lifecycle
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SendInvoiceRequest'
      responses:
        '200':
          description: 請求書送付成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 送付不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /invoices/{invoiceId}/cancel:
    post:
      summary: 請求書キャンセル
      description: 請求書をキャンセルします。
      tags:
        - Invoice Lifecycle
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CancelInvoiceRequest'
      responses:
        '200':
          description: 請求書キャンセル成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceResponse'
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

  # ==================== 支払管理 ====================
  /invoices/{invoiceId}/payments:
    get:
      summary: 支払履歴取得
      description: 請求書の支払履歴を取得します。
      tags:
        - Payments
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 支払履歴取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentHistoryResponse'
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
      summary: 入金記録
      description: 請求書に対する入金を記録します。
      tags:
        - Payments
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RecordPaymentRequest'
      responses:
        '201':
          description: 入金記録成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 入金記録不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /payments/{paymentId}:
    get:
      summary: 入金詳細取得
      description: 指定されたIDの入金詳細を取得します。
      tags:
        - Payments
      parameters:
        - name: paymentId
          in: path
          required: true
          description: 入金ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 入金詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentDetailResponse'
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
      summary: 入金情報更新
      description: 入金情報を更新します。
      tags:
        - Payments
      parameters:
        - name: paymentId
          in: path
          required: true
          description: 入金ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePaymentRequest'
      responses:
        '200':
          description: 入金情報更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaymentResponse'
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
      summary: 入金記録削除
      description: 入金記録を削除します。
      tags:
        - Payments
      parameters:
        - name: paymentId
          in: path
          required: true
          description: 入金ID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 入金記録削除成功
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

  # ==================== 支払照合管理 ====================
  /reconciliation/bank-statements:
    post:
      summary: 銀行明細アップロード
      description: 銀行明細をアップロードして自動照合を実行します。
      tags:
        - Payment Reconciliation
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  description: 銀行明細ファイル（CSV/Excel）
                accountId:
                  type: string
                  format: uuid
                  description: 銀行口座ID
                statementDate:
                  type: string
                  format: date
                  description: 明細日付
              required:
                - file
                - accountId
                - statementDate
      responses:
        '200':
          description: 照合処理開始成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReconciliationJobResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /reconciliation/jobs/{jobId}:
    get:
      summary: 照合ジョブ状況取得
      description: 照合ジョブの実行状況を取得します。
      tags:
        - Payment Reconciliation
      parameters:
        - name: jobId
          in: path
          required: true
          description: 照合ジョブID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 照合ジョブ状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReconciliationJobStatusResponse'
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

  /reconciliation/matches:
    get:
      summary: 照合結果一覧取得
      description: 入金照合結果の一覧を取得します。
      tags:
        - Payment Reconciliation
      parameters:
        - name: accountId
          in: query
          description: 銀行口座IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: matchStatus
          in: query
          description: 照合状況でフィルタ
          schema:
            $ref: '#/components/schemas/MatchStatus'
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
      responses:
        '200':
          description: 照合結果一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReconciliationMatchPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /reconciliation/matches/{matchId}/approve:
    post:
      summary: 照合結果承認
      description: 照合結果を承認して入金を確定します。
      tags:
        - Payment Reconciliation
      parameters:
        - name: matchId
          in: path
          required: true
          description: 照合ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 照合結果承認成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReconciliationMatchResponse'
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

  # ==================== 与信・債権管理 ====================
  /customers/{customerId}/credit:
    get:
      summary: 顧客与信情報取得
      description: 顧客の与信情報を取得します。
      tags:
        - Credit Management
      parameters:
        - name: customerId
          in: path
          required: true
          description: 顧客ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 与信情報取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CustomerCreditResponse'
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
      summary: 顧客与信情報更新
      description: 顧客の与信情報を更新します。
      tags:
        - Credit Management
      parameters:
        - name: customerId
          in: path
          required: true
          description: 顧客ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateCustomerCreditRequest'
      responses:
        '200':
          description: 与信情報更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CustomerCreditResponse'
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

  /receivables:
    get:
      summary: 売掛金一覧取得
      description: 売掛金の一覧を取得します。
      tags:
        - Credit Management
      parameters:
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          description: 売掛金ステータスでフィルタ
          schema:
            $ref: '#/components/schemas/ReceivableStatus'
        - name: agingDays
          in: query
          description: 指定日数以上経過した売掛金のみ
          schema:
            type: integer
            minimum: 0
        - name: minAmount
          in: query
          description: 最小金額
          schema:
            type: number
            minimum: 0
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
      responses:
        '200':
          description: 売掛金一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReceivablePageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 請求書テンプレート管理 ====================
  /templates:
    get:
      summary: 請求書テンプレート一覧取得
      description: 請求書テンプレートの一覧を取得します。
      tags:
        - Invoice Templates
      parameters:
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
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
                  $ref: '#/components/schemas/InvoiceTemplateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 請求書テンプレート作成
      description: 新しい請求書テンプレートを作成します。
      tags:
        - Invoice Templates
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateInvoiceTemplateRequest'
      responses:
        '201':
          description: テンプレート作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceTemplateResponse'
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
      summary: 請求書テンプレート詳細取得
      description: 指定されたIDの請求書テンプレート詳細を取得します。
      tags:
        - Invoice Templates
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
                $ref: '#/components/schemas/InvoiceTemplateDetailResponse'
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
      summary: 請求書テンプレート更新
      description: 請求書テンプレートを更新します。
      tags:
        - Invoice Templates
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
              $ref: '#/components/schemas/UpdateInvoiceTemplateRequest'
      responses:
        '200':
          description: テンプレート更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceTemplateResponse'
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

  # ==================== MoneyForward連携 ====================
  /moneyforward/sync:
    post:
      summary: MoneyForward会計データ同期
      description: 請求書・入金データをMoneyForwardに同期します。
      tags:
        - MoneyForward Integration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MoneyForwardSyncRequest'
      responses:
        '200':
          description: 同期処理開始成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MoneyForwardSyncResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /moneyforward/sync/{syncId}:
    get:
      summary: MoneyForward同期状況取得
      description: MoneyForward同期の実行状況を取得します。
      tags:
        - MoneyForward Integration
      parameters:
        - name: syncId
          in: path
          required: true
          description: 同期ID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 同期状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MoneyForwardSyncStatusResponse'
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

  # ==================== 多通貨・為替管理 ====================
  /currencies:
    get:
      summary: 対応通貨一覧取得
      description: システムで対応している通貨の一覧を取得します。
      tags:
        - Currency Management
      responses:
        '200':
          description: 対応通貨一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/CurrencyResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /exchange-rates:
    get:
      summary: 為替レート一覧取得
      description: 為替レートの履歴を取得します。
      tags:
        - Currency Management
      parameters:
        - name: baseCurrency
          in: query
          description: 基準通貨
          schema:
            type: string
            default: "JPY"
        - name: targetCurrency
          in: query
          description: 対象通貨
          schema:
            type: string
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
      responses:
        '200':
          description: 為替レート一覧取得成功
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/ExchangeRateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 為替レート手動設定
      description: 為替レートを手動で設定します。
      tags:
        - Currency Management
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SetExchangeRateRequest'
      responses:
        '201':
          description: 為替レート設定成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExchangeRateResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== レポート・分析 ====================
  /reports/billing-summary:
    get:
      summary: 請求サマリーレポート取得
      description: 指定期間の請求サマリーレポートを取得します。
      tags:
        - Reports
      parameters:
        - name: periodFrom
          in: query
          required: true
          description: 開始月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: periodTo
          in: query
          required: true
          description: 終了月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: currency
          in: query
          description: 通貨でフィルタ
          schema:
            type: string
            default: "JPY"
      responses:
        '200':
          description: 請求サマリーレポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BillingSummaryReportResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /reports/aging:
    get:
      summary: 売掛金エイジングレポート取得
      description: 売掛金の年齢分析レポートを取得します。
      tags:
        - Reports
      parameters:
        - name: asOfDate
          in: query
          description: 基準日
          schema:
            type: string
            format: date
        - name: customerId
          in: query
          description: 顧客IDでフィルタ
          schema:
            type: string
            format: uuid
        - name: currency
          in: query
          description: 通貨でフィルタ
          schema:
            type: string
            default: "JPY"
      responses:
        '200':
          description: エイジングレポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgingReportResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /reports/revenue:
    get:
      summary: 収益レポート取得
      description: 指定期間の収益レポートを取得します。
      tags:
        - Reports
      parameters:
        - name: periodFrom
          in: query
          required: true
          description: 開始月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: periodTo
          in: query
          required: true
          description: 終了月 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: groupBy
          in: query
          description: グループ化条件
          schema:
            type: string
            enum: [CUSTOMER, PROJECT, ENGINEER, MONTH]
            default: "CUSTOMER"
        - name: currency
          in: query
          description: 通貨でフィルタ
          schema:
            type: string
            default: "JPY"
      responses:
        '200':
          description: 収益レポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RevenueReportResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== ドキュメント出力 ====================
  /invoices/{invoiceId}/document:
    get:
      summary: 請求書PDF取得
      description: 請求書のPDFドキュメントを取得します。
      tags:
        - Document Export
      parameters:
        - name: invoiceId
          in: path
          required: true
          description: 請求書ID
          schema:
            type: string
            format: uuid
        - name: format
          in: query
          description: 出力形式
          schema:
            type: string
            enum: [PDF, EXCEL]
            default: "PDF"
      responses:
        '200':
          description: 請求書ドキュメント取得成功
          content:
            application/pdf:
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
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /exports/invoices:
    post:
      summary: 請求書一括エクスポート
      description: 複数の請求書を一括でエクスポートします。
      tags:
        - Document Export
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BulkExportInvoicesRequest'
      responses:
        '200':
          description: エクスポート処理開始成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportJobResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /exports/jobs/{jobId}:
    get:
      summary: エクスポートジョブ状況取得
      description: エクスポートジョブの実行状況を取得します。
      tags:
        - Document Export
      parameters:
        - name: jobId
          in: path
          required: true
          description: エクスポートジョブID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: エクスポートジョブ状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportJobStatusResponse'
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

  /exports/jobs/{jobId}/download:
    get:
      summary: エクスポートファイルダウンロード
      description: 完了したエクスポートファイルをダウンロードします。
      tags:
        - Document Export
      parameters:
        - name: jobId
          in: path
          required: true
          description: エクスポートジョブID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: ファイルダウンロード成功
          content:
            application/zip:
              schema:
                type: string
                format: binary
            application/pdf:
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
    InvoiceResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 請求書ID
        invoiceNumber:
          type: string
          description: 請求書番号
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        projectName:
          type: string
          description: プロジェクト名
        contractId:
          type: string
          format: uuid
          description: 契約ID
        billingPeriod:
          $ref: '#/components/schemas/BillingPeriod'
        status:
          $ref: '#/components/schemas/InvoiceStatus'
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID
        issueDate:
          type: string
          format: date
          description: 発行日
        dueDate:
          type: string
          format: date
          description: 支払期限
        subtotalAmount:
          $ref: '#/components/schemas/Money'
        taxAmount:
          $ref: '#/components/schemas/Money'
        totalAmount:
          $ref: '#/components/schemas/Money'
        paidAmount:
          $ref: '#/components/schemas/Money'
        remainingAmount:
          $ref: '#/components/schemas/Money'
        taxSettings:
          $ref: '#/components/schemas/TaxSettings'
        billingAddress:
          $ref: '#/components/schemas/BillingAddress'
        paymentTerms:
          type: string
          description: 支払条件
        notes:
          type: string
          description: 備考
        sentAt:
          type: string
          format: date-time
          description: 送付日時
        createdAt:
          type: string
          format: date-time
          description: 作成日時
        updatedAt:
          type: string
          format: date-time
          description: 更新日時

    InvoiceDetailResponse:
      allOf:
        - $ref: '#/components/schemas/InvoiceResponse'
        - type: object
          properties:
            lineItems:
              type: array
              items:
                $ref: '#/components/schemas/InvoiceLineItem'
            timesheetIds:
              type: array
              items:
                type: string
                format: uuid
              description: 請求対象工数表ID一覧
            paymentHistory:
              type: array
              items:
                $ref: '#/components/schemas/PaymentSummary'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    CreateInvoiceRequest:
      type: object
      required:
        - customerId
        - projectId
        - contractId
        - billingPeriod
        - templateId
      properties:
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        projectId:
          type: string
          format: uuid
          description: プロジェクトID
        contractId:
          type: string
          format: uuid
          description: 契約ID
        billingPeriod:
          $ref: '#/components/schemas/BillingPeriod'
        templateId:
          type: string
          format: uuid
          description: 使用テンプレートID
        timesheetIds:
          type: array
          items:
            type: string
            format: uuid
          description: 請求対象工数表ID一覧
        dueDate:
          type: string
          format: date
          description: 支払期限（省略時は支払条件から自動計算）
        notes:
          type: string
          maxLength: 1000
          description: 備考

    GenerateInvoiceRequest:
      type: object
      required:
        - billingPeriod
      properties:
        billingPeriod:
          $ref: '#/components/schemas/BillingPeriod'
        customerIds:
          type: array
          items:
            type: string
            format: uuid
          description: 対象顧客ID一覧（省略時は全顧客）
        projectIds:
          type: array
          items:
            type: string
            format: uuid
          description: 対象プロジェクトID一覧（省略時は全プロジェクト）
        autoIssue:
          type: boolean
          default: false
          description: 自動発行フラグ

    UpdateInvoiceRequest:
      type: object
      properties:
        dueDate:
          type: string
          format: date
          description: 支払期限
        notes:
          type: string
          maxLength: 1000
          description: 備考
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    SendInvoiceRequest:
      type: object
      properties:
        recipientEmails:
          type: array
          items:
            type: string
            format: email
          description: 送付先メールアドレス（省略時は顧客設定から取得）
        ccEmails:
          type: array
          items:
            type: string
            format: email
          description: CCメールアドレス
        subject:
          type: string
          maxLength: 200
          description: メール件名（省略時はデフォルト件名）
        message:
          type: string
          maxLength: 2000
          description: メール本文

    CancelInvoiceRequest:
      type: object
      required:
        - reason
      properties:
        reason:
          type: string
          maxLength: 500
          description: キャンセル理由

    # ==================== Payment Entities ====================
    PaymentResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 入金ID
        invoiceId:
          type: string
          format: uuid
          description: 請求書ID
        amount:
          $ref: '#/components/schemas/Money'
        paymentDate:
          type: string
          format: date
          description: 入金日
        paymentMethod:
          $ref: '#/components/schemas/PaymentMethod'
        bankAccount:
          $ref: '#/components/schemas/BankAccountInfo'
        reference:
          type: string
          description: 振込名義・参照番号
        notes:
          type: string
          description: 備考
        recordedAt:
          type: string
          format: date-time
          description: 記録日時
        recordedBy:
          type: string
          description: 記録者

    PaymentDetailResponse:
      allOf:
        - $ref: '#/components/schemas/PaymentResponse'
        - type: object
          properties:
            reconciliationInfo:
              $ref: '#/components/schemas/ReconciliationInfo'
            auditInfo:
              $ref: '#/components/schemas/AuditInfo'

    RecordPaymentRequest:
      type: object
      required:
        - amount
        - paymentDate
        - paymentMethod
      properties:
        amount:
          $ref: '#/components/schemas/Money'
        paymentDate:
          type: string
          format: date
          description: 入金日
        paymentMethod:
          $ref: '#/components/schemas/PaymentMethod'
        bankAccountId:
          type: string
          format: uuid
          description: 入金先銀行口座ID
        reference:
          type: string
          maxLength: 100
          description: 振込名義・参照番号
        notes:
          type: string
          maxLength: 500
          description: 備考

    UpdatePaymentRequest:
      type: object
      properties:
        amount:
          $ref: '#/components/schemas/Money'
        paymentDate:
          type: string
          format: date
          description: 入金日
        reference:
          type: string
          maxLength: 100
          description: 振込名義・参照番号
        notes:
          type: string
          maxLength: 500
          description: 備考
        version:
          type: integer
          description: バージョン (楽観的ロック用)

    PaymentHistoryResponse:
      type: object
      properties:
        invoiceId:
          type: string
          format: uuid
          description: 請求書ID
        totalAmount:
          $ref: '#/components/schemas/Money'
        paidAmount:
          $ref: '#/components/schemas/Money'
        remainingAmount:
          $ref: '#/components/schemas/Money'
        payments:
          type: array
          items:
            $ref: '#/components/schemas/PaymentResponse'

    # ==================== Credit & Receivables ====================
    CustomerCreditResponse:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        creditLimit:
          $ref: '#/components/schemas/Money'
        currentBalance:
          $ref: '#/components/schemas/Money'
        availableCredit:
          $ref: '#/components/schemas/Money'
        creditRating:
          $ref: '#/components/schemas/CreditRating'
        paymentTerms:
          type: string
          description: 支払条件
        lastCreditReview:
          type: string
          format: date
          description: 最終与信審査日
        nextReviewDate:
          type: string
          format: date
          description: 次回審査予定日
        riskLevel:
          $ref: '#/components/schemas/RiskLevel'
        notes:
          type: string
          description: 与信備考

    UpdateCustomerCreditRequest:
      type: object
      properties:
        creditLimit:
          $ref: '#/components/schemas/Money'
        creditRating:
          $ref: '#/components/schemas/CreditRating'
        paymentTerms:
          type: string
          maxLength: 100
          description: 支払条件
        riskLevel:
          $ref: '#/components/schemas/RiskLevel'
        notes:
          type: string
          maxLength: 1000
          description: 与信備考

    ReceivableResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 売掛金ID
        invoiceId:
          type: string
          format: uuid
          description: 請求書ID
        invoiceNumber:
          type: string
          description: 請求書番号
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        amount:
          $ref: '#/components/schemas/Money'
        originalAmount:
          $ref: '#/components/schemas/Money'
        status:
          $ref: '#/components/schemas/ReceivableStatus'
        issueDate:
          type: string
          format: date
          description: 請求日
        dueDate:
          type: string
          format: date
          description: 支払期限
        agingDays:
          type: integer
          description: 経過日数
        lastPaymentDate:
          type: string
          format: date
          description: 最終入金日

    # ==================== Reconciliation ====================
    ReconciliationJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
          description: 照合ジョブID
        accountId:
          type: string
          format: uuid
          description: 銀行口座ID
        statementDate:
          type: string
          format: date
          description: 明細日付
        status:
          $ref: '#/components/schemas/JobStatus'
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    ReconciliationJobStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
          description: 照合ジョブID
        status:
          $ref: '#/components/schemas/JobStatus'
        totalRecords:
          type: integer
          description: 総レコード数
        processedRecords:
          type: integer
          description: 処理済みレコード数
        matchedRecords:
          type: integer
          description: 照合済みレコード数
        unmatchedRecords:
          type: integer
          description: 未照合レコード数
        errorRecords:
          type: integer
          description: エラーレコード数
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        completedAt:
          type: string
          format: date-time
          description: 完了日時
        errorMessage:
          type: string
          description: エラーメッセージ

    ReconciliationMatchResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 照合ID
        bankTransactionId:
          type: string
          description: 銀行取引ID
        invoiceId:
          type: string
          format: uuid
          description: 請求書ID
        paymentId:
          type: string
          format: uuid
          description: 入金ID
        matchStatus:
          $ref: '#/components/schemas/MatchStatus'
        confidence:
          type: number
          minimum: 0
          maximum: 100
          description: 照合信頼度（%）
        bankAmount:
          $ref: '#/components/schemas/Money'
        invoiceAmount:
          $ref: '#/components/schemas/Money'
        amountDifference:
          $ref: '#/components/schemas/Money'
        transactionDate:
          type: string
          format: date
          description: 取引日
        bankReference:
          type: string
          description: 銀行取引参照
        matchedAt:
          type: string
          format: date-time
          description: 照合日時
        approvedAt:
          type: string
          format: date-time
          description: 承認日時

    # ==================== Templates ====================
    InvoiceTemplateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: テンプレートID
        templateName:
          type: string
          description: テンプレート名
        customerId:
          type: string
          format: uuid
          description: 顧客ID（顧客専用テンプレートの場合）
        isDefault:
          type: boolean
          description: デフォルトテンプレート
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

    InvoiceTemplateDetailResponse:
      allOf:
        - $ref: '#/components/schemas/InvoiceTemplateResponse'
        - type: object
          properties:
            templateContent:
              type: string
              description: テンプレート本文（HTML）
            headerContent:
              type: string
              description: ヘッダー内容
            footerContent:
              type: string
              description: フッター内容
            variables:
              type: array
              items:
                $ref: '#/components/schemas/TemplateVariable'

    CreateInvoiceTemplateRequest:
      type: object
      required:
        - templateName
        - templateContent
      properties:
        templateName:
          type: string
          maxLength: 100
          description: テンプレート名
        customerId:
          type: string
          format: uuid
          description: 顧客ID（顧客専用の場合）
        templateContent:
          type: string
          description: テンプレート本文（HTML）
        headerContent:
          type: string
          description: ヘッダー内容
        footerContent:
          type: string
          description: フッター内容
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'

    UpdateInvoiceTemplateRequest:
      type: object
      properties:
        templateContent:
          type: string
          description: テンプレート本文（HTML）
        headerContent:
          type: string
          description: ヘッダー内容
        footerContent:
          type: string
          description: フッター内容
        variables:
          type: array
          items:
            $ref: '#/components/schemas/TemplateVariable'

    # ==================== MoneyForward Integration ====================
    MoneyForwardSyncRequest:
      type: object
      properties:
        syncType:
          $ref: '#/components/schemas/SyncType'
        dateFrom:
          type: string
          format: date
          description: 同期開始日
        dateTo:
          type: string
          format: date
          description: 同期終了日
        invoiceIds:
          type: array
          items:
            type: string
            format: uuid
          description: 同期対象請求書ID一覧
        forceSync:
          type: boolean
          default: false
          description: 強制同期フラグ

    MoneyForwardSyncResponse:
      type: object
      properties:
        syncId:
          type: string
          format: uuid
          description: 同期ID
        syncType:
          $ref: '#/components/schemas/SyncType'
        status:
          $ref: '#/components/schemas/JobStatus'
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    MoneyForwardSyncStatusResponse:
      type: object
      properties:
        syncId:
          type: string
          format: uuid
          description: 同期ID
        status:
          $ref: '#/components/schemas/JobStatus'
        totalRecords:
          type: integer
          description: 総レコード数
        processedRecords:
          type: integer
          description: 処理済みレコード数
        successRecords:
          type: integer
          description: 成功レコード数
        errorRecords:
          type: integer
          description: エラーレコード数
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        completedAt:
          type: string
          format: date-time
          description: 完了日時
        errorMessage:
          type: string
          description: エラーメッセージ
        syncResults:
          type: array
          items:
            $ref: '#/components/schemas/SyncResult'

    # ==================== Currency & Exchange ====================
    CurrencyResponse:
      type: object
      properties:
        code:
          type: string
          description: 通貨コード（ISO 4217）
        name:
          type: string
          description: 通貨名
        symbol:
          type: string
          description: 通貨記号
        isActive:
          type: boolean
          description: アクティブ状態

    ExchangeRateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
          description: 為替レートID
        baseCurrency:
          type: string
          description: 基準通貨
        targetCurrency:
          type: string
          description: 対象通貨
        rate:
          type: number
          description: 為替レート
        effectiveDate:
          type: string
          format: date
          description: 有効日
        source:
          $ref: '#/components/schemas/ExchangeRateSource'
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    SetExchangeRateRequest:
      type: object
      required:
        - baseCurrency
        - targetCurrency
        - rate
        - effectiveDate
      properties:
        baseCurrency:
          type: string
          description: 基準通貨
        targetCurrency:
          type: string
          description: 対象通貨
        rate:
          type: number
          minimum: 0
          description: 為替レート
        effectiveDate:
          type: string
          format: date
          description: 有効日

    # ==================== Reports ====================
    BillingSummaryReportResponse:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/ReportPeriod'
        currency:
          type: string
          description: 通貨
        totalInvoiced:
          $ref: '#/components/schemas/Money'
        totalPaid:
          $ref: '#/components/schemas/Money'
        totalOutstanding:
          $ref: '#/components/schemas/Money'
        invoiceCount:
          type: integer
          description: 請求書数
        paidInvoiceCount:
          type: integer
          description: 支払完了請求書数
        overdueInvoiceCount:
          type: integer
          description: 期限超過請求書数
        customerSummaries:
          type: array
          items:
            $ref: '#/components/schemas/CustomerBillingSummary'
        monthlySummaries:
          type: array
          items:
            $ref: '#/components/schemas/MonthlyBillingSummary'

    AgingReportResponse:
      type: object
      properties:
        asOfDate:
          type: string
          format: date
          description: 基準日
        currency:
          type: string
          description: 通貨
        totalOutstanding:
          $ref: '#/components/schemas/Money'
        agingBuckets:
          type: array
          items:
            $ref: '#/components/schemas/AgingBucket'
        customerAging:
          type: array
          items:
            $ref: '#/components/schemas/CustomerAging'

    RevenueReportResponse:
      type: object
      properties:
        period:
          $ref: '#/components/schemas/ReportPeriod'
        groupBy:
          type: string
          enum: [CUSTOMER, PROJECT, ENGINEER, MONTH]
        currency:
          type: string
          description: 通貨
        totalRevenue:
          $ref: '#/components/schemas/Money'
        revenueItems:
          type: array
          items:
            $ref: '#/components/schemas/RevenueItem'

    # ==================== Export ====================
    BulkExportInvoicesRequest:
      type: object
      required:
        - format
      properties:
        invoiceIds:
          type: array
          items:
            type: string
            format: uuid
          description: エクスポート対象請求書ID一覧
        criteria:
          $ref: '#/components/schemas/InvoiceExportCriteria'
        format:
          $ref: '#/components/schemas/ExportFormat'
        includePayments:
          type: boolean
          default: false
          description: 入金情報を含める

    ExportJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
          description: エクスポートジョブID
        format:
          $ref: '#/components/schemas/ExportFormat'
        status:
          $ref: '#/components/schemas/JobStatus'
        createdAt:
          type: string
          format: date-time
          description: 作成日時

    ExportJobStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
          description: エクスポートジョブID
        status:
          $ref: '#/components/schemas/JobStatus'
        totalRecords:
          type: integer
          description: 総レコード数
        processedRecords:
          type: integer
          description: 処理済みレコード数
        fileSize:
          type: integer
          description: ファイルサイズ（バイト）
        downloadUrl:
          type: string
          format: uri
          description: ダウンロードURL
        expiresAt:
          type: string
          format: date-time
          description: ダウンロード期限
        startedAt:
          type: string
          format: date-time
          description: 開始日時
        completedAt:
          type: string
          format: date-time
          description: 完了日時
        errorMessage:
          type: string
          description: エラーメッセージ

    # ==================== Value Objects ====================
    BillingPeriod:
      type: object
      required:
        - year
        - month
      properties:
        year:
          type: integer
          minimum: 2020
          maximum: 2100
          description: 年
        month:
          type: integer
          minimum: 1
          maximum: 12
          description: 月

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

    TaxSettings:
      type: object
      properties:
        taxRate:
          type: number
          minimum: 0
          maximum: 100
          description: 税率（%）
        taxType:
          $ref: '#/components/schemas/TaxType'
        withholdingTaxRate:
          type: number
          minimum: 0
          maximum: 100
          description: 源泉税率（%）
        includeWithholdingTax:
          type: boolean
          description: 源泉税適用

    BillingAddress:
      type: object
      properties:
        companyName:
          type: string
          description: 会社名
        department:
          type: string
          description: 部署名
        contactPerson:
          type: string
          description: 担当者名
        postalCode:
          type: string
          description: 郵便番号
        address:
          type: string
          description: 住所
        phoneNumber:
          type: string
          description: 電話番号
        email:
          type: string
          format: email
          description: メールアドレス

    InvoiceLineItem:
      type: object
      properties:
        description:
          type: string
          description: 項目説明
        quantity:
          type: number
          description: 数量
        unitPrice:
          $ref: '#/components/schemas/Money'
        amount:
          $ref: '#/components/schemas/Money'
        taxRate:
          type: number
          description: 税率（%）

    PaymentSummary:
      type: object
      properties:
        paymentId:
          type: string
          format: uuid
          description: 入金ID
        amount:
          $ref: '#/components/schemas/Money'
        paymentDate:
          type: string
          format: date
          description: 入金日
        paymentMethod:
          $ref: '#/components/schemas/PaymentMethod'

    BankAccountInfo:
      type: object
      properties:
        accountId:
          type: string
          format: uuid
          description: 銀行口座ID
        bankName:
          type: string
          description: 銀行名
        branchName:
          type: string
          description: 支店名
        accountNumber:
          type: string
          description: 口座番号
        accountName:
          type: string
          description: 口座名義

    ReconciliationInfo:
      type: object
      properties:
        isReconciled:
          type: boolean
          description: 照合済みフラグ
        reconciliationDate:
          type: string
          format: date-time
          description: 照合日時
        bankTransactionId:
          type: string
          description: 銀行取引ID
        matchConfidence:
          type: number
          description: 照合信頼度

    CustomerBillingSummary:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        totalInvoiced:
          $ref: '#/components/schemas/Money'
        totalPaid:
          $ref: '#/components/schemas/Money'
        totalOutstanding:
          $ref: '#/components/schemas/Money'
        invoiceCount:
          type: integer
          description: 請求書数
        overdueCount:
          type: integer
          description: 期限超過数

    MonthlyBillingSummary:
      type: object
      properties:
        month:
          type: string
          pattern: '^[0-9]{4}-[0-9]{2}$'
          description: 月（YYYY-MM形式）
        totalInvoiced:
          $ref: '#/components/schemas/Money'
        totalPaid:
          $ref: '#/components/schemas/Money'
        invoiceCount:
          type: integer
          description: 請求書数

    AgingBucket:
      type: object
      properties:
        label:
          type: string
          description: 期間ラベル
        daysFrom:
          type: integer
          description: 開始日数
        daysTo:
          type: integer
          description: 終了日数
        amount:
          $ref: '#/components/schemas/Money'
        count:
          type: integer
          description: 件数

    CustomerAging:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
          description: 顧客ID
        customerName:
          type: string
          description: 顧客名
        totalOutstanding:
          $ref: '#/components/schemas/Money'
        agingAmounts:
          type: array
          items:
            $ref: '#/components/schemas/Money'
          description: 期間別金額

    RevenueItem:
      type: object
      properties:
        groupKey:
          type: string
          description: グループキー
        groupName:
          type: string
          description: グループ名
        revenue:
          $ref: '#/components/schemas/Money'
        invoiceCount:
          type: integer
          description: 請求書数

    ReportPeriod:
      type: object
      properties:
        from:
          type: string
          pattern: '^[0-9]{4}-[0-9]{2}$'
          description: 開始月
        to:
          type: string
          pattern: '^[0-9]{4}-[0-9]{2}$'
          description: 終了月

    SyncResult:
      type: object
      properties:
        recordId:
          type: string
          description: レコードID
        status:
          type: string
          enum: [SUCCESS, ERROR]
          description: 処理結果
        moneyForwardId:
          type: string
          description: MoneyForward ID
        errorMessage:
          type: string
          description: エラーメッセージ

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

    InvoiceExportCriteria:
      type: object
      properties:
        customerId:
          type: string
          format: uuid
          description: 顧客IDでフィルタ
        status:
          $ref: '#/components/schemas/InvoiceStatus'
        billingPeriod:
          $ref: '#/components/schemas/BillingPeriod'
        issueDateFrom:
          type: string
          format: date
          description: 発行日開始
        issueDateTo:
          type: string
          format: date
          description: 発行日終了

    # ==================== Response Collections ====================
    InvoicePageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/InvoiceResponse'
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

    BulkInvoiceGenerationResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
          description: 生成ジョブID
        totalTimesheets:
          type: integer
          description: 対象工数表数
        generatedInvoices:
          type: integer
          description: 生成された請求書数
        skippedTimesheets:
          type: integer
          description: スキップされた工数表数
        errors:
          type: array
          items:
            $ref: '#/components/schemas/GenerationError'

    ReceivablePageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/ReceivableResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer
        summary:
          $ref: '#/components/schemas/ReceivableSummary'

    ReconciliationMatchPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/ReconciliationMatchResponse'
        pageable:
          $ref: '#/components/schemas/Pageable'
        totalElements:
          type: integer
          format: int64
        totalPages:
          type: integer

    ReceivableSummary:
      type: object
      properties:
        totalAmount:
          $ref: '#/components/schemas/Money'
        totalCount:
          type: integer
        overdueAmount:
          $ref: '#/components/schemas/Money'
        overdueCount:
          type: integer

    GenerationError:
      type: object
      properties:
        timesheetId:
          type: string
          format: uuid
          description: 工数表ID
        errorCode:
          type: string
          description: エラーコード
        errorMessage:
          type: string
          description: エラーメッセージ

    # ==================== Enums ====================
    InvoiceStatus:
      type: string
      enum:
        - DRAFT
        - ISSUED
        - SENT
        - PAID
        - OVERDUE
        - PARTIALLY_PAID
        - CANCELLED
      description: |
        請求書ステータス
        * DRAFT - ドラフト
        * ISSUED - 発行済み
        * SENT - 送付済み
        * PAID - 支払完了
        * OVERDUE - 期限超過
        * PARTIALLY_PAID - 一部入金
        * CANCELLED - キャンセル

    PaymentMethod:
      type: string
      enum:
        - BANK_TRANSFER
        - CREDIT_CARD
        - CHECK
        - CASH
        - OTHER
      description: |
        支払方法
        * BANK_TRANSFER - 銀行振込
        * CREDIT_CARD - クレジットカード
        * CHECK - 小切手
        * CASH - 現金
        * OTHER - その他

    ReceivableStatus:
      type: string
      enum:
        - CURRENT
        - OVERDUE_1_30
        - OVERDUE_31_60
        - OVERDUE_61_90
        - OVERDUE_OVER_90
        - PARTIALLY_PAID
        - WRITTEN_OFF
      description: |
        売掛金ステータス
        * CURRENT - 期限内
        * OVERDUE_1_30 - 期限超過1-30日
        * OVERDUE_31_60 - 期限超過31-60日
        * OVERDUE_61_90 - 期限超過61-90日
        * OVERDUE_OVER_90 - 期限超過90日超
        * PARTIALLY_PAID - 一部入金
        * WRITTEN_OFF - 貸倒

    TaxType:
      type: string
      enum:
        - CONSUMPTION_TAX
        - VAT
        - NONE
      description: |
        税種別
        * CONSUMPTION_TAX - 消費税
        * VAT - 付加価値税
        * NONE - 税なし

    CreditRating:
      type: string
      enum:
        - AAA
        - AA
        - A
        - BBB
        - BB
        - B
        - CCC
        - CC
        - C
        - D
      description: |
        与信格付け
        * AAA - 最高
        * AA - 高
        * A - 良好
        * BBB - 中級上
        * BB - 中級
        * B - 中級下
        * CCC - 投機的
        * CC - 非常に投機的
        * C - 極めて投機的
        * D - デフォルト

    RiskLevel:
      type: string
      enum:
        - LOW
        - MEDIUM
        - HIGH
        - CRITICAL
      description: |
        リスクレベル
        * LOW - 低
        * MEDIUM - 中
        * HIGH - 高
        * CRITICAL - 重大

    MatchStatus:
      type: string
      enum:
        - MATCHED
        - PARTIALLY_MATCHED
        - UNMATCHED
        - MANUAL_REVIEW
        - APPROVED
        - REJECTED
      description: |
        照合ステータス
        * MATCHED - 照合済み
        * PARTIALLY_MATCHED - 部分照合
        * UNMATCHED - 未照合
        * MANUAL_REVIEW - 手動確認要
        * APPROVED - 承認済み
        * REJECTED - 拒否

    JobStatus:
      type: string
      enum:
        - PENDING
        - RUNNING
        - COMPLETED
        - FAILED
        - CANCELLED
      description: |
        ジョブステータス
        * PENDING - 待機中
        * RUNNING - 実行中
        * COMPLETED - 完了
        * FAILED - 失敗
        * CANCELLED - キャンセル

    SyncType:
      type: string
      enum:
        - INVOICES
        - PAYMENTS
        - ALL
      description: |
        同期種別
        * INVOICES - 請求書のみ
        * PAYMENTS - 入金のみ
        * ALL - 全て

    ExchangeRateSource:
      type: string
      enum:
        - API
        - MANUAL
        - BANK
      description: |
        為替レート取得元
        * API - 外部API
        * MANUAL - 手動設定
        * BANK - 銀行レート

    ExportFormat:
      type: string
      enum:
        - PDF
        - EXCEL
        - CSV
        - ZIP
      description: |
        エクスポート形式
        * PDF - PDFファイル
        * EXCEL - Excelファイル
        * CSV - CSVファイル
        * ZIP - ZIPアーカイブ

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
          description: エラーコード（例：BILLING_NOT_FOUND、MONEYFORWARD_API_ERROR）
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

    # Billing Context固有エラースキーマ
    BillingBusinessRuleViolationError:
      allOf:
        - $ref: '#/components/schemas/ErrorResponse'
        - type: object
          properties:
            ruleName:
              type: string
              description: 違反したルール名
            aggregateType:
              type: string
              description: 集約タイプ（Invoice、Payment等）
            aggregateId:
              type: string
              description: 集約ID
            billingContext:
              type: object
              properties:
                invoiceId:
                  type: string
                  format: uuid
                paymentId:
                  type: string
                  format: uuid
                customerId:
                  type: string
                  format: uuid
                amount:
                  type: number
                  format: decimal
                currency:
                  type: string

    # 外部サービス連携エラー（MoneyForward用）
    BillingExternalServiceError:
      allOf:
        - $ref: '#/components/schemas/ErrorResponse'
        - type: object
          properties:
            serviceName:
              type: string
              description: 外部サービス名
              enum: [MoneyForward, TaxCalculationService, BankAPI]
            operation:
              type: string
              description: 実行操作
            externalErrorCode:
              type: string
              description: 外部サービスのエラーコード
            retryAfter:
              type: integer
              description: リトライまでの秒数
            billingOperationContext:
              type: object
              properties:
                invoiceId:
                  type: string
                accountingEntryType:
                  type: string
                taxCalculationType:
                  type: string

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
      description: リソースの競合・ビジネスルール違反
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/BillingBusinessRuleViolationError'

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
      description: 外部サービス連携エラー（MoneyForward等）
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/BillingExternalServiceError'

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
            $ref: '#/components/schemas/BillingExternalServiceError'
```

## 3. Spring Boot 実装例

### 3.1 コントローラー実装

```java
@RestController
@RequestMapping("/api/v1/invoices")
@Validated
public class InvoiceController {
    
    private final InvoiceApplicationService invoiceService;
    private final InvoiceAssembler invoiceAssembler;
    
    @GetMapping
    public ResponseEntity<PagedModel<InvoiceResponse>> getInvoices(
            @RequestParam(required = false) UUID customerId,
            @RequestParam(required = false) UUID projectId,
            @RequestParam(required = false) UUID contractId,
            @RequestParam(required = false) InvoiceStatus status,
            @RequestParam(required = false) String billingPeriod,
            @RequestParam(required = false) LocalDate issueDateFrom,
            @RequestParam(required = false) LocalDate issueDateTo,
            @RequestParam(required = false) LocalDate dueDateFrom,
            @RequestParam(required = false) LocalDate dueDateTo,
            @RequestParam(required = false) Boolean isOverdue,
            @RequestParam(required = false, defaultValue = "JPY") String currency,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            Pageable pageable) {
        
        InvoiceSearchCriteria criteria = InvoiceSearchCriteria.builder()
            .customerId(customerId)
            .projectId(projectId)
            .contractId(contractId)
            .status(status)
            .billingPeriod(parseBillingPeriod(billingPeriod))
            .issueDateFrom(issueDateFrom)
            .issueDateTo(issueDateTo)
            .dueDateFrom(dueDateFrom)
            .dueDateTo(dueDateTo)
            .isOverdue(isOverdue)
            .currency(currency)
            .minAmount(minAmount)
            .maxAmount(maxAmount)
            .build();
            
        Page<Invoice> invoices = invoiceService.searchInvoices(criteria, pageable);
        
        return ResponseEntity.ok(
            invoiceAssembler.toPagedModel(invoices)
        );
    }
    
    @PostMapping
    public ResponseEntity<InvoiceResponse> createInvoice(
            @Valid @RequestBody CreateInvoiceRequest request) {
        
        CreateInvoiceCommand command = CreateInvoiceCommand.builder()
            .customerId(request.getCustomerId())
            .projectId(request.getProjectId())
            .contractId(request.getContractId())
            .billingPeriod(request.getBillingPeriod())
            .templateId(request.getTemplateId())
            .timesheetIds(request.getTimesheetIds())
            .dueDate(request.getDueDate())
            .notes(request.getNotes())
            .build();
            
        Invoice invoice = invoiceService.createInvoice(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(invoiceAssembler.toModel(invoice));
    }
    
    @PostMapping("/generate")
    public ResponseEntity<BulkInvoiceGenerationResponse> generateInvoices(
            @Valid @RequestBody GenerateInvoiceRequest request) {
        
        GenerateInvoicesCommand command = GenerateInvoicesCommand.builder()
            .billingPeriod(request.getBillingPeriod())
            .customerIds(request.getCustomerIds())
            .projectIds(request.getProjectIds())
            .autoIssue(request.isAutoIssue())
            .build();
            
        BulkInvoiceGenerationResult result = invoiceService.generateInvoices(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(invoiceAssembler.toBulkGenerationResponse(result));
    }
    
    @GetMapping("/{invoiceId}")
    public ResponseEntity<InvoiceDetailResponse> getInvoice(
            @PathVariable UUID invoiceId) {
        
        Invoice invoice = invoiceService.getInvoice(invoiceId);
        
        return ResponseEntity.ok(
            invoiceAssembler.toDetailModel(invoice)
        );
    }
    
    @PostMapping("/{invoiceId}/issue")
    public ResponseEntity<InvoiceResponse> issueInvoice(
            @PathVariable UUID invoiceId) {
        
        Invoice invoice = invoiceService.issueInvoice(invoiceId);
        
        return ResponseEntity.ok(
            invoiceAssembler.toModel(invoice)
        );
    }
    
    @PostMapping("/{invoiceId}/send")
    public ResponseEntity<InvoiceResponse> sendInvoice(
            @PathVariable UUID invoiceId,
            @Valid @RequestBody SendInvoiceRequest request) {
        
        SendInvoiceCommand command = SendInvoiceCommand.builder()
            .invoiceId(invoiceId)
            .recipientEmails(request.getRecipientEmails())
            .ccEmails(request.getCcEmails())
            .subject(request.getSubject())
            .message(request.getMessage())
            .build();
            
        Invoice invoice = invoiceService.sendInvoice(command);
        
        return ResponseEntity.ok(
            invoiceAssembler.toModel(invoice)
        );
    }
    
    @GetMapping("/{invoiceId}/document")
    public ResponseEntity<Resource> getInvoiceDocument(
            @PathVariable UUID invoiceId,
            @RequestParam(defaultValue = "PDF") String format) {
        
        byte[] documentData;
        String contentType;
        String filename;
        
        if ("EXCEL".equalsIgnoreCase(format)) {
            documentData = invoiceService.generateExcelDocument(invoiceId);
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            filename = "invoice_" + invoiceId + ".xlsx";
        } else {
            documentData = invoiceService.generatePdfDocument(invoiceId);
            contentType = "application/pdf";
            filename = "invoice_" + invoiceId + ".pdf";
        }
        
        ByteArrayResource resource = new ByteArrayResource(documentData);
        
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .contentLength(documentData.length)
            .header(HttpHeaders.CONTENT_DISPOSITION, 
                "attachment; filename=\"" + filename + "\"")
            .body(resource);
    }
    
    private BillingPeriod parseBillingPeriod(String billingPeriod) {
        if (billingPeriod == null) return null;
        
        String[] parts = billingPeriod.split("-");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid billing period format");
        }
        
        return BillingPeriod.of(
            Integer.parseInt(parts[0]),
            Integer.parseInt(parts[1])
        );
    }
}
```

### 3.2 支払管理コントローラー

```java
@RestController
@RequestMapping("/api/v1")
@Validated
public class PaymentController {
    
    private final PaymentApplicationService paymentService;
    private final PaymentAssembler paymentAssembler;
    
    @PostMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentResponse> recordPayment(
            @PathVariable UUID invoiceId,
            @Valid @RequestBody RecordPaymentRequest request) {
        
        RecordPaymentCommand command = RecordPaymentCommand.builder()
            .invoiceId(invoiceId)
            .amount(request.getAmount())
            .paymentDate(request.getPaymentDate())
            .paymentMethod(request.getPaymentMethod())
            .bankAccountId(request.getBankAccountId())
            .reference(request.getReference())
            .notes(request.getNotes())
            .build();
            
        Payment payment = paymentService.recordPayment(command);
        
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(paymentAssembler.toModel(payment));
    }
    
    @GetMapping("/invoices/{invoiceId}/payments")
    public ResponseEntity<PaymentHistoryResponse> getPaymentHistory(
            @PathVariable UUID invoiceId) {
        
        PaymentHistory history = paymentService.getPaymentHistory(invoiceId);
        
        return ResponseEntity.ok(
            paymentAssembler.toHistoryResponse(history)
        );
    }
    
    @PutMapping("/payments/{paymentId}")
    public ResponseEntity<PaymentResponse> updatePayment(
            @PathVariable UUID paymentId,
            @Valid @RequestBody UpdatePaymentRequest request) {
        
        UpdatePaymentCommand command = UpdatePaymentCommand.builder()
            .paymentId(paymentId)
            .amount(request.getAmount())
            .paymentDate(request.getPaymentDate())
            .reference(request.getReference())
            .notes(request.getNotes())
            .version(request.getVersion())
            .build();
            
        Payment payment = paymentService.updatePayment(command);
        
        return ResponseEntity.ok(
            paymentAssembler.toModel(payment)
        );
    }
}
```

### 3.3 請求書アプリケーションサービス

```java
@Service
@Transactional
public class InvoiceApplicationService {
    
    private final InvoiceRepository invoiceRepository;
    private final TimesheetRepository timesheetRepository;
    private final InvoiceDomainService invoiceDomainService;
    private final InvoiceDocumentService documentService;
    private final InvoiceEmailService emailService;
    private final TaxCalculationService taxService;
    private final ApplicationEventPublisher eventPublisher;
    
    public Page<Invoice> searchInvoices(InvoiceSearchCriteria criteria, Pageable pageable) {
        return invoiceRepository.findByCriteria(criteria, pageable);
    }
    
    public Invoice createInvoice(CreateInvoiceCommand command) {
        // 工数表の取得と検証
        List<Timesheet> timesheets = timesheetRepository.findAllById(command.getTimesheetIds());
        
        // ドメインサービスで請求書作成
        Invoice invoice = invoiceDomainService.createInvoiceFromTimesheets(
            command.getCustomerId(),
            command.getProjectId(),
            command.getContractId(),
            command.getBillingPeriod(),
            timesheets,
            command.getTemplateId()
        );
        
        // 支払期限設定
        if (command.getDueDate() != null) {
            invoice.setDueDate(command.getDueDate());
        }
        
        // 備考設定
        if (command.getNotes() != null) {
            invoice.setNotes(command.getNotes());
        }
        
        // 税額計算
        taxService.calculateTax(invoice);
        
        // 保存
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        // イベント発行
        publishInvoiceEvents(savedInvoice);
        
        return savedInvoice;
    }
    
    public BulkInvoiceGenerationResult generateInvoices(GenerateInvoicesCommand command) {
        // 承認済み工数表の取得
        TimesheetSearchCriteria criteria = TimesheetSearchCriteria.builder()
            .billingPeriod(command.getBillingPeriod())
            .status(TimesheetStatus.CUSTOMER_APPROVED)
            .customerIds(command.getCustomerIds())
            .projectIds(command.getProjectIds())
            .build();
            
        List<Timesheet> approvedTimesheets = timesheetRepository.findByCriteria(criteria);
        
        // 顧客・プロジェクト・契約別にグループ化
        Map<InvoiceGroupKey, List<Timesheet>> groupedTimesheets = 
            approvedTimesheets.stream()
                .collect(Collectors.groupingBy(this::createGroupKey));
        
        BulkInvoiceGenerationResult.Builder resultBuilder = 
            BulkInvoiceGenerationResult.builder()
                .totalTimesheets(approvedTimesheets.size());
        
        // グループごとに請求書生成
        for (Map.Entry<InvoiceGroupKey, List<Timesheet>> entry : groupedTimesheets.entrySet()) {
            try {
                InvoiceGroupKey groupKey = entry.getKey();
                List<Timesheet> timesheets = entry.getValue();
                
                // 請求書作成
                Invoice invoice = invoiceDomainService.createInvoiceFromTimesheets(
                    groupKey.getCustomerId(),
                    groupKey.getProjectId(),
                    groupKey.getContractId(),
                    command.getBillingPeriod(),
                    timesheets,
                    null // デフォルトテンプレート使用
                );
                
                // 税額計算
                taxService.calculateTax(invoice);
                
                // 自動発行
                if (command.isAutoIssue()) {
                    invoice.issue();
                }
                
                // 保存
                Invoice savedInvoice = invoiceRepository.save(invoice);
                
                // イベント発行
                publishInvoiceEvents(savedInvoice);
                
                resultBuilder.addGeneratedInvoice(savedInvoice);
                
            } catch (Exception e) {
                resultBuilder.addError(entry.getKey(), e.getMessage());
            }
        }
        
        return resultBuilder.build();
    }
    
    public Invoice issueInvoice(UUID invoiceId) {
        // 請求書取得
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        
        // 発行処理
        invoice.issue();
        
        // 保存
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        // イベント発行
        publishInvoiceEvents(savedInvoice);
        
        return savedInvoice;
    }
    
    public Invoice sendInvoice(SendInvoiceCommand command) {
        // 請求書取得
        Invoice invoice = invoiceRepository.findById(command.getInvoiceId())
            .orElseThrow(() -> new InvoiceNotFoundException(command.getInvoiceId()));
        
        // メール送信
        emailService.sendInvoiceEmail(
            invoice,
            command.getRecipientEmails(),
            command.getCcEmails(),
            command.getSubject(),
            command.getMessage()
        );
        
        // 送付状態更新
        invoice.markAsSent();
        
        // 保存
        Invoice savedInvoice = invoiceRepository.save(invoice);
        
        // イベント発行
        publishInvoiceEvents(savedInvoice);
        
        return savedInvoice;
    }
    
    public byte[] generatePdfDocument(UUID invoiceId) {
        // 請求書取得
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        
        // PDF生成
        return documentService.generatePdf(invoice);
    }
    
    public byte[] generateExcelDocument(UUID invoiceId) {
        // 請求書取得
        Invoice invoice = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        
        // Excel生成
        return documentService.generateExcel(invoice);
    }
    
    private InvoiceGroupKey createGroupKey(Timesheet timesheet) {
        return InvoiceGroupKey.builder()
            .customerId(timesheet.getCustomerId())
            .projectId(timesheet.getProjectId())
            .contractId(timesheet.getContractId())
            .build();
    }
    
    private void publishInvoiceEvents(Invoice invoice) {
        invoice.getUncommittedEvents().forEach(eventPublisher::publishEvent);
        invoice.markEventsAsCommitted();
    }
}
```

### 3.4 税計算サービス

```java
@Service
public class TaxCalculationService {
    
    private final TaxRateRepository taxRateRepository;
    private final ExchangeRateService exchangeRateService;
    
    public void calculateTax(Invoice invoice) {
        // 税設定取得
        TaxSettings taxSettings = getTaxSettings(invoice.getCustomerId(), invoice.getIssueDate());
        
        // 小計計算
        Money subtotal = calculateSubtotal(invoice.getLineItems());
        
        // 消費税計算
        Money taxAmount = Money.ZERO;
        if (taxSettings.getTaxType() != TaxType.NONE) {
            taxAmount = subtotal.multiply(taxSettings.getTaxRate().divide(BigDecimal.valueOf(100)));
        }
        
        // 源泉税計算
        Money withholdingTax = Money.ZERO;
        if (taxSettings.isIncludeWithholdingTax()) {
            withholdingTax = subtotal.multiply(
                taxSettings.getWithholdingTaxRate().divide(BigDecimal.valueOf(100)));
        }
        
        // 合計計算
        Money totalAmount = subtotal.add(taxAmount).subtract(withholdingTax);
        
        // 請求書に設定
        invoice.setSubtotalAmount(subtotal);
        invoice.setTaxAmount(taxAmount);
        invoice.setWithholdingTaxAmount(withholdingTax);
        invoice.setTotalAmount(totalAmount);
        invoice.setTaxSettings(taxSettings);
    }
    
    private Money calculateSubtotal(List<InvoiceLineItem> lineItems) {
        return lineItems.stream()
            .map(InvoiceLineItem::getAmount)
            .reduce(Money.ZERO, Money::add);
    }
    
    private TaxSettings getTaxSettings(UUID customerId, LocalDate date) {
        // 顧客固有の税設定または標準設定を取得
        return taxRateRepository.findByCustomerIdAndDate(customerId, date)
            .orElse(TaxSettings.getDefault());
    }
}
```

### 3.5 支払照合サービス

```java
@Service
@Transactional
public class PaymentReconciliationService {
    
    private final ReconciliationRepository reconciliationRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final BankStatementParser bankStatementParser;
    
    public ReconciliationJob processBankStatement(
            UUID accountId, LocalDate statementDate, InputStream fileStream) {
        
        // 照合ジョブ作成
        ReconciliationJob job = ReconciliationJob.create(accountId, statementDate);
        job = reconciliationRepository.save(job);
        
        // 非同期処理で照合実行
        CompletableFuture.runAsync(() -> {
            try {
                processReconciliationJob(job, fileStream);
            } catch (Exception e) {
                job.markAsFailed(e.getMessage());
                reconciliationRepository.save(job);
            }
        });
        
        return job;
    }
    
    private void processReconciliationJob(ReconciliationJob job, InputStream fileStream) {
        // 銀行明細解析
        List<BankTransaction> transactions = bankStatementParser.parse(fileStream);
        job.setTotalRecords(transactions.size());
        
        // 各取引を照合
        for (BankTransaction transaction : transactions) {
            try {
                processTransaction(job, transaction);
                job.incrementProcessedRecords();
            } catch (Exception e) {
                job.incrementErrorRecords();
                log.error("取引照合エラー: {}", transaction, e);
            }
            
            // 進捗更新
            reconciliationRepository.save(job);
        }
        
        // ジョブ完了
        job.markAsCompleted();
        reconciliationRepository.save(job);
    }
    
    private void processTransaction(ReconciliationJob job, BankTransaction transaction) {
        // 入金取引のみ処理
        if (transaction.getAmount().isNegative()) {
            return;
        }
        
        // 請求書検索
        List<Invoice> candidateInvoices = findCandidateInvoices(transaction);
        
        if (candidateInvoices.isEmpty()) {
            // 未照合レコード作成
            createUnmatchedRecord(job, transaction);
            job.incrementUnmatchedRecords();
            return;
        }
        
        // 最適な照合候補を選択
        Invoice bestMatch = selectBestMatch(transaction, candidateInvoices);
        
        // 照合結果作成
        ReconciliationMatch match = createMatch(job, transaction, bestMatch);
        
        // 信頼度が高い場合は自動承認
        if (match.getConfidence().compareTo(BigDecimal.valueOf(95)) >= 0) {
            approveMatch(match);
            job.incrementMatchedRecords();
        } else {
            job.incrementUnmatchedRecords();
        }
    }
    
    private List<Invoice> findCandidateInvoices(BankTransaction transaction) {
        // 金額、日付、参照情報による検索
        InvoiceSearchCriteria criteria = InvoiceSearchCriteria.builder()
            .status(InvoiceStatus.SENT)
            .minAmount(transaction.getAmount().getAmount().multiply(BigDecimal.valueOf(0.95)))
            .maxAmount(transaction.getAmount().getAmount().multiply(BigDecimal.valueOf(1.05)))
            .issueDateFrom(transaction.getDate().minusDays(90))
            .issueDateTo(transaction.getDate().plusDays(30))
            .build();
            
        return invoiceRepository.findByCriteria(criteria);
    }
    
    private Invoice selectBestMatch(BankTransaction transaction, List<Invoice> candidates) {
        return candidates.stream()
            .max(Comparator.comparing(invoice -> calculateMatchScore(transaction, invoice)))
            .orElse(null);
    }
    
    private BigDecimal calculateMatchScore(BankTransaction transaction, Invoice invoice) {
        BigDecimal score = BigDecimal.ZERO;
        
        // 金額の一致度 (40%)
        BigDecimal amountDiff = transaction.getAmount().getAmount()
            .subtract(invoice.getTotalAmount().getAmount())
            .abs();
        BigDecimal amountScore = BigDecimal.valueOf(100)
            .subtract(amountDiff.divide(invoice.getTotalAmount().getAmount(), 2, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)));
        score = score.add(amountScore.multiply(BigDecimal.valueOf(0.4)));
        
        // 参照情報の一致度 (30%)
        BigDecimal referenceScore = calculateReferenceScore(transaction.getReference(), invoice);
        score = score.add(referenceScore.multiply(BigDecimal.valueOf(0.3)));
        
        // 日付の一致度 (30%)
        BigDecimal dateScore = calculateDateScore(transaction.getDate(), invoice);
        score = score.add(dateScore.multiply(BigDecimal.valueOf(0.3)));
        
        return score;
    }
    
    public void approveMatch(UUID matchId) {
        ReconciliationMatch match = reconciliationRepository.findMatchById(matchId)
            .orElseThrow(() -> new ReconciliationMatchNotFoundException(matchId));
            
        approveMatch(match);
    }
    
    private void approveMatch(ReconciliationMatch match) {
        // 入金記録作成
        Payment payment = Payment.builder()
            .invoiceId(match.getInvoiceId())
            .amount(match.getBankAmount())
            .paymentDate(match.getTransactionDate())
            .paymentMethod(PaymentMethod.BANK_TRANSFER)
            .reference(match.getBankReference())
            .reconciliationInfo(ReconciliationInfo.of(match))
            .build();
            
        paymentRepository.save(payment);
        
        // 照合承認
        match.approve();
        reconciliationRepository.saveMatch(match);
        
        // 請求書の支払状況更新
        Invoice invoice = invoiceRepository.findById(match.getInvoiceId())
            .orElseThrow(() -> new InvoiceNotFoundException(match.getInvoiceId()));
        invoice.recordPayment(payment);
        invoiceRepository.save(invoice);
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC (Role-Based Access Control)
- **権限レベル**:
  - `billing:read` - 請求書参照
  - `billing:write` - 請求書作成・更新
  - `billing:issue` - 請求書発行
  - `billing:payment` - 入金管理
  - `billing:reconciliation` - 支払照合管理
  - `billing:admin` - 全請求管理
  - `credit:read` - 与信情報参照
  - `credit:write` - 与信情報更新
  - `template:read` - テンプレート参照
  - `template:write` - テンプレート作成・更新

### 4.2 APIセキュリティ
- JWTトークンによる認証
- OAuth 2.0スコープによる認可
- CORS設定
- Rate Limiting (請求書生成: 100req/hour, 照合処理: 10req/hour)
- 入力値検証・サニタイゼーション
- ファイルアップロード制限 (最大10MB)

### 4.3 データ保護
- 顧客財務情報の暗号化
- 銀行口座情報のマスキング
- 監査ログの記録
- データマスキング（開発環境）
- GDPR対応（データ削除要求）
- PCI DSS準拠（カード決済時）

## 5. MoneyForward連携仕様

### 5.1 API連携フロー
1. 請求書発行時の売上仕訳自動作成
2. 入金記録時の現金預金仕訳作成
3. 税額の自動仕訳分け（消費税・源泉税）
4. 月次売上レポートの自動作成
5. 未収金管理の同期

### 5.2 同期データ形式
- 勘定科目のマッピング管理
- 部門・プロジェクト別の売上管理
- 税区分の自動設定
- 仕訳データの重複防止

### 5.3 エラーハンドリング
- MoneyForward API呼び出し失敗時のリトライ
- 仕訳データの整合性チェック
- 同期失敗時の手動修正機能

## 6. 多通貨・為替管理

### 6.1 対応通貨
- JPY (日本円) - 基準通貨
- USD (米ドル)
- EUR (ユーロ)
- GBP (英ポンド)
- CNY (中国元)
- KRW (韓国ウォン)

### 6.2 為替レート管理
- 外部API (currencylayer) からの自動取得
- 手動レート設定機能
- 日次為替レート履歴管理
- 請求時点レートの固定

### 6.3 多通貨請求処理
- 契約通貨での請求書発行
- 円建て表示機能
- 為替差損益の管理
- 通貨別収益レポート

## 7. エラーハンドリング

### 7.1 主要なエラーパターン

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "請求書生成に必要な承認済み工数表が存在しません",
  "path": "/api/v1/invoices/generate",
  "validationErrors": [
    {
      "field": "billingPeriod.month",
      "message": "請求対象月は必須です"
    },
    {
      "field": "customerId",
      "message": "顧客IDが無効です"
    }
  ]
}
```

### 7.2 主要なエラーコード
- `400` - バリデーションエラー
- `401` - 認証エラー
- `403` - 権限不足
- `404` - リソース未発見
- `409` - ビジネスルール違反（重複請求、状態不正など）
- `413` - ファイルサイズ超過
- `422` - 処理不可能エンティティ（税計算エラーなど）
- `500` - 内部サーバーエラー
- `502` - MoneyForward API連携エラー
- `503` - サービス一時停止

## 8. パフォーマンス要件

### 8.1 応答時間
- 請求書一覧取得: < 500ms
- 請求書詳細取得: < 200ms
- 請求書作成: < 1s
- 請求書一括生成: < 30s (100件まで)
- 請求書PDF生成: < 3s
- 入金記録: < 500ms
- 支払照合処理: < 5min (1000件まで)
- MoneyForward同期: < 10min

### 8.2 スループット
- 最大同時接続数: 1000
- 最大リクエスト数: 3000 req/min
- 請求書生成: 100件/min
- 照合処理: 1000件/5min

### 8.3 可用性
- 稼働率: 99.9%
- MoneyForward連携失敗時の代替処理
- 非同期処理による応答性向上
- 大容量ファイル処理の分散実行

## 9. 監視・ロギング

### 9.1 ログレベル
- `ERROR`: エラー・例外・MoneyForward連携失敗・照合処理失敗
- `WARN`: 警告・業務ルール違反・支払期限超過・為替レート取得失敗
- `INFO`: 業務イベント・請求書発行・入金記録・照合完了
- `DEBUG`: デバッグ情報・API呼び出し詳細・税計算詳細

### 9.2 監視項目
- API応答時間
- エラー率
- 請求書発行数・金額
- 入金処理数・金額
- MoneyForward同期状況
- 支払照合成功率
- 期限超過請求書数
- 為替レート取得状況

### 9.3 業務監視
- 支払期限超過アラート
- 大口未入金アラート (100万円以上)
- 照合失敗率アラート (5%以上)
- MoneyForward同期エラー率アラート
- 異常な請求金額検知
- 与信限度額超過アラート

---

## 10. Billing Context固有エラーコード定義

### 10.1 ドメインエラーコード
```yaml
# Billing集約固有エラー
BillingDomainErrors:
  # 請求書関連
  - INVOICE_NOT_FOUND
  - INVOICE_ALREADY_ISSUED
  - INVOICE_AMOUNT_INVALID
  - INVOICE_STATUS_TRANSITION_INVALID
  - BILLING_PERIOD_INVALID
  - TAX_CALCULATION_ERROR
  - CURRENCY_CONVERSION_ERROR
  
  # 支払関連
  - PAYMENT_NOT_FOUND
  - PAYMENT_AMOUNT_MISMATCH
  - PAYMENT_ALREADY_PROCESSED
  - PAYMENT_DEADLINE_EXCEEDED
  - BANK_ACCOUNT_INVALID
  - RECONCILIATION_FAILED
  
  # MoneyForward連携
  - MONEYFORWARD_API_ERROR
  - MONEYFORWARD_AUTH_FAILED
  - MONEYFORWARD_RATE_LIMIT_EXCEEDED
  - MONEYFORWARD_SYNC_FAILED
  - ACCOUNTING_ENTRY_CREATION_FAILED
  
  # 与信・債権管理
  - CREDIT_LIMIT_EXCEEDED
  - OVERDUE_PAYMENT_DETECTED
  - CUSTOMER_CREDIT_CHECK_FAILED
  - DEBT_COLLECTION_REQUIRED
```

### 10.2 外部API連携エラー処理詳細化

#### MoneyForward API エラーハンドリング
```yaml
MoneyForwardAPIErrors:
  # 認証・認可エラー
  - code: MF_AUTH_TOKEN_EXPIRED
    status: 401
    severity: MEDIUM
    retryable: true
    retryStrategy: "token_refresh"
    
  - code: MF_RATE_LIMIT_EXCEEDED
    status: 429
    severity: LOW
    retryable: true
    retryAfter: 300
    retryStrategy: "exponential_backoff"
    
  # データ整合性エラー
  - code: MF_ACCOUNT_CODE_INVALID
    status: 400
    severity: HIGH
    retryable: false
    requiresManualIntervention: true
    
  - code: MF_DUPLICATE_TRANSACTION
    status: 409
    severity: MEDIUM
    retryable: false
    reconciliationRequired: true

# 税計算サービスエラー
TaxCalculationServiceErrors:
  - code: TAX_RATE_NOT_FOUND
    status: 404
    severity: HIGH
    retryable: false
    fallbackStrategy: "use_default_rate"
    
  - code: TAX_CALCULATION_TIMEOUT
    status: 504
    severity: MEDIUM
    retryable: true
    timeoutMs: 30000

# 銀行API連携エラー
BankAPIErrors:
  - code: BANK_API_UNAVAILABLE
    status: 503
    severity: HIGH
    retryable: true
    maxRetries: 3
    
  - code: ACCOUNT_BALANCE_FETCH_FAILED
    status: 502
    severity: MEDIUM
    retryable: true
    fallbackStrategy: "use_cached_balance"
```

### 10.3 請求データ整合性チェック強化

#### データ整合性検証ルール
```yaml
BillingDataIntegrityChecks:
  # 金額整合性
  invoice_amount_validation:
    rules:
      - name: "amount_positive_check"
        condition: "invoice.totalAmount > 0"
        errorCode: "INVOICE_AMOUNT_INVALID"
        severity: "HIGH"
        
      - name: "currency_consistency_check"
        condition: "invoice.currency == contract.currency"
        errorCode: "CURRENCY_MISMATCH"
        severity: "MEDIUM"
        
      - name: "tax_calculation_verification"
        condition: "calculated_tax == invoice.taxAmount"
        errorCode: "TAX_CALCULATION_ERROR"
        severity: "HIGH"
        
  # 期間整合性
  billing_period_validation:
    rules:
      - name: "period_overlap_check"
        condition: "no_overlapping_periods_for_contract"
        errorCode: "BILLING_PERIOD_OVERLAP"
        severity: "HIGH"
        
      - name: "work_hours_consistency"
        condition: "billed_hours <= approved_work_hours"
        errorCode: "WORK_HOURS_MISMATCH"
        severity: "CRITICAL"

  # 支払整合性
  payment_validation:
    rules:
      - name: "payment_amount_match"
        condition: "payment.amount == invoice.totalAmount"
        errorCode: "PAYMENT_AMOUNT_MISMATCH"
        severity: "HIGH"
        tolerance: 1.0  # 1円の誤差まで許容
        
      - name: "duplicate_payment_check"
        condition: "no_duplicate_payments_for_invoice"
        errorCode: "DUPLICATE_PAYMENT_DETECTED"
        severity: "CRITICAL"
```

### 10.4 強化されたエラーレスポンス例

#### MoneyForward API連携エラー例
```json
{
  "timestamp": "2025-06-01T23:30:00Z",
  "status": 502,
  "errorCode": "MONEYFORWARD_API_ERROR",
  "error": "External Service Error",
  "message": "MoneyForward API呼び出しに失敗しました: 勘定科目コードが無効です",
  "userMessage": "会計システムとの連携で問題が発生しました。経理担当者にお問い合わせください。",
  "path": "/api/v1/invoices/123/accounting-entry",
  "correlationId": "h69ce31d-7aee-6594-c789-2g24d4e5f691",
  "severity": "HIGH",
  "retryable": false,
  "context": {
    "serviceName": "MoneyForward",
    "operation": "createAccountingEntry",
    "externalErrorCode": "INVALID_ACCOUNT_CODE",
    "billingOperationContext": {
      "invoiceId": "123",
      "accountingEntryType": "SALES_INVOICE",
      "accountCode": "4101"
    }
  }
}
```

#### 請求データ整合性エラー例
```json
{
  "timestamp": "2025-06-01T23:30:00Z",
  "status": 409,
  "errorCode": "WORK_HOURS_MISMATCH",
  "error": "Business Rule Violation",
  "message": "請求工数が承認済み工数を超過しています",
  "userMessage": "請求する工数が承認された工数を超えています。工数表を確認してください。",
  "path": "/api/v1/invoices",
  "correlationId": "i7ad42e-8bff-7605-d890-3h35e5f6g802",
  "severity": "CRITICAL",
  "retryable": false,
  "context": {
    "ruleName": "work_hours_consistency",
    "aggregateType": "Invoice",
    "aggregateId": "456",
    "billingContext": {
      "contractId": "789",
      "billingPeriod": "2025-05",
      "billedHours": 180.0,
      "approvedHours": 160.0,
      "excessHours": 20.0
    }
  },
  "validationErrors": [
    {
      "field": "workHours",
      "code": "WORK_HOURS_EXCEEDED",
      "message": "請求工数180時間が承認済み工数160時間を超過",
      "rejectedValue": 180.0
    }
  ]
}
```

#### 与信限度額超過エラー例
```json
{
  "timestamp": "2025-06-01T23:30:00Z",
  "status": 409,
  "errorCode": "CREDIT_LIMIT_EXCEEDED",
  "error": "Business Rule Violation",
  "message": "顧客の与信限度額を超過するため請求書を発行できません",
  "userMessage": "与信限度額を超過しています。営業担当者にお問い合わせください。",
  "path": "/api/v1/invoices",
  "correlationId": "j8be53f-9cgg-8716-e901-4i46f6g7h913",
  "severity": "HIGH",
  "retryable": false,
  "context": {
    "ruleName": "credit_limit_check",
    "aggregateType": "Invoice",
    "billingContext": {
      "customerId": "customer-001",
      "currentOutstanding": 2500000,
      "creditLimit": 3000000,
      "newInvoiceAmount": 800000,
      "projectedOutstanding": 3300000,
      "excessAmount": 300000,
      "currency": "JPY"
    }
  }
}
```

---

**作成者**: システム化プロジェクトチーム