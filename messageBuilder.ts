import { ParsedItem } from './index'
import OpenAI from 'openai'

/**
 * Uses OpenAI to build a unique, human-style reservation message in Russian.
 * @param item The parsed item data.
 * @param openai The OpenAI client instance.
 * @returns A promise that resolves to a unique, formatted string to be sent to the seller.
 */
export async function buildReservationMessage(
  item: ParsedItem,
  openai: OpenAI
): Promise<string> {
  const details = []

  // Add the item name if it exists
  if (item.item_name) {
    details.push(`"${item.item_name}"`)
  }

  // Add price details
  if (item.is_free) {
    details.push('for free')
  } else if (typeof item.price === 'number') {
    details.push(`for ${item.price}`)
  }

  // Add location if it exists
  if (item.location) {
    details.push(`in ${item.location}`)
  }

  // Join the details into a single string
  const detailsString = details.join(' ')

  const prompt = `
        Generate a short, simple, and friendly message in Russian to inquire about an item for sale.
        The user wants to reserve the item.
        The message should sound like a real person wrote it, not a bot.
        Vary the phrasing each time.

        Here are the item details: ${detailsString}

        Examples of possible messages:
        - "Привет! Ваше объявление про ${detailsString} еще актуально?"
        - "Добрый день, увидел ваше объявление (${detailsString}). Хотел бы забрать, если еще не отдали."
        - "Здравствуйте, еще продаете ${detailsString}? Готов забрать."
        - "Привет, заинтересовало ваше объявление (${detailsString}). Оно в силе?"

        Generate a new, similar message:
    `

  try {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    })

    const generatedMessage = response.choices[0]?.message?.content?.trim()

    if (generatedMessage) {
      return generatedMessage
    }
  } catch (error) {
    console.error(
      'Failed to generate reservation message with OpenAI, falling back to default.',
      error
    )
  }

  // Fallback message in case the API call fails
  return `Привет, увидел твое объявление (${detailsString}), все еще актуально? Готов забрать.`
}
