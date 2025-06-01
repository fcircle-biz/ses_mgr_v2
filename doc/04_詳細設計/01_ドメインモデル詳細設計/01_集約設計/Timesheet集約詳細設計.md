# Timesheet集約 詳細設計

## 1. 集約概要

### 1.1 責務
- 月次工数表の作成・管理・承認フロー制御
- 日次勤怠データの記録・集計・検証
- 承認ワークフローの管理と状態追跡
- 稼働時間の精度管理とビジネスルール適用

### 1.2 境界
- **含むもの**: Timesheet（集約ルート）、DailyAttendance、ApprovalFlow、WorkHoursSummary
- **含まないもの**: 契約詳細情報、請求計算、技術者評価、プロジェクト進捗

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Timesheet（集約ルート）

```java
@Entity
@Table(name = "timesheets")
public class Timesheet {
    // === 識別子 ===
    @Id
    private TimesheetId id;
    
    // === 関連エンティティ ===
    private EngineerId engineerId;
    private ContractId contractId;
    private ProjectId projectId;
    
    // === 期間情報 ===
    private YearMonth period;               // 対象月
    private LocalDate submissionDeadline;   // 提出期限
    private LocalDate approvalDeadline;     // 承認期限
    
    // === 勤怠データ ===
    private List<DailyAttendance> attendances;
    private WorkHoursSummary summary;
    
    // === 承認フロー ===
    private ApprovalFlow approvalFlow;
    private TimesheetStatus status;
    
    // === コメント・特記事項 ===
    private String engineerComment;         // 技術者コメント
    private List<SpecialWorkEntry> specialEntries; // 特別作業
    private List<AttendanceAdjustment> adjustments; // 調整項目
    
    // === バリデーション情報 ===
    private List<ValidationError> validationErrors;
    private boolean isLocked;               // ロック状態
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    private LocalDateTime lastModifiedAt;
    
    // === ビジネスルール ===
    
    /**
     * 新しい工数表の作成
     * - 契約がアクティブである必要がある
     * - 同一期間の工数表が存在しない必要がある
     */
    public static Timesheet create(
            EngineerId engineerId,
            ContractId contractId,
            ProjectId projectId,
            YearMonth period,
            Contract contract) {
        
        if (!contract.isPeriodValid(period.atDay(1))) {
            throw new BusinessRuleViolationException("契約期間外の工数表作成はできません");
        }
        
        Timesheet timesheet = new Timesheet();
        timesheet.id = TimesheetId.generate();
        timesheet.engineerId = engineerId;
        timesheet.contractId = contractId;
        timesheet.projectId = projectId;
        timesheet.period = period;
        timesheet.status = TimesheetStatus.DRAFT;
        timesheet.attendances = new ArrayList<>();
        timesheet.specialEntries = new ArrayList<>();
        timesheet.adjustments = new ArrayList<>();
        timesheet.validationErrors = new ArrayList<>();
        timesheet.isLocked = false;
        
        // 期限設定
        timesheet.submissionDeadline = period.atEndOfMonth().plusDays(5); // 翕月5日
        timesheet.approvalDeadline = timesheet.submissionDeadline.plusDays(10); // 提出期限+10日
        
        // 承認フロー初期化
        timesheet.approvalFlow = ApprovalFlow.createDefault();
        
        // 工数表作成イベント
        DomainEventPublisher.publish(new TimesheetCreated(
            timesheet.id, timesheet.engineerId, timesheet.period));
            
        return timesheet;
    }
    
    /**
     * 日次勤怠の追加・更新
     * - ドラフトまたは差し戻し状態でのみ編集可能
     * - 対象月内の日付である必要がある
     */
    public void addOrUpdateAttendance(LocalDate date, AttendanceData attendanceData) {
        if (!canEdit()) {
            throw new BusinessRuleViolationException("編集不可能な状態です");
        }
        if (!isDateInPeriod(date)) {
            throw new BusinessRuleViolationException("対象月外の日付です");
        }
        if (isLocked) {
            throw new BusinessRuleViolationException("ロックされた工数表は編集できません");
        }
        
        // 既存勤怠データを検索
        Optional<DailyAttendance> existingAttendance = findAttendance(date);
        
        if (existingAttendance.isPresent()) {
            // 更新
            existingAttendance.get().update(attendanceData);
        } else {
            // 新規追加
            DailyAttendance newAttendance = new DailyAttendance(date, attendanceData);
            attendances.add(newAttendance);
        }
        
        // サマリー再計算
        recalculateSummary();
        
        // バリデーション実行
        validateAttendances();
        
        this.lastModifiedAt = LocalDateTime.now();
        
        // 勤怠更新イベント
        DomainEventPublisher.publish(new AttendanceUpdated(
            this.id, this.engineerId, date, attendanceData));
    }
    
    /**
     * 特別作業の追加
     * - 残業、休日出勤、深夜作業など
     */
    public void addSpecialWork(LocalDate date, SpecialWorkType workType, int hours, String description) {
        if (!canEdit()) {
            throw new BusinessRuleViolationException("編集不可能な状態です");
        }
        if (!isDateInPeriod(date)) {
            throw new BusinessRuleViolationException("対象月外の日付です");
        }
        if (hours <= 0) {
            throw new IllegalArgumentException("作業時間は1時間以上である必要があります");
        }
        
        SpecialWorkEntry entry = new SpecialWorkEntry(date, workType, hours, description);
        this.specialEntries.add(entry);
        
        // サマリー再計算
        recalculateSummary();
        
        this.lastModifiedAt = LocalDateTime.now();
    }
    
    /**
     * 承認依頼の提出
     * - ドラフト状態からのみ提出可能
     * - 必須項目の完全性チェック
     * - バリデーションエラーがないこと
     */
    public void submitForApproval() {
        if (this.status != TimesheetStatus.DRAFT) {
            throw new BusinessRuleViolationException("ドラフト状態からのみ提出可能です");
        }
        if (isAfterSubmissionDeadline()) {
            throw new BusinessRuleViolationException("提出期限を過ぎています");
        }
        
        // 完全性チェック
        validateCompleteness();
        
        if (!validationErrors.isEmpty()) {
            throw new BusinessRuleViolationException(
                "バリデーションエラーがあります: " + 
                validationErrors.stream()
                    .map(ValidationError::getMessage)
                    .collect(joining(", "))
            );
        }
        
        this.status = TimesheetStatus.PENDING_APPROVAL;
        this.isLocked = true; // 提出後はロック
        
        // 承認フロー開始
        this.approvalFlow.start();
        
        // 提出イベント
        DomainEventPublisher.publish(new TimesheetSubmitted(
            this.id, this.engineerId, this.projectId, this.period, this.summary));
    }
    
    /**
     * 承認処理
     * - 承認待ち状態でのみ実行可能
     * - 承認権限のチェック
     */
    public void approve(UserId approverId, ApprovalLevel level, String approvalComment) {
        if (this.status != TimesheetStatus.PENDING_APPROVAL) {
            throw new BusinessRuleViolationException("承認待ち状態でのみ承認可能です");
        }
        if (isAfterApprovalDeadline()) {
            throw new BusinessRuleViolationException("承認期限を過ぎています");
        }
        
        // 承認フローで承認処理
        this.approvalFlow.approve(approverId, level, approvalComment);
        
        // 全ての承認レベルが完了したかチェック
        if (this.approvalFlow.isCompleted()) {
            this.status = TimesheetStatus.APPROVED;
            
            // 承認完了イベント（Billing Contextへ）
            DomainEventPublisher.publish(new TimesheetApproved(
                this.id, this.engineerId, this.contractId, this.period, 
                this.summary, this.approvalFlow.getFinalApprover()));
        }
    }
    
    /**
     * 差し戻し処理
     * - 承認待ち状態でのみ実行可能
     * - 差し戻し理由の記載が必須
     */
    public void reject(UserId rejectorId, String rejectionReason) {
        if (this.status != TimesheetStatus.PENDING_APPROVAL) {
            throw new BusinessRuleViolationException("承認待ち状態でのみ差し戻し可能です");
        }
        if (rejectionReason == null || rejectionReason.trim().isEmpty()) {
            throw new IllegalArgumentException("差し戻し理由の記載が必要です");
        }
        
        this.status = TimesheetStatus.REJECTED;
        this.isLocked = false; // 差し戻し後は編集可能
        
        // 承認フローで差し戻し処理
        this.approvalFlow.reject(rejectorId, rejectionReason);
        
        // 差し戻しイベント
        DomainEventPublisher.publish(new TimesheetRejected(
            this.id, this.engineerId, rejectorId, rejectionReason));
    }
    
    /**
     * 調整項目の追加
     * - 承認者のみ実行可能
     * - 調整理由の明記が必須
     */
    public void addAdjustment(AttendanceAdjustment adjustment, UserId adjusterId) {
        if (this.status != TimesheetStatus.PENDING_APPROVAL && 
            this.status != TimesheetStatus.APPROVED) {
            throw new BusinessRuleViolationException("承認中または承認後のみ調整可能です");
        }
        if (!adjustment.isValid()) {
            throw new IllegalArgumentException("無効な調整項目です");
        }
        
        adjustment.setAdjusterId(adjusterId);
        adjustment.setAdjustedAt(LocalDateTime.now());
        this.adjustments.add(adjustment);
        
        // サマリー再計算
        recalculateSummary();
        
        // 調整イベント
        DomainEventPublisher.publish(new TimesheetAdjusted(
            this.id, this.engineerId, adjustment, adjusterId));
    }
    
    // === プライベートメソッド ===
    
    private boolean canEdit() {
        return this.status == TimesheetStatus.DRAFT || this.status == TimesheetStatus.REJECTED;
    }
    
    private boolean isDateInPeriod(LocalDate date) {
        YearMonth dateMonth = YearMonth.from(date);
        return dateMonth.equals(this.period);
    }
    
    private Optional<DailyAttendance> findAttendance(LocalDate date) {
        return attendances.stream()
            .filter(attendance -> attendance.getDate().equals(date))
            .findFirst();
    }
    
    private void recalculateSummary() {
        int totalWorkingDays = (int) attendances.stream()
            .filter(DailyAttendance::isWorkingDay)
            .count();
            
        int totalWorkingHours = attendances.stream()
            .mapToInt(DailyAttendance::getWorkingHours)
            .sum();
            
        int totalOvertimeHours = attendances.stream()
            .mapToInt(DailyAttendance::getOvertimeHours)
            .sum();
            
        // 特別作業時間を加算
        int specialWorkHours = specialEntries.stream()
            .mapToInt(SpecialWorkEntry::getHours)
            .sum();
            
        // 調整を反映
        int adjustmentHours = adjustments.stream()
            .mapToInt(AttendanceAdjustment::getAdjustmentHours)
            .sum();
            
        this.summary = new WorkHoursSummary(
            totalWorkingDays,
            totalWorkingHours + adjustmentHours,
            totalOvertimeHours,
            specialWorkHours,
            adjustmentHours
        );
    }
    
    private void validateAttendances() {
        this.validationErrors.clear();
        
        // 日別バリデーション
        for (DailyAttendance attendance : attendances) {
            List<ValidationError> errors = attendance.validate();
            this.validationErrors.addAll(errors);
        }
        
        // 月全体バリデーション
        validateMonthlySummary();
    }
    
    private void validateMonthlySummary() {
        // 最大労働時間チェック（200時間/月）
        if (summary.getTotalWorkingHours() > 200) {
            validationErrors.add(new ValidationError(
                "MONTHLY_HOURS_EXCEEDED", 
                "月間労働時間が上限を超えています"))
        }
        
        // 連続労働日数チェック
        int consecutiveWorkingDays = calculateConsecutiveWorkingDays();
        if (consecutiveWorkingDays > 6) {
            validationErrors.add(new ValidationError(
                "CONSECUTIVE_WORKING_DAYS_EXCEEDED",
                "連続労働日数が6日を超えています"));
        }
    }
    
    private void validateCompleteness() {
        // 必須日付の勤怠データが存在するかチェック
        List<LocalDate> workingDaysInMonth = getWorkingDaysInMonth();
        List<LocalDate> attendanceDates = attendances.stream()
            .map(DailyAttendance::getDate)
            .collect(toList());
            
        for (LocalDate workingDay : workingDaysInMonth) {
            if (!attendanceDates.contains(workingDay)) {
                validationErrors.add(new ValidationError(
                    "MISSING_ATTENDANCE",
                    String.format("%sの勤怠データが未入力です", workingDay)
                ));
            }
        }
    }
    
    private boolean isAfterSubmissionDeadline() {
        return LocalDate.now().isAfter(this.submissionDeadline);
    }
    
    private boolean isAfterApprovalDeadline() {
        return LocalDate.now().isAfter(this.approvalDeadline);
    }
    
    private List<LocalDate> getWorkingDaysInMonth() {
        // 月内の平日を取得（土日曜日、祝日を除く）
        LocalDate startDate = period.atDay(1);
        LocalDate endDate = period.atEndOfMonth();
        
        return startDate.datesUntil(endDate.plusDays(1))
            .filter(date -> {
                DayOfWeek dayOfWeek = date.getDayOfWeek();
                return dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY;
                // 祝日チェックも必要
            })
            .collect(toList());
    }
    
    private int calculateConsecutiveWorkingDays() {
        // 連続労働日数の計算ロジック
        List<LocalDate> workingDates = attendances.stream()
            .filter(DailyAttendance::isWorkingDay)
            .map(DailyAttendance::getDate)
            .sorted()
            .collect(toList());
            
        int maxConsecutive = 0;
        int currentConsecutive = 1;
        
        for (int i = 1; i < workingDates.size(); i++) {
            LocalDate prevDate = workingDates.get(i - 1);
            LocalDate currDate = workingDates.get(i);
            
            if (prevDate.plusDays(1).equals(currDate)) {
                currentConsecutive++;
            } else {
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                currentConsecutive = 1;
            }
        }
        
        return Math.max(maxConsecutive, currentConsecutive);
    }
    
    // === ゲッターメソッド ===
    
    public boolean isEditable() {
        return canEdit() && !isLocked;
    }
    
    public boolean isSubmittable() {
        return this.status == TimesheetStatus.DRAFT && 
               !isAfterSubmissionDeadline() && 
               validationErrors.isEmpty();
    }
    
    public boolean isOverdue() {
        return this.status == TimesheetStatus.DRAFT && isAfterSubmissionDeadline();
    }
    
    public float getCompletionRate() {
        List<LocalDate> workingDays = getWorkingDaysInMonth();
        if (workingDays.isEmpty()) {
            return 1.0f;
        }
        
        long completedDays = attendances.stream()
            .filter(attendance -> workingDays.contains(attendance.getDate()))
            .count();
            
        return (float) completedDays / workingDays.size();
    }
}
```

### 2.2 値オブジェクト設計

#### DailyAttendance（日次勤怠）
```java
@Embeddable
public class DailyAttendance {
    private LocalDate date;
    private AttendanceType type;        // 勤務/休み/有給/特別休暇
    
    // 時刻情報
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalTime breakStartTime;
    private LocalTime breakEndTime;
    
    // 労働時間
    private int scheduledHours;         // 所定労働時間
    private int actualWorkingHours;     // 実労働時間
    private int overtimeHours;          // 残業時間
    private int breakMinutes;           // 休憩時間（分）
    
    // 勤務地情報
    private WorkLocation workLocation;  // 勤務地
    private String workLocationDetails; // 勤務地詳細
    
    // コメント・特記事項
    private String dailyComment;        // 日報コメント
    private List<WorkTask> tasks;       // 作業内容
    
    public DailyAttendance(LocalDate date, AttendanceData data) {
        this.date = date;
        this.type = data.getType();
        this.startTime = data.getStartTime();
        this.endTime = data.getEndTime();
        this.breakStartTime = data.getBreakStartTime();
        this.breakEndTime = data.getBreakEndTime();
        this.workLocation = data.getWorkLocation();
        this.workLocationDetails = data.getWorkLocationDetails();
        this.dailyComment = data.getDailyComment();
        this.tasks = new ArrayList<>(data.getTasks());
        
        // 労働時間の計算
        calculateWorkingHours();
    }
    
    /**
     * 勤怠データの更新
     */
    public void update(AttendanceData data) {
        this.type = data.getType();
        this.startTime = data.getStartTime();
        this.endTime = data.getEndTime();
        this.breakStartTime = data.getBreakStartTime();
        this.breakEndTime = data.getBreakEndTime();
        this.workLocation = data.getWorkLocation();
        this.workLocationDetails = data.getWorkLocationDetails();
        this.dailyComment = data.getDailyComment();
        this.tasks = new ArrayList<>(data.getTasks());
        
        // 労働時間の再計算
        calculateWorkingHours();
    }
    
    /**
     * 労働時間の計算
     */
    private void calculateWorkingHours() {
        if (type != AttendanceType.WORK) {
            this.actualWorkingHours = 0;
            this.overtimeHours = 0;
            return;
        }
        
        if (startTime == null || endTime == null) {
            this.actualWorkingHours = 0;
            this.overtimeHours = 0;
            return;
        }
        
        // 休憩時間の計算
        this.breakMinutes = calculateBreakMinutes();
        
        // 実労働時間の計算（分単位）
        long totalMinutes = Duration.between(startTime, endTime).toMinutes();
        long workingMinutes = totalMinutes - breakMinutes;
        
        this.actualWorkingHours = (int) (workingMinutes / 60);
        
        // 所定労働時間は8時間と仮定
        this.scheduledHours = 8;
        
        // 残業時間の計算
        this.overtimeHours = Math.max(0, this.actualWorkingHours - this.scheduledHours);
    }
    
    /**
     * 休憩時間の計算
     */
    private int calculateBreakMinutes() {
        if (breakStartTime == null || breakEndTime == null) {
            // デフォルト休憩時間（60分）
            return 60;
        }
        
        return (int) Duration.between(breakStartTime, breakEndTime).toMinutes();
    }
    
    /**
     * バリデーション
     */
    public List<ValidationError> validate() {
        List<ValidationError> errors = new ArrayList<>();
        
        if (type == AttendanceType.WORK) {
            // 勤務日のバリデーション
            if (startTime == null) {
                errors.add(new ValidationError("START_TIME_REQUIRED", "開始時刻が必要です"));
            }
            if (endTime == null) {
                errors.add(new ValidationError("END_TIME_REQUIRED", "終了時刻が必要です"));
            }
            if (startTime != null && endTime != null && startTime.isAfter(endTime)) {
                errors.add(new ValidationError("INVALID_TIME_RANGE", "開始時刻は終了時刻より前である必要があります"));
            }
            if (actualWorkingHours > 12) {
                errors.add(new ValidationError("EXCESSIVE_WORKING_HOURS", "日別労働時間が12時間を超えています"));
            }
            if (workLocation == null) {
                errors.add(new ValidationError("WORK_LOCATION_REQUIRED", "勤務地が必要です"));
            }
        }
        
        return errors;
    }
    
    /**
     * 勤務日判定
     */
    public boolean isWorkingDay() {
        return type == AttendanceType.WORK;
    }
    
    /**
     * 時間外労働判定
     */
    public boolean isOvertimeWork() {
        return overtimeHours > 0;
    }
    
    /**
     * 休日勤務判定
     */
    public boolean isHolidayWork() {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        return isWorkingDay() && (dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY);
    }
    
    public enum AttendanceType {
        WORK("勤務"),
        PAID_LEAVE("有給休暇"),
        SICK_LEAVE("病気休暇"),
        SPECIAL_LEAVE("特別休暇"),
        UNPAID_LEAVE("無給休暇"),
        HOLIDAY("休日");
        
        private final String displayName;
        
        AttendanceType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### WorkHoursSummary（労働時間サマリー）
```java
@Embeddable
public class WorkHoursSummary {
    private int totalWorkingDays;       // 総勤務日数
    private int totalWorkingHours;      // 総労働時間
    private int totalOvertimeHours;     // 総残業時間
    private int totalSpecialWorkHours;  // 総特別作業時間
    private int totalAdjustmentHours;   // 総調整時間
    
    // 種別別集計
    private int holidayWorkDays;        // 休日勤務日数
    private int holidayWorkHours;       // 休日勤務時間
    private int nightWorkHours;         // 深夜勤務時間
    
    // 休暇統計
    private int paidLeaveDays;          // 有給休暇日数
    private int sickLeaveDays;          // 病気休暇日数
    private int specialLeaveDays;       // 特別休暇日数
    
    public WorkHoursSummary(int totalWorkingDays,
                           int totalWorkingHours,
                           int totalOvertimeHours,
                           int totalSpecialWorkHours,
                           int totalAdjustmentHours) {
        this.totalWorkingDays = totalWorkingDays;
        this.totalWorkingHours = totalWorkingHours;
        this.totalOvertimeHours = totalOvertimeHours;
        this.totalSpecialWorkHours = totalSpecialWorkHours;
        this.totalAdjustmentHours = totalAdjustmentHours;
    }
    
    /**
     * 基本労働時間計算（残業を除く）
     */
    public int getBasicWorkingHours() {
        return totalWorkingHours - totalOvertimeHours;
    }
    
    /**
     * 実労働時間計算（調整含む）
     */
    public int getActualWorkingHours() {
        return totalWorkingHours + totalAdjustmentHours;
    }
    
    /**
     * 平均日労働時間計算
     */
    public float getAverageDailyHours() {
        return totalWorkingDays > 0 ? (float) totalWorkingHours / totalWorkingDays : 0.0f;
    }
    
    /**
     * 残業率計算
     */
    public float getOvertimeRate() {
        return totalWorkingHours > 0 ? (float) totalOvertimeHours / totalWorkingHours : 0.0f;
    }
    
    /**
     * 勤怠率計算（所定労働日数を基準）
     */
    public float getAttendanceRate(int scheduledWorkingDays) {
        return scheduledWorkingDays > 0 ? (float) totalWorkingDays / scheduledWorkingDays : 0.0f;
    }
    
    /**
     * 法定労働時間超過判定（160時間/月）
     */
    public boolean isOverLegalWorkingHours() {
        return totalWorkingHours > 160;
    }
    
    /**
     * 健康管理注意判定（残業80時間/月）
     */
    public boolean isHealthRiskLevel() {
        return totalOvertimeHours > 80;
    }
    
    /**
     * サマリーレポート生成
     */
    public String generateSummaryReport() {
        return String.format(
            "勤務: %d日 / 労働: %d時間 / 残業: %d時間 / 平均: %.1f時間/日",
            totalWorkingDays,
            totalWorkingHours,
            totalOvertimeHours,
            getAverageDailyHours()
        );
    }
}
```

#### ApprovalFlow（承認フロー）
```java
@Embeddable
public class ApprovalFlow {
    private List<ApprovalStep> steps;
    private ApprovalStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    private ApprovalFlow() {
        this.steps = new ArrayList<>();
        this.status = ApprovalStatus.NOT_STARTED;
    }
    
    /**
     * デフォルト承認フロー作成
     */
    public static ApprovalFlow createDefault() {
        ApprovalFlow flow = new ApprovalFlow();
        
        // 段階的承認フロー
        flow.steps.add(new ApprovalStep(
            ApprovalLevel.FIRST_APPROVAL,  // 一次承認（PM・TL）
            "PM・TL承認",
            true  // 必須
        ));
        
        flow.steps.add(new ApprovalStep(
            ApprovalLevel.SECOND_APPROVAL, // 二次承認（連携先担当者）
            "連携先承認",
            true  // 必須
        ));
        
        flow.steps.add(new ApprovalStep(
            ApprovalLevel.FINAL_APPROVAL,  // 最終承認（管理部門）
            "管理部門承認",
            false // 任意（特定条件で必須）
        ));
        
        return flow;
    }
    
    /**
     * 承認フロー開始
     */
    public void start() {
        if (this.status != ApprovalStatus.NOT_STARTED) {
            throw new IllegalStateException("既に開始されたフローです");
        }
        
        this.status = ApprovalStatus.IN_PROGRESS;
        this.startedAt = LocalDateTime.now();
        
        // 最初のステップをアクティブ化
        ApprovalStep firstStep = getCurrentStep();
        if (firstStep != null) {
            firstStep.activate();
        }
    }
    
    /**
     * 承認処理
     */
    public void approve(UserId approverId, ApprovalLevel level, String comment) {
        ApprovalStep currentStep = getCurrentStep();
        if (currentStep == null || currentStep.getLevel() != level) {
            throw new BusinessRuleViolationException("無効な承認レベルです");
        }
        
        currentStep.approve(approverId, comment);
        
        // 次のステップへ進む
        progressToNextStep();
        
        // 全ステップ完了チェック
        if (isCompleted()) {
            this.status = ApprovalStatus.COMPLETED;
            this.completedAt = LocalDateTime.now();
        }
    }
    
    /**
     * 差し戻し処理
     */
    public void reject(UserId rejectorId, String reason) {
        ApprovalStep currentStep = getCurrentStep();
        if (currentStep == null) {
            throw new IllegalStateException("承認ステップがありません");
        }
        
        currentStep.reject(rejectorId, reason);
        this.status = ApprovalStatus.REJECTED;
    }
    
    /**
     * フローリセット（差し戻し後の再提出時）
     */
    public void reset() {
        this.status = ApprovalStatus.NOT_STARTED;
        this.startedAt = null;
        this.completedAt = null;
        
        // 全ステップをリセット
        for (ApprovalStep step : steps) {
            step.reset();
        }
    }
    
    /**
     * 現在の承認ステップ取得
     */
    public ApprovalStep getCurrentStep() {
        return steps.stream()
            .filter(step -> step.getStatus() == ApprovalStepStatus.PENDING)
            .findFirst()
            .orElse(null);
    }
    
    /**
     * 最終承認者取得
     */
    public UserId getFinalApprover() {
        return steps.stream()
            .filter(step -> step.getStatus() == ApprovalStepStatus.APPROVED)
            .reduce((first, second) -> second) // 最後の要素を取得
            .map(ApprovalStep::getApproverId)
            .orElse(null);
    }
    
    /**
     * 全ステップ完了判定
     */
    public boolean isCompleted() {
        return steps.stream()
            .filter(ApprovalStep::isRequired)
            .allMatch(step -> step.getStatus() == ApprovalStepStatus.APPROVED);
    }
    
    private void progressToNextStep() {
        // 次の必須ステップをアクティブ化
        ApprovalStep nextStep = steps.stream()
            .filter(step -> step.getStatus() == ApprovalStepStatus.NOT_STARTED && step.isRequired())
            .findFirst()
            .orElse(null);
            
        if (nextStep != null) {
            nextStep.activate();
        }
    }
    
    public enum ApprovalStatus {
        NOT_STARTED("未開始"),
        IN_PROGRESS("承認中"),
        COMPLETED("承認完了"),
        REJECTED("差し戻し");
        
        private final String displayName;
        
        ApprovalStatus(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum ApprovalLevel {
        FIRST_APPROVAL(1, "一次承認"),
        SECOND_APPROVAL(2, "二次承認"),
        FINAL_APPROVAL(3, "最終承認");
        
        private final int order;
        private final String displayName;
        
        ApprovalLevel(int order, String displayName) {
            this.order = order;
            this.displayName = displayName;
        }
    }
}
```

### 2.3 エンティティ設計

#### ApprovalStep（承認ステップ）
```java
@Entity
@Table(name = "approval_steps")
public class ApprovalStep {
    @Id
    private ApprovalStepId id;
    
    private ApprovalFlow.ApprovalLevel level;
    private String stepName;
    private boolean isRequired;
    
    private ApprovalStepStatus status;
    private UserId approverId;
    private LocalDateTime approvedAt;
    private String approvalComment;
    
    private LocalDateTime activatedAt;
    private LocalDateTime rejectedAt;
    private String rejectionReason;
    
    public ApprovalStep(ApprovalFlow.ApprovalLevel level, String stepName, boolean isRequired) {
        this.id = ApprovalStepId.generate();
        this.level = level;
        this.stepName = stepName;
        this.isRequired = isRequired;
        this.status = ApprovalStepStatus.NOT_STARTED;
    }
    
    /**
     * ステップのアクティブ化
     */
    public void activate() {
        if (this.status != ApprovalStepStatus.NOT_STARTED) {
            throw new IllegalStateException("既に開始されたステップです");
        }
        
        this.status = ApprovalStepStatus.PENDING;
        this.activatedAt = LocalDateTime.now();
    }
    
    /**
     * 承認処理
     */
    public void approve(UserId approverId, String comment) {
        if (this.status != ApprovalStepStatus.PENDING) {
            throw new IllegalStateException("承認待ち状態でないステップです");
        }
        
        this.status = ApprovalStepStatus.APPROVED;
        this.approverId = approverId;
        this.approvedAt = LocalDateTime.now();
        this.approvalComment = comment;
    }
    
    /**
     * 差し戻し処理
     */
    public void reject(UserId rejectorId, String reason) {
        if (this.status != ApprovalStepStatus.PENDING) {
            throw new IllegalStateException("承認待ち状態でないステップです");
        }
        
        this.status = ApprovalStepStatus.REJECTED;
        this.approverId = rejectorId;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }
    
    /**
     * ステップリセット
     */
    public void reset() {
        this.status = ApprovalStepStatus.NOT_STARTED;
        this.approverId = null;
        this.approvedAt = null;
        this.approvalComment = null;
        this.activatedAt = null;
        this.rejectedAt = null;
        this.rejectionReason = null;
    }
    
    /**
     * 承認期限判定（アクティブ化から3日後）
     */
    public boolean isOverdue() {
        return this.status == ApprovalStepStatus.PENDING &&
               this.activatedAt != null &&
               this.activatedAt.plusDays(3).isBefore(LocalDateTime.now());
    }
    
    public enum ApprovalStepStatus {
        NOT_STARTED("未開始"),
        PENDING("承認待ち"),
        APPROVED("承認済"),
        REJECTED("差し戻し");
        
        private final String displayName;
        
        ApprovalStepStatus(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

## 3. ドメインサービス

### 3.1 TimesheetDomainService
```java
@DomainService
public class TimesheetDomainService {
    
    private final ContractRepository contractRepository;
    private final TimesheetRepository timesheetRepository;
    
    /**
     * 契約署名からの工数表自動作成
     */
    public Timesheet createTimesheetFromContract(ContractSigned event) {
        Contract contract = contractRepository.findById(event.getContractId())
            .orElseThrow(() -> new EntityNotFoundException("契約が見つかりません"));
            
        // 契約開始月の工数表作成
        YearMonth startMonth = YearMonth.from(event.getPeriod().getStartDate());
        
        // 既存の工数表チェック
        if (timesheetRepository.findByEngineerAndPeriod(
                event.getEngineerIds().get(0), startMonth).isPresent()) {
            throw new BusinessRuleViolationException("既に工数表が存在します");
        }
        
        return Timesheet.create(
            event.getEngineerIds().get(0),
            event.getContractId(),
            event.getProjectId(),
            startMonth,
            contract
        );
    }
    
    /**
     * 月次工数表の一括作成
     */
    public List<Timesheet> createMonthlyTimesheets(YearMonth period) {
        List<Contract> activeContracts = contractRepository.findActiveContracts()
            .stream()
            .filter(contract -> contract.isPeriodValid(period.atDay(1)))
            .collect(toList());
            
        List<Timesheet> timesheets = new ArrayList<>();
        
        for (Contract contract : activeContracts) {
            for (EngineerId engineerId : contract.getEngineerIds()) {
                // 既存チェック
                if (timesheetRepository.findByEngineerAndPeriod(engineerId, period).isEmpty()) {
                    Timesheet timesheet = Timesheet.create(
                        engineerId,
                        contract.getId(),
                        contract.getProjectId(),
                        period,
                        contract
                    );
                    timesheets.add(timesheet);
                }
            }
        }
        
        return timesheets;
    }
    
    /**
     * 工数表の一括承認処理
     */
    public List<Timesheet> bulkApproveTimesheets(
            List<TimesheetId> timesheetIds,
            UserId approverId,
            ApprovalFlow.ApprovalLevel level) {
        
        List<Timesheet> timesheets = timesheetIds.stream()
            .map(id -> timesheetRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("工数表が見つかりません")))
            .collect(toList());
            
        List<Timesheet> approvedTimesheets = new ArrayList<>();
        
        for (Timesheet timesheet : timesheets) {
            try {
                timesheet.approve(approverId, level, "一括承認");
                approvedTimesheets.add(timesheet);
            } catch (BusinessRuleViolationException e) {
                // 承認できない工数表はスキップ
                continue;
            }
        }
        
        return approvedTimesheets;
    }
    
    /**
     * 期限超過工数表の自動処理
     */
    public List<Timesheet> handleOverdueTimesheets() {
        List<Timesheet> overdueTimesheets = timesheetRepository.findOverdueTimesheets();
        List<Timesheet> processedTimesheets = new ArrayList<>();
        
        for (Timesheet timesheet : overdueTimesheets) {
            if (timesheet.getStatus() == TimesheetStatus.DRAFT) {
                // 自動提出（一定条件下）
                if (timesheet.getCompletionRate() >= 0.8f) {
                    try {
                        timesheet.submitForApproval();
                        processedTimesheets.add(timesheet);
                    } catch (Exception e) {
                        // 提出できない場合はスキップ
                    }
                }
            }
        }
        
        return processedTimesheets;
    }
    
    /**
     * 労働時間統計分析
     */
    public WorkHoursAnalytics analyzeWorkHours(
            List<EngineerId> engineerIds,
            YearMonth fromPeriod,
            YearMonth toPeriod) {
        
        List<Timesheet> timesheets = timesheetRepository.findByEngineersAndPeriodRange(
            engineerIds, fromPeriod, toPeriod);
            
        // 統計情報の集計
        int totalWorkingDays = 0;
        int totalWorkingHours = 0;
        int totalOvertimeHours = 0;
        Map<EngineerId, WorkHoursSummary> engineerSummaries = new HashMap<>();
        
        for (Timesheet timesheet : timesheets) {
            if (timesheet.getStatus() == TimesheetStatus.APPROVED) {
                WorkHoursSummary summary = timesheet.getSummary();
                totalWorkingDays += summary.getTotalWorkingDays();
                totalWorkingHours += summary.getTotalWorkingHours();
                totalOvertimeHours += summary.getTotalOvertimeHours();
                
                engineerSummaries.merge(
                    timesheet.getEngineerId(),
                    summary,
                    WorkHoursSummary::combine
                );
            }
        }
        
        return new WorkHoursAnalytics(
            fromPeriod,
            toPeriod,
            totalWorkingDays,
            totalWorkingHours,
            totalOvertimeHours,
            engineerSummaries
        );
    }
}
```

### 3.2 TimesheetValidationService
```java
@DomainService
public class TimesheetValidationService {
    
    /**
     * 高度なバリデーションチェック
     */
    public List<ValidationError> validateTimesheet(Timesheet timesheet) {
        List<ValidationError> errors = new ArrayList<>();
        
        // 基本バリデーション
        errors.addAll(validateBasicRules(timesheet));
        
        // 法的バリデーション
        errors.addAll(validateLegalCompliance(timesheet));
        
        // ビジネスルールバリデーション
        errors.addAll(validateBusinessRules(timesheet));
        
        return errors;
    }
    
    private List<ValidationError> validateBasicRules(Timesheet timesheet) {
        List<ValidationError> errors = new ArrayList<>();
        
        // 日別バリデーション
        for (DailyAttendance attendance : timesheet.getAttendances()) {
            errors.addAll(attendance.validate());
        }
        
        return errors;
    }
    
    private List<ValidationError> validateLegalCompliance(Timesheet timesheet) {
        List<ValidationError> errors = new ArrayList<>();
        WorkHoursSummary summary = timesheet.getSummary();
        
        // 法定労働時間チェック（月160時間）
        if (summary.getTotalWorkingHours() > 160) {
            int excessHours = summary.getTotalWorkingHours() - 160;
            errors.add(new ValidationError(
                "LEGAL_WORKING_HOURS_EXCEEDED",
                String.format("法定労働時間を%d時間超過しています", excessHours)
            ));
        }
        
        // 時間外労働上限チェック（月45時間）
        if (summary.getTotalOvertimeHours() > 45) {
            errors.add(new ValidationError(
                "OVERTIME_LIMIT_EXCEEDED",
                "月間時間外労働が45時間を超過しています"
            ));
        }
        
        return errors;
    }
    
    private List<ValidationError> validateBusinessRules(Timesheet timesheet) {
        List<ValidationError> errors = new ArrayList<>();
        
        // プロジェクト固有のビジネスルール
        // 例: 特定顧客の勤務時間制限など
        
        return errors;
    }
}
```

## 4. リポジトリインターフェース

### 4.1 TimesheetRepository
```java
public interface TimesheetRepository {
    
    // === 基本CRUD ===
    void save(Timesheet timesheet);
    Optional<Timesheet> findById(TimesheetId id);
    void delete(TimesheetId id);
    
    // === ステータス検索 ===
    List<Timesheet> findByStatus(TimesheetStatus status);
    List<Timesheet> findPendingApprovalTimesheets();
    List<Timesheet> findOverdueTimesheets();
    
    // === 技術者・期間検索 ===
    Optional<Timesheet> findByEngineerAndPeriod(EngineerId engineerId, YearMonth period);
    List<Timesheet> findByEngineerId(EngineerId engineerId);
    List<Timesheet> findByEngineersAndPeriodRange(
        List<EngineerId> engineerIds, YearMonth fromPeriod, YearMonth toPeriod);
    
    // === 契約・プロジェクト検索 ===
    List<Timesheet> findByContractId(ContractId contractId);
    List<Timesheet> findByProjectId(ProjectId projectId);
    
    // === 承認関連検索 ===
    List<Timesheet> findByApprover(UserId approverId);
    List<Timesheet> findAwaitingApproval(UserId approverId, ApprovalFlow.ApprovalLevel level);
    
    // === 期限管理 ===
    List<Timesheet> findApproachingDeadline(int daysBeforeDeadline);
    List<Timesheet> findBySubmissionDeadline(LocalDate deadline);
    
    // === 統計・集計 ===
    long countByStatusAndPeriod(TimesheetStatus status, YearMonth period);
    WorkHoursSummary aggregateWorkHours(List<TimesheetId> timesheetIds);
    
    // === ID生成 ===
    TimesheetId generateId();
}
```

## 5. ドメインイベント

### 5.1 TimesheetApproved
```java
public class TimesheetApproved implements DomainEvent {
    private final TimesheetId timesheetId;
    private final EngineerId engineerId;
    private final ContractId contractId;
    private final YearMonth period;
    private final WorkHoursSummary workHoursSummary;
    private final UserId finalApprover;
    private final LocalDateTime occurredAt;
    
    // Billing Contextが購読
    // → 請求書作成処理開始
}
```

### 5.2 TimesheetSubmitted
```java
public class TimesheetSubmitted implements DomainEvent {
    private final TimesheetId timesheetId;
    private final EngineerId engineerId;
    private final ProjectId projectId;
    private final YearMonth period;
    private final WorkHoursSummary summary;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → 承認者への通知送信
}
```

### 5.3 TimesheetRejected
```java
public class TimesheetRejected implements DomainEvent {
    private final TimesheetId timesheetId;
    private final EngineerId engineerId;
    private final UserId rejectorId;
    private final String rejectionReason;
    private final LocalDateTime occurredAt;
    
    // Notification Contextが購読
    // → 技術者への差し戻し通知
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **工数表作成制約**
   - 同一技術者・同一期間の工数表は1つのみ
   - 契約期間内のみ作成可能
   - アクティブな契約が必須

2. **編集制約**
   - ドラフトまたは差し戻し状態でのみ編集可能
   - 提出後はロックされ編集不可
   - 対象月内の日付のみ入力可能

3. **提出・承認制約**
   - 必須項目の完全性チェック
   - バリデーションエラーがないこと
   - 承認フローの順序遵守

4. **労働時間制約**
   - 日別最大労働時間（12時間）
   - 月間最大労働時間（200時間）
   - 連続労働日数（6日以下）

## 7. パフォーマンス考慮事項

### 7.1 遅延読み込み
- `attendances`は遅延読み込み
- `specialEntries`は遅延読み込み
- `adjustments`は遅延読み込み
- `approvalFlow.steps`は遅延読み込み

### 7.2 インデックス設計
- `status`カラムにインデックス
- `engineer_id`カラムにインデックス
- `period`カラムにインデックス
- `submission_deadline`カラムにインデックス
- 複合インデックス：`(engineer_id, period)` （ユニーク）
- 複合インデックス：`(status, submission_deadline)`

### 7.3 バッチ処理最適化
- 月次一括作成処理の最適化
- 一括承認処理のトランザクション管理
- 統計集計処理の最適化

---

**作成者**: システム化プロジェクトチーム