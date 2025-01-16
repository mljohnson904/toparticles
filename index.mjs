//importing chorme extension from playwright to read webpage
import { chromium } from 'playwright';

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

(async () => {
    try {
        console.log('Launching Chromium...');
        
        // Launch browser and create page context
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Go to the Hacker News "newest" page
        await page.goto('https://news.ycombinator.com/newest', { timeout: 60000 });
        
        // Wait for the articles to load
        await page.waitForSelector('.athing', { timeout: 20000 });

        console.log('Page loaded, extracting articles...');
        
        // Initialize an array to store articles
        let allArticles = [];
        
        // Loop to scroll and load articles until we have 100 articles
        let pageNum = 1;
        while (allArticles.length < 100) {
            console.log(`Loading page ${pageNum}...`);
            
            // Extract articles from the current page
            const articles = await page.$$eval('.athing', (elements) => {
                return elements.map(article => {
                    const titleElement = article.querySelector('.titleline > a');
                    const title = titleElement ? titleElement.innerText : 'No title';
                    // Extract the relative time
                    const timeElement = article.querySelector('.age');
                    const time = timeElement ? timeElement.innerText : 'No time';
                    return { title, time };
                });
            });

            // Add the articles to the list
            allArticles = allArticles.concat(articles);

            // Stop if we have enough articles
            if (allArticles.length >= 100) {
                break;
            }

            // If we haven't reached 100 articles, scroll to load more
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight); // Scroll down
            });
            await page.waitForTimeout(3000); // Wait for new articles to load
            pageNum++;
        }

        console.log('Articles extracted:', allArticles.length);

        // Helper function to parse relative time
        function parseRelativeTime(timeStr) {
            const now = Date.now();
            const match = timeStr.match(/(\d+)\s(\w+)\sago/);

            if (match) {
                const value = parseInt(match[1], 10);
                const unit = match[2];

                switch (unit) {
                    case 'minute':
                    case 'minutes':
                        return new Date(now - value * 60 * 1000);
                    case 'hour':
                    case 'hours':
                        return new Date(now - value * 60 * 60 * 1000);
                    case 'day':
                    case 'days':
                        return new Date(now - value * 24 * 60 * 60 * 1000);
                    case 'week':
                    case 'weeks':
                        return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
                    case 'month':
                    case 'months':
                        return new Date(now - value * 30 * 24 * 60 * 60 * 1000);
                    case 'year':
                    case 'years':
                        return new Date(now - value * 365 * 24 * 60 * 60 * 1000);
                    default:
                        return new Date(0); // Default to Unix epoch if we don't understand the time
                }
            }
            return new Date(0); // Default to Unix epoch if format is unexpected
        }

        // Process articles with missing or incorrect time
        allArticles.forEach((article, index) => {
            if (article.time === 'No time') {
                article.time = new Date(0); // Set a default date for articles without time
            } else {
                article.time = parseRelativeTime(article.time); // Convert relative time to Date object
            }
        });

        // Sort articles by time (newest first)
        const sortedArticles = allArticles.sort((a, b) => b.time - a.time);

        // Output the sorted titles without the time
        console.log('Sorted Articles (Newest to Oldest):');
        sortedArticles.slice(0, 100).forEach((article, index) => {
            console.log(`${index + 1}. ${article.title}`);
        });

        // Close the browser
        await browser.close();
        console.log('Browser closed.');
    } catch (error) {
        console.error('Error during script execution:', error);
    }
})();
