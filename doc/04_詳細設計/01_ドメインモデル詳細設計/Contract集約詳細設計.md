# Contract集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 契約書の生成・管理・バージョン管理
- 電子署名プロセスの制御と状態管理
- 契約条件の管理と変更履歴の保持
- 外部電子契約サービス（CloudSign）との連携

### 1.2 境界
- **含むもの**: Contract（集約ルート）、ContractTerms、DigitalSignature、ContractTemplate
- **含まないもの**: 案件詳細情報、技術者詳細情報、勤怠データ、請求情報

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Contract（集約ルート）

```java
@Entity
@Table(name = "contracts")
public class Contract {
    // === 識別子 ===
    @Id
    private ContractId id;
    
    // === 関連エンティティ ===
    private ProjectId projectId;
    private List<EngineerId> engineerIds;  // 複数技術者対応
    private CustomerId customerId;
    private CompanyId contractorCompanyId;  // 受託会社
    
    // === 契約基本情報 ===
    private ContractType type;
    private ContractNumber contractNumber;
    private ContractTitle title;
    private ContractTerms terms;
    
    // === 期間・金額 ===
    private ContractPeriod period;
    private ContractAmount amount;
    
    // === 署名管理 ===
    private List<DigitalSignature> signatures;
    private ContractStatus status;
    
    // === テンプレート情報 ===
    private ContractTemplateId templateId;
    private ContractVersion version;
    
    // === 外部サービス連携 ===
    private CloudSignDocumentId cloudSignDocumentId;
    private String documentUrl;
    
    // === 管理情報 ===
    private UserId createdBy;
    private LocalDateTime createdAt;
    private AuditInfo auditInfo;
    
    // === ビジネスルール ===
    
    /**
     * Matching結果からの契約書作成
     * - マッチング結果が有効である必要がある
     * - 適切なテンプレートが存在する必要がある
     */
    public static Contract createFromMatching(
            CandidateSelected event,
            ContractTemplate template,
            UserId createdBy) {
        
        if (template == null) {
            throw new BusinessRuleViolationException("契約テンプレートが必要です");
        }
        
        Contract contract = new Contract();
        contract.id = ContractId.generate();
        contract.projectId = event.getProjectId();
        contract.engineerIds = Arrays.asList(event.getSelectedEngineerId());
        contract.type = ContractType.EMPLOYMENT_AGREEMENT; // デフォルト
        contract.contractNumber = ContractNumber.generate();
        contract.templateId = template.getId();
        contract.version = ContractVersion.initial();
        contract.status = ContractStatus.DRAFT;
        contract.createdBy = createdBy;
        contract.createdAt = LocalDateTime.now();
        contract.signatures = new ArrayList<>();
        
        // 契約作成イベント
        DomainEventPublisher.publish(new ContractCreated(
            contract.id, contract.projectId, contract.engineerIds));
            
        return contract;
    }
    
    /**
     * 契約条件の設定
     * - ドラフト状態でのみ変更可能
     */
    public void setTerms(ContractTerms terms) {
        if (this.status != ContractStatus.DRAFT) {
            throw new BusinessRuleViolationException("ドラフト状態でのみ条件変更可能です");
        }
        if (terms == null || !terms.isValid()) {
            throw new BusinessRuleViolationException("有効な契約条件が必要です");
        }
        
        this.terms = terms;
        this.period = terms.getContractPeriod();
        this.amount = terms.getContractAmount();
        
        // 条件設定イベント
        DomainEventPublisher.publish(new ContractTermsSet(this.id, terms));
    }
    
    /**
     * 署名依頼開始
     * - ドラフト状態からのみ開始可能
     * - 契約条件が設定済みである必要がある
     */
    public void requestSignature(CloudSignIntegrationService cloudSignService) {
        if (this.status != ContractStatus.DRAFT) {
            throw new BusinessRuleViolationException("署名依頼はドラフト状態からのみ可能です");
        }
        if (this.terms == null || !this.terms.isValid()) {
            throw new BusinessRuleViolationException("契約条件が設定されていません");
        }
        
        // CloudSignでドキュメント作成
        CloudSignDocument document = cloudSignService.createDocument(this);
        this.cloudSignDocumentId = document.getId();
        this.documentUrl = document.getUrl();
        
        // 署名者情報設定
        initializeSignatures();
        
        this.status = ContractStatus.PENDING_SIGNATURE;
        
        // 署名依頼開始イベント
        DomainEventPublisher.publish(new SignatureRequested(
            this.id, this.projectId, this.cloudSignDocumentId));
    }
    
    /**
     * 署名完了処理
     * - CloudSignからのWebhookで呼び出される
     */
    public void completeSignature(SignatoryType signatoryType, String signedBy, LocalDateTime signedAt) {
        if (this.status != ContractStatus.PENDING_SIGNATURE) {
            throw new BusinessRuleViolationException("署名待ち状態でのみ署名完了処理可能です");
        }
        
        DigitalSignature signature = findSignature(signatoryType)
            .orElseThrow(() -> new BusinessRuleViolationException("指定された署名者が見つかりません"));
            
        signature.complete(signedBy, signedAt);
        
        // 全ての署名が完了したかチェック
        if (allSignaturesCompleted()) {
            this.status = ContractStatus.ACTIVE;
            
            // 契約署名完了イベント（Timesheet Contextへ）
            DomainEventPublisher.publish(new ContractSigned(
                this.id, this.projectId, this.engineerIds, this.period));
        }
    }
    
    /**
     * 契約キャンセル
     * - 署名完了後はキャンセル不可
     */
    public void cancel(String cancelReason) {
        if (this.status == ContractStatus.ACTIVE) {
            throw new BusinessRuleViolationException("署名完了後の契約はキャンセルできません");
        }
        
        this.status = ContractStatus.CANCELLED;
        
        // CloudSignでのドキュメントキャンセル処理が必要
        if (this.cloudSignDocumentId != null) {
            // 外部サービスにキャンセル通知
        }
        
        // 契約キャンセルイベント
        DomainEventPublisher.publish(new ContractCancelled(
            this.id, this.projectId, cancelReason));
    }
    
    /**
     * 契約期間延長
     * - 署名完了後のみ可能
     * - 新しい終了日は現在の終了日より後である必要がある
     */
    public void extendPeriod(LocalDate newEndDate, String extensionReason) {
        if (this.status != ContractStatus.ACTIVE) {
            throw new BusinessRuleViolationException("署名完了後のみ期間延長可能です");
        }
        if (newEndDate.isBefore(this.period.getEndDate())) {
            throw new BusinessRuleViolationException("延長後の終了日は現在の終了日より後である必要があります");
        }
        
        ContractPeriod oldPeriod = this.period;
        this.period = this.period.extendTo(newEndDate);
        
        // 期間延長イベント
        DomainEventPublisher.publish(new ContractExtended(
            this.id, this.projectId, oldPeriod, this.period, extensionReason));
    }
    
    /**
     * 契約終了
     * - アクティブ状態からのみ終了可能
     */
    public void terminate(LocalDate terminationDate, ContractTerminationReason reason) {
        if (this.status != ContractStatus.ACTIVE) {
            throw new BusinessRuleViolationException("アティブ状態のみ終了可能です");
        }
        if (terminationDate.isBefore(LocalDate.now())) {
            throw new BusinessRuleViolationException("終了日は未来日である必要があります");
        }
        
        this.status = ContractStatus.TERMINATED;
        
        // 契約終了イベント
        DomainEventPublisher.publish(new ContractTerminated(
            this.id, this.projectId, this.engineerIds, terminationDate, reason));
    }
    
    // === プライベートメソッド ===
    
    private void initializeSignatures() {
        // 顧客署名
        this.signatures.add(new DigitalSignature(
            SignatoryType.CUSTOMER,
            "customer@example.com", // 実際は顧客情報から取得
            SignatureStatus.PENDING
        ));
        
        // 受託会社署名
        this.signatures.add(new DigitalSignature(
            SignatoryType.CONTRACTOR,
            "contractor@ses-company.com", // 実際は会社情報から取得
            SignatureStatus.PENDING
        ));
        
        // 技術者署名（必要な場合）
        if (requiresEngineerSignature()) {
            this.signatures.add(new DigitalSignature(
                SignatoryType.ENGINEER,
                "engineer@example.com", // 実際は技術者情報から取得
                SignatureStatus.PENDING
            ));
        }
    }
    
    private boolean requiresEngineerSignature() {
        return this.type == ContractType.EMPLOYMENT_AGREEMENT;
    }
    
    private Optional<DigitalSignature> findSignature(SignatoryType signatoryType) {
        return signatures.stream()
            .filter(sig -> sig.getSignatoryType() == signatoryType)
            .findFirst();
    }
    
    private boolean allSignaturesCompleted() {
        return signatures.stream()
            .allMatch(sig -> sig.getStatus() == SignatureStatus.COMPLETED);
    }
    
    public boolean isActive() {
        return this.status == ContractStatus.ACTIVE;
    }
    
    public boolean isPeriodValid(LocalDate checkDate) {
        return this.period.contains(checkDate) && isActive();
    }
    
    public Money calculateMonthlyCost() {
        return this.amount.getMonthlyCost();
    }
}
```

### 2.2 値オブジェクト設計

#### ContractTerms（契約条件）
```java
@Embeddable
public class ContractTerms {
    // === 基本条件 ===
    private ContractType type;
    private WorkLocation workLocation;
    private WorkingHours workingHours;
    
    // === 期間・金額 ===
    private ContractPeriod contractPeriod;
    private ContractAmount contractAmount;
    
    // === 業務条件 ===
    private JobDescription jobDescription;
    private List<Responsibility> responsibilities;
    private PerformanceRequirements performanceRequirements;
    
    // === 法的条件 ===
    private ConfidentialityClause confidentialityClause;
    private IntellectualPropertyClause ipClause;
    private TerminationClause terminationClause;
    
    // === 特別条件 ===
    private List<SpecialClause> specialClauses;
    private RenewalClause renewalClause;
    
    public ContractTerms(ContractType type,
                        ContractPeriod period,
                        ContractAmount amount,
                        WorkLocation workLocation) {
        this.type = type;
        this.contractPeriod = period;
        this.contractAmount = amount;
        this.workLocation = workLocation;
        this.workingHours = WorkingHours.standard(); // デフォルト
        this.responsibilities = new ArrayList<>();
        this.specialClauses = new ArrayList<>();
    }
    
    /**
     * 条件の妥当性チェック
     */
    public boolean isValid() {
        return type != null &&
               contractPeriod != null && contractPeriod.isValid() &&
               contractAmount != null && contractAmount.isValid() &&
               workLocation != null &&
               workingHours != null &&
               jobDescription != null && !jobDescription.isEmpty();
    }
    
    /**
     * 特別条件の追加
     */
    public void addSpecialClause(SpecialClause clause) {
        if (clause == null || !clause.isValid()) {
            throw new IllegalArgumentException("有効な特別条件が必要です");
        }
        this.specialClauses.add(clause);
    }
    
    /**
     * 金額条件の更新
     */
    public void updateAmount(ContractAmount newAmount) {
        if (newAmount == null || !newAmount.isValid()) {
            throw new IllegalArgumentException("有効な金額条件が必要です");
        }
        this.contractAmount = newAmount;
    }
    
    /**
     * 法的条件の設定
     */
    public void setLegalClauses(ConfidentialityClause confidentiality,
                               IntellectualPropertyClause ip,
                               TerminationClause termination) {
        this.confidentialityClause = confidentiality;
        this.ipClause = ip;
        this.terminationClause = termination;
    }
}
```

#### DigitalSignature（電子署名）
```java
@Embeddable
public class DigitalSignature {
    private SignatoryType signatoryType;     // 署名者種別
    private String signatoryEmail;           // 署名者メール
    private String signatoryName;            // 署名者氏名
    
    private SignatureStatus status;          // 署名状態
    private LocalDateTime requestedAt;       // 署名依頼日時
    private LocalDateTime signedAt;          // 署名完了日時
    private String signedBy;                 // 実際の署名者
    
    // CloudSign連携情報
    private String cloudSignSignatureId;     // CloudSign署名者ID
    private String signatureUrl;             // 署名用URL
    
    public DigitalSignature(SignatoryType signatoryType, 
                           String signatoryEmail,
                           SignatureStatus status) {
        this.signatoryType = signatoryType;
        this.signatoryEmail = signatoryEmail;
        this.status = status;
        this.requestedAt = LocalDateTime.now();
    }
    
    /**
     * 署名依頼送信
     */
    public void sendRequest(String signatureUrl) {
        if (this.status != SignatureStatus.PENDING) {
            throw new IllegalStateException("署名依頼送信は待機状態でのみ可能です");
        }
        
        this.signatureUrl = signatureUrl;
        this.status = SignatureStatus.SENT;
    }
    
    /**
     * 署名完了処理
     */
    public void complete(String signedBy, LocalDateTime signedAt) {
        if (this.status != SignatureStatus.SENT) {
            throw new IllegalStateException("署名完了は送信状態でのみ可能です");
        }
        
        this.signedBy = signedBy;
        this.signedAt = signedAt;
        this.status = SignatureStatus.COMPLETED;
    }
    
    /**
     * 署名拒否処理
     */
    public void reject(String rejectionReason) {
        if (this.status == SignatureStatus.COMPLETED) {
            throw new IllegalStateException("完了済みの署名は拒否できません");
        }
        
        this.status = SignatureStatus.REJECTED;
    }
    
    /**
     * 署名必要性判定
     */
    public boolean isRequired() {
        return this.status != SignatureStatus.NOT_REQUIRED;
    }
    
    /**
     * 署名期限チェック
     */
    public boolean isExpired(int expireDays) {
        if (this.requestedAt == null) {
            return false;
        }
        return this.requestedAt.plusDays(expireDays).isBefore(LocalDateTime.now());
    }
    
    public enum SignatoryType {
        CUSTOMER("顧客"),
        CONTRACTOR("受託会社"),
        ENGINEER("技術者"),
        GUARANTOR("連帯保証人");
        
        private final String displayName;
        
        SignatoryType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum SignatureStatus {
        PENDING("待機"),
        SENT("送信済"),
        COMPLETED("完了"),
        REJECTED("拒否"),
        NOT_REQUIRED("署名不要");
        
        private final String displayName;
        
        SignatureStatus(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### ContractPeriod（契約期間）
```java
@Embeddable
public class ContractPeriod {
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean isIndefinite;      // 期間の定めなし
    private RenewalType renewalType;   // 更新種別
    
    public ContractPeriod(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("開始日と終了日が必要です");
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("開始日は終了日より前である必要があります");
        }
        
        this.startDate = startDate;
        this.endDate = endDate;
        this.isIndefinite = false;
        this.renewalType = RenewalType.MANUAL;
    }
    
    /**期間の定めなし契約のコンストラクタ*/
    public static ContractPeriod indefinite(LocalDate startDate) {
        ContractPeriod period = new ContractPeriod(startDate, LocalDate.MAX);
        period.isIndefinite = true;
        return period;
    }
    
    /**
     * 期間延長
     */
    public ContractPeriod extendTo(LocalDate newEndDate) {
        if (newEndDate.isBefore(this.endDate)) {
            throw new IllegalArgumentException("延長後の終了日は現在より後である必要があります");
        }
        
        return new ContractPeriod(this.startDate, newEndDate);
    }
    
    /**
     * 指定日が契約期間内かチェック
     */
    public boolean contains(LocalDate date) {
        return !date.isBefore(startDate) && !date.isAfter(endDate);
    }
    
    /**
     * 契約期間の月数計算
     */
    public int getMonths() {
        return (int) ChronoUnit.MONTHS.between(startDate, endDate);
    }
    
    /**
     * 更新可否判定
     */
    public boolean isRenewable() {
        return renewalType != RenewalType.NON_RENEWABLE;
    }
    
    /**
     * 更新通知タイミング判定
     */
    public boolean shouldNotifyRenewal(int notificationDays) {
        return LocalDate.now().isAfter(endDate.minusDays(notificationDays));
    }
    
    public boolean isValid() {
        return startDate != null && endDate != null && !startDate.isAfter(endDate);
    }
    
    public enum RenewalType {
        MANUAL("手動更新"),
        AUTOMATIC("自動更新"),
        NON_RENEWABLE("更新不可");
        
        private final String displayName;
        
        RenewalType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### ContractAmount（契約金額）
```java
@Embeddable
public class ContractAmount {
    private Money monthlyCost;          // 月額単価
    private Money hourlyRate;           // 時間単価
    private Money totalAmount;          // 総額（計算値）
    
    private PricingType pricingType;    // 料金体系
    private PaymentTerms paymentTerms;  // 支払条件
    private TaxInclusionType taxType;   // 税込/税別
    
    // 特別料金
    private Money overtimeRate;         // 残業料金
    private Money holidayRate;          // 休日料金
    private List<AllowanceItem> allowances; // 手当一覧
    
    public ContractAmount(PricingType pricingType, Money baseAmount) {
        this.pricingType = pricingType;
        this.taxType = TaxInclusionType.EXCLUSIVE;
        this.allowances = new ArrayList<>();
        
        switch (pricingType) {
            case MONTHLY:
                this.monthlyCost = baseAmount;
                this.hourlyRate = calculateHourlyRate(baseAmount);
                break;
            case HOURLY:
                this.hourlyRate = baseAmount;
                this.monthlyCost = calculateMonthlyCost(baseAmount);
                break;
            default:
                throw new IllegalArgumentException("サポートされていない料金体系です");
        }
        
        // 特別料金のデフォルト設定
        this.overtimeRate = this.hourlyRate.multiply(1.25); // 25%割増
        this.holidayRate = this.hourlyRate.multiply(1.35);  // 35%割増
    }
    
    /**
     * 月額から時間単価を算出（160時間/月で計算）
     */
    private Money calculateHourlyRate(Money monthlyCost) {
        return monthlyCost.divide(160); // 標準的な月間労働時間
    }
    
    /**
     * 時間単価から月額を算出
     */
    private Money calculateMonthlyCost(Money hourlyRate) {
        return hourlyRate.multiply(160);
    }
    
    /**
     * 総額計算（期間を指定）
     */
    public Money calculateTotalAmount(ContractPeriod period) {
        int months = period.getMonths();
        return this.monthlyCost.multiply(months);
    }
    
    /**
     * 手当追加
     */
    public void addAllowance(AllowanceItem allowance) {
        if (allowance != null && allowance.isValid()) {
            this.allowances.add(allowance);
        }
    }
    
    /**
     * 手当込み月額計算
     */
    public Money getMonthlyCostWithAllowances() {
        Money totalAllowances = allowances.stream()
            .map(AllowanceItem::getAmount)
            .reduce(Money.ZERO, Money::add);
        return this.monthlyCost.add(totalAllowances);
    }
    
    /**
     * 税込み金額計算
     */
    public Money getMonthlyCostWithTax() {
        Money baseAmount = getMonthlyCostWithAllowances();
        if (taxType == TaxInclusionType.EXCLUSIVE) {
            return baseAmount.add(baseAmount.multiply(0.10)); // 10%消費税
        }
        return baseAmount;
    }
    
    public boolean isValid() {
        return monthlyCost != null && monthlyCost.isPositive() &&
               hourlyRate != null && hourlyRate.isPositive() &&
               pricingType != null;
    }
    
    public enum PricingType {
        MONTHLY("月額固定"),
        HOURLY("時間単価"),
        PROJECT("プロジェクト単価");
        
        private final String displayName;
        
        PricingType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum TaxInclusionType {
        INCLUSIVE("税込"),
        EXCLUSIVE("税別");
        
        private final String displayName;
        
        TaxInclusionType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.3 エンティティ設計

#### ContractTemplate（契約テンプレート）
```java
@Entity
@Table(name = "contract_templates")
public class ContractTemplate {
    @Id
    private ContractTemplateId id;
    
    private String templateName;
    private ContractType applicableType;
    private TemplateVersion version;
    private String templateContent;      // テンプレート本文
    
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserId createdBy;
    
    // テンプレート変数
    private List<TemplateVariable> variables;
    
    /**
     * テンプレートから契約書生成
     */
    public String generateContractDocument(Contract contract) {
        if (!isActive) {
            throw new IllegalStateException("非アクティブなテンプレートです");
        }
        if (contract.getType() != this.applicableType) {
            throw new IllegalArgumentException("テンプレートの種別が一致しません");
        }
        
        String document = this.templateContent;
        
        // テンプレート変数を実際の値で置換
        for (TemplateVariable variable : variables) {
            String value = variable.extractValue(contract);
            document = document.replace(variable.getPlaceholder(), value);
        }
        
        return document;
    }
    
    /**
     * テンプレートの新バージョン作成
     */
    public ContractTemplate createNewVersion(String newContent, UserId updatedBy) {
        ContractTemplate newTemplate = new ContractTemplate();
        newTemplate.templateName = this.templateName;
        newTemplate.applicableType = this.applicableType;
        newTemplate.version = this.version.increment();
        newTemplate.templateContent = newContent;
        newTemplate.isActive = false; // 新バージョンは非アクティブで作成
        newTemplate.createdBy = updatedBy;
        newTemplate.createdAt = LocalDateTime.now();
        
        return newTemplate;
    }
    
    /**
     * テンプレートをアクティブに設定
     */
    public void activate() {
        this.isActive = true;
        this.updatedAt = LocalDateTime.now();
    }
    
    public void deactivate() {
        this.isActive = false;
        this.updatedAt = LocalDateTime.now();
    }
}
```

## 3. ドメインサービス

### 3.1 ContractDomainService
```java
@DomainService
public class ContractDomainService {
    
    private final ContractTemplateRepository templateRepository;
    private final CloudSignIntegrationService cloudSignService;
    
    /**
     * マッチング結果から契約書自動作成
     */
    public Contract createContractFromMatching(CandidateSelected event, UserId createdBy) {
        // 適切なテンプレートを取得
        ContractTemplate template = determineTemplate(event);
        
        // 契約作成
        Contract contract = Contract.createFromMatching(event, template, createdBy);
        
        // 基本条件設定
        ContractTerms terms = generateDefaultTerms(event);
        contract.setTerms(terms);
        
        return contract;
    }
    
    /**
     * テンプレート選択ロジック
     */
    private ContractTemplate determineTemplate(CandidateSelected event) {
        // Projectの種別や顧客特性に応じてテンプレートを選択
        ContractType contractType = determineContractType(event);
        
        return templateRepository.findActiveByType(contractType)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "適切な契約テンプレートが見つかりません"));
    }
    
    private ContractType determineContractType(CandidateSelected event) {
        // デフォルトは準委任契約
        return ContractType.EMPLOYMENT_AGREEMENT;
    }
    
    /**
     * デフォルト条件生成
     */
    private ContractTerms generateDefaultTerms(CandidateSelected event) {
        // Project情報から基本条件を抜出
        ProjectPeriod projectPeriod = getProjectPeriod(event.getProjectId());
        Money estimatedCost = getEstimatedCost(event.getSelectedEngineerId());
        
        ContractPeriod contractPeriod = new ContractPeriod(
            projectPeriod.getEstimatedStartDate(),
            projectPeriod.getEstimatedEndDate()
        );
        
        ContractAmount contractAmount = new ContractAmount(
            ContractAmount.PricingType.MONTHLY,
            estimatedCost
        );
        
        return new ContractTerms(
            ContractType.EMPLOYMENT_AGREEMENT,
            contractPeriod,
            contractAmount,
            WorkLocation.CLIENT_SITE // デフォルト
        );
    }
    
    /**
     * 契約書の一括署名依頼
     */
    public void requestBulkSignature(List<Contract> contracts) {
        for (Contract contract : contracts) {
            if (contract.getStatus() == ContractStatus.DRAFT) {
                contract.requestSignature(cloudSignService);
            }
        }
    }
    
    /**
     * 契約期限チェックと通知
     */
    public List<Contract> checkExpiringContracts(int notificationDays) {
        return contractRepository.findActiveContracts().stream()
            .filter(contract -> {
                ContractPeriod period = contract.getTerms().getContractPeriod();
                return period.shouldNotifyRenewal(notificationDays);
            })
            .collect(toList());
    }
}
```

### 3.2 CloudSignIntegrationService
```java
@ExternalService
public class CloudSignIntegrationService {
    
    private final CloudSignApiClient apiClient;
    
    /**
     * CloudSignでドキュメント作成
     */
    public CloudSignDocument createDocument(Contract contract) {
        // テンプレートからドキュメント生成
        String documentContent = generateDocumentContent(contract);
        
        CreateDocumentRequest request = CreateDocumentRequest.builder()
            .title(contract.getTitle())
            .content(documentContent)
            .signatories(createSignatories(contract))
            .build();
            
        CloudSignApiResponse response = apiClient.createDocument(request);
        
        return new CloudSignDocument(
            response.getDocumentId(),
            response.getDocumentUrl(),
            response.getSignatoryUrls()
        );
    }
    
    /**
     * 署名者情報作成
     */
    private List<CloudSignSignatory> createSignatories(Contract contract) {
        List<CloudSignSignatory> signatories = new ArrayList<>();
        
        // 顧客署名者
        signatories.add(new CloudSignSignatory(
            "customer",
            getCustomerEmail(contract.getCustomerId()),
            SignatoryRole.SIGNER
        ));
        
        // 受託会社署名者
        signatories.add(new CloudSignSignatory(
            "contractor",
            getCompanyEmail(contract.getContractorCompanyId()),
            SignatoryRole.SIGNER
        ));
        
        // 技術者署名者（必要な場合）
        if (contract.requiresEngineerSignature()) {
            signatories.add(new CloudSignSignatory(
                "engineer",
                getEngineerEmail(contract.getEngineerIds().get(0)),
                SignatoryRole.SIGNER
            ));
        }
        
        return signatories;
    }
    
    /**
     * CloudSign Webhook処理
     */
    @EventListener
    public void handleSignatureCompleted(CloudSignWebhookEvent event) {
        if (event.getEventType() == CloudSignEventType.SIGNATURE_COMPLETED) {
            ContractId contractId = extractContractId(event.getDocumentId());
            
            Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new EntityNotFoundException("契約が見つかりません"));
                
            SignatoryType signatoryType = mapToSignatoryType(event.getSignatoryId());
            
            contract.completeSignature(
                signatoryType,
                event.getSignedBy(),
                event.getSignedAt()
            );
            
            contractRepository.save(contract);
        }
    }
}
```

## 4. リポジトリインターフェース

### 4.1 ContractRepository
```java
public interface ContractRepository {
    
    // === 基本CRUD ===
    void save(Contract contract);
    Optional<Contract> findById(ContractId id);
    void delete(ContractId id);
    
    // === ステータス検索 ===
    List<Contract> findByStatus(ContractStatus status);
    List<Contract> findActiveContracts();
    List<Contract> findPendingSignatureContracts();
    
    // === プロジェクト・技術者検索 ===
    Optional<Contract> findByProjectId(ProjectId projectId);
    List<Contract> findByEngineerId(EngineerId engineerId);
    List<Contract> findByCustomerId(CustomerId customerId);
    
    // === 期間検索 ===
    List<Contract> findByPeriodOverlap(LocalDate startDate, LocalDate endDate);
    List<Contract> findExpiringContracts(LocalDate beforeDate);
    
    // === CloudSign連携 ===
    Optional<Contract> findByCloudSignDocumentId(CloudSignDocumentId documentId);
    
    // === 統計・集計 ===
    long countByStatus(ContractStatus status);
    Money calculateTotalActiveAmount();
    
    // === ID生成 ===
    ContractId generateId();
}
```

### 4.2 ContractTemplateRepository
```java
public interface ContractTemplateRepository {
    void save(ContractTemplate template);
    Optional<ContractTemplate> findById(ContractTemplateId id);
    
    // === アクティブテンプレート検索 ===
    Optional<ContractTemplate> findActiveByType(ContractType type);
    List<ContractTemplate> findActiveTemplates();
    
    // === バージョン管理 ===
    List<ContractTemplate> findByTypeOrderByVersion(ContractType type);
    Optional<ContractTemplate> findLatestVersion(ContractType type);
    
    ContractTemplateId generateId();
}
```

## 5. ドメインイベント

### 5.1 ContractSigned
```java
public class ContractSigned implements DomainEvent {
    private final ContractId contractId;
    private final ProjectId projectId;
    private final List<EngineerId> engineerIds;
    private final ContractPeriod period;
    private final LocalDateTime occurredAt;
    
    // Timesheet Contextが購読
    // → 工数管理開始処理
}
```

### 5.2 ContractExtended
```java
public class ContractExtended implements DomainEvent {
    private final ContractId contractId;
    private final ProjectId projectId;
    private final ContractPeriod oldPeriod;
    private final ContractPeriod newPeriod;
    private final String extensionReason;
    private final LocalDateTime occurredAt;
    
    // Timesheet Contextが購読
    // → 工数管理期間更新
}
```

### 5.3 ContractTerminated
```java
public class ContractTerminated implements DomainEvent {
    private final ContractId contractId;
    private final ProjectId projectId;
    private final List<EngineerId> engineerIds;
    private final LocalDate terminationDate;
    private final ContractTerminationReason reason;
    private final LocalDateTime occurredAt;
    
    // Timesheet Contextが購読
    // → 工数管理終了処理
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **契約作成制約**
   - 有効なマッチング結果からのみ作成可能
   - 適切なテンプレートの存在が必須
   - 契約条件の妥当性チェック

2. **署名プロセス制約**
   - ドラフト状態からのみ署名依頼可能
   - 全署名者の署名完了でアクティブ化
   - 署名完了後のキャンセル禁止

3. **期間管理制約**
   - 開始日 < 終了日の必須条件
   - 期間延長は現在の終了日より後のみ
   - 終了日は未来日のみ設定可能

## 7. パフォーマンス考慮事項

### 7.1 遅延読み込み
- `signatures`は遅延読み込み
- `terms.specialClauses`は遅延読み込み

### 7.2 インデックス設計
- `status`カラムにインデックス
- `project_id`カラムにインデックス
- `engineer_ids`配列カラムにインデックス
- `cloudsign_document_id`カラムにインデックス
- 複合インデックス：`(status, period_end_date)`

### 7.3 外部API連携最適化
- CloudSign API呼び出しのリトライ処理
- Webhook処理の非同期化
- APIレスポンスのキャッシュ

---

**作成者**: システム化プロジェクトチーム