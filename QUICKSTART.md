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

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 3: Start Both Servers

**Option A: Start everything at once (Recommended)**

```bash
# From the root directory
./start-all.sh
```

**Option B: Start separately in two terminals**

Terminal 1 (Backend):

```bash
cd backend
./start-backend.sh
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
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

## ✨ What's Included

The boilerplate comes with:

### Frontend (Next.js)

- ✅ Beautiful, modern UI with gradient backgrounds
- ✅ API health check display
- ✅ Sample data fetching from backend
- ✅ Item processing demonstration
- ✅ Type-safe API client
- ✅ Responsive design with Tailwind CSS

### Backend (FastAPI)

- ✅ CORS configured for Next.js
- ✅ Sample REST API endpoints
- ✅ Request/Response models with Pydantic
- ✅ Auto-generated API documentation
- ✅ Health check endpoint

## 📋 API Endpoints

| Method | Endpoint       | Description                         |
| ------ | -------------- | ----------------------------------- |
| GET    | `/`            | Root endpoint                       |
| GET    | `/health`      | Health check                        |
| GET    | `/api/hello`   | Sample hello message                |
| GET    | `/api/items`   | Get list of items                   |
| POST   | `/api/process` | Process an item (doubles its value) |

## 🎨 Customization

### Add a New API Endpoint

1. Edit `backend/app/main.py`:

```python
@app.get("/api/your-endpoint")
async def your_endpoint():
    return {"data": "your data"}
```

2. Update `frontend/lib/api.ts`:

```typescript
async yourEndpoint() {
  return this.request('/api/your-endpoint');
}
```

3. Use in your React components:

```typescript
const data = await apiClient.yourEndpoint();
```

### Modify the Frontend

- Main page: `frontend/app/page.tsx`
- Global styles: `frontend/app/globals.css`
- API client: `frontend/lib/api.ts`

## 🔧 Troubleshooting

**Backend won't start?**

- Make sure you ran `./setup.sh` first
- Check that Python 3.8+ is installed: `python3 --version`
- Verify virtual environment is activated: `source venv/bin/activate`

**Frontend shows API errors?**

- Ensure backend is running on port 8000
- Check CORS settings in `backend/app/main.py`
- Verify `.env.local` has correct API URL

**Port already in use?**

- Backend: Change port in start command or `.env` file
- Frontend: Use `npm run dev -- -p 3001` for a different port

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

## 🎓 Next Steps

1. **Integrate your solver**: Import and use your existing `src/solver` code in the FastAPI endpoints
2. **Add database**: Install SQLAlchemy or your preferred ORM
3. **Add authentication**: Implement JWT or OAuth
4. **Deploy**: Use services like Vercel (frontend) and Railway/Render (backend)

## 📚 Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)

Happy coding! 🎉
