// Category classification using Claude Haiku via Anthropic SDK.

import Anthropic from '@anthropic-ai/sdk'
import type { Category } from './plants'

const VALID_CATEGORIES: Category[] = ['people', 'health', 'work', 'moments', 'nature', 'learning', 'default']

const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL,
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

/**
 * Classify a gratitude entry into one of the 7 categories.
 * Falls back to 'default' on any error.
 */
export async function classifyEntry(body: string): Promise<Category> {
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      system: `You are a gratitude journal categorizer. Given a short gratitude entry, respond with exactly one word from this list: people, health, work, moments, nature, learning, default. No punctuation, no explanation.`,
      messages: [{ role: 'user', content: body.slice(0, 500) }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim().toLowerCase()
    const category = VALID_CATEGORIES.find((c) => c === raw)
    return category ?? 'default'
  } catch (err) {
    console.error('[classify] Claude Haiku error, falling back to default:', err)
    return 'default'
  }
}
