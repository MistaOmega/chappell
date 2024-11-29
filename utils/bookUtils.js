async function getBookTitleByISBN(isbn) {
    try {
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
        const data = await response.json();
        return data[`ISBN:${isbn}`]?.title || isbn;
    } catch (error) {
        console.error('Error fetching book title:', error);
        return isbn;
    }
}

module.exports = { getBookTitleByISBN };