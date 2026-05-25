# BuildrAI Platform

AI-Powered Development Acceleration Platform - Automate your entire software development lifecycle from requirements gathering through code generation, quality assurance, security scanning, and cloud deployment.

## 🚀 Features

### Phase 1 (Current Development)
- ✅ AI Requirements Gathering
- ✅ Multi-Agent Code Generation
- ✅ Project Management
- ✅ Code Editor (Monaco)
- ✅ Real-time Chat Interface
- ✅ Version Control
- ✅ Project Export (ZIP, GitHub)

### Future Phases
- 📋 Phase 2: Code Quality Management (Static Analysis, Testing, Code Review)
- 🔒 Phase 3: Security & Vulnerability Management (SAST, Dependency Scanning, Secret Detection)
- ☁️  Phase 4: Cloud Deployment (AWS, Azure, GCP, Infrastructure as Code)

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS + shadcn/ui
- **State:** Zustand + React Query
- **Editor:** Monaco Editor
- **Forms:** React Hook Form + Zod

### Backend
- **Runtime:** Node.js 20.x
- **API:** Next.js API Routes
- **Database:** MongoDB Atlas (Mongoose)
- **Cache:** AWS ElastiCache (Redis/ioredis)
- **Queue:** AWS SQS
- **Storage:** AWS S3

### AI/ML
- **Provider:** Anthropic Claude API
- **Models:** Claude 3.5 Sonnet, Haiku, Opus
- **Framework:** LangGraph (multi-agent orchestration)

### Authentication
- **Provider:** Clerk

## 📁 Project Structure

```
buildrai-platform/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── projects/     # Project management
│   │   │   ├── chat/         # Chat/AI endpoints
│   │   │   ├── generate/     # Code generation
│   │   │   ├── quality/      # Quality checks (Phase 2)
│   │   │   ├── security/     # Security scanning (Phase 3)
│   │   │   └── deploy/       # Deployment (Phase 4)
│   │   ├── (auth)/           # Auth pages (sign-in, sign-up)
│   │   ├── dashboard/        # Main dashboard
│   │   ├── projects/         # Project pages
│   │   └── layout.tsx        # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── editor/           # Code editor components
│   │   ├── chat/             # Chat interface
│   │   ├── project/          # Project components
│   │   └── auth/             # Auth components
│   ├── lib/                   # Core libraries
│   │   ├── db/               # Database
│   │   │   ├── mongodb.ts    # MongoDB connection
│   │   │   └── models/       # Mongoose models
│   │   ├── aws/              # AWS services
│   │   │   ├── s3.ts         # S3 file storage
│   │   │   ├── sqs.ts        # SQS job queue
│   │   │   └── redis.ts      # ElastiCache Redis
│   │   ├── ai/               # AI/LLM
│   │   │   ├── anthropic.ts  # Claude API client
│   │   │   └── agents/       # AI agents
│   │   └── utils/            # Utility functions
│   └── types/                 # TypeScript types
│       └── index.ts          # Shared types
├── public/                    # Static files
├── .env.local.example        # Environment variables template
└── package.json
```

## 🔧 Setup Instructions

### 1. Prerequisites
- Node.js 20.x or later
- npm/yarn/pnpm
- MongoDB Atlas account
- AWS account (for S3, SQS, ElastiCache)
- Clerk account
- Anthropic API key

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_SQS_QUEUE_URL` - SQS queue URL
- `REDIS_HOST` - ElastiCache Redis endpoint

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## 🗄️ Database Models

### User
- Profile information
- Subscription plan (free, pro, business, enterprise)
- Usage tracking
- API keys
- Cloud account connections

### Project
- Project metadata
- Settings (template, language, framework)
- Requirements (raw, structured, summary)
- Files (path, content, metadata)
- Statistics (files, lines, size)

### ChatSession
- Chat history
- Messages (role, content, metadata)
- Token usage tracking
- Cost calculation

## 🤖 AI Agents

### Current (Phase 1)
- **Requirements Agent:** Extracts and structures project requirements
- **Planning Agent:** Creates development plan and task breakdown
- **Architecture Agent:** Designs system architecture
- **Code Generation Agent:** Generates source code files
- **Review Agent:** Reviews and improves generated code

### Future Phases
- **Quality Agent:** Static analysis and testing (Phase 2)
- **Security Agent:** Vulnerability scanning and fixes (Phase 3)
- **Deployment Agent:** Cloud infrastructure and deployment (Phase 4)

## 🔐 Security

- All sensitive data encrypted at rest and in transit
- Environment variables for secrets (never committed)
- AWS Secrets Manager integration available
- Authentication via Clerk (OAuth, MFA support)
- Rate limiting on API endpoints
- Input validation with Zod schemas

## 📊 Monitoring & Logging

- Error tracking: Sentry (to be configured)
- Performance monitoring: DataDog (to be configured)
- Analytics: PostHog (to be configured)
- Logging: Winston + CloudWatch Logs

## 🚧 Development Roadmap

- [x] **Week 1-2:** Project setup, infrastructure, authentication ✅
- [ ] **Week 3-4:** Project management system
- [ ] **Week 5-6:** AI requirements gathering agent
- [ ] **Week 7-8:** Code generation multi-agent system
- [ ] **Week 9-10:** Code editor and live preview
- [ ] **Week 11-12:** Export functionality and MVP launch

## 📝 Current Progress

### ✅ Completed
- Next.js 14 project initialization
- TypeScript & ESLint configuration
- TailwindCSS & shadcn/ui setup
- MongoDB connection & schemas
- AWS services integration (S3, SQS, ElastiCache)
- Anthropic Claude API client
- Clerk authentication setup
- Project folder structure

### 🚧 In Progress
- AI agent system with LangGraph
- Chat interface
- Code generation agents

### 📋 Next Steps
- Create API endpoints
- Build dashboard UI
- Implement Monaco Editor integration
- Develop requirements gathering agent

## 📄 License

TBD

## 🤝 Contributing

TBD

## 📞 Support

For support, email support@buildrai.io

---

**Built with ❤️ using Claude AI**
