const cleanPath = window.location.pathname.replace(/\/$/, "");
const docId = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
console.log("extracted Document ID:", docId);
let docData = null;
let CURRENT_SCALE = 1.0;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function initSigner() {
    try {
        const response = await fetch(`/api/doc/${docId}`);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server Error (${response.status}): ${errorText}`);
        }

        docData = await response.json();

        if (docData.status === 'signed') {
            document.getElementById('status-text').innerText = "This document has already been signed.";
            document.getElementById('pdf-container').style.display = 'none';
            return;
        }

        const pdfUrl = `/static/${docData.filename}`;
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const page = await pdf.getPage(docData.page_num);

        const canvas = document.getElementById('pdf-render');
        const ctx = canvas.getContext('2d');

        const unscaledViewport = page.getViewport({scale:1.0});
        const scaleWidth = (window.innerWidth * 0.95) / unscaledViewport.width;
        const scaleHeight = (window.innerHeight * 0.7) / unscaledViewport.height;
        CURRENT_SCALE = Math.min(scaleWidth, scaleHeight);

        const viewport = page.getViewport({scale: CURRENT_SCALE});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({canvasContext: ctx, viewport: viewport}).promise;

        const targetBox = document.getElementById('target-box');
        targetBox.style.display = 'flex';
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

function getCoordinates(e) {
    if (e.touches && e.touches.length > 0) {
        return {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }
    return { x: e.clientX, y: e.clientY };
}

function startPosition(e) {
    isDrawing = true;
    const rect = sigCanvas.getBoundingClientRect();
    const coords = getCoordinates(e);
    sigCtx.beginPath();
    sigCtx.moveTo(coords.x - rect.left, coords.y - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = sigCanvas.getBoundingClientRect();
    const coords = getCoordinates(e);

    sigCtx.lineTo(coords.x - rect.left, coords.y - rect.top);
    sigCtx.stroke();
}

function endPosition() {
    isDrawing = false;
}

sigCanvas.addEventListener('mousedown', startPosition);
sigCanvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', endPosition);

sigCanvas.addEventListener('touchstart', startPosition, {passive: false});
sigCanvas.addEventListener('touchmove', draw, {passive: false});
window.addEventListener('touchend', endPosition);

function clearCanvas() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigCtx.lineWidth = 3;
    sigCtx.lineCap = 'round';
    sigCtx.strokeStyle = 'black';
}

function openModal() {
    const modal = document.getElementById('signature-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        const rect = sigCanvas.getBoundingClientRect();
        sigCanvas.width = rect.width || 400;
        sigCanvas.height = rect.height || 150;
        clearCanvas();
    }, 10);
    
}


function closeModal() {
    const modal = document.getElementById('signature-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');

    document.body.style.overflow = 'auto';
}

async function submitSignature() {
    const btn = document.getElementById('submit-btn');
    btn.innerText = "Signing...";
    btn.disabled = true;

    const base64Image = sigCanvas.toDataURL("image/png");

    try {
        const response = await fetch(`/stamp/${docId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({image_base64: base64Image})
        });

        const result = await response.json();

        if (response.ok) {
            closeModal();
            document.getElementById('pdf-container').style.display = 'none';
            document.getElementById('status-text').style.display = 'none';

            const successScreen = document.getElementById('success-screen');
            successScreen.classList.remove('hidden');
            successScreen.classList.add('flex');

            document.getElementById('download-btn').href = result.file;
        } else {
            alert("Error: " + result.detail);
        }
    } catch (err) {
        alert("Failed to connect to server.");
    } finally {
        btn.innerText = "Apply signature";
        btn.disabled = false;
    }
}