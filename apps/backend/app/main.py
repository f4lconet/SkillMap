from fastapi import FastAPI

app = FastAPI(title="My Monorepo API")

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI backend!"}