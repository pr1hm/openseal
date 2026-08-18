import base64
import fitz
from pydantic import BaseModel
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import sqlite3
import uuid

app = FastAPI()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
DB_FILE = os.path.join(BASE_DIR, "signatures.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, x REAL, y REAL, width REAL, height REAL, page_num INTEGER, status TEXT DEFAULT 'pending')")
    conn.commit()
    conn.close()

init_db()


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class StampData(BaseModel):
    x:float
    y:float
    width: float
    height:float
    page_num: int
    image_base64:str

class LinkRequest(BaseModel):
    x: float
    y: float
    width: float
    height: float
    page_num: int

@app.get("/", response_class=HTMLResponse)
def read_root():
    index_path = os.path.join(TEMPLATES_DIR, "admin.html")
    with open(index_path, "r") as f:
        return f.read()

@app.post("/generate-link")
def generate_link(data: LinkRequest):
    doc_id=str(uuid.uuid4())

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO requests (id, x, y, width, height, page_num) VALUES (?, ?, ?, ?, ?, ?)", (doc_id, data.x, data.y, data.width, data.height, data.page_num))
    conn.commit()
    conn.close()

    return {"link": f"http://localhost:800/sign/{doc_id}"}

@app.post("/stamp")
def stamp_pdf(data:StampData):
    input_pdf = os.path.join(STATIC_DIR, "dummy.pdf")
    output_pdf = os.path.join(STATIC_DIR, "signed_dummy.pdf")

    header, encoded = data.image_base64.split(",", 1)
    image_bytes = base64.b64decode(encoded)

    doc = fitz.open(input_pdf)
    page = doc[data.page_num - 1]

    rect = fitz.Rect(data.x, data.y,data.x + data.width, data.y + data.height)
    page.insert_image(rect, stream=image_bytes)

    doc.save(output_pdf)
    doc.close()

    return {"message":"Success","file":"/static/signed_dummy.pdf"}

@app.get("/{filename}")
def serve_static_file(filename: str):
    file_path = os.path.join(BASE_DIR, filename)

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)