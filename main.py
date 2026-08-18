import base64
import fitz
from pydantic import BaseModel
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
import uvicorn

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class StampData(BaseModel):
    x:float
    y:float
    width: float
    height:float
    page_num: int
    image_base64:str

@app.get("/", response_class=HTMLResponse)
def read_root():
    index_path = os.path.join(BASE_DIR, "index.html")
    with open(index_path, "r") as f:
        return f.read()

@app.post("/stamp")
def stamp_pdf(data:StampData):
    input_pdf = os.path.join(BASE_DIR, "dummy.pdf")
    output_pdf = os.path.join(BASE_DIR, "signed_dummy.pdf")

    header, encoded = data.image_base64.split(",", 1)
    image_bytes = base64.b64decode(encoded)

    doc = fitz.open(input_pdf)
    page = doc[data.page_num - 1]

    rect = fitz.Rect(data.x, data.y,data.x + data.width, data.y + data.height)

    page.insert_image(rect, stream=image_bytes)

    doc.save(output_pdf)
    doc.close()

    return {"message":"Success","file":"signed_dummy.pdf"}

@app.get("/{filename}")
def serve_static_file(filename: str):
    file_path = os.path.join(BASE_DIR, filename)

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)