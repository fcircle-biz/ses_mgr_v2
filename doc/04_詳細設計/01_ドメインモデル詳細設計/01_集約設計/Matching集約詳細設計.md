# Matching集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 案件と技術者の最適なマッチング実行
- マッチングスコアの算出と候補者ランキング
- マッチング要求の管理とワークフロー制御
- マッチング履歴の保持と分析

### 1.2 境界
- **含むもの**: MatchingRequest（集約ルート）、Candidate、MatchingScore、MatchingResult
- **含まないもの**: 案件詳細情報、技術者詳細情報、契約締結処理

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 MatchingRequest（集約ルート）

```java
@Entity
@Table(name = "matching_requests")
public class MatchingRequest {
    // === 識別子 ===
    @Id
    private MatchingRequestId id;
    
    // === 参照情報 ===
    private ProjectId projectId;
    private RequiredSkills requiredSkills;
    private ProjectPeriod projectPeriod;
    private Money maxBudget;
    
    // === マッチング条件 ===
    private MatchingCriteria criteria;
    private float minimumMatchingScore;
    private int maxCandidates;
    
    // === 候補者・結果 ===
    private List<Candidate> candidates;
    private MatchingResult result;
    
    // === ステータス管理 ===
    private MatchingStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime completedAt;
    
    // === 依頼者情報 ===
    private UserId requestedBy;
    private String requestReason;
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    
    // === ビジネスルール ===
    
    /**
     * マッチング実行
     * - 要求が新規状態である必要がある
     * - 必要スキル情報が完備されている必要がある
     */
    public void executeMatching(List<Engineer> availableEngineers) {
        if (this.status != MatchingStatus.REQUESTED) {
            throw new BusinessRuleViolationException("マッチング実行は要求中状態でのみ可能です");
        }
        if (!this.requiredSkills.isComplete()) {
            throw new BusinessRuleViolationException("必要スキル情報が不完全です");
        }
        if (availableEngineers.isEmpty()) {
            throw new BusinessRuleViolationException("利用可能な技術者が存在しません");
        }
        
        this.status = MatchingStatus.IN_PROGRESS;
        
        // 候補者生成とスコア計算
        this.candidates = generateCandidates(availableEngineers);
        
        // 閾値以下の候補者を除外
        this.candidates = filterByMinimumScore(this.candidates);
        
        // 最大候補者数で制限
        this.candidates = limitMaxCandidates(this.candidates);
        
        this.status = MatchingStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
        
        // マッチング完了イベント
        DomainEventPublisher.publish(new MatchingCompleted(
            this.id, this.projectId, this.candidates.size()));
    }
    
    /**
     * 候補者選定
     * - マッチング完了状態である必要がある
     * - 候補者が存在する必要がある
     */
    public void selectCandidate(EngineerId engineerId, String selectionReason) {
        if (this.status != MatchingStatus.COMPLETED) {
            throw new BusinessRuleViolationException("候補者選定はマッチング完了後のみ可能です");
        }
        
        Candidate candidate = findCandidate(engineerId)
            .orElseThrow(() -> new BusinessRuleViolationException("指定された技術者は候補者に含まれていません"));
            
        candidate.select(selectionReason);
        this.status = MatchingStatus.CANDIDATE_SELECTED;
        
        // 候補者選定イベント（Contract Contextへ）
        DomainEventPublisher.publish(new CandidateSelected(
            this.id, this.projectId, engineerId, candidate.getMatchingScore()));
    }
    
    /**
     * マッチング要求のキャンセル
     */
    public void cancel(String cancelReason) {
        if (this.status == MatchingStatus.CANDIDATE_SELECTED) {
            throw new BusinessRuleViolationException("候補者選定後のキャンセルはできません");
        }
        
        this.status = MatchingStatus.CANCELLED;
        this.completedAt = LocalDateTime.now();
        
        // マッチングキャンセルイベント
        DomainEventPublisher.publish(new MatchingCancelled(this.id, this.projectId, cancelReason));
    }
    
    /**
     * マッチング要求の再実行
     * - キャンセル状態または完了状態からのみ可能
     */
    public void retry(List<Engineer> availableEngineers, String retryReason) {
        if (this.status != MatchingStatus.CANCELLED && 
            this.status != MatchingStatus.COMPLETED) {
            throw new BusinessRuleViolationException("再実行は完了またはキャンセル状態からのみ可能です");
        }
        
        // 既存の候補者をクリア
        this.candidates.clear();
        this.result = null;
        
        // マッチング再実行
        executeMatching(availableEngineers);
        
        // 再実行イベント
        DomainEventPublisher.publish(new MatchingRetried(this.id, this.projectId, retryReason));
    }
    
    // === プライベートメソッド ===
    
    private List<Candidate> generateCandidates(List<Engineer> availableEngineers) {
        return availableEngineers.stream()
            .filter(engineer -> engineer.isAvailableFor(this.projectPeriod))
            .map(engineer -> {
                MatchingScore score = engineer.calculateMatchingScore(this.requiredSkills);
                return new Candidate(
                    engineer.getId(),
                    score,
                    engineer.getSkillSet(),
                    engineer.getAvailability(),
                    engineer.calculateMonthlyCost()
                );
            })
            .sorted((a, b) -> Float.compare(b.getMatchingScore().getTotalScore(), 
                                           a.getMatchingScore().getTotalScore()))
            .collect(toList());
    }
    
    private List<Candidate> filterByMinimumScore(List<Candidate> candidates) {
        return candidates.stream()
            .filter(candidate -> candidate.getMatchingScore().getTotalScore() >= this.minimumMatchingScore)
            .collect(toList());
    }
    
    private List<Candidate> limitMaxCandidates(List<Candidate> candidates) {
        return candidates.stream()
            .limit(this.maxCandidates)
            .collect(toList());
    }
    
    private Optional<Candidate> findCandidate(EngineerId engineerId) {
        return candidates.stream()
            .filter(candidate -> candidate.getEngineerId().equals(engineerId))
            .findFirst();
    }
    
    public boolean hasValidCandidates() {
        return !candidates.isEmpty() && 
               candidates.stream().anyMatch(c -> c.getMatchingScore().getTotalScore() >= minimumMatchingScore);
    }
    
    public Candidate getTopCandidate() {
        return candidates.stream()
            .max(Comparator.comparing(c -> c.getMatchingScore().getTotalScore()))
            .orElse(null);
    }
}
```

### 2.2 値オブジェクト設計

#### Candidate（候補者）
```java
@Embeddable
public class Candidate {
    private EngineerId engineerId;
    private MatchingScore matchingScore;
    private SkillSet skillSet;  // スナップショット
    private Availability availability;
    private Money monthlyCost;
    
    // 選定情報
    private boolean isSelected;
    private LocalDateTime selectedAt;
    private String selectionReason;
    
    public Candidate(EngineerId engineerId, 
                    MatchingScore matchingScore,
                    SkillSet skillSet,
                    Availability availability,
                    Money monthlyCost) {
        this.engineerId = engineerId;
        this.matchingScore = matchingScore;
        this.skillSet = skillSet;
        this.availability = availability;
        this.monthlyCost = monthlyCost;
        this.isSelected = false;
    }
    
    /**
     * 候補者選定
     */
    public void select(String reason) {
        if (this.isSelected) {
            throw new IllegalStateException("既に選定済みの候補者です");
        }
        
        this.isSelected = true;
        this.selectedAt = LocalDateTime.now();
        this.selectionReason = reason;
    }
    
    /**
     * 選定解除
     */
    public void deselect() {
        this.isSelected = false;
        this.selectedAt = null;
        this.selectionReason = null;
    }
    
    /**
     * コスト効率計算
     */
    public float calculateCostEfficiency() {
        return matchingScore.getTotalScore() / monthlyCost.getAmount().floatValue();
    }
    
    /**
     * 候補者比較（スコア順）
     */
    public static Comparator<Candidate> compareByScore() {
        return (a, b) -> Float.compare(
            b.matchingScore.getTotalScore(), 
            a.matchingScore.getTotalScore());
    }
    
    /**
     * 候補者比較（コスト効率順）
     */
    public static Comparator<Candidate> compareByCostEfficiency() {
        return (a, b) -> Float.compare(
            b.calculateCostEfficiency(), 
            a.calculateCostEfficiency());
    }
}
```

#### MatchingCriteria（マッチング条件）
```java
@Embeddable
public class MatchingCriteria {
    private float skillWeightRatio = 0.4f;      // スキル適合度の重み
    private float experienceWeightRatio = 0.25f; // 経験適合度の重み
    private float availabilityWeightRatio = 0.2f; // 稼働可能性の重み
    private float performanceWeightRatio = 0.15f; // 過去実績の重み
    
    private boolean costSensitive = false;        // コスト重視フラグ
    private boolean qualityFocused = true;        // 品質重視フラグ
    private boolean urgentMatching = false;       // 緊急マッチングフラグ
    
    public MatchingCriteria() {
        // デフォルト値でのコンストラクタ
    }
    
    public MatchingCriteria(float skillWeight, 
                           float experienceWeight, 
                           float availabilityWeight, 
                           float performanceWeight) {
        validateWeights(skillWeight, experienceWeight, availabilityWeight, performanceWeight);
        
        this.skillWeightRatio = skillWeight;
        this.experienceWeightRatio = experienceWeight;
        this.availabilityWeightRatio = availabilityWeight;
        this.performanceWeightRatio = performanceWeight;
    }
    
    /**
     * 重み設定の妥当性チェック
     */
    private void validateWeights(float skill, float experience, float availability, float performance) {
        float total = skill + experience + availability + performance;
        if (Math.abs(total - 1.0f) > 0.01f) {
            throw new IllegalArgumentException("重みの合計は1.0である必要があります");
        }
        if (skill < 0 || experience < 0 || availability < 0 || performance < 0) {
            throw new IllegalArgumentException("重みは0以上である必要があります");
        }
    }
    
    /**
     * コスト重視設定
     */
    public MatchingCriteria withCostFocus() {
        return new MatchingCriteria(
            this.skillWeightRatio * 0.8f,
            this.experienceWeightRatio * 0.8f,
            this.availabilityWeightRatio,
            this.performanceWeightRatio * 0.8f
        ).setCostSensitive(true);
    }
    
    /**
     * 品質重視設定
     */
    public MatchingCriteria withQualityFocus() {
        return new MatchingCriteria(
            this.skillWeightRatio * 1.2f,
            this.experienceWeightRatio * 1.2f,
            this.availabilityWeightRatio * 0.8f,
            this.performanceWeightRatio * 1.2f
        ).setQualityFocused(true);
    }
    
    private MatchingCriteria setCostSensitive(boolean costSensitive) {
        this.costSensitive = costSensitive;
        return this;
    }
    
    private MatchingCriteria setQualityFocused(boolean qualityFocused) {
        this.qualityFocused = qualityFocused;
        return this;
    }
}
```

#### MatchingScore（マッチングスコア）
```java
@Embeddable
public class MatchingScore {
    private float totalScore;           // 総合スコア（0.0 - 1.0）
    private float skillCompatibility;   // スキル適合度
    private float experienceCompatibility; // 経験適合度
    private float availabilityScore;    // 稼働可能性スコア
    private float performanceScore;     // 過去実績スコア
    
    private MatchingCriteria criteria;  // 算出時の条件
    private LocalDateTime calculatedAt; // 算出日時
    
    public MatchingScore(float skillCompatibility,
                        float experienceCompatibility,
                        float availabilityScore,
                        float performanceScore,
                        MatchingCriteria criteria) {
        
        validateScoreRange(skillCompatibility, "スキル適合度");
        validateScoreRange(experienceCompatibility, "経験適合度");
        validateScoreRange(availabilityScore, "稼働可能性スコア");
        validateScoreRange(performanceScore, "過去実績スコア");
        
        this.skillCompatibility = skillCompatibility;
        this.experienceCompatibility = experienceCompatibility;
        this.availabilityScore = availabilityScore;
        this.performanceScore = performanceScore;
        this.criteria = criteria;
        this.calculatedAt = LocalDateTime.now();
        
        // 総合スコア計算
        this.totalScore = calculateTotalScore();
    }
    
    private float calculateTotalScore() {
        return (skillCompatibility * criteria.getSkillWeightRatio()) +
               (experienceCompatibility * criteria.getExperienceWeightRatio()) +
               (availabilityScore * criteria.getAvailabilityWeightRatio()) +
               (performanceScore * criteria.getPerformanceWeightRatio());
    }
    
    private void validateScoreRange(float score, String scoreName) {
        if (score < 0.0f || score > 1.0f) {
            throw new IllegalArgumentException(
                String.format("%sは0.0から1.0の範囲である必要があります: %f", scoreName, score));
        }
    }
    
    /**
     * スコアランク取得
     */
    public MatchingRank getRank() {
        if (totalScore >= 0.8f) return MatchingRank.EXCELLENT;
        if (totalScore >= 0.6f) return MatchingRank.GOOD;
        if (totalScore >= 0.4f) return MatchingRank.FAIR;
        if (totalScore >= 0.2f) return MatchingRank.POOR;
        return MatchingRank.UNFIT;
    }
    
    /**
     * 閾値判定
     */
    public boolean isAboveThreshold(float threshold) {
        return totalScore >= threshold;
    }
    
    /**
     * スコア詳細説明生成
     */
    public String generateExplanation() {
        return String.format(
            "総合: %.1f%% (スキル: %.1f%%, 経験: %.1f%%, 稼働: %.1f%%, 実績: %.1f%%)",
            totalScore * 100,
            skillCompatibility * 100,
            experienceCompatibility * 100,
            availabilityScore * 100,
            performanceScore * 100
        );
    }
    
    public enum MatchingRank {
        EXCELLENT("優秀", "#4CAF50"),
        GOOD("良好", "#8BC34A"),
        FAIR("普通", "#FFC107"),
        POOR("不足", "#FF9800"),
        UNFIT("不適合", "#F44336");
        
        private final String displayName;
        private final String colorCode;
        
        MatchingRank(String displayName, String colorCode) {
            this.displayName = displayName;
            this.colorCode = colorCode;
        }
    }
}
```

#### MatchingResult（マッチング結果）
```java
@Embeddable
public class MatchingResult {
    private int totalCandidates;        // 候補者総数
    private int qualifiedCandidates;    // 閾値クリア候補者数
    private float averageMatchingScore; // 平均マッチングスコア
    private float topScore;             // 最高スコア
    private Duration executionTime;     // マッチング実行時間
    
    private MatchingSummary summary;    // マッチング結果サマリー
    
    public MatchingResult(List<Candidate> candidates, 
                         float minimumThreshold,
                         Instant startTime,
                         Instant endTime) {
        
        this.totalCandidates = candidates.size();
        this.qualifiedCandidates = (int) candidates.stream()
            .filter(c -> c.getMatchingScore().isAboveThreshold(minimumThreshold))
            .count();
            
        this.averageMatchingScore = (float) candidates.stream()
            .mapToDouble(c -> c.getMatchingScore().getTotalScore())
            .average()
            .orElse(0.0);
            
        this.topScore = (float) candidates.stream()
            .mapToDouble(c -> c.getMatchingScore().getTotalScore())
            .max()
            .orElse(0.0);
            
        this.executionTime = Duration.between(startTime, endTime);
        this.summary = generateSummary(candidates, minimumThreshold);
    }
    
    private MatchingSummary generateSummary(List<Candidate> candidates, float threshold) {
        Map<MatchingScore.MatchingRank, Long> rankDistribution = candidates.stream()
            .collect(Collectors.groupingBy(
                c -> c.getMatchingScore().getRank(),
                Collectors.counting()
            ));
            
        return new MatchingSummary(
            totalCandidates,
            qualifiedCandidates,
            averageMatchingScore,
            topScore,
            rankDistribution
        );
    }
    
    /**
     * マッチング成功判定
     */
    public boolean isSuccessful() {
        return qualifiedCandidates > 0 && topScore >= 0.4f;
    }
    
    /**
     * 高品質マッチング判定
     */
    public boolean isHighQuality() {
        return qualifiedCandidates >= 3 && averageMatchingScore >= 0.6f && topScore >= 0.8f;
    }
}
```

### 2.3 エンティティ設計

#### MatchingHistory（マッチング履歴）
```java
@Entity
@Table(name = "matching_histories")
public class MatchingHistory {
    @Id
    private MatchingHistoryId id;
    
    private MatchingRequestId matchingRequestId;
    private ProjectId projectId;
    private EngineerId selectedEngineerId;
    
    private LocalDateTime matchingExecutedAt;
    private LocalDateTime candidateSelectedAt;
    private MatchingScore finalScore;
    
    private MatchingOutcome outcome; // 成功/失敗/キャンセル
    private String outcomeReason;
    
    /**
     * マッチング成功記録
     */
    public static MatchingHistory createSuccessRecord(
            MatchingRequestId requestId,
            ProjectId projectId,
            EngineerId engineerId,
            MatchingScore score) {
        
        MatchingHistory history = new MatchingHistory();
        history.matchingRequestId = requestId;
        history.projectId = projectId;
        history.selectedEngineerId = engineerId;
        history.finalScore = score;
        history.outcome = MatchingOutcome.SUCCESS;
        history.candidateSelectedAt = LocalDateTime.now();
        
        return history;
    }
    
    /**
     * マッチング失敗記録
     */
    public static MatchingHistory createFailureRecord(
            MatchingRequestId requestId,
            ProjectId projectId,
            String reason) {
        
        MatchingHistory history = new MatchingHistory();
        history.matchingRequestId = requestId;
        history.projectId = projectId;
        history.outcome = MatchingOutcome.FAILURE;
        history.outcomeReason = reason;
        history.matchingExecutedAt = LocalDateTime.now();
        
        return history;
    }
    
    public enum MatchingOutcome {
        SUCCESS("成功"),
        FAILURE("失敗"), 
        CANCELLED("キャンセル");
        
        private final String displayName;
        
        MatchingOutcome(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

## 3. ドメインサービス

### 3.1 MatchingDomainService
```java
@DomainService
public class MatchingDomainService {
    
    private final EngineerRepository engineerRepository;
    private final ProjectRepository projectRepository;
    
    /**
     * Project受注イベントからマッチング要求自動生成
     */
    public MatchingRequest createMatchingRequestFromProject(ProjectOrdered event) {
        Project project = projectRepository.findById(event.getProjectId())
            .orElseThrow(() -> new EntityNotFoundException("案件が見つかりません"));
            
        return new MatchingRequest(
            MatchingRequestId.generate(),
            event.getProjectId(),
            event.getRequiredSkills(),
            event.getProjectPeriod(),
            event.getMaxBudget(),
            createDefaultCriteria(),
            0.4f, // デフォルト最小スコア
            10,   // デフォルト最大候補者数
            event.getRequestedBy()
        );
    }
    
    /**
     * 利用可能技術者の取得
     */
    public List<Engineer> findAvailableEngineers(ProjectPeriod period) {
        return engineerRepository.findAvailableEngineersForPeriod(
            period.getEstimatedStartDate(),
            period.getEstimatedEndDate()
        );
    }
    
    /**
     * マッチング成功率分析
     */
    public MatchingAnalytics analyzeMatchingSuccess(
            List<MatchingHistory> histories,
            YearMonth period) {
        
        long totalMatching = histories.size();
        long successfulMatching = histories.stream()
            .filter(h -> h.getOutcome() == MatchingHistory.MatchingOutcome.SUCCESS)
            .count();
            
        float successRate = totalMatching > 0 ? 
            (float) successfulMatching / totalMatching : 0.0f;
            
        Map<MatchingScore.MatchingRank, Long> rankDistribution = histories.stream()
            .filter(h -> h.getFinalScore() != null)
            .collect(Collectors.groupingBy(
                h -> h.getFinalScore().getRank(),
                Collectors.counting()
            ));
            
        return new MatchingAnalytics(
            period,
            totalMatching,
            successfulMatching,
            successRate,
            rankDistribution
        );
    }
    
    /**
     * スキル需要分析
     */
    public SkillDemandAnalysis analyzeSkillDemand(
            List<MatchingRequest> requests,
            YearMonth period) {
        
        Map<Skill, Long> skillDemand = requests.stream()
            .flatMap(req -> req.getRequiredSkills().getSkills().stream())
            .map(RequiredSkill::getSkill)
            .collect(Collectors.groupingBy(
                Function.identity(),
                Collectors.counting()
            ));
            
        Map<Skill, Float> averageRequiredLevel = requests.stream()
            .flatMap(req -> req.getRequiredSkills().getSkills().stream())
            .collect(Collectors.groupingBy(
                RequiredSkill::getSkill,
                Collectors.averagingDouble(rs -> rs.getRequiredLevel().ordinal())
            ))
            .entrySet().stream()
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                entry -> entry.getValue().floatValue()
            ));
            
        return new SkillDemandAnalysis(period, skillDemand, averageRequiredLevel);
    }
    
    private MatchingCriteria createDefaultCriteria() {
        return new MatchingCriteria(); // デフォルト重み設定
    }
}
```

### 3.2 MatchingAlgorithmService
```java
@DomainService
public class MatchingAlgorithmService {
    
    /**
     * 高度なマッチングスコア算出
     * - 複数の要因を総合的に評価
     * - 動的重み調整
     */
    public MatchingScore calculateAdvancedMatchingScore(
            Engineer engineer,
            RequiredSkills requiredSkills,
            MatchingCriteria criteria,
            ProjectContext context) {
        
        // 基本適合度計算
        float skillCompatibility = calculateSkillCompatibility(engineer, requiredSkills);
        float experienceCompatibility = calculateExperienceCompatibility(engineer, requiredSkills);
        float availabilityScore = calculateAvailabilityScore(engineer, context.getProjectPeriod());
        float performanceScore = calculatePerformanceScore(engineer, requiredSkills);
        
        // プロジェクト特性による重み調整
        MatchingCriteria adjustedCriteria = adjustCriteriaByProject(criteria, context);
        
        return new MatchingScore(
            skillCompatibility,
            experienceCompatibility,
            availabilityScore,
            performanceScore,
            adjustedCriteria
        );
    }
    
    /**
     * スキル適合度の詳細計算
     */
    private float calculateSkillCompatibility(Engineer engineer, RequiredSkills requiredSkills) {
        SkillSet engineerSkills = engineer.getSkillSet();
        
        // 必須スキル適合度
        float mandatorySkillScore = requiredSkills.getMandatorySkills().stream()
            .map(reqSkill -> {
                Optional<EngineerSkill> engineerSkill = engineerSkills.findSkill(reqSkill.getSkill());
                if (engineerSkill.isPresent()) {
                    return calculateSkillLevelCompatibility(
                        engineerSkill.get().getLevel(), reqSkill.getRequiredLevel());
                }
                return 0.0f;
            })
            .reduce(0.0f, Float::sum) / requiredSkills.getMandatorySkills().size();
        
        // 優遇スキル適合度
        float preferredSkillScore = requiredSkills.getPreferredSkills().stream()
            .map(reqSkill -> {
                Optional<EngineerSkill> engineerSkill = engineerSkills.findSkill(reqSkill.getSkill());
                return engineerSkill.map(skill -> 
                    calculateSkillLevelCompatibility(skill.getLevel(), reqSkill.getRequiredLevel()) * 0.5f
                ).orElse(0.0f);
            })
            .reduce(0.0f, Float::sum);
        
        return Math.min(1.0f, mandatorySkillScore + preferredSkillScore);
    }
    
    private float calculateSkillLevelCompatibility(SkillLevel engineerLevel, SkillLevel requiredLevel) {
        int levelDiff = engineerLevel.ordinal() - requiredLevel.ordinal();
        if (levelDiff >= 0) {
            return 1.0f; // 要求レベル以上
        } else {
            return Math.max(0.0f, 1.0f + (levelDiff * 0.2f)); // レベル不足によるペナルティ
        }
    }
    
    /**
     * プロジェクト特性による条件調整
     */
    private MatchingCriteria adjustCriteriaByProject(MatchingCriteria criteria, ProjectContext context) {
        if (context.isUrgentProject()) {
            // 緊急案件は稼働可能性を重視
            return criteria.withAvailabilityFocus();
        }
        if (context.isHighValueProject()) {
            // 高価値案件は品質を重視
            return criteria.withQualityFocus();
        }
        if (context.isCostSensitiveProject()) {
            // コスト重視案件
            return criteria.withCostFocus();
        }
        return criteria;
    }
}
```

## 4. リポジトリインターフェース

### 4.1 MatchingRequestRepository
```java
public interface MatchingRequestRepository {
    
    // === 基本CRUD ===
    void save(MatchingRequest matchingRequest);
    Optional<MatchingRequest> findById(MatchingRequestId id);
    void delete(MatchingRequestId id);
    
    // === ステータス検索 ===
    List<MatchingRequest> findByStatus(MatchingStatus status);
    List<MatchingRequest> findPendingRequests();
    List<MatchingRequest> findCompletedRequests(LocalDate fromDate, LocalDate toDate);
    
    // === プロジェクト検索 ===
    List<MatchingRequest> findByProjectId(ProjectId projectId);
    Optional<MatchingRequest> findActiveByProjectId(ProjectId projectId);
    
    // === 依頼者検索 ===
    List<MatchingRequest> findByRequestedBy(UserId userId);
    
    // === 期間検索 ===
    List<MatchingRequest> findByRequestPeriod(LocalDate startDate, LocalDate endDate);
    
    // === 統計・集計 ===
    long countByStatus(MatchingStatus status);
    long countByPeriod(YearMonth period);
    
    // === ID生成 ===
    MatchingRequestId generateId();
}
```

### 4.2 MatchingHistoryRepository
```java
public interface MatchingHistoryRepository {
    void save(MatchingHistory history);
    Optional<MatchingHistory> findById(MatchingHistoryId id);
    
    // === 分析用検索 ===
    List<MatchingHistory> findByPeriod(YearMonth period);
    List<MatchingHistory> findByOutcome(MatchingHistory.MatchingOutcome outcome);
    List<MatchingHistory> findByProjectId(ProjectId projectId);
    List<MatchingHistory> findByEngineerId(EngineerId engineerId);
    
    // === 統計データ ===
    long countSuccessfulMatching(YearMonth period);
    float calculateSuccessRate(YearMonth period);
    Map<Skill, Long> getSkillDemandStatistics(YearMonth period);
    
    MatchingHistoryId generateId();
}
```

## 5. ドメインイベント

### 5.1 MatchingCompleted
```java
public class MatchingCompleted implements DomainEvent {
    private final MatchingRequestId matchingRequestId;
    private final ProjectId projectId;
    private final int candidateCount;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → 営業担当者への候補者通知
}
```

### 5.2 CandidateSelected
```java
public class CandidateSelected implements DomainEvent {
    private final MatchingRequestId matchingRequestId;
    private final ProjectId projectId;
    private final EngineerId selectedEngineerId;
    private final MatchingScore matchingScore;
    private final LocalDateTime occurredAt;
    
    // Contract Contextが購読
    // → 契約書作成処理開始
}
```

### 5.3 MatchingFailed
```java
public class MatchingFailed implements DomainEvent {
    private final MatchingRequestId matchingRequestId;
    private final ProjectId projectId;
    private final String failureReason;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → 営業担当者への失敗通知
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **マッチング実行制約**
   - 要求中状態でのみマッチング実行可能
   - 必要スキル情報の完備が必須
   - 利用可能技術者の存在確認

2. **候補者選定制約**
   - マッチング完了後のみ選定可能
   - 候補者リストに含まれる技術者のみ選定可能
   - 1つのマッチング要求につき1名のみ選定

3. **スコア算出制約**
   - 各スコア要素は0.0-1.0の範囲
   - 重み設定の合計は1.0
   - 最小マッチングスコア以上の候補者のみ有効

## 7. パフォーマンス考慮事項

### 7.1 マッチング処理最適化
- 技術者検索での適切なインデックス利用
- スコア計算の並列処理
- 候補者数の制限による処理時間短縮

### 7.2 遅延読み込み
- `candidates`は遅延読み込み
- `matchingResult`は遅延読み込み

### 7.3 インデックス設計
- `status`カラムにインデックス
- `project_id`カラムにインデックス
- `requested_at`カラムにインデックス
- 複合インデックス：`(status, requested_at)`

---

**作成者**: システム化プロジェクトチーム