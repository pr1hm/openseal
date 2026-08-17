from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

app = FastAPI()

@app.get("/", response_class=HTMLResponse)
def read_root():
    with open("index.html", "r") as f:
        return f.read()

@app.get("./dummy.pdf")
def get_pdf():
    return FileResponse("dummy.pdf")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)