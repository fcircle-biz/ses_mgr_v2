# Report Context API 詳細設計

## 1. API概要

### 1.1 サービス概要
- **サービス名**: Report Analytics Service
- **ベースURL**: `https://api.ses-mgr.com/report/v1`
- **認証方式**: OAuth 2.0 (Keycloak)
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8

### 1.2 マイクロサービス責務
- 統計データの集約・分析・レポート生成
- KPI管理とダッシュボード情報の提供
- 経営指標の管理とトレンド分析
- CQRSパターンによる読み取り専用モデルの管理
- リアルタイム分析データの提供
- 定期レポートの自動生成と配信

## 2. OpenAPI 3.0 仕様

```yaml
openapi: 3.0.3
info:
  title: Report Analytics API
  description: SES案件管理システムのレポート・分析API
  version: 1.0.0
  contact:
    name: SES管理システム開発チーム
    email: dev@ses-mgr.com

servers:
  - url: https://api.ses-mgr.com/report/v1
    description: 本番環境
  - url: https://api-staging.ses-mgr.com/report/v1
    description: ステージング環境

security:
  - bearerAuth: []

paths:
  # ==================== 分析データ管理 ====================
  /analytics:
    get:
      summary: 分析データ一覧取得
      description: 分析データの一覧を取得します。CQRSパターンによる高速な読み取り専用データを提供します。
      tags:
        - Analytics
      parameters:
        - name: category
          in: query
          description: 分析カテゴリでフィルタ
          schema:
            $ref: '#/components/schemas/AnalyticsCategory'
        - name: type
          in: query
          description: 分析タイプでフィルタ
          schema:
            $ref: '#/components/schemas/AnalyticsType'
        - name: fromDate
          in: query
          description: 開始日
          schema:
            type: string
            format: date
        - name: toDate
          in: query
          description: 終了日
          schema:
            type: string
            format: date
        - name: aggregationLevel
          in: query
          description: 集計レベル
          schema:
            $ref: '#/components/schemas/AggregationLevel'
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
          description: 分析データ一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsDataPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: 分析データ作成
      description: 新しい分析データを作成します。通常はイベントドリブンで自動作成されますが、手動での作成も可能です。
      tags:
        - Analytics
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateAnalyticsDataRequest'
      responses:
        '201':
          description: 分析データ作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsDataResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: 分析データの重複エラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /analytics/{analyticsId}:
    get:
      summary: 分析データ詳細取得
      description: 指定されたIDの分析データ詳細を取得します。
      tags:
        - Analytics
      parameters:
        - name: analyticsId
          in: path
          required: true
          description: 分析データID
          schema:
            type: string
            format: uuid
        - name: includeHistory
          in: query
          description: 履歴データを含めるかどうか
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: 分析データ詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsDataDetailResponse'
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
      summary: 分析データ更新
      description: 分析データのメトリクスを更新します。バージョン管理により履歴が保持されます。
      tags:
        - Analytics
      parameters:
        - name: analyticsId
          in: path
          required: true
          description: 分析データID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateAnalyticsDataRequest'
      responses:
        '200':
          description: 分析データ更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnalyticsDataResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: アーカイブ済みデータの更新エラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

    delete:
      summary: 分析データアーカイブ
      description: 分析データをアーカイブします。物理削除は行わず、論理削除として扱います。
      tags:
        - Analytics
      parameters:
        - name: analyticsId
          in: path
          required: true
          description: 分析データID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: 分析データアーカイブ成功
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: アーカイブ不可能な状態
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== 集約処理 ====================
  /analytics/aggregate:
    post:
      summary: 集約処理実行
      description: 日次データから月次データへの集約処理を実行します。
      tags:
        - Analytics
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AggregateDataRequest'
      responses:
        '202':
          description: 集約処理開始
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AggregateJobResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /analytics/aggregate/{jobId}:
    get:
      summary: 集約処理状況取得
      description: 集約処理の実行状況を取得します。
      tags:
        - Analytics
      parameters:
        - name: jobId
          in: path
          required: true
          description: 集約ジョブID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: 集約処理状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AggregateJobStatusResponse'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== KPI管理 ====================
  /kpis:
    get:
      summary: KPI一覧取得
      description: KPI値の一覧を取得します。期間とカテゴリでフィルタリング可能です。
      tags:
        - KPI
      parameters:
        - name: category
          in: query
          description: KPIカテゴリでフィルタ
          schema:
            type: string
        - name: period
          in: query
          description: 対象期間 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: includeTarget
          in: query
          description: 目標値を含めるかどうか
          schema:
            type: boolean
            default: true
        - name: includeComparison
          in: query
          description: 前期比較を含めるかどうか
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: KPI一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KPIListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /kpis/{kpiId}:
    get:
      summary: KPI詳細取得
      description: 指定されたKPIの詳細情報と履歴を取得します。
      tags:
        - KPI
      parameters:
        - name: kpiId
          in: path
          required: true
          description: KPI ID
          schema:
            type: string
            format: uuid
        - name: historyMonths
          in: query
          description: 履歴取得期間（ヶ月）
          schema:
            type: integer
            minimum: 1
            maximum: 24
            default: 12
      responses:
        '200':
          description: KPI詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KPIDetailResponse'
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
      summary: KPI目標値設定
      description: KPIの目標値を設定・更新します。
      tags:
        - KPI
      parameters:
        - name: kpiId
          in: path
          required: true
          description: KPI ID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SetKPITargetRequest'
      responses:
        '200':
          description: KPI目標値設定成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/KPIResponse'
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

  # ==================== ダッシュボード管理 ====================
  /dashboards:
    get:
      summary: ダッシュボード一覧取得
      description: アクセス可能なダッシュボードの一覧を取得します。
      tags:
        - Dashboard
      parameters:
        - name: type
          in: query
          description: ダッシュボードタイプでフィルタ
          schema:
            $ref: '#/components/schemas/DashboardType'
        - name: includePersonal
          in: query
          description: 個人ダッシュボードを含めるかどうか
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: ダッシュボード一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: ダッシュボード作成
      description: 新しいダッシュボードを作成します。
      tags:
        - Dashboard
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateDashboardRequest'
      responses:
        '201':
          description: ダッシュボード作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /dashboards/{dashboardId}:
    get:
      summary: ダッシュボード詳細取得
      description: 指定されたダッシュボードの詳細とウィジェットデータを取得します。
      tags:
        - Dashboard
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
        - name: refresh
          in: query
          description: 強制リフレッシュするかどうか
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: ダッシュボード詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardDetailResponse'
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
      summary: ダッシュボード更新
      description: ダッシュボードの設定を更新します。
      tags:
        - Dashboard
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateDashboardRequest'
      responses:
        '200':
          description: ダッシュボード更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardResponse'
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
      summary: ダッシュボード削除
      description: ダッシュボードを削除します。個人ダッシュボードのみ削除可能です。
      tags:
        - Dashboard
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: ダッシュボード削除成功
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: 削除不可能なダッシュボード
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== ウィジェット管理 ====================
  /dashboards/{dashboardId}/widgets:
    post:
      summary: ウィジェット追加
      description: ダッシュボードに新しいウィジェットを追加します。
      tags:
        - Widget
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateWidgetRequest'
      responses:
        '201':
          description: ウィジェット追加成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WidgetResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: ウィジェット数上限エラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /dashboards/{dashboardId}/widgets/{widgetId}:
    put:
      summary: ウィジェット更新
      description: ウィジェットの設定を更新します。
      tags:
        - Widget
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
        - name: widgetId
          in: path
          required: true
          description: ウィジェットID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateWidgetRequest'
      responses:
        '200':
          description: ウィジェット更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WidgetResponse'
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
      summary: ウィジェット削除
      description: ダッシュボードからウィジェットを削除します。
      tags:
        - Widget
      parameters:
        - name: dashboardId
          in: path
          required: true
          description: ダッシュボードID
          schema:
            type: string
            format: uuid
        - name: widgetId
          in: path
          required: true
          description: ウィジェットID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: ウィジェット削除成功
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

  /widgets/{widgetId}/refresh:
    post:
      summary: ウィジェットデータ更新
      description: ウィジェットのデータを強制的に更新します。
      tags:
        - Widget
      parameters:
        - name: widgetId
          in: path
          required: true
          description: ウィジェットID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: ウィジェットデータ更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WidgetDataResponse'
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

  # ==================== レポートテンプレート管理 ====================
  /templates:
    get:
      summary: レポートテンプレート一覧取得
      description: レポートテンプレートの一覧を取得します。
      tags:
        - ReportTemplate
      parameters:
        - name: type
          in: query
          description: レポートタイプでフィルタ
          schema:
            $ref: '#/components/schemas/ReportType'
        - name: category
          in: query
          description: レポートカテゴリでフィルタ
          schema:
            $ref: '#/components/schemas/ReportCategory'
        - name: active
          in: query
          description: アクティブなテンプレートのみ取得
          schema:
            type: boolean
            default: true
      responses:
        '200':
          description: レポートテンプレート一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportTemplateListResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: レポートテンプレート作成
      description: 新しいレポートテンプレートを作成します。
      tags:
        - ReportTemplate
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateReportTemplateRequest'
      responses:
        '201':
          description: レポートテンプレート作成成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportTemplateResponse'
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
      summary: レポートテンプレート詳細取得
      description: 指定されたレポートテンプレートの詳細を取得します。
      tags:
        - ReportTemplate
      parameters:
        - name: templateId
          in: path
          required: true
          description: レポートテンプレートID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: レポートテンプレート詳細取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportTemplateDetailResponse'
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
      summary: レポートテンプレート更新
      description: レポートテンプレートを更新します。新バージョンが作成されます。
      tags:
        - ReportTemplate
      parameters:
        - name: templateId
          in: path
          required: true
          description: レポートテンプレートID
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateReportTemplateRequest'
      responses:
        '200':
          description: レポートテンプレート更新成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportTemplateResponse'
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
      summary: レポートテンプレート削除
      description: レポートテンプレートを非アクティブ化します。
      tags:
        - ReportTemplate
      parameters:
        - name: templateId
          in: path
          required: true
          description: レポートテンプレートID
          schema:
            type: string
            format: uuid
      responses:
        '204':
          description: レポートテンプレート削除成功
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

  # ==================== レポート生成 ====================
  /reports:
    get:
      summary: 生成済みレポート一覧取得
      description: 生成済みレポートの一覧を取得します。
      tags:
        - Report
      parameters:
        - name: templateId
          in: query
          description: テンプレートIDでフィルタ
          schema:
            type: string
            format: uuid
        - name: fromDate
          in: query
          description: 生成日開始日
          schema:
            type: string
            format: date
        - name: toDate
          in: query
          description: 生成日終了日
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
          description: 生成済みレポート一覧取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GeneratedReportPageResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

    post:
      summary: レポート生成
      description: 指定されたテンプレートでレポートを生成します。
      tags:
        - Report
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateReportRequest'
      responses:
        '202':
          description: レポート生成開始
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportGenerationJobResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /reports/{reportId}:
    get:
      summary: 生成済みレポート取得
      description: 指定された生成済みレポートを取得します。
      tags:
        - Report
      parameters:
        - name: reportId
          in: path
          required: true
          description: レポートID
          schema:
            type: string
            format: uuid
        - name: format
          in: query
          description: 出力フォーマット
          schema:
            type: string
            enum: [json, pdf, excel, csv]
            default: json
      responses:
        '200':
          description: レポート取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GeneratedReportResponse'
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

  /reports/generation/{jobId}:
    get:
      summary: レポート生成状況取得
      description: レポート生成ジョブの状況を取得します。
      tags:
        - Report
      parameters:
        - name: jobId
          in: path
          required: true
          description: 生成ジョブID
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: レポート生成状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ReportGenerationStatusResponse'
        '404':
          $ref: '#/components/responses/NotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== トレンド分析 ====================
  /trends:
    get:
      summary: トレンド分析結果取得
      description: 指定されたメトリクスのトレンド分析結果を取得します。
      tags:
        - Trend
      parameters:
        - name: category
          in: query
          required: true
          description: 分析カテゴリ
          schema:
            $ref: '#/components/schemas/AnalyticsCategory'
        - name: metric
          in: query
          required: true
          description: 分析メトリクス名
          schema:
            type: string
        - name: fromPeriod
          in: query
          required: true
          description: 開始期間 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: toPeriod
          in: query
          required: true
          description: 終了期間 (YYYY-MM形式)
          schema:
            type: string
            pattern: '^[0-9]{4}-[0-9]{2}$'
        - name: includeForecasting
          in: query
          description: 予測データを含めるかどうか
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: トレンド分析結果取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrendAnalysisResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== リアルタイム分析 ====================
  /realtime/metrics:
    get:
      summary: リアルタイムメトリクス取得
      description: リアルタイムの業績指標を取得します。WebSocketでの継続的な更新も可能です。
      tags:
        - Realtime
      parameters:
        - name: categories
          in: query
          description: 取得するカテゴリ（カンマ区切り）
          schema:
            type: array
            items:
              $ref: '#/components/schemas/AnalyticsCategory'
        - name: websocket
          in: query
          description: WebSocket接続にアップグレードするかどうか
          schema:
            type: boolean
            default: false
      responses:
        '200':
          description: リアルタイムメトリクス取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RealtimeMetricsResponse'
        '101':
          description: WebSocket プロトコルにアップグレード
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '500':
          $ref: '#/components/responses/InternalServerError'

  # ==================== データエクスポート ====================
  /export:
    post:
      summary: データエクスポート
      description: 分析データやレポートをエクスポートします。大量データの場合は非同期処理となります。
      tags:
        - Export
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ExportDataRequest'
      responses:
        '200':
          description: 即座にエクスポート完了（小量データ）
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportDataResponse'
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
              schema:
                type: string
                format: binary
            text/csv:
              schema:
                type: string
        '202':
          description: エクスポート処理開始（大量データ）
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

  /export/{jobId}:
    get:
      summary: エクスポート状況取得
      description: エクスポートジョブの状況を取得します。
      tags:
        - Export
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
          description: エクスポート状況取得成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ExportJobStatusResponse'
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
    # ==================== 基本スキーマ ====================
    AnalyticsCategory:
      type: string
      enum:
        - SALES
        - MATCHING
        - WORK_HOURS
        - PROJECT
        - ENGINEER
        - CUSTOMER
        - FINANCIAL
      description: 分析カテゴリ

    AnalyticsType:
      type: string
      enum:
        - DAILY
        - WEEKLY
        - MONTHLY
        - QUARTERLY
        - YEARLY
      description: 分析タイプ

    AggregationLevel:
      type: string
      enum:
        - DAILY
        - MONTHLY
        - AGGREGATED
      description: 集計レベル

    AnalyticsStatus:
      type: string
      enum:
        - CALCULATING
        - CALCULATED
        - ARCHIVED
      description: 分析データステータス

    DashboardType:
      type: string
      enum:
        - EXECUTIVE
        - SALES
        - OPERATIONAL
        - FINANCIAL
        - PERSONAL
      description: ダッシュボードタイプ

    WidgetType:
      type: string
      enum:
        - CHART
        - NUMBER
        - TABLE
        - GAUGE
        - TEXT
      description: ウィジェットタイプ

    WidgetSize:
      type: string
      enum:
        - SMALL
        - MEDIUM
        - LARGE
        - WIDE
      description: ウィジェットサイズ

    ReportType:
      type: string
      enum:
        - DAILY
        - WEEKLY
        - MONTHLY
        - QUARTERLY
        - YEARLY
        - AD_HOC
      description: レポートタイプ

    ReportCategory:
      type: string
      enum:
        - SALES
        - FINANCIAL
        - OPERATIONAL
        - HR
        - EXECUTIVE
      description: レポートカテゴリ

    KPIStatus:
      type: string
      enum:
        - ACHIEVED
        - WARNING
        - NOT_ACHIEVED
        - UNKNOWN
      description: KPIステータス

    TrendDirection:
      type: string
      enum:
        - INCREASING
        - DECREASING
        - STABLE
        - VOLATILE
      description: トレンド方向

    # ==================== 分析データスキーマ ====================
    AnalyticsDataResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        category:
          $ref: '#/components/schemas/AnalyticsCategory'
        type:
          $ref: '#/components/schemas/AnalyticsType'
        targetDate:
          type: string
          format: date
        targetPeriod:
          type: string
          description: YYYY-MM形式
        metrics:
          type: object
          additionalProperties: true
        numericValues:
          type: object
          additionalProperties:
            type: number
        textValues:
          type: object
          additionalProperties:
            type: string
        aggregationLevel:
          $ref: '#/components/schemas/AggregationLevel'
        aggregationKey:
          type: string
        status:
          $ref: '#/components/schemas/AnalyticsStatus'
        calculatedAt:
          type: string
          format: date-time
        lastUpdatedAt:
          type: string
          format: date-time
        version:
          type: integer
        isLatest:
          type: boolean

    AnalyticsDataDetailResponse:
      allOf:
        - $ref: '#/components/schemas/AnalyticsDataResponse'
        - type: object
          properties:
            history:
              type: array
              items:
                $ref: '#/components/schemas/AnalyticsDataResponse'
            trendAnalysis:
              type: object
              additionalProperties:
                $ref: '#/components/schemas/TrendAnalysisResponse'

    AnalyticsDataPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/AnalyticsDataResponse'
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
        size:
          type: integer
        number:
          type: integer

    CreateAnalyticsDataRequest:
      type: object
      required:
        - category
        - type
        - targetDate
        - metrics
      properties:
        category:
          $ref: '#/components/schemas/AnalyticsCategory'
        type:
          $ref: '#/components/schemas/AnalyticsType'
        targetDate:
          type: string
          format: date
        metrics:
          type: object
          additionalProperties: true
        aggregationLevel:
          $ref: '#/components/schemas/AggregationLevel'

    UpdateAnalyticsDataRequest:
      type: object
      required:
        - metrics
        - version
      properties:
        metrics:
          type: object
          additionalProperties: true
        version:
          type: integer
          description: 楽観的ロック用バージョン

    # ==================== 集約処理スキーマ ====================
    AggregateDataRequest:
      type: object
      required:
        - category
        - targetPeriod
      properties:
        category:
          $ref: '#/components/schemas/AnalyticsCategory'
        targetPeriod:
          type: string
          description: YYYY-MM形式
        forceRecalculate:
          type: boolean
          default: false

    AggregateJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [STARTED, RUNNING, COMPLETED, FAILED]
        startedAt:
          type: string
          format: date-time
        estimatedCompletion:
          type: string
          format: date-time

    AggregateJobStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [STARTED, RUNNING, COMPLETED, FAILED]
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        progress:
          type: integer
          minimum: 0
          maximum: 100
        message:
          type: string
        result:
          $ref: '#/components/schemas/AnalyticsDataResponse'
        error:
          type: string

    # ==================== KPIスキーマ ====================
    KPIResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        value:
          type: number
        targetValue:
          type: number
        achievementRate:
          type: number
        status:
          $ref: '#/components/schemas/KPIStatus'
        targetPeriod:
          type: string
          description: YYYY-MM形式
        calculatedAt:
          type: string
          format: date-time
        unit:
          type: string
        category:
          type: string

    KPIDetailResponse:
      allOf:
        - $ref: '#/components/schemas/KPIResponse'
        - type: object
          properties:
            history:
              type: array
              items:
                $ref: '#/components/schemas/KPIResponse'
            trend:
              $ref: '#/components/schemas/TrendAnalysisResponse'
            comparison:
              $ref: '#/components/schemas/KPIComparisonResponse'

    KPIListResponse:
      type: object
      properties:
        kpis:
          type: array
          items:
            $ref: '#/components/schemas/KPIResponse'
        summary:
          type: object
          properties:
            totalKPIs:
              type: integer
            achievedCount:
              type: integer
            warningCount:
              type: integer
            notAchievedCount:
              type: integer
            achievementRate:
              type: number

    KPIComparisonResponse:
      type: object
      properties:
        kpiName:
          type: string
        currentValue:
          type: number
        previousValue:
          type: number
        changeAmount:
          type: number
        changeRate:
          type: number
        currentPeriod:
          type: string
        previousPeriod:
          type: string

    SetKPITargetRequest:
      type: object
      required:
        - targetValue
        - targetPeriod
      properties:
        targetValue:
          type: number
        targetPeriod:
          type: string
          description: YYYY-MM形式

    # ==================== ダッシュボードスキーマ ====================
    DashboardResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        type:
          $ref: '#/components/schemas/DashboardType'
        description:
          type: string
        refreshInterval:
          type: integer
          description: 自動更新間隔（分）
        isAutoRefresh:
          type: boolean
        lastUpdatedAt:
          type: string
          format: date-time
        createdAt:
          type: string
          format: date-time
        createdBy:
          type: string
          format: uuid

    DashboardDetailResponse:
      allOf:
        - $ref: '#/components/schemas/DashboardResponse'
        - type: object
          properties:
            widgets:
              type: array
              items:
                $ref: '#/components/schemas/WidgetResponse'
            layout:
              $ref: '#/components/schemas/DashboardLayoutResponse'
            authorizedUsers:
              type: array
              items:
                type: string
                format: uuid
            authorizedRoles:
              type: array
              items:
                type: string

    DashboardListResponse:
      type: object
      properties:
        dashboards:
          type: array
          items:
            $ref: '#/components/schemas/DashboardResponse'

    CreateDashboardRequest:
      type: object
      required:
        - name
        - type
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        type:
          $ref: '#/components/schemas/DashboardType'
        description:
          type: string
          maxLength: 500
        refreshInterval:
          type: integer
          minimum: 1
          maximum: 1440
          default: 15
        isAutoRefresh:
          type: boolean
          default: true
        authorizedUsers:
          type: array
          items:
            type: string
            format: uuid
        authorizedRoles:
          type: array
          items:
            type: string

    UpdateDashboardRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
        refreshInterval:
          type: integer
          minimum: 1
          maximum: 1440
        isAutoRefresh:
          type: boolean
        authorizedUsers:
          type: array
          items:
            type: string
            format: uuid
        authorizedRoles:
          type: array
          items:
            type: string

    DashboardLayoutResponse:
      type: object
      properties:
        columns:
          type: integer
        rows:
          type: integer
        gridSize:
          type: integer

    # ==================== ウィジェットスキーマ ====================
    WidgetResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        title:
          type: string
        type:
          $ref: '#/components/schemas/WidgetType'
        size:
          $ref: '#/components/schemas/WidgetSize'
        position:
          type: integer
        dataSource:
          type: string
        dataQuery:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        configuration:
          $ref: '#/components/schemas/WidgetConfigurationResponse'
        chartType:
          type: string
        chartOptions:
          type: object
          additionalProperties: true
        lastUpdatedAt:
          type: string
          format: date-time

    WidgetDataResponse:
      type: object
      properties:
        widgetId:
          type: string
          format: uuid
        data:
          type: object
          additionalProperties: true
        updatedAt:
          type: string
          format: date-time
        cacheExpiresAt:
          type: string
          format: date-time

    CreateWidgetRequest:
      type: object
      required:
        - title
        - type
        - size
        - dataSource
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 100
        type:
          $ref: '#/components/schemas/WidgetType'
        size:
          $ref: '#/components/schemas/WidgetSize'
        dataSource:
          type: string
        dataQuery:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        chartType:
          type: string
        chartOptions:
          type: object
          additionalProperties: true

    UpdateWidgetRequest:
      type: object
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 100
        dataSource:
          type: string
        dataQuery:
          type: string
        parameters:
          type: object
          additionalProperties:
            type: string
        chartType:
          type: string
        chartOptions:
          type: object
          additionalProperties: true

    WidgetConfigurationResponse:
      type: object
      properties:
        showTitle:
          type: boolean
        showBorder:
          type: boolean
        backgroundColor:
          type: string
        textColor:
          type: string
        refreshInterval:
          type: integer

    # ==================== レポートテンプレートスキーマ ====================
    ReportTemplateResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        type:
          $ref: '#/components/schemas/ReportType'
        category:
          $ref: '#/components/schemas/ReportCategory'
        isActive:
          type: boolean
        version:
          type: integer
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
        createdBy:
          type: string
          format: uuid

    ReportTemplateDetailResponse:
      allOf:
        - $ref: '#/components/schemas/ReportTemplateResponse'
        - type: object
          properties:
            templateContent:
              type: string
            sections:
              type: array
              items:
                $ref: '#/components/schemas/ReportSectionResponse'
            parameters:
              type: object
              additionalProperties:
                type: string
            schedule:
              $ref: '#/components/schemas/ReportScheduleResponse'
            recipients:
              type: array
              items:
                type: string

    ReportTemplateListResponse:
      type: object
      properties:
        templates:
          type: array
          items:
            $ref: '#/components/schemas/ReportTemplateResponse'

    CreateReportTemplateRequest:
      type: object
      required:
        - name
        - type
        - category
        - templateContent
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
        type:
          $ref: '#/components/schemas/ReportType'
        category:
          $ref: '#/components/schemas/ReportCategory'
        templateContent:
          type: string
        sections:
          type: array
          items:
            $ref: '#/components/schemas/CreateReportSectionRequest'
        parameters:
          type: object
          additionalProperties:
            type: string
        schedule:
          $ref: '#/components/schemas/ReportScheduleRequest'
        recipients:
          type: array
          items:
            type: string

    UpdateReportTemplateRequest:
      type: object
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
        templateContent:
          type: string
        sections:
          type: array
          items:
            $ref: '#/components/schemas/CreateReportSectionRequest'
        parameters:
          type: object
          additionalProperties:
            type: string
        schedule:
          $ref: '#/components/schemas/ReportScheduleRequest'
        recipients:
          type: array
          items:
            type: string

    ReportSectionResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        order:
          type: integer
        sectionType:
          type: string
        dataSource:
          type: string
        template:
          type: string

    CreateReportSectionRequest:
      type: object
      required:
        - name
        - sectionType
        - dataSource
      properties:
        name:
          type: string
        sectionType:
          type: string
        dataSource:
          type: string
        template:
          type: string

    ReportScheduleResponse:
      type: object
      properties:
        enabled:
          type: boolean
        cronExpression:
          type: string
        timezone:
          type: string
        nextExecution:
          type: string
          format: date-time

    ReportScheduleRequest:
      type: object
      properties:
        enabled:
          type: boolean
          default: false
        cronExpression:
          type: string
        timezone:
          type: string
          default: "Asia/Tokyo"

    # ==================== レポート生成スキーマ ====================
    GeneratedReportResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        templateId:
          type: string
          format: uuid
        templateName:
          type: string
        targetPeriod:
          type: string
          description: YYYY-MM形式
        generatedAt:
          type: string
          format: date-time
        status:
          type: string
          enum: [GENERATING, COMPLETED, FAILED]
        content:
          type: string
        format:
          type: string
        size:
          type: integer
          format: int64

    GeneratedReportPageResponse:
      type: object
      properties:
        content:
          type: array
          items:
            $ref: '#/components/schemas/GeneratedReportResponse'
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
        size:
          type: integer
        number:
          type: integer

    GenerateReportRequest:
      type: object
      required:
        - templateId
        - targetPeriod
      properties:
        templateId:
          type: string
          format: uuid
        targetPeriod:
          type: string
          description: YYYY-MM形式
        parameters:
          type: object
          additionalProperties: true
        format:
          type: string
          enum: [json, pdf, excel, csv]
          default: pdf
        async:
          type: boolean
          default: true

    ReportGenerationJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED]
        queuedAt:
          type: string
          format: date-time
        estimatedCompletion:
          type: string
          format: date-time

    ReportGenerationStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED]
        queuedAt:
          type: string
          format: date-time
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        progress:
          type: integer
          minimum: 0
          maximum: 100
        message:
          type: string
        reportId:
          type: string
          format: uuid
        error:
          type: string

    # ==================== トレンド分析スキーマ ====================
    TrendAnalysisResponse:
      type: object
      properties:
        metricName:
          type: string
        currentValue:
          type: number
        previousValue:
          type: number
        changeAmount:
          type: number
        changeRate:
          type: number
        direction:
          $ref: '#/components/schemas/TrendDirection'
        significance:
          type: string
          enum: [HIGHLY_SIGNIFICANT, SIGNIFICANT, MODERATE, MINOR, INSUFFICIENT_DATA]
        trendDescription:
          type: string
        currentPeriod:
          type: string
        previousPeriod:
          type: string
        forecastData:
          type: array
          items:
            $ref: '#/components/schemas/ForecastDataPoint'

    ForecastDataPoint:
      type: object
      properties:
        period:
          type: string
        value:
          type: number
        confidence:
          type: number
          minimum: 0
          maximum: 1

    # ==================== リアルタイム分析スキーマ ====================
    RealtimeMetricsResponse:
      type: object
      properties:
        timestamp:
          type: string
          format: date-time
        metrics:
          type: object
          additionalProperties:
            type: object
            properties:
              value:
                type: number
              unit:
                type: string
              change:
                type: number
              trend:
                $ref: '#/components/schemas/TrendDirection'
        alerts:
          type: array
          items:
            $ref: '#/components/schemas/MetricAlert'

    MetricAlert:
      type: object
      properties:
        id:
          type: string
          format: uuid
        metricName:
          type: string
        severity:
          type: string
          enum: [LOW, MEDIUM, HIGH, CRITICAL]
        message:
          type: string
        triggeredAt:
          type: string
          format: date-time
        acknowledged:
          type: boolean

    # ==================== エクスポートスキーマ ====================
    ExportDataRequest:
      type: object
      required:
        - exportType
        - format
      properties:
        exportType:
          type: string
          enum: [ANALYTICS_DATA, KPI_DATA, DASHBOARD_DATA, REPORTS]
        format:
          type: string
          enum: [json, csv, excel, pdf]
        filters:
          type: object
          properties:
            categories:
              type: array
              items:
                $ref: '#/components/schemas/AnalyticsCategory'
            fromDate:
              type: string
              format: date
            toDate:
              type: string
              format: date
            includeArchived:
              type: boolean
              default: false
        options:
          type: object
          properties:
            includeHeaders:
              type: boolean
              default: true
            compression:
              type: string
              enum: [none, zip, gzip]
              default: none

    ExportDataResponse:
      type: object
      properties:
        downloadUrl:
          type: string
          format: uri
        fileName:
          type: string
        fileSize:
          type: integer
          format: int64
        expiresAt:
          type: string
          format: date-time
        format:
          type: string

    ExportJobResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED]
        queuedAt:
          type: string
          format: date-time
        estimatedCompletion:
          type: string
          format: date-time

    ExportJobStatusResponse:
      type: object
      properties:
        jobId:
          type: string
          format: uuid
        status:
          type: string
          enum: [QUEUED, RUNNING, COMPLETED, FAILED]
        queuedAt:
          type: string
          format: date-time
        startedAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time
        progress:
          type: integer
          minimum: 0
          maximum: 100
        message:
          type: string
        result:
          $ref: '#/components/schemas/ExportDataResponse'
        error:
          type: string

    # ==================== 共通スキーマ ====================
    Pageable:
      type: object
      properties:
        page:
          type: integer
        size:
          type: integer
        sort:
          type: array
          items:
            type: string

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
        validationErrors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
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

    InternalServerError:
      description: 内部サーバーエラー
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
```

## 3. Spring Boot 実装例

### 3.1 コントローラー実装

#### AnalyticsController
```java
@RestController
@RequestMapping("/api/v1/analytics")
@Validated
@Slf4j
public class AnalyticsController {

    private final AnalyticsQueryService analyticsQueryService;
    private final AnalyticsCommandService analyticsCommandService;

    @GetMapping
    public ResponseEntity<AnalyticsDataPageResponse> getAnalyticsData(
            @RequestParam(required = false) AnalyticsCategory category,
            @RequestParam(required = false) AnalyticsType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) AggregationLevel aggregationLevel,
            @PageableDefault(size = 20, sort = "calculatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        
        log.info("分析データ一覧取得 - category: {}, type: {}, fromDate: {}, toDate: {}", 
                category, type, fromDate, toDate);
        
        AnalyticsDataQuery query = AnalyticsDataQuery.builder()
            .category(category)
            .type(type)
            .fromDate(fromDate)
            .toDate(toDate)
            .aggregationLevel(aggregationLevel)
            .pageable(pageable)
            .build();
        
        Page<AnalyticsData> analyticsPage = analyticsQueryService.findAnalyticsData(query);
        AnalyticsDataPageResponse response = AnalyticsDataMapper.toPageResponse(analyticsPage);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{analyticsId}")
    public ResponseEntity<AnalyticsDataDetailResponse> getAnalyticsDataDetail(
            @PathVariable @Valid UUID analyticsId,
            @RequestParam(defaultValue = "false") boolean includeHistory) {
        
        log.info("分析データ詳細取得 - analyticsId: {}, includeHistory: {}", analyticsId, includeHistory);
        
        AnalyticsDataId id = new AnalyticsDataId(analyticsId);
        AnalyticsDataDetail detail = analyticsQueryService.findAnalyticsDataDetail(id, includeHistory);
        AnalyticsDataDetailResponse response = AnalyticsDataMapper.toDetailResponse(detail);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<AnalyticsDataResponse> createAnalyticsData(
            @RequestBody @Valid CreateAnalyticsDataRequest request) {
        
        log.info("分析データ作成 - category: {}, type: {}", request.getCategory(), request.getType());
        
        CreateAnalyticsDataCommand command = CreateAnalyticsDataCommand.builder()
            .category(request.getCategory())
            .type(request.getType())
            .targetDate(request.getTargetDate())
            .metrics(request.getMetrics())
            .aggregationLevel(request.getAggregationLevel())
            .build();
        
        AnalyticsData analyticsData = analyticsCommandService.createAnalyticsData(command);
        AnalyticsDataResponse response = AnalyticsDataMapper.toResponse(analyticsData);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{analyticsId}")
    public ResponseEntity<AnalyticsDataResponse> updateAnalyticsData(
            @PathVariable @Valid UUID analyticsId,
            @RequestBody @Valid UpdateAnalyticsDataRequest request) {
        
        log.info("分析データ更新 - analyticsId: {}", analyticsId);
        
        UpdateAnalyticsDataCommand command = UpdateAnalyticsDataCommand.builder()
            .analyticsDataId(new AnalyticsDataId(analyticsId))
            .metrics(request.getMetrics())
            .version(request.getVersion())
            .build();
        
        AnalyticsData analyticsData = analyticsCommandService.updateAnalyticsData(command);
        AnalyticsDataResponse response = AnalyticsDataMapper.toResponse(analyticsData);
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{analyticsId}")
    public ResponseEntity<Void> archiveAnalyticsData(@PathVariable @Valid UUID analyticsId) {
        log.info("分析データアーカイブ - analyticsId: {}", analyticsId);
        
        ArchiveAnalyticsDataCommand command = new ArchiveAnalyticsDataCommand(new AnalyticsDataId(analyticsId));
        analyticsCommandService.archiveAnalyticsData(command);
        
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/aggregate")
    public ResponseEntity<AggregateJobResponse> aggregateData(
            @RequestBody @Valid AggregateDataRequest request) {
        
        log.info("集約処理開始 - category: {}, targetPeriod: {}", 
                request.getCategory(), request.getTargetPeriod());
        
        AggregateDataCommand command = AggregateDataCommand.builder()
            .category(request.getCategory())
            .targetPeriod(YearMonth.parse(request.getTargetPeriod()))
            .forceRecalculate(request.isForceRecalculate())
            .build();
        
        AggregateJob job = analyticsCommandService.startAggregation(command);
        AggregateJobResponse response = AggregateJobMapper.toResponse(job);
        
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/aggregate/{jobId}")
    public ResponseEntity<AggregateJobStatusResponse> getAggregateStatus(@PathVariable UUID jobId) {
        log.info("集約処理状況取得 - jobId: {}", jobId);
        
        AggregateJobStatus status = analyticsQueryService.getAggregateJobStatus(jobId);
        AggregateJobStatusResponse response = AggregateJobMapper.toStatusResponse(status);
        
        return ResponseEntity.ok(response);
    }
}
```

#### DashboardController
```java
@RestController
@RequestMapping("/api/v1/dashboards")
@Validated
@Slf4j
public class DashboardController {

    private final DashboardQueryService dashboardQueryService;
    private final DashboardCommandService dashboardCommandService;

    @GetMapping
    public ResponseEntity<DashboardListResponse> getDashboards(
            @RequestParam(required = false) DashboardType type,
            @RequestParam(defaultValue = "true") boolean includePersonal,
            Authentication authentication) {
        
        log.info("ダッシュボード一覧取得 - type: {}, includePersonal: {}", type, includePersonal);
        
        UserId userId = SecurityUtils.getCurrentUserId(authentication);
        List<String> userRoles = SecurityUtils.getCurrentUserRoles(authentication);
        
        DashboardQuery query = DashboardQuery.builder()
            .type(type)
            .includePersonal(includePersonal)
            .userId(userId)
            .userRoles(userRoles)
            .build();
        
        List<Dashboard> dashboards = dashboardQueryService.findAccessibleDashboards(query);
        DashboardListResponse response = DashboardMapper.toListResponse(dashboards);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{dashboardId}")
    public ResponseEntity<DashboardDetailResponse> getDashboardDetail(
            @PathVariable UUID dashboardId,
            @RequestParam(defaultValue = "false") boolean refresh,
            Authentication authentication) {
        
        log.info("ダッシュボード詳細取得 - dashboardId: {}, refresh: {}", dashboardId, refresh);
        
        UserId userId = SecurityUtils.getCurrentUserId(authentication);
        List<String> userRoles = SecurityUtils.getCurrentUserRoles(authentication);
        
        DashboardDetailQuery query = DashboardDetailQuery.builder()
            .dashboardId(new DashboardId(dashboardId))
            .userId(userId)
            .userRoles(userRoles)
            .forceRefresh(refresh)
            .build();
        
        DashboardDetail detail = dashboardQueryService.findDashboardDetail(query);
        DashboardDetailResponse response = DashboardMapper.toDetailResponse(detail);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<DashboardResponse> createDashboard(
            @RequestBody @Valid CreateDashboardRequest request,
            Authentication authentication) {
        
        log.info("ダッシュボード作成 - name: {}, type: {}", request.getName(), request.getType());
        
        UserId userId = SecurityUtils.getCurrentUserId(authentication);
        
        CreateDashboardCommand command = CreateDashboardCommand.builder()
            .name(request.getName())
            .type(request.getType())
            .description(request.getDescription())
            .refreshInterval(Duration.ofMinutes(request.getRefreshInterval()))
            .isAutoRefresh(request.isAutoRefresh())
            .authorizedUsers(request.getAuthorizedUsers().stream()
                .map(UserId::new)
                .collect(toList()))
            .authorizedRoles(request.getAuthorizedRoles())
            .createdBy(userId)
            .build();
        
        Dashboard dashboard = dashboardCommandService.createDashboard(command);
        DashboardResponse response = DashboardMapper.toResponse(dashboard);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{dashboardId}")
    public ResponseEntity<DashboardResponse> updateDashboard(
            @PathVariable UUID dashboardId,
            @RequestBody @Valid UpdateDashboardRequest request,
            Authentication authentication) {
        
        log.info("ダッシュボード更新 - dashboardId: {}", dashboardId);
        
        UserId userId = SecurityUtils.getCurrentUserId(authentication);
        
        UpdateDashboardCommand command = UpdateDashboardCommand.builder()
            .dashboardId(new DashboardId(dashboardId))
            .name(request.getName())
            .description(request.getDescription())
            .refreshInterval(request.getRefreshInterval() != null 
                ? Duration.ofMinutes(request.getRefreshInterval()) : null)
            .isAutoRefresh(request.getIsAutoRefresh())
            .authorizedUsers(request.getAuthorizedUsers() != null 
                ? request.getAuthorizedUsers().stream().map(UserId::new).collect(toList()) : null)
            .authorizedRoles(request.getAuthorizedRoles())
            .updatedBy(userId)
            .build();
        
        Dashboard dashboard = dashboardCommandService.updateDashboard(command);
        DashboardResponse response = DashboardMapper.toResponse(dashboard);
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{dashboardId}")
    public ResponseEntity<Void> deleteDashboard(
            @PathVariable UUID dashboardId,
            Authentication authentication) {
        
        log.info("ダッシュボード削除 - dashboardId: {}", dashboardId);
        
        UserId userId = SecurityUtils.getCurrentUserId(authentication);
        
        DeleteDashboardCommand command = new DeleteDashboardCommand(
            new DashboardId(dashboardId), userId);
        
        dashboardCommandService.deleteDashboard(command);
        
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{dashboardId}/widgets")
    public ResponseEntity<WidgetResponse> addWidget(
            @PathVariable UUID dashboardId,
            @RequestBody @Valid CreateWidgetRequest request,
            Authentication authentication) {
        
        log.info("ウィジェット追加 - dashboardId: {}, title: {}", dashboardId, request.getTitle());
        
        AddWidgetCommand command = AddWidgetCommand.builder()
            .dashboardId(new DashboardId(dashboardId))
            .title(request.getTitle())
            .type(request.getType())
            .size(request.getSize())
            .dataSource(request.getDataSource())
            .dataQuery(request.getDataQuery())
            .parameters(request.getParameters())
            .chartType(request.getChartType())
            .chartOptions(request.getChartOptions())
            .build();
        
        DashboardWidget widget = dashboardCommandService.addWidget(command);
        WidgetResponse response = WidgetMapper.toResponse(widget);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{dashboardId}/widgets/{widgetId}")
    public ResponseEntity<WidgetResponse> updateWidget(
            @PathVariable UUID dashboardId,
            @PathVariable UUID widgetId,
            @RequestBody @Valid UpdateWidgetRequest request) {
        
        log.info("ウィジェット更新 - dashboardId: {}, widgetId: {}", dashboardId, widgetId);
        
        UpdateWidgetCommand command = UpdateWidgetCommand.builder()
            .dashboardId(new DashboardId(dashboardId))
            .widgetId(new DashboardWidgetId(widgetId))
            .title(request.getTitle())
            .dataSource(request.getDataSource())
            .dataQuery(request.getDataQuery())
            .parameters(request.getParameters())
            .chartType(request.getChartType())
            .chartOptions(request.getChartOptions())
            .build();
        
        DashboardWidget widget = dashboardCommandService.updateWidget(command);
        WidgetResponse response = WidgetMapper.toResponse(widget);
        
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{dashboardId}/widgets/{widgetId}")
    public ResponseEntity<Void> removeWidget(
            @PathVariable UUID dashboardId,
            @PathVariable UUID widgetId) {
        
        log.info("ウィジェット削除 - dashboardId: {}, widgetId: {}", dashboardId, widgetId);
        
        RemoveWidgetCommand command = new RemoveWidgetCommand(
            new DashboardId(dashboardId), 
            new DashboardWidgetId(widgetId)
        );
        
        dashboardCommandService.removeWidget(command);
        
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/widgets/{widgetId}/refresh")
    public ResponseEntity<WidgetDataResponse> refreshWidget(@PathVariable UUID widgetId) {
        log.info("ウィジェットデータ更新 - widgetId: {}", widgetId);
        
        RefreshWidgetCommand command = new RefreshWidgetCommand(new DashboardWidgetId(widgetId));
        WidgetData data = dashboardCommandService.refreshWidget(command);
        WidgetDataResponse response = WidgetMapper.toDataResponse(data);
        
        return ResponseEntity.ok(response);
    }
}
```

### 3.2 アプリケーションサービス実装

#### AnalyticsQueryService
```java
@Service
@Transactional(readOnly = true)
@Slf4j
public class AnalyticsQueryService {

    private final AnalyticsDataRepository analyticsRepository;
    private final AnalyticsDataReadModelRepository readModelRepository;
    private final CacheManager cacheManager;

    @Cacheable(value = "analytics-data", key = "#query.cacheKey()")
    public Page<AnalyticsData> findAnalyticsData(AnalyticsDataQuery query) {
        log.debug("分析データ検索実行 - query: {}", query);
        
        return readModelRepository.findByQuery(query);
    }

    @Cacheable(value = "analytics-detail", key = "#id.value")
    public AnalyticsDataDetail findAnalyticsDataDetail(AnalyticsDataId id, boolean includeHistory) {
        log.debug("分析データ詳細取得 - id: {}, includeHistory: {}", id, includeHistory);
        
        // メインデータ取得
        AnalyticsData mainData = analyticsRepository.findById(id)
            .orElseThrow(() -> new AnalyticsDataNotFoundException(id));
        
        // 履歴データ取得（必要な場合）
        List<AnalyticsData> history = includeHistory 
            ? analyticsRepository.findByVersion(mainData.getCategory(), mainData.getTargetDate(), mainData.getVersion())
            : Collections.emptyList();
        
        // トレンド分析実行
        Map<String, TrendAnalysis> trendAnalyses = performTrendAnalysis(mainData);
        
        return AnalyticsDataDetail.builder()
            .mainData(mainData)
            .history(history)
            .trendAnalyses(trendAnalyses)
            .build();
    }

    public AggregateJobStatus getAggregateJobStatus(UUID jobId) {
        log.debug("集約ジョブ状況取得 - jobId: {}", jobId);
        
        // 実装はジョブ管理システム（Redis, DB等）から取得
        return aggregateJobService.getJobStatus(jobId);
    }

    public List<KPIValue> findKPIValues(KPIQuery query) {
        log.debug("KPI検索実行 - query: {}", query);
        
        return kpiRepository.findByQuery(query);
    }

    private Map<String, TrendAnalysis> performTrendAnalysis(AnalyticsData currentData) {
        // 履歴データを取得してトレンド分析を実行
        List<AnalyticsData> historicalData = analyticsRepository.findByPeriodRange(
            currentData.getCategory(),
            currentData.getTargetPeriod().minusMonths(12),
            currentData.getTargetPeriod()
        );
        
        Map<String, TrendAnalysis> analyses = new HashMap<>();
        
        // 主要メトリクスごとにトレンド分析
        for (String metricKey : currentData.getNumericValues().keySet()) {
            if (historicalData.size() >= 2) {
                TrendAnalysis trend = currentData.analyzeTrend(historicalData, metricKey);
                analyses.put(metricKey, trend);
            }
        }
        
        return analyses;
    }
}
```

#### ReportCommandService
```java
@Service
@Transactional
@Slf4j
public class ReportCommandService {

    private final ReportTemplateRepository templateRepository;
    private final GeneratedReportRepository reportRepository;
    private final ReportGenerationService generationService;
    private final NotificationService notificationService;
    private final DomainEventPublisher eventPublisher;

    public ReportTemplate createReportTemplate(CreateReportTemplateCommand command) {
        log.info("レポートテンプレート作成 - name: {}", command.getName());
        
        // テンプレート作成
        ReportTemplate template = new ReportTemplate(
            command.getName(),
            command.getType(),
            command.getCategory()
        );
        
        template.setDescription(command.getDescription());
        template.setTemplateContent(command.getTemplateContent());
        
        // セクション追加
        command.getSections().forEach(section -> {
            ReportSection reportSection = new ReportSection(
                section.getName(),
                section.getSectionType(),
                section.getDataSource(),
                section.getTemplate()
            );
            template.addSection(reportSection);
        });
        
        // スケジュール設定
        if (command.getSchedule() != null) {
            ReportSchedule schedule = new ReportSchedule(
                command.getSchedule().getCronExpression(),
                command.getSchedule().getTimezone()
            );
            template.setSchedule(schedule);
        }
        
        // パラメータ設定
        if (command.getParameters() != null) {
            template.setParameters(command.getParameters());
        }
        
        // 配信先設定
        if (command.getRecipients() != null) {
            template.setRecipients(command.getRecipients());
        }
        
        template.setCreatedBy(command.getCreatedBy());
        
        // 保存
        ReportTemplate savedTemplate = templateRepository.save(template);
        
        // イベント発行
        eventPublisher.publish(new ReportTemplateCreated(
            savedTemplate.getId(),
            savedTemplate.getName(),
            savedTemplate.getType(),
            savedTemplate.getCreatedBy()
        ));
        
        return savedTemplate;
    }

    public GeneratedReport generateReport(GenerateReportCommand command) {
        log.info("レポート生成開始 - templateId: {}, targetPeriod: {}", 
                command.getTemplateId(), command.getTargetPeriod());
        
        // テンプレート取得
        ReportTemplate template = templateRepository.findById(command.getTemplateId())
            .orElseThrow(() -> new ReportTemplateNotFoundException(command.getTemplateId()));
        
        // 非同期処理か同期処理かを判定
        if (command.isAsync()) {
            return generateReportAsync(template, command);
        } else {
            return generateReportSync(template, command);
        }
    }

    private GeneratedReport generateReportAsync(ReportTemplate template, GenerateReportCommand command) {
        // 非同期でレポート生成ジョブを開始
        ReportGenerationJob job = ReportGenerationJob.builder()
            .templateId(template.getId())
            .targetPeriod(command.getTargetPeriod())
            .parameters(command.getParameters())
            .format(command.getFormat())
            .requestedBy(command.getRequestedBy())
            .build();
        
        // ジョブをキューに投入
        generationService.submitJob(job);
        
        // プレースホルダーレポートを作成
        GeneratedReport placeholderReport = new GeneratedReport(
            GeneratedReportId.generate(),
            template.getId(),
            template.getName(),
            command.getTargetPeriod(),
            null, // コンテンツは後で設定
            LocalDateTime.now()
        );
        placeholderReport.setStatus(ReportStatus.GENERATING);
        placeholderReport.setJobId(job.getId());
        
        return reportRepository.save(placeholderReport);
    }

    private GeneratedReport generateReportSync(ReportTemplate template, GenerateReportCommand command) {
        // 同期でレポート生成
        GeneratedReport report = template.generateReport(
            command.getTargetPeriod(),
            command.getParameters() != null ? command.getParameters() : Collections.emptyMap()
        );
        
        // フォーマット変換
        if (command.getFormat() != ReportFormat.JSON) {
            String convertedContent = reportFormatConverter.convert(
                report.getContent(),
                command.getFormat()
            );
            report.setContent(convertedContent);
        }
        
        report.setFormat(command.getFormat());
        report.setStatus(ReportStatus.COMPLETED);
        
        // 保存
        GeneratedReport savedReport = reportRepository.save(report);
        
        // イベント発行
        eventPublisher.publish(new ReportGenerated(
            savedReport.getId(),
            template.getId(),
            command.getTargetPeriod()
        ));
        
        return savedReport;
    }

    public ReportTemplate updateReportTemplate(UpdateReportTemplateCommand command) {
        log.info("レポートテンプレート更新 - templateId: {}", command.getTemplateId());
        
        // 既存テンプレート取得
        ReportTemplate existingTemplate = templateRepository.findById(command.getTemplateId())
            .orElseThrow(() -> new ReportTemplateNotFoundException(command.getTemplateId()));
        
        // 新バージョン作成
        ReportTemplate newVersion = existingTemplate.createNewVersion();
        
        // 更新内容を反映
        if (command.getName() != null) {
            newVersion.setName(command.getName());
        }
        if (command.getDescription() != null) {
            newVersion.setDescription(command.getDescription());
        }
        if (command.getTemplateContent() != null) {
            newVersion.setTemplateContent(command.getTemplateContent());
        }
        if (command.getSections() != null) {
            newVersion.clearSections();
            command.getSections().forEach(section -> {
                ReportSection reportSection = new ReportSection(
                    section.getName(),
                    section.getSectionType(),
                    section.getDataSource(),
                    section.getTemplate()
                );
                newVersion.addSection(reportSection);
            });
        }
        if (command.getSchedule() != null) {
            ReportSchedule schedule = new ReportSchedule(
                command.getSchedule().getCronExpression(),
                command.getSchedule().getTimezone()
            );
            newVersion.setSchedule(schedule);
        }
        if (command.getParameters() != null) {
            newVersion.setParameters(command.getParameters());
        }
        if (command.getRecipients() != null) {
            newVersion.setRecipients(command.getRecipients());
        }
        
        newVersion.setUpdatedBy(command.getUpdatedBy());
        
        // 保存
        ReportTemplate savedTemplate = templateRepository.save(newVersion);
        
        // イベント発行
        eventPublisher.publish(new ReportTemplateUpdated(
            savedTemplate.getId(),
            existingTemplate.getVersion(),
            savedTemplate.getVersion(),
            command.getUpdatedBy()
        ));
        
        return savedTemplate;
    }

    @Async("reportGenerationExecutor")
    @EventHandler
    public void handle(ReportGenerationJobStarted event) {
        log.info("レポート生成ジョブ開始 - jobId: {}", event.getJobId());
        
        try {
            // ジョブ詳細取得
            ReportGenerationJob job = generationService.getJob(event.getJobId());
            
            // テンプレート取得
            ReportTemplate template = templateRepository.findById(job.getTemplateId())
                .orElseThrow(() -> new ReportTemplateNotFoundException(job.getTemplateId()));
            
            // レポート生成
            GeneratedReport report = template.generateReport(
                job.getTargetPeriod(),
                job.getParameters()
            );
            
            // フォーマット変換
            if (job.getFormat() != ReportFormat.JSON) {
                String convertedContent = reportFormatConverter.convert(
                    report.getContent(),
                    job.getFormat()
                );
                report.setContent(convertedContent);
            }
            
            report.setFormat(job.getFormat());
            report.setStatus(ReportStatus.COMPLETED);
            report.setJobId(job.getId());
            
            // 保存
            GeneratedReport savedReport = reportRepository.save(report);
            
            // ジョブ完了
            generationService.completeJob(job.getId(), savedReport.getId());
            
            // 完了イベント発行
            eventPublisher.publish(new ReportGenerated(
                savedReport.getId(),
                template.getId(),
                job.getTargetPeriod()
            ));
            
            // 通知送信（配信先が設定されている場合）
            if (!template.getRecipients().isEmpty()) {
                notificationService.sendReportCompletionNotification(
                    template.getRecipients(),
                    savedReport
                );
            }
            
        } catch (Exception e) {
            log.error("レポート生成エラー - jobId: {}", event.getJobId(), e);
            
            // ジョブ失敗
            generationService.failJob(event.getJobId(), e.getMessage());
            
            // エラーイベント発行
            eventPublisher.publish(new ReportGenerationFailed(
                event.getJobId(),
                e.getMessage()
            ));
        }
    }
}
```

### 3.3 リアルタイム分析実装

#### RealtimeAnalyticsController
```java
@RestController
@RequestMapping("/api/v1/realtime")
@Slf4j
public class RealtimeAnalyticsController {

    private final RealtimeAnalyticsService realtimeService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/metrics")
    public ResponseEntity<RealtimeMetricsResponse> getRealtimeMetrics(
            @RequestParam(required = false) List<AnalyticsCategory> categories,
            @RequestParam(defaultValue = "false") boolean websocket,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        log.info("リアルタイムメトリクス取得 - categories: {}, websocket: {}", categories, websocket);
        
        if (websocket) {
            // WebSocketにアップグレード
            return handleWebSocketUpgrade(request, response);
        }
        
        // 通常のHTTPレスポンス
        RealtimeMetrics metrics = realtimeService.getCurrentMetrics(categories);
        RealtimeMetricsResponse response_body = RealtimeMetricsMapper.toResponse(metrics);
        
        return ResponseEntity.ok(response_body);
    }

    private ResponseEntity<RealtimeMetricsResponse> handleWebSocketUpgrade(
            HttpServletRequest request, HttpServletResponse response) {
        
        // WebSocketへのアップグレード処理
        // 実際の実装では WebSocket ハンドラーにリダイレクトまたは専用エンドポイントを使用
        return ResponseEntity.status(HttpStatus.SWITCHING_PROTOCOLS).build();
    }

    @MessageMapping("/realtime/subscribe")
    @SendTo("/topic/metrics")
    public RealtimeMetricsResponse subscribeToMetrics(RealtimeSubscriptionRequest request) {
        log.info("リアルタイムメトリクス購読 - categories: {}", request.getCategories());
        
        // 現在のメトリクスを即座に送信
        RealtimeMetrics metrics = realtimeService.getCurrentMetrics(request.getCategories());
        return RealtimeMetricsMapper.toResponse(metrics);
    }

    @EventListener
    public void handleAnalyticsDataUpdated(AnalyticsDataUpdated event) {
        log.debug("分析データ更新イベント受信 - category: {}", event.getCategory());
        
        // リアルタイムメトリクスを更新してWebSocketクライアントに配信
        RealtimeMetrics updatedMetrics = realtimeService.getUpdatedMetrics(event.getCategory());
        RealtimeMetricsResponse response = RealtimeMetricsMapper.toResponse(updatedMetrics);
        
        // WebSocketでブロードキャスト
        messagingTemplate.convertAndSend("/topic/metrics/" + event.getCategory(), response);
    }

    @Scheduled(fixedRate = 30000) // 30秒ごと
    public void broadcastPeriodicUpdate() {
        log.debug("定期的なリアルタイムメトリクス更新");
        
        // 全カテゴリの最新メトリクスを取得
        RealtimeMetrics metrics = realtimeService.getCurrentMetrics(null);
        RealtimeMetricsResponse response = RealtimeMetricsMapper.toResponse(metrics);
        
        // WebSocketでブロードキャスト
        messagingTemplate.convertAndSend("/topic/metrics", response);
    }
}
```

#### RealtimeAnalyticsService
```java
@Service
@Slf4j
public class RealtimeAnalyticsService {

    private final AnalyticsDataRepository analyticsRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String REALTIME_METRICS_KEY = "realtime:metrics";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    public RealtimeMetrics getCurrentMetrics(List<AnalyticsCategory> categories) {
        log.debug("リアルタイムメトリクス取得 - categories: {}", categories);
        
        Map<AnalyticsCategory, CategoryMetrics> metricsMap = new HashMap<>();
        List<MetricAlert> alerts = new ArrayList<>();
        
        List<AnalyticsCategory> targetCategories = categories != null 
            ? categories 
            : Arrays.asList(AnalyticsCategory.values());
        
        for (AnalyticsCategory category : targetCategories) {
            // キャッシュから取得を試行
            CategoryMetrics cached = getCachedMetrics(category);
            if (cached != null && cached.isValid()) {
                metricsMap.put(category, cached);
                continue;
            }
            
            // キャッシュにない場合は計算
            CategoryMetrics calculated = calculateCategoryMetrics(category);
            metricsMap.put(category, calculated);
            
            // キャッシュに保存
            cacheMetrics(category, calculated);
            
            // アラートチェック
            alerts.addAll(checkAlerts(category, calculated));
        }
        
        return RealtimeMetrics.builder()
            .timestamp(LocalDateTime.now())
            .metrics(metricsMap)
            .alerts(alerts)
            .build();
    }

    public RealtimeMetrics getUpdatedMetrics(AnalyticsCategory category) {
        log.debug("カテゴリ別更新メトリクス取得 - category: {}", category);
        
        // 該当カテゴリのメトリクスを再計算
        CategoryMetrics updated = calculateCategoryMetrics(category);
        
        // キャッシュ更新
        cacheMetrics(category, updated);
        
        // アラートチェック
        List<MetricAlert> alerts = checkAlerts(category, updated);
        
        Map<AnalyticsCategory, CategoryMetrics> metricsMap = Map.of(category, updated);
        
        return RealtimeMetrics.builder()
            .timestamp(LocalDateTime.now())
            .metrics(metricsMap)
            .alerts(alerts)
            .build();
    }

    private CategoryMetrics getCachedMetrics(AnalyticsCategory category) {
        String cacheKey = REALTIME_METRICS_KEY + ":" + category.name();
        
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof CategoryMetrics) {
                return (CategoryMetrics) cached;
            }
        } catch (Exception e) {
            log.warn("キャッシュ取得エラー - category: {}", category, e);
        }
        
        return null;
    }

    private void cacheMetrics(AnalyticsCategory category, CategoryMetrics metrics) {
        String cacheKey = REALTIME_METRICS_KEY + ":" + category.name();
        
        try {
            redisTemplate.opsForValue().set(cacheKey, metrics, CACHE_TTL);
        } catch (Exception e) {
            log.warn("キャッシュ保存エラー - category: {}", category, e);
        }
    }

    private CategoryMetrics calculateCategoryMetrics(AnalyticsCategory category) {
        // 当日のデータを取得
        LocalDate today = LocalDate.now();
        Optional<AnalyticsData> todayData = analyticsRepository.findDailyData(category, today);
        
        // 前日のデータを取得（比較用）
        LocalDate yesterday = today.minusDays(1);
        Optional<AnalyticsData> yesterdayData = analyticsRepository.findDailyData(category, yesterday);
        
        Map<String, MetricValue> values = new HashMap<>();
        
        if (todayData.isPresent()) {
            AnalyticsData data = todayData.get();
            
            // 数値メトリクスを処理
            for (Map.Entry<String, BigDecimal> entry : data.getNumericValues().entrySet()) {
                String metricName = entry.getKey();
                BigDecimal currentValue = entry.getValue();
                
                // 前日比計算
                BigDecimal change = BigDecimal.ZERO;
                TrendDirection trend = TrendDirection.STABLE;
                
                if (yesterdayData.isPresent()) {
                    BigDecimal previousValue = yesterdayData.get().getNumericValue(metricName);
                    if (previousValue != null && previousValue.compareTo(BigDecimal.ZERO) != 0) {
                        change = currentValue.subtract(previousValue);
                        BigDecimal changeRate = change.divide(previousValue, 4, RoundingMode.HALF_UP)
                                                    .multiply(BigDecimal.valueOf(100));
                        
                        if (changeRate.compareTo(BigDecimal.valueOf(5)) > 0) {
                            trend = TrendDirection.INCREASING;
                        } else if (changeRate.compareTo(BigDecimal.valueOf(-5)) < 0) {
                            trend = TrendDirection.DECREASING;
                        }
                    }
                }
                
                MetricValue metricValue = MetricValue.builder()
                    .value(currentValue)
                    .unit(getMetricUnit(metricName))
                    .change(change)
                    .trend(trend)
                    .build();
                
                values.put(metricName, metricValue);
            }
        }
        
        return CategoryMetrics.builder()
            .category(category)
            .values(values)
            .lastUpdated(LocalDateTime.now())
            .isValid(true)
            .build();
    }

    private List<MetricAlert> checkAlerts(AnalyticsCategory category, CategoryMetrics metrics) {
        List<MetricAlert> alerts = new ArrayList<>();
        
        // アラート設定を取得（実際の実装では設定管理から取得）
        List<AlertRule> rules = getAlertRules(category);
        
        for (AlertRule rule : rules) {
            MetricValue metricValue = metrics.getValues().get(rule.getMetricName());
            if (metricValue == null) continue;
            
            boolean triggered = evaluateAlertRule(rule, metricValue);
            if (triggered) {
                MetricAlert alert = MetricAlert.builder()
                    .id(UUID.randomUUID())
                    .metricName(rule.getMetricName())
                    .severity(rule.getSeverity())
                    .message(generateAlertMessage(rule, metricValue))
                    .triggeredAt(LocalDateTime.now())
                    .acknowledged(false)
                    .build();
                
                alerts.add(alert);
                
                // Kafkaにアラートイベントを送信
                kafkaTemplate.send("metric-alerts", alert);
            }
        }
        
        return alerts;
    }

    private boolean evaluateAlertRule(AlertRule rule, MetricValue metricValue) {
        switch (rule.getCondition()) {
            case GREATER_THAN:
                return metricValue.getValue().compareTo(rule.getThreshold()) > 0;
            case LESS_THAN:
                return metricValue.getValue().compareTo(rule.getThreshold()) < 0;
            case EQUALS:
                return metricValue.getValue().compareTo(rule.getThreshold()) == 0;
            case CHANGE_RATE_EXCEEDS:
                return metricValue.getChange().abs().compareTo(rule.getThreshold()) > 0;
            default:
                return false;
        }
    }

    private String generateAlertMessage(AlertRule rule, MetricValue metricValue) {
        return String.format(
            "%s が %s %s を超過しました。現在値: %s, 閾値: %s",
            rule.getMetricName(),
            rule.getCondition().getDisplayName(),
            rule.getThreshold(),
            metricValue.getValue(),
            rule.getThreshold()
        );
    }

    private String getMetricUnit(String metricName) {
        // メトリクス名から単位を推定（実際の実装では設定から取得）
        if (metricName.contains("amount") || metricName.contains("sales")) {
            return "円";
        } else if (metricName.contains("count") || metricName.contains("number")) {
            return "件";
        } else if (metricName.contains("rate") || metricName.contains("ratio")) {
            return "%";
        } else if (metricName.contains("hours") || metricName.contains("time")) {
            return "時間";
        }
        return "";
    }

    private List<AlertRule> getAlertRules(AnalyticsCategory category) {
        // 実際の実装では設定管理システムから取得
        return alertRuleRepository.findByCategory(category);
    }
}
```

## 4. セキュリティ仕様

### 4.1 認証・認可
- **認証**: Keycloak JWTトークン
- **認可**: RBAC (Role-Based Access Control)
- **権限レベル**:
  - `analytics:read` - 分析データ参照
  - `analytics:write` - 分析データ作成・更新
  - `dashboard:read` - ダッシュボード参照
  - `dashboard:write` - ダッシュボード作成・更新
  - `dashboard:admin` - 全ダッシュボード管理
  - `report:read` - レポート参照
  - `report:write` - レポート作成・更新
  - `report:generate` - レポート生成
  - `report:admin` - レポートテンプレート管理
  - `kpi:read` - KPI参照
  - `kpi:write` - KPI目標設定
  - `realtime:read` - リアルタイムデータ参照

### 4.2 APIセキュリティ
- HTTPS必須
- レート制限: 1000 req/min per user（リアルタイムAPI は 10000 req/min）
- CORS設定: フロントエンド ドメインのみ許可
- 入力値検証: Bean Validation
- SQLインジェクション対策: PreparedStatement使用
- データアクセス制御: Row-Level Security

### 4.3 データセキュリティ
- 個人情報の匿名化処理
- 機密データのマスキング
- 監査ログの記録
- データ暗号化（保存時・転送時）

## 5. エラーハンドリング

### 5.1 エラーレスポンス形式
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "分析カテゴリは必須です",
  "path": "/api/v1/analytics",
  "validationErrors": [
    {
      "field": "category",
      "message": "分析カテゴリは必須です"
    }
  ]
}
```

### 5.2 主要なエラーコード
- `400` - バリデーションエラー、不正なパラメータ
- `401` - 認証エラー
- `403` - 権限不足、アクセス拒否
- `404` - リソース未発見
- `409` - データ競合、ビジネスルール違反
- `422` - データ処理エラー
- `429` - レート制限超過
- `500` - 内部サーバーエラー
- `503` - サービス利用不可（メンテナンス時）

### 5.3 特殊なエラーケース
- **集約処理エラー**: 対象データ不足、計算エラー
- **レポート生成エラー**: テンプレートエラー、データ取得失敗
- **リアルタイム更新エラー**: WebSocket接続エラー
- **キャッシュエラー**: Redis接続エラー（graceful degradation）

## 6. パフォーマンス要件

### 6.1 応答時間
- 分析データ一覧取得: < 500ms
- 分析データ詳細取得: < 200ms
- ダッシュボード表示: < 1s
- KPI計算: < 300ms
- リアルタイムメトリクス: < 100ms
- レポート生成（同期）: < 10s
- レポート生成（非同期）: < 30min

### 6.2 スループット
- 最大同時接続数: 2000（WebSocket含む）
- 最大リクエスト数: 50000 req/min
- リアルタイム更新: 1000 updates/sec

### 6.3 スケーラビリティ
- 水平スケーリング対応
- CQRSによる読み取り専用レプリカ
- 非同期処理によるレスポンス向上
- キャッシュ戦略によるパフォーマンス最適化

## 7. 監視・ロギング

### 7.1 ログレベル
- `ERROR`: エラー・例外、システム障害
- `WARN`: 警告・注意事項、パフォーマンス劣化
- `INFO`: 業務イベント、API呼び出し
- `DEBUG`: 詳細なデバッグ情報

### 7.2 監視項目
- API応答時間とスループット
- エラー率と障害発生頻度
- データベースパフォーマンス
- キャッシュヒット率
- リアルタイム更新の遅延
- レポート生成処理時間
- メモリ使用量とGC状況

### 7.3 アラート設定
- API応答時間が500ms超過
- エラー率が5%超過
- データベース接続プール枯渇
- キャッシュサーバー接続エラー
- レポート生成失敗
- リアルタイム更新遅延

### 7.4 メトリクス収集
- Prometheus形式でのメトリクス出力
- Grafanaダッシュボード
- ElasticSearchでのログ集約
- Zipkinでの分散トレーシング

---

**作成者**: システム化プロジェクトチーム
**作成日**: 2024-01-15
**バージョン**: 1.0.0