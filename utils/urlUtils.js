const url = require('url');

function validateURL(inputURL) {
    try {
        const parsedURL = new URL(inputURL);
        const hostname = parsedURL.hostname;

        // Check if the hostname contains only valid characters
        if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) {
            return false;
        }

        // Check if the URL uses a valid protocol
        if (!['http:', 'https:'].includes(parsedURL.protocol)) {
            return false;
        }

        // Check for any strange Unicode characters
        return !/[^\x00-\x7F]/.test(inputURL);


    } catch (e) {
        return false;
    }
}

/**
 * Cleans Instagram URLs by removing tracking parameters
 * @param {string} inputURL - The Instagram URL to clean
 * @returns {Object} - Object with cleaned URL and whether it was modified
 */
function cleanInstagramURL(inputURL) {
    try {
        const parsedURL = new URL(inputURL);

        // Check if it's an Instagram URL
        if (!parsedURL.hostname.includes('instagram.com')) {
            return { cleaned: inputURL, wasModified: false };
        }

        // Check if it has the igsh parameter
        if (!parsedURL.searchParams.has('igsh')) {
            return { cleaned: inputURL, wasModified: false };
        }

        // Remove the igsh parameter
        parsedURL.searchParams.delete('igsh');

        // Return the cleaned URL
        return {
            cleaned: parsedURL.toString(),
            wasModified: true
        };

    } catch (e) {
        // If URL parsing fails, return original
        return { cleaned: inputURL, wasModified: false };
    }
}

/**
 * Extracts and cleans Instagram URLs from a message
 * @param {string} message - The message to search for Instagram URLs
 * @returns {Array} - Array of objects with original and cleaned URLs
 */
function extractAndCleanInstagramURLs(message) {
    // Regex to find Instagram URLs
    const instagramURLRegex = /https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/gi;
    const matches = message.match(instagramURLRegex);

    if (!matches) return [];

    return matches
        .map(url => {
            const result = cleanInstagramURL(url);
            return {
                original: url,
                cleaned: result.cleaned,
                wasModified: result.wasModified
            };
        })
        .filter(result => result.wasModified);
}

module.exports = { validateURL, cleanInstagramURL, extractAndCleanInstagramURLs };