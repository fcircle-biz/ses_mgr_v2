# Engineer集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 技術者の基本情報管理
- スキルセット・経験年数の管理
- 稼働状況とアサイン可能性の管理
- マッチングスコア算出ロジック
- スキルシート自動生成

### 1.2 境界
- **含むもの**: Engineer（集約ルート）、SkillSet、WorkStatus、CareerHistory
- **含まないもの**: 案件情報、契約詳細、勤怠データ、評価情報

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Engineer（集約ルート）

```java
@Entity
@Table(name = "engineers")
public class Engineer {
    // === 識別子 ===
    @Id
    private EngineerId id;
    
    // === 基本情報 ===
    private UserId userId;  // 認証システムとの連携
    private PersonalInfo personalInfo;
    private CompanyId companyId;
    private EmploymentType employmentType;
    
    // === スキル・経験 ===
    private SkillSet skillSet;
    private int totalExperienceYears;
    private List<CareerHistory> careerHistory;
    
    // === 稼働情報 ===
    private WorkStatus workStatus;
    private Availability availability;
    private ContractInfo contractInfo;
    
    // === 希望条件 ===
    private PreferredConditions preferredConditions;
    
    // === 評価・実績 ===
    private EngineerRating rating;
    private List<ProjectExperience> projectExperiences;
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    
    // === ビジネスルール ===
    
    /**
     * スキルの追加・更新
     * - 経験年数は現在年数以上でないと更新できない
     * - スキルレベルは経験年数と整合性が必要
     */
    public void addOrUpdateSkill(Skill skill, int experienceYears, SkillLevel level) {
        if (experienceYears < 0) {
            throw new IllegalArgumentException("経験年数は0以上である必要があります");
        }
        
        // 既存スキルの場合は経験年数の後退を防ぐ
        Optional<EngineerSkill> existingSkill = skillSet.findSkill(skill);
        if (existingSkill.isPresent() && 
            existingSkill.get().getExperienceYears() > experienceYears) {
            throw new BusinessRuleViolationException("経験年数は現在の値より少なくできません");
        }
        
        // スキルレベルと経験年数の整合性チェック
        if (!level.isCompatibleWith(experienceYears)) {
            throw new BusinessRuleViolationException("スキルレベルと経験年数に整合性がありません");
        }
        
        skillSet.addOrUpdateSkill(skill, experienceYears, level);
        
        // スキル更新イベント（マッチングコンテキストへ）
        DomainEventPublisher.publish(new EngineerSkillUpdated(this.id, skill, level));
    }
    
    /**
     * 稼働状況の変更
     * - ステータス変更のビジネスルールを適用
     */
    public void changeWorkStatus(WorkStatusType newStatus, LocalDate availableFrom, String reason) {
        if (!workStatus.canChangeTo(newStatus)) {
            throw new BusinessRuleViolationException(
                String.format("ステータス '%s' から '%s' への変更はできません", 
                    workStatus.getType(), newStatus)
            );
        }
        
        // 待機中への変更時は稼働可能日が必要
        if (newStatus == WorkStatusType.AVAILABLE && availableFrom == null) {
            throw new IllegalArgumentException("待機中への変更時は稼働可能日が必要です");
        }
        
        WorkStatus oldStatus = this.workStatus;
        this.workStatus = new WorkStatus(newStatus, availableFrom, reason);
        
        // 稼働状況変更イベント（マッチングコンテキストへ）
        DomainEventPublisher.publish(new EngineerAvailabilityChanged(
            this.id, oldStatus, this.workStatus));
    }
    
    /**
     * 案件期間に対する稼働可能性判定
     */
    public boolean isAvailableFor(ProjectPeriod period) {
        if (workStatus.getType() != WorkStatusType.AVAILABLE) {
            return false;
        }
        
        LocalDate availableFrom = availability.getAvailableFrom();
        if (availableFrom == null) {
            return false;
        }
        
        // 稼働開始可能日が案件開始日以前である
        return !availableFrom.isAfter(period.getEstimatedStartDate());
    }
    
    /**
     * マッチングスコア算出（簡素化版 - 複雑ロジックはドメインサービスに委譲）
     */
    public MatchingScore calculateMatchingScore(RequiredSkills requiredSkills) {
        // 複雑なマッチングロジックはEngineerMatchingDomainServiceに委譲
        return EngineerMatchingDomainService.calculateScore(this, requiredSkills);
    }
    
    /**
     * マッチングに必要な基本データを提供
     */
    public EngineerMatchingData getMatchingData() {
        return new EngineerMatchingData(
            this.skillSet,
            this.totalExperienceYears,
            this.workStatus,
            this.projectExperiences,
            this.rating
        );
    }
    
    /**
     * スキルシート生成用データ取得
     */
    public SkillSheetData generateSkillSheetData() {
        return new SkillSheetData(
            personalInfo,
            skillSet,
            careerHistory,
            projectExperiences,
            rating
        );
    }
    
    /**
     * 月額コスト算出
     */
    public Money calculateMonthlyCost() {
        return contractInfo.getMonthlyCost();
    }
    
    // === プライベートメソッド ===
    
    private float calculateExperienceCompatibility(RequiredSkills requiredSkills) {
        int requiredExperience = requiredSkills.getMinimumExperienceYears();
        if (totalExperienceYears >= requiredExperience) {
            return 1.0f;  // 要求経験年数を満たしている
        } else {
            return (float) totalExperienceYears / requiredExperience;
        }
    }
    
    private float calculateAvailabilityScore() {
        switch (workStatus.getType()) {
            case AVAILABLE:
                return 1.0f;
            case SCHEDULED:
                return 0.5f;  // 将来的に稼働可能
            case WORKING:
                return 0.2f;  // 現在稼働中だが将来の可能性あり
            default:
                return 0.0f;
        }
    }
    
    private float calculatePerformanceScore(RequiredSkills requiredSkills) {
        // 類似案件での過去実績を評価
        long relevantProjects = projectExperiences.stream()
            .filter(exp -> exp.isRelevantTo(requiredSkills))
            .count();
            
        if (relevantProjects == 0) return 0.5f;  // 中立スコア
        if (relevantProjects >= 3) return 1.0f;  // 豊富な実績
        
        return 0.5f + (relevantProjects * 0.25f);
    }
}
```

### 2.2 値オブジェクト設計

#### SkillSet（スキルセット）
```java
@Embeddable
public class SkillSet {
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EngineerSkill> skills;
    
    public SkillSet() {
        this.skills = new ArrayList<>();
    }
    
    /**
     * スキル追加・更新
     */
    public void addOrUpdateSkill(Skill skill, int experienceYears, SkillLevel level) {
        Optional<EngineerSkill> existing = findSkill(skill);
        
        if (existing.isPresent()) {
            existing.get().updateExperience(experienceYears, level);
        } else {
            skills.add(new EngineerSkill(skill, experienceYears, level));
        }
    }
    
    /**
     * 要求スキルとの適合度算出
     */
    public float calculateCompatibility(RequiredSkills requiredSkills) {
        List<RequiredSkill> required = requiredSkills.getSkills();
        if (required.isEmpty()) {
            return 1.0f;
        }
        
        int matchedSkills = 0;
        float totalCompatibility = 0.0f;
        
        for (RequiredSkill reqSkill : required) {
            Optional<EngineerSkill> engineerSkill = findSkill(reqSkill.getSkill());
            
            if (engineerSkill.isPresent()) {
                matchedSkills++;
                float skillCompatibility = calculateSkillCompatibility(
                    engineerSkill.get(), reqSkill);
                totalCompatibility += skillCompatibility;
            }
        }
        
        if (matchedSkills == 0) {
            return 0.0f;
        }
        
        // マッチしたスキルの平均適合度 × マッチ率
        float averageCompatibility = totalCompatibility / matchedSkills;
        float matchRate = (float) matchedSkills / required.size();
        
        return averageCompatibility * matchRate;
    }
    
    /**
     * 最大経験年数取得
     */
    public int getMaxExperienceYears() {
        return skills.stream()
            .mapToInt(EngineerSkill::getExperienceYears)
            .max()
            .orElse(0);
    }
    
    /**
     * スキルカテゴリ別集計
     */
    public Map<SkillCategory, List<EngineerSkill>> groupByCategory() {
        return skills.stream()
            .collect(Collectors.groupingBy(
                skill -> skill.getSkill().getCategory()));
    }
    
    Optional<EngineerSkill> findSkill(Skill skill) {
        return skills.stream()
            .filter(s -> s.getSkill().equals(skill))
            .findFirst();
    }
    
    private float calculateSkillCompatibility(EngineerSkill engineerSkill, RequiredSkill requiredSkill) {
        // レベル適合度
        float levelCompatibility = engineerSkill.getLevel()
            .calculateCompatibility(requiredSkill.getRequiredLevel());
        
        // 経験年数適合度
        float experienceCompatibility = 1.0f;
        if (requiredSkill.getMinimumExperience() > 0) {
            experienceCompatibility = Math.min(1.0f,
                (float) engineerSkill.getExperienceYears() / requiredSkill.getMinimumExperience());
        }
        
        return (levelCompatibility + experienceCompatibility) / 2.0f;
    }
}
```

#### WorkStatus（稼働状況）
```java
@Embeddable
public class WorkStatus {
    private WorkStatusType type;
    private LocalDate statusChangeDate;
    private LocalDate availableFrom;
    private String reason;
    
    public enum WorkStatusType {
        AVAILABLE("待機中"),
        WORKING("稼働中"),
        SCHEDULED("稼働予定"),
        ON_LEAVE("休職中"),
        RESIGNED("退職");
        
        private final String displayName;
        
        WorkStatusType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    /**
     * ステータス変更可能性チェック
     */
    public boolean canChangeTo(WorkStatusType newStatus) {
        switch (this.type) {
            case AVAILABLE:
                return newStatus == WorkStatusType.WORKING || 
                       newStatus == WorkStatusType.SCHEDULED ||
                       newStatus == WorkStatusType.ON_LEAVE ||
                       newStatus == WorkStatusType.RESIGNED;
                       
            case WORKING:
                return newStatus == WorkStatusType.AVAILABLE ||
                       newStatus == WorkStatusType.RESIGNED;
                       
            case SCHEDULED:
                return newStatus == WorkStatusType.WORKING ||
                       newStatus == WorkStatusType.AVAILABLE ||
                       newStatus == WorkStatusType.RESIGNED;
                       
            case ON_LEAVE:
                return newStatus == WorkStatusType.AVAILABLE ||
                       newStatus == WorkStatusType.RESIGNED;
                       
            case RESIGNED:
                return false;  // 退職後は変更不可
                
            default:
                return false;
        }
    }
}
```

#### PersonalInfo（個人情報）
```java
@Embeddable
public class PersonalInfo {
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private Gender gender;
    private ContactInfo contactInfo;
    private Address address;
    
    public String getFullName() {
        return lastName + " " + firstName;
    }
    
    public int getAge() {
        return Period.between(birthDate, LocalDate.now()).getYears();
    }
    
    /**
     * 個人情報のマスキング（スキルシート用）
     */
    public PersonalInfo maskSensitiveInfo() {
        return new PersonalInfo(
            firstName,
            lastName.substring(0, 1) + "***",  // 名字の一部をマスク
            null,  // 生年月日は非表示
            gender,
            contactInfo.maskSensitiveInfo(),
            address.maskSensitiveInfo()
        );
    }
}
```

#### EngineerSkill（技術者スキル）
```java
@Entity
@Table(name = "engineer_skills")
public class EngineerSkill {
    @Id
    private EngineerSkillId id;
    
    private EngineerId engineerId;
    
    @Embedded
    private Skill skill;
    
    private int experienceYears;
    private SkillLevel level;
    private LocalDate lastUsedDate;
    private String description;  // 具体的な使用経験
    
    // 証明書・資格
    private List<Certification> certifications;
    
    public EngineerSkill(Skill skill, int experienceYears, SkillLevel level) {
        this.skill = skill;
        this.experienceYears = experienceYears;
        this.level = level;
        this.lastUsedDate = LocalDate.now();
        this.certifications = new ArrayList<>();
    }
    
    /**
     * 経験年数・レベル更新
     */
    public void updateExperience(int newExperienceYears, SkillLevel newLevel) {
        if (newExperienceYears < this.experienceYears) {
            throw new IllegalArgumentException("経験年数は減少できません");
        }
        
        this.experienceYears = newExperienceYears;
        this.level = newLevel;
        this.lastUsedDate = LocalDate.now();
    }
    
    /**
     * スキルの新鮮度評価
     */
    public SkillFreshness evaluateFreshness() {
        if (lastUsedDate == null) {
            return SkillFreshness.UNKNOWN;
        }
        
        long monthsSinceLastUse = ChronoUnit.MONTHS.between(lastUsedDate, LocalDate.now());
        
        if (monthsSinceLastUse <= 6) return SkillFreshness.FRESH;
        if (monthsSinceLastUse <= 24) return SkillFreshness.MODERATE;
        return SkillFreshness.STALE;
    }
}
```

### 2.3 エンティティ設計

#### CareerHistory（経歴履歴）
```java
@Entity
@Table(name = "career_histories")
public class CareerHistory {
    @Id
    private CareerHistoryId id;
    
    private EngineerId engineerId;
    private String companyName;
    private String position;
    private String department;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
    private List<String> achievements;  // 主な成果
    
    /**
     * 在籍期間の計算
     */
    public Period getTenure() {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        return Period.between(startDate, end);
    }
    
    /**
     * 現職かどうか
     */
    public boolean isCurrent() {
        return endDate == null;
    }
}
```

#### ProjectExperience（案件経験）
```java
@Entity
@Table(name = "project_experiences")
public class ProjectExperience {
    @Id
    private ProjectExperienceId id;
    
    private EngineerId engineerId;
    private String projectName;
    private String customerType;  // 業界
    private String role;  // 役割
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Skill> usedSkills;
    private String description;
    private ProjectResult result;  // 成功/失敗/中断
    
    /**
     * 要求スキルとの関連性判定
     */
    public boolean isRelevantTo(RequiredSkills requiredSkills) {
        return requiredSkills.getSkills().stream()
            .anyMatch(reqSkill -> usedSkills.contains(reqSkill.getSkill()));
    }
    
    /**
     * プロジェクト期間
     */
    public int getProjectDurationMonths() {
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        return (int) ChronoUnit.MONTHS.between(startDate, end);
    }
}
```

## 3. ドメインサービス

### 3.1 EngineerMatchingService
```java
@DomainService
public class EngineerMatchingService {
    
    /**
     * 複数技術者のマッチングスコア一括算出
     */
    public List<EngineerMatchingResult> calculateMatchingScores(
            List<Engineer> engineers,
            RequiredSkills requiredSkills) {
        
        return engineers.stream()
            .map(engineer -> {
                MatchingScore score = engineer.calculateMatchingScore(requiredSkills);
                return new EngineerMatchingResult(engineer.getId(), score);
            })
            .sorted((a, b) -> Float.compare(b.getScore().getTotalScore(), a.getScore().getTotalScore()))
            .collect(Collectors.toList());
    }
    
    /**
     * マッチング閾値による絞り込み
     */
    public List<Engineer> filterByMatchingThreshold(
            List<Engineer> engineers,
            RequiredSkills requiredSkills,
            float threshold) {
        
        return engineers.stream()
            .filter(engineer -> {
                MatchingScore score = engineer.calculateMatchingScore(requiredSkills);
                return score.getTotalScore() >= threshold;
            })
            .collect(Collectors.toList());
    }
}
```

### 3.2 SkillSheetGenerationService
```java
@DomainService
public class SkillSheetGenerationService {
    
    /**
     * スキルシートPDF生成用データ作成
     */
    public SkillSheetDocument generateSkillSheet(Engineer engineer, SkillSheetFormat format) {
        SkillSheetData data = engineer.generateSkillSheetData();
        
        return switch (format) {
            case STANDARD -> generateStandardFormat(data);
            case DETAILED -> generateDetailedFormat(data);
            case CUSTOMER_SPECIFIC -> generateCustomerSpecificFormat(data);
        };
    }
    
    private SkillSheetDocument generateStandardFormat(SkillSheetData data) {
        return SkillSheetDocument.builder()
            .personalInfo(data.getPersonalInfo().maskSensitiveInfo())
            .skillSummary(createSkillSummary(data.getSkillSet()))
            .careerSummary(createCareerSummary(data.getCareerHistory()))
            .build();
    }
}
```

## 4. リポジトリインターフェース

### 4.1 EngineerRepository
```java
public interface EngineerRepository {
    
    // === 基本CRUD ===
    void save(Engineer engineer);
    Optional<Engineer> findById(EngineerId id);
    void delete(EngineerId id);
    
    // === ステータス検索 ===
    List<Engineer> findByWorkStatus(WorkStatusType status);
    List<Engineer> findAvailableEngineers();
    List<Engineer> findAvailableEngineersForPeriod(LocalDate startDate, LocalDate endDate);
    
    // === スキル検索 ===
    List<Engineer> findBySkill(Skill skill);
    List<Engineer> findBySkillAndLevel(Skill skill, SkillLevel minLevel);
    List<Engineer> findBySkillSet(List<Skill> skills);
    
    // === 会社・雇用形態検索 ===
    List<Engineer> findByCompanyId(CompanyId companyId);
    List<Engineer> findByEmploymentType(EmploymentType type);
    
    // === 複合条件検索 ===
    List<Engineer> findByCriteria(EngineerSearchCriteria criteria);
    
    // === 統計・集計 ===
    long countByWorkStatus(WorkStatusType status);
    Map<Skill, Long> getSkillDistribution();
    
    // === ID生成 ===
    EngineerId generateId();
}
```

## 5. ドメインイベント

### 5.1 EngineerSkillUpdated
```java
public class EngineerSkillUpdated implements DomainEvent {
    private final EngineerId engineerId;
    private final Skill skill;
    private final SkillLevel newLevel;
    private final LocalDateTime occurredAt;
    
    // マッチングコンテキストが購読
    // → 既存マッチング結果の再評価
}
```

### 5.2 EngineerAvailabilityChanged
```java
public class EngineerAvailabilityChanged implements DomainEvent {
    private final EngineerId engineerId;
    private final WorkStatus oldStatus;
    private final WorkStatus newStatus;
    private final LocalDateTime occurredAt;
    
    // マッチングコンテキストが購読
    // → 稼働可能技術者リストの更新
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **スキル整合性**
   - 経験年数の後退禁止
   - スキルレベルと経験年数の整合性

2. **ステータス遷移制約**
   - 退職後の状態変更不可
   - 論理的なステータス遷移のみ許可

3. **稼働可能性制約**
   - 待機中ステータス時のみ新規アサイン可能
   - 稼働可能日の妥当性チェック

## 7. パフォーマンス考慮事項

### 7.1 遅延読み込み
- `skillSet.skills`は遅延読み込み
- `careerHistory`は遅延読み込み
- `projectExperiences`は遅延読み込み

### 7.2 インデックス設計
- `work_status`カラムにインデックス
- `company_id`カラムにインデックス
- `available_from`カラムにインデックス
- `engineer_skills`テーブルの`skill_id`にインデックス

---

**作成者**: システム化プロジェクトチーム