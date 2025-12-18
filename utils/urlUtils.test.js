const { validateURL, cleanInstagramURL, extractAndCleanInstagramURLs } = require('./urlUtils');
const {describe, test, expect} = require("@jest/globals");

describe('validateURL', () => {
    test('validates a correct http URL', () => {
        expect(validateURL('http://example.com')).toBe(true);
    });

    test('validates a correct https URL', () => {
        expect(validateURL('https://example.com')).toBe(true);
    });

    test('invalidates a URL with an invalid protocol', () => {
        expect(validateURL('ftp://example.com')).toBe(false);
    });

    test('invalidates a URL with invalid characters in the hostname', () => {
        expect(validateURL('http://exa$mple.com')).toBe(false);
    });

    test('invalidates a URL with strange Unicode characters', () => {
        expect(validateURL('http://example.com/☃')).toBe(false);
    });

    test('validates a URL with subdomains', () => {
        expect(validateURL('http://sub.example.com')).toBe(true);
    });

    test('validates a URL with a port number', () => {
        expect(validateURL('http://example.com:8080')).toBe(true);
    });

    test('invalidates a URL with spaces', () => {
        expect(validateURL('http://example .com')).toBe(false);
    });
});

describe('cleanInstagramURL', () => {
    test('removes igsh parameter from Instagram reel URL', () => {
        const result = cleanInstagramURL('https://www.instagram.com/reel/DRNZYNRDLrW/?igsh=MTc0cWl5bWViaGU0cg==');
        expect(result.cleaned).toBe('https://www.instagram.com/reel/DRNZYNRDLrW/');
        expect(result.wasModified).toBe(true);
    });

    test('removes igsh parameter from Instagram post URL', () => {
        const result = cleanInstagramURL('https://instagram.com/p/ABC123/?igsh=somehash');
        expect(result.cleaned).toBe('https://instagram.com/p/ABC123/');
        expect(result.wasModified).toBe(true);
    });

    test('does not modify Instagram URL without igsh parameter', () => {
        const url = 'https://www.instagram.com/reel/DRNZYNRDLrW/';
        const result = cleanInstagramURL(url);
        expect(result.cleaned).toBe(url);
        expect(result.wasModified).toBe(false);
    });

    test('does not modify non-Instagram URLs', () => {
        const url = 'https://www.youtube.com/watch?v=abc123&igsh=test';
        const result = cleanInstagramURL(url);
        expect(result.cleaned).toBe(url);
        expect(result.wasModified).toBe(false);
    });

    test('handles Instagram URL with multiple parameters', () => {
        const result = cleanInstagramURL('https://www.instagram.com/reel/ABC/?utm_source=test&igsh=hash123&other=param');
        expect(result.cleaned).toBe('https://www.instagram.com/reel/ABC/?utm_source=test&other=param');
        expect(result.wasModified).toBe(true);
    });
});

describe('extractAndCleanInstagramURLs', () => {
    test('extracts and cleans Instagram URL from message', () => {
        const message = 'Check out this reel! https://www.instagram.com/reel/DRNZYNRDLrW/?igsh=MTc0cWl5bWViaGU0cg==';
        const results = extractAndCleanInstagramURLs(message);
        expect(results).toHaveLength(1);
        expect(results[0].original).toBe('https://www.instagram.com/reel/DRNZYNRDLrW/?igsh=MTc0cWl5bWViaGU0cg==');
        expect(results[0].cleaned).toBe('https://www.instagram.com/reel/DRNZYNRDLrW/');
        expect(results[0].wasModified).toBe(true);
    });

    test('extracts multiple Instagram URLs from message', () => {
        const message = 'Check these out: https://instagram.com/reel/ABC/?igsh=test1 and https://www.instagram.com/p/XYZ/?igsh=test2';
        const results = extractAndCleanInstagramURLs(message);
        expect(results).toHaveLength(2);
    });

    test('returns empty array when no Instagram URLs found', () => {
        const message = 'Check out this video! https://www.youtube.com/watch?v=abc123';
        const results = extractAndCleanInstagramURLs(message);
        expect(results).toHaveLength(0);
    });

    test('returns empty array when Instagram URLs have no igsh parameter', () => {
        const message = 'Check this out: https://www.instagram.com/reel/DRNZYNRDLrW/';
        const results = extractAndCleanInstagramURLs(message);
        expect(results).toHaveLength(0);
    });

    test('handles message with mixed URLs', () => {
        const message = 'Instagram: https://www.instagram.com/reel/ABC/?igsh=test YouTube: https://youtube.com/watch?v=123';
        const results = extractAndCleanInstagramURLs(message);
        expect(results).toHaveLength(1);
        expect(results[0].original).toContain('instagram.com');
    });
});