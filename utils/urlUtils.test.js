const { validateURL } = require('./urlUtils');
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