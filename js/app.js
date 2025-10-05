import { PDF_CONFIG } from './config.js';
import { getPdfDocument, getPageImages, clearTranslations, addTranslation } from './state.js';
import { 
    pdfUpload, 
    translationForm,
    apiKeyInput, 
    targetLanguage, 
    translateBtn, 
    downloadBtn, 
    retryBtn 
} from './dom.js';
import { handlePdfUpload } from './pdfProcessor.js';
import { translatePage } from './translator.js';
import { 
    showProgress, 
    updateProgress, 
    hideProgress, 
    showResults, 
    hideResults, 
    clearResults, 
    displayResult, 
    showError, 
    hideError, 
    downloadResults 
} from './ui.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.workerSrc;

function validateInputs() {
    const hasPdf = getPdfDocument() !== null;
    const hasApiKey = apiKeyInput.value.trim().length > 0;
    translateBtn.disabled = !(hasPdf && hasApiKey);
}

async function onPdfUpload(event) {
    const file = event.target.files[0];
    const success = await handlePdfUpload(file);
    if (success) {
        validateInputs();
    }
}

async function startTranslation() {
    const apiKey = apiKeyInput.value.trim();
    const language = targetLanguage.value;
    const pageImages = getPageImages();

    console.log('Starting translation to', language, 'for', pageImages.length, 'pages');
    clearTranslations();
    clearResults();
    hideResults();
    hideError();
    showProgress('Preparing...');
    translateBtn.disabled = true;

    try {
        const translations = [];
        
        for (let i = 0; i < pageImages.length; i++) {
            updateProgress(i + 1, pageImages.length);
            
            const translation = await translatePage(i, language, apiKey, translations);
            const translationEntry = {
                pageNumber: i + 1,
                text: translation
            };
            translations.push(translationEntry);
            addTranslation(translationEntry);

            displayResult(i + 1, translation);
        }

        console.log('Translation complete');
        hideProgress();
        showResults();
        translateBtn.disabled = false;
    } catch (error) {
        console.error('Translation error:', error);
        showError('Translation failed: ' + error.message);
        translateBtn.disabled = false;
    }
}

function resetApp() {
    hideError();
    hideResults();
    hideProgress();
    validateInputs();
}

pdfUpload.addEventListener('change', onPdfUpload);
apiKeyInput.addEventListener('input', validateInputs);
translationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await startTranslation();
});
downloadBtn.addEventListener('click', downloadResults);
retryBtn.addEventListener('click', resetApp);
