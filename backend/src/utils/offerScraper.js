import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * Fetch an offer page and return its visible text content.
 * Falls back to the raw URL string if fetching fails.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function scrapeOffer(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 10_000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MotivationLetterBot/1.0)',
      },
    })

    const $ = cheerio.load(html)

    // Remove noise
    $('script, style, nav, footer, header, iframe, noscript').remove()

    // Prefer main content containers
    const selectors = ['main', 'article', '[role="main"]', '.content', '#content', 'body']
    let text = ''
    for (const sel of selectors) {
      text = $(sel).text()
      if (text.trim().length > 200) break
    }

    // Collapse whitespace
    return text.replace(/\s+/g, ' ').trim().slice(0, 8000)
  } catch {
    // If we can't scrape, at least pass the URL so the LLM knows what it is
    return `Offer URL (could not fetch content): ${url}`
  }
}
