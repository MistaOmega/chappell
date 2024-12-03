async function getBookTitleByISBN(isbn) {
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${process.env.GOOGLE_BOOKS_API_KEY}`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const book = data.items[0].volumeInfo;
            return {
                title: book.title || 'Unknown Book',
                coverUrl: book.imageLinks ? book.imageLinks.thumbnail : null
            };
        }
        return { title: 'Unknown Book', coverUrl: null };
    } catch (error) {
        console.error('Error fetching book title:', error);
        return { title: 'Unknown Book', coverUrl: null };
    }
}

module.exports = { getBookTitleByISBN };