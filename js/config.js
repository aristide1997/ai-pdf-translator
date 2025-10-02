// PDF.js configuration
export const PDF_CONFIG = {
    workerSrc: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    scale: 2.0
};

// Translation API configuration
export const API_CONFIG = {
    model: 'gemini-2.5-flash',
    maxRetries: 10,
    retryDelays: [1000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 60000, 60000],
    thinkingBudget: 0
};

// Context window for maintaining translation consistency
export const TRANSLATION_CONFIG = {
    contextWindow: 2
};
