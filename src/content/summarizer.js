// summarizer.js

const MAX_CHARACTERS = 4000;
const MAX_CHUNK_SIZE = 3500;

const splitIntoChunks = (text, chunkSize) => {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        chunks.push(text.slice(startIndex, startIndex + chunkSize));
        startIndex += chunkSize;
    }
    return chunks;
};



const cleanText = (text) => {
    let cleanedText = text;
    cleanedText = cleanedText.replace(
        /\b(a|an|the|in|on|at|to|for|of|with|by|from|up|about|into|over|after)\b/gi,
        ""
    );
    cleanedText = cleanedText.replace(/very|really|extremely|absolutely/gi, ""); 
    cleanedText = cleanedText.replace(/\s+/g, " ").trim();
    cleanedText = cleanedText.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ""); 
    cleanedText = cleanedText.replace(/\s*\n\s*/g, " ").trim();
    return cleanedText;
};

const createSummarizer = async (type, format, length) => {
    if (!window.ai?.summarizer) {
        throw new Error("AI Summarization is not supported");
    }
    return window.ai.summarizer.create({
        type,
        format,
        length,
    });
};

const generateSummary = async (inputText) => {
    console.log("Generating summary...");
    const summaryType = "key-points";
    const length = "short";
    const format = "markdown";
    const cleanedInput = cleanText(inputText);
    const chunks = splitIntoChunks(cleanedInput, MAX_CHUNK_SIZE);
    let cumulativeOutput = "";

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const summarizer = await createSummarizer(summaryType, format, length);
        const summary = await summarizer.summarize(chunk);
        summarizer.destroy();

        cumulativeOutput += `Chunk ${i + 1} Summary:\n${summary}\n\n---\n\n`;
    }
    console.log("Generated summary:", cumulativeOutput);
    return cumulativeOutput;
};

export { generateSummary, cleanText, splitIntoChunks };
