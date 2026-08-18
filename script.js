const sigCanvas = document.getElementById('sig-canvas');
const sigCtx = sigCanvas.getContext('2d');
let isDrawing = false;
let pdfDoc = null;
let pageNum = 1;
let CURRENT_SCALE = 1.0;

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

const url = './dummy.pdf';
const canvas = document.getElementById('pdf-render');
const ctx = canvas.getContext('2d');

function renderPage(num){
    pdfDoc.getPage(num).then(page => {
        const unscaledViewport = page.getViewport({scale:1.0});
        const targetHeight= window.innerHeight*0.8;
        CURRENT_SCALE = targetHeight / unscaledViewport.height;

        const viewport = page.getViewport({scale: CURRENT_SCALE});
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = { canvasContext: ctx, viewport: viewport };
        page.render(renderContext);

        document.getElementById('page-info').innerText = `Page ${num} of ${pdfDoc.numPages}`;
    })
}

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

pdfjsLib.getDocument(url).promise.then(pdf => {
    console.log("PDF Loaded!");
    pdfDoc = pdf;
    renderPage(pageNum);
}).catch(err => console.error("PDF Error:", err));

document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    renderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    renderPage(pageNum);
});

async function stampDocument() {
    const base64Image = sigCanvas.toDataURL("image/png");
    const canvasRect = document.getElementById('pdf-render').getBoundingClientRect();
    const boxRect = document.getElementById('sig-box').getBoundingClientRect();
    const relativeX = boxRect.left - canvasRect.left;
    const relativeY = boxRect.top - canvasRect.top;
    const pdfX = relativeX / CURRENT_SCALE;
    const pdfY = relativeY / CURRENT_SCALE;
    const pdfWidth = 150 / CURRENT_SCALE;
    const pdfHeight = 50 / CURRENT_SCALE;

    const response = await fetch('/stamp' , {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            page_num: pageNum,
            image_base64: base64Image
        })
    });

    const result = await response.json();
    alert("Document Signed! Saved as: " + result.file);
}

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

