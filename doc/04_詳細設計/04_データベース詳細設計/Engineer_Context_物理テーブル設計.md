# Engineer Context 物理テーブル設計

## 概要

Engineer Context（技術者管理）の物理データベース設計。技術者情報・スキル管理・キャリア履歴の効率的な管理とマッチング最適化を実現。

### 対象集約
- **Engineer集約**: 技術者情報とスキル管理の中核
- **Company集約**: 会社・組織管理
- **Skill集約**: スキル体系管理

---

## テーブル設計

### 1. engineers（技術者テーブル）

```sql
-- Engineer集約ルート
CREATE TABLE engineers (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number             VARCHAR(20) UNIQUE,     -- 社員番号
    
    -- === 基本情報 ===
    last_name                   VARCHAR(50) NOT NULL,
    first_name                  VARCHAR(50) NOT NULL,
    last_name_kana              VARCHAR(50),
    first_name_kana             VARCHAR(50),
    email                       VARCHAR(200) UNIQUE NOT NULL,
    phone                       VARCHAR(20),
    
    -- === 個人情報（暗号化対象） ===
    birth_date                  DATE,
    gender                      VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    nationality                 VARCHAR(3),             -- ISO 3166-1 alpha-3
    
    -- === 住所情報（JSONB） ===
    address_info                JSONB,
    /*
    address_info構造:
    {
        "current": {
            "postalCode": "150-0001",
            "prefecture": "東京都",
            "city": "渋谷区",
            "addressLine1": "神宮前1-1-1",
            "addressLine2": "レジデンス101"
        },
        "emergency": {
            "contactName": "田中花子",
            "relationship": "配偶者",
            "phone": "090-1234-5678"
        }
    }
    */
    
    -- === 雇用情報 ===
    company_id                  UUID NOT NULL,
    employment_type             VARCHAR(20) NOT NULL CHECK (employment_type IN (
        'FULL_TIME',            -- 正社員
        'CONTRACT',             -- 契約社員
        'PART_TIME',            -- パートタイム
        'FREELANCE',            -- フリーランス
        'PARTNER_COMPANY'       -- 協力会社
    )),
    hire_date                   DATE NOT NULL,
    termination_date            DATE,
    
    -- === 稼働状況 ===
    work_status                 VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (work_status IN (
        'AVAILABLE',            -- 稼働可能
        'ASSIGNED',             -- アサイン済み
        'BUSY',                 -- 多忙
        'ON_LEAVE',             -- 休暇中
        'TRAINING',             -- 研修中
        'TERMINATED'            -- 退職
    )),
    available_from              DATE,
    preferred_work_location     VARCHAR(20) CHECK (preferred_work_location IN (
        'REMOTE',               -- リモート
        'CLIENT_SITE',          -- 客先
        'HYBRID',               -- ハイブリッド
        'OFFICE'                -- 自社オフィス
    )),
    
    -- === 希望条件（JSONB） ===
    preferences                 JSONB,
    /*
    preferences構造:
    {
        "desiredHourlyRate": 5000,
        "desiredMonthlyRate": 800000,
        "maxWorkingHours": 160,
        "preferredIndustries": ["金融", "製造"],
        "preferredProjectSize": "MEDIUM",
        "careerGoals": "PMとしてのキャリアアップ",
        "skillDevelopmentAreas": ["AWS", "マネジメント"]
    }
    */
    
    -- === 評価情報 ===
    overall_rating              DECIMAL(3,2) CHECK (overall_rating >= 0 AND overall_rating <= 5),
    last_evaluation_date        DATE,
    evaluation_comments         TEXT,
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE',               -- 有効
        'INACTIVE',             -- 無効
        'SUSPENDED',            -- 停止中
        'ARCHIVED'              -- アーカイブ
    )),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_termination_date CHECK (
        termination_date IS NULL OR hire_date <= termination_date
    ),
    CONSTRAINT valid_available_date CHECK (
        available_from IS NULL OR available_from >= CURRENT_DATE
    )
);

-- インデックス
CREATE INDEX idx_engineers_work_status ON engineers(work_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_company_id ON engineers(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_employment_type ON engineers(employment_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_available_from ON engineers(available_from) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_email ON engineers(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_name ON engineers(last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineers_hire_date ON engineers(hire_date) WHERE deleted_at IS NULL;

-- 検索用GINインデックス
CREATE INDEX idx_engineers_preferences ON engineers USING GIN (preferences);
CREATE INDEX idx_engineers_address ON engineers USING GIN (address_info);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_engineers_updated_at
    BEFORE UPDATE ON engineers
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 2. engineer_skills（技術者スキルテーブル）

```sql
-- 技術者スキル関連テーブル
CREATE TABLE engineer_skills (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineer_id                 UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
    
    -- === スキル情報 ===
    skill_name                  VARCHAR(100) NOT NULL,
    skill_category              VARCHAR(50) NOT NULL CHECK (skill_category IN (
        'PROGRAMMING_LANGUAGE',  -- プログラミング言語
        'FRAMEWORK',            -- フレームワーク
        'DATABASE',             -- データベース
        'CLOUD',                -- クラウド
        'INFRASTRUCTURE',       -- インフラ
        'METHODOLOGY',          -- 開発手法
        'DOMAIN_KNOWLEDGE',     -- 業務知識
        'SOFT_SKILL',          -- ソフトスキル
        'CERTIFICATION',        -- 資格
        'TOOL'                  -- ツール
    )),
    
    -- === 習熟度 ===
    skill_level                 VARCHAR(20) NOT NULL CHECK (skill_level IN (
        'BEGINNER',             -- 初級 (0-1年)
        'INTERMEDIATE',         -- 中級 (1-3年)
        'ADVANCED',             -- 上級 (3-5年)
        'EXPERT',               -- エキスパート (5年以上)
        'MASTER'                -- マスター (指導可能)
    )),
    experience_years            DECIMAL(3,1) NOT NULL CHECK (experience_years >= 0),
    experience_months           INTEGER DEFAULT 0 CHECK (experience_months >= 0 AND experience_months < 12),
    
    -- === 取得・更新情報 ===
    acquired_date               DATE,
    last_used_date              DATE,
    certification_date          DATE,           -- 資格取得日
    certification_expiry        DATE,           -- 資格有効期限
    certification_number        VARCHAR(100),   -- 資格番号
    
    -- === 評価・検証 ===
    self_assessment            INTEGER CHECK (self_assessment >= 1 AND self_assessment <= 5),
    manager_assessment         INTEGER CHECK (manager_assessment >= 1 AND manager_assessment <= 5),
    verified_by                UUID,           -- 検証者
    verified_at                TIMESTAMP WITH TIME ZONE,
    
    -- === 詳細情報（JSONB） ===
    skill_details              JSONB,
    /*
    skill_details構造:
    {
        "projects": ["プロジェクトA", "プロジェクトB"],
        "achievements": ["パフォーマンス改善20%達成"],
        "trainingHistory": [
            {
                "name": "Spring Boot研修",
                "completedAt": "2024-03-15",
                "score": 95
            }
        ],
        "mentoring": {
            "canMentor": true,
            "mentoredCount": 3
        }
    }
    */
    
    -- === 監査情報 ===
    created_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                 UUID NOT NULL,
    updated_by                 UUID NOT NULL,
    version                    INTEGER NOT NULL DEFAULT 1,
    deleted_at                 TIMESTAMP WITH TIME ZONE,
    
    -- === 複合制約 ===
    CONSTRAINT unique_engineer_skill UNIQUE(engineer_id, skill_name, skill_category) WHERE deleted_at IS NULL,
    CONSTRAINT valid_experience CHECK (
        experience_years * 12 + experience_months >= 0
    ),
    CONSTRAINT valid_certification_dates CHECK (
        certification_expiry IS NULL OR certification_date IS NULL OR 
        certification_date <= certification_expiry
    )
);

-- インデックス
CREATE INDEX idx_engineer_skills_engineer_id ON engineer_skills(engineer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_skills_skill_name ON engineer_skills(skill_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_skills_category ON engineer_skills(skill_category) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_skills_level ON engineer_skills(skill_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_skills_experience ON engineer_skills(experience_years DESC) WHERE deleted_at IS NULL;

-- マッチング用複合インデックス
CREATE INDEX idx_engineer_skills_matching ON engineer_skills(skill_name, skill_level, experience_years DESC) 
WHERE deleted_at IS NULL;

-- スキル詳細検索用GINインデックス
CREATE INDEX idx_engineer_skills_details ON engineer_skills USING GIN (skill_details);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_engineer_skills_updated_at
    BEFORE UPDATE ON engineer_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 3. engineer_career_history（キャリア履歴テーブル）

```sql
-- キャリア履歴テーブル
CREATE TABLE engineer_career_history (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineer_id                 UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
    
    -- === 職歴情報 ===
    company_name                VARCHAR(200) NOT NULL,
    department                  VARCHAR(100),
    position_title              VARCHAR(100) NOT NULL,
    employment_type             VARCHAR(20) CHECK (employment_type IN (
        'FULL_TIME', 'CONTRACT', 'PART_TIME', 'FREELANCE', 'INTERN'
    )),
    
    -- === 期間 ===
    start_date                  DATE NOT NULL,
    end_date                    DATE,
    is_current                  BOOLEAN DEFAULT FALSE,
    
    -- === 職務内容（JSONB） ===
    job_description             JSONB NOT NULL,
    /*
    job_description構造:
    {
        "summary": "Webアプリケーション開発のリードエンジニア",
        "responsibilities": [
            "チームリーダーとして5名のメンバーを管理",
            "Spring Bootを使用したバックエンド開発",
            "PostgreSQLでのデータベース設計"
        ],
        "achievements": [
            "システム処理速度30%向上",
            "コードレビュー文化の定着"
        ],
        "technologies": ["Java", "Spring Boot", "PostgreSQL", "AWS"],
        "teamSize": 5,
        "projectCount": 3,
        "industryDomain": "EC・小売"
    }
    */
    
    -- === 評価・成果 ===
    performance_rating          INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5),
    salary_range                JSONB,          -- 給与情報（暗号化推奨）
    
    -- === 退職理由 ===
    reason_for_leaving          TEXT,
    
    -- === 検証情報 ===
    verified                    BOOLEAN DEFAULT FALSE,
    verified_by                 UUID,
    verified_at                 TIMESTAMP WITH TIME ZONE,
    reference_contact           JSONB,          -- 照会先情報
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_career_dates CHECK (
        end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT valid_current_flag CHECK (
        NOT is_current OR end_date IS NULL
    )
);

-- インデックス
CREATE INDEX idx_engineer_career_engineer_id ON engineer_career_history(engineer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_career_dates ON engineer_career_history(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_career_current ON engineer_career_history(is_current) WHERE deleted_at IS NULL AND is_current = true;
CREATE INDEX idx_engineer_career_company ON engineer_career_history(company_name) WHERE deleted_at IS NULL;

-- 職務内容検索用GINインデックス
CREATE INDEX idx_engineer_career_job_desc ON engineer_career_history USING GIN (job_description);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_engineer_career_updated_at
    BEFORE UPDATE ON engineer_career_history
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 4. engineer_project_experiences（プロジェクト経験テーブル）

```sql
-- プロジェクト経験テーブル
CREATE TABLE engineer_project_experiences (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engineer_id                 UUID NOT NULL REFERENCES engineers(id) ON DELETE CASCADE,
    project_id                  UUID,           -- 自社案件の場合のプロジェクトID参照
    
    -- === プロジェクト基本情報 ===
    project_name                VARCHAR(200) NOT NULL,
    client_company              VARCHAR(200),
    industry                    VARCHAR(100),
    project_type                VARCHAR(50) CHECK (project_type IN (
        'WEB_APPLICATION',      -- Webアプリケーション
        'MOBILE_APPLICATION',   -- モバイルアプリ
        'SYSTEM_INTEGRATION',   -- システム統合
        'DATA_ANALYSIS',        -- データ分析
        'INFRASTRUCTURE',       -- インフラ構築
        'CONSULTING',           -- コンサルティング
        'MAINTENANCE',          -- 保守・運用
        'OTHER'                 -- その他
    )),
    
    -- === 期間・規模 ===
    start_date                  DATE NOT NULL,
    end_date                    DATE,
    duration_months             INTEGER,
    team_size                   INTEGER,
    budget_range                VARCHAR(50),    -- 概算予算レンジ
    
    -- === 役割・責任 ===
    role                        VARCHAR(100) NOT NULL,
    responsibility_level        VARCHAR(20) CHECK (responsibility_level IN (
        'MEMBER',               -- メンバー
        'SUB_LEADER',           -- サブリーダー
        'LEADER',               -- リーダー
        'MANAGER',              -- マネージャー
        'ARCHITECT',            -- アーキテクト
        'CONSULTANT'            -- コンサルタント
    )),
    
    -- === 技術・成果（JSONB） ===
    project_details             JSONB NOT NULL,
    /*
    project_details構造:
    {
        "description": "ECサイトの全面リニューアル",
        "technologies": ["React", "Node.js", "PostgreSQL", "AWS"],
        "methodologies": ["Agile", "Scrum"],
        "responsibilities": [
            "フロントエンド開発リード",
            "UI/UX設計",
            "パフォーマンス最適化"
        ],
        "achievements": [
            "ページ表示速度50%向上",
            "コンバージョン率20%改善"
        ],
        "challenges": [
            "レガシーシステムからの移行",
            "大量データの処理最適化"
        ],
        "lessonsLearned": [
            "マイクロサービス設計の重要性",
            "チーム間コミュニケーションの課題"
        ]
    }
    */
    
    -- === 評価 ===
    client_satisfaction         INTEGER CHECK (client_satisfaction >= 1 AND client_satisfaction <= 5),
    self_evaluation            INTEGER CHECK (self_evaluation >= 1 AND self_evaluation <= 5),
    manager_evaluation         INTEGER CHECK (manager_evaluation >= 1 AND manager_evaluation <= 5),
    
    -- === 参考情報 ===
    reference_available         BOOLEAN DEFAULT FALSE,
    portfolio_url              VARCHAR(500),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT valid_project_dates CHECK (
        end_date IS NULL OR start_date <= end_date
    ),
    CONSTRAINT valid_duration CHECK (
        duration_months IS NULL OR duration_months > 0
    )
);

-- インデックス
CREATE INDEX idx_engineer_projects_engineer_id ON engineer_project_experiences(engineer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_projects_project_id ON engineer_project_experiences(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_projects_dates ON engineer_project_experiences(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_projects_type ON engineer_project_experiences(project_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_projects_role ON engineer_project_experiences(responsibility_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_engineer_projects_industry ON engineer_project_experiences(industry) WHERE deleted_at IS NULL;

-- プロジェクト詳細検索用GINインデックス
CREATE INDEX idx_engineer_projects_details ON engineer_project_experiences USING GIN (project_details);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_engineer_projects_updated_at
    BEFORE UPDATE ON engineer_project_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();
```

### 5. companies（会社テーブル）

```sql
-- 会社・組織テーブル
CREATE TABLE companies (
    -- === 識別子 ===
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- === 基本情報 ===
    name                        VARCHAR(200) NOT NULL,
    name_kana                   VARCHAR(200),
    legal_name                  VARCHAR(200),   -- 正式法人名
    business_registration_number VARCHAR(20),   -- 法人番号
    
    -- === 会社種別 ===
    company_type                VARCHAR(20) NOT NULL CHECK (company_type IN (
        'OWN_COMPANY',          -- 自社
        'PARTNER_COMPANY',      -- 協力会社
        'CLIENT_COMPANY',       -- 顧客企業
        'VENDOR_COMPANY'        -- ベンダー企業
    )),
    
    -- === 企業情報 ===
    industry                    VARCHAR(100),
    employee_count              INTEGER,
    annual_revenue              DECIMAL(15,2),
    listing_status              VARCHAR(20) CHECK (listing_status IN (
        'PUBLIC', 'PRIVATE', 'STARTUP', 'GOVERNMENT', 'NON_PROFIT'
    )),
    established_date            DATE,
    
    -- === 連絡先情報（JSONB） ===
    contact_info                JSONB NOT NULL,
    /*
    contact_info構造:
    {
        "headquarters": {
            "address": "東京都渋谷区...",
            "phone": "03-1234-5678",
            "fax": "03-1234-5679",
            "website": "https://example.com"
        },
        "hr_contact": {
            "department": "人事部",
            "email": "hr@example.com",
            "phone": "03-1234-5680"
        },
        "business_contact": {
            "department": "営業部",
            "email": "sales@example.com"
        }
    }
    */
    
    -- === 契約・取引条件 ===
    partnership_level           VARCHAR(20) CHECK (partnership_level IN (
        'STRATEGIC',            -- 戦略的パートナー
        'PREFERRED',            -- 優先パートナー
        'STANDARD',             -- 標準パートナー
        'TRIAL'                 -- 試行中
    )),
    contract_terms              JSONB,          -- 契約条件
    payment_terms               INTEGER DEFAULT 30,
    
    -- === ステータス ===
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
        'ACTIVE',               -- 有効
        'INACTIVE',             -- 無効
        'SUSPENDED',            -- 停止中
        'TERMINATED'            -- 契約終了
    )),
    
    -- === 監査情報 ===
    created_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by                  UUID NOT NULL,
    updated_by                  UUID NOT NULL,
    version                     INTEGER NOT NULL DEFAULT 1,
    deleted_at                  TIMESTAMP WITH TIME ZONE,
    
    -- === 制約 ===
    CONSTRAINT unique_company_name UNIQUE(name) WHERE deleted_at IS NULL
);

-- インデックス
CREATE INDEX idx_companies_name ON companies(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_type ON companies(company_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_status ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_industry ON companies(industry) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_partnership ON companies(partnership_level) WHERE deleted_at IS NULL;

-- 連絡先検索用GINインデックス
CREATE INDEX idx_companies_contact ON companies USING GIN (contact_info);

-- 更新時刻自動更新トリガー
CREATE TRIGGER trigger_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_projects_updated_at();

-- 外部キー制約追加
ALTER TABLE engineers ADD CONSTRAINT fk_engineers_company_id 
    FOREIGN KEY (company_id) REFERENCES companies(id);
```

---

## ビュー定義

### 1. engineer_summary_view（技術者サマリービュー）

```sql
-- 技術者一覧表示用のビュー
CREATE VIEW engineer_summary_view AS
SELECT 
    e.id,
    e.employee_number,
    e.last_name,
    e.first_name,
    e.email,
    e.work_status,
    e.employment_type,
    e.available_from,
    e.preferred_work_location,
    e.overall_rating,
    e.hire_date,
    e.created_at,
    e.updated_at,
    
    -- 会社情報
    c.name as company_name,
    c.company_type,
    
    -- スキル統計
    skill_stats.total_skills,
    skill_stats.expert_skills,
    skill_stats.programming_languages,
    skill_stats.frameworks,
    skill_stats.cloud_skills,
    
    -- キャリア情報
    career_stats.total_experience_years,
    career_stats.current_position,
    career_stats.previous_companies,
    
    -- プロジェクト経験
    project_stats.total_projects,
    project_stats.recent_projects,
    project_stats.leadership_projects
    
FROM engineers e
LEFT JOIN companies c ON e.company_id = c.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_skills,
        COUNT(*) FILTER (WHERE skill_level IN ('EXPERT', 'MASTER')) as expert_skills,
        COUNT(*) FILTER (WHERE skill_category = 'PROGRAMMING_LANGUAGE') as programming_languages,
        COUNT(*) FILTER (WHERE skill_category = 'FRAMEWORK') as frameworks,
        COUNT(*) FILTER (WHERE skill_category = 'CLOUD') as cloud_skills
    FROM engineer_skills es 
    WHERE es.engineer_id = e.id 
      AND es.deleted_at IS NULL
) skill_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        ROUND(SUM(
            EXTRACT(YEAR FROM COALESCE(end_date, CURRENT_DATE)) - 
            EXTRACT(YEAR FROM start_date) + 
            (EXTRACT(MONTH FROM COALESCE(end_date, CURRENT_DATE)) - 
             EXTRACT(MONTH FROM start_date)) / 12.0
        ), 1) as total_experience_years,
        (SELECT position_title FROM engineer_career_history ech2 
         WHERE ech2.engineer_id = e.id AND ech2.is_current = true 
         ORDER BY start_date DESC LIMIT 1) as current_position,
        COUNT(DISTINCT company_name) as previous_companies
    FROM engineer_career_history ech 
    WHERE ech.engineer_id = e.id 
      AND ech.deleted_at IS NULL
) career_stats ON true
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE start_date >= CURRENT_DATE - INTERVAL '2 years') as recent_projects,
        COUNT(*) FILTER (WHERE responsibility_level IN ('LEADER', 'MANAGER', 'ARCHITECT')) as leadership_projects
    FROM engineer_project_experiences epe 
    WHERE epe.engineer_id = e.id 
      AND epe.deleted_at IS NULL
) project_stats ON true
WHERE e.deleted_at IS NULL
  AND c.deleted_at IS NULL;
```

### 2. engineer_skill_matrix_view（スキルマトリックスビュー）

```sql
-- スキルマトリックス表示用のビュー
CREATE VIEW engineer_skill_matrix_view AS
SELECT 
    e.id as engineer_id,
    e.last_name || ' ' || e.first_name as engineer_name,
    e.work_status,
    e.overall_rating,
    
    -- スキル情報をJSONB集約
    jsonb_object_agg(
        es.skill_category,
        jsonb_build_object(
            'skills', jsonb_agg(
                jsonb_build_object(
                    'name', es.skill_name,
                    'level', es.skill_level,
                    'experienceYears', es.experience_years,
                    'lastUsed', es.last_used_date,
                    'verified', CASE WHEN es.verified_at IS NOT NULL THEN true ELSE false END
                )
                ORDER BY es.experience_years DESC
            ),
            'categoryTotal', COUNT(*),
            'expertCount', COUNT(*) FILTER (WHERE es.skill_level IN ('EXPERT', 'MASTER'))
        )
    ) as skill_matrix
    
FROM engineers e
LEFT JOIN engineer_skills es ON e.id = es.engineer_id AND es.deleted_at IS NULL
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.last_name, e.first_name, e.work_status, e.overall_rating;
```

---

## パフォーマンス最適化

### 1. パーティショニング戦略

```sql
-- engineer_career_history のパーティショニング（年次）
CREATE TABLE engineer_career_history_partitioned (
    LIKE engineer_career_history INCLUDING ALL
) PARTITION BY RANGE (start_date);

-- 年次パーティション作成
CREATE TABLE engineer_career_history_2020_2024 
PARTITION OF engineer_career_history_partitioned
FOR VALUES FROM ('2020-01-01') TO ('2025-01-01');

CREATE TABLE engineer_career_history_2025_2029 
PARTITION OF engineer_career_history_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2030-01-01');

-- デフォルトパーティション
CREATE TABLE engineer_career_history_default 
PARTITION OF engineer_career_history_partitioned
DEFAULT;
```

### 2. マテリアライズドビュー

```sql
-- スキル統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW engineer_skill_stats AS
SELECT 
    skill_name,
    skill_category,
    COUNT(*) as engineer_count,
    AVG(experience_years) as avg_experience,
    COUNT(*) FILTER (WHERE skill_level = 'EXPERT') as expert_count,
    COUNT(*) FILTER (WHERE skill_level = 'MASTER') as master_count,
    COUNT(*) FILTER (WHERE work_status = 'AVAILABLE') as available_count
FROM engineer_skills es
JOIN engineers e ON es.engineer_id = e.id
WHERE es.deleted_at IS NULL 
  AND e.deleted_at IS NULL
  AND e.status = 'ACTIVE'
GROUP BY skill_name, skill_category;

-- スキル統計ビュー用インデックス
CREATE INDEX idx_engineer_skill_stats_name ON engineer_skill_stats(skill_name);
CREATE INDEX idx_engineer_skill_stats_category ON engineer_skill_stats(skill_category);

-- 日次リフレッシュ用関数
CREATE OR REPLACE FUNCTION refresh_engineer_skill_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY engineer_skill_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## データ整合性とルール

### 1. ビジネスルール制約

```sql
-- スキルレベルと経験年数の整合性チェック
CREATE OR REPLACE FUNCTION validate_skill_experience_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- 経験年数とスキルレベルの整合性チェック
    IF NEW.skill_level = 'BEGINNER' AND NEW.experience_years > 1 THEN
        RAISE EXCEPTION 'BEGINNER level should have experience <= 1 year';
    END IF;
    
    IF NEW.skill_level = 'INTERMEDIATE' AND (NEW.experience_years < 1 OR NEW.experience_years > 3) THEN
        RAISE EXCEPTION 'INTERMEDIATE level should have experience between 1-3 years';
    END IF;
    
    IF NEW.skill_level = 'ADVANCED' AND (NEW.experience_years < 3 OR NEW.experience_years > 5) THEN
        RAISE EXCEPTION 'ADVANCED level should have experience between 3-5 years';
    END IF;
    
    IF NEW.skill_level IN ('EXPERT', 'MASTER') AND NEW.experience_years < 5 THEN
        RAISE EXCEPTION 'EXPERT/MASTER level should have experience >= 5 years';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_skill_experience
    BEFORE INSERT OR UPDATE ON engineer_skills
    FOR EACH ROW
    EXECUTE FUNCTION validate_skill_experience_consistency();
```

### 2. データ品質チェック

```sql
-- データ品質チェック関数
CREATE OR REPLACE FUNCTION check_engineer_data_quality()
RETURNS TABLE(engineer_id UUID, issue_type TEXT, issue_description TEXT) AS $$
BEGIN
    -- スキル情報が不足している技術者
    RETURN QUERY
    SELECT e.id, 'INSUFFICIENT_SKILLS', 'Engineer has less than 3 skills registered'
    FROM engineers e
    LEFT JOIN engineer_skills es ON e.id = es.engineer_id AND es.deleted_at IS NULL
    WHERE e.deleted_at IS NULL
      AND e.work_status IN ('AVAILABLE', 'ASSIGNED')
    GROUP BY e.id
    HAVING COUNT(es.id) < 3;
    
    -- 古いスキル情報（2年以上未更新）
    RETURN QUERY
    SELECT e.id, 'OUTDATED_SKILLS', 'Skills not updated for more than 2 years'
    FROM engineers e
    JOIN engineer_skills es ON e.id = es.engineer_id
    WHERE e.deleted_at IS NULL
      AND es.deleted_at IS NULL
      AND (es.last_used_date IS NULL OR es.last_used_date < CURRENT_DATE - INTERVAL '2 years')
      AND es.updated_at < CURRENT_TIMESTAMP - INTERVAL '2 years';
    
    -- 評価が長期間未実施
    RETURN QUERY
    SELECT e.id, 'OVERDUE_EVALUATION', 'Performance evaluation overdue'
    FROM engineers e
    WHERE e.deleted_at IS NULL
      AND e.status = 'ACTIVE'
      AND (e.last_evaluation_date IS NULL 
           OR e.last_evaluation_date < CURRENT_DATE - INTERVAL '1 year');
    
END;
$$ LANGUAGE plpgsql;
```

---

## セキュリティ設定

### 1. Row Level Security (RLS)

```sql
-- Row Level Security有効化
ALTER TABLE engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE engineer_career_history ENABLE ROW LEVEL SECURITY;

-- 自分の情報のみアクセス可能（技術者ロール）
CREATE POLICY engineer_self_access ON engineers
    FOR ALL
    TO ses_engineer_role
    USING (id = current_setting('app.current_user_id')::UUID);

-- 人事は全技術者情報にアクセス可能
CREATE POLICY engineer_hr_access ON engineers
    FOR ALL
    TO ses_hr_role
    USING (true);

-- 営業は基本情報のみ参照可能（機密情報除く）
CREATE POLICY engineer_sales_access ON engineers
    FOR SELECT
    TO ses_sales_role
    USING (status = 'ACTIVE' AND work_status IN ('AVAILABLE', 'ASSIGNED'));
```

### 2. 機密データ暗号化

```sql
-- 個人情報暗号化トリガー
CREATE OR REPLACE FUNCTION encrypt_engineer_pii()
RETURNS TRIGGER AS $$
BEGIN
    -- 生年月日暗号化
    IF NEW.birth_date IS NOT NULL THEN
        NEW.birth_date := encrypt_sensitive_data(NEW.birth_date::TEXT)::DATE;
    END IF;
    
    -- 住所情報暗号化
    IF NEW.address_info IS NOT NULL THEN
        NEW.address_info := jsonb_build_object(
            'current', encrypt_sensitive_data(NEW.address_info->>'current'),
            'emergency', encrypt_sensitive_data(NEW.address_info->>'emergency')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_encrypt_engineer_pii
    BEFORE INSERT OR UPDATE ON engineers
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_engineer_pii();
```

---

## 運用・保守設計

### 1. バックアップ戦略

```sql
-- バックアップ対象テーブル一覧
COMMENT ON TABLE engineers IS 'Engineer Context Core Table - Critical Data - Daily Backup Required';
COMMENT ON TABLE engineer_skills IS 'Engineer Skills Data - Critical Data - Daily Backup Required';
COMMENT ON TABLE companies IS 'Company Master Data - Critical Data - Daily Backup Required';
COMMENT ON TABLE engineer_career_history IS 'Career History - Important Data - Weekly Backup';
COMMENT ON TABLE engineer_project_experiences IS 'Project Experience - Important Data - Weekly Backup';

-- バックアップ優先度
-- Critical: engineers, engineer_skills, companies (0 RPO)
-- Important: career_history, project_experiences (4 hour RPO)
```

### 2. データアーカイブ

```sql
-- 退職者データアーカイブプロシージャ
CREATE OR REPLACE FUNCTION archive_terminated_engineers(cutoff_date DATE)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- 指定日以前に退職した技術者のスキル・経歴をアーカイブ
    WITH archived_engineers AS (
        UPDATE engineers 
        SET status = 'ARCHIVED'
        WHERE work_status = 'TERMINATED' 
          AND termination_date < cutoff_date
          AND status != 'ARCHIVED'
        RETURNING id
    )
    UPDATE engineer_skills 
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE engineer_id IN (SELECT id FROM archived_engineers)
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
**関連ドメインモデル**: Engineer集約詳細設計  
**次回レビュー**: 2025年7月1日