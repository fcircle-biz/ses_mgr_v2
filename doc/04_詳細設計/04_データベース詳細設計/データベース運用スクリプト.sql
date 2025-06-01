-- ================================================================
-- SES管理システム データベース運用・保守スクリプト
-- PostgreSQL 15対応
-- 
-- 用途:
-- 1. パフォーマンス監視
-- 2. データベース保守
-- 3. 統計情報更新
-- 4. アーカイブ処理
-- 5. バックアップ支援
-- ================================================================

\echo 'Loading SES Database Operation Scripts...'

-- ================================================================
-- 1. パフォーマンス監視関数
-- ================================================================

-- 長時間実行クエリ監視
CREATE OR REPLACE VIEW shared_functions.long_running_queries AS
SELECT 
    pid,
    usename,
    application_name,
    state,
    query_start,
    NOW() - query_start as duration,
    LEFT(query, 100) || '...' as query_snippet
FROM pg_stat_activity 
WHERE state = 'active' 
  AND NOW() - query_start > INTERVAL '30 seconds'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

-- インデックス使用効率監視
CREATE OR REPLACE VIEW shared_functions.index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read = 0 THEN 0
        ELSE ROUND((idx_tup_fetch::DECIMAL / idx_tup_read) * 100, 2)
    END as efficiency_rate,
    CASE 
        WHEN idx_tup_read = 0 THEN 'UNUSED'
        WHEN (idx_tup_fetch::DECIMAL / idx_tup_read) < 0.1 THEN 'LOW_EFFICIENCY'
        WHEN (idx_tup_fetch::DECIMAL / idx_tup_read) < 0.5 THEN 'MEDIUM_EFFICIENCY'
        ELSE 'HIGH_EFFICIENCY'
    END as efficiency_status
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC, efficiency_rate DESC;

-- テーブルサイズ監視
CREATE OR REPLACE VIEW shared_functions.table_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND((n_dead_tup::DECIMAL / n_live_tup) * 100, 2)
    END as dead_tuple_ratio
FROM pg_stat_user_tables
WHERE schemaname IN (
    'project_context', 'engineer_context', 'matching_context', 
    'contract_context', 'timesheet_context', 'billing_context', 
    'report_context', 'notification_context'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- デッドロック監視
CREATE OR REPLACE VIEW shared_functions.deadlock_stats AS
SELECT 
    datname,
    deadlocks,
    ROUND((deadlocks::DECIMAL / GREATEST(1, xact_commit + xact_rollback)) * 100, 4) as deadlock_rate
FROM pg_stat_database
WHERE datname = current_database();

-- ================================================================
-- 2. データベース保守関数
-- ================================================================

-- 統計情報更新関数
CREATE OR REPLACE FUNCTION shared_functions.update_table_statistics()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    analyze_status TEXT,
    execution_time INTERVAL
) AS $$
DECLARE
    table_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
    LOOP
        BEGIN
            start_time := clock_timestamp();
            
            EXECUTE format('ANALYZE %I.%I', table_record.schemaname, table_record.tablename);
            
            end_time := clock_timestamp();
            
            RETURN QUERY SELECT 
                table_record.schemaname,
                table_record.tablename,
                'SUCCESS'::TEXT,
                end_time - start_time;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                table_record.schemaname,
                table_record.tablename,
                'FAILED: ' || SQLERRM,
                INTERVAL '0';
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- VACUUM実行関数
CREATE OR REPLACE FUNCTION shared_functions.vacuum_tables(
    analyze_flag BOOLEAN DEFAULT TRUE,
    verbose_flag BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    vacuum_status TEXT,
    dead_tuples_before BIGINT,
    dead_tuples_after BIGINT,
    execution_time INTERVAL
) AS $$
DECLARE
    table_record RECORD;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    dead_before BIGINT;
    dead_after BIGINT;
    vacuum_cmd TEXT;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
    LOOP
        BEGIN
            -- 実行前のデッドタプル数取得
            SELECT n_dead_tup INTO dead_before
            FROM pg_stat_user_tables 
            WHERE schemaname = table_record.schemaname 
              AND tablename = table_record.tablename;
            
            start_time := clock_timestamp();
            
            -- VACUUM実行
            vacuum_cmd := format('VACUUM %s %s %I.%I',
                CASE WHEN verbose_flag THEN 'VERBOSE' ELSE '' END,
                CASE WHEN analyze_flag THEN 'ANALYZE' ELSE '' END,
                table_record.schemaname,
                table_record.tablename
            );
            
            EXECUTE vacuum_cmd;
            
            end_time := clock_timestamp();
            
            -- 実行後のデッドタプル数取得
            SELECT n_dead_tup INTO dead_after
            FROM pg_stat_user_tables 
            WHERE schemaname = table_record.schemaname 
              AND tablename = table_record.tablename;
            
            RETURN QUERY SELECT 
                table_record.schemaname,
                table_record.tablename,
                'SUCCESS'::TEXT,
                COALESCE(dead_before, 0),
                COALESCE(dead_after, 0),
                end_time - start_time;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                table_record.schemaname,
                table_record.tablename,
                'FAILED: ' || SQLERRM,
                COALESCE(dead_before, 0),
                0::BIGINT,
                INTERVAL '0';
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 3. データアーカイブ関数
-- ================================================================

-- 統合データアーカイブ関数
CREATE OR REPLACE FUNCTION shared_functions.archive_old_data(
    cutoff_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year'
)
RETURNS TABLE(
    context_name TEXT,
    table_name TEXT,
    archived_count INTEGER,
    archive_status TEXT
) AS $$
DECLARE
    context_table RECORD;
    archived_count INTEGER;
    archive_sql TEXT;
BEGIN
    -- 各コンテキストの主要テーブルをアーカイブ
    FOR context_table IN
        SELECT 
            'project_context' as schema_name,
            'projects' as table_name,
            'status IN (''COMPLETED'', ''CANCELLED'') AND end_date < $1' as archive_condition
        UNION ALL
        SELECT 'timesheet_context', 'timesheets', 'status = ''APPROVED'' AND period_date < $1'
        UNION ALL
        SELECT 'billing_context', 'invoices', 'status = ''PAID'' AND issue_date < $1'
        UNION ALL
        SELECT 'notification_context', 'notifications', 'status = ''SENT'' AND created_at < $1'
        UNION ALL
        SELECT 'report_context', 'analytics_data', 'status = ''CALCULATED'' AND target_date < $1'
    LOOP
        BEGIN
            archive_sql := format(
                'UPDATE %I.%I SET deleted_at = CURRENT_TIMESTAMP WHERE %s AND deleted_at IS NULL',
                context_table.schema_name,
                context_table.table_name,
                context_table.archive_condition
            );
            
            EXECUTE archive_sql USING cutoff_date;
            
            GET DIAGNOSTICS archived_count = ROW_COUNT;
            
            RETURN QUERY SELECT 
                context_table.schema_name,
                context_table.table_name,
                archived_count,
                'SUCCESS'::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                context_table.schema_name,
                context_table.table_name,
                0,
                'FAILED: ' || SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- データ削除関数（物理削除）
CREATE OR REPLACE FUNCTION shared_functions.purge_archived_data(
    cutoff_date DATE DEFAULT CURRENT_DATE - INTERVAL '2 years'
)
RETURNS TABLE(
    context_name TEXT,
    table_name TEXT,
    purged_count INTEGER,
    purge_status TEXT
) AS $$
DECLARE
    context_table RECORD;
    purged_count INTEGER;
    purge_sql TEXT;
BEGIN
    FOR context_table IN
        SELECT schemaname, tablename
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
    LOOP
        BEGIN
            purge_sql := format(
                'DELETE FROM %I.%I WHERE deleted_at IS NOT NULL AND deleted_at < $1',
                context_table.schemaname,
                context_table.tablename
            );
            
            EXECUTE purge_sql USING cutoff_date;
            
            GET DIAGNOSTICS purged_count = ROW_COUNT;
            
            IF purged_count > 0 THEN
                RETURN QUERY SELECT 
                    context_table.schemaname,
                    context_table.tablename,
                    purged_count,
                    'SUCCESS'::TEXT;
            END IF;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                context_table.schemaname,
                context_table.tablename,
                0,
                'FAILED: ' || SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 4. バックアップ支援関数
-- ================================================================

-- バックアップ推奨時刻チェック
CREATE OR REPLACE FUNCTION shared_functions.check_backup_timing()
RETURNS TABLE(
    recommendation TEXT,
    current_activity INTEGER,
    recommended_action TEXT
) AS $$
DECLARE
    active_connections INTEGER;
    current_hour INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_connections
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    current_hour := EXTRACT(HOUR FROM CURRENT_TIME);
    
    RETURN QUERY SELECT 
        CASE 
            WHEN current_hour BETWEEN 2 AND 5 THEN 'OPTIMAL'
            WHEN current_hour BETWEEN 22 AND 23 OR current_hour BETWEEN 0 AND 1 THEN 'GOOD'
            WHEN active_connections < 10 THEN 'ACCEPTABLE'
            ELSE 'NOT_RECOMMENDED'
        END::TEXT,
        active_connections,
        CASE 
            WHEN current_hour BETWEEN 2 AND 5 THEN 'Proceed with backup'
            WHEN current_hour BETWEEN 22 AND 23 OR current_hour BETWEEN 0 AND 1 THEN 'Good time for backup'
            WHEN active_connections < 10 THEN 'Low activity, backup acceptable'
            ELSE 'Consider waiting for lower activity period'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- スキーマ別バックアップサイズ推定
CREATE OR REPLACE FUNCTION shared_functions.estimate_backup_size()
RETURNS TABLE(
    schema_name TEXT,
    table_count INTEGER,
    estimated_size TEXT,
    largest_table TEXT,
    largest_table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH schema_stats AS (
        SELECT 
            schemaname,
            COUNT(*) as table_count,
            SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
        GROUP BY schemaname
    ),
    largest_tables AS (
        SELECT DISTINCT ON (schemaname)
            schemaname,
            tablename,
            pg_total_relation_size(schemaname||'.'||tablename) as table_size
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
        ORDER BY schemaname, pg_total_relation_size(schemaname||'.'||tablename) DESC
    )
    SELECT 
        s.schemaname,
        s.table_count,
        pg_size_pretty(s.total_size),
        l.tablename,
        pg_size_pretty(l.table_size)
    FROM schema_stats s
    LEFT JOIN largest_tables l ON s.schemaname = l.schemaname
    ORDER BY s.total_size DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 5. データ品質チェック関数
-- ================================================================

-- 参照整合性チェック
CREATE OR REPLACE FUNCTION shared_functions.check_referential_integrity()
RETURNS TABLE(
    source_schema TEXT,
    source_table TEXT,
    source_column TEXT,
    target_schema TEXT,
    target_table TEXT,
    orphaned_count BIGINT,
    integrity_status TEXT
) AS $$
DECLARE
    ref_check RECORD;
    orphaned_count BIGINT;
    check_sql TEXT;
BEGIN
    -- 主要な参照関係をチェック
    FOR ref_check IN
        SELECT 
            'contract_context' as src_schema,
            'contracts' as src_table,
            'project_id' as src_column,
            'project_context' as tgt_schema,
            'projects' as tgt_table
        UNION ALL
        SELECT 'timesheet_context', 'timesheets', 'engineer_id', 'engineer_context', 'engineers'
        UNION ALL
        SELECT 'timesheet_context', 'timesheets', 'contract_id', 'contract_context', 'contracts'
        UNION ALL
        SELECT 'billing_context', 'invoices', 'customer_id', 'project_context', 'projects'
        UNION ALL
        SELECT 'billing_context', 'invoices', 'contract_id', 'contract_context', 'contracts'
        UNION ALL
        SELECT 'matching_context', 'matching_requests', 'project_id', 'project_context', 'projects'
        UNION ALL
        SELECT 'matching_context', 'matching_results', 'engineer_id', 'engineer_context', 'engineers'
    LOOP
        BEGIN
            check_sql := format(
                'SELECT COUNT(*) FROM %I.%I src 
                 WHERE src.%I IS NOT NULL 
                   AND src.deleted_at IS NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM %I.%I tgt 
                       WHERE tgt.id = src.%I 
                         AND tgt.deleted_at IS NULL
                   )',
                ref_check.src_schema, ref_check.src_table, ref_check.src_column,
                ref_check.tgt_schema, ref_check.tgt_table, ref_check.src_column
            );
            
            EXECUTE check_sql INTO orphaned_count;
            
            RETURN QUERY SELECT 
                ref_check.src_schema,
                ref_check.src_table,
                ref_check.src_column,
                ref_check.tgt_schema,
                ref_check.tgt_table,
                orphaned_count,
                CASE 
                    WHEN orphaned_count = 0 THEN 'OK'
                    WHEN orphaned_count < 10 THEN 'WARNING'
                    ELSE 'ERROR'
                END::TEXT;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                ref_check.src_schema,
                ref_check.src_table,
                ref_check.src_column,
                ref_check.tgt_schema,
                ref_check.tgt_table,
                -1::BIGINT,
                'CHECK_FAILED: ' || SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- データ重複チェック
CREATE OR REPLACE FUNCTION shared_functions.check_data_duplicates()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    duplicate_column TEXT,
    duplicate_count BIGINT,
    status TEXT
) AS $$
DECLARE
    table_record RECORD;
    duplicate_count BIGINT;
    check_sql TEXT;
BEGIN
    -- 主要テーブルの一意性チェック
    FOR table_record IN
        SELECT 
            'project_context' as schema_name,
            'projects' as table_name,
            'project_code' as unique_column
        UNION ALL
        SELECT 'engineer_context', 'engineers', 'employee_number'
        UNION ALL
        SELECT 'engineer_context', 'engineers', 'email'
        UNION ALL
        SELECT 'contract_context', 'contracts', 'contract_number'
        UNION ALL
        SELECT 'billing_context', 'invoices', 'invoice_number'
    LOOP
        BEGIN
            check_sql := format(
                'SELECT COUNT(*) - COUNT(DISTINCT %I) FROM %I.%I WHERE deleted_at IS NULL',
                table_record.unique_column,
                table_record.schema_name,
                table_record.table_name
            );
            
            EXECUTE check_sql INTO duplicate_count;
            
            IF duplicate_count > 0 THEN
                RETURN QUERY SELECT 
                    table_record.schema_name,
                    table_record.table_name,
                    table_record.unique_column,
                    duplicate_count,
                    CASE 
                        WHEN duplicate_count < 5 THEN 'WARNING'
                        ELSE 'ERROR'
                    END::TEXT;
            END IF;
                
        EXCEPTION WHEN OTHERS THEN
            RETURN QUERY SELECT 
                table_record.schema_name,
                table_record.table_name,
                table_record.unique_column,
                -1::BIGINT,
                'CHECK_FAILED: ' || SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 6. ヘルスチェック統合関数
-- ================================================================

-- データベース総合ヘルスチェック
CREATE OR REPLACE FUNCTION shared_functions.database_health_check()
RETURNS TABLE(
    check_category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) AS $$
DECLARE
    conn_count INTEGER;
    cache_hit_ratio DECIMAL;
    deadlock_count BIGINT;
    largest_table_size BIGINT;
BEGIN
    -- 接続数チェック
    SELECT COUNT(*) INTO conn_count FROM pg_stat_activity WHERE state = 'active';
    
    RETURN QUERY SELECT 
        'CONNECTION'::TEXT,
        'Active Connections'::TEXT,
        CASE 
            WHEN conn_count < 50 THEN 'GOOD'
            WHEN conn_count < 100 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT,
        conn_count || ' active connections'::TEXT,
        CASE 
            WHEN conn_count >= 100 THEN 'Consider connection pooling'
            ELSE 'Connection count is acceptable'
        END::TEXT;
    
    -- キャッシュヒット率チェック
    SELECT ROUND(
        (sum(heap_blks_hit) / GREATEST(1, sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
    ) INTO cache_hit_ratio
    FROM pg_statio_user_tables;
    
    RETURN QUERY SELECT 
        'PERFORMANCE'::TEXT,
        'Cache Hit Ratio'::TEXT,
        CASE 
            WHEN cache_hit_ratio >= 95 THEN 'GOOD'
            WHEN cache_hit_ratio >= 90 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT,
        cache_hit_ratio || '%'::TEXT,
        CASE 
            WHEN cache_hit_ratio < 90 THEN 'Consider increasing shared_buffers'
            ELSE 'Cache performance is good'
        END::TEXT;
    
    -- デッドロックチェック
    SELECT deadlocks INTO deadlock_count
    FROM pg_stat_database 
    WHERE datname = current_database();
    
    RETURN QUERY SELECT 
        'LOCKING'::TEXT,
        'Deadlocks'::TEXT,
        CASE 
            WHEN deadlock_count = 0 THEN 'GOOD'
            WHEN deadlock_count < 10 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT,
        deadlock_count || ' deadlocks detected'::TEXT,
        CASE 
            WHEN deadlock_count > 0 THEN 'Review query patterns and locking'
            ELSE 'No deadlocks detected'
        END::TEXT;
    
    -- 最大テーブルサイズチェック
    SELECT MAX(pg_total_relation_size(schemaname||'.'||tablename)) INTO largest_table_size
    FROM pg_tables 
    WHERE schemaname IN (
        'project_context', 'engineer_context', 'matching_context', 
        'contract_context', 'timesheet_context', 'billing_context', 
        'report_context', 'notification_context'
    );
    
    RETURN QUERY SELECT 
        'STORAGE'::TEXT,
        'Largest Table Size'::TEXT,
        CASE 
            WHEN largest_table_size < 1073741824 THEN 'GOOD'    -- < 1GB
            WHEN largest_table_size < 10737418240 THEN 'WARNING' -- < 10GB
            ELSE 'CRITICAL'
        END::TEXT,
        pg_size_pretty(largest_table_size)::TEXT,
        CASE 
            WHEN largest_table_size >= 10737418240 THEN 'Consider partitioning large tables'
            ELSE 'Table sizes are manageable'
        END::TEXT;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 7. 運用レポート生成
-- ================================================================

-- 日次運用レポート
CREATE OR REPLACE FUNCTION shared_functions.generate_daily_report(
    report_date DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT AS $$
DECLARE
    report_content TEXT;
    stat_record RECORD;
BEGIN
    report_content := format('
=== SES Database Daily Report ===
Date: %s
Generated at: %s

', report_date, CURRENT_TIMESTAMP);

    -- データベースサイズ
    report_content := report_content || format('
Database Size: %s

', pg_size_pretty(pg_database_size(current_database())));

    -- 各コンテキストの統計
    report_content := report_content || '
=== Context Statistics ===
';
    
    FOR stat_record IN
        SELECT 
            schemaname,
            COUNT(*) as table_count,
            pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
        FROM pg_tables 
        WHERE schemaname IN (
            'project_context', 'engineer_context', 'matching_context', 
            'contract_context', 'timesheet_context', 'billing_context', 
            'report_context', 'notification_context'
        )
        GROUP BY schemaname
        ORDER BY SUM(pg_total_relation_size(schemaname||'.'||tablename)) DESC
    LOOP
        report_content := report_content || format('
%s: %s tables, %s',
            stat_record.schemaname,
            stat_record.table_count,
            stat_record.total_size
        );
    END LOOP;

    -- パフォーマンス統計
    SELECT INTO stat_record
        COUNT(*) as active_connections,
        ROUND((sum(heap_blks_hit) / GREATEST(1, sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2) as cache_hit_ratio
    FROM pg_stat_activity, pg_statio_user_tables
    WHERE state = 'active';

    report_content := report_content || format('
    
=== Performance Metrics ===
Active Connections: %s
Cache Hit Ratio: %s%%
',
        stat_record.active_connections,
        stat_record.cache_hit_ratio
    );

    report_content := report_content || '
=== End of Report ===
';

    RETURN report_content;
END;
$$ LANGUAGE plpgsql;

\echo 'SES Database Operation Scripts loaded successfully!'
\echo 'Available functions:'
\echo '  - shared_functions.update_table_statistics()'
\echo '  - shared_functions.vacuum_tables(analyze_flag, verbose_flag)'
\echo '  - shared_functions.archive_old_data(cutoff_date)'
\echo '  - shared_functions.database_health_check()'
\echo '  - shared_functions.generate_daily_report(report_date)'
\echo '  - shared_functions.check_referential_integrity()'
\echo ''
\echo 'Available views:'
\echo '  - shared_functions.long_running_queries'
\echo '  - shared_functions.index_usage_stats'
\echo '  - shared_functions.table_size_stats'
\echo '  - shared_functions.performance_metrics'