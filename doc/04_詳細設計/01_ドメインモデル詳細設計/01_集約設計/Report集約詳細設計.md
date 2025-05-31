# Report集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 統計データの集約・分析・レポート生成
- KPI管理とダッシュボード情報の提供
- 経営指標の管理とトレンド分析
- CQRSパターンによる読み取り専用モデルの管理

### 1.2 境界
- **含むもの**: AnalyticsData（集約ルート）、KPI、Dashboard、ReportTemplate
- **含まないもの**: 元データの詳細情報、リアルタイムデータ、業務ロジック

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 AnalyticsData（集約ルート）

```java
@Entity
@Table(name = "analytics_data")
public class AnalyticsData {
    // === 識別子 ===
    @Id
    private AnalyticsDataId id;
    
    // === 基本情報 ===
    private AnalyticsCategory category;    // カテゴリ（売上/マッチング/労働時間など）
    private AnalyticsType type;            // タイプ（日次/月次/年次）
    private LocalDate targetDate;          // 対象日
    private YearMonth targetPeriod;        // 対象月
    
    // === メトリクスデータ ===
    private Map<String, Object> metrics;   // 指標データ
    private Map<String, BigDecimal> numericValues; // 数値データ
    private Map<String, String> textValues;        // テキストデータ
    
    // === 集計レベル ===
    private AggregationLevel aggregationLevel;  // 集計レベル
    private String aggregationKey;              // 集計キー
    
    // === 状態管理 ===
    private AnalyticsStatus status;
    private LocalDateTime calculatedAt;
    private LocalDateTime lastUpdatedAt;
    
    // === バージョン管理 ===
    private int version;
    private boolean isLatest;
    
    // === ビジネスルール ===
    
    /**
     * 日次統計データの作成
     */
    public static AnalyticsData createDailyData(
            AnalyticsCategory category,
            LocalDate targetDate,
            Map<String, Object> metrics) {
        
        AnalyticsData data = new AnalyticsData();
        data.id = AnalyticsDataId.generate();
        data.category = category;
        data.type = AnalyticsType.DAILY;
        data.targetDate = targetDate;
        data.targetPeriod = YearMonth.from(targetDate);
        data.metrics = new HashMap<>(metrics);
        data.numericValues = new HashMap<>();
        data.textValues = new HashMap<>();
        data.aggregationLevel = AggregationLevel.DAILY;
        data.aggregationKey = generateAggregationKey(category, targetDate);
        data.status = AnalyticsStatus.CALCULATED;
        data.calculatedAt = LocalDateTime.now();
        data.lastUpdatedAt = LocalDateTime.now();
        data.version = 1;
        data.isLatest = true;
        
        // メトリクスデータの分類
        data.categorizeMetrics(metrics);
        
        return data;
    }
    
    /**
     * 月次統計データの作成
     */
    public static AnalyticsData createMonthlyData(
            AnalyticsCategory category,
            YearMonth targetPeriod,
            Map<String, Object> metrics) {
        
        AnalyticsData data = new AnalyticsData();
        data.id = AnalyticsDataId.generate();
        data.category = category;
        data.type = AnalyticsType.MONTHLY;
        data.targetDate = targetPeriod.atDay(1);
        data.targetPeriod = targetPeriod;
        data.metrics = new HashMap<>(metrics);
        data.numericValues = new HashMap<>();
        data.textValues = new HashMap<>();
        data.aggregationLevel = AggregationLevel.MONTHLY;
        data.aggregationKey = generateAggregationKey(category, targetPeriod);
        data.status = AnalyticsStatus.CALCULATED;
        data.calculatedAt = LocalDateTime.now();
        data.lastUpdatedAt = LocalDateTime.now();
        data.version = 1;
        data.isLatest = true;
        
        data.categorizeMetrics(metrics);
        
        return data;
    }
    
    /**
     * 集約データの作成（日次データから月次データを生成）
     */
    public static AnalyticsData aggregateFromDaily(
            AnalyticsCategory category,
            YearMonth targetPeriod,
            List<AnalyticsData> dailyData) {
        
        if (dailyData.isEmpty()) {
            throw new IllegalArgumentException("日次データが空です");
        }
        
        // 集約処理
        Map<String, Object> aggregatedMetrics = aggregateMetrics(dailyData);
        
        AnalyticsData monthlyData = createMonthlyData(category, targetPeriod, aggregatedMetrics);
        monthlyData.aggregationLevel = AggregationLevel.AGGREGATED;
        
        return monthlyData;
    }
    
    /**
     * データの更新
     */
    public void updateMetrics(Map<String, Object> newMetrics) {
        if (this.status == AnalyticsStatus.ARCHIVED) {
            throw new BusinessRuleViolationException("アーカイブ済みデータは更新できません");
        }
        
        // 旧バージョンの作成
        if (this.isLatest) {
            createPreviousVersion();
        }
        
        // 新データの設定
        this.metrics = new HashMap<>(newMetrics);
        this.categorizeMetrics(newMetrics);
        this.version++;
        this.lastUpdatedAt = LocalDateTime.now();
        this.isLatest = true;
        
        // 更新イベント
        DomainEventPublisher.publish(new AnalyticsDataUpdated(
            this.id, this.category, this.targetPeriod));
    }
    
    /**
     * データのアーカイブ
     */
    public void archive() {
        if (this.status == AnalyticsStatus.ARCHIVED) {
            throw new BusinessRuleViolationException("既にアーカイブ済みです");
        }
        
        this.status = AnalyticsStatus.ARCHIVED;
        this.isLatest = false;
        this.lastUpdatedAt = LocalDateTime.now();
        
        // アーカイブイベント
        DomainEventPublisher.publish(new AnalyticsDataArchived(
            this.id, this.category, this.targetPeriod));
    }
    
    /**
     * KPI計算
     */
    public KPIValue calculateKPI(KPIDefinition kpiDefinition) {
        String formula = kpiDefinition.getFormula();
        
        // 簡単なKPI計算ロジック（実際はもっと複雑な式パーサーが必要）
        BigDecimal result = evaluateFormula(formula);
        
        return new KPIValue(
            kpiDefinition.getId(),
            kpiDefinition.getName(),
            result,
            this.targetPeriod,
            LocalDateTime.now()
        );
    }
    
    /**
     * トレンド分析
     */
    public TrendAnalysis analyzeTrend(List<AnalyticsData> historicalData, String metricKey) {
        if (historicalData.size() < 2) {
            return TrendAnalysis.insufficient();
        }
        
        List<BigDecimal> values = historicalData.stream()
            .map(data -> data.getNumericValue(metricKey))
            .filter(Objects::nonNull)
            .collect(toList());
            
        if (values.size() < 2) {
            return TrendAnalysis.insufficient();
        }
        
        // 簡単なトレンド分析（前月比など）
        BigDecimal current = values.get(values.size() - 1);
        BigDecimal previous = values.get(values.size() - 2);
        
        BigDecimal changeRate = current.subtract(previous)
            .divide(previous, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));
            
        TrendDirection direction = determineTrendDirection(changeRate);
        
        return new TrendAnalysis(
            metricKey,
            current,
            previous,
            changeRate,
            direction,
            this.targetPeriod
        );
    }
    
    // === プライベートメソッド ===
    
    private void categorizeMetrics(Map<String, Object> metrics) {
        this.numericValues.clear();
        this.textValues.clear();
        
        for (Map.Entry<String, Object> entry : metrics.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            
            if (value instanceof Number) {
                this.numericValues.put(key, new BigDecimal(value.toString()));
            } else if (value instanceof String) {
                this.textValues.put(key, (String) value);
            }
        }
    }
    
    private static String generateAggregationKey(AnalyticsCategory category, LocalDate date) {
        return String.format("%s_%s", category.name(), date.toString());
    }
    
    private static String generateAggregationKey(AnalyticsCategory category, YearMonth period) {
        return String.format("%s_%s", category.name(), period.toString());
    }
    
    private static Map<String, Object> aggregateMetrics(List<AnalyticsData> dailyData) {
        Map<String, Object> aggregated = new HashMap<>();
        
        // 数値データの集約
        Map<String, BigDecimal> numericSums = new HashMap<>();
        Map<String, Integer> numericCounts = new HashMap<>();
        
        for (AnalyticsData data : dailyData) {
            for (Map.Entry<String, BigDecimal> entry : data.numericValues.entrySet()) {
                String key = entry.getKey();
                BigDecimal value = entry.getValue();
                
                numericSums.merge(key, value, BigDecimal::add);
                numericCounts.merge(key, 1, Integer::sum);
            }
        }
        
        // 合計、平均、最大、最小などの統計を計算
        for (String key : numericSums.keySet()) {
            BigDecimal sum = numericSums.get(key);
            Integer count = numericCounts.get(key);
            BigDecimal average = sum.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            
            aggregated.put(key + "_sum", sum);
            aggregated.put(key + "_avg", average);
            aggregated.put(key + "_count", count);
        }
        
        return aggregated;
    }
    
    private void createPreviousVersion() {
        // 現在のバージョンを非最新に設定
        this.isLatest = false;
        
        // 実際の実装では履歴テーブルに保存する
    }
    
    private BigDecimal evaluateFormula(String formula) {
        // 簡単な式評価器の実装
        // 実際はもっと複雑な式解析エンジンが必要
        return BigDecimal.ZERO;
    }
    
    private TrendDirection determineTrendDirection(BigDecimal changeRate) {
        if (changeRate.compareTo(BigDecimal.valueOf(5)) > 0) {
            return TrendDirection.INCREASING;
        } else if (changeRate.compareTo(BigDecimal.valueOf(-5)) < 0) {
            return TrendDirection.DECREASING;
        } else {
            return TrendDirection.STABLE;
        }
    }
    
    // === ゲッターメソッド ===
    
    public BigDecimal getNumericValue(String key) {
        return numericValues.get(key);
    }
    
    public String getTextValue(String key) {
        return textValues.get(key);
    }
    
    public boolean isUpToDate(Duration maxAge) {
        return this.lastUpdatedAt.isAfter(LocalDateTime.now().minus(maxAge));
    }
    
    public boolean isCurrentPeriod() {
        YearMonth currentPeriod = YearMonth.now();
        return this.targetPeriod.equals(currentPeriod);
    }
    
    public enum AnalyticsCategory {
        SALES("売上統計"),
        MATCHING("マッチング統計"),
        WORK_HOURS("労働時間統計"),
        PROJECT("案件統計"),
        ENGINEER("技術者統計"),
        CUSTOMER("顧客統計"),
        FINANCIAL("財務統計");
        
        private final String displayName;
        
        AnalyticsCategory(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum AnalyticsType {
        DAILY("日次"),
        WEEKLY("週次"),
        MONTHLY("月次"),
        QUARTERLY("四半期"),
        YEARLY("年次");
        
        private final String displayName;
        
        AnalyticsType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum AnalyticsStatus {
        CALCULATING("算出中"),
        CALCULATED("算出完了"),
        ARCHIVED("アーカイブ");
        
        private final String displayName;
        
        AnalyticsStatus(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum AggregationLevel {
        DAILY("日次"),
        MONTHLY("月次"),
        AGGREGATED("集約");
        
        private final String displayName;
        
        AggregationLevel(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.2 値オブジェクト設計

#### KPIValue（KPI値）
```java
@Embeddable
public class KPIValue {
    private KPIDefinitionId kpiDefinitionId;
    private String kpiName;
    private BigDecimal value;
    private YearMonth targetPeriod;
    private LocalDateTime calculatedAt;
    
    // 目標値との比較
    private BigDecimal targetValue;
    private BigDecimal achievementRate;
    private KPIStatus status;  // 達成/未達成/注意
    
    public KPIValue(KPIDefinitionId kpiDefinitionId,
                   String kpiName,
                   BigDecimal value,
                   YearMonth targetPeriod,
                   LocalDateTime calculatedAt) {
        this.kpiDefinitionId = kpiDefinitionId;
        this.kpiName = kpiName;
        this.value = value;
        this.targetPeriod = targetPeriod;
        this.calculatedAt = calculatedAt;
    }
    
    /**
     * 目標値の設定と達成率計算
     */
    public void setTarget(BigDecimal targetValue) {
        this.targetValue = targetValue;
        
        if (targetValue.compareTo(BigDecimal.ZERO) != 0) {
            this.achievementRate = this.value.divide(targetValue, 4, RoundingMode.HALF_UP)
                                             .multiply(BigDecimal.valueOf(100));
        } else {
            this.achievementRate = BigDecimal.ZERO;
        }
        
        // ステータス判定
        this.status = determineStatus();
    }
    
    /**
     * KPIステータスの判定
     */
    private KPIStatus determineStatus() {
        if (this.achievementRate == null) {
            return KPIStatus.UNKNOWN;
        }
        
        if (this.achievementRate.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return KPIStatus.ACHIEVED;
        } else if (this.achievementRate.compareTo(BigDecimal.valueOf(80)) >= 0) {
            return KPIStatus.WARNING;
        } else {
            return KPIStatus.NOT_ACHIEVED;
        }
    }
    
    /**
     * 前月比較
     */
    public KPIComparison compareWith(KPIValue previousValue) {
        if (previousValue == null) {
            return KPIComparison.noComparison();
        }
        
        BigDecimal changeAmount = this.value.subtract(previousValue.getValue());
        BigDecimal changeRate = changeAmount.divide(previousValue.getValue(), 4, RoundingMode.HALF_UP)
                                           .multiply(BigDecimal.valueOf(100));
        
        return new KPIComparison(
            this.kpiName,
            this.value,
            previousValue.getValue(),
            changeAmount,
            changeRate,
            this.targetPeriod,
            previousValue.getTargetPeriod()
        );
    }
    
    public enum KPIStatus {
        ACHIEVED("達成", "#4CAF50"),
        WARNING("注意", "#FF9800"),
        NOT_ACHIEVED("未達成", "#F44336"),
        UNKNOWN("不明", "#9E9E9E");
        
        private final String displayName;
        private final String colorCode;
        
        KPIStatus(String displayName, String colorCode) {
            this.displayName = displayName;
            this.colorCode = colorCode;
        }
    }
}
```

#### TrendAnalysis（トレンド分析）
```java
@Embeddable
public class TrendAnalysis {
    private String metricName;
    private BigDecimal currentValue;
    private BigDecimal previousValue;
    private BigDecimal changeAmount;
    private BigDecimal changeRate;
    private TrendDirection direction;
    private YearMonth currentPeriod;
    private YearMonth previousPeriod;
    
    private TrendSignificance significance;  // 変化の重要度
    private String trendDescription;         // トレンド説明
    
    public TrendAnalysis(String metricName,
                        BigDecimal currentValue,
                        BigDecimal previousValue,
                        BigDecimal changeRate,
                        TrendDirection direction,
                        YearMonth currentPeriod) {
        this.metricName = metricName;
        this.currentValue = currentValue;
        this.previousValue = previousValue;
        this.changeAmount = currentValue.subtract(previousValue);
        this.changeRate = changeRate;
        this.direction = direction;
        this.currentPeriod = currentPeriod;
        this.previousPeriod = currentPeriod.minusMonths(1);
        
        this.significance = determineSignificance();
        this.trendDescription = generateDescription();
    }
    
    /**
     * データ不足で分析不可の場合
     */
    public static TrendAnalysis insufficient() {
        TrendAnalysis analysis = new TrendAnalysis();
        analysis.significance = TrendSignificance.INSUFFICIENT_DATA;
        analysis.trendDescription = "分析に必要なデータが不足しています";
        return analysis;
    }
    
    /**
     * 変化の重要度判定
     */
    private TrendSignificance determineSignificance() {
        BigDecimal absChangeRate = this.changeRate.abs();
        
        if (absChangeRate.compareTo(BigDecimal.valueOf(20)) >= 0) {
            return TrendSignificance.HIGHLY_SIGNIFICANT;
        } else if (absChangeRate.compareTo(BigDecimal.valueOf(10)) >= 0) {
            return TrendSignificance.SIGNIFICANT;
        } else if (absChangeRate.compareTo(BigDecimal.valueOf(5)) >= 0) {
            return TrendSignificance.MODERATE;
        } else {
            return TrendSignificance.MINOR;
        }
    }
    
    /**
     * トレンド説明文の生成
     */
    private String generateDescription() {
        String directionText = getDirectionText();
        String significanceText = getSignificanceText();
        
        return String.format(
            "%sは前月比%s%sで%sしています（%+.1f%%）",
            this.metricName,
            this.changeRate.abs(),
            "%",
            directionText,
            this.changeRate
        );
    }
    
    private String getDirectionText() {
        switch (this.direction) {
            case INCREASING: return "上昇";
            case DECREASING: return "下降";
            case STABLE: return "横ばい";
            default: return "不明";
        }
    }
    
    private String getSignificanceText() {
        switch (this.significance) {
            case HIGHLY_SIGNIFICANT: return "大幅に";
            case SIGNIFICANT: return "顕著に";
            case MODERATE: return "程度";
            case MINOR: return "わずかに";
            default: return "";
        }
    }
    
    public enum TrendDirection {
        INCREASING("上昇トレンド"),
        DECREASING("下降トレンド"),
        STABLE("安定トレンド"),
        VOLATILE("変動トレンド");
        
        private final String displayName;
        
        TrendDirection(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum TrendSignificance {
        HIGHLY_SIGNIFICANT("非常に重要"),
        SIGNIFICANT("重要"),
        MODERATE("中程度"),
        MINOR("軽微"),
        INSUFFICIENT_DATA("データ不足");
        
        private final String displayName;
        
        TrendSignificance(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### Dashboard（ダッシュボード）
```java
@Embeddable
public class Dashboard {
    private DashboardId id;
    private String name;
    private DashboardType type;              // 経営/営業/管理者/担当者
    private List<DashboardWidget> widgets;   // ウィジェット一覧
    private DashboardLayout layout;          // レイアウト情報
    
    // アクセス制御
    private List<UserId> authorizedUsers;    // 許可ユーザー
    private List<String> authorizedRoles;    // 許可ロール
    
    // 更新情報
    private LocalDateTime lastUpdatedAt;
    private Duration refreshInterval;        // 自動更新間隔
    private boolean isAutoRefresh;
    
    public Dashboard(DashboardId id, String name, DashboardType type) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.widgets = new ArrayList<>();
        this.authorizedUsers = new ArrayList<>();
        this.authorizedRoles = new ArrayList<>();
        this.refreshInterval = Duration.ofMinutes(15);
        this.isAutoRefresh = true;
        this.lastUpdatedAt = LocalDateTime.now();
    }
    
    /**
     * ウィジェットの追加
     */
    public void addWidget(DashboardWidget widget) {
        if (widgets.size() >= 12) {
            throw new BusinessRuleViolationException("ウィジェットは最大3個までです");
        }
        
        widget.setPosition(widgets.size());
        this.widgets.add(widget);
        this.lastUpdatedAt = LocalDateTime.now();
    }
    
    /**
     * ウィジェットの削除
     */
    public void removeWidget(DashboardWidgetId widgetId) {
        this.widgets.removeIf(widget -> widget.getId().equals(widgetId));
        
        // 位置の再配置
        for (int i = 0; i < widgets.size(); i++) {
            widgets.get(i).setPosition(i);
        }
        
        this.lastUpdatedAt = LocalDateTime.now();
    }
    
    /**
     * ダッシュボードの更新
     */
    public void refresh() {
        for (DashboardWidget widget : widgets) {
            widget.refresh();
        }
        this.lastUpdatedAt = LocalDateTime.now();
    }
    
    /**
     * アクセス権限チェック
     */
    public boolean canAccess(UserId userId, List<String> userRoles) {
        // ユーザー直接指定
        if (authorizedUsers.contains(userId)) {
            return true;
        }
        
        // ロールでのアクセス判定
        return userRoles.stream()
            .anyMatch(role -> authorizedRoles.contains(role));
    }
    
    /**
     * 最新更新からの経過時間取得
     */
    public Duration getTimeSinceLastUpdate() {
        return Duration.between(this.lastUpdatedAt, LocalDateTime.now());
    }
    
    /**
     * 更新が必要かチェック
     */
    public boolean needsRefresh() {
        return isAutoRefresh && getTimeSinceLastUpdate().compareTo(refreshInterval) > 0;
    }
    
    public enum DashboardType {
        EXECUTIVE("経営ダッシュボード"),
        SALES("営業ダッシュボード"),
        OPERATIONAL("運用ダッシュボード"),
        FINANCIAL("財務ダッシュボード"),
        PERSONAL("個人ダッシュボード");
        
        private final String displayName;
        
        DashboardType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.3 エンティティ設計

#### DashboardWidget（ダッシュボードウィジェット）
```java
@Entity
@Table(name = "dashboard_widgets")
public class DashboardWidget {
    @Id
    private DashboardWidgetId id;
    
    private String title;
    private WidgetType type;                 // グラフ/数値/テーブル/ゲージ
    private WidgetSize size;                 // サイズ（小/中/大）
    private int position;                    // 表示位置
    
    // データソース
    private String dataSource;               // データソース名
    private String dataQuery;                // データ取得クエリ
    private Map<String, String> parameters;  // パラメータ
    
    // 表示設定
    private WidgetConfiguration configuration;
    private String chartType;                // グラフ種別
    private Map<String, Object> chartOptions; // グラフオプション
    
    // キャッシュ情報
    private Object cachedData;               // キャッシュデータ
    private LocalDateTime cacheExpiresAt;    // キャッシュ有効期限
    
    public DashboardWidget(String title, WidgetType type, WidgetSize size) {
        this.id = DashboardWidgetId.generate();
        this.title = title;
        this.type = type;
        this.size = size;
        this.parameters = new HashMap<>();
        this.chartOptions = new HashMap<>();
    }
    
    /**
     * ウィジェットデータの更新
     */
    public void refresh() {
        if (isCacheValid()) {
            return; // キャッシュが有効ならスキップ
        }
        
        // データ取得とキャッシュ更新
        Object newData = fetchData();
        this.cachedData = newData;
        this.cacheExpiresAt = LocalDateTime.now().plusMinutes(15);
    }
    
    /**
     * キャッシュ有効性チェック
     */
    private boolean isCacheValid() {
        return this.cacheExpiresAt != null && 
               this.cacheExpiresAt.isAfter(LocalDateTime.now());
    }
    
    /**
     * データ取得
     */
    private Object fetchData() {
        // 実際の実装ではデータソースやAPIからデータを取得
        switch (this.dataSource) {
            case "analytics":
                return fetchAnalyticsData();
            case "kpi":
                return fetchKPIData();
            default:
                return null;
        }
    }
    
    private Object fetchAnalyticsData() {
        // AnalyticsDataからデータ取得
        return new HashMap<>();
    }
    
    private Object fetchKPIData() {
        // KPIデータ取得
        return new HashMap<>();
    }
    
    public enum WidgetType {
        CHART("グラフ"),
        NUMBER("数値"),
        TABLE("テーブル"),
        GAUGE("ゲージ"),
        TEXT("テキスト");
        
        private final String displayName;
        
        WidgetType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum WidgetSize {
        SMALL(1, 1),
        MEDIUM(2, 1),
        LARGE(2, 2),
        WIDE(3, 1);
        
        private final int width;
        private final int height;
        
        WidgetSize(int width, int height) {
            this.width = width;
            this.height = height;
        }
    }
}
```

#### ReportTemplate（レポートテンプレート）
```java
@Entity
@Table(name = "report_templates")
public class ReportTemplate {
    @Id
    private ReportTemplateId id;
    
    private String name;
    private String description;
    private ReportType type;                 // 月次/四半期/年次
    private ReportCategory category;         // 売上/労務/財務
    
    // テンプレート定義
    private String templateContent;          // テンプレート本文
    private List<ReportSection> sections;    // レポートセクション
    private Map<String, String> parameters;  // パラメータ定義
    
    // 生成設定
    private boolean isActive;
    private ReportSchedule schedule;         // 自動生成スケジュール
    private List<String> recipients;         // 配信先
    
    // バージョン管理
    private int version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserId createdBy;
    
    public ReportTemplate(String name, ReportType type, ReportCategory category) {
        this.id = ReportTemplateId.generate();
        this.name = name;
        this.type = type;
        this.category = category;
        this.sections = new ArrayList<>();
        this.parameters = new HashMap<>();
        this.recipients = new ArrayList<>();
        this.isActive = true;
        this.version = 1;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * レポート生成
     */
    public GeneratedReport generateReport(YearMonth targetPeriod, Map<String, Object> parameterValues) {
        if (!isActive) {
            throw new BusinessRuleViolationException("非アクティブなテンプレートです");
        }
        
        // パラメータ検証
        validateParameters(parameterValues);
        
        // レポートデータ収集
        Map<String, Object> reportData = collectReportData(targetPeriod, parameterValues);
        
        // レポート生成
        String generatedContent = generateContent(reportData);
        
        return new GeneratedReport(
            GeneratedReportId.generate(),
            this.id,
            this.name,
            targetPeriod,
            generatedContent,
            LocalDateTime.now()
        );
    }
    
    /**
     * セクションの追加
     */
    public void addSection(ReportSection section) {
        section.setOrder(this.sections.size());
        this.sections.add(section);
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * スケジュール設定
     */
    public void setSchedule(ReportSchedule schedule) {
        this.schedule = schedule;
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * テンプレートの新バージョン作成
     */
    public ReportTemplate createNewVersion() {
        ReportTemplate newVersion = new ReportTemplate(this.name, this.type, this.category);
        newVersion.templateContent = this.templateContent;
        newVersion.sections = new ArrayList<>(this.sections);
        newVersion.parameters = new HashMap<>(this.parameters);
        newVersion.recipients = new ArrayList<>(this.recipients);
        newVersion.schedule = this.schedule;
        newVersion.version = this.version + 1;
        newVersion.createdBy = this.createdBy;
        
        // 現在のバージョンを非アクティブ化
        this.isActive = false;
        
        return newVersion;
    }
    
    private void validateParameters(Map<String, Object> parameterValues) {
        for (String requiredParam : parameters.keySet()) {
            if (!parameterValues.containsKey(requiredParam)) {
                throw new IllegalArgumentException("必須パラメータが不足です: " + requiredParam);
            }
        }
    }
    
    private Map<String, Object> collectReportData(YearMonth targetPeriod, Map<String, Object> parameterValues) {
        Map<String, Object> data = new HashMap<>();
        
        // 各セクションのデータを収集
        for (ReportSection section : sections) {
            Object sectionData = section.collectData(targetPeriod, parameterValues);
            data.put(section.getName(), sectionData);
        }
        
        return data;
    }
    
    private String generateContent(Map<String, Object> reportData) {
        // テンプレートエンジンでコンテンツ生成
        return this.templateContent; // 簡略化
    }
    
    public enum ReportType {
        DAILY("日次"),
        WEEKLY("週次"),
        MONTHLY("月次"),
        QUARTERLY("四半期"),
        YEARLY("年次"),
        AD_HOC("アドホック");
        
        private final String displayName;
        
        ReportType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum ReportCategory {
        SALES("売上レポート"),
        FINANCIAL("財務レポート"),
        OPERATIONAL("運用レポート"),
        HR("人事レポート"),
        EXECUTIVE("経営レポート");
        
        private final String displayName;
        
        ReportCategory(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

## 3. ドメインサービス

### 3.1 ReportDomainService
```java
@DomainService
public class ReportDomainService {
    
    private final AnalyticsDataRepository analyticsRepository;
    private final ReportTemplateRepository templateRepository;
    
    /**
     * 日次統計データの作成
     */
    public AnalyticsData createDailySalesAnalytics(LocalDate targetDate) {
        // 売上データの収集
        Map<String, Object> salesMetrics = collectDailySalesData(targetDate);
        
        return AnalyticsData.createDailyData(
            AnalyticsData.AnalyticsCategory.SALES,
            targetDate,
            salesMetrics
        );
    }
    
    /**
     * 月次集約処理
     */
    public AnalyticsData aggregateMonthlyData(
            AnalyticsData.AnalyticsCategory category,
            YearMonth targetPeriod) {
        
        // 日次データの取得
        List<AnalyticsData> dailyData = analyticsRepository.findDailyDataByPeriod(
            category, targetPeriod);
            
        if (dailyData.isEmpty()) {
            throw new BusinessRuleViolationException("集約対象の日次データがありません");
        }
        
        return AnalyticsData.aggregateFromDaily(category, targetPeriod, dailyData);
    }
    
    /**
     * KPIダッシュボードの作成
     */
    public Dashboard createKPIDashboard(UserId userId, List<String> userRoles) {
        Dashboard dashboard = new Dashboard(
            DashboardId.generate(),
            "KPIダッシュボード",
            Dashboard.DashboardType.OPERATIONAL
        );
        
        // ユーザーのロールに応じたウィジェットを追加
        if (userRoles.contains("SALES_MANAGER")) {
            dashboard.addWidget(createSalesKPIWidget());
        }
        if (userRoles.contains("OPERATION_MANAGER")) {
            dashboard.addWidget(createOperationKPIWidget());
        }
        if (userRoles.contains("EXECUTIVE")) {
            dashboard.addWidget(createExecutiveKPIWidget());
        }
        
        return dashboard;
    }
    
    /**
     * トレンド分析レポート生成
     */
    public GeneratedReport generateTrendReport(
            AnalyticsData.AnalyticsCategory category,
            YearMonth fromPeriod,
            YearMonth toPeriod) {
        
        // 履歴データの取得
        List<AnalyticsData> historicalData = analyticsRepository.findByPeriodRange(
            category, fromPeriod, toPeriod);
            
        // トレンド分析の実行
        Map<String, TrendAnalysis> trendAnalyses = performTrendAnalysis(historicalData);
        
        // レポートテンプレートの取得
        ReportTemplate template = templateRepository.findByType(
            ReportTemplate.ReportType.MONTHLY)
            .orElseThrow(() -> new EntityNotFoundException("テンプレートが見つかりません"));
            
        // レポートデータの作成
        Map<String, Object> reportData = new HashMap<>();
        reportData.put("trends", trendAnalyses);
        reportData.put("period", fromPeriod + " - " + toPeriod);
        reportData.put("category", category.getDisplayName());
        
        return template.generateReport(toPeriod, reportData);
    }
    
    /**
     * 自動レポート生成バッチ処理
     */
    public List<GeneratedReport> generateScheduledReports(LocalDate targetDate) {
        List<ReportTemplate> scheduledTemplates = templateRepository.findScheduledForDate(targetDate);
        List<GeneratedReport> generatedReports = new ArrayList<>();
        
        for (ReportTemplate template : scheduledTemplates) {
            try {
                YearMonth targetPeriod = determineTargetPeriod(template.getType(), targetDate);
                Map<String, Object> defaultParams = createDefaultParameters(template);
                
                GeneratedReport report = template.generateReport(targetPeriod, defaultParams);
                generatedReports.add(report);
                
                // レポート生成完了イベント
                DomainEventPublisher.publish(new ReportGenerated(
                    report.getId(), template.getId(), targetPeriod));
                    
            } catch (Exception e) {
                // エラーログ出力して続行
                continue;
            }
        }
        
        return generatedReports;
    }
    
    // === プライベートメソッド ===
    
    private Map<String, Object> collectDailySalesData(LocalDate targetDate) {
        Map<String, Object> metrics = new HashMap<>();
        
        // 実際の実装では各コンテキストからデータを収集
        // 例: 日次売上高、発行請求書数、入金金額など
        
        metrics.put("daily_sales", BigDecimal.valueOf(1000000));
        metrics.put("invoices_issued", 5);
        metrics.put("payments_received", BigDecimal.valueOf(800000));
        
        return metrics;
    }
    
    private DashboardWidget createSalesKPIWidget() {
        DashboardWidget widget = new DashboardWidget(
            "月別売上高",
            DashboardWidget.WidgetType.NUMBER,
            DashboardWidget.WidgetSize.MEDIUM
        );
        // ウィジェットの詳細設定
        return widget;
    }
    
    private DashboardWidget createOperationKPIWidget() {
        return new DashboardWidget(
            "マッチング成功率",
            DashboardWidget.WidgetType.GAUGE,
            DashboardWidget.WidgetSize.SMALL
        );
    }
    
    private DashboardWidget createExecutiveKPIWidget() {
        return new DashboardWidget(
            "全社業績サマリー",
            DashboardWidget.WidgetType.CHART,
            DashboardWidget.WidgetSize.LARGE
        );
    }
    
    private Map<String, TrendAnalysis> performTrendAnalysis(List<AnalyticsData> historicalData) {
        Map<String, TrendAnalysis> analyses = new HashMap<>();
        
        if (historicalData.size() >= 2) {
            AnalyticsData latest = historicalData.get(historicalData.size() - 1);
            
            // 主要メトリクスのトレンド分析
            TrendAnalysis salesTrend = latest.analyzeTrend(historicalData, "daily_sales");
            analyses.put("sales", salesTrend);
        }
        
        return analyses;
    }
    
    private YearMonth determineTargetPeriod(ReportTemplate.ReportType type, LocalDate targetDate) {
        switch (type) {
            case MONTHLY:
                return YearMonth.from(targetDate.minusMonths(1));
            case QUARTERLY:
                return YearMonth.from(targetDate.minusMonths(3));
            case YEARLY:
                return YearMonth.from(targetDate.minusYears(1));
            default:
                return YearMonth.from(targetDate);
        }
    }
    
    private Map<String, Object> createDefaultParameters(ReportTemplate template) {
        Map<String, Object> params = new HashMap<>();
        // テンプレートのデフォルトパラメータを設定
        return params;
    }
}
```

### 3.2 AnalyticsEventHandler
```java
@DomainService
public class AnalyticsEventHandler {
    
    private final AnalyticsDataRepository analyticsRepository;
    private final ReportDomainService reportService;
    
    /**
     * 請求書発行イベント処理
     */
    @EventHandler
    public void handle(InvoiceIssued event) {
        // 売上統計データの更新
        updateSalesAnalytics(event.getOccurredAt().toLocalDate(), event.getTotalAmount());
    }
    
    /**
     * 入金記録イベント処理
     */
    @EventHandler
    public void handle(PaymentRecorded event) {
        // 入金統計データの更新
        updatePaymentAnalytics(event.getPaymentDate(), event.getPaymentAmount());
    }
    
    /**
     * マッチング完了イベント処理
     */
    @EventHandler
    public void handle(MatchingCompleted event) {
        // マッチング統計データの更新
        updateMatchingAnalytics(event.getOccurredAt().toLocalDate(), event.getCandidateCount());
    }
    
    /**
     * 工数表承認イベント処理
     */
    @EventHandler
    public void handle(TimesheetApproved event) {
        // 労働時間統計データの更新
        updateWorkHoursAnalytics(event.getPeriod(), event.getWorkHoursSummary());
    }
    
    private void updateSalesAnalytics(LocalDate targetDate, Money amount) {
        Optional<AnalyticsData> existing = analyticsRepository.findDailyData(
            AnalyticsData.AnalyticsCategory.SALES, targetDate);
            
        if (existing.isPresent()) {
            // 既存データの更新
            Map<String, Object> updatedMetrics = updateSalesMetrics(
                existing.get().getMetrics(), amount);
            existing.get().updateMetrics(updatedMetrics);
        } else {
            // 新規データ作成
            Map<String, Object> metrics = createInitialSalesMetrics(amount);
            AnalyticsData newData = AnalyticsData.createDailyData(
                AnalyticsData.AnalyticsCategory.SALES, targetDate, metrics);
            analyticsRepository.save(newData);
        }
    }
    
    private Map<String, Object> updateSalesMetrics(Map<String, Object> existing, Money amount) {
        Map<String, Object> updated = new HashMap<>(existing);
        
        BigDecimal currentSales = (BigDecimal) updated.getOrDefault("daily_sales", BigDecimal.ZERO);
        updated.put("daily_sales", currentSales.add(amount.getAmount()));
        
        Integer currentCount = (Integer) updated.getOrDefault("invoice_count", 0);
        updated.put("invoice_count", currentCount + 1);
        
        return updated;
    }
    
    private Map<String, Object> createInitialSalesMetrics(Money amount) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("daily_sales", amount.getAmount());
        metrics.put("invoice_count", 1);
        return metrics;
    }
}
```

## 4. リポジトリインターフェース

### 4.1 AnalyticsDataRepository
```java
public interface AnalyticsDataRepository {
    
    // === 基本CRUD ===
    void save(AnalyticsData analyticsData);
    Optional<AnalyticsData> findById(AnalyticsDataId id);
    void delete(AnalyticsDataId id);
    
    // === カテゴリ・タイプ検索 ===
    List<AnalyticsData> findByCategory(AnalyticsData.AnalyticsCategory category);
    List<AnalyticsData> findByType(AnalyticsData.AnalyticsType type);
    
    // === 日付・期間検索 ===
    Optional<AnalyticsData> findDailyData(AnalyticsData.AnalyticsCategory category, LocalDate targetDate);
    Optional<AnalyticsData> findMonthlyData(AnalyticsData.AnalyticsCategory category, YearMonth targetPeriod);
    List<AnalyticsData> findDailyDataByPeriod(AnalyticsData.AnalyticsCategory category, YearMonth period);
    List<AnalyticsData> findByPeriodRange(AnalyticsData.AnalyticsCategory category, YearMonth fromPeriod, YearMonth toPeriod);
    
    // === 集約レベル検索 ===
    List<AnalyticsData> findByAggregationLevel(AggregationLevel level);
    List<AnalyticsData> findLatestData(AnalyticsData.AnalyticsCategory category, int limit);
    
    // === ステータス検索 ===
    List<AnalyticsData> findByStatus(AnalyticsData.AnalyticsStatus status);
    List<AnalyticsData> findOutdatedData(Duration maxAge);
    
    // === バージョン管理 ===
    List<AnalyticsData> findByVersion(AnalyticsData.AnalyticsCategory category, LocalDate targetDate, int version);
    Optional<AnalyticsData> findLatestVersion(AnalyticsData.AnalyticsCategory category, LocalDate targetDate);
    
    // === ID生成 ===
    AnalyticsDataId generateId();
}
```

### 4.2 ReportTemplateRepository
```java
public interface ReportTemplateRepository {
    void save(ReportTemplate template);
    Optional<ReportTemplate> findById(ReportTemplateId id);
    
    // === タイプ・カテゴリ検索 ===
    Optional<ReportTemplate> findByType(ReportTemplate.ReportType type);
    List<ReportTemplate> findByCategory(ReportTemplate.ReportCategory category);
    
    // === アクティブテンプレート ===
    List<ReportTemplate> findActiveTemplates();
    List<ReportTemplate> findScheduledForDate(LocalDate targetDate);
    
    // === バージョン管理 ===
    List<ReportTemplate> findByNameOrderByVersion(String name);
    Optional<ReportTemplate> findLatestVersion(String name);
    
    ReportTemplateId generateId();
}
```

## 5. ドメインイベント

### 5.1 AnalyticsDataUpdated
```java
public class AnalyticsDataUpdated implements DomainEvent {
    private final AnalyticsDataId analyticsDataId;
    private final AnalyticsData.AnalyticsCategory category;
    private final YearMonth targetPeriod;
    private final LocalDateTime occurredAt;
    
    // ダッシュボードのキャッシュ更新など
}
```

### 5.2 ReportGenerated
```java
public class ReportGenerated implements DomainEvent {
    private final GeneratedReportId reportId;
    private final ReportTemplateId templateId;
    private final YearMonth targetPeriod;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → レポート完成通知送信
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **データ一意性制約**
   - 同一カテゴリ・同一日付の最新データは1つのみ
   - アーカイブ済みデータの更新禁止
   - バージョン管理の一貫性

2. **集約処理制約**
   - 日次データから月次データへの集約の正確性
   - 集約対象データの存在確認
   - 集約レベルの適切な設定

3. **KPI計算制約**
   - KPI定義とメトリクスデータの整合性
   - 目標値設定の妥当性
   - 達成率計算の正確性

## 7. パフォーマンス考慮事項

### 7.1 CQRSパターン適用
- 読み取り専用モデルとして最適化
- イベントソーシングによるデータ更新
- 非正規化テーブルでの高速検索

### 7.2 キャッシュ戦略
- ダッシュボードデータのメモリキャッシュ
- レポートテンプレートのキャッシュ
- アナリティクスデータの段階的キャッシュ

### 7.3 インデックス設計
- `category`カラムにインデックス
- `target_date`カラムにインデックス
- `target_period`カラムにインデックス
- `is_latest`カラムにインデックス
- 複合インデックス：`(category, target_date, is_latest)`
- 複合インデックス：`(category, target_period, type)`

### 7.4 バッチ処理最適化
- 月次集約処理の非同期実行
- レポート生成の並列処理
- データアーカイブの自動化

---

**作成者**: システム化プロジェクトチーム