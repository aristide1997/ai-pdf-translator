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
    const hasApiKey = apiKeyInput.value.trim().length > 0;
    translateBtn.disabled = !(hasPdf && hasApiKey);
}

async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        console.log('Loading PDF:', file.name);
        showProgress('Loading PDF...');
        progressSection.style.display = 'block';

        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('PDF loaded successfully:', pdfDocument.numPages, 'pages');
        
        await convertPdfToImages();
        
        progressSection.style.display = 'none';
        validateInputs();
    } catch (error) {
        console.error('PDF load error:', error);
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
    console.log('PDF converted to', numPages, 'images');
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

    console.log('Starting translation to', language, 'for', pageImages.length, 'pages');
    translations = [];
    resultsContainer.innerHTML = '';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressSection.style.display = 'block';
    translateBtn.disabled = true;

    try {
        for (let i = 0; i < pageImages.length; i++) {
            updateProgress(i + 1, pageImages.length);
            
            const translation = await translatePage(i, language, apiKey, translations);
            translations.push({
                pageNumber: i + 1,
                text: translation
            });

            displayResult(i + 1, translation);
        }

        console.log('Translation complete');
        progressSection.style.display = 'none';
        resultsSection.style.display = 'block';
        translateBtn.disabled = false;
    } catch (error) {
        console.error('Translation error:', error);
        showError('Translation failed: ' + error.message);
        translateBtn.disabled = false;
    }
}

async function translatePage(pageIndex, language, apiKey, previousTranslations) {
    const contents = buildContentsForPage(pageIndex, language, previousTranslations);
    const maxRetries = 10;
    const retryDelays = [1000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 60000, 60000];
    
    console.log('Translating page', pageIndex + 1);
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Initialize the SDK client
            const ai = new window.GoogleGenAI({ apiKey });
            
            // Use the SDK's generateContent method
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: contents,
                config: {
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            });

            // Try to get text from response
            let text = response.text;
            
            // If text is undefined, try to access via candidates as fallback
            if (!text) {
                console.warn(`Page ${pageIndex + 1}: response.text is undefined, trying fallback`);
                if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
                    text = response.candidates[0].content.parts[0].text;
                }
            }
            
            // If still no text, treat as empty response
            if (!text) {
                const errorMsg = `Empty response from API for page ${pageIndex + 1}`;
                console.warn(errorMsg, 'Response:', response);
                
                // Retry on empty response
                if (attempt < maxRetries) {
                    const delayMs = retryDelays[attempt];
                    console.log(`Retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
                    await sleep(delayMs);
                    continue;
                }
                throw new Error(errorMsg);
            }

            console.log(`Page ${pageIndex + 1} translated successfully`);
            return text;
            
        } catch (error) {
            const isRateLimitError = error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit');
            const isRetryableError = error.status >= 500 || isRateLimitError;
            
            console.error(`API error for page ${pageIndex + 1} (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
            
            // Retry on rate limiting or server errors
            if (isRetryableError && attempt < maxRetries) {
                const delayMs = retryDelays[attempt];
                console.log(`${isRateLimitError ? 'Rate limited' : 'Server error'}, retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            
            // Final attempt failed or non-retryable error
            throw new Error(error.message || 'API request failed');
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildContentsForPage(pageIndex, language, previousTranslations) {
    const contextWindow = 2;
    const contextStart = Math.max(0, pageIndex - contextWindow);
    const recentTranslations = previousTranslations.slice(contextStart, pageIndex);
    
    let promptText = `Translate this page to ${language}. Format your response as markdown to preserve the document structure (headings, paragraphs, lists, emphasis, etc.). Use proper markdown syntax for formatting. If the page has no content or is blank, respond with exactly "## Empty page".`;
    
    if (recentTranslations.length > 0) {
        promptText += '\n\nPrevious pages for context (maintain terminology consistency):\n';
        recentTranslations.forEach(t => {
            promptText += `\n--- Page ${t.pageNumber} ---\n${t.text}\n`;
        });
        promptText += '\n';
    }
    
    promptText += '\nOnly provide the translated text for the current page, no explanations or metadata.';

    const parts = [
        {
            text: promptText
        },
        {
            text: '\nTRANSLATE THIS PAGE:'
        },
        {
            inlineData: {
                mimeType: 'image/png',
                data: pageImages[pageIndex]
            }
        }
    ];

    return [{
        parts: parts
    }];
}

function displayResult(pageNumber, text) {
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-page';
    
    const heading = document.createElement('h3');
    heading.textContent = `Page ${pageNumber}`;
    resultDiv.appendChild(heading);
    
    const comparisonContainer = document.createElement('div');
    comparisonContainer.className = 'comparison-container';
    
    const originalPage = document.createElement('div');
    originalPage.className = 'original-page';
    const img = document.createElement('img');
    img.src = `data:image/png;base64,${pageImages[pageNumber - 1]}`;
    img.alt = `Page ${pageNumber}`;
    originalPage.appendChild(img);
    
    const translatedPage = document.createElement('div');
    translatedPage.className = 'translated-page';
    const markdownContent = document.createElement('div');
    markdownContent.className = 'markdown-content';
    markdownContent.innerHTML = marked.parse(text);
    translatedPage.appendChild(markdownContent);
    
    comparisonContainer.appendChild(originalPage);
    comparisonContainer.appendChild(translatedPage);
    resultDiv.appendChild(comparisonContainer);
    resultsContainer.appendChild(resultDiv);
}

function downloadResults() {
    console.log('Downloading translation results');
    let content = '';
    translations.forEach(({ pageNumber, text }) => {
        content += `# Page ${pageNumber}\n\n${text}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation.md';
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
