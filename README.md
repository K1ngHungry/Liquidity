# Liquidity Platform

A full-stack application built with **Next.js** (frontend) and **FastAPI** (backend).

## 🏗️ Project Structure

```
Liquidity/
├── frontend/          # Next.js application
│   ├── app/          # App router pages
│   ├── lib/          # Utilities and API client
│   └── public/       # Static assets
├── backend/          # FastAPI application
│   ├── app/          # Application code
│   │   └── main.py  # Main FastAPI app
│   └── requirements.txt
├── src/              # Additional Python modules (solver, etc.)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **pip** for Python package management

### Backend Setup (FastAPI)

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create a virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file (optional):

   ```bash
   cp .env.example .env
   ```

5. Run the development server:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## 🎯 Development Workflow

### Running Both Servers

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### API Endpoints

The backend provides the following endpoints:

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /api/hello` - Sample hello endpoint
- `GET /api/items` - Get list of items
- `POST /api/process` - Process an item

### Frontend API Client

The frontend includes a type-safe API client in `frontend/lib/api.ts`:

```typescript
import { apiClient } from "@/lib/api";

// Health check
const health = await apiClient.healthCheck();

// Get items
const { items } = await apiClient.getItems();

// Process item
const result = await apiClient.processItem({ name: "Test", value: 100 });
```

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **React 19** - UI library

### Backend

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Python 3.8+** - Programming language

## 📝 Environment Variables

### Backend (.env)

```env
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True
CORS_ORIGINS=http://localhost:3000
NESSIE_API_KEY=your_nessie_api_key
DEDALUS_API_KEY=your_dedalus_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## 📦 Production Build

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

## 🔧 Adding New Features

### Adding a New API Endpoint

1. Edit `backend/app/main.py`:

```python
@app.get("/api/new-endpoint")
async def new_endpoint():
    return {"message": "New endpoint"}
```

2. Add the method to `frontend/lib/api.ts`:

```typescript
async newEndpoint(): Promise<{ message: string }> {
  return this.request<{ message: string }>('/api/new-endpoint');
}
```

3. Use it in your components:

```typescript
const response = await apiClient.newEndpoint();
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Create a new branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

MIT
