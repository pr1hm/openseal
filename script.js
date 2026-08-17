
const sigCanvas = document.getElementById('sig-canvas');
const sigCtx = sigCanvas.getContext('2d');
let isDrawing = false;

sigCtx.lineWidth = 3;
sigCtx.lineCap = 'round';
sigCtx.strokeStyle = 'black';

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    isDrawing = false;
    sigCtx.beginPath();
}

function draw(e) {
    if (!isDrawing) return;

    const rect = sigCanvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    sigCtx.lineTo(clientX - rect.left, clientY - rect.top);
    sigCtx.stroke();
    sigCtx.beginPath();
    sigCtx.moveTo(clientX - rect.left, clientY - rect.top);
}

sigCanvas.addEventListener('mousedown', startDrawing);
sigCanvas.addEventListener('mousemove', draw);
sigCanvas.addEventListener('mouseup', stopDrawing);
sigCanvas.addEventListener('mouseout', stopDrawing);

sigCanvas.addEventListener('touchstart', startDrawing);
sigCanvas.addEventListener('touchmove', draw);
sigCanvas.addEventListener('touchend', stopDrawing);

function clearCanvas() {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}

// 1. Setup PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// 2. Fetch and render the PDF
const url = '/dummy.pdf';
const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');

pdfjsLib.getDocument(url).promise.then(pdf => {
    console.log("PDF Loaded!");
    // Load page 1
    return pdf.getPage(1);
}).then(page => {
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render it onto the canvas
    const renderContext = { canvasContext: ctx, viewport: viewport };
    page.render(renderContext);
}).catch(err => console.error("PDF Error:", err));

// 3. Make the red box draggable
const box = document.getElementById('sig-box');
const coordsText = document.getElementById('coords');
let isDragging = false;
let offsetX, offsetY;

box.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - box.offsetLeft;
    offsetY = e.clientY - box.offsetTop;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    // Calculate new X/Y relative to the PDF container
    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    box.style.left = newX + 'px';
    box.style.top = newY + 'px';

    // Update UI to show we got the coordinates
    coordsText.innerText = `X: ${newX}, Y: ${newY}`;
});

document.addEventListener('mouseup', () => isDragging = false);

async function stampDocument() {
    const base64Image = sigCanvas.toDataURL("image/png");
    const currentX = parseFloat(box.style.left) || 50;
    const currentY = parseFloat(box.style.top) || 50;
    const response = await fetch('/stamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            x: currentX,
            y: currentY,
            image_base64: base64Image
        })
    });

    const result = await response.json();
    alert("Document Signed! Saved as: " + result.file);
}