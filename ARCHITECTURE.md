# Liquidity Platform - Architecture Overview

## 📐 Project Structure

```
Liquidity/
│
├── 🎨 frontend/                    # Next.js Frontend Application
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx               # Main landing page
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   ├── lib/                       # Utilities & API Client
│   │   └── api.ts                 # TypeScript API client
│   ├── public/                    # Static assets
│   ├── .env.local                 # Environment variables
│   ├── package.json               # Node.js dependencies
│   └── tsconfig.json              # TypeScript config
│
├── 🔧 backend/                     # FastAPI Backend Application
│   ├── app/                       # Application code
│   │   ├── main.py                # FastAPI app & routes
│   │   └── __init__.py            # Package initialization
│   ├── venv/                      # Python virtual environment (created by setup)
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment template
│   ├── setup.sh                   # Backend setup script
│   └── start-backend.sh           # Backend start script
│
├── 📁 src/                         # Your existing code
│   └── solver/                    # Solver module
│       └── solver.py              # Liquidity solver logic
│
├── 📄 Documentation
│   ├── README.md                  # Comprehensive documentation
│   ├── QUICKSTART.md              # Quick start guide
│   └── ARCHITECTURE.md            # This file
│
├── 🚀 Utility Scripts
│   ├── start-all.sh               # Start both servers
│   └── check-system.sh            # System prerequisites check
│
└── ⚙️ Configuration
    └── .gitignore                 # Git ignore rules

```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
│                     http://localhost:3000                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP Requests
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Components (page.tsx)                           │ │
│  │  - UI rendering                                        │ │
│  │  - User interactions                                   │ │
│  │  - State management                                    │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   │ Uses                                     │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Client (lib/api.ts)                               │ │
│  │  - Type-safe API calls                                 │ │
│  │  - Error handling                                      │ │
│  │  - Request/Response formatting                         │ │
│  └────────────────┬───────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ fetch() / HTTP
                    │ http://localhost:8000/api/*
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  CORS Middleware                                       │ │
│  │  - Allow Next.js origin                               │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Routes (main.py)                                  │ │
│  │  - /health          Health check                       │ │
│  │  - /api/hello       Sample endpoint                    │ │
│  │  - /api/items       Get items list                     │ │
│  │  - /api/process     Process item                       │ │
│  └────────────────┬───────────────────────────────────────┘ │
│                   │                                          │
│                   │ Can use                                  │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Your Business Logic                                   │ │
│  │  - src/solver modules                                  │ │
│  │  - Database operations                                 │ │
│  │  - External services                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Network Communication

### Development URLs

| Service            | URL                           | Purpose                       |
| ------------------ | ----------------------------- | ----------------------------- |
| Frontend           | `http://localhost:3000`       | User-facing web interface     |
| Backend API        | `http://localhost:8000`       | REST API endpoints            |
| API Docs (Swagger) | `http://localhost:8000/docs`  | Interactive API documentation |
| API Docs (ReDoc)   | `http://localhost:8000/redoc` | Alternative API documentation |

### CORS Configuration

The backend is configured to accept requests from the frontend:

- **Allowed Origins**: `http://localhost:3000`
- **Allowed Methods**: All (`GET`, `POST`, `PUT`, `DELETE`, etc.)
- **Allowed Headers**: All
- **Credentials**: Enabled

## 🔐 Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000
```

## 🛠️ Technology Stack Details

### Frontend Stack

```
Next.js 15 (React 19)
├── TypeScript           # Type safety
├── Tailwind CSS         # Utility-first styling
├── App Router          # File-based routing
└── Server Components   # Performance optimization
```

### Backend Stack

```
FastAPI
├── Uvicorn             # ASGI server
├── Pydantic            # Data validation
├── Python 3.8+         # Runtime
└── Automatic OpenAPI   # API documentation
```

## 📦 Dependencies

### Frontend (package.json)

- **next**: React framework with SSR/SSG
- **react** & **react-dom**: UI library
- **typescript**: Type checking
- **tailwindcss**: CSS framework
- **eslint**: Code linting

### Backend (requirements.txt)

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **pydantic**: Data validation
- **python-dotenv**: Environment variables

## 🚦 Development Workflow

### 1. Initial Setup

```bash
# Check prerequisites
./check-system.sh

# Setup backend
cd backend && ./setup.sh && cd ..

# Setup frontend (if needed)
cd frontend && npm install && cd ..
```

### 2. Development

```bash
# Option 1: Start both together
./start-all.sh

# Option 2: Start separately
# Terminal 1
cd backend && ./start-backend.sh

# Terminal 2
cd frontend && npm run dev
```

### 3. Making Changes

**Adding a new API endpoint:**

1. Define route in `backend/app/main.py`
2. Add method to `frontend/lib/api.ts`
3. Use in React components

**Adding a new page:**

1. Create `frontend/app/your-page/page.tsx`
2. Access at `http://localhost:3000/your-page`

## 🔌 Integrating Your Solver

To integrate your existing `src/solver` code:

```python
# backend/app/main.py
import sys
sys.path.append('../src')

from solver.solver import YourSolverClass

@app.post("/api/solve")
async def solve_problem(data: ProblemData):
    solver = YourSolverClass()
    result = solver.solve(data)
    return {"solution": result}
```

## 📈 Scaling Considerations

### Production Checklist

- [ ] Configure production environment variables
- [ ] Set up database (PostgreSQL, MongoDB, etc.)
- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Add logging and monitoring
- [ ] Configure HTTPS/SSL
- [ ] Set up CI/CD pipeline
- [ ] Configure CORS for production domains
- [ ] Optimize build for production
- [ ] Set up error tracking (Sentry, etc.)

### Deployment Options

**Frontend (Next.js)**

- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted with PM2

**Backend (FastAPI)**

- Railway
- Render
- Heroku
- AWS EC2/ECS
- DigitalOcean
- Self-hosted with Nginx + Gunicorn

## 🤝 Contributing

When adding features:

1. Follow the existing code structure
2. Add types to TypeScript code
3. Use Pydantic models for API schemas
4. Update documentation
5. Test both frontend and backend

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
