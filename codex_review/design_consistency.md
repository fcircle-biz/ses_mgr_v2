# 設計書整合性確認結果

## 対象
- `doc/04_詳細設計/01_ドメインモデル詳細設計/*.md`
- `doc/04_詳細設計/02_API詳細設計/*.md`

## 概要
ドメインモデル設計書とAPI詳細設計書を照合し、主な整合性を確認しました。大部分でコンテキスト構成やエンティティ名は一致していますが、一部で列挙型の名称や値に相違が見られます。

## 主な不整合

### Notification ドメイン
- ドメインモデルでは `NotificationPriority` に `MEDIUM` が定義されていますが、API 仕様では `NORMAL` となっています。
  - ドメイン側抜粋【F:doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/Notification集約詳細設計.md†L387-L399】
  - API側抜粋【F:doc/04_詳細設計/02_API詳細設計/Notification_Context_API.md†L1152-L1163】
- `NotificationStatus` もドメインとAPIで値のセットが異なります。
  - ドメイン側【F:doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/Notification集約詳細設計.md†L402-L417】
  - API側【F:doc/04_詳細設計/02_API詳細設計/Notification_Context_API.md†L240-L246】
- ドメインでは受信者範囲を `NotificationAudience`（ALL_USERS など）で定義していますが、APIでは `recipientType`（USER/GROUP/ROLE）となっており対応関係が不明です。【F:doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/Notification集約詳細設計.md†L428-L442】【F:doc/04_詳細設計/02_API詳細設計/Notification_Context_API.md†L1158-L1164】

### Project ドメイン
- `ProjectStatus` の値がドメインとAPIで大きく異なります。
  - ドメイン側【F:doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/Project集約詳細設計.md†L239-L248】
  - API側【F:doc/04_詳細設計/02_API詳細設計/Project_Context_API.md†L824-L840】
  - ドメインでは LEAD, PROPOSING, NEGOTIATING など、API では INQUIRY, NEGOTIATING, PROPOSING ... となっており直接対応していません。

## 整合している点
- Timesheet ドメインの `AttendanceType` や `ApprovalStatus` 等、主要な列挙型はAPI仕様に同じ値で定義されています。【F:doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/Timesheet集約詳細設計.md†L610-L633】【F:doc/04_詳細設計/02_API詳細設計/Timesheet_Context_API.md†L2695-L2721】
- 各ドメインごとにAPI設計書が存在し、ベースURLや責務の説明は概ね一致しています。

## まとめ
Notification と Project の列挙型定義に相違があるため、API 実装時に整合を取る必要があります。それ以外のコンテキストでは大きな差異は確認できませんでした。
