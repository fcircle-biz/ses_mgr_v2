# Billing集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 月次請求書の作成・発行・管理
- 支払処理と入金管理の一元化
- 会計システム連携と仕訳データ作成
- 請求サイクルの状態管理と追跡

### 1.2 境界
- **含むもの**: Invoice（集約ルート）、BillingItem、Payment、AccountingEntry
- **含まないもの**: 工数表詳細情報、契約詳細情報、技術者個人情報

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Invoice（集約ルート）

```java
@Entity
@Table(name = "invoices")
public class Invoice {
    // === 識別子 ===
    @Id
    private InvoiceId id;
    
    // === 関連エンティティ ===
    private CustomerId customerId;
    private ContractId contractId;
    private List<TimesheetId> timesheetIds;
    private ProjectId projectId;
    
    // === 請求基本情報 ===
    private InvoiceNumber invoiceNumber;
    private YearMonth billingPeriod;
    private LocalDate issueDate;
    private LocalDate dueDate;
    
    // === 請求内容 ===
    private List<BillingItem> billingItems;
    private InvoiceAmount amount;
    private TaxCalculation taxCalculation;
    
    // === ステータス管理 ===
    private InvoiceStatus status;
    private InvoiceType type;  // 通常/修正/キャンセル
    
    // === 支払情報 ===
    private List<Payment> payments;
    private Money paidAmount;
    private Money remainingAmount;
    
    // === 会計連携 ===
    private List<AccountingEntry> accountingEntries;
    private boolean isAccountingSynced;
    
    // === ドキュメント情報 ===
    private String invoiceDocumentUrl;
    private String invoiceDocumentPath;
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    private UserId createdBy;
    private LocalDateTime createdAt;
    
    // === ビジネスルール ===
    
    /**
     * 工数表承認からの請求書作成
     * - 承認済み工数表が必要
     * - 同一期間の請求書が存在しないこと
     * - 有効な契約が存在すること
     */
    public static Invoice createFromTimesheet(
            TimesheetApproved event,
            Contract contract,
            UserId createdBy) {
        
        if (contract == null || !contract.isActive()) {
            throw new BusinessRuleViolationException("有効な契約が存在しません");
        }
        
        Invoice invoice = new Invoice();
        invoice.id = InvoiceId.generate();
        invoice.invoiceNumber = InvoiceNumber.generate(event.getPeriod());
        invoice.customerId = contract.getCustomerId();
        invoice.contractId = event.getContractId();
        invoice.projectId = contract.getProjectId();
        invoice.timesheetIds = Arrays.asList(event.getTimesheetId());
        invoice.billingPeriod = event.getPeriod();
        invoice.status = InvoiceStatus.CALCULATING;
        invoice.type = InvoiceType.REGULAR;
        invoice.createdBy = createdBy;
        invoice.createdAt = LocalDateTime.now();
        invoice.billingItems = new ArrayList<>();
        invoice.payments = new ArrayList<>();
        invoice.accountingEntries = new ArrayList<>();
        invoice.paidAmount = Money.ZERO;
        invoice.isAccountingSynced = false;
        
        // 請求書作成イベント
        DomainEventPublisher.publish(new InvoiceCreated(
            invoice.id, invoice.customerId, invoice.billingPeriod));
            
        return invoice;
    }
    
    /**
     * 請求金額の算出
     * - 工数表データと契約条件から金額計算
     * - 税率適用と税額計算
     */
    public void calculateAmount(WorkHoursSummary workHoursSummary, ContractTerms contractTerms) {
        if (this.status != InvoiceStatus.CALCULATING) {
            throw new BusinessRuleViolationException("算出中状態でのみ金額算出可能です");
        }
        
        // 請求項目の作成
        createBillingItems(workHoursSummary, contractTerms);
        
        // 金額計算
        Money subtotal = calculateSubtotal();
        this.taxCalculation = new TaxCalculation(subtotal, TaxRate.current());
        Money taxAmount = this.taxCalculation.getTaxAmount();
        Money totalAmount = subtotal.add(taxAmount);
        
        this.amount = new InvoiceAmount(subtotal, taxAmount, totalAmount);
        this.remainingAmount = totalAmount;
        
        this.status = InvoiceStatus.CALCULATED;
        
        // 金額算出完了イベント
        DomainEventPublisher.publish(new InvoiceCalculated(
            this.id, this.amount, this.taxCalculation));
    }
    
    /**
     * 請求書の発行
     * - 金額算出完了後のみ発行可能
     * - 発行日と支払期限の設定
     */
    public void issue(LocalDate issueDate, int paymentTermDays) {
        if (this.status != InvoiceStatus.CALCULATED) {
            throw new BusinessRuleViolationException("金額算出完了後のみ発行可能です");
        }
        if (issueDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("発行日は未来日にできません");
        }
        if (paymentTermDays <= 0) {
            throw new IllegalArgumentException("支払期限は1日以上である必要があります");
        }
        
        this.issueDate = issueDate;
        this.dueDate = issueDate.plusDays(paymentTermDays);
        this.status = InvoiceStatus.ISSUED;
        
        // 請求書発行イベント
        DomainEventPublisher.publish(new InvoiceIssued(
            this.id, this.customerId, this.amount.getTotalAmount(), this.dueDate));
    }
    
    /**
     * 支払の記録
     * - 発行済み請求書のみ支払記録可能
     * - 支払金額の妥当性チェック
     */
    public void recordPayment(Money paymentAmount, LocalDate paymentDate, PaymentMethod method, String reference) {
        if (this.status != InvoiceStatus.ISSUED && this.status != InvoiceStatus.PARTIALLY_PAID) {
            throw new BusinessRuleViolationException("発行済み請求書のみ支払記録可能です");
        }
        if (paymentAmount.isNegativeOrZero()) {
            throw new IllegalArgumentException("支払金額は正の値である必要があります");
        }
        if (paymentAmount.isGreaterThan(this.remainingAmount)) {
            throw new BusinessRuleViolationException("支払金額が残金を超えています");
        }
        if (paymentDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("支払日は未来日にできません");
        }
        
        Payment payment = new Payment(
            PaymentId.generate(),
            paymentAmount,
            paymentDate,
            method,
            reference
        );
        this.payments.add(payment);
        
        // 支払累計と残金の更新
        this.paidAmount = this.paidAmount.add(paymentAmount);
        this.remainingAmount = this.amount.getTotalAmount().subtract(this.paidAmount);
        
        // ステータス更新
        if (this.remainingAmount.isZero()) {
            this.status = InvoiceStatus.PAID;
            
            // 完全支払イベント
            DomainEventPublisher.publish(new InvoiceFullyPaid(
                this.id, this.customerId, this.amount.getTotalAmount(), paymentDate));
        } else {
            this.status = InvoiceStatus.PARTIALLY_PAID;
            
            // 部分支払イベント
            DomainEventPublisher.publish(new InvoicePartiallyPaid(
                this.id, this.customerId, paymentAmount, this.remainingAmount));
        }
        
        // 支払記録イベント
        DomainEventPublisher.publish(new PaymentRecorded(
            this.id, payment.getId(), paymentAmount, paymentDate));
    }
    
    /**
     * 会計システムへの仕訳データ送信
     * - 発行済み請求書のみ送信可能
     * - 重複送信防止
     */
    public void syncToAccounting(MoneyForwardIntegrationService accountingService) {
        if (this.status != InvoiceStatus.ISSUED && 
            this.status != InvoiceStatus.PARTIALLY_PAID && 
            this.status != InvoiceStatus.PAID) {
            throw new BusinessRuleViolationException("発行済み請求書のみ会計連携可能です");
        }
        if (this.isAccountingSynced) {
            throw new BusinessRuleViolationException("既に会計システムと連携済みです");
        }
        
        // 仕訳エントリ作成
        AccountingEntry receivableEntry = createReceivableEntry();
        AccountingEntry salesEntry = createSalesEntry();
        
        this.accountingEntries.add(receivableEntry);
        this.accountingEntries.add(salesEntry);
        
        // 外部システムへの送信
        accountingService.syncInvoice(this);
        
        this.isAccountingSynced = true;
        
        // 会計連携完了イベント
        DomainEventPublisher.publish(new InvoiceAccountingSynced(
            this.id, this.accountingEntries));
    }
    
    /**
     * 請求書のキャンセル
     * - 発行前のみキャンセル可能
     * - 支払済みの請求書はキャンセル不可
     */
    public void cancel(String cancelReason) {
        if (this.status == InvoiceStatus.PAID || this.status == InvoiceStatus.PARTIALLY_PAID) {
            throw new BusinessRuleViolationException("支払済みの請求書はキャンセルできません");
        }
        if (this.isAccountingSynced) {
            throw new BusinessRuleViolationException("会計連携済みの請求書はキャンセルできません");
        }
        
        this.status = InvoiceStatus.CANCELLED;
        
        // キャンセルイベント
        DomainEventPublisher.publish(new InvoiceCancelled(
            this.id, this.customerId, cancelReason));
    }
    
    /**
     * 修正請求書の作成
     * - 発行済み請求書のみ修正可能
     * - 元の請求書はキャンセルされる
     */
    public Invoice createCorrectionInvoice(WorkHoursSummary correctedSummary, 
                                          ContractTerms contractTerms,
                                          String correctionReason,
                                          UserId createdBy) {
        if (this.status != InvoiceStatus.ISSUED) {
            throw new BusinessRuleViolationException("発行済み請求書のみ修正可能です");
        }
        
        Invoice correctionInvoice = new Invoice();
        correctionInvoice.id = InvoiceId.generate();
        correctionInvoice.invoiceNumber = InvoiceNumber.generateCorrection(this.invoiceNumber);
        correctionInvoice.customerId = this.customerId;
        correctionInvoice.contractId = this.contractId;
        correctionInvoice.projectId = this.projectId;
        correctionInvoice.timesheetIds = this.timesheetIds;
        correctionInvoice.billingPeriod = this.billingPeriod;
        correctionInvoice.type = InvoiceType.CORRECTION;
        correctionInvoice.status = InvoiceStatus.CALCULATING;
        correctionInvoice.createdBy = createdBy;
        correctionInvoice.createdAt = LocalDateTime.now();
        
        // 修正金額算出
        correctionInvoice.calculateAmount(correctedSummary, contractTerms);
        
        // 元の請求書をキャンセル
        this.cancel("修正請求書作成のため");
        
        // 修正請求書作成イベント
        DomainEventPublisher.publish(new CorrectionInvoiceCreated(
            correctionInvoice.id, this.id, correctionReason));
            
        return correctionInvoice;
    }
    
    // === プライベートメソッド ===
    
    private void createBillingItems(WorkHoursSummary workHoursSummary, ContractTerms contractTerms) {
        ContractAmount contractAmount = contractTerms.getContractAmount();
        
        // 基本労働時間
        if (workHoursSummary.getBasicWorkingHours() > 0) {
            BillingItem basicItem = new BillingItem(
                BillingItemType.BASIC_WORK,
                "基本労働",
                workHoursSummary.getBasicWorkingHours(),
                "hours",
                contractAmount.getHourlyRate(),
                contractAmount.getHourlyRate().multiply(workHoursSummary.getBasicWorkingHours())
            );
            this.billingItems.add(basicItem);
        }
        
        // 残業時間
        if (workHoursSummary.getTotalOvertimeHours() > 0) {
            BillingItem overtimeItem = new BillingItem(
                BillingItemType.OVERTIME,
                "時間外労働",
                workHoursSummary.getTotalOvertimeHours(),
                "hours",
                contractAmount.getOvertimeRate(),
                contractAmount.getOvertimeRate().multiply(workHoursSummary.getTotalOvertimeHours())
            );
            this.billingItems.add(overtimeItem);
        }
        
        // 休日勤務
        if (workHoursSummary.getHolidayWorkHours() > 0) {
            BillingItem holidayItem = new BillingItem(
                BillingItemType.HOLIDAY_WORK,
                "休日勤務",
                workHoursSummary.getHolidayWorkHours(),
                "hours",
                contractAmount.getHolidayRate(),
                contractAmount.getHolidayRate().multiply(workHoursSummary.getHolidayWorkHours())
            );
            this.billingItems.add(holidayItem);
        }
        
        // 特別作業
        if (workHoursSummary.getTotalSpecialWorkHours() > 0) {
            BillingItem specialItem = new BillingItem(
                BillingItemType.SPECIAL_WORK,
                "特別作業",
                workHoursSummary.getTotalSpecialWorkHours(),
                "hours",
                contractAmount.getHourlyRate().multiply(1.5), // 50%割増
                contractAmount.getHourlyRate().multiply(1.5).multiply(workHoursSummary.getTotalSpecialWorkHours())
            );
            this.billingItems.add(specialItem);
        }
    }
    
    private Money calculateSubtotal() {
        return billingItems.stream()
            .map(BillingItem::getAmount)
            .reduce(Money.ZERO, Money::add);
    }
    
    private AccountingEntry createReceivableEntry() {
        return new AccountingEntry(
            AccountingEntryType.RECEIVABLE,
            "売上債権",
            this.amount.getTotalAmount(),
            AccountingSide.DEBIT
        );
    }
    
    private AccountingEntry createSalesEntry() {
        return new AccountingEntry(
            AccountingEntryType.SALES,
            "売上高",
            this.amount.getSubtotal(),
            AccountingSide.CREDIT
        );
    }
    
    // === ゲッターメソッド ===
    
    public boolean isOverdue() {
        return this.status == InvoiceStatus.ISSUED && 
               this.dueDate != null && 
               LocalDate.now().isAfter(this.dueDate);
    }
    
    public boolean isPaid() {
        return this.status == InvoiceStatus.PAID;
    }
    
    public boolean canBeCancelled() {
        return this.status != InvoiceStatus.PAID && 
               this.status != InvoiceStatus.PARTIALLY_PAID &&
               !this.isAccountingSynced;
    }
    
    public int getDaysOverdue() {
        if (!isOverdue()) {
            return 0;
        }
        return (int) ChronoUnit.DAYS.between(this.dueDate, LocalDate.now());
    }
    
    public float getPaymentRate() {
        if (this.amount == null || this.amount.getTotalAmount().isZero()) {
            return 0.0f;
        }
        return this.paidAmount.divide(this.amount.getTotalAmount()).floatValue();
    }
}
```

### 2.2 値オブジェクト設計

#### BillingItem（請求項目）
```java
@Embeddable
public class BillingItem {
    private BillingItemType type;
    private String description;
    private int quantity;
    private String unit;
    private Money unitPrice;
    private Money amount;
    
    // 税計算情報
    private TaxCategory taxCategory;
    private TaxRate applicableTaxRate;
    
    public BillingItem(BillingItemType type,
                      String description,
                      int quantity,
                      String unit,
                      Money unitPrice,
                      Money amount) {
        this.type = type;
        this.description = description;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.amount = amount;
        this.taxCategory = TaxCategory.STANDARD;
        this.applicableTaxRate = TaxRate.current();
    }
    
    /**
     * 項目別税額計算
     */
    public Money calculateTaxAmount() {
        return this.amount.multiply(this.applicableTaxRate.getRate());
    }
    
    /**
     * 税込み金額計算
     */
    public Money calculateAmountWithTax() {
        return this.amount.add(calculateTaxAmount());
    }
    
    /**
     * 単価の妥当性チェック
     */
    public boolean validateUnitPrice() {
        Money calculatedAmount = unitPrice.multiply(quantity);
        return calculatedAmount.equals(this.amount);
    }
    
    public enum BillingItemType {
        BASIC_WORK("基本労働"),
        OVERTIME("時間外労働"),
        HOLIDAY_WORK("休日勤務"),
        NIGHT_WORK("深夜勤務"),
        SPECIAL_WORK("特別作業"),
        TRAVEL_EXPENSE("交通費"),
        MATERIAL_COST("材料費"),
        OTHER("その他");
        
        private final String displayName;
        
        BillingItemType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum TaxCategory {
        STANDARD("標準税率"),
        REDUCED("軽減税率"),
        EXEMPT("非課税");
        
        private final String displayName;
        
        TaxCategory(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### InvoiceAmount（請求金額）
```java
@Embeddable
public class InvoiceAmount {
    private Money subtotal;        // 小計（税抜）
    private Money taxAmount;       // 消費税額
    private Money totalAmount;     // 合計（税込）
    
    // 割引情報
    private Money discountAmount;  // 割引額
    private String discountReason; // 割引理由
    
    // 調整情報
    private Money adjustmentAmount; // 調整額
    private String adjustmentReason; // 調整理由
    
    public InvoiceAmount(Money subtotal, Money taxAmount, Money totalAmount) {
        this.subtotal = subtotal;
        this.taxAmount = taxAmount;
        this.totalAmount = totalAmount;
        this.discountAmount = Money.ZERO;
        this.adjustmentAmount = Money.ZERO;
    }
    
    /**
     * 割引適用
     */
    public InvoiceAmount applyDiscount(Money discountAmount, String reason) {
        if (discountAmount.isNegative()) {
            throw new IllegalArgumentException("割引額は正の値である必要があります");
        }
        if (discountAmount.isGreaterThan(this.subtotal)) {
            throw new IllegalArgumentException("割引額が小計を超えています");
        }
        
        Money newSubtotal = this.subtotal.subtract(discountAmount);
        Money newTaxAmount = this.taxAmount.multiply(
            newSubtotal.divide(this.subtotal).floatValue());
        Money newTotalAmount = newSubtotal.add(newTaxAmount);
        
        InvoiceAmount discountedAmount = new InvoiceAmount(newSubtotal, newTaxAmount, newTotalAmount);
        discountedAmount.discountAmount = discountAmount;
        discountedAmount.discountReason = reason;
        
        return discountedAmount;
    }
    
    /**
     * 調整適用（プラス・マイナス両方可能）
     */
    public InvoiceAmount applyAdjustment(Money adjustmentAmount, String reason) {
        Money newSubtotal = this.subtotal.add(adjustmentAmount);
        Money newTaxAmount = this.taxAmount;
        Money newTotalAmount = newSubtotal.add(newTaxAmount);
        
        InvoiceAmount adjustedAmount = new InvoiceAmount(newSubtotal, newTaxAmount, newTotalAmount);
        adjustedAmount.discountAmount = this.discountAmount;
        adjustedAmount.discountReason = this.discountReason;
        adjustedAmount.adjustmentAmount = adjustmentAmount;
        adjustedAmount.adjustmentReason = reason;
        
        return adjustedAmount;
    }
    
    /**
     * 金額の妥当性チェック
     */
    public boolean isValid() {
        Money calculatedTotal = subtotal.add(taxAmount);
        return calculatedTotal.equals(totalAmount);
    }
    
    /**
     * 税率計算の妥当性チェック
     */
    public boolean isTaxCalculationCorrect(TaxRate expectedTaxRate) {
        Money expectedTaxAmount = subtotal.multiply(expectedTaxRate.getRate());
        return expectedTaxAmount.equals(this.taxAmount);
    }
}
```

#### Payment（支払）
```java
@Embeddable
public class Payment {
    private PaymentId id;
    private Money amount;
    private LocalDate paymentDate;
    private PaymentMethod method;
    private String reference;          // 振込番号など
    
    // 支払詳細情報
    private String bankName;           // 支払元銀行
    private String accountNumber;      // 支払元口座
    private String payerName;          // 支払者名
    
    // 處理情報
    private PaymentStatus status;
    private LocalDateTime processedAt;
    private UserId processedBy;
    
    public Payment(PaymentId id,
                  Money amount,
                  LocalDate paymentDate,
                  PaymentMethod method,
                  String reference) {
        this.id = id;
        this.amount = amount;
        this.paymentDate = paymentDate;
        this.method = method;
        this.reference = reference;
        this.status = PaymentStatus.RECORDED;
        this.processedAt = LocalDateTime.now();
    }
    
    /**
     * 支払確認
     */
    public void confirm(UserId confirmedBy) {
        if (this.status != PaymentStatus.RECORDED) {
            throw new IllegalStateException("記録済みの支払のみ確認可能です");
        }
        
        this.status = PaymentStatus.CONFIRMED;
        this.processedBy = confirmedBy;
        this.processedAt = LocalDateTime.now();
    }
    
    /**
     * 支払取消
     */
    public void cancel(String cancelReason) {
        if (this.status == PaymentStatus.CONFIRMED) {
            throw new IllegalStateException("確認済みの支払は取消できません");
        }
        
        this.status = PaymentStatus.CANCELLED;
    }
    
    /**
     * 支払方法の妥当性チェック
     */
    public boolean isValidPaymentMethod() {
        switch (this.method) {
            case BANK_TRANSFER:
                return bankName != null && !bankName.trim().isEmpty();
            case CREDIT_CARD:
                return reference != null && reference.length() >= 4;
            case CASH:
                return true;
            default:
                return false;
        }
    }
    
    public enum PaymentMethod {
        BANK_TRANSFER("銀行振込"),
        CREDIT_CARD("クレジットカード"),
        CASH("現金"),
        CHECK("小切手"),
        ELECTRONIC("電子マネー");
        
        private final String displayName;
        
        PaymentMethod(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum PaymentStatus {
        RECORDED("記録済"),
        CONFIRMED("確認済"),
        CANCELLED("取消");
        
        private final String displayName;
        
        PaymentStatus(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### TaxCalculation（税金計算）
```java
@Embeddable
public class TaxCalculation {
    private Money taxableAmount;     // 課税対象金額
    private TaxRate taxRate;         // 適用税率
    private Money taxAmount;         // 税額
    private TaxRoundingMethod roundingMethod; // 税額端数処理
    
    // 税率変更履歴
    private LocalDate taxRateEffectiveDate;
    
    public TaxCalculation(Money taxableAmount, TaxRate taxRate) {
        this.taxableAmount = taxableAmount;
        this.taxRate = taxRate;
        this.roundingMethod = TaxRoundingMethod.ROUND_DOWN; // 切り捨て
        this.taxRateEffectiveDate = LocalDate.now();
        
        // 税額計算
        this.taxAmount = calculateTaxAmount();
    }
    
    /**
     * 税額計算
     */
    private Money calculateTaxAmount() {
        BigDecimal taxableAmountDecimal = this.taxableAmount.getAmount();
        BigDecimal rateDecimal = BigDecimal.valueOf(this.taxRate.getRate());
        BigDecimal calculatedTax = taxableAmountDecimal.multiply(rateDecimal);
        
        // 端数処理
        BigDecimal roundedTax = applyRounding(calculatedTax);
        
        return new Money(roundedTax);
    }
    
    /**
     * 端数処理適用
     */
    private BigDecimal applyRounding(BigDecimal amount) {
        switch (this.roundingMethod) {
            case ROUND_UP:
                return amount.setScale(0, RoundingMode.CEILING);
            case ROUND_DOWN:
                return amount.setScale(0, RoundingMode.FLOOR);
            case ROUND_HALF_UP:
                return amount.setScale(0, RoundingMode.HALF_UP);
            default:
                return amount.setScale(0, RoundingMode.FLOOR);
        }
    }
    
    /**
     * 税率変更時の再計算
     */
    public TaxCalculation recalculateWithNewRate(TaxRate newTaxRate) {
        return new TaxCalculation(this.taxableAmount, newTaxRate);
    }
    
    /**
     * 計算結果の妥当性チェック
     */
    public boolean isCalculationValid() {
        Money recalculatedTax = calculateTaxAmount();
        return recalculatedTax.equals(this.taxAmount);
    }
    
    public enum TaxRoundingMethod {
        ROUND_UP("切り上げ"),
        ROUND_DOWN("切り捨て"),
        ROUND_HALF_UP("四捨五入");
        
        private final String displayName;
        
        TaxRoundingMethod(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.3 エンティティ設計

#### AccountingEntry（仕訳エントリ）
```java
@Entity
@Table(name = "accounting_entries")
public class AccountingEntry {
    @Id
    private AccountingEntryId id;
    
    private InvoiceId invoiceId;
    private AccountingEntryType type;
    private String description;
    private Money amount;
    private AccountingSide side;  // 借方/貸方
    
    // 勘定科目情報
    private String accountCode;   // 勘定科目コード
    private String accountName;   // 勘定科目名
    
    // 会計期間
    private LocalDate accountingDate;
    private YearMonth fiscalPeriod;
    
    // 外部システム連携
    private String externalSystemId; // MoneyForwardのID
    private boolean isSynced;
    private LocalDateTime syncedAt;
    
    public AccountingEntry(AccountingEntryType type,
                          String description,
                          Money amount,
                          AccountingSide side) {
        this.id = AccountingEntryId.generate();
        this.type = type;
        this.description = description;
        this.amount = amount;
        this.side = side;
        this.accountingDate = LocalDate.now();
        this.fiscalPeriod = YearMonth.now();
        this.isSynced = false;
        
        // 勘定科目の自動設定
        setAccountCodeAndName();
    }
    
    /**
     * 仕訳タイプによる勘定科目設定
     */
    private void setAccountCodeAndName() {
        switch (this.type) {
            case RECEIVABLE:
                this.accountCode = "1300";
                this.accountName = "売上債権";
                break;
            case SALES:
                this.accountCode = "4000";
                this.accountName = "売上高";
                break;
            case TAX_PAYABLE:
                this.accountCode = "2200";
                this.accountName = "仕仕消費税";
                break;
            case CASH:
                this.accountCode = "1000";
                this.accountName = "現金";
                break;
            default:
                this.accountCode = "9999";
                this.accountName = "その他";
        }
    }
    
    /**
     * 外部システムとの同期完了
     */
    public void markAsSynced(String externalSystemId) {
        this.externalSystemId = externalSystemId;
        this.isSynced = true;
        this.syncedAt = LocalDateTime.now();
    }
    
    /**
     * 仕訳エントリの妥当性チェック
     */
    public boolean isValid() {
        return amount != null && amount.isPositive() &&
               side != null &&
               accountCode != null && !accountCode.trim().isEmpty();
    }
    
    public enum AccountingEntryType {
        RECEIVABLE("売上債権"),
        SALES("売上高"),
        TAX_PAYABLE("仕仕消費税"),
        CASH("現金"),
        BANK("普通預金");
        
        private final String displayName;
        
        AccountingEntryType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum AccountingSide {
        DEBIT("借方"),
        CREDIT("貸方");
        
        private final String displayName;
        
        AccountingSide(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

## 3. ドメインサービス

### 3.1 BillingDomainService
```java
@DomainService
public class BillingDomainService {
    
    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    
    /**
     * 工数表承認からの請求書自動作成
     */
    public Invoice createInvoiceFromTimesheet(TimesheetApproved event, UserId createdBy) {
        // 契約情報取得
        Contract contract = contractRepository.findById(event.getContractId())
            .orElseThrow(() -> new EntityNotFoundException("契約が見つかりません"));
            
        // 重複チェック
        Optional<Invoice> existingInvoice = invoiceRepository.findByContractAndPeriod(
            event.getContractId(), event.getPeriod());
        if (existingInvoice.isPresent()) {
            throw new BusinessRuleViolationException("既に請求書が存在します");
        }
        
        // 請求書作成
        Invoice invoice = Invoice.createFromTimesheet(event, contract, createdBy);
        
        // 金額算出
        invoice.calculateAmount(event.getWorkHoursSummary(), contract.getTerms());
        
        return invoice;
    }
    
    /**
     * 月次一括請求書作成
     */
    public List<Invoice> createMonthlyInvoices(YearMonth billingPeriod, UserId createdBy) {
        // 承認済み工数表の取得
        List<TimesheetApproved> approvedTimesheets = getApprovedTimesheetsForPeriod(billingPeriod);
        
        List<Invoice> invoices = new ArrayList<>();
        
        for (TimesheetApproved timesheetEvent : approvedTimesheets) {
            try {
                Invoice invoice = createInvoiceFromTimesheet(timesheetEvent, createdBy);
                invoices.add(invoice);
            } catch (BusinessRuleViolationException e) {
                // 既存請求書などの場合はスキップ
                continue;
            }
        }
        
        return invoices;
    }
    
    /**
     * 請求書の一括発行
     */
    public List<Invoice> bulkIssueInvoices(
            List<InvoiceId> invoiceIds,
            LocalDate issueDate,
            int paymentTermDays) {
        
        List<Invoice> invoices = invoiceIds.stream()
            .map(id -> invoiceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("請求書が見つかりません")))
            .collect(toList());
            
        List<Invoice> issuedInvoices = new ArrayList<>();
        
        for (Invoice invoice : invoices) {
            try {
                invoice.issue(issueDate, paymentTermDays);
                issuedInvoices.add(invoice);
            } catch (BusinessRuleViolationException e) {
                // 発行できない請求書はスキップ
                continue;
            }
        }
        
        return issuedInvoices;
    }
    
    /**
     * 期限超過請求書の自動処理
     */
    public List<Invoice> handleOverdueInvoices() {
        List<Invoice> overdueInvoices = invoiceRepository.findOverdueInvoices();
        List<Invoice> processedInvoices = new ArrayList<>();
        
        for (Invoice invoice : overdueInvoices) {
            int daysOverdue = invoice.getDaysOverdue();
            
            if (daysOverdue >= 30) {
                // 30日超過: 収集代行依頼など
                processOverdueInvoice(invoice, OverdueAction.COLLECTION_AGENCY);
                processedInvoices.add(invoice);
            } else if (daysOverdue >= 14) {
                // 14日超過: 督促通知
                processOverdueInvoice(invoice, OverdueAction.REMINDER_NOTICE);
                processedInvoices.add(invoice);
            } else if (daysOverdue >= 7) {
                // 7日超過: 初回通知
                processOverdueInvoice(invoice, OverdueAction.FIRST_NOTICE);
                processedInvoices.add(invoice);
            }
        }
        
        return processedInvoices;
    }
    
    /**
     * 売上統計分析
     */
    public SalesAnalytics analyzeSales(YearMonth fromPeriod, YearMonth toPeriod) {
        List<Invoice> invoices = invoiceRepository.findByPeriodRange(fromPeriod, toPeriod);
        
        Money totalSales = Money.ZERO;
        Money totalPaid = Money.ZERO;
        Money totalOutstanding = Money.ZERO;
        int totalInvoiceCount = 0;
        int paidInvoiceCount = 0;
        
        Map<CustomerId, Money> salesByCustomer = new HashMap<>();
        Map<YearMonth, Money> salesByMonth = new HashMap<>();
        
        for (Invoice invoice : invoices) {
            if (invoice.getStatus() == InvoiceStatus.ISSUED ||
                invoice.getStatus() == InvoiceStatus.PARTIALLY_PAID ||
                invoice.getStatus() == InvoiceStatus.PAID) {
                
                Money invoiceAmount = invoice.getAmount().getTotalAmount();
                totalSales = totalSales.add(invoiceAmount);
                totalInvoiceCount++;
                
                if (invoice.isPaid()) {
                    totalPaid = totalPaid.add(invoiceAmount);
                    paidInvoiceCount++;
                } else {
                    totalOutstanding = totalOutstanding.add(invoice.getRemainingAmount());
                }
                
                // 顧客別集計
                salesByCustomer.merge(invoice.getCustomerId(), invoiceAmount, Money::add);
                
                // 月別集計
                salesByMonth.merge(invoice.getBillingPeriod(), invoiceAmount, Money::add);
            }
        }
        
        return new SalesAnalytics(
            fromPeriod,
            toPeriod,
            totalSales,
            totalPaid,
            totalOutstanding,
            totalInvoiceCount,
            paidInvoiceCount,
            salesByCustomer,
            salesByMonth
        );
    }
    
    private List<TimesheetApproved> getApprovedTimesheetsForPeriod(YearMonth period) {
        // 実装はイベントストアから取得することを想定
        return Collections.emptyList();
    }
    
    private void processOverdueInvoice(Invoice invoice, OverdueAction action) {
        // 期限超過処理の実装
        // 通知送信、収集代行依頼など
    }
    
    private enum OverdueAction {
        FIRST_NOTICE,
        REMINDER_NOTICE,
        COLLECTION_AGENCY
    }
}
```

### 3.2 MoneyForwardIntegrationService
```java
@ExternalService
public class MoneyForwardIntegrationService {
    
    private final MoneyForwardApiClient apiClient;
    
    /**
     * 請求書情報のMoneyForward送信
     */
    public void syncInvoice(Invoice invoice) {
        // 売上伝票作成
        CreateSalesInvoiceRequest request = CreateSalesInvoiceRequest.builder()
            .partnerId(mapCustomerToPartner(invoice.getCustomerId()))
            .issueDate(invoice.getIssueDate())
            .dueDate(invoice.getDueDate())
            .invoiceNumber(invoice.getInvoiceNumber().getValue())
            .items(mapBillingItems(invoice.getBillingItems()))
            .taxCalculation(mapTaxCalculation(invoice.getTaxCalculation()))
            .build();
            
        MoneyForwardApiResponse response = apiClient.createSalesInvoice(request);
        
        // 仕訳エントリ作成
        for (AccountingEntry entry : invoice.getAccountingEntries()) {
            CreateJournalEntryRequest journalRequest = CreateJournalEntryRequest.builder()
                .transactionDate(entry.getAccountingDate())
                .accountCode(entry.getAccountCode())
                .debitAmount(entry.getSide() == AccountingEntry.AccountingSide.DEBIT ? 
                           entry.getAmount().getAmount() : BigDecimal.ZERO)
                .creditAmount(entry.getSide() == AccountingEntry.AccountingSide.CREDIT ? 
                            entry.getAmount().getAmount() : BigDecimal.ZERO)
                .description(entry.getDescription())
                .build();
                
            apiClient.createJournalEntry(journalRequest);
            entry.markAsSynced(response.getId());
        }
    }
    
    /**
     * 入金情報のMoneyForward送信
     */
    public void syncPayment(Invoice invoice, Payment payment) {
        CreateReceiptRequest request = CreateReceiptRequest.builder()
            .invoiceId(invoice.getExternalSystemId())
            .amount(payment.getAmount().getAmount())
            .receiptDate(payment.getPaymentDate())
            .paymentMethod(mapPaymentMethod(payment.getMethod()))
            .reference(payment.getReference())
            .build();
            
        MoneyForwardApiResponse response = apiClient.createReceipt(request);
        
        // 入金仕訳作成
        createReceiptJournalEntry(invoice, payment, response.getId());
    }
    
    private String mapCustomerToPartner(CustomerId customerId) {
        // 顧客IDをMoneyForwardのPartner IDにマッピング
        return "partner_" + customerId.getValue();
    }
    
    private List<MoneyForwardInvoiceItem> mapBillingItems(List<BillingItem> billingItems) {
        return billingItems.stream()
            .map(item -> MoneyForwardInvoiceItem.builder()
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice().getAmount())
                .amount(item.getAmount().getAmount())
                .taxCategory(mapTaxCategory(item.getTaxCategory()))
                .build())
            .collect(toList());
    }
}
```

## 4. リポジトリインターフェース

### 4.1 InvoiceRepository
```java
public interface InvoiceRepository {
    
    // === 基本CRUD ===
    void save(Invoice invoice);
    Optional<Invoice> findById(InvoiceId id);
    void delete(InvoiceId id);
    
    // === ステータス検索 ===
    List<Invoice> findByStatus(InvoiceStatus status);
    List<Invoice> findIssuedInvoices();
    List<Invoice> findOverdueInvoices();
    List<Invoice> findUnpaidInvoices();
    
    // === 顧客・契約検索 ===
    List<Invoice> findByCustomerId(CustomerId customerId);
    Optional<Invoice> findByContractAndPeriod(ContractId contractId, YearMonth period);
    List<Invoice> findByProjectId(ProjectId projectId);
    
    // === 期間検索 ===
    List<Invoice> findByBillingPeriod(YearMonth period);
    List<Invoice> findByPeriodRange(YearMonth fromPeriod, YearMonth toPeriod);
    List<Invoice> findByDueDate(LocalDate dueDate);
    List<Invoice> findByDueDateRange(LocalDate fromDate, LocalDate toDate);
    
    // === 支払管理 ===
    List<Invoice> findPartiallyPaidInvoices();
    List<Invoice> findApproachingDueDate(int daysBeforeDue);
    
    // === 会計連携 ===
    List<Invoice> findUnsyncedInvoices();
    List<Invoice> findBySyncStatus(boolean isSynced);
    
    // === 統計・集計 ===
    Money calculateTotalSalesByPeriod(YearMonth period);
    Money calculateTotalOutstandingAmount();
    long countByStatusAndPeriod(InvoiceStatus status, YearMonth period);
    
    // === ID生成 ===
    InvoiceId generateId();
}
```

## 5. ドメインイベント

### 5.1 InvoiceIssued
```java
public class InvoiceIssued implements DomainEvent {
    private final InvoiceId invoiceId;
    private final CustomerId customerId;
    private final Money totalAmount;
    private final LocalDate dueDate;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → 顧客への請求書送信通知
}
```

### 5.2 PaymentRecorded
```java
public class PaymentRecorded implements DomainEvent {
    private final InvoiceId invoiceId;
    private final PaymentId paymentId;
    private final Money paymentAmount;
    private final LocalDate paymentDate;
    private final LocalDateTime occurredAt;
    
    // Report Contextが購読
    // → 入金統計情報更新
}
```

### 5.3 InvoiceAccountingSynced
```java
public class InvoiceAccountingSynced implements DomainEvent {
    private final InvoiceId invoiceId;
    private final List<AccountingEntry> accountingEntries;
    private final LocalDateTime occurredAt;
    
    // Report Contextが購読
    // → 会計データ連携状態更新
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **請求書作成制約**
   - 承認済み工数表からのみ作成可能
   - 同一契約・同一期間の請求書は1つのみ
   - 有効な契約が存在すること

2. **金額計算制約**
   - 請求金額 = 小計 + 消費税
   - 税額は法定税率で正確に計算
   - 割引・調整は小計を超えない

3. **支払管理制約**
   - 支払金額は残金を超えない
   - 支払日は未来日にできない
   - 確認済み支払は取消不可

4. **ステータス管理制約**
   - 支払済み請求書のキャンセル禁止
   - 会計連携済み請求書のキャンセル禁止
   - 適切なステータス遷移パスの管理

## 7. パフォーマンス考慮事項

### 7.1 遅延読み込み
- `billingItems`は遅延読み込み
- `payments`は遅延読み込み
- `accountingEntries`は遅延読み込み

### 7.2 インデックス設計
- `status`カラムにインデックス
- `customer_id`カラムにインデックス
- `billing_period`カラムにインデックス
- `due_date`カラムにインデックス
- `issue_date`カラムにインデックス
- 複合インデックス：`(contract_id, billing_period)` （ユニーク）
- 複合インデックス：`(status, due_date)`

### 7.3 外部API連携最適化
- MoneyForward API呼び出しのバッチ処理
- APIレスポンスのキャッシュ
- リトライ処理とエラーハンドリング

### 7.4 バッチ処理最適化
- 月次一括請求書作成処理
- 一括発行処理のトランザクション管理
- 統計集計処理の最適化

---

**作成者**: システム化プロジェクトチーム