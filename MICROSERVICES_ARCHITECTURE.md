# BuildRAI Microservices Architecture

## Overview
BuildRAI will be deployed as a microservices architecture on AWS ECS in the Mumbai (ap-south-1) region.

## Architecture Diagram

```
                                    ┌─────────────────┐
                                    │   CloudFront    │
                                    │   (CDN)         │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Application    │
                                    │  Load Balancer  │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐      ┌───────▼────────┐      ┌────────▼────────┐
           │   Frontend      │      │   API Gateway   │      │   WebSocket     │
           │   Service       │      │   Service       │      │   Service       │
           │   (Next.js)     │      │   (Express)     │      │   (Socket.io)   │
           │   Port: 3000    │      │   Port: 4000    │      │   Port: 5000    │
           └─────────────────┘      └────────┬────────┘      └─────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
           ┌────────▼────────┐      ┌───────▼────────┐      ┌────────▼────────┐
           │   Auth          │      │   Project      │      │   Code Gen      │
           │   Service       │      │   Service      │      │   Service       │
           │   Port: 4001    │      │   Port: 4002   │      │   Port: 4003    │
           └─────────────────┘      └────────────────┘      └─────────────────┘
                    │                        │                        │
           ┌────────▼────────┐      ┌───────▼────────┐      ┌────────▼────────┐
           │   File          │      │   Integration  │      │   Analytics     │
           │   Service       │      │   Service      │      │   Service       │
           │   Port: 4004    │      │   Port: 4005   │      │   Port: 4006    │
           └─────────────────┘      └────────────────┘      └─────────────────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   MongoDB       │
                                    │   (DocumentDB)  │
                                    │   or Atlas      │
                                    └─────────────────┘
```

## Services Breakdown

### 1. Frontend Service (Port 3000)
**Technology**: Next.js 16 (App Router)

**Responsibilities**:
- Serve React UI
- Server-side rendering
- Client-side routing
- Static asset serving

**Container**: `buildrai-frontend`
**Scaling**: 2-10 tasks (auto-scaling based on CPU/memory)

### 2. API Gateway Service (Port 4000)
**Technology**: Express.js + API Gateway pattern

**Responsibilities**:
- Request routing to microservices
- Authentication/Authorization middleware
- Rate limiting
- Request/response transformation
- API versioning
- Health checks aggregation

**Container**: `buildrai-api-gateway`
**Scaling**: 2-8 tasks

**Routes**:
```
/api/v1/auth/*       → Auth Service
/api/v1/projects/*   → Project Service
/api/v1/generate/*   → Code Generation Service
/api/v1/files/*      → File Service
/api/v1/integrations/* → Integration Service
/api/v1/analytics/*  → Analytics Service
```

### 3. Auth Service (Port 4001)
**Technology**: Express.js + Clerk SDK

**Responsibilities**:
- User authentication
- Session management
- Token validation
- User profile management
- Permission checks

**Database**: MongoDB (Users collection)
**Container**: `buildrai-auth-service`
**Scaling**: 2-6 tasks

**API Endpoints**:
- `GET /health` - Health check
- `POST /validate` - Validate auth token
- `GET /user/:id` - Get user profile
- `PUT /user/:id` - Update user profile
- `GET /user/:id/usage` - Get user usage stats

### 4. Project Service (Port 4002)
**Technology**: Express.js

**Responsibilities**:
- Project CRUD operations
- Project settings management
- Project statistics
- Project search/filtering

**Database**: MongoDB (Projects collection)
**Container**: `buildrai-project-service`
**Scaling**: 2-8 tasks

**API Endpoints**:
- `GET /health` - Health check
- `POST /projects` - Create project
- `GET /projects` - List projects
- `GET /projects/:id` - Get project
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/:id/stats` - Get project stats

### 5. Code Generation Service (Port 4003)
**Technology**: Express.js + Anthropic SDK

**Responsibilities**:
- AI code generation
- Code analysis
- Code suggestions
- Conversation management with AI

**External APIs**: Anthropic Claude API
**Container**: `buildrai-codegen-service`
**Scaling**: 2-10 tasks (CPU intensive)
**Resources**: Higher CPU/Memory allocation

**API Endpoints**:
- `GET /health` - Health check
- `POST /generate/code` - Generate code
- `POST /generate/chat` - Chat with AI
- `POST /analyze` - Analyze code
- `POST /suggest` - Get code suggestions

### 6. File Service (Port 4004)
**Technology**: Express.js + AWS S3 SDK

**Responsibilities**:
- File CRUD operations
- File storage (S3)
- File versioning
- File download/upload

**Storage**: AWS S3
**Database**: MongoDB (File metadata)
**Container**: `buildrai-file-service`
**Scaling**: 2-8 tasks

**API Endpoints**:
- `GET /health` - Health check
- `POST /files` - Upload/create file
- `GET /files/:id` - Get file
- `PUT /files/:id` - Update file
- `DELETE /files/:id` - Delete file
- `GET /files/:id/versions` - Get file versions
- `GET /projects/:projectId/files` - List project files

### 7. Integration Service (Port 4005)
**Technology**: Express.js

**Responsibilities**:
- OAuth integrations (GitHub, Bitbucket, Azure)
- Repository access
- Branch/file fetching from repos
- Webhook handling

**Database**: MongoDB (Integrations collection)
**Container**: `buildrai-integration-service`
**Scaling**: 2-6 tasks

**API Endpoints**:
- `GET /health` - Health check
- `GET /:provider/authorize` - OAuth authorization
- `GET /:provider/callback` - OAuth callback
- `GET /:provider/repositories` - List repositories
- `GET /:provider/branches` - List branches
- `POST /:provider/disconnect` - Disconnect integration

### 8. Analytics Service (Port 4006)
**Technology**: Express.js

**Responsibilities**:
- Usage tracking
- Performance metrics
- User analytics
- Cost tracking
- Reporting

**Database**: MongoDB (Analytics collection) + Time-series data
**Container**: `buildrai-analytics-service`
**Scaling**: 2-4 tasks

**API Endpoints**:
- `GET /health` - Health check
- `POST /events` - Track event
- `GET /users/:id/stats` - Get user stats
- `GET /projects/:id/stats` - Get project stats
- `GET /system/stats` - Get system stats

### 9. WebSocket Service (Port 5000)
**Technology**: Socket.io

**Responsibilities**:
- Real-time code updates
- Live collaboration
- AI streaming responses
- File change notifications

**Container**: `buildrai-websocket-service`
**Scaling**: 2-6 tasks (sticky sessions required)

## Infrastructure Components

### AWS Services

#### Compute
- **ECS Cluster**: `buildrai-cluster` (Fargate)
- **Region**: ap-south-1 (Mumbai)
- **Task Definitions**: One per service
- **Auto Scaling**: Based on CPU/Memory/Custom metrics

#### Networking
- **VPC**: `buildrai-vpc` (10.0.0.0/16)
- **Subnets**:
  - Public: 10.0.1.0/24, 10.0.2.0/24 (2 AZs)
  - Private: 10.0.11.0/24, 10.0.12.0/24 (2 AZs)
- **NAT Gateway**: For private subnet internet access
- **Security Groups**: Per service

#### Load Balancing
- **Application Load Balancer** (ALB)
  - Frontend: Port 443 → 3000
  - API Gateway: Port 443 → 4000
  - WebSocket: Port 443 → 5000
- **Target Groups**: One per service
- **Health Checks**: `/health` endpoint

#### Storage
- **S3 Bucket**: `buildrai-files-<env>`
  - Versioning: Enabled
  - Encryption: AES-256
  - Lifecycle: 90 days to Glacier
- **ECR**: Container image registry

#### Database
**Option 1**: MongoDB Atlas (Recommended)
- **Tier**: M10 (Production)
- **Region**: ap-south-1
- **Replication**: 3-node replica set
- **Backup**: Point-in-time recovery

**Option 2**: AWS DocumentDB
- **Instance**: db.r5.large
- **Storage**: 100GB (auto-scaling)
- **Multi-AZ**: Yes

#### Secrets Management
- **AWS Secrets Manager**
  - MongoDB connection strings
  - API keys (Anthropic, Clerk, OAuth)
  - Encryption keys

#### Monitoring & Logging
- **CloudWatch Logs**: Per service log groups
- **CloudWatch Metrics**: Custom application metrics
- **X-Ray**: Distributed tracing
- **CloudWatch Alarms**: For critical metrics

#### CI/CD
- **GitHub Actions** or **AWS CodePipeline**
- **ECR**: Image registry
- **Automated deployments**: On main branch push

## Service Communication

### Inter-Service Communication
- **Protocol**: HTTP/REST
- **Service Discovery**: AWS Cloud Map
- **Internal DNS**: `<service>.buildrai.local`
- **Authentication**: Service-to-service JWT tokens

### Message Queue (Future)
- **AWS SQS**: For asynchronous tasks
- **Use cases**:
  - Code generation jobs
  - File processing
  - Analytics aggregation

## Deployment Strategy

### Phase 1: Infrastructure Setup (Day 1-2)
1. Create VPC, subnets, security groups
2. Set up ECS cluster
3. Create S3 bucket
4. Set up MongoDB (Atlas or DocumentDB)
5. Configure Secrets Manager
6. Set up ALB and target groups

### Phase 2: Service Migration (Day 3-5)
1. Extract and containerize API Gateway
2. Extract and containerize Auth Service
3. Extract and containerize Project Service
4. Extract and containerize Code Generation Service
5. Extract and containerize File Service
6. Extract and containerize Integration Service
7. Extract and containerize Analytics Service
8. Refactor Frontend to call API Gateway

### Phase 3: Testing & Deployment (Day 6-7)
1. Local testing with Docker Compose
2. Deploy to staging environment
3. Integration testing
4. Load testing
5. Production deployment
6. Smoke tests

## Cost Estimation (Monthly - Mumbai Region)

### Compute (ECS Fargate)
- Frontend (2 tasks): $50
- API Gateway (2 tasks): $50
- Auth Service (2 tasks): $50
- Project Service (2 tasks): $50
- Code Gen Service (2 tasks, higher CPU): $100
- File Service (2 tasks): $50
- Integration Service (2 tasks): $50
- Analytics Service (2 tasks): $50
- WebSocket Service (2 tasks): $50

**Subtotal**: ~$500/month (base, scales up)

### Database
- MongoDB Atlas M10: $60/month
- Or DocumentDB db.r5.large: $180/month

### Storage
- S3 (100GB): $2.3/month
- ECR (50GB): $5/month

### Networking
- ALB: $22/month
- Data Transfer: $50-100/month
- NAT Gateway: $45/month

### Monitoring & Secrets
- CloudWatch: $20/month
- Secrets Manager: $2/month

**Total Estimated Cost**: **$700-900/month** (with scaling)

## Security Measures

1. **Network Isolation**: Services in private subnets
2. **Encryption**:
   - In-transit: TLS 1.3
   - At-rest: AES-256
3. **Secrets**: AWS Secrets Manager
4. **Authentication**: Clerk + service-to-service JWT
5. **Rate Limiting**: At API Gateway level
6. **DDoS Protection**: AWS Shield Standard
7. **WAF**: AWS WAF (optional)

## Monitoring & Alerting

### Key Metrics
- Request latency (p50, p95, p99)
- Error rates (5xx, 4xx)
- CPU/Memory utilization
- Database connections
- API quotas (Anthropic)

### Alerts
- Service health check failures
- High error rates (>5%)
- High latency (>1s p95)
- Resource exhaustion
- Cost anomalies

## Disaster Recovery

### Backup Strategy
- **MongoDB**: Daily automated backups, 7-day retention
- **S3**: Versioning enabled, cross-region replication (future)
- **Config**: Infrastructure as Code (Terraform/CDK)

### RTO/RPO
- **RTO**: <30 minutes (automated failover)
- **RPO**: <1 hour (MongoDB point-in-time recovery)

## Next Steps

1. Create service directories and extract code
2. Create Dockerfiles for each service
3. Create ECS task definitions
4. Write Terraform/CDK infrastructure code
5. Set up CI/CD pipeline
6. Deploy to staging
7. Load test
8. Deploy to production

---

**Last Updated**: 2026-05-25
**Version**: 1.0
**Author**: BuildRAI Team
