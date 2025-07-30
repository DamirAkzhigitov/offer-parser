import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { NewMessage, NewMessageEvent } from 'telegram/events'
import { Api } from 'telegram/tl'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import input from 'input'

// Load environment variables from .env file
dotenv.config()

// --- Configuration ---
const apiId = parseInt(process.env.API_ID || '')
const apiHash = process.env.API_HASH || ''
const session = new StringSession(process.env.SESSION || '')
const chatIds = (process.env.CHAT_IDS || '')
  .split(',')
  .map((id) => BigInt(id.trim()))
const ignoreUserId = BigInt(process.env.IGNORE_USER_ID || '0')
const openrouterApiKey = process.env.OPENAI_API_KEY || ''
const reservationMessage =
  process.env.RESERVATION_MESSAGE ||
  "Hello, I'm interested in this item and would like to reserve it."

// --- OpenAI Client Initialization (using OpenRouter) ---
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: openrouterApiKey
})

// --- Type Definition for Parsed Data ---
export interface ParsedItem {
  item_name: string | null
  category: 'furniture' | 'electronics' | 'clothing' | 'other' | null
  price: number | string | null
  location: string | null
  is_free: boolean
}

// --- JSON Schema for OpenAI response ---
const itemSchema = {
  name: 'item_details',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      item_name: {
        type: 'string',
        description:
          'The specific name of the item being offered (e.g., "IKEA Sofa", "TV Stand").'
      },
      category: {
        type: 'string',
        description: 'The category of the item.',
        enum: ['furniture', 'electronics', 'clothing', 'other']
      },
      price: {
        type: ['number', 'string'],
        description:
          'The price of the item. Should be a number if explicit. If negotiable or not specified, can be a string like "negotiable" or null.'
      },
      location: {
        type: 'string',
        description:
          'The city, district, or general location for pickup/delivery.'
      },
      is_free: {
        type: 'boolean',
        description:
          'Set to true if the item is explicitly offered for free or "даром", otherwise false.'
      }
    },
    required: ['item_name', 'category', 'price', 'location', 'is_free'],
    additionalProperties: false
  }
}

/**
 * Function V: Processes a message to extract structured data using OpenAI.
 * @param messageText The text content of the Telegram message.
 * @returns A promise that resolves to a ParsedItem object or null if parsing fails.
 */
export async function analyzeMessageWithOpenAI(
  messageText: string
): Promise<ParsedItem | null> {
  if (!messageText || !messageText.trim()) {
    console.log('Message is empty, skipping analysis.')
    return null
  }

  const prompt = `
        Analyze the following message and extract the details of the item being offered according to the provided JSON schema.
        - The category should be one of the enum values.
        - If the price is "free", "отдам даром", or similar, the 'is_free' flag must be true and the price should be 0.
        
        Message: "${messageText}"
    `

  try {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert assistant that extracts information and provides it in a structured JSON format based on the provided schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        // @ts-ignore - The OpenAI library may not have up-to-date types for this experimental feature
        json_schema: itemSchema
      },
      temperature: 0.1
    })

    const result = response.choices[0]?.message?.content
    if (result) {
      console.log('OpenAI Raw Response:', result)
      const parsedData: ParsedItem = JSON.parse(result)
      return parsedData
    }
    return null
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    return null
  }
}

/**
 * Checks if an item meets the specified criteria for sending a reservation message.
 * @param item The parsed item data.
 * @returns True if the item meets the criteria, false otherwise.
 */
export function doesItemMeetCriteria(item: ParsedItem): boolean {
  const { item_name, category, price, location } = item

  // Price check: less than 40 or free
  const priceIsRight = (typeof price === 'number' && price < 40) || item.is_free

  // Category check
  const categoryIsRight = category === 'furniture'

  // Location check (case-insensitive)
  const locationIsRight =
    location?.toLowerCase().includes('limassol') ||
    location?.toLowerCase().includes('лимассол')

  // Item name check (case-insensitive)
  const nameIsRight =
    item_name &&
    (item_name.toLowerCase().includes('tv stand') ||
      item_name.toLowerCase().includes('тумбочка') ||
      item_name.toLowerCase().includes('телевизор'))

  return Boolean(
    priceIsRight && categoryIsRight && locationIsRight && nameIsRight
  )
}

/**
 * Sends a private message to a user.
 * @param client The TelegramClient instance.
 * @param userId The ID of the user to send the message to.
 * @param message The message to send.
 */
async function sendReservationMessage(
  client: TelegramClient,
  userId: any,
  message: string
) {
  try {
    const entity = await client.getEntity(userId)
    console.log(`Sending reservation message to user ${userId}...`)
    await client.sendMessage(entity, { message })
    console.log('Reservation message sent successfully.')
  } catch (error) {
    console.error(`Failed to send message to user ${userId}:`, error)
  }
}

/**
 * Main function to initialize the Telegram client and start listening for messages.
 */
async function main() {
  if (!apiId || !apiHash || !openrouterApiKey) {
    console.error(
      'Essential environment variables (API_ID, API_HASH, OPENROUTER_API_KEY) are missing. Exiting.'
    )
    return
  }

  console.log('Initializing Telegram client...')
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5
  })

  await client.start({
    phoneNumber: async () => await input.text('Please enter your number: '),
    password: async () => await input.text('Please enter your password: '),
    phoneCode: async () =>
      await input.text('Please enter the code you received: '),
    onError: (err) => console.log(err)
  })

  console.log('You should now be connected.')
  if (!process.env.SESSION) {
    console.log(
      'Save this session string to your .env file to avoid logging in again:'
    )
    console.log(client.session.save())
  }

  console.log(`Listening for messages in chats: ${chatIds.join(', ')}`)

  async function messageHandler(event: NewMessageEvent) {
    const message = event.message

    if (!message.peerId) return

    let chatId: bigint
    if (message.peerId instanceof Api.PeerChannel) {
      chatId = BigInt('-100' + message.peerId.channelId.toString())
    } else if (message.peerId instanceof Api.PeerChat) {
      chatId = BigInt('-' + message.peerId.chatId.toString())
    } else if (message.peerId instanceof Api.PeerUser) {
      chatId = BigInt(message.peerId.userId.toString())
    } else {
      return
    }

    if (!chatIds.includes(chatId)) return

    const senderId = message.senderId
      ? BigInt(message.senderId.toString())
      : null
    if (!senderId) return

    console.log(`New message from user ${senderId} in chat ${chatId}`)

    if (senderId === ignoreUserId) {
      console.log(`Ignoring message from user ${ignoreUserId}.`)
      return
    }

    const parsedData = await analyzeMessageWithOpenAI(message.text)

    if (parsedData) {
      console.log('--- Parsed Item Log ---')
      console.log(`Item Name: ${parsedData.item_name}`)
      console.log(`Category: ${parsedData.category}`)
      console.log(`Price: ${parsedData.price}`)
      console.log(`Location: ${parsedData.location}`)
      console.log(`Is Free: ${parsedData.is_free}`)
      console.log('-----------------------')

      // Check if the item meets the criteria and send a message
      if (doesItemMeetCriteria(parsedData)) {
        console.log('Item meets reservation criteria!')
        await sendReservationMessage(client, senderId, reservationMessage)
      }
    } else {
      console.log('Could not parse data from the message.')
    }
  }

  client.addEventHandler(messageHandler, new NewMessage({}))
}

if (require.main === module) {
  main().catch((error) => {
    console.error('An unexpected error occurred:', error)
  })
}
