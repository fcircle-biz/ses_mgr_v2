# Matching Context 物理テーブル設計

## 概要

Matching Context（マッチング管理）の物理データベース設計。案件と技術者の効率的なマッチング処理とアルゴリズム最適化を実現。

### 対象集約
- **Matching集約**: 案件と技術者のマッチング処理
- **MatchingRequest集約**: マッチング依頼管理
- **MatchingResult集約**: マッチング結果管理

---

## テーブル設計

### 1. matching_requests（マッチング依頼テーブル）

```sql
-- Matching依頼集約ルート
CREATE TABLE matching_requests (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id                  UUID NOT NULL,
    
    -- === 依頼情報 ===
    request_title               VARCHAR(200) NOT NULL,
    request_description         TEXT,
    requested_by                UUID NOT NULL,
    priority                    VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN (
        'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    )),
    
    -- === マッチング条件（JSONB） ===
    matching_criteria           JSONB NOT NULL,
    /*
    matching_criteria構造:
    {
        "requiredSkills": [
            {
                "skillName": "Java",
                "minLevel": "INTERMEDIATE",
                "weight": 0.8,
                "mandatory": true
            }
        ],
        "experienceLevel": "SENIOR",
        "workLocation": "HYBRID",
        "availabilityPeriod": {
            "startDate": "2025-04-01",
            "endDate": "2025-09-30"
        },
        "teamSize": 5,
        "budgetConstraints": {
            "maxMonthlyRate": 1000000,
            "currency": "JPY"
        },
        "industryExperience": ["金融", "製造"],
        "exclusions": {
            "excludedEngineers": ["uuid1", "uuid2"],
            "excludedCompanies": ["company1"]
        }
    }
    */
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',              -- 依頼中
        'IN_PROGRESS',          -- 処理中
        'COMPLETED',            -- 完了
        'CANCELLED',            -- キャンセル
        'FAILED'                -- 失敗
    )),
    
    -- === 処理スケジュール ===
    scheduled_at                TIMESTAMP WITH TIME ZONE,
    started_at                  TIMESTAMP WITH TIME ZONE,
    completed_at                TIMESTAMP WITH TIME ZONE,
    deadline                    TIMESTAMP WITH TIME ZONE,
    
    -- === アルゴリズム設定 ===
    algorithm_version           VARCHAR(20) DEFAULT 'v1.0',
    algorithm_settings          JSONB,
    /*
    algorithm_settings構造:
    {
        "matchingMethod": "WEIGHTED_SCORE",
        "weights": {
            "skillMatch": 0.4,
            "experienceMatch": 0.3,
            "availabilityMatch": 0.2,
            "ratingMatch": 0.1
        },
        "thresholds": {
            "minScore": 0.7,
            "maxResults": 20
        },
        "preferences": {
            "diversityBonus": true,
            "recentProjectBonus": true
        }
    }
    */
    
    -- === 結果統計 ===
    total_candidates            INTEGER DEFAULT 0,
    qualified_candidates        INTEGER DEFAULT 0,
    final_matches               INTEGER DEFAULT 0,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_matching_requests_project_id ON matching_requests(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_requests_status ON matching_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_requests_priority ON matching_requests(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_requests_scheduled ON matching_requests(scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_requests_deadline ON matching_requests(deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_requests_requested_by ON matching_requests(requested_by) WHERE deleted_at IS NULL;

-- マッチング条件検索用GINインデックス
CREATE INDEX idx_matching_requests_criteria ON matching_requests USING GIN (matching_criteria);
CREATE INDEX idx_matching_requests_algorithm ON matching_requests USING GIN (algorithm_settings);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_matching_requests_updated_at
    BEFORE UPDATE ON matching_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. matching_results（マッチング結果テーブル）

```sql
-- マッチング結果テーブル
CREATE TABLE matching_results (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matching_request_id         UUID NOT NULL REFERENCES matching_requests(id) ON DELETE CASCADE,
    engineer_id                 UUID NOT NULL,
    
    -- === スコア情報 ===
    overall_score               DECIMAL(5,3) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    ranking                     INTEGER NOT NULL,
    
    -- === 詳細スコア（JSONB） ===
    score_breakdown             JSONB NOT NULL,
    /*
    score_breakdown構造:
    {
        "skillScore": 0.85,
        "experienceScore": 0.90,
        "availabilityScore": 1.0,
        "ratingScore": 0.75,
        "industryScore": 0.80,
        "locationScore": 0.95,
        "budgetScore": 0.88,
        "detailedBreakdown": {
            "skills": [
                {
                    "skillName": "Java",
                    "required": "INTERMEDIATE",
                    "actual": "EXPERT",
                    "score": 0.95,
                    "weight": 0.8
                }
            ],
            "penalties": {
                "overbudget": -0.1,
                "locationMismatch": -0.05
            },
            "bonuses": {
                "sameIndustry": 0.1,
                "recentProject": 0.05
            }
        }
    }
    */
    
    -- === マッチング根拠 ===
    matching_reason             TEXT,
    confidence_level            DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    -- === リスク・課題 ===
    risk_factors                JSONB,
    /*
    risk_factors構造:
    {
        "skillGaps": ["React経験不足"],
        "availabilityConflicts": ["開始日1週間遅れ"],
        "budgetIssues": ["希望単価10%超過"],
        "locationConcerns": ["リモート希望だが客先常駐"],
        "overallRisk": "LOW"
    }
    */
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',              -- 未確認
        'REVIEWED',             -- レビュー済み
        'SHORTLISTED',          -- 候補選出
        'CONTACTED',            -- 連絡済み
        'INTERVIEWED',          -- 面談済み
        'ACCEPTED',             -- 受諾
        'REJECTED',             -- 却下
        'WITHDRAWN'             -- 取り下げ
    )),
    
    -- === 処理履歴 ===
    reviewed_at                 TIMESTAMP WITH TIME ZONE,
    reviewed_by                 UUID,
    contacted_at                TIMESTAMP WITH TIME ZONE,
    responded_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_request_engineer UNIQUE(matching_request_id, engineer_id) WHERE deleted_at IS NULL
);

-- インデックス
CREATE INDEX idx_matching_results_request_id ON matching_results(matching_request_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_results_engineer_id ON matching_results(engineer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_results_score ON matching_results(overall_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_results_ranking ON matching_results(ranking) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_results_status ON matching_results(status) WHERE deleted_at IS NULL;

-- 複合インデックス（ランキング表示用）
CREATE INDEX idx_matching_results_request_ranking ON matching_results(matching_request_id, ranking) 
WHERE deleted_at IS NULL;

-- スコア詳細検索用GINインデックス
CREATE INDEX idx_matching_results_score_breakdown ON matching_results USING GIN (score_breakdown);
CREATE INDEX idx_matching_results_risk_factors ON matching_results USING GIN (risk_factors);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_matching_results_updated_at
    BEFORE UPDATE ON matching_results
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. matching_evaluations（マッチング評価テーブル）

```sql
-- マッチング評価・フィードバックテーブル
CREATE TABLE matching_evaluations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matching_result_id          UUID NOT NULL REFERENCES matching_results(id) ON DELETE CASCADE,
    
    -- === 評価者情報 ===
    evaluator_id                UUID NOT NULL,
    evaluator_role              VARCHAR(20) NOT NULL CHECK (evaluator_role IN (
        'SALES_REP',            -- 営業担当
        'PROJECT_MANAGER',      -- プロジェクトマネージャー
        'ENGINEER',             -- 技術者本人
        'CLIENT',               -- 顧客
        'SYSTEM'                -- システム自動評価
    )),
    
    -- === 評価結果 ===
    evaluation_type             VARCHAR(20) NOT NULL CHECK (evaluation_type IN (
        'INITIAL_REVIEW',       -- 初期レビュー
        'INTERVIEW_FEEDBACK',   -- 面談フィードバック
        'PROJECT_FEEDBACK',     -- プロジェクト実績フィードバック
        'FINAL_EVALUATION'      -- 最終評価
    )),
    
    -- === 評価スコア ===
    overall_satisfaction        INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
    accuracy_rating            INTEGER CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
    
    -- === 詳細評価（JSONB） ===
    evaluation_details          JSONB NOT NULL,
    /*
    evaluation_details構造:
    {
        "skillAccuracy": 4,
        "experienceMatch": 5,
        "communicationSkill": 4,
        "problemSolvingAbility": 5,
        "teamFit": 4,
        "clientSatisfaction": 5,
        "projectSuccess": true,
        "deliveryOnTime": true,
        "budgetCompliance": true,
        "recommendations": [
            "スキルセットが要件に完全一致",
            "コミュニケーション能力が高い"
        ],
        "improvements": [
            "React経験をもう少し重視すべき"
        ]
    }
    */
    
    -- === コメント・フィードバック ===
    comments                    TEXT,
    recommendations            TEXT,
    improvement_suggestions    TEXT,
    
    -- === 実績データ ===
    actual_performance         JSONB,
    /*
    actual_performance構造:
    {
        "projectDuration": "6ヶ月",
        "actualRate": 850000,
        "performanceRating": 4.5,
        "clientRetention": true,
        "referralGenerated": false,
        "extensionOffered": true
    }
    */
    
    -- === ステータス ===
    status                     VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT',               -- 下書き
        'SUBMITTED',           -- 提出済み
        'REVIEWED',            -- レビュー済み
        'APPROVED',            -- 承認済み
        'ARCHIVED'             -- アーカイブ
    )),
    
    -- === 監査情報 ===
    created_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 UUID NOT NULL,
    updated_by                 UUID NOT NULL,
    version                    INTEGER NOT NULL DEFAULT 1,
    deleted_at                 TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_matching_evaluations_result_id ON matching_evaluations(matching_result_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_evaluations_evaluator ON matching_evaluations(evaluator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_evaluations_type ON matching_evaluations(evaluation_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_evaluations_satisfaction ON matching_evaluations(overall_satisfaction) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_evaluations_accuracy ON matching_evaluations(accuracy_rating) WHERE deleted_at IS NULL;

-- 評価詳細検索用GINインデックス
CREATE INDEX idx_matching_evaluations_details ON matching_evaluations USING GIN (evaluation_details);
CREATE INDEX idx_matching_evaluations_performance ON matching_evaluations USING GIN (actual_performance);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_matching_evaluations_updated_at
    BEFORE UPDATE ON matching_evaluations
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. matching_algorithm_configs（アルゴリズム設定テーブル）

```sql
-- マッチングアルゴリズム設定テーブル
CREATE TABLE matching_algorithm_configs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 設定情報 ===
    config_name                 VARCHAR(100) NOT NULL,
    version                     VARCHAR(20) NOT NULL,
    description                 TEXT,
    is_active                   BOOLEAN DEFAULT FALSE,
    is_default                  BOOLEAN DEFAULT FALSE,
    
    -- === アルゴリズム設定（JSONB） ===
    algorithm_settings          JSONB NOT NULL,
    /*
    algorithm_settings構造:
    {
        "matchingMethod": "WEIGHTED_SCORE",
        "weights": {
            "skillMatch": 0.4,
            "experienceMatch": 0.3,
            "availabilityMatch": 0.2,
            "ratingMatch": 0.1
        },
        "skillLevelMapping": {
            "BEGINNER": 1,
            "INTERMEDIATE": 2,
            "ADVANCED": 3,
            "EXPERT": 4,
            "MASTER": 5
        },
        "thresholds": {
            "minScore": 0.7,
            "maxResults": 20,
            "confidenceThreshold": 0.8
        },
        "bonuses": {
            "sameIndustryBonus": 0.1,
            "recentProjectBonus": 0.05,
            "diversityBonus": 0.02,
            "loyaltyBonus": 0.03
        },
        "penalties": {
            "skillGapPenalty": -0.2,
            "overbudgetPenalty": -0.15,
            "locationMismatchPenalty": -0.1
        },
        "filters": {
            "minRating": 3.0,
            "maxBudgetVariance": 0.2,
            "requiredAvailability": true
        }
    }
    */
    
    -- === 適用範囲 ===
    applicable_contexts         JSONB,
    /*
    applicable_contexts構造:
    {
        "projectTypes": ["WEB_APPLICATION", "MOBILE_APPLICATION"],
        "industries": ["金融", "製造"],
        "budgetRanges": [
            {"min": 0, "max": 1000000},
            {"min": 1000000, "max": 5000000}
        ],
        "teamSizes": [1, 2, 3, 4, 5],
        "durations": ["SHORT", "MEDIUM", "LONG"]
    }
    */
    
    -- === パフォーマンス統計 ===
    performance_stats           JSONB,
    /*
    performance_stats構造:
    {
        "totalExecutions": 150,
        "averageExecutionTime": 2.5,
        "successRate": 0.85,
        "averageAccuracy": 0.78,
        "userSatisfaction": 4.2,
        "lastUpdateStats": "2025-06-01T10:00:00Z"
    }
    */
    
    -- === 作成者・承認者 ===
    created_by                  UUID NOT NULL,
    approved_by                 UUID,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version_number              INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_config_version UNIQUE(config_name, version) WHERE deleted_at IS NULL,
    CONSTRAINT single_default_config EXCLUDE (is_default WITH =) WHERE (is_default = true AND deleted_at IS NULL)
);

-- インデックス
CREATE INDEX idx_matching_algorithm_configs_name ON matching_algorithm_configs(config_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_algorithm_configs_active ON matching_algorithm_configs(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_matching_algorithm_configs_default ON matching_algorithm_configs(is_default) WHERE deleted_at IS NULL;

-- 設定内容検索用GINインデックス
CREATE INDEX idx_matching_algorithm_configs_settings ON matching_algorithm_configs USING GIN (algorithm_settings);
CREATE INDEX idx_matching_algorithm_configs_contexts ON matching_algorithm_configs USING GIN (applicable_contexts);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_matching_algorithm_configs_updated_at
    BEFORE UPDATE ON matching_algorithm_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

---

## ビュー定義

### 1. matching_dashboard_view（マッチングダッシュボードビュー）

```sql
-- マッチングダッシュボード用のビュー
CREATE VIEW matching_dashboard_view AS
SELECT 
    mr.id as request_id,
    mr.project_id,
    mr.request_title,
    mr.priority,
    mr.status as request_status,
    mr.total_candidates,
    mr.qualified_candidates,
    mr.final_matches,
    mr.deadline,
    mr.created_at as request_created_at,
    
    -- プロジェクト情報（Project Contextから）
    p.name as project_name,
    p.status as project_status,
    p.customer_id,
    
    -- 結果統計
    result_stats.top_score,
    result_stats.avg_score,
    result_stats.reviewed_count,
    result_stats.shortlisted_count,
    result_stats.accepted_count,
    
    -- 評価統計
    eval_stats.avg_satisfaction,
    eval_stats.avg_accuracy,
    eval_stats.evaluation_count
    
FROM matching_requests mr
LEFT JOIN projects p ON mr.project_id = p.id
LEFT JOIN LATERAL (
    SELECT 
        MAX(overall_score) as top_score,
        AVG(overall_score) as avg_score,
        COUNT(*) FILTER (WHERE status = 'REVIEWED') as reviewed_count,
        COUNT(*) FILTER (WHERE status = 'SHORTLISTED') as shortlisted_count,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted_count
    FROM matching_results mres 
    WHERE mres.matching_request_id = mr.id 
      AND mres.deleted_at IS NULL
) result_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        AVG(overall_satisfaction) as avg_satisfaction,
        AVG(accuracy_rating) as avg_accuracy,
        COUNT(*) as evaluation_count
    FROM matching_evaluations me 
    JOIN matching_results mres2 ON me.matching_result_id = mres2.id
    WHERE mres2.matching_request_id = mr.id 
      AND me.deleted_at IS NULL
      AND mres2.deleted_at IS NULL
) eval_stats ON true
WHERE mr.deleted_at IS NULL;
```

---

## パフォーマンス最適化

### 1. マテリアライズドビュー

```sql
-- マッチング精度統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW matching_accuracy_stats AS
SELECT 
    date_trunc('month', mr.created_at) as month,
    mr.algorithm_version,
    COUNT(*) as total_requests,
    AVG(mr.final_matches) as avg_matches_per_request,
    AVG(result_stats.avg_score) as avg_matching_score,
    AVG(eval_stats.avg_satisfaction) as avg_user_satisfaction,
    AVG(eval_stats.avg_accuracy) as avg_accuracy_rating
FROM matching_requests mr
LEFT JOIN LATERAL (
    SELECT AVG(overall_score) as avg_score
    FROM matching_results mres 
    WHERE mres.matching_request_id = mr.id 
      AND mres.deleted_at IS NULL
) result_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        AVG(overall_satisfaction) as avg_satisfaction,
        AVG(accuracy_rating) as avg_accuracy
    FROM matching_evaluations me 
    JOIN matching_results mres2 ON me.matching_result_id = mres2.id
    WHERE mres2.matching_request_id = mr.id 
      AND me.deleted_at IS NULL
      AND mres2.deleted_at IS NULL
) eval_stats ON true
WHERE mr.deleted_at IS NULL
  AND mr.created_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    date_trunc('month', mr.created_at),
    mr.algorithm_version;

-- 統計ビュー用インデックス
CREATE INDEX idx_matching_accuracy_stats_month ON matching_accuracy_stats(month);
CREATE INDEX idx_matching_accuracy_stats_algorithm ON matching_accuracy_stats(algorithm_version);
```

### 2. 専用スキーマ

```sql
-- マッチング処理用の専用スキーマ作成
CREATE SCHEMA matching_engine;

-- 高速検索用の非正規化テーブル
CREATE TABLE matching_engine.engineer_search_cache (
    engineer_id                 UUID PRIMARY KEY,
    full_name                   VARCHAR(200),
    work_status                 VARCHAR(20),
    available_from              DATE,
    overall_rating              DECIMAL(3,2),
    company_id                  UUID,
    employment_type             VARCHAR(20),
    
    -- 集約されたスキル情報
    skills_vector               TSVECTOR,           -- 全文検索用
    skill_categories            TEXT[],             -- 配列形式
    max_skill_levels           JSONB,              -- スキル別最高レベル
    total_experience_years      DECIMAL(4,1),
    
    -- 希望条件
    preferred_rate_min          DECIMAL(10,2),
    preferred_rate_max          DECIMAL(10,2),
    preferred_work_location     VARCHAR(20),
    
    -- 最終更新
    last_refreshed              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 検索用インデックス
CREATE INDEX idx_engineer_search_work_status ON matching_engine.engineer_search_cache(work_status);
CREATE INDEX idx_engineer_search_available ON matching_engine.engineer_search_cache(available_from);
CREATE INDEX idx_engineer_search_rating ON matching_engine.engineer_search_cache(overall_rating DESC);
CREATE INDEX idx_engineer_search_skills ON matching_engine.engineer_search_cache USING GIN (skills_vector);
CREATE INDEX idx_engineer_search_categories ON matching_engine.engineer_search_cache USING GIN (skill_categories);

-- キャッシュ更新関数
CREATE OR REPLACE FUNCTION matching_engine.refresh_engineer_search_cache()
RETURNS VOID AS $$
BEGIN
    TRUNCATE matching_engine.engineer_search_cache;
    
    INSERT INTO matching_engine.engineer_search_cache
    SELECT 
        e.id,
        e.last_name || ' ' || e.first_name,
        e.work_status,
        e.available_from,
        e.overall_rating,
        e.company_id,
        e.employment_type,
        to_tsvector('japanese', string_agg(es.skill_name, ' ')),
        array_agg(DISTINCT es.skill_category),
        jsonb_object_agg(es.skill_name, es.skill_level),
        COALESCE(career_stats.total_years, 0),
        (e.preferences->>'desiredMonthlyRate')::DECIMAL,
        (e.preferences->>'desiredMonthlyRate')::DECIMAL * 1.2,
        e.preferred_work_location,
        CURRENT_TIMESTAMP
    FROM engineers e
    LEFT JOIN engineer_skills es ON e.id = es.engineer_id AND es.deleted_at IS NULL
    LEFT JOIN LATERAL (
        SELECT SUM(
            EXTRACT(YEAR FROM COALESCE(end_date, CURRENT_DATE)) - 
            EXTRACT(YEAR FROM start_date)
        ) as total_years
        FROM engineer_career_history ech 
        WHERE ech.engineer_id = e.id AND ech.deleted_at IS NULL
    ) career_stats ON true
    WHERE e.deleted_at IS NULL
      AND e.status = 'ACTIVE'
    GROUP BY e.id, e.last_name, e.first_name, e.work_status, e.available_from, 
             e.overall_rating, e.company_id, e.employment_type, 
             e.preferences, e.preferred_work_location, career_stats.total_years;
END;
$$ LANGUAGE plpgsql;
```

---

## 運用・保守設計

### 1. パーティショニング戦略

```sql
-- matching_results のパーティショニング（月次）
CREATE TABLE matching_results_partitioned (
    LIKE matching_results INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 月次パーティション作成例
CREATE TABLE matching_results_2025_01 
PARTITION OF matching_results_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE matching_results_2025_02 
PARTITION OF matching_results_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 2. データアーカイブ

```sql
-- 古いマッチング結果のアーカイブ
CREATE OR REPLACE FUNCTION archive_old_matching_data(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 6ヶ月以上古い完了したマッチング依頼をアーカイブ
    WITH archived_requests AS (
        UPDATE matching_requests 
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE status = 'COMPLETED' 
          AND completed_at < cutoff_date
          AND deleted_at IS NULL
        RETURNING id
    )
    UPDATE matching_results 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE matching_request_id IN (SELECT id FROM archived_requests)
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

**作成者**: システム化プロジェクトチーム  
**作成日**: 2025年6月1日  
**対象DB**: PostgreSQL 15  
**関連ドメインモデル**: Matching集約詳細設計  
**次回レビュー**: 2025年7月1日