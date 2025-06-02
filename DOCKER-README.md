# SES Manager 開発環境構築ガイド

## 📋 概要

このガイドでは、SES Manager の Docker 開発環境のセットアップ手順を説明します。

## 🏗️ アーキテクチャ

### サービス構成
- **8つのマイクロサービス**: Project, Engineer, Matching, Contract, Timesheet, Billing, Report, Notification
- **データベース**: PostgreSQL 15 (Database per Service)
- **認証**: Keycloak
- **キャッシュ**: Redis
- **メッセージング**: Apache Kafka
- **ネットワーク**: Docker Bridge Network (172.20.0.0/16)

### ポート構成
| サービス | ポート | 用途 |
|----------|--------|------|
| PostgreSQL | 5432 | データベース |
| Redis | 6379 | キャッシュ |
| Kafka | 9092 | メッセージング |
| Zookeeper | 2181 | Kafka管理 |
| Keycloak | 8080 | 認証サーバー |
| Project Service | 8081 | 案件管理API |
| Engineer Service | 8082 | 技術者管理API |
| Matching Service | 8083 | マッチングAPI |
| Contract Service | 8084 | 契約管理API |
| Timesheet Service | 8085 | 勤怠管理API |
| Billing Service | 8086 | 請求管理API |
| Report Service | 8087 | レポートAPI |
| Notification Service | 8088 | 通知API |

## 🚀 クイックスタート

### 1. 環境確認
```bash
# Docker, Docker Compose がインストールされていることを確認
docker --version
docker-compose --version
```

### 2. インフラサービス起動
```bash
# 自動セットアップスクリプト実行
./scripts/dev-setup.sh
```

### 3. マイクロサービスビルド
```bash
# 全サービスをビルド
./scripts/build-services.sh
```

### 4. 全サービス起動
```bash
# 全サービスを起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

## 🔧 手動セットアップ

### インフラサービスのみ起動
```bash
# PostgreSQL, Redis, Kafka, Keycloak のみ起動
docker-compose up -d postgres redis zookeeper kafka keycloak
```

### 特定のサービスのみ起動
```bash
# 例: Project Service のみ起動
docker-compose up -d project-service
```

### 個別サービスビルド
```bash
# 例: Project Service のみビルド
cd services/project-service
./gradlew build -x test
```

## 📊 ヘルスチェック

### サービス状態確認
```bash
# 全サービスの状態確認
docker-compose ps

# 特定のサービスの詳細確認
docker-compose logs project-service
```

### エンドポイント確認
```bash
# Keycloak管理画面
curl http://localhost:8080

# Project Service ヘルスチェック
curl http://localhost:8081/actuator/health

# PostgreSQL接続確認
docker-compose exec postgres psql -U ses_user -d project_db -c '\l'
```

## 🗃️ データベース

### アクセス情報
- **ホスト**: localhost:5432
- **ユーザー**: ses_user
- **パスワード**: ses_password

### データベース一覧
- `project_db` - Project Service
- `engineer_db` - Engineer Service
- `matching_db` - Matching Service
- `contract_db` - Contract Service
- `timesheet_db` - Timesheet Service
- `billing_db` - Billing Service
- `report_db` - Report Service
- `notification_db` - Notification Service
- `keycloak_db` - Keycloak

### データベース接続
```bash
# Project Service DB に接続
docker-compose exec postgres psql -U ses_user -d project_db

# 全データベース表示
docker-compose exec postgres psql -U ses_user -d ses_db -c '\l'
```

## 🔐 Keycloak 認証

### 管理画面アクセス
- **URL**: http://localhost:8080
- **Admin User**: admin
- **Admin Password**: admin

### テストユーザー
| ユーザー | パスワード | ロール |
|----------|------------|--------|
| admin | admin123 | admin |
| project_manager | pm123 | project_manager |
| engineer | engineer123 | engineer |

### レルム設定
- **レルム名**: ses-manager
- **クライアント**: ses-backend, ses-frontend

## 🔄 開発ワークフロー

### 1. コード変更後の再ビルド
```bash
# 特定サービスの再ビルドと再起動
docker-compose stop project-service
cd services/project-service && ./gradlew build -x test && cd ../..
docker-compose up -d project-service
```

### 2. ログ確認
```bash
# 全サービスのログをリアルタイム表示
docker-compose logs -f

# 特定サービスのログのみ表示
docker-compose logs -f project-service
```

### 3. データベースリセット
```bash
# データベースボリュームを削除して初期状態に戻す
docker-compose down -v
docker-compose up -d postgres
```

## 🧹 クリーンアップ

### 開発環境クリーンアップ
```bash
# 自動クリーンアップスクリプト実行
./scripts/cleanup.sh
```

### 手動クリーンアップ
```bash
# 全サービス停止
docker-compose down

# ボリューム含めて削除
docker-compose down -v

# イメージも削除
docker-compose down --rmi all -v
```

## 🐛 トラブルシューティング

### よくある問題

#### 1. ポートが既に使用されている
```bash
# ポート使用状況確認
netstat -tulpn | grep :8080

# プロセス終了
sudo lsof -ti:8080 | xargs kill -9
```

#### 2. Keycloak が起動しない
```bash
# Keycloak ログ確認
docker-compose logs keycloak

# PostgreSQL の起動確認
docker-compose ps postgres
```

#### 3. マイクロサービスが起動しない
```bash
# 依存関係確認
docker-compose ps

# 特定サービスのログ確認
docker-compose logs project-service

# ビルドエラー確認
cd services/project-service && ./gradlew build
```

#### 4. データベース接続エラー
```bash
# PostgreSQL の状態確認
docker-compose exec postgres pg_isready -U ses_user -d ses_db

# 接続設定確認
docker-compose exec postgres psql -U ses_user -d project_db -c 'SELECT version();'
```

## 📝 設定ファイル

### 環境変数設定
各サービスの環境変数は `docker-compose.yml` で設定されています：

```yaml
environment:
  SPRING_PROFILES_ACTIVE: docker
  SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/project_db
  KEYCLOAK_AUTH_SERVER_URL: http://keycloak:8080
  # その他の設定...
```

### カスタム設定
開発環境固有の設定は各サービスの `application-docker.yml` で管理します。

## 🔗 関連文書

- [実装ガイドライン](doc/01_管理/実装ガイドライン.md)
- [プロジェクト作業チェックシート](doc/01_管理/プロジェクト作業チェックシート.md)
- [API詳細設計](doc/04_詳細設計/02_API詳細設計/)

---

**作成者**: 開発チーム  
**最終更新**: 2025年6月2日