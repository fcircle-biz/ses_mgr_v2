#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create Keycloak database
    CREATE DATABASE keycloak_db;
    GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO $POSTGRES_USER;

    -- Create microservice databases (Database per Service pattern)
    CREATE DATABASE project_db;
    GRANT ALL PRIVILEGES ON DATABASE project_db TO $POSTGRES_USER;

    CREATE DATABASE engineer_db;
    GRANT ALL PRIVILEGES ON DATABASE engineer_db TO $POSTGRES_USER;

    CREATE DATABASE matching_db;
    GRANT ALL PRIVILEGES ON DATABASE matching_db TO $POSTGRES_USER;

    CREATE DATABASE contract_db;
    GRANT ALL PRIVILEGES ON DATABASE contract_db TO $POSTGRES_USER;

    CREATE DATABASE timesheet_db;
    GRANT ALL PRIVILEGES ON DATABASE timesheet_db TO $POSTGRES_USER;

    CREATE DATABASE billing_db;
    GRANT ALL PRIVILEGES ON DATABASE billing_db TO $POSTGRES_USER;

    CREATE DATABASE report_db;
    GRANT ALL PRIVILEGES ON DATABASE report_db TO $POSTGRES_USER;

    CREATE DATABASE notification_db;
    GRANT ALL PRIVILEGES ON DATABASE notification_db TO $POSTGRES_USER;

    -- Show created databases
    \l
EOSQL

echo "All databases have been created successfully!"