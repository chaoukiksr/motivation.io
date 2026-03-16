import axios from 'axios'
import * as cheerio from 'cheerio'
import { cacheGet, cacheSet } from './cache.js'

/** 7 days — offer pages are stable; re-scraping wastes network + risks rate-limiting */
const OFFER_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Fetch an offer page and return its visible text content.
 * Results are cached for 7 days keyed by URL.
 * Falls back to the raw URL string if fetching fails.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function scrapeOffer(url) {
  const cacheKey = `offer:${url}`
  const cached   = cacheGet(cacheKey)

  if (cached !== undefined) {
    console.log(`[cache] HIT  scrapeOffer → ${url}`)
    return { text: cached, fromCache: true }
  }

  console.log(`[cache] MISS scrapeOffer → ${url}`)

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
    const result = text.replace(/\s+/g, ' ').trim().slice(0, 8000)
    cacheSet(cacheKey, result, OFFER_TTL_MS)
    return { text: result, fromCache: false }
  } catch {
    // If we can't scrape, at least pass the URL so the LLM knows what it is
    const fallback = `Offer URL (could not fetch content): ${url}`
    // Cache the fallback too — retrying a broken URL every request is wasteful.
    // TTL is shorter (1 hour) so a temporarily unavailable page gets retried later.
    cacheSet(cacheKey, fallback, 60 * 60 * 1000)
    return { text: fallback, fromCache: false }
  }
}
