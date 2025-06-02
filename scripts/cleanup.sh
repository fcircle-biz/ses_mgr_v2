#!/bin/bash

set -e

echo "🧹 SES Manager 開発環境クリーンアップ開始"

# Stop all services
echo "🛑 全サービス停止中..."
docker-compose down

# Remove volumes (optional)
read -p "🗑️ ボリューム（データベースデータ等）も削除しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ ボリューム削除中..."
    docker-compose down -v
    docker volume prune -f
fi

# Remove containers and images (optional)
read -p "🗑️ Dockerイメージも削除しますか？ (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ SES Managerイメージ削除中..."
    docker images | grep "ses" | awk '{print $3}' | xargs -r docker rmi -f
fi

# Clean build artifacts
echo "🧹 ビルド成果物クリーンアップ..."
services=("project" "engineer" "matching" "contract" "timesheet" "billing" "report" "notification")

for service in "${services[@]}"; do
    if [ -d "services/${service}-service" ]; then
        cd "services/${service}-service"
        if [ -f "gradlew" ]; then
            ./gradlew clean
        fi
        cd ../..
    fi
done

echo "✅ クリーンアップ完了！"