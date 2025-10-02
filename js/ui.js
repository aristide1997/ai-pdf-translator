import { 
    progressSection, 
    progressFill, 
    progressText, 
    resultsSection, 
    resultsContainer, 
    errorSection, 
    errorMessage 
} from './dom.js';
import { getPageImages, getTranslations } from './state.js';

export function showProgress(text) {
    progressText.textContent = text;
    progressSection.style.display = 'block';
}

export function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Translating page ${current} of ${total}...`;
}

export function hideProgress() {
    progressSection.style.display = 'none';
}

export function showResults() {
    resultsSection.style.display = 'block';
}

export function hideResults() {
    resultsSection.style.display = 'none';
}

export function clearResults() {
    resultsContainer.innerHTML = '';
}

export function displayResult(pageNumber, text) {
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
    const pageImages = getPageImages();
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

export function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    hideProgress();
}

export function hideError() {
    errorSection.style.display = 'none';
}

export function downloadResults() {
    console.log('Downloading translation results');
    const translations = getTranslations();
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
