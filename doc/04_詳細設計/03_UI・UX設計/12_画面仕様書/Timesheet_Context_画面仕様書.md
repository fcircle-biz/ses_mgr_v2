# Timesheet Context 画面仕様書

## 目次

1. [概要](#概要)
2. [全体方針](#全体方針)
3. [勤怠入力・タイムシート画面](#勤怠入力タイムシート画面)
4. [工数集計・レポート画面](#工数集計レポート画面)
5. [勤怠承認・管理画面](#勤怠承認管理画面)
6. [残業・有給申請画面](#残業有給申請画面)

---

## 概要

### 対象システム
SES業務システム - Timesheet Context（勤怠・工数管理コンテキスト）

### 責務
- 技術者の日々の勤怠情報管理
- 工数データの収集・集計・分析
- 多段階承認ワークフロー管理
- 残業・有給等の申請処理
- レポート生成・データエクスポート

### 対象ユーザー
- **技術者**: 勤怠入力・申請業務
- **PM/TL**: チーム勤怠管理・一次承認
- **管理部門**: 全社勤怠管理・最終承認
- **経理**: 工数データ・請求計算連携

---

## 全体方針

### UI・UX設計原則
- **効率性優先**: 日常業務での頻繁利用を考慮した操作性
- **視覚的明確性**: 承認状況・期限等の重要情報の即座把握
- **エラー防止**: 入力ミス・申請漏れを未然に防ぐ設計
- **アクセシビリティ**: WCAG 2.1 AA準拠・多様なユーザー対応

### アーキテクチャ方針
- **フロントエンド**: Thymeleaf + Bootstrap 5.3 + Alpine.js + Chart.js
- **API連携**: RESTful API + htmx による非同期更新
- **状態管理**: Alpine.js ストア + LocalStorage での下書き保存
- **データ可視化**: Chart.js による統計表示・レポート機能

### 品質基準
- **パフォーマンス**: 初回表示<2秒・画面遷移<1秒・AJAX<500ms
- **レスポンシブ**: 320px-2560px対応・Mobile First設計
- **アクセシビリティ**: キーボード操作・スクリーンリーダー対応

---

## 勤怠入力・タイムシート画面

### 1. 画面概要

#### 目的
技術者が日々の勤怠情報を効率的に入力・管理できる画面

#### 主要機能
- 月次カレンダー形式での日次勤怠入力
- 出退勤時刻・休憩時間・労働時間の記録
- 勤務場所（オンサイト/リモート）の選択
- 日報コメント・作業内容の入力
- リアルタイム月間工数集計表示
- 入力データの自動保存機能

### 2. 技術仕様

#### 使用技術
```html
<!-- CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">
<link href="/css/ses-theme.css" rel="stylesheet">

<!-- JavaScript -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
<script src="https://unpkg.com/htmx.org@1.9.8"></script>
```

#### Alpine.js データストア
```javascript
Alpine.store('timesheet', {
  selectedMonth: new Date(),
  dailyAttendances: [],
  loading: false,
  autoSaveEnabled: true,
  
  init() {
    this.loadMonthlyData();
    this.enableAutoSave();
  }
});
```

### 3. 画面構成要素

#### ページヘッダー
```html
<div class="page-header mb-4">
  <div class="d-flex justify-content-between align-items-start">
    <div>
      <h1 class="h3 mb-2">
        <i class="bi bi-calendar-check me-2"></i>勤怠入力・タイムシート
      </h1>
      <p class="text-muted mb-0">日々の勤怠情報を入力・管理します</p>
    </div>
    <div class="page-actions">
      <button class="btn btn-outline-secondary me-2" 
              x-data @click="$store.timesheet.exportTimesheet()">
        <i class="bi bi-download me-1"></i>エクスポート
      </button>
      <button class="btn btn-primary" 
              x-data @click="$store.timesheet.submitTimesheet()">
        <i class="bi bi-check-circle me-1"></i>提出
      </button>
    </div>
  </div>
</div>
```

#### 月次ナビゲーション
```html
<div class="month-navigation card mb-4">
  <div class="card-body">
    <div class="d-flex justify-content-between align-items-center">
      <button class="btn btn-outline-secondary" 
              x-data @click="$store.timesheet.previousMonth()">
        <i class="bi bi-chevron-left"></i>前月
      </button>
      <h4 class="mb-0" x-data x-text="$store.timesheet.currentMonthText"></h4>
      <button class="btn btn-outline-secondary" 
              x-data @click="$store.timesheet.nextMonth()">
        次月<i class="bi bi-chevron-right ms-1"></i>
      </button>
    </div>
  </div>
</div>
```

#### カレンダーグリッド
```html
<div class="calendar-grid card">
  <div class="card-header">
    <div class="row text-center fw-bold">
      <div class="col">日</div>
      <div class="col">月</div>
      <div class="col">火</div>
      <div class="col">水</div>
      <div class="col">木</div>
      <div class="col">金</div>
      <div class="col">土</div>
    </div>
  </div>
  <div class="card-body p-0">
    <template x-data x-for="week in $store.timesheet.calendarWeeks" :key="week.index">
      <div class="row border-bottom">
        <template x-for="day in week.days" :key="day.date">
          <div class="col p-2 calendar-day" 
               :class="day.isCurrentMonth ? 'current-month' : 'other-month'"
               @click="$store.timesheet.selectDay(day)">
            
            <!-- 日付表示 -->
            <div class="day-number" 
                 :class="day.isToday ? 'today' : ''"
                 x-text="day.number"></div>
            
            <!-- 勤怠ステータス -->
            <div class="attendance-status mt-1">
              <span class="badge" 
                    :class="day.attendance.statusClass"
                    x-text="day.attendance.statusText"></span>
            </div>
            
            <!-- 労働時間 -->
            <div class="work-hours mt-1" x-show="day.attendance.workHours">
              <small class="text-muted" x-text="day.attendance.workHours + 'h'"></small>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</div>
```

#### 日次入力モーダル
```html
<div class="modal fade" id="dailyInputModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content" x-data="dailyAttendanceForm">
      <div class="modal-header">
        <h5 class="modal-title">
          <span x-text="selectedDate"></span> の勤怠入力
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="saveAttendance">
          <!-- 勤務タイプ選択 -->
          <div class="mb-3">
            <label class="form-label">勤務タイプ <span class="text-danger">*</span></label>
            <div class="btn-group w-100" role="group">
              <input type="radio" class="btn-check" name="attendanceType" 
                     id="work" value="WORK" x-model="form.attendanceType">
              <label class="btn btn-outline-primary" for="work">勤務</label>
              
              <input type="radio" class="btn-check" name="attendanceType" 
                     id="vacation" value="VACATION" x-model="form.attendanceType">
              <label class="btn btn-outline-success" for="vacation">有給</label>
              
              <input type="radio" class="btn-check" name="attendanceType" 
                     id="holiday" value="HOLIDAY" x-model="form.attendanceType">
              <label class="btn btn-outline-secondary" for="holiday">休み</label>
            </div>
          </div>
          
          <!-- 勤務時間入力 -->
          <div x-show="form.attendanceType === 'WORK'">
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="startTime" class="form-label">開始時刻 <span class="text-danger">*</span></label>
                <input type="time" class="form-control" id="startTime" 
                       x-model="form.startTime" @change="calculateWorkingHours">
              </div>
              <div class="col-md-6">
                <label for="endTime" class="form-label">終了時刻 <span class="text-danger">*</span></label>
                <input type="time" class="form-control" id="endTime" 
                       x-model="form.endTime" @change="calculateWorkingHours">
              </div>
            </div>
            
            <div class="row mb-3">
              <div class="col-md-6">
                <label for="breakStartTime" class="form-label">休憩開始</label>
                <input type="time" class="form-control" id="breakStartTime" 
                       x-model="form.breakStartTime" @change="calculateWorkingHours">
              </div>
              <div class="col-md-6">
                <label for="breakEndTime" class="form-label">休憩終了</label>
                <input type="time" class="form-control" id="breakEndTime" 
                       x-model="form.breakEndTime" @change="calculateWorkingHours">
              </div>
            </div>
            
            <!-- 勤務場所 -->
            <div class="mb-3">
              <label class="form-label">勤務場所</label>
              <select class="form-select" x-model="form.workLocation">
                <option value="ONSITE">オンサイト</option>
                <option value="REMOTE">リモート</option>
                <option value="HYBRID">ハイブリッド</option>
              </select>
            </div>
            
            <!-- 計算結果表示 -->
            <div class="alert alert-info">
              <div class="row text-center">
                <div class="col-4">
                  <strong>労働時間</strong><br>
                  <span class="h5" x-text="calculatedHours.work + 'h'"></span>
                </div>
                <div class="col-4">
                  <strong>休憩時間</strong><br>
                  <span class="h5" x-text="calculatedHours.break + 'h'"></span>
                </div>
                <div class="col-4">
                  <strong>残業時間</strong><br>
                  <span class="h5" x-text="calculatedHours.overtime + 'h'"></span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 日報コメント -->
          <div class="mb-3">
            <label for="dailyComment" class="form-label">日報・作業内容</label>
            <textarea class="form-control" id="dailyComment" rows="3" 
                      x-model="form.dailyComment"
                      placeholder="今日の作業内容や特記事項を入力してください"></textarea>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
          キャンセル
        </button>
        <button type="button" class="btn btn-primary" @click="saveAttendance">
          <i class="bi bi-check-circle me-1"></i>保存
        </button>
      </div>
    </div>
  </div>
</div>
```

#### 月間集計サマリー
```html
<div class="monthly-summary row mt-4">
  <div class="col-md-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="stats-icon bg-primary text-white">
            <i class="bi bi-clock"></i>
          </div>
          <div class="ms-3">
            <div class="stats-value" x-data x-text="$store.timesheet.monthlyStats.totalHours + 'h'"></div>
            <div class="stats-label">総労働時間</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="stats-icon bg-warning text-white">
            <i class="bi bi-clock-history"></i>
          </div>
          <div class="ms-3">
            <div class="stats-value" x-data x-text="$store.timesheet.monthlyStats.overtimeHours + 'h'"></div>
            <div class="stats-label">残業時間</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="stats-icon bg-success text-white">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="ms-3">
            <div class="stats-value" x-data x-text="$store.timesheet.monthlyStats.workDays + '日'"></div>
            <div class="stats-label">出勤日数</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex align-items-center">
          <div class="stats-icon bg-info text-white">
            <i class="bi bi-calendar-minus"></i>
          </div>
          <div class="ms-3">
            <div class="stats-value" x-data x-text="$store.timesheet.monthlyStats.vacationDays + '日'"></div>
            <div class="stats-label">有給取得</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 4. データ構造

#### DailyAttendance モデル
```typescript
interface DailyAttendance {
  id: string;
  date: string; // ISO date format
  attendanceType: 'WORK' | 'VACATION' | 'HOLIDAY' | 'SPECIAL_LEAVE';
  startTime?: string; // HH:mm format
  endTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  actualWorkingHours: number;
  overtimeHours: number;
  workLocation: 'ONSITE' | 'REMOTE' | 'HYBRID';
  dailyComment?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}
```

#### MonthlyStats モデル
```typescript
interface MonthlyStats {
  totalHours: number;
  overtimeHours: number;
  workDays: number;
  vacationDays: number;
  expectedWorkingDays: number;
  attendanceRate: number;
}
```

### 5. 主要機能

#### 自動計算機能
```javascript
function calculateWorkingHours(startTime, endTime, breakStartTime, breakEndTime) {
  if (!startTime || !endTime) return { work: 0, break: 0, overtime: 0 };
  
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const breakStart = parseTime(breakStartTime);
  const breakEnd = parseTime(breakEndTime);
  
  let totalMinutes = end - start;
  let breakMinutes = 0;
  
  if (breakStart && breakEnd && breakEnd > breakStart) {
    breakMinutes = breakEnd - breakStart;
  }
  
  const workMinutes = totalMinutes - breakMinutes;
  const workHours = Math.max(0, workMinutes / 60);
  const breakHours = breakMinutes / 60;
  const overtimeHours = Math.max(0, workHours - 8); // 8時間超過分
  
  return {
    work: Number(workHours.toFixed(1)),
    break: Number(breakHours.toFixed(1)),
    overtime: Number(overtimeHours.toFixed(1))
  };
}
```

#### 自動保存機能
```javascript
function enableAutoSave() {
  Alpine.effect(() => {
    if (this.autoSaveEnabled && this.hasChanges) {
      debounce(() => {
        this.saveDraft();
      }, 2000)();
    }
  });
}
```

### 6. バリデーション

#### 入力バリデーション
- **必須項目**: 勤務日の出退勤時刻、勤務場所
- **時刻妥当性**: 開始時刻 < 終了時刻、休憩時間の妥当性
- **労働時間制限**: 1日最大12時間、月間最大200時間
- **連続勤務**: 6日を超える連続勤務の警告

#### バリデーションメッセージ
```html
<div class="invalid-feedback" x-show="errors.startTime">
  開始時刻を入力してください
</div>
<div class="alert alert-warning" x-show="warnings.overtime">
  <i class="bi bi-exclamation-triangle me-2"></i>
  残業時間が8時間を超えています。労働基準法に注意してください。
</div>
```

### 7. API連携

#### エンドポイント設計
```yaml
# 月次勤怠データ取得
GET /api/v1/timesheets/{engineerId}/monthly?year=2025&month=6
Response: DailyAttendance[]

# 日次勤怠保存
PUT /api/v1/timesheets/{engineerId}/daily/{date}
Request: DailyAttendance
Response: DailyAttendance

# 月次集計データ取得
GET /api/v1/timesheets/{engineerId}/monthly-stats?year=2025&month=6
Response: MonthlyStats
```

#### htmx 非同期更新
```html
<div hx-get="/api/v1/timesheets/monthly-stats" 
     hx-trigger="timesheet-updated" 
     hx-target="#monthly-stats">
</div>
```

### 8. エラーハンドリング

#### エラーパターン
- **バリデーションエラー**: フィールド単位のインラインエラー表示
- **API通信エラー**: トーストメッセージでの通知
- **権限エラー**: モーダルでの詳細説明
- **システムエラー**: エラーページへのリダイレクト

#### エラー表示例
```html
<!-- トーストエラー -->
<div class="toast-container position-fixed top-0 end-0 p-3">
  <div class="toast show bg-danger text-white" x-show="error.api">
    <div class="toast-header bg-danger text-white border-0">
      <i class="bi bi-exclamation-triangle me-2"></i>
      <strong class="me-auto">エラー</strong>
    </div>
    <div class="toast-body" x-text="error.message"></div>
  </div>
</div>
```

### 9. アクセシビリティ

#### ARIA属性
```html
<button aria-expanded="false" aria-controls="dailyInputModal" 
        aria-label="日次勤怠入力モーダルを開く">
</button>

<div role="grid" aria-label="月次カレンダー">
  <div role="gridcell" tabindex="0" 
       aria-label="6月1日 勤務日 8時間労働">
  </div>
</div>
```

#### キーボードナビゲーション
- **Tab**: フォーカス移動
- **Enter/Space**: 日付選択・ボタン実行
- **矢印キー**: カレンダー内日付移動
- **Escape**: モーダル閉じる

### 10. レスポンシブ対応

#### モバイル最適化
```css
@media (max-width: 768px) {
  .calendar-grid .col {
    font-size: 0.875rem;
    padding: 0.5rem;
  }
  
  .monthly-summary .col-md-3 {
    margin-bottom: 1rem;
  }
  
  .modal-dialog {
    margin: 0.5rem;
  }
}
```

#### タッチ操作対応
- **最小タッチサイズ**: 44px×44px
- **スワイプジェスチャー**: 月切り替え
- **タップフィードバック**: ボタン・日付選択時の視覚的反応

---

## 工数集計・レポート画面

### 1. 画面概要

#### 目的
工数データの多角的分析・可視化とレポート生成機能を提供

#### 主要機能
- 期間指定による工数データ分析
- 多様なチャート・グラフによる可視化
- CSV/PDF/Excel形式でのデータエクスポート
- プロジェクト別・技術者別の集計レポート
- カスタムフィルタリング機能

### 2. 技術仕様

#### Chart.js設定
```javascript
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: '日付'
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: '労働時間（h）'
      }
    }
  }
};
```

### 3. 画面構成要素

#### フィルターパネル
```html
<div class="filter-panel card mb-4">
  <div class="card-header">
    <h5 class="card-title mb-0">
      <i class="bi bi-funnel me-2"></i>分析条件設定
    </h5>
  </div>
  <div class="card-body">
    <form x-data="reportFilter" @submit.prevent="applyFilter">
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">期間</label>
          <select class="form-select" x-model="period">
            <option value="thisWeek">今週</option>
            <option value="thisMonth">今月</option>
            <option value="lastMonth">先月</option>
            <option value="thisQuarter">今四半期</option>
            <option value="custom">カスタム</option>
          </select>
        </div>
        
        <div class="col-md-3" x-show="period === 'custom'">
          <label class="form-label">開始日</label>
          <input type="date" class="form-control" x-model="startDate">
        </div>
        
        <div class="col-md-3" x-show="period === 'custom'">
          <label class="form-label">終了日</label>
          <input type="date" class="form-control" x-model="endDate">
        </div>
        
        <div class="col-md-3">
          <label class="form-label">対象プロジェクト</label>
          <select class="form-select" x-model="projectId">
            <option value="">すべて</option>
            <template x-for="project in projects" :key="project.id">
              <option :value="project.id" x-text="project.name"></option>
            </template>
          </select>
        </div>
        
        <div class="col-md-3">
          <label class="form-label">対象技術者</label>
          <select class="form-select" x-model="engineerId">
            <option value="">すべて</option>
            <template x-for="engineer in engineers" :key="engineer.id">
              <option :value="engineer.id" x-text="engineer.name"></option>
            </template>
          </select>
        </div>
        
        <div class="col-md-3">
          <label class="form-label">勤務形態</label>
          <select class="form-select" x-model="workLocation">
            <option value="">すべて</option>
            <option value="ONSITE">オンサイト</option>
            <option value="REMOTE">リモート</option>
            <option value="HYBRID">ハイブリッド</option>
          </select>
        </div>
        
        <div class="col-md-3">
          <label class="form-label">&nbsp;</label>
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary">
              <i class="bi bi-search me-1"></i>分析実行
            </button>
            <button type="button" class="btn btn-outline-secondary" @click="resetFilter">
              <i class="bi bi-arrow-clockwise me-1"></i>リセット
            </button>
          </div>
        </div>
      </div>
    </form>
  </div>
</div>
```

#### サマリーカード
```html
<div class="summary-cards row mb-4">
  <div class="col-md-3 mb-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-muted">総労働時間</h6>
            <h2 class="card-title text-primary" x-text="summary.totalHours + 'h'"></h2>
            <div class="stats-trend" :class="summary.totalHours.trend > 0 ? 'text-success' : 'text-danger'">
              <i :class="summary.totalHours.trend > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
              <span x-text="Math.abs(summary.totalHours.trend) + '%'"></span>
              <span class="text-muted ms-1">前期比</span>
            </div>
          </div>
          <div class="stats-icon bg-primary">
            <i class="bi bi-clock"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-muted">残業時間</h6>
            <h2 class="card-title text-warning" x-text="summary.overtimeHours + 'h'"></h2>
            <div class="stats-trend" :class="summary.overtimeHours.trend > 0 ? 'text-danger' : 'text-success'">
              <i :class="summary.overtimeHours.trend > 0 ? 'bi bi-arrow-up' : 'bi bi-arrow-down'"></i>
              <span x-text="Math.abs(summary.overtimeHours.trend) + '%'"></span>
              <span class="text-muted ms-1">前期比</span>
            </div>
          </div>
          <div class="stats-icon bg-warning">
            <i class="bi bi-clock-history"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-muted">稼働率</h6>
            <h2 class="card-title text-success" x-text="summary.utilizationRate + '%'"></h2>
            <div class="stats-trend text-success">
              <i class="bi bi-arrow-up"></i>
              <span x-text="summary.utilizationRate.trend + '%'"></span>
              <span class="text-muted ms-1">前期比</span>
            </div>
          </div>
          <div class="stats-icon bg-success">
            <i class="bi bi-graph-up"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-muted">平均労働時間</h6>
            <h2 class="card-title text-info" x-text="summary.averageHours + 'h/日'"></h2>
            <div class="stats-trend text-muted">
              <span x-text="'標準8h比 ' + (summary.averageHours - 8) + 'h'"></span>
            </div>
          </div>
          <div class="stats-icon bg-info">
            <i class="bi bi-calculator"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### チャートエリア
```html
<div class="charts-area row">
  <!-- 労働時間推移チャート -->
  <div class="col-lg-8 mb-4">
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="card-title mb-0">労働時間推移</h5>
        <div class="chart-controls">
          <div class="btn-group" role="group">
            <input type="radio" class="btn-check" name="timeUnit" id="daily" checked>
            <label class="btn btn-outline-primary btn-sm" for="daily">日別</label>
            
            <input type="radio" class="btn-check" name="timeUnit" id="weekly">
            <label class="btn btn-outline-primary btn-sm" for="weekly">週別</label>
            
            <input type="radio" class="btn-check" name="timeUnit" id="monthly">
            <label class="btn btn-outline-primary btn-sm" for="monthly">月別</label>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="chart-container" style="height: 400px;">
          <canvas id="workHoursTrendChart"></canvas>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 勤務形態分布チャート -->
  <div class="col-lg-4 mb-4">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">勤務形態分布</h5>
      </div>
      <div class="card-body">
        <div class="chart-container" style="height: 400px;">
          <canvas id="workLocationChart"></canvas>
        </div>
      </div>
    </div>
  </div>
  
  <!-- プロジェクト別工数チャート -->
  <div class="col-lg-6 mb-4">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">プロジェクト別工数</h5>
      </div>
      <div class="card-body">
        <div class="chart-container" style="height: 300px;">
          <canvas id="projectHoursChart"></canvas>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 技術者別パフォーマンス -->
  <div class="col-lg-6 mb-4">
    <div class="card">
      <div class="card-header">
        <h5 class="card-title mb-0">技術者別パフォーマンス</h5>
      </div>
      <div class="card-body">
        <div class="chart-container" style="height: 300px;">
          <canvas id="engineerPerformanceChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### データテーブル
```html
<div class="detailed-data card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="card-title mb-0">詳細データ</h5>
    <div class="table-actions">
      <button class="btn btn-outline-secondary btn-sm me-2" @click="exportData('csv')">
        <i class="bi bi-filetype-csv me-1"></i>CSV
      </button>
      <button class="btn btn-outline-secondary btn-sm me-2" @click="exportData('excel')">
        <i class="bi bi-file-earmark-excel me-1"></i>Excel
      </button>
      <button class="btn btn-outline-secondary btn-sm" @click="exportData('pdf')">
        <i class="bi bi-filetype-pdf me-1"></i>PDF
      </button>
    </div>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th scope="col">
              <button class="btn btn-link p-0 text-decoration-none" @click="sortBy('date')">
                日付 <i class="bi bi-arrow-down-up"></i>
              </button>
            </th>
            <th scope="col">技術者</th>
            <th scope="col">プロジェクト</th>
            <th scope="col">労働時間</th>
            <th scope="col">残業時間</th>
            <th scope="col">勤務形態</th>
            <th scope="col">状態</th>
          </tr>
        </thead>
        <tbody>
          <template x-for="record in paginatedData" :key="record.id">
            <tr>
              <td x-text="formatDate(record.date)"></td>
              <td>
                <div class="d-flex align-items-center">
                  <img :src="record.engineer.avatar" class="rounded-circle me-2" width="32" height="32">
                  <span x-text="record.engineer.name"></span>
                </div>
              </td>
              <td x-text="record.project.name"></td>
              <td>
                <span class="badge bg-primary" x-text="record.workHours + 'h'"></span>
              </td>
              <td>
                <span class="badge" 
                      :class="record.overtimeHours > 0 ? 'bg-warning' : 'bg-secondary'"
                      x-text="record.overtimeHours + 'h'"></span>
              </td>
              <td>
                <span class="badge" 
                      :class="getWorkLocationClass(record.workLocation)"
                      x-text="getWorkLocationText(record.workLocation)"></span>
              </td>
              <td>
                <span class="badge" 
                      :class="getStatusClass(record.status)"
                      x-text="getStatusText(record.status)"></span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    
    <!-- ページネーション -->
    <div class="d-flex justify-content-between align-items-center p-3">
      <div class="pagination-info">
        <span class="text-muted" 
              x-text="`${totalRecords}件中 ${paginationStart}-${paginationEnd}件を表示`"></span>
      </div>
      <nav aria-label="データテーブルページネーション">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="currentPage === 1 ? 'disabled' : ''">
            <button class="page-link" @click="goToPage(currentPage - 1)">前へ</button>
          </li>
          <template x-for="page in visiblePages" :key="page">
            <li class="page-item" :class="page === currentPage ? 'active' : ''">
              <button class="page-link" @click="goToPage(page)" x-text="page"></button>
            </li>
          </template>
          <li class="page-item" :class="currentPage === totalPages ? 'disabled' : ''">
            <button class="page-link" @click="goToPage(currentPage + 1)">次へ</button>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</div>
```

### 4. データ構造

#### ReportData モデル
```typescript
interface ReportData {
  summary: {
    totalHours: number;
    overtimeHours: number;
    utilizationRate: number;
    averageHours: number;
    trend: {
      totalHours: number;
      overtimeHours: number;
    };
  };
  timeSeriesData: {
    dates: string[];
    workHours: number[];
    overtimeHours: number[];
  };
  distributionData: {
    workLocation: { [key: string]: number };
    projects: { [key: string]: number };
    engineers: { [key: string]: number };
  };
  detailRecords: AttendanceRecord[];
}
```

### 5. 主要機能

#### チャート生成
```javascript
function createWorkHoursTrendChart(canvasId, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.dates,
      datasets: [
        {
          label: '労働時間',
          data: data.workHours,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: '残業時間',
          data: data.overtimeHours,
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1
        }
      ]
    },
    options: chartConfig
  });
}
```

#### データエクスポート
```javascript
async function exportData(format) {
  const exportConfig = {
    csv: { endpoint: '/api/v1/reports/export/csv', mimeType: 'text/csv' },
    excel: { endpoint: '/api/v1/reports/export/excel', mimeType: 'application/vnd.ms-excel' },
    pdf: { endpoint: '/api/v1/reports/export/pdf', mimeType: 'application/pdf' }
  };
  
  const config = exportConfig[format];
  const params = new URLSearchParams(this.filterParams);
  
  try {
    const response = await fetch(`${config.endpoint}?${params}`);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-report-${format}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    this.showError('エクスポートに失敗しました');
  }
}
```

### 6. バリデーション

#### フィルター入力検証
- **日付範囲**: 開始日 ≤ 終了日、未来日の制限
- **期間制限**: 最大1年間のデータ取得制限
- **必須選択**: カスタム期間選択時の日付必須入力

### 7. API連携

#### レポートAPI
```yaml
# レポートデータ取得
GET /api/v1/reports/timesheet
Parameters:
  - startDate: string (ISO date)
  - endDate: string (ISO date)
  - projectId?: string
  - engineerId?: string
  - workLocation?: string
Response: ReportData

# エクスポート
GET /api/v1/reports/export/{format}
Parameters: (same as above)
Response: File (CSV/Excel/PDF)
```

### 8. エラーハンドリング

#### データ読み込みエラー
```html
<div class="alert alert-warning" x-show="loading.error">
  <i class="bi bi-exclamation-triangle me-2"></i>
  データの読み込みに失敗しました。フィルター条件を確認してください。
  <button class="btn btn-link p-0 ms-2" @click="retryLoad">再試行</button>
</div>
```

### 9. アクセシビリティ

#### チャート代替テキスト
```html
<canvas id="workHoursChart" 
        aria-label="労働時間推移グラフ。6月の平均労働時間は8.5時間、残業時間は1.2時間でした。">
</canvas>

<!-- データテーブル形式でも提供 -->
<table class="visually-hidden" aria-label="チャートデータテーブル">
  <!-- グラフデータのテーブル表現 -->
</table>
```

### 10. レスポンシブ対応

#### モバイル表示
```css
@media (max-width: 768px) {
  .charts-area .col-lg-8,
  .charts-area .col-lg-4,
  .charts-area .col-lg-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }
  
  .chart-container {
    height: 250px !important;
  }
  
  .filter-panel .row .col-md-3 {
    flex: 0 0 100%;
    max-width: 100%;
    margin-bottom: 1rem;
  }
}
```

---

## 勤怠承認・管理画面

### 1. 画面概要

#### 目的
勤怠データの段階的承認ワークフロー管理と一括処理機能を提供

#### 主要機能
- 多段階承認ワークフロー（PM→連携先→管理部門）
- 一括承認・差し戻し機能
- 承認履歴とコメント管理
- 承認権限の委任機能
- 期限管理と通知システム
- 承認状況ダッシュボード

### 2. 技術仕様

#### Alpine.js 状態管理
```javascript
Alpine.store('approvalManagement', {
  pendingApprovals: [],
  selectedItems: [],
  currentFilter: 'pending',
  sortOrder: 'deadline_asc',
  bulkActionMode: false,
  
  get filteredApprovals() {
    return this.pendingApprovals.filter(item => {
      switch (this.currentFilter) {
        case 'pending': return item.status === 'PENDING';
        case 'overdue': return item.isOverdue;
        case 'approved': return item.status === 'APPROVED';
        case 'rejected': return item.status === 'REJECTED';
        default: return true;
      }
    });
  }
});
```

### 3. 画面構成要素

#### ダッシュボードサマリー
```html
<div class="approval-dashboard row mb-4">
  <div class="col-md-3 mb-3">
    <div class="card stats-card border-warning">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-warning">承認待ち</h6>
            <h2 class="card-title text-warning" x-text="dashboard.pending"></h2>
            <small class="text-muted">件の承認が必要です</small>
          </div>
          <div class="stats-icon bg-warning">
            <i class="bi bi-clock-history"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card border-danger">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-danger">期限超過</h6>
            <h2 class="card-title text-danger" x-text="dashboard.overdue"></h2>
            <small class="text-muted">緊急対応が必要</small>
          </div>
          <div class="stats-icon bg-danger">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card border-success">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-success">今月承認済み</h6>
            <h2 class="card-title text-success" x-text="dashboard.approved"></h2>
            <small class="text-muted">件を承認完了</small>
          </div>
          <div class="stats-icon bg-success">
            <i class="bi bi-check-circle"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 mb-3">
    <div class="card stats-card border-secondary">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="card-subtitle text-secondary">平均処理時間</h6>
            <h2 class="card-title text-secondary" x-text="dashboard.avgProcessTime + 'h'"></h2>
            <small class="text-muted">目標: 24h以内</small>
          </div>
          <div class="stats-icon bg-secondary">
            <i class="bi bi-stopwatch"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### フィルター・操作エリア
```html
<div class="approval-controls card mb-4">
  <div class="card-body">
    <div class="row g-3 align-items-end">
      <!-- フィルター -->
      <div class="col-md-3">
        <label class="form-label">ステータス</label>
        <select class="form-select" x-model="$store.approvalManagement.currentFilter">
          <option value="all">すべて</option>
          <option value="pending">承認待ち</option>
          <option value="overdue">期限超過</option>
          <option value="approved">承認済み</option>
          <option value="rejected">差し戻し</option>
        </select>
      </div>
      
      <div class="col-md-3">
        <label class="form-label">対象期間</label>
        <select class="form-select" x-model="filterPeriod">
          <option value="thisMonth">今月</option>
          <option value="lastMonth">先月</option>
          <option value="thisQuarter">今四半期</option>
        </select>
      </div>
      
      <div class="col-md-3">
        <label class="form-label">担当プロジェクト</label>
        <select class="form-select" x-model="filterProject">
          <option value="">すべて</option>
          <template x-for="project in myProjects" :key="project.id">
            <option :value="project.id" x-text="project.name"></option>
          </template>
        </select>
      </div>
      
      <div class="col-md-3">
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" @click="refreshList">
            <i class="bi bi-arrow-clockwise me-1"></i>更新
          </button>
          <button class="btn btn-outline-primary" @click="toggleBulkMode">
            <i class="bi bi-check-square me-1"></i>一括選択
          </button>
        </div>
      </div>
    </div>
    
    <!-- 一括操作バー -->
    <div class="bulk-actions-bar mt-3" 
         x-show="$store.approvalManagement.bulkActionMode && $store.approvalManagement.selectedItems.length > 0"
         x-transition>
      <div class="alert alert-info d-flex justify-content-between align-items-center mb-0">
        <div>
          <i class="bi bi-info-circle me-2"></i>
          <span x-text="`${$store.approvalManagement.selectedItems.length}件を選択中`"></span>
        </div>
        <div class="btn-group">
          <button class="btn btn-success btn-sm" @click="bulkApprove">
            <i class="bi bi-check-circle me-1"></i>一括承認
          </button>
          <button class="btn btn-warning btn-sm" @click="bulkReject">
            <i class="bi bi-x-circle me-1"></i>一括差し戻し
          </button>
          <button class="btn btn-outline-secondary btn-sm" @click="clearSelection">
            <i class="bi bi-x me-1"></i>選択解除
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 承認リストテーブル
```html
<div class="approval-list card">
  <div class="card-header">
    <h5 class="card-title mb-0">承認管理</h5>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th scope="col" x-show="$store.approvalManagement.bulkActionMode">
              <input type="checkbox" class="form-check-input" 
                     @change="toggleAllSelection" 
                     :checked="allItemsSelected">
            </th>
            <th scope="col">技術者</th>
            <th scope="col">対象期間</th>
            <th scope="col">労働時間</th>
            <th scope="col">承認段階</th>
            <th scope="col">期限</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <template x-for="approval in $store.approvalManagement.filteredApprovals" :key="approval.id">
            <tr :class="approval.isOverdue ? 'table-danger' : ''">
              <td x-show="$store.approvalManagement.bulkActionMode">
                <input type="checkbox" class="form-check-input" 
                       :value="approval.id"
                       x-model="$store.approvalManagement.selectedItems">
              </td>
              
              <td>
                <div class="d-flex align-items-center">
                  <img :src="approval.engineer.avatar" 
                       class="rounded-circle me-2" width="32" height="32">
                  <div>
                    <div class="fw-medium" x-text="approval.engineer.name"></div>
                    <small class="text-muted" x-text="approval.engineer.email"></small>
                  </div>
                </div>
              </td>
              
              <td>
                <div class="fw-medium" x-text="approval.period"></div>
                <small class="text-muted" x-text="approval.workDays + '日間'"></small>
              </td>
              
              <td>
                <div class="d-flex flex-column">
                  <span class="badge bg-primary mb-1" x-text="approval.totalHours + 'h'">総時間</span>
                  <span class="badge bg-warning" 
                        x-show="approval.overtimeHours > 0"
                        x-text="approval.overtimeHours + 'h 残業'"></span>
                </div>
              </td>
              
              <td>
                <div class="approval-flow">
                  <div class="d-flex align-items-center">
                    <template x-for="(step, index) in approval.approvalSteps" :key="index">
                      <div class="approval-step">
                        <div class="step-icon" 
                             :class="getStepIconClass(step.status)">
                          <i :class="getStepIcon(step.status)"></i>
                        </div>
                        <div class="step-label" x-text="step.roleName"></div>
                        <div class="step-connector" x-show="index < approval.approvalSteps.length - 1"></div>
                      </div>
                    </template>
                  </div>
                </div>
              </td>
              
              <td>
                <div class="deadline" 
                     :class="approval.isOverdue ? 'text-danger fw-bold' : approval.isNearDeadline ? 'text-warning' : 'text-muted'">
                  <i class="bi bi-clock me-1"></i>
                  <span x-text="formatDeadline(approval.deadline)"></span>
                </div>
                <small class="d-block" x-text="approval.deadlineRemaining"></small>
              </td>
              
              <td>
                <span class="badge" 
                      :class="getStatusClass(approval.status)"
                      x-text="getStatusText(approval.status)"></span>
              </td>
              
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary" 
                          @click="viewDetails(approval.id)"
                          :title="`${approval.engineer.name}の勤怠詳細を確認`">
                    <i class="bi bi-eye"></i>
                  </button>
                  
                  <button class="btn btn-success" 
                          x-show="approval.canApprove"
                          @click="approveTimesheet(approval.id)"
                          :title="`${approval.engineer.name}の勤怠を承認`">
                    <i class="bi bi-check"></i>
                  </button>
                  
                  <button class="btn btn-warning" 
                          x-show="approval.canReject"
                          @click="rejectTimesheet(approval.id)"
                          :title="`${approval.engineer.name}の勤怠を差し戻し`">
                    <i class="bi bi-x"></i>
                  </button>
                  
                  <button class="btn btn-outline-secondary" 
                          @click="viewHistory(approval.id)"
                          :title="承認履歴を確認">
                    <i class="bi bi-clock-history"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

#### 詳細確認モーダル
```html
<div class="modal fade" id="approvalDetailsModal" tabindex="-1">
  <div class="modal-dialog modal-xl">
    <div class="modal-content" x-data="approvalDetails">
      <div class="modal-header">
        <h5 class="modal-title">
          <span x-text="timesheet.engineer.name"></span> さんの勤怠詳細
          <span class="badge bg-secondary ms-2" x-text="timesheet.period"></span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      
      <div class="modal-body">
        <!-- 勤怠サマリー -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h5 class="card-title text-primary" x-text="timesheet.summary.totalHours + 'h'"></h5>
                <p class="card-text">総労働時間</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h5 class="card-title text-warning" x-text="timesheet.summary.overtimeHours + 'h'"></h5>
                <p class="card-text">残業時間</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h5 class="card-title text-success" x-text="timesheet.summary.workDays"></h5>
                <p class="card-text">出勤日数</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card bg-light">
              <div class="card-body text-center">
                <h5 class="card-title text-info" x-text="timesheet.summary.vacationDays"></h5>
                <p class="card-text">有給取得</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 日次データテーブル -->
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>日付</th>
                <th>勤務タイプ</th>
                <th>開始時刻</th>
                <th>終了時刻</th>
                <th>休憩時間</th>
                <th>労働時間</th>
                <th>勤務場所</th>
                <th>コメント</th>
              </tr>
            </thead>
            <tbody>
              <template x-for="day in timesheet.dailyRecords" :key="day.date">
                <tr :class="day.isHoliday ? 'table-light' : ''">
                  <td x-text="formatDate(day.date)"></td>
                  <td>
                    <span class="badge" 
                          :class="getAttendanceTypeClass(day.type)"
                          x-text="getAttendanceTypeText(day.type)"></span>
                  </td>
                  <td x-text="day.startTime || '-'"></td>
                  <td x-text="day.endTime || '-'"></td>
                  <td x-text="day.breakHours ? day.breakHours + 'h' : '-'"></td>
                  <td>
                    <span x-show="day.workHours" 
                          :class="day.workHours > 8 ? 'text-warning fw-bold' : ''"
                          x-text="day.workHours + 'h'"></span>
                  </td>
                  <td>
                    <span x-show="day.workLocation" 
                          class="badge bg-secondary"
                          x-text="getWorkLocationText(day.workLocation)"></span>
                  </td>
                  <td>
                    <small x-text="day.comment || '-'"></small>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        
        <!-- 承認コメント -->
        <div class="mt-4">
          <label for="approvalComment" class="form-label">承認コメント</label>
          <textarea class="form-control" id="approvalComment" rows="3" 
                    x-model="approvalComment"
                    placeholder="承認時のコメントや注意事項があれば入力してください"></textarea>
        </div>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
          閉じる
        </button>
        <button type="button" class="btn btn-warning me-2" 
                @click="rejectWithComment"
                x-show="timesheet.canReject">
          <i class="bi bi-x-circle me-1"></i>差し戻し
        </button>
        <button type="button" class="btn btn-success" 
                @click="approveWithComment"
                x-show="timesheet.canApprove">
          <i class="bi bi-check-circle me-1"></i>承認
        </button>
      </div>
    </div>
  </div>
</div>
```

#### 承認履歴モーダル
```html
<div class="modal fade" id="approvalHistoryModal" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">承認履歴</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div class="timeline" x-data="{ history: [] }">
          <template x-for="entry in history" :key="entry.id">
            <div class="timeline-item">
              <div class="timeline-marker" :class="getHistoryMarkerClass(entry.action)">
                <i :class="getHistoryIcon(entry.action)"></i>
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <h6 x-text="getHistoryActionText(entry.action)"></h6>
                  <small class="text-muted" x-text="formatDateTime(entry.timestamp)"></small>
                </div>
                <div class="timeline-body">
                  <p><strong x-text="entry.approver.name"></strong> by <span x-text="entry.approver.role"></span></p>
                  <p x-show="entry.comment" class="mb-0" x-text="entry.comment"></p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</div>
```

### 4. データ構造

#### ApprovalItem モデル
```typescript
interface ApprovalItem {
  id: string;
  timesheetId: string;
  engineer: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
  period: string;
  workDays: number;
  totalHours: number;
  overtimeHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentStep: number;
  approvalSteps: ApprovalStep[];
  deadline: string;
  isOverdue: boolean;
  isNearDeadline: boolean;
  canApprove: boolean;
  canReject: boolean;
  submittedAt: string;
}

interface ApprovalStep {
  stepNumber: number;
  roleName: string;
  approverName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedAt?: string;
  comment?: string;
}
```

### 5. 主要機能

#### 承認処理
```javascript
async function approveTimesheet(timesheetId, comment = '') {
  try {
    const response = await fetch(`/api/v1/timesheets/${timesheetId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment })
    });
    
    if (response.ok) {
      this.showSuccess('承認処理が完了しました');
      this.refreshApprovalList();
      this.sendNotification(timesheetId, 'APPROVED');
    } else {
      throw new Error('承認処理に失敗しました');
    }
  } catch (error) {
    this.showError(error.message);
  }
}
```

#### 一括承認
```javascript
async function bulkApprove() {
  const selectedIds = this.$store.approvalManagement.selectedItems;
  
  if (selectedIds.length === 0) {
    this.showWarning('承認する項目を選択してください');
    return;
  }
  
  const confirmed = await this.showConfirmDialog(
    `${selectedIds.length}件の勤怠を一括承認しますか？`
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/v1/timesheets/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timesheetIds: selectedIds })
    });
    
    if (response.ok) {
      this.showSuccess(`${selectedIds.length}件の承認処理が完了しました`);
      this.clearSelection();
      this.refreshApprovalList();
    }
  } catch (error) {
    this.showError('一括承認処理に失敗しました');
  }
}
```

### 6. バリデーション

#### 承認権限チェック
- **承認段階**: 現在の承認段階での権限確認
- **期限チェック**: 承認期限内の処理確認
- **重複処理防止**: 既に承認済みの項目の再処理防止

### 7. API連携

#### 承認管理API
```yaml
# 承認待ちリスト取得
GET /api/v1/approvals/pending
Response: ApprovalItem[]

# 承認処理
POST /api/v1/timesheets/{id}/approve
Request: { comment?: string }

# 差し戻し処理
POST /api/v1/timesheets/{id}/reject
Request: { comment: string }

# 一括承認
POST /api/v1/timesheets/bulk-approve
Request: { timesheetIds: string[] }
```

### 8. エラーハンドリング

#### 承認処理エラー
```html
<div class="alert alert-danger" x-show="errors.approval">
  <i class="bi bi-exclamation-triangle me-2"></i>
  <strong>承認処理エラー:</strong>
  <span x-text="errors.approval.message"></span>
  <button class="btn btn-link p-0 ms-2" @click="retryApproval">再試行</button>
</div>
```

### 9. アクセシビリティ

#### 承認状況の音声読み上げ
```html
<div class="approval-step" 
     :aria-label="`承認段階${step.stepNumber}: ${step.roleName} - ${step.status}`">
</div>
```

### 10. レスポンシブ対応

#### モバイル承認インターface
```css
@media (max-width: 768px) {
  .approval-list .table-responsive {
    font-size: 0.875rem;
  }
  
  .btn-group-sm .btn {
    padding: 0.375rem 0.5rem;
  }
  
  .approval-flow {
    flex-direction: column;
  }
}
```

---

## 残業・有給申請画面

### 1. 画面概要

#### 目的
残業・有給・特別休暇等の各種申請処理と承認ワークフロー管理

#### 主要機能
- 多種類申請対応（残業・有給・特別休暇）
- カレンダー連携による日程選択
- 残高管理・利用状況表示
- 申請承認ワークフロー
- 緊急連絡先・代理担当者設定
- 申請履歴管理

### 2. 技術仕様

#### Alpine.js 申請フォーム
```javascript
Alpine.data('applicationForm', () => ({
  form: {
    type: 'OVERTIME', // OVERTIME, VACATION, SPECIAL_LEAVE
    startDate: '',
    endDate: '',
    duration: 'FULL_DAY', // FULL_DAY, HALF_DAY, HOURLY
    startTime: '',
    endTime: '',
    reason: '',
    emergencyContact: '',
    delegateEngineerId: ''
  },
  vacationBalance: 0,
  availableDates: [],
  
  init() {
    this.loadVacationBalance();
    this.loadAvailableDates();
  }
}));
```

### 3. 画面構成要素

#### 申請タイプ選択
```html
<div class="application-type-selector card mb-4">
  <div class="card-header">
    <h5 class="card-title mb-0">申請タイプ</h5>
  </div>
  <div class="card-body">
    <div class="row">
      <div class="col-md-4 mb-3">
        <div class="card application-type-card h-100" 
             :class="form.type === 'OVERTIME' ? 'border-primary' : ''"
             @click="selectApplicationType('OVERTIME')">
          <div class="card-body text-center">
            <div class="application-icon bg-warning text-white rounded-circle mx-auto mb-3">
              <i class="bi bi-clock-history"></i>
            </div>
            <h6 class="card-title">残業申請</h6>
            <p class="card-text text-muted">事前・事後・緊急残業の申請</p>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card application-type-card h-100" 
             :class="form.type === 'VACATION' ? 'border-primary' : ''"
             @click="selectApplicationType('VACATION')">
          <div class="card-body text-center">
            <div class="application-icon bg-success text-white rounded-circle mx-auto mb-3">
              <i class="bi bi-calendar-minus"></i>
            </div>
            <h6 class="card-title">有給休暇</h6>
            <p class="card-text text-muted">年次有給・時間単位有給</p>
            <small class="text-success">残り: <span x-text="vacationBalance + '日'"></span></small>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card application-type-card h-100" 
             :class="form.type === 'SPECIAL_LEAVE' ? 'border-primary' : ''"
             @click="selectApplicationType('SPECIAL_LEAVE')">
          <div class="card-body text-center">
            <div class="application-icon bg-info text-white rounded-circle mx-auto mb-3">
              <i class="bi bi-calendar-heart"></i>
            </div>
            <h6 class="card-title">特別休暇</h6>
            <p class="card-text text-muted">病気・慶弔・産育休等</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 残業申請フォーム
```html
<div class="application-form card" x-show="form.type === 'OVERTIME'">
  <div class="card-header">
    <h5 class="card-title mb-0">
      <i class="bi bi-clock-history me-2"></i>残業申請
    </h5>
  </div>
  <div class="card-body">
    <form @submit.prevent="submitApplication">
      <!-- 残業タイプ -->
      <div class="mb-3">
        <label class="form-label">残業タイプ <span class="text-danger">*</span></label>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" name="overtimeType" 
                 id="advance" value="ADVANCE" x-model="form.overtimeType">
          <label class="btn btn-outline-primary" for="advance">事前申請</label>
          
          <input type="radio" class="btn-check" name="overtimeType" 
                 id="after" value="AFTER" x-model="form.overtimeType">
          <label class="btn btn-outline-warning" for="after">事後申請</label>
          
          <input type="radio" class="btn-check" name="overtimeType" 
                 id="emergency" value="EMERGENCY" x-model="form.overtimeType">
          <label class="btn btn-outline-danger" for="emergency">緊急申請</label>
        </div>
      </div>
      
      <!-- 対象日時 -->
      <div class="row mb-3">
        <div class="col-md-4">
          <label for="overtimeDate" class="form-label">対象日 <span class="text-danger">*</span></label>
          <input type="date" class="form-control" id="overtimeDate" 
                 x-model="form.startDate" required>
        </div>
        <div class="col-md-4">
          <label for="overtimeStartTime" class="form-label">開始時刻 <span class="text-danger">*</span></label>
          <input type="time" class="form-control" id="overtimeStartTime" 
                 x-model="form.startTime" required>
        </div>
        <div class="col-md-4">
          <label for="overtimeEndTime" class="form-label">終了予定時刻 <span class="text-danger">*</span></label>
          <input type="time" class="form-control" id="overtimeEndTime" 
                 x-model="form.endTime" required>
        </div>
      </div>
      
      <!-- 予想残業時間表示 -->
      <div class="alert alert-info" x-show="form.startTime && form.endTime">
        <div class="row text-center">
          <div class="col-4">
            <strong>予想残業時間</strong><br>
            <span class="h5" x-text="calculateOvertimeHours() + 'h'"></span>
          </div>
          <div class="col-4">
            <strong>深夜残業</strong><br>
            <span class="h5" x-text="calculateNightHours() + 'h'"></span>
          </div>
          <div class="col-4">
            <strong>今月累計</strong><br>
            <span class="h5" x-text="monthlyOvertimeTotal + 'h'"></span>
          </div>
        </div>
      </div>
      
      <!-- 残業理由 -->
      <div class="mb-3">
        <label for="overtimeReason" class="form-label">残業理由 <span class="text-danger">*</span></label>
        <textarea class="form-control" id="overtimeReason" rows="3" 
                  x-model="form.reason" required
                  placeholder="残業が必要な理由を詳しく記載してください"></textarea>
      </div>
      
      <!-- 緊急連絡先 -->
      <div class="mb-3">
        <label for="emergencyContact" class="form-label">緊急連絡先</label>
        <input type="tel" class="form-control" id="emergencyContact" 
               x-model="form.emergencyContact"
               placeholder="緊急時の連絡先（携帯電話番号等）">
      </div>
    </form>
  </div>
</div>
```

#### 有給申請フォーム
```html
<div class="application-form card" x-show="form.type === 'VACATION'">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="card-title mb-0">
      <i class="bi bi-calendar-minus me-2"></i>有給休暇申請
    </h5>
    <div class="vacation-balance">
      <span class="badge bg-success">残り有給: <span x-text="vacationBalance + '日'"></span></span>
    </div>
  </div>
  <div class="card-body">
    <form @submit.prevent="submitApplication">
      <!-- 取得タイプ -->
      <div class="mb-3">
        <label class="form-label">取得タイプ <span class="text-danger">*</span></label>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" name="vacationType" 
                 id="fullDay" value="FULL_DAY" x-model="form.duration">
          <label class="btn btn-outline-primary" for="fullDay">全日</label>
          
          <input type="radio" class="btn-check" name="vacationType" 
                 id="halfDay" value="HALF_DAY" x-model="form.duration">
          <label class="btn btn-outline-primary" for="halfDay">半日</label>
          
          <input type="radio" class="btn-check" name="vacationType" 
                 id="hourly" value="HOURLY" x-model="form.duration">
          <label class="btn btn-outline-primary" for="hourly">時間単位</label>
        </div>
      </div>
      
      <!-- 取得期間 -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="vacationStartDate" class="form-label">開始日 <span class="text-danger">*</span></label>
          <input type="date" class="form-control" id="vacationStartDate" 
                 x-model="form.startDate" 
                 :min="getMinDate()"
                 required>
        </div>
        <div class="col-md-6" x-show="form.duration === 'FULL_DAY'">
          <label for="vacationEndDate" class="form-label">終了日</label>
          <input type="date" class="form-control" id="vacationEndDate" 
                 x-model="form.endDate"
                 :min="form.startDate">
        </div>
      </div>
      
      <!-- 半日・時間単位の詳細 -->
      <div x-show="form.duration === 'HALF_DAY'" class="mb-3">
        <label class="form-label">半日タイプ</label>
        <div class="btn-group w-100" role="group">
          <input type="radio" class="btn-check" name="halfDayType" 
                 id="morning" value="MORNING" x-model="form.halfDayType">
          <label class="btn btn-outline-secondary" for="morning">午前休</label>
          
          <input type="radio" class="btn-check" name="halfDayType" 
                 id="afternoon" value="AFTERNOON" x-model="form.halfDayType">
          <label class="btn btn-outline-secondary" for="afternoon">午後休</label>
        </div>
      </div>
      
      <div x-show="form.duration === 'HOURLY'" class="row mb-3">
        <div class="col-md-6">
          <label for="hourlyStartTime" class="form-label">開始時刻</label>
          <input type="time" class="form-control" id="hourlyStartTime" 
                 x-model="form.startTime">
        </div>
        <div class="col-md-6">
          <label for="hourlyEndTime" class="form-label">終了時刻</label>
          <input type="time" class="form-control" id="hourlyEndTime" 
                 x-model="form.endTime">
        </div>
      </div>
      
      <!-- 消化日数計算 -->
      <div class="alert alert-info">
        <div class="row text-center">
          <div class="col-4">
            <strong>消化日数</strong><br>
            <span class="h5" x-text="calculateVacationDays() + '日'"></span>
          </div>
          <div class="col-4">
            <strong>取得後残日数</strong><br>
            <span class="h5" x-text="(vacationBalance - calculateVacationDays()) + '日'"></span>
          </div>
          <div class="col-4">
            <strong>今年度取得済み</strong><br>
            <span class="h5" x-text="yearlyVacationUsed + '日'"></span>
          </div>
        </div>
      </div>
      
      <!-- 取得理由 -->
      <div class="mb-3">
        <label for="vacationReason" class="form-label">取得理由</label>
        <textarea class="form-control" id="vacationReason" rows="3" 
                  x-model="form.reason"
                  placeholder="有給取得の理由（任意）"></textarea>
      </div>
      
      <!-- 代理担当者 -->
      <div class="mb-3">
        <label for="delegateEngineer" class="form-label">代理担当者</label>
        <select class="form-select" id="delegateEngineer" x-model="form.delegateEngineerId">
          <option value="">選択してください</option>
          <template x-for="engineer in teamMembers" :key="engineer.id">
            <option :value="engineer.id" x-text="engineer.name"></option>
          </template>
        </select>
        <div class="form-text">休暇中の業務を代理で対応する担当者を選択してください</div>
      </div>
    </form>
  </div>
</div>
```

#### 特別休暇申請フォーム
```html
<div class="application-form card" x-show="form.type === 'SPECIAL_LEAVE'">
  <div class="card-header">
    <h5 class="card-title mb-0">
      <i class="bi bi-calendar-heart me-2"></i>特別休暇申請
    </h5>
  </div>
  <div class="card-body">
    <form @submit.prevent="submitApplication">
      <!-- 特別休暇タイプ -->
      <div class="mb-3">
        <label for="specialLeaveType" class="form-label">特別休暇タイプ <span class="text-danger">*</span></label>
        <select class="form-select" id="specialLeaveType" x-model="form.specialLeaveType" required>
          <option value="">選択してください</option>
          <option value="SICK">病気休暇</option>
          <option value="BEREAVEMENT">忌引休暇</option>
          <option value="MATERNITY">産前産後休暇</option>
          <option value="PATERNITY">育児休暇</option>
          <option value="CAREGIVING">介護休暇</option>
          <option value="DISASTER">災害休暇</option>
          <option value="OTHER">その他</option>
        </select>
      </div>
      
      <!-- その他の場合の詳細 -->
      <div x-show="form.specialLeaveType === 'OTHER'" class="mb-3">
        <label for="otherLeaveDetail" class="form-label">詳細内容 <span class="text-danger">*</span></label>
        <input type="text" class="form-control" id="otherLeaveDetail" 
               x-model="form.otherLeaveDetail"
               placeholder="特別休暇の詳細内容を入力してください">
      </div>
      
      <!-- 取得期間 -->
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="specialStartDate" class="form-label">開始日 <span class="text-danger">*</span></label>
          <input type="date" class="form-control" id="specialStartDate" 
                 x-model="form.startDate" required>
        </div>
        <div class="col-md-6">
          <label for="specialEndDate" class="form-label">終了日</label>
          <input type="date" class="form-control" id="specialEndDate" 
                 x-model="form.endDate"
                 :min="form.startDate">
        </div>
      </div>
      
      <!-- 申請理由 -->
      <div class="mb-3">
        <label for="specialReason" class="form-label">申請理由 <span class="text-danger">*</span></label>
        <textarea class="form-control" id="specialReason" rows="4" 
                  x-model="form.reason" required
                  placeholder="特別休暇が必要な理由を詳しく記載してください"></textarea>
      </div>
      
      <!-- 添付書類 -->
      <div class="mb-3">
        <label for="attachments" class="form-label">添付書類</label>
        <input type="file" class="form-control" id="attachments" 
               multiple accept=".pdf,.jpg,.jpeg,.png"
               @change="handleFileUpload">
        <div class="form-text">
          医師の診断書、死亡証明書等の必要書類がある場合は添付してください
        </div>
        
        <!-- アップロード済みファイル一覧 -->
        <div class="uploaded-files mt-2" x-show="uploadedFiles.length > 0">
          <template x-for="file in uploadedFiles" :key="file.id">
            <div class="d-flex align-items-center justify-content-between border rounded p-2 mb-1">
              <div class="d-flex align-items-center">
                <i class="bi bi-file-earmark me-2"></i>
                <span x-text="file.name"></span>
                <small class="text-muted ms-2" x-text="formatFileSize(file.size)"></small>
              </div>
              <button type="button" class="btn btn-sm btn-outline-danger" 
                      @click="removeFile(file.id)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </template>
        </div>
      </div>
    </form>
  </div>
</div>
```

#### 申請確認・送信
```html
<div class="application-submit card mt-4">
  <div class="card-header">
    <h5 class="card-title mb-0">申請内容確認</h5>
  </div>
  <div class="card-body">
    <!-- 申請内容サマリー -->
    <div class="application-summary bg-light p-3 rounded mb-3">
      <div class="row">
        <div class="col-md-6">
          <strong>申請タイプ:</strong> <span x-text="getApplicationTypeText(form.type)"></span><br>
          <strong>対象期間:</strong> <span x-text="getFormattedPeriod()"></span><br>
          <strong x-show="form.duration">取得タイプ:</strong> <span x-show="form.duration" x-text="getDurationText(form.duration)"></span>
        </div>
        <div class="col-md-6">
          <strong>申請日:</strong> <span x-text="formatDate(new Date())"></span><br>
          <strong>申請者:</strong> <span x-text="currentUser.name"></span><br>
          <strong>所属:</strong> <span x-text="currentUser.department"></span>
        </div>
      </div>
    </div>
    
    <!-- 承認フロー表示 -->
    <div class="approval-flow-preview mb-3">
      <h6>承認フロー</h6>
      <div class="d-flex align-items-center">
        <template x-for="(step, index) in approvalFlow" :key="index">
          <div class="approval-step-preview">
            <div class="step-icon bg-secondary text-white">
              <span x-text="index + 1"></span>
            </div>
            <div class="step-label" x-text="step.roleName"></div>
            <div class="step-approver text-muted" x-text="step.approverName"></div>
            <div class="step-connector" x-show="index < approvalFlow.length - 1">
              <i class="bi bi-arrow-right"></i>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- 注意事項 -->
    <div class="alert alert-warning">
      <h6><i class="bi bi-exclamation-triangle me-2"></i>申請時の注意事項</h6>
      <ul class="mb-0">
        <li>申請後の内容変更は承認者との相談が必要です</li>
        <li>緊急申請の場合は、事前に上長への連絡をお願いします</li>
        <li>承認完了までメールで通知されます</li>
        <li x-show="form.type === 'VACATION'">有給取得は原則として3日前までの申請をお願いします</li>
      </ul>
    </div>
    
    <!-- 送信ボタン -->
    <div class="d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" @click="resetForm">
        <i class="bi bi-arrow-clockwise me-1"></i>リセット
      </button>
      <button type="button" class="btn btn-secondary" @click="saveDraft">
        <i class="bi bi-save me-1"></i>下書き保存
      </button>
      <button type="button" class="btn btn-primary" 
              @click="submitApplication"
              :disabled="!isFormValid()">
        <i class="bi bi-send me-1"></i>申請送信
      </button>
    </div>
  </div>
</div>
```

#### 申請履歴テーブル
```html
<div class="application-history card mt-4">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h5 class="card-title mb-0">申請履歴</h5>
    <div class="history-filter">
      <select class="form-select form-select-sm" x-model="historyFilter">
        <option value="all">すべて</option>
        <option value="pending">承認待ち</option>
        <option value="approved">承認済み</option>
        <option value="rejected">却下</option>
      </select>
    </div>
  </div>
  <div class="card-body p-0">
    <div class="table-responsive">
      <table class="table table-hover mb-0">
        <thead class="table-light">
          <tr>
            <th scope="col">申請日</th>
            <th scope="col">タイプ</th>
            <th scope="col">対象期間</th>
            <th scope="col">内容</th>
            <th scope="col">状態</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <template x-for="history in filteredHistory" :key="history.id">
            <tr>
              <td x-text="formatDate(history.submittedAt)"></td>
              <td>
                <span class="badge" 
                      :class="getApplicationTypeBadgeClass(history.type)"
                      x-text="getApplicationTypeText(history.type)"></span>
              </td>
              <td x-text="formatPeriod(history.startDate, history.endDate)"></td>
              <td>
                <div x-text="history.reason" class="text-truncate" style="max-width: 200px;"></div>
              </td>
              <td>
                <span class="badge" 
                      :class="getStatusBadgeClass(history.status)"
                      x-text="getStatusText(history.status)"></span>
              </td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary" 
                          @click="viewApplicationDetail(history.id)">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-outline-warning" 
                          x-show="history.canEdit"
                          @click="editApplication(history.id)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-outline-danger" 
                          x-show="history.canCancel"
                          @click="cancelApplication(history.id)">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### 4. データ構造

#### Application モデル
```typescript
interface Application {
  id: string;
  type: 'OVERTIME' | 'VACATION' | 'SPECIAL_LEAVE';
  engineerId: string;
  startDate: string;
  endDate?: string;
  duration?: 'FULL_DAY' | 'HALF_DAY' | 'HOURLY';
  startTime?: string;
  endTime?: string;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  attachments?: FileAttachment[];
  submittedAt?: string;
  approvedAt?: string;
  approver?: string;
  approvalComment?: string;
}
```

### 5. 主要機能

#### 有給残日数計算
```javascript
function calculateVacationDays() {
  if (this.form.duration === 'FULL_DAY') {
    if (this.form.endDate) {
      const start = new Date(this.form.startDate);
      const end = new Date(this.form.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 1;
  } else if (this.form.duration === 'HALF_DAY') {
    return 0.5;
  } else if (this.form.duration === 'HOURLY') {
    const start = parseTime(this.form.startTime);
    const end = parseTime(this.form.endTime);
    const hours = (end - start) / 60;
    return Math.round((hours / 8) * 10) / 10; // 8時間=1日として計算
  }
  return 0;
}
```

#### 申請送信
```javascript
async function submitApplication() {
  try {
    const response = await fetch('/api/v1/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.form)
    });
    
    if (response.ok) {
      this.showSuccess('申請を送信しました');
      this.resetForm();
      this.loadApplicationHistory();
    } else {
      throw new Error('申請の送信に失敗しました');
    }
  } catch (error) {
    this.showError(error.message);
  }
}
```

### 6. バリデーション

#### 申請バリデーション
- **有給残日数**: 申請日数が残日数を超えていないか
- **日付妥当性**: 開始日 ≤ 終了日、過去日の制限
- **重複申請**: 同一期間での重複申請チェック
- **必須項目**: 申請タイプに応じた必須項目チェック

### 7. API連携

#### 申請API
```yaml
# 申請送信
POST /api/v1/applications
Request: Application
Response: Application

# 申請履歴取得
GET /api/v1/applications/history
Response: Application[]

# 有給残日数取得
GET /api/v1/vacation/balance
Response: { balance: number, used: number, total: number }
```

### 8. エラーハンドリング

#### 申請エラー
```html
<div class="alert alert-danger" x-show="errors.application">
  <i class="bi bi-exclamation-triangle me-2"></i>
  <strong>申請エラー:</strong>
  <span x-text="errors.application.message"></span>
</div>
```

### 9. アクセシビリティ

#### フォームのアクセシビリティ
```html
<label for="vacationStartDate" class="form-label">
  開始日 <span class="text-danger" aria-label="必須">*</span>
</label>
<input type="date" class="form-control" id="vacationStartDate" 
       aria-describedby="startDateHelp" required>
<div id="startDateHelp" class="form-text">
  有給取得の開始日を選択してください
</div>
```

### 10. レスポンシブ対応

#### モバイル申請フォーム
```css
@media (max-width: 768px) {
  .application-type-card {
    margin-bottom: 1rem;
  }
  
  .btn-group.w-100 .btn {
    font-size: 0.875rem;
    padding: 0.5rem;
  }
  
  .application-icon {
    width: 60px;
    height: 60px;
  }
}
```

---

## 更新履歴

| バージョン | 更新日 | 更新内容 |
|------------|--------|----------|
| 1.0.0 | 2025/06/02 | 初版作成 |

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月2日  
**承認者**: [承認者名]  
**次回レビュー**: 2025年7月2日