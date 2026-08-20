import shutil
import base64
import fitz
from pydantic import BaseModel
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
import uvicorn
import sqlite3
import uuid

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
DB_FILE = os.path.join(BASE_DIR, "signatures.db")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(
        os.path.join(BASE_DIR, "favicon.gif"),
        media_type="image/gif",
    )

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, filename TEXT, x REAL, y REAL, width REAL, height REAL, page_num INTEGER, status TEXT DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    conn.commit()
    conn.close()

init_db()


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

class SignData(BaseModel):
    image_base64: str

class LinkRequest(BaseModel):
    filename: str
    x: float
    y: float
    width: float
    height: float
    page_num: int

@app.get("/", response_class=HTMLResponse)
def read_root():
    index_path = os.path.join(TEMPLATES_DIR, "dashboard.html")
    with open(index_path, "r") as f:
        return f.read()

@app.get("/new-request", response_class=HTMLResponse)
def new_request_page():
    index_path = os.path.join(TEMPLATES_DIR, "admin.html")
    with open(index_path, "r") as f:
        return f.read()

@app.post("/generate-link")
def generate_link(data: LinkRequest):
    doc_id=str(uuid.uuid4())
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO requests (id, filename, x, y, width, height, page_num) VALUES (?, ?, ?, ?, ?, ?, ?)", (doc_id, data.filename, data.x, data.y, data.width, data.height, data.page_num))
    conn.commit()
    conn.close()

    return {"link": f"http://localhost:8000/sign/{doc_id}"}

@app.get("/sign/{doc_id}", response_class=HTMLResponse)
def sign_page(doc_id: str):
    path = os.path.join(TEMPLATES_DIR, "signer.html")
    with open(path, "r") as f:
        return f.read()

@app.post("/api/upload")
def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Must be a PDF file")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(STATIC_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": unique_filename, "url": f"/static/{unique_filename}"}

@app.get("/api/doc/{doc_id}")
def get_document_info(doc_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT x, y, width, height, page_num, status, filename FROM requests WHERE id=?", (doc_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "x": row[0], "y": row[1], "width": row[2], "height": row[3], "page_num": row[4], "status": row[5],
        "filename": row[6]
    }

@app.post("/stamp/{doc_id}")
def sign_document(doc_id: str, data: SignData):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT x, y, width, height, page_num, status, filename FROM requests WHERE id=?", (doc_id,))
    row = cursor.fetchone()

    if not row or row[5] == 'signed':
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid or already signed document.")

    x, y, width, height, page_num, status, filename = row

    header, encoded = data.image_base64.split(",", 1)
    image_bytes = base64.b64decode(encoded)

    input_pdf = os.path.join(STATIC_DIR, filename)
    output_pdf = os.path.join(STATIC_DIR, f"signed_{doc_id}.pdf")

    doc = fitz.open(input_pdf)
    page = doc[page_num - 1]

    rect = fitz.Rect(x, y, x + width, y + height)
    page.insert_image(rect, stream=image_bytes)

    doc.save(output_pdf)
    doc.close()

    cursor.execute("UPDATE requests SET status='signed' WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()

    return {"message": "Success","file": f"/static/signed_{doc_id}.pdf"}

@app.get("/api/requests")
def get_all_requests():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, status, created_at FROM requests ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]

@app.get("/{filename}")
def serve_static_file(filename: str):
    file_path = os.path.join(BASE_DIR, filename)

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)