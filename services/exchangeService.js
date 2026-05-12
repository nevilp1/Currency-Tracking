import axios from 'axios';

export async function getUsdToIdr() {

    const result = {
        exchangeRateApi: null,
        currencyFreaks: null
    };

    // ExchangeRate API
    try {

        const exchangeRateResponse = await axios.get(
            `${process.env.EXCHANGE_RATE_BASE_URL}/${process.env.EXCHANGE_API_KEY}/latest/USD`
        );

        result.exchangeRateApi =
            exchangeRateResponse.data.conversion_rates.IDR;

    } catch (error) {

        console.error(
            'ExchangeRate API Error:',
            error.message
        );
    }

    // CurrencyFreaks API
    try {

        const currencyFreaksResponse = await axios.get(
            `${process.env.CURRENCY_FREAK_BASE_URL}/v2.0/rates/latest`,
            {
                params: {
                    apikey: process.env.CURRENCY_FREAK_API_KEY,
                    symbols: 'IDR'
                }
            }
        );

        result.currencyFreaks = Number(
            currencyFreaksResponse.data.rates.IDR
        );

    } catch (error) {

        console.error(
            'CurrencyFreaks API Error:',
            error.message
        );
    }

    return result;
}