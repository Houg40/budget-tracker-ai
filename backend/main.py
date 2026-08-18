from fastapi import FastAPI

app = FastAPI(title="Budget Tracker AI API")

@app.get("/health")
def health_check():
    return {"status": "ok"}