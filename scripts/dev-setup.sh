#!/bin/bash

set -e

echo "🚀 SES Manager 開発環境セットアップ開始"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Dockerがインストールされていません。Dockerをインストールしてください。"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Composeがインストールされていません。Docker Composeをインストールしてください。"
    exit 1
fi

echo "✅ Docker環境確認完了"

# Create necessary directories
echo "📁 ディレクトリ構造作成中..."
mkdir -p docker/postgres/data
mkdir -p docker/keycloak/data

# Set permissions
chmod +x docker/postgres/init/01-init-databases.sh

echo "✅ ディレクトリ構造作成完了"

# Start infrastructure services first
echo "🏗️ インフラサービス起動中..."
docker-compose up -d postgres redis zookeeper kafka keycloak

echo "⏳ インフラサービスの起動を待機中..."
sleep 30

# Check infrastructure health
echo "🔍 インフラサービスのヘルスチェック..."

# Wait for PostgreSQL
until docker-compose exec postgres pg_isready -U ses_user -d ses_db; do
  echo "PostgreSQLの起動を待機中..."
  sleep 5
done
echo "✅ PostgreSQL 起動完了"

# Wait for Keycloak
until curl -f http://localhost:8080/health/ready; do
  echo "Keycloakの起動を待機中..."
  sleep 10
done
echo "✅ Keycloak 起動完了"

# Wait for Kafka
until docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092; do
  echo "Kafkaの起動を待機中..."
  sleep 5
done
echo "✅ Kafka 起動完了"

echo "🎉 インフラサービス起動完了！"
echo ""
echo "📋 アクセス情報:"
echo "   PostgreSQL: localhost:5432 (ses_user/ses_password)"
echo "   Keycloak Admin: http://localhost:8080 (admin/admin)"
echo "   Redis: localhost:6379"
echo "   Kafka: localhost:9092"
echo ""
echo "🔧 次のステップ:"
echo "   1. マイクロサービスをビルド: ./scripts/build-services.sh"
echo "   2. 全サービス起動: docker-compose up -d"
echo "   3. ログ確認: docker-compose logs -f"