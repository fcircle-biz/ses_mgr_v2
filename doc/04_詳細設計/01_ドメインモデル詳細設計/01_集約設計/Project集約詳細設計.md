# Project集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 案件のライフサイクル管理（リード → 提案 → 交渉 → 受注 → 進行中 → 完了）
- 顧客情報の管理
- 案件要件（必要スキル、予算、期間）の管理
- 営業活動の追跡

### 1.2 境界
- **含むもの**: Project（集約ルート）、Customer、ProjectRequirement、Proposal
- **含まないもの**: 技術者情報、マッチング結果、契約詳細、工数実績

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Project（集約ルート）

```java
@Entity
@Table(name = "projects")
public class Project {
    // === 識別子 ===
    @Id
    private ProjectId id;
    
    // === 基本情報 ===
    private ProjectName name;
    private ProjectDescription description;
    private CustomerId customerId;
    
    // === ステータス管理 ===
    private ProjectStatus status;
    private ProjectPhaseHistory phaseHistory;
    
    // === 期間・予算 ===
    private ProjectPeriod period;
    private Budget budget;
    private BusinessFlow businessFlow;  // 直請/一次/二次
    
    // === 要件情報 ===
    private ProjectRequirement requirement;
    
    // === 営業情報 ===
    private SalesRepresentativeId salesRepId;
    
    // === パフォーマンス最適化: 遅延ローディング対応 ===
    @Lazy
    @OneToMany(mappedBy = "project", fetch = FetchType.LAZY)
    private List<Proposal> proposals;
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    
    // === ビジネスルール（不変条件） ===
    
    /**
     * 提案フェーズに進める条件
     * - リードステータスである
     * - 基本要件が入力済み
     * - 営業担当がアサイン済み
     */
    public void startProposal() {
        if (this.status != ProjectStatus.LEAD) {
            throw new BusinessRuleViolationException("提案開始はリード状態でのみ可能です");
        }
        if (!this.requirement.isBasicRequirementComplete()) {
            throw new BusinessRuleViolationException("基本要件の入力が必要です");
        }
        if (this.salesRepId == null) {
            throw new BusinessRuleViolationException("営業担当者のアサインが必要です");
        }
        
        this.status = ProjectStatus.PROPOSING;
        this.phaseHistory.addPhaseChange(ProjectStatus.PROPOSING, LocalDateTime.now());
        
        // ドメインイベント発行
        DomainEventPublisher.publish(new ProjectProposalStarted(this.id, this.customerId));
    }
    
    /**
     * 受注確定
     * - 交渉中ステータスである
     * - 最終提案が存在する
     * - 予算・期間が確定済み
     */
    public void acceptOrder() {
        if (this.status != ProjectStatus.NEGOTIATING) {
            throw new BusinessRuleViolationException("受注確定は交渉中状態でのみ可能です");
        }
        if (!hasFinalProposal()) {
            throw new BusinessRuleViolationException("最終提案が必要です");
        }
        if (!this.budget.isFinalized() || !this.period.isFinalized()) {
            throw new BusinessRuleViolationException("予算・期間の確定が必要です");
        }
        
        this.status = ProjectStatus.ORDERED;
        this.phaseHistory.addPhaseChange(ProjectStatus.ORDERED, LocalDateTime.now());
        
        // ドメインイベント発行（マッチングコンテキストへ）
        DomainEventPublisher.publish(new ProjectOrdered(
            this.id, 
            this.requirement.getRequiredSkills(),
            this.period,
            this.budget.getMaxAmount()
        ));
    }
    
    /**
     * 案件要件の更新
     * - 受注前のステータスでのみ可能
     */
    public void updateRequirement(ProjectRequirement newRequirement) {
        if (this.status.isAfterOrdered()) {
            throw new BusinessRuleViolationException("受注後の要件変更はできません");
        }
        
        this.requirement = newRequirement;
        
        // 要件変更時はマッチング再実行が必要
        if (this.status == ProjectStatus.ORDERED) {
            DomainEventPublisher.publish(new ProjectRequirementChanged(this.id, newRequirement));
        }
    }
    
    /**
     * 案件クローズ
     * - 完了または中断ステータスへの遷移
     */
    public void close(ProjectCloseReason reason, String comment) {
        ProjectStatus newStatus = reason.isSuccessful() ? 
            ProjectStatus.COMPLETED : ProjectStatus.CLOSED;
            
        this.status = newStatus;
        this.phaseHistory.addPhaseChange(newStatus, LocalDateTime.now());
        
        DomainEventPublisher.publish(new ProjectClosed(this.id, reason, comment));
    }
    
    // === ヘルパーメソッド ===
    
    private boolean hasFinalProposal() {
        return proposals.stream()
            .anyMatch(proposal -> proposal.getType() == ProposalType.FINAL);
    }
    
    public boolean canAssignEngineer(Engineer engineer) {
        return this.status == ProjectStatus.ORDERED && 
               this.requirement.isCompatibleWith(engineer.getSkillSet());
    }
    
    /**
     * 推定売上計算 - より洗練されたロジック
     * リスク係数、マージン率、期間係数を考慮
     */
    public Money calculateEstimatedRevenue() {
        Money baseRevenue = this.budget.getMaxAmount()
            .multiply(this.requirement.getEstimatedPersonMonths());
        
        // リスク係数適用（案件の複雑度・顧客信用度等）
        double riskFactor = calculateRiskFactor();
        Money adjustedRevenue = baseRevenue.multiply(riskFactor);
        
        // マージン率適用（直請：15%、一次：10%、二次：5%）
        double marginRate = this.businessFlow.getMarginRate();
        
        // 通貨一貫性チェック
        if (!this.budget.getCurrency().equals(baseRevenue.getCurrency())) {
            throw new BusinessRuleViolationException("予算と売上の通貨が一致しません");
        }
        
        return adjustedRevenue.multiply(1.0 + marginRate);
    }
    
    /**
     * リスク係数計算
     */
    private double calculateRiskFactor() {
        double factor = 1.0;
        
        // 案件規模によるリスク調整
        if (this.requirement.getEstimatedPersonMonths() > 24) {
            factor *= 0.95; // 大規模案件はリスク高
        }
        
        // 技術スタックの複雑度
        if (this.requirement.hasComplexTechnologies()) {
            factor *= 0.9;
        }
        
        // 新規顧客かどうか
        if (this.customerId.isNewCustomer()) {
            factor *= 0.92;
        }
        
        return Math.max(factor, 0.8); // 最小80%保証
    }
}
```

### 2.2 値オブジェクト設計

#### ProjectId（識別子）
```java
@Embeddable
public class ProjectId {
    private UUID value;
    
    // UUIDベースの一意識別子
    public static ProjectId generate() {
        return new ProjectId(UUID.randomUUID());
    }
    
    public static ProjectId of(String idString) {
        return new ProjectId(UUID.fromString(idString));
    }
}
```

#### ProjectName（案件名）
```java
@Embeddable
public class ProjectName {
    private String value;
    
    public ProjectName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("案件名は必須です");
        }
        if (name.length() > 100) {
            throw new IllegalArgumentException("案件名は100文字以内で入力してください");
        }
        this.value = name.trim();
    }
}
```

#### ProjectStatus（案件ステータス）
```java
public enum ProjectStatus {
    LEAD("リード"),
    PROPOSING("提案中"), 
    NEGOTIATING("交渉中"),
    ORDERED("受注"),
    IN_PROGRESS("進行中"),
    COMPLETED("完了"),
    CLOSED("クローズ");
    
    private final String displayName;
    
    public boolean isAfterOrdered() {
        return ordinal() >= ORDERED.ordinal();
    }
    
    public boolean isActive() {
        return this == IN_PROGRESS;
    }
    
    public boolean isClosed() {
        return this == COMPLETED || this == CLOSED;
    }
}
```

#### ProjectPeriod（案件期間）
```java
@Embeddable
public class ProjectPeriod {
    private LocalDate estimatedStartDate;
    private LocalDate estimatedEndDate;
    private LocalDate actualStartDate;
    private LocalDate actualEndDate;
    private boolean isFinalized;
    
    public ProjectPeriod(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("開始日は終了日より前である必要があります");
        }
        if (startDate.isBefore(LocalDate.now().minusDays(1))) {
            throw new IllegalArgumentException("開始日は過去日付には設定できません");
        }
        
        this.estimatedStartDate = startDate;
        this.estimatedEndDate = endDate;
        this.isFinalized = false;
    }
    
    public Period getDuration() {
        return Period.between(estimatedStartDate, estimatedEndDate);
    }
    
    public int getEstimatedMonths() {
        return (int) ChronoUnit.MONTHS.between(estimatedStartDate, estimatedEndDate) + 1;
    }
    
    public void finalize(LocalDate confirmedStart, LocalDate confirmedEnd) {
        this.actualStartDate = confirmedStart;
        this.actualEndDate = confirmedEnd;
        this.isFinalized = true;
    }
}
```

#### Budget（予算）
```java
@Embeddable
public class Budget {
    private Money minAmount;
    private Money maxAmount;
    private Money confirmedAmount;
    private boolean isFinalized;
    
    public Budget(Money minAmount, Money maxAmount) {
        if (minAmount.isGreaterThan(maxAmount)) {
            throw new IllegalArgumentException("最小予算は最大予算以下である必要があります");
        }
        
        this.minAmount = minAmount;
        this.maxAmount = maxAmount;
        this.isFinalized = false;
    }
    
    public boolean isWithinRange(Money amount) {
        return amount.isGreaterThanOrEqual(minAmount) && 
               amount.isLessThanOrEqual(maxAmount);
    }
    
    public void confirm(Money amount) {
        if (!isWithinRange(amount)) {
            throw new IllegalArgumentException("確定金額は予算範囲内である必要があります");
        }
        this.confirmedAmount = amount;
        this.isFinalized = true;
    }
}
```

#### ProjectRequirement（案件要件）
```java
@Embeddable
public class ProjectRequirement {
    private RequiredSkills requiredSkills;
    private int requiredPersonCount;
    private ExperienceLevel requiredExperience;
    private WorkLocation workLocation;
    private WorkStyle workStyle;  // リモート/出社/ハイブリッド
    private String additionalRequirements;
    
    public boolean isBasicRequirementComplete() {
        return requiredSkills != null && 
               requiredPersonCount > 0 && 
               requiredExperience != null;
    }
    
    public boolean isCompatibleWith(SkillSet engineerSkills) {
        return requiredSkills.isCompatibleWith(engineerSkills) &&
               requiredExperience.isCompatibleWith(engineerSkills.getMaxExperience());
    }
    
    public BigDecimal getEstimatedPersonMonths() {
        // 必要人数 × 期間（月数）
        return BigDecimal.valueOf(requiredPersonCount);
    }
}
```

### 2.3 エンティティ設計

#### Customer（顧客）
```java
@Entity
@Table(name = "customers")
public class Customer {
    @Id
    private CustomerId id;
    private CustomerName name;
    private CustomerType type;  // 大手/中小/スタートアップ
    private ContactInfo contactInfo;
    private BusinessDomain businessDomain;
    private CustomerRating rating;  // A/B/C評価
    
    // 取引実績
    private List<ProjectHistory> projectHistory;
    private PaymentTerms defaultPaymentTerms;
    
    public boolean isReliableCustomer() {
        return rating.isGoodStanding() && 
               hasSuccessfulProjectHistory();
    }
    
    private boolean hasSuccessfulProjectHistory() {
        return projectHistory.stream()
            .anyMatch(history -> history.isSuccessful());
    }
}
```

#### Proposal（提案）
```java
@Entity
@Table(name = "proposals")
public class Proposal {
    @Id
    private ProposalId id;
    private ProjectId projectId;  // 外部キー
    
    private ProposalType type;  // 初回/修正/最終
    private String title;
    private String content;
    private Money proposedAmount;
    private LocalDate proposedDeliveryDate;
    
    private ProposalStatus status;  // 作成中/提出済/承認/却下
    private LocalDateTime submittedAt;
    private String customerFeedback;
    
    public void submit() {
        if (status != ProposalStatus.DRAFT) {
            throw new BusinessRuleViolationException("作成中の提案のみ提出可能です");
        }
        
        this.status = ProposalStatus.SUBMITTED;
        this.submittedAt = LocalDateTime.now();
    }
    
    public void approve() {
        if (status != ProposalStatus.SUBMITTED) {
            throw new BusinessRuleViolationException("提出済みの提案のみ承認可能です");
        }
        
        this.status = ProposalStatus.APPROVED;
    }
}
```

## 3. ドメインサービス

### 3.1 ProjectDomainService
```java
@DomainService
public class ProjectDomainService {
    
    /**
     * 案件の収益性評価
     */
    public ProfitabilityAssessment assessProfitability(
            Project project, 
            List<Engineer> candidateEngineers) {
        
        Money estimatedRevenue = project.calculateEstimatedRevenue();
        Money estimatedCost = calculateEstimatedCost(candidateEngineers, project.getPeriod());
        
        BigDecimal profitMargin = estimatedRevenue.subtract(estimatedCost)
            .divide(estimatedRevenue)
            .multiply(BigDecimal.valueOf(100));
            
        return new ProfitabilityAssessment(
            estimatedRevenue,
            estimatedCost,
            profitMargin
        );
    }
    
    /**
     * 案件の実現可能性評価
     */
    public FeasibilityAssessment assessFeasibility(
            Project project,
            List<Engineer> availableEngineers) {
        
        boolean hasRequiredSkills = availableEngineers.stream()
            .anyMatch(engineer -> project.canAssignEngineer(engineer));
            
        boolean hasCapacity = availableEngineers.size() >= 
            project.getRequirement().getRequiredPersonCount();
            
        boolean isScheduleFeasible = availableEngineers.stream()
            .anyMatch(engineer -> engineer.isAvailableFor(project.getPeriod()));
            
        return new FeasibilityAssessment(
            hasRequiredSkills,
            hasCapacity,
            isScheduleFeasible
        );
    }
    
    private Money calculateEstimatedCost(List<Engineer> engineers, ProjectPeriod period) {
        return engineers.stream()
            .map(engineer -> engineer.calculateMonthlyCost().multiply(period.getEstimatedMonths()))
            .reduce(Money.ZERO, Money::add);
    }
}
```

## 4. リポジトリインターフェース

### 4.1 ProjectRepository
```java
public interface ProjectRepository {
    
    // === 基本CRUD ===
    void save(Project project);
    Optional<Project> findById(ProjectId id);
    void delete(ProjectId id);
    
    // === 検索メソッド ===
    List<Project> findByStatus(ProjectStatus status);
    List<Project> findByCustomerId(CustomerId customerId);
    List<Project> findBySalesRepresentativeId(SalesRepresentativeId salesRepId);
    
    // === 期間での検索 ===
    List<Project> findByPeriodOverlap(LocalDate startDate, LocalDate endDate);
    List<Project> findActiveProjects();
    
    // === 複合条件検索 ===
    List<Project> findByCriteria(ProjectSearchCriteria criteria);
    
    // === 統計・集計 ===
    long countByStatus(ProjectStatus status);
    Money calculateTotalBudgetByStatus(ProjectStatus status);
    
    // === ID生成 ===
    ProjectId generateId();
}
```

### 4.2 CustomerRepository
```java
public interface CustomerRepository {
    void save(Customer customer);
    Optional<Customer> findById(CustomerId id);
    List<Customer> findByName(String namePattern);
    List<Customer> findByRating(CustomerRating rating);
    
    // 取引実績での検索
    List<Customer> findWithSuccessfulProjects();
    
    CustomerId generateId();
}
```

## 5. ドメインイベント

### 5.1 ProjectOrdered（最重要）
```java
public class ProjectOrdered implements DomainEvent {
    private final ProjectId projectId;
    private final RequiredSkills requiredSkills;
    private final ProjectPeriod period;
    private final Money maxBudget;
    private final LocalDateTime occurredAt;
    
    // マッチングコンテキストが購読
    // → マッチング要求を自動生成
}
```

### 5.2 ProjectProposalStarted
```java
public class ProjectProposalStarted implements DomainEvent {
    private final ProjectId projectId;
    private final CustomerId customerId;
    private final LocalDateTime occurredAt;
    
    // 通知コンテキストが購読
    // → 営業担当者への通知送信
}
```

### 5.3 ProjectRequirementChanged
```java
public class ProjectRequirementChanged implements DomainEvent {
    private final ProjectId projectId;
    private final ProjectRequirement oldRequirement;
    private final ProjectRequirement newRequirement;
    private final LocalDateTime occurredAt;
    
    // マッチングコンテキストが購読
    // → 既存マッチング結果の再評価
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **ステータス遷移制約**
   - 後戻りできないステータス遷移（受注後はクローズのみ）
   - 必須条件を満たした場合のみ次フェーズに進行可能

2. **期間制約**
   - 開始日 < 終了日
   - 開始日は過去日付不可（当日以降）

3. **予算制約**
   - 最小予算 ≤ 最大予算
   - 確定金額は予算範囲内

4. **要件整合性**
   - 受注後の要件変更は制限
   - 技術者アサイン時のスキル適合性チェック

## 7. パフォーマンス考慮事項

### 7.1 遅延読み込み
- `proposals`は遅延読み込み（@OneToMany(fetch = FetchType.LAZY)）
- `phaseHistory`も遅延読み込み

### 7.2 インデックス設計
- `status`カラムにインデックス（検索頻度高）
- `customer_id`カラムにインデックス
- `sales_rep_id`カラムにインデックス
- 複合インデックス：`(status, estimated_start_date)`

---

**作成者**: システム化プロジェクトチーム