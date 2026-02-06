from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Liquidity API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str
    message: str


class ItemRequest(BaseModel):
    name: str
    value: float


class ItemResponse(BaseModel):
    name: str
    value: float
    processed: bool


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Welcome to Liquidity API"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="API is running successfully"
    )


@app.get("/api/hello")
async def hello():
    """Sample hello endpoint"""
    return {"message": "Hello from FastAPI!"}


@app.post("/api/process", response_model=ItemResponse)
async def process_item(item: ItemRequest):
    """Process an item - example endpoint"""
    return ItemResponse(
        name=item.name,
        value=item.value * 2,  # Example processing
        processed=True
    )


@app.get("/api/items")
async def get_items():
    """Get a list of items - example endpoint"""
    return {
        "items": [
            {"id": 1, "name": "Item 1", "value": 100},
            {"id": 2, "name": "Item 2", "value": 200},
            {"id": 3, "name": "Item 3", "value": 300},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
