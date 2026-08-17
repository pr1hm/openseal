// frontend/src/app/page.tsx
'use client';

import dynamic from 'next/dynamic';

// This is the magic fix! It tells Next.js: "Do NOT run this on the server."
const PdfViewer = dynamic(() => import('../components/PdfViewer'), {
  ssr: false,
  loading: () => <div className="p-10 animate-pulse text-neutral-500">Booting up PDF engine...</div>,
});

export default function SignDocumentPage() {
  return (
    <div className="min-h-screen bg-neutral-100 p-8 flex flex-col items-center font-sans">
      <h1 className="text-3xl font-bold mb-6 text-neutral-800">Review & Sign</h1>
      
      {/* We inject our client-only component here */}
      <PdfViewer />
      
    </div>
  );
}