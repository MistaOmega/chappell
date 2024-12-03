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

module.exports = { validateURL };