# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Setup Backend

```bash
cd backend
./setup.sh
```

This will:

- Create a Python virtual environment
- Install all FastAPI dependencies

**Important**: Copy the example env file and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `backend/.env` and set:

```bash
NESSIE_API_KEY=your_api_key_here       # Required - get one at http://api.nessieisreal.com
DEDALUS_API_KEY=your_dedalus_key_here  # Required for LLM agent
SUPABASE_URL=your_supabase_url         # Required for Nessie customer mapping
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for server-side Supabase access
```

**Supabase Setup**: Run the SQL files in the Supabase SQL editor:

- `supabase/nessie_customers.sql`
- `supabase/dashboard_cache.sql`

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install --legacy-peer-deps
```

**Important**: Ensure the frontend knows where the backend is running.
Create or update `.env.local` in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Start Both Servers

Open two terminals:

Terminal 1 (Backend):

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Terminal 2 (Frontend):

```bash
cd frontend
npm run dev
```

## 🌐 Access Your App

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Interactive Swagger UI)

## ✨ What's Included

The platform now features:

### Frontend (Next.js)

- ✅ **New User Integration**: Register and link your Nessie bank account
- ✅ **Liquidity Optimization**: One-click budget optimization based on real banking data
- ✅ **AI Financial Advisor**: Chat interface for personalized financial advice
- ✅ Modern UI with specific dashboards and reports
- ✅ Type-safe API client

### Backend (FastAPI)

- ✅ **Nessie Banking Integration**: Create customers, fetch accounts and bills
- ✅ **Constraint Solver**: Optimized budget allocation using OR-Tools
- ✅ **AI Agent**: LLM-powered agent for financial querying
- ✅ REST API endpoints for user management and optimization

## 📋 Key API Endpoints

| Method | Endpoint                          | Description                             |
| ------ | --------------------------------- | --------------------------------------- |
| POST   | `/api/nessie/users/create`        | Register a new user and link to Nessie  |
| POST   | `/api/nessie/users/{id}/optimize` | Run liquidity optimization for a user   |
| POST   | `/api/agent/solve`                | Send messages to the AI financial agent |
| GET    | `/health`                         | Health check                            |

## 🔧 Troubleshooting

**Backend won't start?**

- Make sure you ran `./setup.sh` first
- Check that `NESSIE_API_KEY` is set in `backend/.env`
- Verify virtual environment is activated
- Python 3.8+ required

**Frontend shows API errors?**

- Ensure backend is running on port 8000
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Check terminal output for any build errors

## 📦 Production Deployment

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm run build
npm start
```
