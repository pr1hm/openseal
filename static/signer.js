const cleanPath = window.location.pathname.replace(/\/$/, "");
const docId = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
console.log("extracted Document ID:", docId);
const url = '/static/dummy.pdf';
let docData = null;
let CURRENT_SCALE = 1.0;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function initSigner() {
    try {
        const response = await fetch(`/api/doc/${docId}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status}): Could not find document ${docId}. Backend says: ${errorText}`);
        }

        docData = await response.json();

        if (docData.status === 'signed') {
            document.getElementById('status-text').innerText = "This document has already been signed.";
            document.getElementById('sig-pad-container').style.display = 'none';
            return;
        }

        const pdf = await pdfjsLib.getDocument(url).promise;
        const page = await pdf.getPage(docData.page_num);

        const canvas = document.getElementById('pdf-render');
        const ctx = canvas.getContext('2d');

        const unscaledViewport = page.getViewport({scale:1.0});
        const targetHeight = window.innerHeight * 0.7;
        CURRENT_SCALE = targetHeight / unscaledViewport.height;

        const viewport = page.getViewport({scale: CURRENT_SCALE});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({canvasContext: ctx, viewport: viewport}).promise;

        const targetBox = document.getElementById('target-box');
        targetBox.style.display = 'block';
        targetBox.style.left = (docData.x * CURRENT_SCALE) + 'px';
        targetBox.style.top = (docData.y * CURRENT_SCALE) + 'px';
        targetBox.style.width = (docData.width * CURRENT_SCALE) + 'px';
        targetBox.style.height = (docData.height * CURRENT_SCALE) + 'px';
    } catch (err) {
        alert(err.message);
    }
}

initSigner();

const sigCanvas = document.getElementById('sig-canvas');
const sigCtx = sigCanvas.getContext('2d');
let isDrawing = false;
sigCtx.lineWidth = 3;
sigCtx.lineCap = 'round';
sigCtx.strokeStyle = 'black';

function draw(e) {
    if (!isDrawing) return;
    const rect = sigCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches[0].clientX;
    const clientY = e.clientY ?? e.touches[0].clientY;
    sigCtx.lineTo(clientX - rect.left, clientY - rect.top);
    sigCtx.stroke();
    sigCtx.beginPath();
    sigCtx.moveTo(clientX - rect.left, clientY - rect.top);
}

sigCanvas.addEventListener('mousedown', (e) => {isDrawing=true; draw(e);});
sigCanvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', () => {isDrawing = false; siggCtx.beginPath();});

sigCanvas.addEventListener('touchstart', (e) => {isDrawing = true; draw(e);});
sigCanvas.addEventListener('touchmove', draw);
window.addEventListener('touchend', () => {isDrawing = false; sigCtx.beginPath();});

function clearCanvas() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

async function submitSignature() {
    const base64Image = sigCanvas.toDataURL("image/png");
    const response = await fetch(`/stamp/${docId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({image_base64: base64Image})
    });
    const result = await response.json();
    if (response.ok) {
        alert("Document Signed Successfully!");
        window.location.href = result.file;
    } else {
        alert("Error: " + result.detail);
    }
}