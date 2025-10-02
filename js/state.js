let pdfDocument = null;
let pageImages = [];
let translations = [];

export function getPdfDocument() {
    return pdfDocument;
}

export function setPdfDocument(doc) {
    pdfDocument = doc;
}

export function getPageImages() {
    return pageImages;
}

export function setPageImages(images) {
    pageImages = images;
}

export function addPageImage(image) {
    pageImages.push(image);
}

export function clearPageImages() {
    pageImages = [];
}

export function getTranslations() {
    return translations;
}

export function setTranslations(trans) {
    translations = trans;
}

export function addTranslation(translation) {
    translations.push(translation);
}

export function clearTranslations() {
    translations = [];
}

export function resetState() {
    pdfDocument = null;
    pageImages = [];
    translations = [];
}
