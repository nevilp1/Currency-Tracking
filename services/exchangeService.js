import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getBCARates() {
    const url = "https://www.bca.co.id/id/informasi/kurs";

    try {
        // 1. Fetch the page HTML
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 2. Load HTML into Cheerio
        const $ = cheerio.load(data);
        const rates = {};

        // 3. Iterate through table rows (tr)
        // Note: BCA uses specific classes; verify with 'Inspect Element' if this changes
        $('table.m-table-kurs tr').each((index, element) => {
            const cols = $(element).find('td');

            if (cols.length >= 3) {
                const currency = $(cols[0]).text().trim();
                const buy = $(cols[1]).text().trim();
                const sell = $(cols[2]).text().trim();

                rates[currency] = { buy, sell };
            }
        });

        return rates;
    } catch (error) {
        console.error("Error scraping BCA:", error);
        return null;
    }
}