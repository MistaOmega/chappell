async function getGameIdByTitle(title) {
    try {
        const response = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&key=${process.env.RAWG_API_KEY}`);
        const data = await response.json();
        return data.results.length > 0 ? data.results[0].id : null;
    } catch (error) {
        console.error('Error fetching game ID:', error);
        return null;
    }
}

module.exports = {getGameIdByTitle };