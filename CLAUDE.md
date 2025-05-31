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

## Current Project Status

**Completed**: Requirements Definition (100%) and Basic Design (100%)
**Next Phase**: Detailed Design (0% - not started)

Key remaining work includes:
- Detailed aggregate design for each bounded context
- OpenAPI specifications for all 8 microservices
- Physical database schema design
- UI/UX mockups and screen specifications
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

When implementing features, always refer to the established bounded context responsibilities and domain events to maintain architectural consistency.