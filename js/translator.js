import { API_CONFIG, TRANSLATION_CONFIG } from './config.js';
import { getPageImages } from './state.js';

export async function translatePage(pageIndex, language, apiKey, previousTranslations) {
    const contents = buildContentsForPage(pageIndex, language, previousTranslations);
    
    console.log('Translating page', pageIndex + 1);
    
    for (let attempt = 0; attempt <= API_CONFIG.maxRetries; attempt++) {
        try {
            const ai = new window.GoogleGenAI({ apiKey });
            
            const response = await ai.models.generateContent({
                model: API_CONFIG.model,
                contents: contents,
                config: {
                    thinkingConfig: {
                        thinkingBudget: API_CONFIG.thinkingBudget
                    }
                }
            });

            let text = response.text;
            
            if (!text) {
                console.warn(`Page ${pageIndex + 1}: response.text is undefined, trying fallback`);
                if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
                    text = response.candidates[0].content.parts[0].text;
                }
            }
            
            if (!text) {
                const errorMsg = `Empty response from API for page ${pageIndex + 1}`;
                console.warn(errorMsg, 'Response:', response);
                
                if (attempt < API_CONFIG.maxRetries) {
                    const delayMs = API_CONFIG.retryDelays[attempt];
                    console.log(`Retrying in ${delayMs}ms (attempt ${attempt + 1}/${API_CONFIG.maxRetries})...`);
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
            
            console.error(`API error for page ${pageIndex + 1} (attempt ${attempt + 1}/${API_CONFIG.maxRetries + 1}):`, error);
            
            if (isRetryableError && attempt < API_CONFIG.maxRetries) {
                const delayMs = API_CONFIG.retryDelays[attempt];
                console.log(`${isRateLimitError ? 'Rate limited' : 'Server error'}, retrying in ${delayMs}ms...`);
                await sleep(delayMs);
                continue;
            }
            
            throw new Error(error.message || 'API request failed');
        }
    }
}

function buildContentsForPage(pageIndex, language, previousTranslations) {
    const contextStart = Math.max(0, pageIndex - TRANSLATION_CONFIG.contextWindow);
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

    const pageImages = getPageImages();
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
