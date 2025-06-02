#!/bin/bash

set -e

echo "🔨 SES Manager マイクロサービスビルド開始"

services=("project" "engineer" "matching" "contract" "timesheet" "billing" "report" "notification")

for service in "${services[@]}"; do
    echo "🏗️ ${service}-service ビルド中..."
    cd services/${service}-service
    ./gradlew build -x test
    echo "✅ ${service}-service ビルド完了"
    cd ../..
done

echo "🎉 全マイクロサービスビルド完了！"
echo ""
echo "🚀 次のコマンドで全サービスを起動できます:"
echo "   docker-compose up -d"