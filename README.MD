# BCA Currency Rate Scraper

A Node.js Discord bot that scrapes exchange rates directly from BCA.

## Features
* **Live Scraping:** Fetches data from the official BCA website using Axios and Cheerio.
* **Embed Display:** Clean and professional rate presentation.

## Prerequisites
* Node.js v16+
* Discord Bot Token
* **Message Content Intent** must be enabled in the Discord Developer Portal.

## Setup
1. **Install:** `npm install axios cheerio discord.js`
2. **Type:** Ensure `"type": "module"` is in your `package.json`.
3. **Run:** `node your-bot-file.js`

## Commands
* `infokurs`: Fetches and displays current USD rates.

## Understanding Rates
* **Buy Rate:** The price the bank pays to buy currency from you.
* **Sell Rate:** The price the bank charges to sell currency to you.

## To-Do
* [ ] Handling multiple channel_id
* [ ] Add other currencies function
