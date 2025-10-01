// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// State
let pdfDocument = null;
let pageImages = [];
let translations = [];

// DOM elements
const pdfUpload = document.getElementById('pdf-upload');
const apiKeyInput = document.getElementById('api-key');
const targetLanguage = document.getElementById('target-language');
const translateBtn = document.getElementById('translate-btn');
const progressSection = document.querySelector('.progress-section');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const resultsSection = document.querySelector('.results-section');
const resultsContainer = document.getElementById('results-container');
const downloadBtn = document.getElementById('download-btn');
const errorSection = document.querySelector('.error-section');
const errorMessage = document.querySelector('.error-message');
const retryBtn = document.getElementById('retry-btn');

// Event listeners
pdfUpload.addEventListener('change', handlePdfUpload);
apiKeyInput.addEventListener('input', validateInputs);
translateBtn.addEventListener('click', startTranslation);
downloadBtn.addEventListener('click', downloadResults);
retryBtn.addEventListener('click', resetApp);

function validateInputs() {
    const hasPdf = pdfDocument !== null;
    const hasApiKey = apiKeyInput.value.trim().startsWith('sk-');
    translateBtn.disabled = !(hasPdf && hasApiKey);
}

async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showProgress('Loading PDF...');
        progressSection.style.display = 'block';

        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        await convertPdfToImages();
        
        progressSection.style.display = 'none';
        validateInputs();
    } catch (error) {
        showError('Failed to load PDF: ' + error.message);
    }
}

async function convertPdfToImages() {
    pageImages = [];
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
        showProgress(`Converting page ${i} of ${numPages}...`);
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const base64Image = canvas.toDataURL('image/png').split(',')[1];
        pageImages.push(base64Image);
    }
}

function showProgress(text) {
    progressText.textContent = text;
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Translating page ${current} of ${total}...`;
}

async function startTranslation() {
    const apiKey = apiKeyInput.value.trim();
    const language = targetLanguage.value;

    translations = [];
    resultsContainer.innerHTML = '';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressSection.style.display = 'block';
    translateBtn.disabled = true;

    try {
        for (let i = 0; i < pageImages.length; i++) {
            updateProgress(i + 1, pageImages.length);
            
            const translation = await translatePage(i, language, apiKey);
            translations.push({
                pageNumber: i + 1,
                text: translation
            });

            displayResult(i + 1, translation);
        }

        progressSection.style.display = 'none';
        resultsSection.style.display = 'block';
        translateBtn.disabled = false;
    } catch (error) {
        showError('Translation failed: ' + error.message);
        translateBtn.disabled = false;
    }
}

async function translatePage(pageIndex, language, apiKey) {
    const messages = buildMessagesForPage(pageIndex, language);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function buildMessagesForPage(pageIndex, language) {
    const content = [];
    const hasPrevious = pageIndex > 0;
    const hasNext = pageIndex < pageImages.length - 1;

    let promptText = `Translate the content of the middle page to ${language}.`;
    
    if (hasPrevious && hasNext) {
        promptText += ' The previous and next pages are provided as context to ensure translation continuity.';
        content.push({
            type: 'text',
            text: 'Previous page (for context):'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex - 1]}`
            }
        });
        content.push({
            type: 'text',
            text: 'TRANSLATE THIS PAGE:'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex]}`
            }
        });
        content.push({
            type: 'text',
            text: 'Next page (for context):'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex + 1]}`
            }
        });
    } else if (hasPrevious) {
        promptText += ' The previous page is provided as context.';
        content.push({
            type: 'text',
            text: 'Previous page (for context):'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex - 1]}`
            }
        });
        content.push({
            type: 'text',
            text: 'TRANSLATE THIS PAGE:'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex]}`
            }
        });
    } else if (hasNext) {
        promptText += ' The next page is provided as context.';
        content.push({
            type: 'text',
            text: 'TRANSLATE THIS PAGE:'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex]}`
            }
        });
        content.push({
            type: 'text',
            text: 'Next page (for context):'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex + 1]}`
            }
        });
    } else {
        content.push({
            type: 'text',
            text: 'TRANSLATE THIS PAGE:'
        });
        content.push({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${pageImages[pageIndex]}`
            }
        });
    }

    content.unshift({
        type: 'text',
        text: promptText + ' Only provide the translated text, no explanations or metadata.'
    });

    return [{
        role: 'user',
        content: content
    }];
}

function displayResult(pageNumber, text) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-page';
    
    const heading = document.createElement('h3');
    heading.textContent = `Page ${pageNumber}`;
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    
    resultDiv.appendChild(heading);
    resultDiv.appendChild(paragraph);
    resultsContainer.appendChild(resultDiv);
}

function downloadResults() {
    let content = '';
    translations.forEach(({ pageNumber, text }) => {
        content += `=== Page ${pageNumber} ===\n\n${text}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    progressSection.style.display = 'none';
}

function resetApp() {
    errorSection.style.display = 'none';
    resultsSection.style.display = 'none';
    progressSection.style.display = 'none';
    validateInputs();
}
