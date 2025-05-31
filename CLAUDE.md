# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SES (System Engineering Service) business management system built with Domain-Driven Design (DDD) principles and microservices architecture. The system manages the complete SES business lifecycle including project management, engineer management, matching, contracts, timesheets, billing, and reporting.

## Architecture

### Domain-Driven Design Structure
- **8 Bounded Contexts**: Project, Engineer, Matching, Contract, Timesheet, Billing, Report, and Notification
- **Event-Driven Architecture**: Contexts communicate via domain events using Apache Kafka
- **3-Layer Domain Classification**: Core (Project, Engineer, Matching), Supporting (Contract, Timesheet, Billing), Generic (Report, Notification)

### Technology Stack
- **Backend**: Java 17 LTS, Spring Boot 3.2, PostgreSQL 15, Apache Kafka
- **Frontend**: Thymeleaf, Bootstrap 5, Alpine.js
- **Authentication**: Keycloak with OAuth2/OIDC
- **Infrastructure**: Docker, Redis (caching), GitHub Actions (CI/CD)
- **External Integrations**: CloudSign (digital contracts), MoneyForward (accounting), Slack (notifications)

### Microservices Architecture
Each bounded context will become an independent microservice with:
- Database per Service pattern
- REST API endpoints following OpenAPI 3.0 specification
- Event publishing for cross-context communication
- Layered architecture (Presentation → Application → Domain → Infrastructure)

## Documentation Structure

### `/doc/01_ガイドライン/`
- **基本設計方針.md**: Comprehensive design principles, coding standards, and architectural decisions
- **プロジェクト作業チェックシート.md**: Project progress tracking across 6 phases (Requirements → Basic Design → Detailed Design → Implementation Prep → Development → Operations)

### `/doc/02_要件定義/`
- **要件定義書.md**: Business requirements, stakeholder analysis, functional/non-functional requirements
- **データモデル概念設計.md**: Conceptual data model with Mermaid ER diagrams
- **業務フロー/**: 8 business process flows in Mermaid format

### `/doc/03_基本設計/`
- **01_DDD設計/**: Event storming results (58 domain events), ubiquitous language dictionary (61 terms), DDD approach
- **02_アーキテクチャ設計/**: Technology stack decisions and microservices architecture design
- **03_コンテキスト設計/**: Detailed bounded context specifications with aggregate designs and API outlines

### `/doc/04_詳細設計/` (NEW - Organized Structure)
- **01_ドメインモデル詳細設計/**: Complete domain model detailed design with review compliance (Grade A: 95% DDD compliance)
  - **01_集約設計/**: 8 aggregate designs (Project, Engineer, Matching, Contract, Timesheet, Billing, Report, Notification)
  - **02_共通設計/**: Common exception hierarchy (SESException with 4 severity levels, retry policies)
  - **03_横断的関心事/**: Cross-cutting concerns (Business rules engine, Data privacy & encryption with GDPR compliance)
- **02_API詳細設計/**: Complete OpenAPI 3.0 specifications for all 8 microservices with enhanced error handling

### `/doc/98_claude_log/` (NEW)
- Claude Code work session logs with timestamp format `YYYYMMDD_HHMM_作業内容.md`
- Tracks detailed work history, decisions, and progress for future Claude instances

### `/doc/99_レビュー/` (NEW)
- Design review results with timestamp format `YYYYMMDD_HHMM_レビュー結果.md`
- Contains comprehensive domain model review (Grade A: 95% DDD compliance, 90% business logic completeness)

## Current Project Status

**Completed**: 
- Requirements Definition (100%) 
- Basic Design (100%)
- **Detailed Design (98%)**
  - ✅ Domain Model Detailed Design (100% - Review completed, Grade A)
  - ✅ API Detailed Design (100% - 8/8 APIs complete with OpenAPI 3.0)
  - ⏳ UI/UX Design (0% - Next phase)

**Next Phase**: UI/UX Design and Database Detailed Design

Key remaining work includes:
- UI/UX wireframes and screen specifications
- Physical database schema design (DDL creation)
- Project structure setup and development environment configuration

## Development Phases

### Phase 1: MVP (4-6 weeks)
- Keycloak authentication setup
- Project Service and Engineer Service basic CRUD
- Simple matching functionality
- Basic Thymeleaf UI

### Phase 2: Core Features (6-8 weeks)
- Matching Service with algorithm implementation
- Contract Service with CloudSign integration
- Timesheet Service with approval workflows

### Phase 3: Advanced Features (8-10 weeks)
- Billing Service with MoneyForward integration
- Report Service with dashboards and KPIs
- Notification Service with Slack integration

## Key Design Principles

- **Ubiquitous Language**: Use terms from `doc/03_基本設計/01_DDD設計/ユビキタス言語辞書.md` in all code and documentation
- **Aggregate-Centric Design**: Each microservice contains 1-2 aggregates with clear boundaries
- **Event-First Communication**: Prefer asynchronous domain events over synchronous API calls between contexts
- **Database per Service**: Each microservice has its own PostgreSQL schema
- **API-First**: Design REST APIs before implementation using OpenAPI specifications

## Quality Standards

### Domain Model Requirements (Based on Grade A Review)
- **Exception Handling**: Use SESException hierarchy with correlation IDs, severity levels (LOW/MEDIUM/HIGH/CRITICAL), and retry policies
- **Business Rules**: Implement configurable business rules engine for dynamic rule management and A/B testing
- **Data Privacy**: Apply AES-256-GCM encryption for personal data with GDPR compliance (right to erasure, portability)
- **Performance**: Use lazy loading for collections, optimize database queries, implement CQRS for read-heavy operations

### API Design Standards
- **Error Responses**: Include errorCode, correlationId, severity, retryable fields in all error responses
- **External Service Integration**: Handle CloudSign and MoneyForward API errors with appropriate retry logic
- **Documentation**: Provide comprehensive OpenAPI examples with error scenarios

## Naming Conventions

### Java Packages
```
com.sesmanager.{context}/
├── domain/model/           # Entities, Value Objects
├── domain/repository/      # Repository interfaces  
├── domain/service/         # Domain services
├── application/usecase/    # Use cases
├── infrastructure/persistence/  # JPA implementations
└── presentation/api/       # REST controllers
```

### Database
- Tables: snake_case, plural (e.g., `user_accounts`)
- Columns: snake_case (e.g., `created_at`)
- All tables include audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`

## Work Session Management

### Claude Work Logs (`/doc/98_claude_log/`)
- **Purpose**: Track detailed work history and decisions for continuity between Claude sessions
- **Format**: `YYYYMMDD_HHMM_作業内容.md` (Japan time)
- **Content**: Work details, technical decisions, progress updates, next steps
- **Usage**: Reference previous logs to understand context and avoid duplicate work

### Design Reviews (`/doc/99_レビュー/`)
- **Purpose**: Document comprehensive design evaluations and quality assessments
- **Format**: `YYYYMMDD_HHMM_レビュー結果.md` (Japan time)
- **Content**: Review criteria, findings, recommendations, priority levels
- **Current Status**: Domain model achieved Grade A (95% DDD compliance)

## Implementation Guidelines

### Starting New Work
1. Check `doc/01_ガイドライン/プロジェクト作業チェックシート.md` for current progress and next phase
2. Review recent Claude work logs in `doc/98_claude_log/` for context
3. Consult relevant design documents in `doc/04_詳細設計/` for specifications
4. Update progress tracking and create new work logs as needed

### Domain Model Implementation
- Reference `doc/04_詳細設計/01_ドメインモデル詳細設計/01_集約設計/` for complete aggregate specifications
- Use exception hierarchy from `doc/04_詳細設計/01_ドメインモデル詳細設計/02_共通設計/共通例外階層設計.md`
- Apply business rules engine patterns from `doc/04_詳細設計/01_ドメインモデル詳細設計/03_横断的関心事/ビジネスルールエンジン設計.md`
- Follow GDPR compliance requirements from `doc/04_詳細設計/01_ドメインモデル詳細設計/03_横断的関心事/データプライバシー暗号化設計.md`

### API Implementation
- Use OpenAPI specifications from `doc/04_詳細設計/02_API詳細設計/` as implementation contracts
- Apply enhanced error response patterns from `doc/04_詳細設計/02_API詳細設計/共通エラーレスポンス強化.md`
- Ensure consistency with domain model designs

When implementing features, always refer to the established bounded context responsibilities and domain events to maintain architectural consistency.