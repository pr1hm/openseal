// frontend/src/components/PdfViewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState('/dummy.pdf'); 

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF loaded! Total pages:", numPages);
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className="bg-white shadow-xl border border-neutral-300 p-4 max-w-4xl w-full flex justify-center">
        <Document 
          file={file} 
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-10 text-neutral-500">Loadin your document...</div>}
        >
          <Page 
            pageNumber={pageNumber} 
            renderTextLayer={false} 
            renderAnnotationLayer={false} 
            className="border border-neutral-200"
          />
        </Document>
      </div>

      {numPages && (
        <div className="mt-6 flex gap-4 items-center bg-white px-6 py-3 rounded-full shadow-sm border border-neutral-200">
          <button 
            onClick={() => setPageNumber(p => Math.max(p - 1, 1))}
            disabled={pageNumber <= 1}
            className="text-neutral-600 disabled:opacity-30 hover:text-black font-medium"
          >
            &larr; Prev
          </button>
          
          <span className="text-neutral-500 text-sm">
            Page {pageNumber} of {numPages}
          </span>
          
          <button 
            onClick={() => setPageNumber(p => Math.min(p + 1, numPages))}
            disabled={pageNumber >= numPages}
            className="text-neutral-600 disabled:opacity-30 hover:text-black font-medium"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}