import { PDF_CONFIG } from './config.js';
import { setPdfDocument, getPdfDocument, clearPageImages, addPageImage } from './state.js';
import { showProgress, showError, hideProgress } from './ui.js';

export async function handlePdfUpload(file) {
    if (!file) return;

    try {
        console.log('Loading PDF:', file.name);
        showProgress('Loading PDF...');

        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDocument(doc);
        console.log('PDF loaded successfully:', doc.numPages, 'pages');
        
        await convertPdfToImages();
        
        hideProgress();
        return true;
    } catch (error) {
        console.error('PDF load error:', error);
        showError('Failed to load PDF: ' + error.message);
        return false;
    }
}

async function convertPdfToImages() {
    clearPageImages();
    const pdfDocument = getPdfDocument();
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
        showProgress(`Converting page ${i} of ${numPages}...`);
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: PDF_CONFIG.scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        addPageImage(base64Image);
    }
    console.log('PDF converted to', numPages, 'images');
}
