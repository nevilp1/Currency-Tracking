import axios from 'axios';
import * as cheerio from 'cheerio';

export async function getBCARates() {
    const url = "https://www.bca.co.id/id/informasi/kurs";

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const $ = cheerio.load(data);
        const rawRates = {};

        // 1. Scrape the data
        $('table.m-table-kurs').first().find('tbody tr').each((index, element) => {
            const cols = $(element).find('td');

            if (cols.length >= 3) {
                // Extract currency and remove any invisible characters or numbers
                let currency = $(cols[0]).text().trim().toUpperCase();
                currency = currency.replace(/[^A-Z]/g, ''); // Keeps ONLY letters (e.g., USD, SGD)

                const buy = $(cols[1]).text().trim();
                const sell = $(cols[2]).text().trim();

                // Skip the table header if it accidentally gets picked up
                if (currency === 'MATAUANG' || currency === 'CURRENCY' || currency === '') {
                    return; // Skip this loop iteration
                }

                rawRates[currency] = { buy, sell };
            }
        });

        // 2. Re-order the object so JPY comes after USD
        const orderedRates = {};

        // Insert USD first
        if (rawRates['USD']) {
            orderedRates['USD'] = rawRates['USD'];
        }

        // Insert JPY second
        if (rawRates['JPY']) {
            orderedRates['JPY'] = rawRates['JPY'];
        }

        // Insert the rest of the currencies
        for (const currency in rawRates) {
            // Check to ensure we don't duplicate USD or JPY
            if (currency !== 'USD' && currency !== 'JPY') {
                orderedRates[currency] = rawRates[currency];
            }
        }

        return orderedRates;

    } catch (error) {
        console.error("Error scraping BCA:", error);
        return null;
    }
}