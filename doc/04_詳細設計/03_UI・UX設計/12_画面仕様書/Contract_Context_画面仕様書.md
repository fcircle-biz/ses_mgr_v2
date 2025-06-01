# Contract Context 画面仕様書

## 📋 概要

### 文書情報
- **対象システム**: SES業務システム
- **対象コンテキスト**: Contract Context（契約管理）
- **文書種別**: 画面仕様書
- **作成日**: 2025年6月1日
- **バージョン**: 1.0

### 対象画面
1. 契約一覧画面
2. 契約詳細・条件確認画面
3. 電子契約作成・CloudSign連携画面
4. 契約承認・ワークフロー画面

---

## 🎯 全体方針

### デザインシステム
- **UIフレームワーク**: Bootstrap 5.3.2
- **外部サービス連携**: CloudSign API (電子署名)
- **レスポンシブ対応**: Mobile First
- **テーマカラー**:
  - Primary: #0d6efd (契約進行中)
  - Success: #198754 (署名完了)
  - Warning: #ffc107 (署名待ち)
  - Danger: #dc3545 (期限切れ・エラー)

### 特殊要件
- **デジタル署名ワークフロー**: CloudSign連携による電子署名プロセス
- **契約書プレビュー**: PDF表示・編集機能
- **承認フロー**: 段階的承認プロセスの視覚化
- **期限管理**: 契約期限・更新アラート機能

---

## 📄 1. 契約一覧画面

### 1.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | CTR-001 |
| **画面名** | 契約一覧画面 |
| **URL** | `/contracts` |
| **アクセス権限** | 営業担当、法務、管理者 |
| **表示方式** | カード + テーブル レスポンシブ |

### 1.2 機能要件

#### 主要機能
1. **契約一覧表示**
   - ページング対応（デフォルト20件/ページ）
   - ソート機能（契約日、更新日、期限日、ステータス）
   - 高度フィルタリング（ステータス、契約種別、期限切れ近接）

2. **ステータス管理機能**
   - 契約ライフサイクルの可視化
   - 署名進捗状況の表示
   - 期限切れアラート表示

3. **操作機能**
   - 詳細表示・編集
   - 新規契約作成
   - 一括操作（ステータス変更、更新通知）
   - 契約書ダウンロード（PDF）

#### データ項目
| 項目名 | 表示名 | データ型 | 必須 | 表示条件 | 特記事項 |
|--------|--------|----------|------|----------|----------|
| contractId | 契約ID | String | ○ | 常時 | 一意識別子 |
| contractNumber | 契約番号 | String | ○ | 常時 | 自動生成 |
| contractTitle | 契約件名 | String | ○ | 常時 | - |
| projectName | 案件名 | String | ○ | 常時 | Project Context参照 |
| customerName | 顧客名 | String | ○ | 常時 | Customer情報 |
| engineerNames | 技術者名 | Array | ○ | 常時 | 複数技術者対応 |
| contractType | 契約種別 | Enum | ○ | バッジ表示 | FIXED_PRICE/TIME_MATERIAL/MAINTENANCE/SLA |
| status | 契約ステータス | Enum | ○ | バッジ表示 | DRAFT/PENDING_APPROVAL/ACTIVE/SUSPENDED/TERMINATED/EXPIRED |
| digitalSignatureStatus | 署名ステータス | Enum | ○ | プログレス表示 | PENDING/PARTIALLY_SIGNED/FULLY_SIGNED/EXPIRED/CANCELLED |
| startDate | 契約開始日 | Date | ○ | 常時 | - |
| endDate | 契約終了日 | Date | ○ | 常時 | - |
| totalAmount | 契約金額 | Decimal | ○ | 権限者のみ | 通貨単位付き |
| daysToExpiry | 期限まで日数 | Integer | △ | 計算値 | 90日以内は警告表示 |
| lastUpdated | 最終更新日 | DateTime | ○ | 常時 | - |
| cloudSignDocumentId | CloudSign文書ID | String | △ | 署名プロセス中 | 外部連携情報 |

### 1.3 画面レイアウト

#### デスクトップ版レイアウト
```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダー (固定)                                               │
├─────────────┬───────────────────────────────────────────────┤
│ サイドバー   │ メインコンテンツ                               │
│ (固定)      │ ┌─────────────────────────────────────────────┐ │
│             │ │ パンくずリスト                               │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ タイトル + 新規契約作成ボタン + 期限アラート │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ 検索・フィルタエリア                         │ │
│             │ │ ┌─────────┬─────────┬─────────┬─────────┐ │ │
│             │ │ │キーワード│ステータス│契約種別  │期限      │ │ │
│             │ │ │検索      │フィルタ  │フィルタ  │フィルタ  │ │ │
│             │ │ └─────────┴─────────┴─────────┴─────────┘ │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ 契約一覧表示エリア                           │ │
│             │ │ ┌─────────────────────────────────────────┐ │ │
│             │ │ │ 🚨 [期限切れ近接] 契約A (残り5日)        │ │ │
│             │ │ │ ✅ [署名完了] 契約B - Active            │ │ │
│             │ │ │ ⏳ [署名待ち] 契約C - 2/3署名済み        │ │ │
│             │ │ │ 📝 [下書き] 契約D - Draft               │ │ │
│             │ │ └─────────────────────────────────────────┘ │ │
│             │ ├─────────────────────────────────────────────┤ │
│             │ │ ページング + 件数表示                       │ │
│             │ └─────────────────────────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────┘
```

#### モバイル版レイアウト（カード表示）
```
┌─────────────────────────────────────┐
│ ヘッダー (ハンバーガーメニュー)       │
├─────────────────────────────────────┤
│ メインコンテンツ                     │
│ ┌─────────────────────────────────┐   │
│ │ 🚨 期限切れ近接: 3件           │   │
│ ├─────────────────────────────────┤   │
│ │ 検索バー + フィルタアイコン      │   │
│ ├─────────────────────────────────┤   │
│ │ 契約カード表示エリア             │   │
│ │ ┌─────────────────────────────┐ │   │
│ │ │ 📋 契約A [緊急]             │ │   │
│ │ │ 案件: ECサイト構築           │ │   │
│ │ │ 顧客: ABC商事               │ │   │
│ │ │ 期限: 2025/06/05 (残り5日)  │ │   │
│ │ │ ┌────┬────┬────┬────┐    │ │   │
│ │ │ │田中│佐藤│    │    │ 2/4│ │   │
│ │ │ │✅ │✅ │⏳ │⏳ │署名│ │   │
│ │ │ └────┴────┴────┴────┘    │ │   │
│ │ │ [詳細] [署名依頼] [ダウンロード]│ │   │
│ │ └─────────────────────────────┘ │   │
│ ├─────────────────────────────────┤   │
│ │ 無限スクロール                   │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 1.4 ステータス・署名状況表示

#### 契約ステータスバッジ
| ステータス | バッジ色 | 表示文言 | アイコン |
|------------|----------|----------|----------|
| DRAFT | secondary | 下書き | 📝 |
| PENDING_APPROVAL | warning | 承認待ち | ⏳ |
| ACTIVE | success | 有効 | ✅ |
| SUSPENDED | warning | 停止中 | ⏸️ |
| TERMINATED | danger | 終了 | ❌ |
| EXPIRED | danger | 期限切れ | ⏰ |

#### 署名ステータス表示
| 署名ステータス | 表示形式 | 説明 |
|----------------|----------|------|
| PENDING | `⏳ 署名待ち (0/3)` | 署名未開始 |
| PARTIALLY_SIGNED | `🔄 署名中 (2/3)` | 一部署名済み |
| FULLY_SIGNED | `✅ 署名完了 (3/3)` | 全署名完了 |
| EXPIRED | `⏰ 署名期限切れ` | 署名期限超過 |
| CANCELLED | `❌ 署名キャンセル` | 署名プロセス中止 |

### 1.5 高度検索・フィルタ機能

#### フィルタエリア設計
```html
<div class="contract-filters-area mb-4">
  <div class="row g-3">
    <!-- キーワード検索 -->
    <div class="col-md-3">
      <label class="form-label">キーワード検索</label>
      <div class="input-group">
        <input type="text" class="form-control" placeholder="契約件名・顧客名・案件名"
               id="keywordSearch" name="keyword">
        <button class="btn btn-outline-secondary" type="button">
          <i class="bi bi-search"></i>
        </button>
      </div>
    </div>
    
    <!-- 契約ステータス -->
    <div class="col-md-2">
      <label class="form-label">契約ステータス</label>
      <select class="form-select" name="status" id="statusFilter">
        <option value="">全ステータス</option>
        <option value="DRAFT">下書き</option>
        <option value="PENDING_APPROVAL">承認待ち</option>
        <option value="ACTIVE">有効</option>
        <option value="SUSPENDED">停止中</option>
        <option value="TERMINATED">終了</option>
        <option value="EXPIRED">期限切れ</option>
      </select>
    </div>
    
    <!-- 契約種別 -->
    <div class="col-md-2">
      <label class="form-label">契約種別</label>
      <select class="form-select" name="contractType">
        <option value="">全種別</option>
        <option value="FIXED_PRICE">固定価格契約</option>
        <option value="TIME_AND_MATERIAL">準委任契約</option>
        <option value="MAINTENANCE">保守契約</option>
        <option value="SLA">SLA契約</option>
      </select>
    </div>
    
    <!-- 署名状況 -->
    <div class="col-md-2">
      <label class="form-label">署名状況</label>
      <select class="form-select" name="signatureStatus">
        <option value="">全状況</option>
        <option value="PENDING">署名待ち</option>
        <option value="PARTIALLY_SIGNED">署名中</option>
        <option value="FULLY_SIGNED">署名完了</option>
        <option value="EXPIRED">期限切れ</option>
      </select>
    </div>
    
    <!-- 期限フィルタ -->
    <div class="col-md-2">
      <label class="form-label">期限</label>
      <select class="form-select" name="expiryFilter">
        <option value="">全期間</option>
        <option value="7">7日以内</option>
        <option value="30">30日以内</option>
        <option value="90">90日以内</option>
        <option value="expired">期限切れ</option>
      </select>
    </div>
    
    <!-- 検索・リセットボタン -->
    <div class="col-md-1">
      <label class="form-label">&nbsp;</label>
      <div class="d-flex gap-1">
        <button type="button" class="btn btn-primary btn-sm" onclick="searchContracts()">
          検索
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="resetFilters()">
          リセット
        </button>
      </div>
    </div>
  </div>
  
  <!-- 期限アラート -->
  <div class="alert alert-warning mt-3" id="expiryAlert" style="display: none;">
    <i class="bi bi-exclamation-triangle"></i>
    <strong>期限切れ近接契約があります:</strong>
    <span id="expiryCount">3</span>件の契約が90日以内に期限切れとなります。
    <button class="btn btn-sm btn-outline-warning ms-2" onclick="showExpiringContracts()">
      詳細確認
    </button>
  </div>
</div>
```

### 1.6 契約カード表示

#### カードコンポーネント
```html
<div class="contract-card card mb-3 status-{{contract.status}}" 
     data-contract-id="{{contract.id}}" onclick="viewContractDetail('{{contract.id}}')">
  
  <!-- カードヘッダー: ステータス・重要度 -->
  <div class="card-header d-flex justify-content-between align-items-center">
    <div class="contract-meta">
      <span class="badge bg-{{getStatusColor(contract.status)}} status-badge">
        {{getStatusText(contract.status)}}
      </span>
      <span class="contract-number text-muted ms-2">{{contract.contractNumber}}</span>
    </div>
    
    <div class="contract-actions">
      <!-- 期限警告 -->
      <span class="expiry-warning" th:if="${contract.daysToExpiry <= 30}">
        <i class="bi bi-alarm text-danger"></i>
        <small class="text-danger">残り{{contract.daysToExpiry}}日</small>
      </span>
      
      <!-- 署名状況 -->
      <span class="signature-status ms-2">
        {{getSignatureStatusIcon(contract.digitalSignatureStatus)}}
      </span>
    </div>
  </div>
  
  <!-- カードボディ: 契約詳細 -->
  <div class="card-body">
    <h6 class="card-title">{{contract.contractTitle}}</h6>
    
    <div class="row">
      <div class="col-md-6">
        <div class="contract-info">
          <small class="text-muted">案件名</small>
          <div class="fw-bold">{{contract.projectName}}</div>
        </div>
        
        <div class="contract-info mt-2">
          <small class="text-muted">顧客</small>
          <div>{{contract.customerName}}</div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="contract-info">
          <small class="text-muted">技術者</small>
          <div class="engineer-tags">
            <span class="badge bg-light text-dark me-1" th:each="engineer : ${contract.engineers}">
              {{engineer.name}}
            </span>
          </div>
        </div>
        
        <div class="contract-info mt-2">
          <small class="text-muted">契約期間</small>
          <div>{{formatDate(contract.startDate)}} ～ {{formatDate(contract.endDate)}}</div>
        </div>
      </div>
    </div>
    
    <!-- 署名進捗バー -->
    <div class="signature-progress mt-3" th:if="${contract.digitalSignatureStatus != 'PENDING'}">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <small class="text-muted">署名進捗</small>
        <small class="text-muted">{{contract.signedCount}}/{{contract.totalSigners}}</small>
      </div>
      <div class="progress" style="height: 6px;">
        <div class="progress-bar bg-{{getSignatureProgressColor(contract.digitalSignatureStatus)}}" 
             style="width: {{(contract.signedCount / contract.totalSigners) * 100}}%"></div>
      </div>
    </div>
    
    <!-- CloudSign連携情報 -->
    <div class="cloudsign-info mt-2" th:if="${contract.cloudSignDocumentId}">
      <small class="text-muted">
        <i class="bi bi-cloud"></i> CloudSign連携中
        <a href="#" class="ms-1" onclick="openCloudSignDocument('{{contract.cloudSignDocumentId}}')">
          文書確認
        </a>
      </small>
    </div>
  </div>
  
  <!-- カードフッター: アクションボタン -->
  <div class="card-footer bg-transparent">
    <div class="btn-group btn-group-sm" role="group">
      <button type="button" class="btn btn-outline-primary" 
              onclick="viewContractDetail('{{contract.id}}')">
        <i class="bi bi-eye"></i> 詳細
      </button>
      
      <button type="button" class="btn btn-outline-success" 
              th:if="${contract.status == 'DRAFT'}"
              onclick="editContract('{{contract.id}}')">
        <i class="bi bi-pencil"></i> 編集
      </button>
      
      <button type="button" class="btn btn-outline-warning" 
              th:if="${contract.digitalSignatureStatus == 'PENDING'}"
              onclick="requestSignature('{{contract.id}}')">
        <i class="bi bi-pen"></i> 署名依頼
      </button>
      
      <button type="button" class="btn btn-outline-info" 
              onclick="downloadContract('{{contract.id}}')">
        <i class="bi bi-download"></i> DL
      </button>
    </div>
  </div>
</div>
```

### 1.7 API連携・検索機能

#### 契約検索API
```javascript
// 契約検索API呼び出し
const searchContracts = async () => {
  const filters = getSearchFilters();
  
  try {
    showLoading('#contractList');
    
    const queryParams = new URLSearchParams({
      page: filters.page || 0,
      size: filters.size || 20,
      sort: filters.sort || 'updatedAt,desc',
      keyword: filters.keyword || '',
      status: filters.status || '',
      contractType: filters.contractType || '',
      signatureStatus: filters.signatureStatus || '',
      expiringDays: filters.expiryFilter || ''
    });
    
    const response = await fetch(`/api/contracts?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('契約検索に失敗しました');
    }
    
    const result = await response.json();
    
    renderContractList(result.content);
    updatePagination(result.page);
    updateExpiryAlert(result.expiringContracts);
    
  } catch (error) {
    console.error('契約検索エラー:', error);
    showErrorMessage('契約情報の取得に失敗しました');
  } finally {
    hideLoading('#contractList');
  }
};

// 検索フィルタ取得
const getSearchFilters = () => {
  return {
    keyword: document.getElementById('keywordSearch').value,
    status: document.getElementById('statusFilter').value,
    contractType: document.querySelector('[name="contractType"]').value,
    signatureStatus: document.querySelector('[name="signatureStatus"]').value,
    expiryFilter: document.querySelector('[name="expiryFilter"]').value,
    page: currentPage,
    size: pageSize
  };
};

// 期限アラート更新
const updateExpiryAlert = (expiringContracts) => {
  const alertElement = document.getElementById('expiryAlert');
  const countElement = document.getElementById('expiryCount');
  
  if (expiringContracts && expiringContracts.length > 0) {
    countElement.textContent = expiringContracts.length;
    alertElement.style.display = 'block';
  } else {
    alertElement.style.display = 'none';
  }
};
```

---

## 📋 2. 契約詳細・条件確認画面

### 2.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | CTR-002 |
| **画面名** | 契約詳細・条件確認画面 |
| **URL** | `/contracts/{id}` |
| **アクセス権限** | 営業担当、法務、管理者 |
| **表示方式** | タブ形式詳細表示 |

### 2.2 機能要件

#### 主要機能
1. **契約詳細表示**
   - 契約条件・金額詳細
   - 署名状況・進捗表示
   - 関連文書表示

2. **契約書プレビュー**
   - PDF表示機能
   - 変更履歴表示
   - 印刷・ダウンロード

3. **署名管理**
   - 署名依頼送信
   - 署名状況確認
   - CloudSign連携

#### タブ構成
1. **契約概要タブ**
2. **契約条件タブ**
3. **署名管理タブ**
4. **変更履歴タブ**
5. **関連文書タブ**

### 2.3 契約概要タブ

```html
<div class="tab-pane active" id="overview-tab">
  <div class="row">
    <!-- 左カラム: 基本情報 -->
    <div class="col-md-8">
      <div class="card">
        <div class="card-header d-flex justify-content-between">
          <h5><i class="bi bi-file-text"></i> 契約基本情報</h5>
          <div class="contract-actions">
            <button class="btn btn-sm btn-outline-primary" onclick="editContract()">
              <i class="bi bi-pencil"></i> 編集
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="downloadContract()">
              <i class="bi bi-download"></i> ダウンロード
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <table class="table table-borderless">
                <tr>
                  <th width="120">契約番号</th>
                  <td id="contractNumber">CTR-2025-001</td>
                </tr>
                <tr>
                  <th>契約件名</th>
                  <td id="contractTitle">ECサイト開発業務委託契約</td>
                </tr>
                <tr>
                  <th>契約種別</th>
                  <td>
                    <span class="badge bg-primary" id="contractType">準委任契約</span>
                  </td>
                </tr>
                <tr>
                  <th>関連案件</th>
                  <td>
                    <a href="/projects/123" id="projectLink">ECサイト構築プロジェクト</a>
                  </td>
                </tr>
                <tr>
                  <th>顧客</th>
                  <td id="customerName">ABC商事株式会社</td>
                </tr>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-borderless">
                <tr>
                  <th width="120">契約期間</th>
                  <td id="contractPeriod">2025/07/01 ～ 2025/12/31</td>
                </tr>
                <tr>
                  <th>契約金額</th>
                  <td>
                    <strong class="text-primary" id="totalAmount">¥6,000,000</strong>
                    <small class="text-muted">(税込)</small>
                  </td>
                </tr>
                <tr>
                  <th>支払サイクル</th>
                  <td id="billingCycle">月末締め翌月末払い</td>
                </tr>
                <tr>
                  <th>作成者</th>
                  <td id="createdBy">田中太郎 (営業部)</td>
                </tr>
                <tr>
                  <th>作成日</th>
                  <td id="createdAt">2025/06/01 10:30</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 技術者情報 -->
      <div class="card mt-3">
        <div class="card-header">
          <h5><i class="bi bi-people"></i> 参画技術者</h5>
        </div>
        <div class="card-body">
          <div class="row" id="engineerList">
            <div class="col-md-6 mb-3" th:each="engineer : ${contract.engineers}">
              <div class="engineer-card border rounded p-3">
                <div class="d-flex align-items-center">
                  <img src="{{engineer.avatarUrl}}" class="rounded-circle me-3" 
                       width="48" height="48" alt="{{engineer.name}}">
                  <div>
                    <h6 class="mb-1">{{engineer.name}}</h6>
                    <div class="engineer-details">
                      <small class="text-muted">{{engineer.position}}</small><br>
                      <small class="text-muted">{{engineer.primarySkills}}</small>
                    </div>
                  </div>
                </div>
                
                <div class="engineer-conditions mt-2">
                  <div class="row">
                    <div class="col-6">
                      <small class="text-muted">月額単価</small>
                      <div class="fw-bold">¥{{engineer.monthlyRate}}</div>
                    </div>
                    <div class="col-6">
                      <small class="text-muted">稼働時間</small>
                      <div>{{engineer.workingHours}}時間/月</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右カラム: ステータス・進捗 -->
    <div class="col-md-4">
      <!-- 契約ステータス -->
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-activity"></i> 契約ステータス</h6>
        </div>
        <div class="card-body">
          <div class="text-center mb-3">
            <span class="badge bg-success fs-6" id="contractStatusBadge">有効</span>
          </div>
          
          <!-- ステータス履歴タイムライン -->
          <div class="status-timeline">
            <div class="timeline-item completed">
              <div class="timeline-marker bg-success"></div>
              <div class="timeline-content">
                <small class="text-muted">2025/06/01 10:30</small>
                <div>契約作成</div>
              </div>
            </div>
            <div class="timeline-item completed">
              <div class="timeline-marker bg-success"></div>
              <div class="timeline-content">
                <small class="text-muted">2025/06/02 14:20</small>
                <div>承認完了</div>
              </div>
            </div>
            <div class="timeline-item completed">
              <div class="timeline-marker bg-success"></div>
              <div class="timeline-content">
                <small class="text-muted">2025/06/03 09:15</small>
                <div>署名完了</div>
              </div>
            </div>
            <div class="timeline-item active">
              <div class="timeline-marker bg-primary"></div>
              <div class="timeline-content">
                <small class="text-muted">2025/07/01</small>
                <div>契約開始</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 署名状況 -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-pen"></i> 署名状況</h6>
        </div>
        <div class="card-body">
          <div class="signature-progress mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span>署名進捗</span>
              <span class="badge bg-success">完了</span>
            </div>
            <div class="progress mb-2" style="height: 8px;">
              <div class="progress-bar bg-success" style="width: 100%"></div>
            </div>
            <small class="text-muted">3/3 署名完了</small>
          </div>
          
          <!-- 署名者一覧 -->
          <div class="signers-list">
            <div class="signer-item d-flex justify-content-between align-items-center mb-2">
              <div>
                <small class="text-muted">顧客代表</small>
                <div>山田花子</div>
              </div>
              <span class="badge bg-success">✓</span>
            </div>
            <div class="signer-item d-flex justify-content-between align-items-center mb-2">
              <div>
                <small class="text-muted">当社営業</small>
                <div>田中太郎</div>
              </div>
              <span class="badge bg-success">✓</span>
            </div>
            <div class="signer-item d-flex justify-content-between align-items-center mb-2">
              <div>
                <small class="text-muted">当社法務</small>
                <div>佐藤次郎</div>
              </div>
              <span class="badge bg-success">✓</span>
            </div>
          </div>
          
          <!-- CloudSign情報 -->
          <div class="cloudsign-info mt-3 p-2 bg-light rounded">
            <small class="text-muted">
              <i class="bi bi-cloud"></i> CloudSign連携
            </small>
            <div class="d-flex justify-content-between align-items-center mt-1">
              <small>文書ID: CS-2025-001</small>
              <a href="#" class="btn btn-sm btn-outline-primary" 
                 onclick="openCloudSignDocument()">
                文書確認
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <!-- クイックアクション -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-lightning"></i> クイックアクション</h6>
        </div>
        <div class="card-body">
          <div class="d-grid gap-2">
            <button class="btn btn-outline-primary btn-sm" onclick="generateContractReport()">
              <i class="bi bi-file-earmark-text"></i> 契約書レポート
            </button>
            <button class="btn btn-outline-info btn-sm" onclick="createAmendment()">
              <i class="bi bi-file-plus"></i> 変更契約作成
            </button>
            <button class="btn btn-outline-warning btn-sm" onclick="renewContract()">
              <i class="bi bi-arrow-clockwise"></i> 契約更新
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="terminateContract()">
              <i class="bi bi-x-circle"></i> 契約終了
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 🔐 3. 電子契約作成・CloudSign連携画面

### 3.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | CTR-003 |
| **画面名** | 電子契約作成・CloudSign連携画面 |
| **URL** | `/contracts/digital-signature/{id}` |
| **アクセス権限** | 法務、管理者 |
| **表示方式** | ステップウィザード |

### 3.2 機能要件

#### 主要機能
1. **電子契約書作成**
   - テンプレート選択
   - 契約条件自動入力
   - PDF生成・プレビュー

2. **CloudSign連携**
   - 文書アップロード
   - 署名者設定
   - 署名フロー設定

3. **署名プロセス管理**
   - 署名依頼送信
   - 進捗監視
   - リマインダー送信

### 3.3 ステップウィザード構成

1. **Step 1: テンプレート選択**
2. **Step 2: 契約条件設定**
3. **Step 3: 署名者設定**
4. **Step 4: CloudSign連携**
5. **Step 5: 署名依頼送信**

### 3.4 Step 4: CloudSign連携

```html
<div class="wizard-step" data-step="4">
  <div class="step-header">
    <h4>CloudSign連携設定</h4>
    <div class="progress">
      <div class="progress-bar" style="width: 80%"></div>
    </div>
  </div>
  
  <div class="row">
    <!-- 左カラム: CloudSign設定 -->
    <div class="col-md-8">
      <div class="card">
        <div class="card-header">
          <h5><i class="bi bi-cloud"></i> CloudSign文書設定</h5>
        </div>
        <div class="card-body">
          <!-- 文書アップロード状況 -->
          <div class="upload-status mb-4">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span>契約書PDF作成</span>
              <span class="badge bg-success">完了</span>
            </div>
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span>CloudSignアップロード</span>
              <span class="badge bg-warning" id="uploadStatus">進行中</span>
            </div>
            <div class="progress mb-3" style="height: 6px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated" 
                   style="width: 75%" id="uploadProgress"></div>
            </div>
          </div>
          
          <!-- CloudSign文書情報 -->
          <div class="cloudsign-document-info" id="documentInfo" style="display: none;">
            <h6>CloudSign文書情報</h6>
            <table class="table table-borderless table-sm">
              <tr>
                <th width="120">文書ID</th>
                <td id="cloudSignDocumentId">CS-2025-001234</td>
              </tr>
              <tr>
                <th>文書名</th>
                <td id="documentName">ECサイト開発業務委託契約書_v1.0</td>
              </tr>
              <tr>
                <th>アップロード日時</th>
                <td id="uploadDate">2025/06/01 15:30</td>
              </tr>
              <tr>
                <th>有効期限</th>
                <td id="expiryDate">2025/06/15 23:59</td>
              </tr>
              <tr>
                <th>文書URL</th>
                <td>
                  <a href="#" id="documentUrl" target="_blank" class="btn btn-sm btn-outline-primary">
                    <i class="bi bi-eye"></i> 文書確認
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- 署名者設定 -->
          <div class="signers-configuration">
            <h6>署名者設定</h6>
            <div class="table-responsive">
              <table class="table table-bordered">
                <thead class="table-light">
                  <tr>
                    <th>順序</th>
                    <th>署名者</th>
                    <th>メールアドレス</th>
                    <th>役割</th>
                    <th>署名方式</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody id="signersTable">
                  <tr data-signer-index="0">
                    <td class="text-center">1</td>
                    <td>
                      <input type="text" class="form-control form-control-sm" 
                             value="山田花子" name="signers[0][name]">
                    </td>
                    <td>
                      <input type="email" class="form-control form-control-sm" 
                             value="yamada@abc-corp.com" name="signers[0][email]">
                    </td>
                    <td>
                      <select class="form-select form-select-sm" name="signers[0][role]">
                        <option value="customer">顧客代表</option>
                        <option value="contractor">受託者代表</option>
                        <option value="witness">立会人</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" name="signers[0][method]">
                        <option value="email">メール認証</option>
                        <option value="sms">SMS認証</option>
                        <option value="phone">電話認証</option>
                      </select>
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn btn-sm btn-outline-danger" 
                              onclick="removeSigner(0)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                  <tr data-signer-index="1">
                    <td class="text-center">2</td>
                    <td>
                      <input type="text" class="form-control form-control-sm" 
                             value="田中太郎" name="signers[1][name]">
                    </td>
                    <td>
                      <input type="email" class="form-control form-control-sm" 
                             value="tanaka@our-company.com" name="signers[1][email]">
                    </td>
                    <td>
                      <select class="form-select form-select-sm" name="signers[1][role]">
                        <option value="customer">顧客代表</option>
                        <option value="contractor" selected>受託者代表</option>
                        <option value="witness">立会人</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" name="signers[1][method]">
                        <option value="email" selected>メール認証</option>
                        <option value="sms">SMS認証</option>
                        <option value="phone">電話認証</option>
                      </select>
                    </td>
                    <td class="text-center">
                      <button type="button" class="btn btn-sm btn-outline-danger" 
                              onclick="removeSigner(1)">
                        <i class="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="addSigner()">
              <i class="bi bi-plus"></i> 署名者追加
            </button>
          </div>
          
          <!-- 署名設定オプション -->
          <div class="signature-options mt-4">
            <h6>署名オプション</h6>
            <div class="row">
              <div class="col-md-6">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="sequentialSigning" checked>
                  <label class="form-check-label" for="sequentialSigning">
                    順次署名（順序通りに署名）
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="reminderEnabled" checked>
                  <label class="form-check-label" for="reminderEnabled">
                    リマインダー送信（3日後）
                  </label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="downloadAfterSigning">
                  <label class="form-check-label" for="downloadAfterSigning">
                    署名完了後の自動ダウンロード
                  </label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="notifyCompletion" checked>
                  <label class="form-check-label" for="notifyCompletion">
                    完了時の関係者通知
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右カラム: 連携状況・ログ -->
    <div class="col-md-4">
      <!-- CloudSign連携状況 -->
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-activity"></i> 連携状況</h6>
        </div>
        <div class="card-body">
          <div class="integration-status">
            <div class="status-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <span>API接続</span>
                <span class="badge bg-success">正常</span>
              </div>
              <small class="text-muted">最終確認: 2025/06/01 15:28</small>
            </div>
            
            <div class="status-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <span>文書アップロード</span>
                <span class="badge bg-warning">進行中</span>
              </div>
              <small class="text-muted">75% 完了</small>
            </div>
            
            <div class="status-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <span>署名者設定</span>
                <span class="badge bg-secondary">待機中</span>
              </div>
              <small class="text-muted">アップロード完了後</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 処理ログ -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-list"></i> 処理ログ</h6>
        </div>
        <div class="card-body">
          <div class="processing-log" style="max-height: 200px; overflow-y: auto;">
            <div class="log-entry mb-2">
              <small class="text-muted">15:30:15</small>
              <div class="text-success">PDF生成完了</div>
            </div>
            <div class="log-entry mb-2">
              <small class="text-muted">15:30:20</small>
              <div class="text-info">CloudSign API接続開始</div>
            </div>
            <div class="log-entry mb-2">
              <small class="text-muted">15:30:25</small>
              <div class="text-info">文書アップロード開始（サイズ: 2.4MB）</div>
            </div>
            <div class="log-entry mb-2">
              <small class="text-muted">15:30:42</small>
              <div class="text-warning">アップロード進行中... (75%)</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- CloudSign情報 -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-info-circle"></i> CloudSign情報</h6>
        </div>
        <div class="card-body">
          <small class="text-muted">
            <strong>使用プラン:</strong> Business<br>
            <strong>月間利用:</strong> 15/100文書<br>
            <strong>署名者制限:</strong> 無制限<br>
            <strong>保存期間:</strong> 5年間
          </small>
        </div>
      </div>
    </div>
  </div>
  
  <div class="wizard-actions mt-4">
    <button type="button" class="btn btn-outline-secondary" onclick="previousStep()">戻る</button>
    <button type="button" class="btn btn-primary" onclick="nextStep()" 
            id="nextButton" disabled>次へ</button>
  </div>
</div>
```

### 3.5 CloudSign連携JavaScript

```javascript
// CloudSign連携管理クラス
class CloudSignIntegration {
  constructor() {
    this.documentId = null;
    this.uploadProgress = 0;
    this.signers = [];
    this.integrationStatus = 'disconnected';
  }
  
  // CloudSign APIテスト接続
  async testConnection() {
    try {
      const response = await fetch('/api/cloudsign/test-connection', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.connected) {
        this.integrationStatus = 'connected';
        this.updateConnectionStatus('正常', 'success');
        return true;
      } else {
        throw new Error(result.error || 'CloudSign接続に失敗しました');
      }
    } catch (error) {
      console.error('CloudSign接続テストエラー:', error);
      this.integrationStatus = 'error';
      this.updateConnectionStatus('エラー', 'danger');
      return false;
    }
  }
  
  // 契約書PDF生成・アップロード
  async uploadContractDocument(contractId) {
    try {
      // PDF生成
      this.updateProcessingLog('PDF生成開始');
      const pdfResponse = await fetch(`/api/contracts/${contractId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!pdfResponse.ok) {
        throw new Error('PDF生成に失敗しました');
      }
      
      const pdfBlob = await pdfResponse.blob();
      this.updateProcessingLog('PDF生成完了');
      
      // CloudSignアップロード
      this.updateProcessingLog('CloudSignアップロード開始');
      const uploadResult = await this.uploadToCloudSign(pdfBlob, contractId);
      
      this.documentId = uploadResult.documentId;
      this.updateDocumentInfo(uploadResult);
      this.updateProcessingLog('アップロード完了');
      
      return uploadResult;
      
    } catch (error) {
      console.error('文書アップロードエラー:', error);
      this.updateProcessingLog(`エラー: ${error.message}`);
      throw error;
    }
  }
  
  // CloudSignアップロード実行
  async uploadToCloudSign(pdfBlob, contractId) {
    const formData = new FormData();
    formData.append('file', pdfBlob, `contract_${contractId}.pdf`);
    formData.append('contractId', contractId);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // プログレス監視
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          this.uploadProgress = Math.round((e.loaded / e.total) * 100);
          this.updateUploadProgress(this.uploadProgress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } else {
          reject(new Error(`アップロードエラー: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('ネットワークエラー'));
      });
      
      xhr.open('POST', '/api/cloudsign/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }
  
  // 署名者設定をCloudSignに送信
  async configureSigners() {
    const signersData = this.getSignersFromForm();
    
    try {
      const response = await fetch(`/api/cloudsign/documents/${this.documentId}/signers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          signers: signersData,
          options: {
            sequential: document.getElementById('sequentialSigning').checked,
            reminderEnabled: document.getElementById('reminderEnabled').checked,
            notifyCompletion: document.getElementById('notifyCompletion').checked
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('署名者設定に失敗しました');
      }
      
      const result = await response.json();
      this.updateProcessingLog('署名者設定完了');
      
      return result;
      
    } catch (error) {
      console.error('署名者設定エラー:', error);
      this.updateProcessingLog(`署名者設定エラー: ${error.message}`);
      throw error;
    }
  }
  
  // 署名依頼送信
  async sendSigningRequest() {
    try {
      const response = await fetch(`/api/cloudsign/documents/${this.documentId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('署名依頼送信に失敗しました');
      }
      
      const result = await response.json();
      this.updateProcessingLog('署名依頼送信完了');
      
      // 署名URLの生成
      this.generateSigningUrls(result.signers);
      
      return result;
      
    } catch (error) {
      console.error('署名依頼送信エラー:', error);
      this.updateProcessingLog(`署名依頼送信エラー: ${error.message}`);
      throw error;
    }
  }
  
  // UI更新メソッド
  updateConnectionStatus(status, type) {
    const statusElement = document.querySelector('.integration-status .status-item:first-child .badge');
    statusElement.className = `badge bg-${type}`;
    statusElement.textContent = status;
  }
  
  updateUploadProgress(progress) {
    const progressBar = document.getElementById('uploadProgress');
    const statusBadge = document.getElementById('uploadStatus');
    
    progressBar.style.width = `${progress}%`;
    
    if (progress === 100) {
      statusBadge.className = 'badge bg-success';
      statusBadge.textContent = '完了';
      progressBar.className = 'progress-bar bg-success';
      
      // 次のステップボタンを有効化
      document.getElementById('nextButton').disabled = false;
    } else {
      statusBadge.textContent = `${progress}%`;
    }
  }
  
  updateDocumentInfo(documentData) {
    document.getElementById('cloudSignDocumentId').textContent = documentData.documentId;
    document.getElementById('documentName').textContent = documentData.name;
    document.getElementById('uploadDate').textContent = formatDateTime(documentData.uploadedAt);
    document.getElementById('expiryDate').textContent = formatDateTime(documentData.expiresAt);
    document.getElementById('documentUrl').href = documentData.previewUrl;
    
    document.getElementById('documentInfo').style.display = 'block';
  }
  
  updateProcessingLog(message) {
    const logContainer = document.querySelector('.processing-log');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry mb-2';
    logEntry.innerHTML = `
      <small class="text-muted">${timestamp}</small>
      <div class="text-info">${message}</div>
    `;
    
    logContainer.insertBefore(logEntry, logContainer.firstChild);
    
    // 最大10件まで表示
    const entries = logContainer.querySelectorAll('.log-entry');
    if (entries.length > 10) {
      entries[entries.length - 1].remove();
    }
  }
  
  getSignersFromForm() {
    const signers = [];
    const rows = document.querySelectorAll('#signersTable tr[data-signer-index]');
    
    rows.forEach((row, index) => {
      const name = row.querySelector(`[name="signers[${index}][name]"]`).value;
      const email = row.querySelector(`[name="signers[${index}][email]"]`).value;
      const role = row.querySelector(`[name="signers[${index}][role]"]`).value;
      const method = row.querySelector(`[name="signers[${index}][method]"]`).value;
      
      if (name && email) {
        signers.push({
          order: index + 1,
          name,
          email,
          role,
          authMethod: method
        });
      }
    });
    
    return signers;
  }
}

// グローバルインスタンス
const cloudSignIntegration = new CloudSignIntegration();

// ページ初期化時にCloudSign接続テスト
document.addEventListener('DOMContentLoaded', () => {
  cloudSignIntegration.testConnection();
});

// 署名者追加・削除
const addSigner = () => {
  const table = document.getElementById('signersTable');
  const newIndex = table.querySelectorAll('tr').length;
  
  const newRow = document.createElement('tr');
  newRow.dataset.signerIndex = newIndex;
  newRow.innerHTML = `
    <td class="text-center">${newIndex + 1}</td>
    <td>
      <input type="text" class="form-control form-control-sm" 
             name="signers[${newIndex}][name]" placeholder="署名者名">
    </td>
    <td>
      <input type="email" class="form-control form-control-sm" 
             name="signers[${newIndex}][email]" placeholder="メールアドレス">
    </td>
    <td>
      <select class="form-select form-select-sm" name="signers[${newIndex}][role]">
        <option value="customer">顧客代表</option>
        <option value="contractor">受託者代表</option>
        <option value="witness">立会人</option>
      </select>
    </td>
    <td>
      <select class="form-select form-select-sm" name="signers[${newIndex}][method]">
        <option value="email">メール認証</option>
        <option value="sms">SMS認証</option>
        <option value="phone">電話認証</option>
      </select>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-sm btn-outline-danger" 
              onclick="removeSigner(${newIndex})">
        <i class="bi bi-trash"></i>
      </button>
    </td>
  `;
  
  table.appendChild(newRow);
};

const removeSigner = (index) => {
  const row = document.querySelector(`tr[data-signer-index="${index}"]`);
  if (row) {
    row.remove();
    
    // インデックス再設定
    const remainingRows = document.querySelectorAll('#signersTable tr[data-signer-index]');
    remainingRows.forEach((row, newIndex) => {
      row.dataset.signerIndex = newIndex;
      row.querySelector('td:first-child').textContent = newIndex + 1;
      
      // name属性も更新
      row.querySelectorAll('input, select').forEach(input => {
        const name = input.name;
        if (name && name.startsWith('signers[')) {
          input.name = name.replace(/signers\[\d+\]/, `signers[${newIndex}]`);
        }
      });
      
      // 削除ボタンのonclick属性も更新
      const deleteBtn = row.querySelector('button[onclick*="removeSigner"]');
      if (deleteBtn) {
        deleteBtn.setAttribute('onclick', `removeSigner(${newIndex})`);
      }
    });
  }
};
```

---

## ✅ 4. 契約承認・ワークフロー画面

### 4.1 画面概要

| 項目 | 内容 |
|------|------|
| **画面ID** | CTR-004 |
| **画面名** | 契約承認・ワークフロー画面 |
| **URL** | `/contracts/approval/{id}` |
| **アクセス権限** | 営業部長、法務、管理者 |
| **表示方式** | ワークフロー可視化 |

### 4.2 機能要件

#### 主要機能
1. **承認フロー表示**
   - ワークフロー進捗可視化
   - 承認者・承認状況表示
   - 承認履歴・コメント表示

2. **承認操作**
   - 承認・却下処理
   - コメント入力
   - 次承認者への送信

3. **通知機能**
   - 承認依頼通知
   - リマインダー送信
   - 承認完了通知

### 4.3 承認ワークフロー表示

```html
<div class="approval-workflow-container">
  <!-- ワークフロー概要 -->
  <div class="card mb-4">
    <div class="card-header">
      <h5><i class="bi bi-flow-chart"></i> 承認ワークフロー</h5>
      <span class="badge bg-warning">承認待ち</span>
    </div>
    <div class="card-body">
      <div class="workflow-visualization">
        <!-- フローチャート形式の承認フロー -->
        <div class="workflow-steps d-flex justify-content-between align-items-center">
          <!-- Step 1: 作成者 -->
          <div class="workflow-step completed">
            <div class="step-icon bg-success">
              <i class="bi bi-check"></i>
            </div>
            <div class="step-content">
              <div class="step-title">作成</div>
              <div class="step-user">田中太郎</div>
              <div class="step-date">2025/06/01 10:30</div>
            </div>
          </div>
          
          <!-- 矢印 -->
          <div class="workflow-arrow">
            <i class="bi bi-arrow-right text-success"></i>
          </div>
          
          <!-- Step 2: 営業部長 -->
          <div class="workflow-step current">
            <div class="step-icon bg-warning">
              <i class="bi bi-clock"></i>
            </div>
            <div class="step-content">
              <div class="step-title">営業部長承認</div>
              <div class="step-user">山田部長</div>
              <div class="step-date">承認待ち</div>
            </div>
          </div>
          
          <!-- 矢印 -->
          <div class="workflow-arrow">
            <i class="bi bi-arrow-right text-muted"></i>
          </div>
          
          <!-- Step 3: 法務 -->
          <div class="workflow-step pending">
            <div class="step-icon bg-secondary">
              <i class="bi bi-dash"></i>
            </div>
            <div class="step-content">
              <div class="step-title">法務確認</div>
              <div class="step-user">佐藤法務</div>
              <div class="step-date">-</div>
            </div>
          </div>
          
          <!-- 矢印 -->
          <div class="workflow-arrow">
            <i class="bi bi-arrow-right text-muted"></i>
          </div>
          
          <!-- Step 4: 最終承認 -->
          <div class="workflow-step pending">
            <div class="step-icon bg-secondary">
              <i class="bi bi-dash"></i>
            </div>
            <div class="step-content">
              <div class="step-title">最終承認</div>
              <div class="step-user">社長</div>
              <div class="step-date">-</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 現在の承認者アクション -->
      <div class="current-approval-action mt-4" id="approvalAction">
        <div class="alert alert-warning">
          <h6><i class="bi bi-person-check"></i> 承認待ち</h6>
          <p class="mb-2">営業部長（山田部長）の承認をお待ちしています。</p>
          <div class="d-flex gap-2">
            <button class="btn btn-success btn-sm" onclick="showApprovalModal(true)">
              <i class="bi bi-check-circle"></i> 承認
            </button>
            <button class="btn btn-danger btn-sm" onclick="showApprovalModal(false)">
              <i class="bi bi-x-circle"></i> 却下
            </button>
            <button class="btn btn-outline-warning btn-sm" onclick="sendReminder()">
              <i class="bi bi-bell"></i> リマインダー送信
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 承認履歴 -->
  <div class="row">
    <div class="col-md-8">
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-clock-history"></i> 承認履歴</h6>
        </div>
        <div class="card-body">
          <div class="approval-history">
            <div class="history-item border-start border-success border-3 ps-3 pb-3">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="mb-1 text-success">契約書作成</h6>
                  <p class="mb-1">田中太郎（営業担当）</p>
                  <small class="text-muted">2025/06/01 10:30</small>
                </div>
                <span class="badge bg-success">完了</span>
              </div>
              <div class="history-comment mt-2">
                <p class="mb-0"><strong>コメント:</strong> ECサイト開発プロジェクトの業務委託契約書を作成しました。</p>
              </div>
            </div>
            
            <div class="history-item border-start border-warning border-3 ps-3 pb-3">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="mb-1 text-warning">営業部長承認待ち</h6>
                  <p class="mb-1">山田部長（営業部長）</p>
                  <small class="text-muted">2025/06/01 14:15 ～</small>
                </div>
                <span class="badge bg-warning">進行中</span>
              </div>
              <div class="history-comment mt-2">
                <p class="mb-0"><strong>期限:</strong> 2025/06/03 17:00</p>
                <p class="mb-0"><strong>経過時間:</strong> <span id="approvalElapsed">2日8時間</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="col-md-4">
      <!-- 承認設定 -->
      <div class="card">
        <div class="card-header">
          <h6><i class="bi bi-gear"></i> 承認設定</h6>
        </div>
        <div class="card-body">
          <div class="approval-settings">
            <div class="setting-item mb-3">
              <label class="form-label">承認期限</label>
              <div class="input-group input-group-sm">
                <input type="number" class="form-control" value="3" min="1" max="30">
                <span class="input-group-text">日</span>
              </div>
            </div>
            
            <div class="setting-item mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="autoReminder" checked>
                <label class="form-check-label" for="autoReminder">
                  自動リマインダー
                </label>
              </div>
              <small class="text-muted">期限24時間前に自動送信</small>
            </div>
            
            <div class="setting-item mb-3">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="parallelApproval">
                <label class="form-check-label" for="parallelApproval">
                  並行承認
                </label>
              </div>
              <small class="text-muted">複数承認者の同時承認</small>
            </div>
            
            <div class="setting-item">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="escalation" checked>
                <label class="form-check-label" for="escalation">
                  エスカレーション
                </label>
              </div>
              <small class="text-muted">期限超過時の上位者通知</small>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 承認統計 -->
      <div class="card mt-3">
        <div class="card-header">
          <h6><i class="bi bi-graph-up"></i> 承認統計</h6>
        </div>
        <div class="card-body">
          <div class="approval-stats">
            <div class="stat-item d-flex justify-content-between mb-2">
              <span>平均承認時間</span>
              <span class="fw-bold">1.2日</span>
            </div>
            <div class="stat-item d-flex justify-content-between mb-2">
              <span>承認率</span>
              <span class="fw-bold text-success">98%</span>
            </div>
            <div class="stat-item d-flex justify-content-between mb-2">
              <span>期限内承認</span>
              <span class="fw-bold text-warning">85%</span>
            </div>
            <div class="stat-item d-flex justify-content-between">
              <span>エスカレーション</span>
              <span class="fw-bold text-danger">5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 承認・却下モーダル -->
<div class="modal fade" id="approvalModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="approvalModalTitle">契約承認</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="approval-confirmation mb-3">
          <p><strong>契約件名:</strong> ECサイト開発業務委託契約</p>
          <p><strong>契約金額:</strong> ¥6,000,000</p>
          <p><strong>契約期間:</strong> 2025/07/01 ～ 2025/12/31</p>
        </div>
        
        <div class="form-group">
          <label class="form-label">コメント <span class="text-danger">*</span></label>
          <textarea class="form-control" id="approvalComment" rows="4" 
                    placeholder="承認・却下の理由やコメントを入力してください"></textarea>
          <div class="form-text">このコメントは承認履歴に記録され、関係者に通知されます。</div>
        </div>
        
        <div class="form-check mt-3" id="nextApproverSection">
          <input class="form-check-input" type="checkbox" id="notifyNextApprover" checked>
          <label class="form-check-label" for="notifyNextApprover">
            次の承認者に通知を送信
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">キャンセル</button>
        <button type="button" class="btn btn-success" id="confirmApprovalBtn" onclick="submitApproval(true)">
          承認する
        </button>
        <button type="button" class="btn btn-danger" id="confirmRejectionBtn" onclick="submitApproval(false)" style="display: none;">
          却下する
        </button>
      </div>
    </div>
  </div>
</div>
```

### 4.4 承認ワークフロー管理JavaScript

```javascript
// 承認ワークフロー管理クラス
class ApprovalWorkflow {
  constructor(contractId) {
    this.contractId = contractId;
    this.currentStep = null;
    this.workflowData = null;
    this.approvalModal = null;
  }
  
  // ワークフロー情報読み込み
  async loadWorkflow() {
    try {
      const response = await fetch(`/api/contracts/${this.contractId}/workflow`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('ワークフロー情報の取得に失敗しました');
      }
      
      this.workflowData = await response.json();
      this.currentStep = this.workflowData.currentStep;
      
      this.renderWorkflow();
      this.updateApprovalAction();
      this.startElapsedTimeUpdate();
      
    } catch (error) {
      console.error('ワークフロー読み込みエラー:', error);
      showErrorMessage('ワークフロー情報の読み込みに失敗しました');
    }
  }
  
  // ワークフロー表示更新
  renderWorkflow() {
    const steps = document.querySelectorAll('.workflow-step');
    
    this.workflowData.steps.forEach((stepData, index) => {
      const stepElement = steps[index];
      if (!stepElement) return;
      
      // ステップ状態更新
      stepElement.className = `workflow-step ${stepData.status}`;
      
      const icon = stepElement.querySelector('.step-icon');
      const title = stepElement.querySelector('.step-title');
      const user = stepElement.querySelector('.step-user');
      const date = stepElement.querySelector('.step-date');
      
      // アイコン・色の更新
      switch (stepData.status) {
        case 'completed':
          icon.className = 'step-icon bg-success';
          icon.innerHTML = '<i class="bi bi-check"></i>';
          break;
        case 'current':
          icon.className = 'step-icon bg-warning';
          icon.innerHTML = '<i class="bi bi-clock"></i>';
          break;
        case 'rejected':
          icon.className = 'step-icon bg-danger';
          icon.innerHTML = '<i class="bi bi-x"></i>';
          break;
        default:
          icon.className = 'step-icon bg-secondary';
          icon.innerHTML = '<i class="bi bi-dash"></i>';
      }
      
      // テキスト更新
      title.textContent = stepData.title;
      user.textContent = stepData.approver.name;
      date.textContent = stepData.completedAt 
        ? formatDateTime(stepData.completedAt) 
        : (stepData.status === 'current' ? '承認待ち' : '-');
    });
    
    // 矢印の色更新
    const arrows = document.querySelectorAll('.workflow-arrow i');
    arrows.forEach((arrow, index) => {
      if (index < this.currentStep) {
        arrow.className = 'bi bi-arrow-right text-success';
      } else {
        arrow.className = 'bi bi-arrow-right text-muted';
      }
    });
  }
  
  // 承認アクション更新
  updateApprovalAction() {
    const actionElement = document.getElementById('approvalAction');
    const currentStepData = this.workflowData.steps[this.currentStep];
    
    if (!currentStepData || currentStepData.status === 'completed') {
      actionElement.innerHTML = `
        <div class="alert alert-success">
          <h6><i class="bi bi-check-circle"></i> 承認完了</h6>
          <p class="mb-0">すべての承認が完了しました。</p>
        </div>
      `;
      return;
    }
    
    // 現在のユーザーが承認者かチェック
    const isCurrentApprover = currentStepData.approver.id === getCurrentUserId();
    
    if (isCurrentApprover) {
      actionElement.innerHTML = `
        <div class="alert alert-warning">
          <h6><i class="bi bi-person-check"></i> あなたの承認が必要です</h6>
          <p class="mb-2">${currentStepData.title}をお願いします。</p>
          <div class="d-flex gap-2">
            <button class="btn btn-success btn-sm" onclick="approvalWorkflow.showApprovalModal(true)">
              <i class="bi bi-check-circle"></i> 承認
            </button>
            <button class="btn btn-danger btn-sm" onclick="approvalWorkflow.showApprovalModal(false)">
              <i class="bi bi-x-circle"></i> 却下
            </button>
          </div>
        </div>
      `;
    } else {
      actionElement.innerHTML = `
        <div class="alert alert-info">
          <h6><i class="bi bi-clock"></i> 承認待ち</h6>
          <p class="mb-2">${currentStepData.approver.name}（${currentStepData.title}）の承認をお待ちしています。</p>
          <button class="btn btn-outline-warning btn-sm" onclick="approvalWorkflow.sendReminder()">
            <i class="bi bi-bell"></i> リマインダー送信
          </button>
        </div>
      `;
    }
  }
  
  // 承認モーダル表示
  showApprovalModal(isApproval) {
    this.approvalModal = new bootstrap.Modal(document.getElementById('approvalModal'));
    
    const title = document.getElementById('approvalModalTitle');
    const approveBtn = document.getElementById('confirmApprovalBtn');
    const rejectBtn = document.getElementById('confirmRejectionBtn');
    
    if (isApproval) {
      title.textContent = '契約承認';
      approveBtn.style.display = 'inline-block';
      rejectBtn.style.display = 'none';
    } else {
      title.textContent = '契約却下';
      approveBtn.style.display = 'none';
      rejectBtn.style.display = 'inline-block';
    }
    
    // コメント欄クリア
    document.getElementById('approvalComment').value = '';
    
    this.approvalModal.show();
  }
  
  // 承認・却下実行
  async submitApproval(isApproval) {
    const comment = document.getElementById('approvalComment').value;
    
    if (!comment.trim()) {
      showErrorMessage('コメントは必須です');
      return;
    }
    
    try {
      const response = await fetch(`/api/contracts/${this.contractId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stepId: this.workflowData.steps[this.currentStep].id,
          approved: isApproval,
          comment: comment,
          notifyNext: document.getElementById('notifyNextApprover').checked
        })
      });
      
      if (!response.ok) {
        throw new Error(isApproval ? '承認処理に失敗しました' : '却下処理に失敗しました');
      }
      
      const result = await response.json();
      
      // モーダルを閉じる
      this.approvalModal.hide();
      
      // 成功メッセージ
      showSuccessMessage(
        isApproval 
          ? '承認が完了しました' 
          : '却下処理が完了しました'
      );
      
      // ワークフロー再読み込み
      await this.loadWorkflow();
      
      // 承認履歴更新
      this.updateApprovalHistory();
      
    } catch (error) {
      console.error('承認処理エラー:', error);
      showErrorMessage(error.message);
    }
  }
  
  // リマインダー送信
  async sendReminder() {
    try {
      const response = await fetch(`/api/contracts/${this.contractId}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stepId: this.workflowData.steps[this.currentStep].id
        })
      });
      
      if (!response.ok) {
        throw new Error('リマインダー送信に失敗しました');
      }
      
      showSuccessMessage('リマインダーを送信しました');
      
    } catch (error) {
      console.error('リマインダー送信エラー:', error);
      showErrorMessage('リマインダーの送信に失敗しました');
    }
  }
  
  // 経過時間更新
  startElapsedTimeUpdate() {
    const updateElapsedTime = () => {
      const currentStepData = this.workflowData.steps[this.currentStep];
      if (currentStepData && currentStepData.startedAt) {
        const elapsed = this.calculateElapsedTime(currentStepData.startedAt);
        const elapsedElement = document.getElementById('approvalElapsed');
        if (elapsedElement) {
          elapsedElement.textContent = elapsed;
        }
      }
    };
    
    // 初回実行
    updateElapsedTime();
    
    // 1分ごとに更新
    setInterval(updateElapsedTime, 60000);
  }
  
  // 経過時間計算
  calculateElapsedTime(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}日${hours}時間`;
    } else if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }
  
  // 承認履歴更新
  async updateApprovalHistory() {
    try {
      const response = await fetch(`/api/contracts/${this.contractId}/approval-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('承認履歴の取得に失敗しました');
      }
      
      const history = await response.json();
      this.renderApprovalHistory(history);
      
    } catch (error) {
      console.error('承認履歴更新エラー:', error);
    }
  }
  
  // 承認履歴表示
  renderApprovalHistory(history) {
    const container = document.querySelector('.approval-history');
    container.innerHTML = '';
    
    history.forEach(item => {
      const historyElement = document.createElement('div');
      historyElement.className = `history-item border-start border-${this.getStatusColor(item.status)} border-3 ps-3 pb-3`;
      
      historyElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1 text-${this.getStatusColor(item.status)}">${item.title}</h6>
            <p class="mb-1">${item.approver.name}（${item.approver.role}）</p>
            <small class="text-muted">${formatDateTime(item.timestamp)}</small>
          </div>
          <span class="badge bg-${this.getStatusColor(item.status)}">${this.getStatusText(item.status)}</span>
        </div>
        ${item.comment ? `
          <div class="history-comment mt-2">
            <p class="mb-0"><strong>コメント:</strong> ${item.comment}</p>
          </div>
        ` : ''}
      `;
      
      container.appendChild(historyElement);
    });
  }
  
  // ユーティリティメソッド
  getStatusColor(status) {
    const colors = {
      'completed': 'success',
      'approved': 'success',
      'current': 'warning',
      'pending': 'secondary',
      'rejected': 'danger'
    };
    return colors[status] || 'secondary';
  }
  
  getStatusText(status) {
    const texts = {
      'completed': '完了',
      'approved': '承認',
      'current': '進行中',
      'pending': '待機',
      'rejected': '却下'
    };
    return texts[status] || '不明';
  }
}

// グローバルインスタンス
let approvalWorkflow;

// ページ初期化
document.addEventListener('DOMContentLoaded', () => {
  const contractId = getContractIdFromUrl();
  approvalWorkflow = new ApprovalWorkflow(contractId);
  approvalWorkflow.loadWorkflow();
});

// URL から契約ID取得
const getContractIdFromUrl = () => {
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1];
};
```

---

## 🚀 5. パフォーマンス・セキュリティ・運用要件

### 5.1 パフォーマンス要件

| 操作 | 目標時間 | 最大許容時間 |
|------|----------|--------------|
| 契約一覧表示 | < 1秒 | < 2秒 |
| 契約詳細表示 | < 800ms | < 1.5秒 |
| 電子署名依頼 | < 2秒 | < 4秒 |
| CloudSign連携 | < 3秒 | < 6秒 |
| 承認処理 | < 1秒 | < 2秒 |
| PDF生成 | < 5秒 | < 10秒 |

### 5.2 セキュリティ要件

#### 契約情報の機密性確保
```javascript
// 契約情報アクセス制御
const checkContractAccess = (contractData, userRole, userId) => {
  // 管理者は全アクセス可能
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // 法務は全契約にアクセス可能
  if (userRole === 'LEGAL') {
    return true;
  }
  
  // 営業担当者は自分が担当する案件のみ
  if (userRole === 'SALES') {
    return contractData.salesRepId === userId;
  }
  
  // 承認者は承認対象の契約のみ
  if (userRole === 'APPROVER') {
    return contractData.approvers.some(approver => approver.id === userId);
  }
  
  return false;
};

// 機密情報マスキング
const maskSensitiveContractInfo = (contractData, userRole) => {
  const masked = { ...contractData };
  
  // 営業担当者以外は金額情報を制限
  if (!['ADMIN', 'LEGAL', 'SALES', 'FINANCE'].includes(userRole)) {
    masked.totalAmount = null;
    masked.monthlyAmount = null;
    masked.engineerRates = masked.engineerRates?.map(rate => ({
      ...rate,
      amount: null
    }));
  }
  
  // 技術者の個人情報は必要最小限のみ
  if (!['ADMIN', 'HR'].includes(userRole)) {
    masked.engineers = masked.engineers?.map(engineer => ({
      id: engineer.id,
      name: engineer.name,
      primarySkills: engineer.primarySkills
    }));
  }
  
  return masked;
};
```

#### 電子署名セキュリティ
```javascript
// CloudSign署名URL検証
const validateSigningUrl = (url, contractId, signerId) => {
  try {
    const urlObj = new URL(url);
    
    // CloudSignドメイン検証
    if (!urlObj.hostname.endsWith('.cloudsign.jp')) {
      throw new Error('不正な署名URL');
    }
    
    // パラメータ検証
    const params = new URLSearchParams(urlObj.search);
    if (params.get('contract') !== contractId || params.get('signer') !== signerId) {
      throw new Error('署名URLパラメータが不正');
    }
    
    return true;
  } catch (error) {
    console.error('署名URL検証エラー:', error);
    return false;
  }
};

// 操作ログ記録（契約関連）
const logContractAction = async (action, contractId, details = {}) => {
  const logData = {
    userId: getCurrentUserId(),
    action,
    targetType: 'CONTRACT',
    targetId: contractId,
    details: {
      ...details,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  };
  
  try {
    await fetch('/api/audit/contract-logs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logData)
    });
  } catch (error) {
    console.error('契約操作ログ記録エラー:', error);
  }
};
```

### 5.3 CloudSign連携エラーハンドリング

```javascript
// CloudSign APIエラーハンドリング
class CloudSignErrorHandler {
  static handle(error, context) {
    const errorCode = error.code || error.status;
    
    switch (errorCode) {
      case 401:
        return {
          message: 'CloudSign認証エラーです。APIキーを確認してください。',
          action: 'REAUTH',
          retryable: false
        };
        
      case 403:
        return {
          message: 'CloudSignの利用権限がありません。プラン設定を確認してください。',
          action: 'CHECK_PLAN',
          retryable: false
        };
        
      case 413:
        return {
          message: 'ファイルサイズが大きすぎます。10MB以下のファイルをアップロードしてください。',
          action: 'REDUCE_SIZE',
          retryable: false
        };
        
      case 429:
        return {
          message: 'CloudSign APIの利用制限に達しました。しばらく待ってから再試行してください。',
          action: 'RETRY_LATER',
          retryable: true,
          retryAfter: 60000 // 1分後
        };
        
      case 500:
      case 502:
      case 503:
        return {
          message: 'CloudSignサービスが一時的に利用できません。しばらく待ってから再試行してください。',
          action: 'RETRY',
          retryable: true,
          retryAfter: 30000 // 30秒後
        };
        
      default:
        return {
          message: `CloudSign連携でエラーが発生しました: ${error.message}`,
          action: 'CONTACT_SUPPORT',
          retryable: false
        };
    }
  }
  
  static async retryWithBackoff(operation, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        const errorInfo = this.handle(error, 'retry');
        
        if (!errorInfo.retryable || retries === maxRetries - 1) {
          throw error;
        }
        
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 30000); // 指数バックオフ（最大30秒）
        
        console.warn(`CloudSign操作失敗、${delay}ms後に再試行 (${retries}/${maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

---

## 📚 6. 関連資料・運用

### 6.1 参照ドキュメント
- **API設計書**: `Contract_Context_API.md`
- **ドメインモデル設計**: `Contract集約詳細設計.md`
- **データベース設計**: `Contract_Context_物理テーブル設計.md`
- **CloudSign API仕様**: `https://developers.cloudsign.jp/`

### 6.2 外部サービス連携
- **CloudSign**: 電子契約サービス
  - API Version: v1
  - 認証方式: API Key
  - 利用制限: 1000リクエスト/時間

### 6.3 運用手順

#### 日次運用
1. **期限切れ契約チェック**: 毎日9:00に自動実行
2. **署名状況確認**: CloudSignとの同期（1時間毎）
3. **リマインダー送信**: 承認期限24時間前、署名期限72時間前

#### 月次運用
1. **契約統計レポート**: 月初に自動生成
2. **CloudSign利用状況確認**: プラン制限チェック
3. **承認フロー効率分析**: 平均承認時間・ボトルネック特定

### 6.4 障害対応

#### CloudSign障害時の対応
1. **一時的障害**: 自動リトライ（最大3回、指数バックオフ）
2. **長期障害**: 手動プロセスへの切り替え（物理契約書作成）
3. **データ不整合**: CloudSignとシステム間の差分チェック・修正

---

**文書管理**:
- **作成者**: プロジェクトチーム
- **レビュアー**: 法務、UI/UXデザイナー
- **承認者**: アーキテクト、プロジェクトマネージャー
- **最終更新**: 2025年6月1日
- **次回レビュー**: 2025年7月1日