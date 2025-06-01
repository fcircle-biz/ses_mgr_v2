# 共通レイアウト設計

## 概要

SES業務システムで使用する統一レイアウトテンプレートを、技術スタックに準拠してBootstrap 5.3.x、Thymeleaf 3.1.x、Alpine.js 3.xを使用して設計します。

## 技術スタック構成

### フロントエンド技術
- **Bootstrap**: 5.3.x（CSSフレームワーク）
- **Alpine.js**: 3.x（軽量JavaScript フレームワーク）
- **Thymeleaf**: 3.1.x（テンプレートエンジン）
- **Chart.js**: 4.x（グラフ・チャート）
- **htmx**: 1.9.x（動的UI）

### CDN設定
```html
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css">

<!-- Alpine.js -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.3/dist/cdn.min.js"></script>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>

<!-- htmx -->
<script src="https://unpkg.com/htmx.org@1.9.8"></script>

<!-- Bootstrap JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
```

## ファイル構成

### 設計ドキュメント
1. **[基本レイアウト構造](./01_基本レイアウト構造.md)** - HTML基本構造とレイアウト設計
2. **[ヘッダーコンポーネント](./02_ヘッダーコンポーネント.md)** - ヘッダー設計とThymeleafフラグメント
3. **[サイドバーコンポーネント](./03_サイドバーコンポーネント.md)** - ナビゲーションサイドバー設計
4. **[メインコンテンツ構造](./04_メインコンテンツ構造.md)** - ページコンテンツレイアウト
5. **[共通コンポーネント](./05_共通コンポーネント.md)** - アラート、フッター、モーダル等
6. **[Bootstrap拡張CSS](./06_Bootstrap拡張CSS.md)** - カスタムテーマとスタイル
7. **[Alpine.js共通機能](./07_Alpine.js共通機能.md)** - JavaScript機能とユーティリティ
8. **[使用方法ガイド](./08_使用方法ガイド.md)** - 実装例とベストプラクティス

### 実装ファイル（参考）
- `layout/main.html` - メインテンプレート
- `fragments/header.html` - ヘッダーフラグメント
- `fragments/sidebar.html` - サイドバーフラグメント
- `fragments/footer.html` - フッターフラグメント
- `fragments/alerts.html` - 通知アラート
- `css/ses-theme.css` - カスタムCSS
- `js/ses-common.js` - 共通JavaScript

## レイアウト構成

### 基本レイアウト構造
```
┌─────────────────────────────────────────────────────────┐
│                    ヘッダー                              │
├─────────────────────────────────────────────────────────┤
│          │                                              │
│          │                                              │
│   サイド   │              メインコンテンツ                  │
│  バー      │                                              │
│          │                                              │
│          │                                              │
├─────────────────────────────────────────────────────────┤
│                    フッター                              │
└─────────────────────────────────────────────────────────┘
```

### レスポンシブ対応

#### デスクトップ（1200px以上）
- サイドバー: 固定表示（280px幅）
- メインコンテンツ: 可変幅

#### タブレット（768px-1199px）
- サイドバー: 折りたたみ式（60px幅）
- メインコンテンツ: 全幅利用

#### モバイル（767px以下）
- サイドバー: オーバーレイ表示
- メインコンテンツ: 全幅利用

## アクセシビリティ対応

- **キーボードナビゲーション**: Tab, Shift+Tab, Enter, Escape, Arrow keysのサポート
- **スクリーンリーダー**: ARIA属性の適切な使用
- **コントラスト比**: WCAG 2.1 AA準拠（4.5:1以上）
- **フォーカス表示**: 明確なフォーカスインジケーター
- **ダークモード**: 自動切り替え対応

## 開発方針

### 統一性
- 全画面で一貫したレイアウト
- 共通のデザインシステム
- 統一されたユーザー体験

### 拡張性
- 新しいページの追加が容易
- コンポーネントの再利用
- カスタマイズ可能な設計

### 保守性
- 明確なファイル構成
- ドキュメント化された設計
- 標準的なコーディング規約

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**バージョン**: 1.0