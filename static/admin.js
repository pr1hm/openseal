let pdfDoc = null;
let pageNum = 1;
let CURRENT_SCALE = 1.0;

const url = '/static/dummy.pdf';
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

async function generateLink() {
    const canvasRect = document.getElementById('pdf-render').getBoundingClientRect();
    const boxRect = document.getElementById('sig-box').getBoundingClientRect();

    const relativeX = boxRect.left - canvasRect.left;
    const relativeY = boxRect.top - canvasRect.top;

    const pdfX = relativeX / CURRENT_SCALE;
    const pdfY = relativeY / CURRENT_SCALE;
    const pdfWidth = boxRect.width / CURRENT_SCALE;
    const pdfHeight = boxRect.height / CURRENT_SCALE;

    const response = await fetch('/generate-link' , {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            page_num: pageNum
        })
    });

    const result = await response.json();
    prompt("Signature request created! Copy this link to send to the signer:", result.link);
}

const box = document.getElementById('sig-box');
const coordsText = document.getElementById('coords');
let isDragging = false;
let offsetX, offsetY;

box.addEventListener('mousedown', (e) => {
    if (e.offsetX > box.offsetWidth - 20 && e.offsetY > box.offsetHeight - 20) return;

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

