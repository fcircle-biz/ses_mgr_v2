# Notification集約 詳細設計

## 1. 集約概要

### 1.1 責務
- システム全体の通知の一元管理と配信制御
- マルチチャネル通知（メール、Slack、プッシュ通知）の管理
- 通知テンプレートの管理とパーソナライゼーション
- 通知の送信履歴と成功率の追跡管理

### 1.2 境界
- **含むもの**: Notification（集約ルート）、NotificationTemplate、DeliveryChannel、NotificationRule
- **含まないもの**: 業務データの詳細情報、ユーザー認証情報、外部システムの設定管理

## 2. エンティティ・値オブジェクト詳細設計

### 2.1 Notification（集約ルート）

```java
@Entity
@Table(name = "notifications")
public class Notification {
    // === 識別子 ===
    @Id
    private NotificationId id;
    
    // === 通知基本情報 ===
    private NotificationType type;           // 通知タイプ
    private NotificationCategory category;   // カテゴリ
    private NotificationPriority priority;   // 優先度
    private String title;                    // タイトル
    private String message;                  // メッセージ本文
    
    // === 受信者情報 ===
    private List<UserId> recipients;         // 受信者一覧
    private List<String> recipientRoles;     // 受信ロール
    private NotificationAudience audience;   // 受信者範囲
    
    // === 送信設定 ===
    private List<DeliveryChannel> channels;  // 配信チャネル
    private NotificationTiming timing;       // 送信タイミング
    private LocalDateTime scheduledAt;       // 送信予定日時
    
    // === コンテンツ詳細 ===
    private Map<String, Object> data;        // テンプレート変数
    private List<NotificationAttachment> attachments; // 添付ファイル
    private String actionUrl;                // アクションURL
    
    // === 状態管理 ===
    private NotificationStatus status;
    private List<DeliveryResult> deliveryResults;
    private int retryCount;
    private LocalDateTime lastRetryAt;
    
    // === テンプレート情報 ===
    private NotificationTemplateId templateId;
    private String templateVersion;
    
    // === 監査情報 ===
    private AuditInfo auditInfo;
    private LocalDateTime createdAt;
    private UserId createdBy;
    
    // === ビジネスルール ===
    
    /**
     * ドメインイベントからの通知作成
     */
    public static Notification createFromEvent(
            DomainEvent event,
            NotificationTemplate template,
            List<UserId> recipients) {
        
        if (template == null) {
            throw new IllegalArgumentException("通知テンプレートが必要です");
        }
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("受信者が必要です");
        }
        
        Notification notification = new Notification();
        notification.id = NotificationId.generate();
        notification.type = template.getType();
        notification.category = template.getCategory();
        notification.priority = template.getDefaultPriority();
        notification.recipients = new ArrayList<>(recipients);
        notification.recipientRoles = new ArrayList<>();
        notification.channels = new ArrayList<>(template.getDefaultChannels());
        notification.timing = NotificationTiming.IMMEDIATE;
        notification.status = NotificationStatus.PENDING;
        notification.deliveryResults = new ArrayList<>();
        notification.retryCount = 0;
        notification.templateId = template.getId();
        notification.templateVersion = template.getVersion();
        notification.data = extractEventData(event);
        notification.attachments = new ArrayList<>();
        notification.createdAt = LocalDateTime.now();
        notification.audience = NotificationAudience.SPECIFIC_USERS;
        
        // テンプレートからコンテンツ生成
        notification.generateContent(template);
        
        // 通知作成イベント
        DomainEventPublisher.publish(new NotificationCreated(
            notification.id, notification.type, notification.recipients.size()));
            
        return notification;
    }
    
    /**
     * 緊急通知の作成
     */
    public static Notification createUrgentNotification(
            String title,
            String message,
            List<UserId> recipients,
            List<DeliveryChannel> channels) {
        
        Notification notification = new Notification();
        notification.id = NotificationId.generate();
        notification.type = NotificationType.ALERT;
        notification.category = NotificationCategory.SYSTEM;
        notification.priority = NotificationPriority.URGENT;
        notification.title = title;
        notification.message = message;
        notification.recipients = new ArrayList<>(recipients);
        notification.channels = new ArrayList<>(channels);
        notification.timing = NotificationTiming.IMMEDIATE;
        notification.status = NotificationStatus.PENDING;
        notification.deliveryResults = new ArrayList<>();
        notification.retryCount = 0;
        notification.data = new HashMap<>();
        notification.attachments = new ArrayList<>();
        notification.createdAt = LocalDateTime.now();
        notification.audience = NotificationAudience.SPECIFIC_USERS;
        
        return notification;
    }
    
    /**
     * 通知の送信
     */
    public void send() {
        if (this.status != NotificationStatus.PENDING) {
            throw new BusinessRuleViolationException("送信可能な状態ではありません");
        }
        
        // 送信タイミングチェック
        if (!isTimeToSend()) {
            return;
        }
        
        this.status = NotificationStatus.SENDING;
        
        // 各チャネルで送信
        for (DeliveryChannel channel : channels) {
            DeliveryResult result = channel.deliver(this);
            this.deliveryResults.add(result);
        }
        
        // 結果判定
        updateStatusBasedOnResults();
        
        // 送信完了イベント
        if (this.status == NotificationStatus.SENT) {
            DomainEventPublisher.publish(new NotificationSent(
                this.id, this.type, this.recipients.size(), this.channels.size()));
        }
    }
    
    /**
     * 送信失敗時のリトライ
     */
    public void retry() {
        if (this.status != NotificationStatus.FAILED && 
            this.status != NotificationStatus.PARTIALLY_SENT) {
            throw new BusinessRuleViolationException("リトライ可能な状態ではありません");
        }
        if (this.retryCount >= 3) {
            throw new BusinessRuleViolationException("リトライ上限に達しています");
        }
        
        this.retryCount++;
        this.lastRetryAt = LocalDateTime.now();
        this.status = NotificationStatus.RETRYING;
        
        // 失敗したチャネルのみ再送信
        retryFailedChannels();
        
        // 結果更新
        updateStatusBasedOnResults();
        
        // リトライイベント
        DomainEventPublisher.publish(new NotificationRetried(
            this.id, this.retryCount));
    }
    
    /**
     * 通知のキャンセル
     */
    public void cancel(String cancelReason) {
        if (this.status == NotificationStatus.SENT) {
            throw new BusinessRuleViolationException("送信済みの通知はキャンセルできません");
        }
        
        this.status = NotificationStatus.CANCELLED;
        
        // キャンセルイベント
        DomainEventPublisher.publish(new NotificationCancelled(
            this.id, cancelReason));
    }
    
    /**
     * 受信者の追加
     */
    public void addRecipient(UserId userId) {
        if (this.status == NotificationStatus.SENT) {
            throw new BusinessRuleViolationException("送信済みの通知に受信者を追加できません");
        }
        if (this.recipients.contains(userId)) {
            return; // 既に含まれている
        }
        
        this.recipients.add(userId);
    }
    
    /**
     * 配信チャネルの追加
     */
    public void addDeliveryChannel(DeliveryChannel channel) {
        if (this.status == NotificationStatus.SENT) {
            throw new BusinessRuleViolationException("送信済みの通知にチャネルを追加できません");
        }
        if (this.channels.contains(channel)) {
            return; // 既に含まれている
        }
        
        this.channels.add(channel);
    }
    
    /**
     * 送信遅延の設定
     */
    public void scheduleFor(LocalDateTime scheduledTime) {
        if (this.status != NotificationStatus.PENDING) {
            throw new BusinessRuleViolationException("ペンディング状態のみスケジュール可能です");
        }
        if (scheduledTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("過去の日時は指定できません");
        }
        
        this.timing = NotificationTiming.SCHEDULED;
        this.scheduledAt = scheduledTime;
        this.status = NotificationStatus.SCHEDULED;
    }
    
    // === プライベートメソッド ===
    
    private void generateContent(NotificationTemplate template) {
        this.title = template.generateTitle(this.data);
        this.message = template.generateMessage(this.data);
        this.actionUrl = template.generateActionUrl(this.data);
    }
    
    private static Map<String, Object> extractEventData(DomainEvent event) {
        Map<String, Object> data = new HashMap<>();
        
        // イベントのタイプに応じてデータを抽出
        if (event instanceof ProjectOrdered) {
            ProjectOrdered projectEvent = (ProjectOrdered) event;
            data.put("projectId", projectEvent.getProjectId().getValue());
            data.put("occurredAt", projectEvent.getOccurredAt());
        } else if (event instanceof InvoiceIssued) {
            InvoiceIssued invoiceEvent = (InvoiceIssued) event;
            data.put("customerId", invoiceEvent.getCustomerId().getValue());
            data.put("totalAmount", invoiceEvent.getTotalAmount().getAmount());
            data.put("dueDate", invoiceEvent.getDueDate());
        }
        // 他のイベントタイプも同様に処理
        
        return data;
    }
    
    private boolean isTimeToSend() {
        switch (this.timing) {
            case IMMEDIATE:
                return true;
            case SCHEDULED:
                return this.scheduledAt != null && 
                       !LocalDateTime.now().isBefore(this.scheduledAt);
            case DELAYED:
                // 遅延送信のロジック
                return true;
            default:
                return false;
        }
    }
    
    private void updateStatusBasedOnResults() {
        long successCount = deliveryResults.stream()
            .filter(result -> result.getStatus() == DeliveryStatus.SUCCESS)
            .count();
        long failureCount = deliveryResults.stream()
            .filter(result -> result.getStatus() == DeliveryStatus.FAILED)
            .count();
            
        if (successCount == channels.size()) {
            this.status = NotificationStatus.SENT;
        } else if (failureCount == channels.size()) {
            this.status = NotificationStatus.FAILED;
        } else {
            this.status = NotificationStatus.PARTIALLY_SENT;
        }
    }
    
    private void retryFailedChannels() {
        for (int i = 0; i < channels.size(); i++) {
            DeliveryResult lastResult = deliveryResults.get(i);
            if (lastResult.getStatus() == DeliveryStatus.FAILED) {
                DeliveryChannel channel = channels.get(i);
                DeliveryResult retryResult = channel.deliver(this);
                deliveryResults.set(i, retryResult);
            }
        }
    }
    
    // === ゲッターメソッド ===
    
    public boolean isUrgent() {
        return this.priority == NotificationPriority.URGENT;
    }
    
    public boolean isSent() {
        return this.status == NotificationStatus.SENT;
    }
    
    public boolean needsRetry() {
        return (this.status == NotificationStatus.FAILED || 
                this.status == NotificationStatus.PARTIALLY_SENT) &&
               this.retryCount < 3;
    }
    
    public float getDeliverySuccessRate() {
        if (deliveryResults.isEmpty()) {
            return 0.0f;
        }
        
        long successCount = deliveryResults.stream()
            .filter(result -> result.getStatus() == DeliveryStatus.SUCCESS)
            .count();
            
        return (float) successCount / deliveryResults.size();
    }
    
    public Duration getTimeSinceCreation() {
        return Duration.between(this.createdAt, LocalDateTime.now());
    }
    
    public enum NotificationType {
        INFO("情報"),
        WARNING("警告"),
        ERROR("エラー"),
        ALERT("アラート"),
        REMINDER("リマインダー");
        
        private final String displayName;
        
        NotificationType(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum NotificationCategory {
        SYSTEM("システム"),
        BUSINESS("業務"),
        APPROVAL("承認"),
        DEADLINE("期限"),
        SECURITY("セキュリティ");
        
        private final String displayName;
        
        NotificationCategory(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum NotificationPriority {
        LOW("低", 1),
        MEDIUM("中", 2),
        HIGH("高", 3),
        URGENT("緊急", 4);
        
        private final String displayName;
        private final int level;
        
        NotificationPriority(String displayName, int level) {
            this.displayName = displayName;
            this.level = level;
        }
    }
    
    public enum NotificationStatus {
        PENDING("待機"),
        SCHEDULED("スケジュール済"),
        SENDING("送信中"),
        SENT("送信済"),
        PARTIALLY_SENT("一部送信済"),
        FAILED("送信失敗"),
        RETRYING("リトライ中"),
        CANCELLED("キャンセル");
        
        private final String displayName;
        
        NotificationStatus(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum NotificationTiming {
        IMMEDIATE("即座"),
        SCHEDULED("スケジュール"),
        DELAYED("遅延");
        
        private final String displayName;
        
        NotificationTiming(String displayName) {
            this.displayName = displayName;
        }
    }
    
    public enum NotificationAudience {
        ALL_USERS("全ユーザー"),
        SPECIFIC_USERS("特定ユーザー"),
        ROLE_BASED("ロールベース"),
        DEPARTMENT("部署");
        
        private final String displayName;
        
        NotificationAudience(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.2 値オブジェクト設計

#### DeliveryChannel（配信チャネル）
```java
@Embeddable
public class DeliveryChannel {
    private ChannelType type;                // チャネルタイプ
    private String name;                     // チャネル名
    private Map<String, String> settings;   // チャネル固有設定
    private boolean isEnabled;               // 有効/無効
    private int priority;                    // 送信優先度
    
    public DeliveryChannel(ChannelType type, String name) {
        this.type = type;
        this.name = name;
        this.settings = new HashMap<>();
        this.isEnabled = true;
        this.priority = 1;
    }
    
    /**
     * 通知の配信
     */
    public DeliveryResult deliver(Notification notification) {
        if (!this.isEnabled) {
            return DeliveryResult.disabled();
        }
        
        try {
            switch (this.type) {
                case EMAIL:
                    return deliverByEmail(notification);
                case SLACK:
                    return deliverBySlack(notification);
                case PUSH:
                    return deliverByPush(notification);
                case SMS:
                    return deliverBySMS(notification);
                default:
                    return DeliveryResult.unsupported();
            }
        } catch (Exception e) {
            return DeliveryResult.failure(e.getMessage());
        }
    }
    
    /**
     * メール配信
     */
    private DeliveryResult deliverByEmail(Notification notification) {
        // メール送信ロジック
        String smtpServer = settings.get("smtp_server");
        String fromAddress = settings.get("from_address");
        
        if (smtpServer == null || fromAddress == null) {
            return DeliveryResult.failure("メール設定が不完全です");
        }
        
        // 実際のメール送信処理
        EmailMessage email = createEmailMessage(notification);
        boolean success = sendEmail(email);
        
        return success ? DeliveryResult.success() : DeliveryResult.failure("メール送信失敗");
    }
    
    /**
     * Slack配信
     */
    private DeliveryResult deliverBySlack(Notification notification) {
        String webhookUrl = settings.get("webhook_url");
        String channel = settings.get("channel");
        
        if (webhookUrl == null) {
            return DeliveryResult.failure("Slack設定が不完全です");
        }
        
        // Slackメッセージ作成と送信
        SlackMessage message = createSlackMessage(notification, channel);
        boolean success = sendSlackMessage(message, webhookUrl);
        
        return success ? DeliveryResult.success() : DeliveryResult.failure("Slack送信失敗");
    }
    
    /**
     * プッシュ通知配信
     */
    private DeliveryResult deliverByPush(Notification notification) {
        String fcmServerKey = settings.get("fcm_server_key");
        
        if (fcmServerKey == null) {
            return DeliveryResult.failure("プッシュ通知設定が不完全です");
        }
        
        // FCMでプッシュ通知送信
        PushMessage pushMessage = createPushMessage(notification);
        boolean success = sendPushNotification(pushMessage);
        
        return success ? DeliveryResult.success() : DeliveryResult.failure("プッシュ通知送信失敗");
    }
    
    /**
     * SMS配信
     */
    private DeliveryResult deliverBySMS(Notification notification) {
        String apiKey = settings.get("sms_api_key");
        String serviceUrl = settings.get("sms_service_url");
        
        if (apiKey == null || serviceUrl == null) {
            return DeliveryResult.failure("SMS設定が不完全です");
        }
        
        // SMS送信
        SMSMessage smsMessage = createSMSMessage(notification);
        boolean success = sendSMS(smsMessage);
        
        return success ? DeliveryResult.success() : DeliveryResult.failure("SMS送信失敗");
    }
    
    // === プライベートメソッド ===
    
    private EmailMessage createEmailMessage(Notification notification) {
        return new EmailMessage(
            notification.getTitle(),
            notification.getMessage(),
            extractEmailAddresses(notification.getRecipients())
        );
    }
    
    private SlackMessage createSlackMessage(Notification notification, String channel) {
        return new SlackMessage(
            channel != null ? channel : "#general",
            notification.getTitle(),
            notification.getMessage(),
            determineSlackColor(notification.getPriority())
        );
    }
    
    private PushMessage createPushMessage(Notification notification) {
        return new PushMessage(
            notification.getTitle(),
            notification.getMessage(),
            extractDeviceTokens(notification.getRecipients())
        );
    }
    
    private SMSMessage createSMSMessage(Notification notification) {
        String smsText = notification.getTitle() + ": " + 
                        notification.getMessage().substring(0, Math.min(100, notification.getMessage().length()));
        return new SMSMessage(
            smsText,
            extractPhoneNumbers(notification.getRecipients())
        );
    }
    
    private boolean sendEmail(EmailMessage email) {
        // 実際のメール送信処理
        return true; // 簡略化
    }
    
    private boolean sendSlackMessage(SlackMessage message, String webhookUrl) {
        // 実際のSlack API呼び出し
        return true; // 簡略化
    }
    
    private boolean sendPushNotification(PushMessage message) {
        // 実際のFCM API呼び出し
        return true; // 簡略化
    }
    
    private boolean sendSMS(SMSMessage message) {
        // 実際のSMS API呼び出し
        return true; // 簡略化
    }
    
    private List<String> extractEmailAddresses(List<UserId> recipients) {
        // ユーザーIDからメールアドレスを取得
        return recipients.stream()
            .map(userId -> userId.getValue() + "@company.com") // 簡略化
            .collect(toList());
    }
    
    private List<String> extractDeviceTokens(List<UserId> recipients) {
        // ユーザーIDからデバイストークンを取得
        return new ArrayList<>(); // 簡略化
    }
    
    private List<String> extractPhoneNumbers(List<UserId> recipients) {
        // ユーザーIDから電話番号を取得
        return new ArrayList<>(); // 簡略化
    }
    
    private String determineSlackColor(Notification.NotificationPriority priority) {
        switch (priority) {
            case URGENT: return "danger";
            case HIGH: return "warning";
            case MEDIUM: return "good";
            case LOW: return "#439FE0";
            default: return "#439FE0";
        }
    }
    
    /**
     * チャネル設定の更新
     */
    public void updateSetting(String key, String value) {
        this.settings.put(key, value);
    }
    
    /**
     * チャネルの有効/無効切り替え
     */
    public void setEnabled(boolean enabled) {
        this.isEnabled = enabled;
    }
    
    public enum ChannelType {
        EMAIL("メール"),
        SLACK("Slack"),
        PUSH("プッシュ通知"),
        SMS("SMS"),
        IN_APP("アプリ内通知");
        
        private final String displayName;
        
        ChannelType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### DeliveryResult（配信結果）
```java
@Embeddable
public class DeliveryResult {
    private DeliveryStatus status;
    private String message;
    private LocalDateTime deliveredAt;
    private Duration deliveryTime;
    private String externalId;           // 外部システムのID
    private Map<String, String> metadata; // 追加情報
    
    private DeliveryResult(DeliveryStatus status, String message) {
        this.status = status;
        this.message = message;
        this.deliveredAt = LocalDateTime.now();
        this.metadata = new HashMap<>();
    }
    
    public static DeliveryResult success() {
        return new DeliveryResult(DeliveryStatus.SUCCESS, "送信成功");
    }
    
    public static DeliveryResult failure(String errorMessage) {
        return new DeliveryResult(DeliveryStatus.FAILED, errorMessage);
    }
    
    public static DeliveryResult disabled() {
        return new DeliveryResult(DeliveryStatus.DISABLED, "チャネルが無効です");
    }
    
    public static DeliveryResult unsupported() {
        return new DeliveryResult(DeliveryStatus.UNSUPPORTED, "サポートされていないチャネルです");
    }
    
    /**
     * 配信時間の設定
     */
    public void setDeliveryTime(Duration deliveryTime) {
        this.deliveryTime = deliveryTime;
    }
    
    /**
     * 外部システムIDの設定
     */
    public void setExternalId(String externalId) {
        this.externalId = externalId;
    }
    
    /**
     * メタデータの追加
     */
    public void addMetadata(String key, String value) {
        this.metadata.put(key, value);
    }
    
    /**
     * 配信成功判定
     */
    public boolean isSuccessful() {
        return this.status == DeliveryStatus.SUCCESS;
    }
    
    /**
     * 配信失敗判定
     */
    public boolean isFailed() {
        return this.status == DeliveryStatus.FAILED;
    }
    
    public enum DeliveryStatus {
        SUCCESS("成功"),
        FAILED("失敗"),
        DISABLED("無効"),
        UNSUPPORTED("非サポート");
        
        private final String displayName;
        
        DeliveryStatus(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

#### NotificationRule（通知ルール）
```java
@Embeddable
public class NotificationRule {
    private String name;
    private String description;
    private NotificationRuleType type;       // イベントベース/スケジュールベース
    private boolean isActive;
    
    // トリガー条件
    private String eventType;                // 対象イベントタイプ
    private Map<String, Object> conditions;  // 発動条件
    private String scheduleExpression;       // cron式など
    
    // アクション設定
    private NotificationTemplateId templateId;
    private List<String> recipientRoles;    // 受信ロール
    private List<DeliveryChannel> channels;  // 配信チャネル
    private Notification.NotificationPriority priority;
    
    // 制限設定
    private Duration cooldownPeriod;         // クールダウン期間
    private int maxNotificationsPerHour;     // 時間当たり最大通知数
    private LocalDateTime lastTriggeredAt;   // 最終発動日時
    
    public NotificationRule(String name, NotificationRuleType type) {
        this.name = name;
        this.type = type;
        this.isActive = true;
        this.conditions = new HashMap<>();
        this.recipientRoles = new ArrayList<>();
        this.channels = new ArrayList<>();
        this.priority = Notification.NotificationPriority.MEDIUM;
        this.cooldownPeriod = Duration.ofMinutes(15);
        this.maxNotificationsPerHour = 10;
    }
    
    /**
     * ルールの適用判定
     */
    public boolean shouldTrigger(DomainEvent event) {
        if (!isActive) {
            return false;
        }
        
        // イベントタイプチェック
        if (!matchesEventType(event)) {
            return false;
        }
        
        // クールダウンチェック
        if (isInCooldown()) {
            return false;
        }
        
        // 時間当たり通知数制限チェック
        if (exceedsHourlyLimit()) {
            return false;
        }
        
        // 条件チェック
        return evaluateConditions(event);
    }
    
    /**
     * 通知の作成
     */
    public Notification createNotification(DomainEvent event, NotificationTemplate template) {
        List<UserId> recipients = resolveRecipients(event);
        
        Notification notification = Notification.createFromEvent(event, template, recipients);
        notification.setPriority(this.priority);
        
        // チャネルの追加
        for (DeliveryChannel channel : this.channels) {
            notification.addDeliveryChannel(channel);
        }
        
        // 最終発動日時更新
        this.lastTriggeredAt = LocalDateTime.now();
        
        return notification;
    }
    
    /**
     * ルールの有効/無効切り替え
     */
    public void setActive(boolean active) {
        this.isActive = active;
    }
    
    /**
     * 条件の追加
     */
    public void addCondition(String key, Object value) {
        this.conditions.put(key, value);
    }
    
    /**
     * 受信ロールの追加
     */
    public void addRecipientRole(String role) {
        if (!this.recipientRoles.contains(role)) {
            this.recipientRoles.add(role);
        }
    }
    
    // === プライベートメソッド ===
    
    private boolean matchesEventType(DomainEvent event) {
        if (this.eventType == null) {
            return true; // 全イベント対象
        }
        return event.getClass().getSimpleName().equals(this.eventType);
    }
    
    private boolean isInCooldown() {
        if (this.lastTriggeredAt == null) {
            return false;
        }
        return this.lastTriggeredAt.plus(this.cooldownPeriod).isAfter(LocalDateTime.now());
    }
    
    private boolean exceedsHourlyLimit() {
        // 時間当たり通知数のチェックロジック
        // 実際の実装ではデータベースから過去1時間の通知数を取得
        return false;
    }
    
    private boolean evaluateConditions(DomainEvent event) {
        // 条件評価ロジック
        // 実際の実装ではより複雑な条件エンジンが必要
        return true;
    }
    
    private List<UserId> resolveRecipients(DomainEvent event) {
        // ロールから実際のユーザーIDへの解決
        // 実際の実装ではユーザー管理システムと連携
        return new ArrayList<>();
    }
    
    public enum NotificationRuleType {
        EVENT_BASED("イベントベース"),
        SCHEDULE_BASED("スケジュールベース"),
        THRESHOLD_BASED("闾値ベース");
        
        private final String displayName;
        
        NotificationRuleType(String displayName) {
            this.displayName = displayName;
        }
    }
}
```

### 2.3 エンティティ設計

#### NotificationTemplate（通知テンプレート）
```java
@Entity
@Table(name = "notification_templates")
public class NotificationTemplate {
    @Id
    private NotificationTemplateId id;
    
    private String name;
    private String description;
    private Notification.NotificationType type;
    private Notification.NotificationCategory category;
    
    // テンプレート内容
    private String titleTemplate;            // タイトルテンプレート
    private String messageTemplate;          // メッセージテンプレート
    private String actionUrlTemplate;        // アクションURLテンプレート
    
    // チャネル別テンプレート
    private Map<DeliveryChannel.ChannelType, String> channelTemplates;
    
    // デフォルト設定
    private Notification.NotificationPriority defaultPriority;
    private List<DeliveryChannel> defaultChannels;
    private Duration defaultDelay;
    
    // バージョン管理
    private String version;
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserId createdBy;
    
    public NotificationTemplate(String name, 
                               Notification.NotificationType type,
                               Notification.NotificationCategory category) {
        this.id = NotificationTemplateId.generate();
        this.name = name;
        this.type = type;
        this.category = category;
        this.channelTemplates = new HashMap<>();
        this.defaultChannels = new ArrayList<>();
        this.defaultPriority = Notification.NotificationPriority.MEDIUM;
        this.defaultDelay = Duration.ZERO;
        this.version = "1.0";
        this.isActive = true;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * タイトルの生成
     */
    public String generateTitle(Map<String, Object> data) {
        return processTemplate(this.titleTemplate, data);
    }
    
    /**
     * メッセージの生成
     */
    public String generateMessage(Map<String, Object> data) {
        return processTemplate(this.messageTemplate, data);
    }
    
    /**
     * アクションURLの生成
     */
    public String generateActionUrl(Map<String, Object> data) {
        if (this.actionUrlTemplate == null) {
            return null;
        }
        return processTemplate(this.actionUrlTemplate, data);
    }
    
    /**
     * チャネル別コンテンツの生成
     */
    public String generateChannelContent(DeliveryChannel.ChannelType channelType, Map<String, Object> data) {
        String template = channelTemplates.get(channelType);
        if (template == null) {
            return generateMessage(data); // フォールバックで基本メッセージを使用
        }
        return processTemplate(template, data);
    }
    
    /**
     * テンプレートの更新
     */
    public void updateTemplate(String titleTemplate, String messageTemplate, String actionUrlTemplate) {
        this.titleTemplate = titleTemplate;
        this.messageTemplate = messageTemplate;
        this.actionUrlTemplate = actionUrlTemplate;
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * チャネル別テンプレートの設定
     */
    public void setChannelTemplate(DeliveryChannel.ChannelType channelType, String template) {
        this.channelTemplates.put(channelType, template);
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * デフォルトチャネルの追加
     */
    public void addDefaultChannel(DeliveryChannel channel) {
        if (!this.defaultChannels.contains(channel)) {
            this.defaultChannels.add(channel);
        }
    }
    
    /**
     * テンプレートのアクティブ/非アクティブ切り替え
     */
    public void setActive(boolean active) {
        this.isActive = active;
        this.updatedAt = LocalDateTime.now();
    }
    
    /**
     * テンプレートの新バージョン作成
     */
    public NotificationTemplate createNewVersion() {
        NotificationTemplate newVersion = new NotificationTemplate(this.name, this.type, this.category);
        newVersion.titleTemplate = this.titleTemplate;
        newVersion.messageTemplate = this.messageTemplate;
        newVersion.actionUrlTemplate = this.actionUrlTemplate;
        newVersion.channelTemplates = new HashMap<>(this.channelTemplates);
        newVersion.defaultPriority = this.defaultPriority;
        newVersion.defaultChannels = new ArrayList<>(this.defaultChannels);
        newVersion.defaultDelay = this.defaultDelay;
        newVersion.version = incrementVersion(this.version);
        newVersion.createdBy = this.createdBy;
        
        // 現在のバージョンを非アクティブ化
        this.isActive = false;
        
        return newVersion;
    }
    
    // === プライベートメソッド ===
    
    private String processTemplate(String template, Map<String, Object> data) {
        if (template == null || template.isEmpty()) {
            return "";
        }
        
        String result = template;
        
        // 簡単なテンプレート処理（実際はもっと高機能なテンプレートエンジンが必要）
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() != null ? entry.getValue().toString() : "";
            result = result.replace(placeholder, value);
        }
        
        return result;
    }
    
    private String incrementVersion(String currentVersion) {
        try {
            String[] parts = currentVersion.split("\\.");
            int major = Integer.parseInt(parts[0]);
            int minor = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            
            return major + "." + (minor + 1);
        } catch (Exception e) {
            return "1.0";
        }
    }
    
    /**
     * テンプレートの妥当性チェック
     */
    public boolean isValid() {
        return titleTemplate != null && !titleTemplate.trim().isEmpty() &&
               messageTemplate != null && !messageTemplate.trim().isEmpty();
    }
    
    /**
     * テンプレート変数の抽出
     */
    public List<String> extractVariables() {
        List<String> variables = new ArrayList<>();
        extractVariablesFromTemplate(titleTemplate, variables);
        extractVariablesFromTemplate(messageTemplate, variables);
        extractVariablesFromTemplate(actionUrlTemplate, variables);
        
        return variables.stream().distinct().collect(toList());
    }
    
    private void extractVariablesFromTemplate(String template, List<String> variables) {
        if (template == null) return;
        
        // {{variable}} 形式の変数を抽出
        Pattern pattern = Pattern.compile("\\{\\{([^}]+)\\}\\}");
        Matcher matcher = pattern.matcher(template);
        
        while (matcher.find()) {
            variables.add(matcher.group(1).trim());
        }
    }
}
```

## 3. ドメインサービス

### 3.1 NotificationDomainService
```java
@DomainService
public class NotificationDomainService {
    
    private final NotificationRepository notificationRepository;
    private final NotificationTemplateRepository templateRepository;
    private final NotificationRuleRepository ruleRepository;
    
    /**
     * ドメインイベントに基づく通知作成
     */
    public List<Notification> createNotificationsFromEvent(DomainEvent event) {
        // イベントに適用されるルールを取得
        List<NotificationRule> applicableRules = ruleRepository.findApplicableRules(event);
        
        List<Notification> notifications = new ArrayList<>();
        
        for (NotificationRule rule : applicableRules) {
            if (rule.shouldTrigger(event)) {
                NotificationTemplate template = templateRepository.findById(rule.getTemplateId())
                    .orElseThrow(() -> new EntityNotFoundException("テンプレートが見つかりません"));
                    
                Notification notification = rule.createNotification(event, template);
                notifications.add(notification);
            }
        }
        
        return notifications;
    }
    
    /**
     * 緊急通知の一括送信
     */
    public void sendUrgentNotification(
            String title,
            String message,
            List<String> roles,
            List<DeliveryChannel.ChannelType> channelTypes) {
        
        // ロールからユーザーを解決
        List<UserId> recipients = resolveUsersFromRoles(roles);
        
        // チャネルの作成
        List<DeliveryChannel> channels = channelTypes.stream()
            .map(type -> createDefaultChannel(type))
            .collect(toList());
            
        // 緊急通知作成
        Notification urgentNotification = Notification.createUrgentNotification(
            title, message, recipients, channels);
            
        // 即座送信
        urgentNotification.send();
        
        // 保存
        notificationRepository.save(urgentNotification);
    }
    
    /**
     * スケジュールされた通知の処理
     */
    public List<Notification> processScheduledNotifications() {
        List<Notification> scheduledNotifications = 
            notificationRepository.findScheduledNotifications(LocalDateTime.now());
            
        List<Notification> processedNotifications = new ArrayList<>();
        
        for (Notification notification : scheduledNotifications) {
            try {
                notification.send();
                notificationRepository.save(notification);
                processedNotifications.add(notification);
            } catch (Exception e) {
                // エラーログ出力して続行
                continue;
            }
        }
        
        return processedNotifications;
    }
    
    /**
     * 失敗通知のリトライ処理
     */
    public List<Notification> retryFailedNotifications() {
        List<Notification> failedNotifications = notificationRepository.findFailedNotifications();
        List<Notification> retriedNotifications = new ArrayList<>();
        
        for (Notification notification : failedNotifications) {
            if (notification.needsRetry()) {
                try {
                    notification.retry();
                    notificationRepository.save(notification);
                    retriedNotifications.add(notification);
                } catch (Exception e) {
                    // エラーログ出力して続行
                    continue;
                }
            }
        }
        
        return retriedNotifications;
    }
    
    /**
     * 通知統計の分析
     */
    public NotificationAnalytics analyzeNotificationPerformance(YearMonth period) {
        List<Notification> notifications = notificationRepository.findByPeriod(period);
        
        long totalNotifications = notifications.size();
        long sentNotifications = notifications.stream()
            .filter(Notification::isSent)
            .count();
            
        long urgentNotifications = notifications.stream()
            .filter(Notification::isUrgent)
            .count();
            
        Map<Notification.NotificationCategory, Long> categoryDistribution = 
            notifications.stream()
                .collect(Collectors.groupingBy(
                    Notification::getCategory,
                    Collectors.counting()
                ));
                
        Map<DeliveryChannel.ChannelType, Float> channelSuccessRates = 
            calculateChannelSuccessRates(notifications);
            
        return new NotificationAnalytics(
            period,
            totalNotifications,
            sentNotifications,
            urgentNotifications,
            (float) sentNotifications / totalNotifications,
            categoryDistribution,
            channelSuccessRates
        );
    }
    
    // === プライベートメソッド ===
    
    private List<UserId> resolveUsersFromRoles(List<String> roles) {
        // ユーザー管理システムと連携してロールからユーザーIDを解決
        return new ArrayList<>(); // 簡略化
    }
    
    private DeliveryChannel createDefaultChannel(DeliveryChannel.ChannelType type) {
        DeliveryChannel channel = new DeliveryChannel(type, type.getDisplayName());
        
        // チャネルタイプに応じたデフォルト設定
        switch (type) {
            case EMAIL:
                channel.updateSetting("smtp_server", "smtp.company.com");
                channel.updateSetting("from_address", "noreply@company.com");
                break;
            case SLACK:
                channel.updateSetting("webhook_url", "https://hooks.slack.com/...");
                break;
        }
        
        return channel;
    }
    
    private Map<DeliveryChannel.ChannelType, Float> calculateChannelSuccessRates(
            List<Notification> notifications) {
        
        Map<DeliveryChannel.ChannelType, Float> successRates = new HashMap<>();
        
        for (DeliveryChannel.ChannelType channelType : DeliveryChannel.ChannelType.values()) {
            List<DeliveryResult> results = notifications.stream()
                .flatMap(n -> n.getDeliveryResults().stream())
                .filter(r -> r.getChannelType() == channelType)
                .collect(toList());
                
            if (!results.isEmpty()) {
                long successCount = results.stream()
                    .filter(DeliveryResult::isSuccessful)
                    .count();
                float successRate = (float) successCount / results.size();
                successRates.put(channelType, successRate);
            }
        }
        
        return successRates;
    }
}
```

### 3.2 NotificationEventHandler
```java
@DomainService
public class NotificationEventHandler {
    
    private final NotificationDomainService notificationService;
    private final NotificationRepository notificationRepository;
    
    /**
     * 案件受注イベント処理
     */
    @EventHandler
    public void handle(ProjectOrdered event) {
        List<Notification> notifications = notificationService.createNotificationsFromEvent(event);
        
        for (Notification notification : notifications) {
            notification.send();
            notificationRepository.save(notification);
        }
    }
    
    /**
     * 請求書発行イベント処理
     */
    @EventHandler
    public void handle(InvoiceIssued event) {
        List<Notification> notifications = notificationService.createNotificationsFromEvent(event);
        
        for (Notification notification : notifications) {
            notification.send();
            notificationRepository.save(notification);
        }
    }
    
    /**
     * 工数表提出イベント処理
     */
    @EventHandler
    public void handle(TimesheetSubmitted event) {
        List<Notification> notifications = notificationService.createNotificationsFromEvent(event);
        
        for (Notification notification : notifications) {
            notification.send();
            notificationRepository.save(notification);
        }
    }
    
    /**
     * マッチング完了イベント処理
     */
    @EventHandler
    public void handle(MatchingCompleted event) {
        List<Notification> notifications = notificationService.createNotificationsFromEvent(event);
        
        for (Notification notification : notifications) {
            notification.send();
            notificationRepository.save(notification);
        }
    }
    
    /**
     * レポート生成イベント処理
     */
    @EventHandler
    public void handle(ReportGenerated event) {
        List<Notification> notifications = notificationService.createNotificationsFromEvent(event);
        
        for (Notification notification : notifications) {
            notification.send();
            notificationRepository.save(notification);
        }
    }
}
```

## 4. リポジトリインターフェース

### 4.1 NotificationRepository
```java
public interface NotificationRepository {
    
    // === 基本CRUD ===
    void save(Notification notification);
    Optional<Notification> findById(NotificationId id);
    void delete(NotificationId id);
    
    // === ステータス検索 ===
    List<Notification> findByStatus(Notification.NotificationStatus status);
    List<Notification> findPendingNotifications();
    List<Notification> findFailedNotifications();
    List<Notification> findScheduledNotifications(LocalDateTime beforeTime);
    
    // === タイプ・カテゴリ検索 ===
    List<Notification> findByType(Notification.NotificationType type);
    List<Notification> findByCategory(Notification.NotificationCategory category);
    List<Notification> findByPriority(Notification.NotificationPriority priority);
    
    // === 受信者検索 ===
    List<Notification> findByRecipient(UserId userId);
    List<Notification> findByRecipientRole(String role);
    
    // === 期間検索 ===
    List<Notification> findByPeriod(YearMonth period);
    List<Notification> findByDateRange(LocalDateTime fromDate, LocalDateTime toDate);
    List<Notification> findRecentNotifications(Duration withinDuration);
    
    // === リトライ関連 ===
    List<Notification> findNotificationsNeedingRetry();
    List<Notification> findByRetryCount(int retryCount);
    
    // === 統計・集計 ===
    long countByStatus(Notification.NotificationStatus status);
    long countByPeriod(YearMonth period);
    float calculateSuccessRate(YearMonth period);
    
    // === ID生成 ===
    NotificationId generateId();
}
```

### 4.2 NotificationTemplateRepository
```java
public interface NotificationTemplateRepository {
    void save(NotificationTemplate template);
    Optional<NotificationTemplate> findById(NotificationTemplateId id);
    
    // === アクティブテンプレート ===
    List<NotificationTemplate> findActiveTemplates();
    Optional<NotificationTemplate> findActiveByTypeAndCategory(
        Notification.NotificationType type, Notification.NotificationCategory category);
    
    // === バージョン管理 ===
    List<NotificationTemplate> findByNameOrderByVersion(String name);
    Optional<NotificationTemplate> findLatestVersion(String name);
    
    NotificationTemplateId generateId();
}
```

## 5. ドメインイベント

### 5.1 NotificationSent
```java
public class NotificationSent implements DomainEvent {
    private final NotificationId notificationId;
    private final Notification.NotificationType type;
    private final int recipientCount;
    private final int channelCount;
    private final LocalDateTime occurredAt;
    
    // Report Contextが購読
    // → 通知統計情報更新
}
```

### 5.2 NotificationFailed
```java
public class NotificationFailed implements DomainEvent {
    private final NotificationId notificationId;
    private final String failureReason;
    private final int retryCount;
    private final LocalDateTime occurredAt;
    
    // システム管理者へのアラートなど
}
```

## 6. 集約不変条件

### 6.1 ビジネスルール
1. **通知作成制約**
   - 有効なテンプレートからのみ作成可能
   - 受信者が1名以上必須
   - 配信チャネルが1つ以上必須

2. **送信制約**
   - ペンディング状態からのみ送信可能
   - 送信済みの通知はキャンセル不可
   - スケジュール時刻の適切性

3. **リトライ制約**
   - 最大3回までのリトライ
   - 失敗または一部送信済み状態からのみリトライ可能
   - リトライ間隔の適切な制御

## 7. パフォーマンス考慮事項

### 7.1 非同期処理
- 通知送信のキュー処理
- バッチリトライ処理
- スケジュール通知の非同期実行

### 7.2 キャッシュ戦略
- テンプレートのメモリキャッシュ
- ユーザー情報のキャッシュ
- チャネル設定のキャッシュ

### 7.3 インデックス設計
- `status`カラムにインデックス
- `type`カラムにインデックス
- `priority`カラムにインデックス
- `scheduled_at`カラムにインデックス
- `created_at`カラムにインデックス
- 複合インデックス：`(status, priority, created_at)`
- 複合インデックス：`(type, category, created_at)`

### 7.4 外部システム連携最適化
- Slack/メール送信のバッチ処理
- APIレスポンスのタイムアウト制御
- リトライ処理の指数バックオフ

---

**作成者**: システム化プロジェクトチーム