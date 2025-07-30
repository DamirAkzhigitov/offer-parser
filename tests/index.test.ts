import { analyzeMessageWithOpenAI } from '../index'
import * as dotenv from 'dotenv'

// Load environment variables to use the real OpenAI API key
dotenv.config()

describe('analyzeMessageWithOpenAI', () => {
  // Test case 1: Standard English message
  test('should parse a standard English message correctly', async () => {
    const message =
      'For sale: lightly used IKEA sofa. Price is 250 EUR. Pickup in Berlin.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toContain('IKEA sofa')
    expect(result?.price).toBe(250)
    expect(result?.location?.toLowerCase()).toBe('berlin')
  })

  // Test case 2: English message for a free item
  test('should handle free items in English', async () => {
    const message =
      'Giving away a baby crib for free. Must pick up from London.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toContain('baby crib')
    expect(result?.price).toBe(0)
    expect(result?.location?.toLowerCase()).toBe('london')
  })

  // Test case 3: English message with missing location
  test('should handle messages with missing location in English', async () => {
    const message = 'Selling my old bicycle for $100.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toContain('bicycle')
    expect(result?.price).toBe(100)
    expect(result?.location).toBeNull()
  })

  // Test case 4: Standard Russian message
  test('should parse a standard Russian message correctly', async () => {
    const message =
      'Продам холодильник Indesit в хорошем состоянии. Цена 5000 рублей. Самовывоз, Москва.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toMatch(/холодильник/i)
    expect(result?.price).toBe(5000)
    expect(result?.location?.toLowerCase()).toBe('москва')
  })

  // Test case 5: Russian message with a negotiable price
  test('should handle negotiable prices in Russian', async () => {
    const message =
      'Продаю детскую коляску. Состояние отличное. Цена договорная. Забирать в Санкт-Петербурге.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toMatch(/коляска/i)
    expect(typeof result?.price).toBe('string')
    expect(result?.price).toMatch(/договорная/i)
    expect(result?.location?.toLowerCase()).toBe('санкт-петербург')
  })

  // Test case 6: Russian message for a free item
  test('should handle free items in Russian', async () => {
    const message =
      'Отдам даром котенка, 2 месяца. Очень ласковый. Новосибирск.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toMatch(/котенка/i)
    expect(result?.price).toBe(0)
    expect(result?.location?.toLowerCase()).toBe('новосибирск')
  })

  // Test case 7: Empty or whitespace message
  test('should return null for an empty message', async () => {
    const message = ' '
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).toBeNull()
  })

  // Test case 8: Message without a clear item for sale
  test('should return nulls for a conversational message', async () => {
    const message = 'Has anyone seen a good deal on TVs recently?'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item).toBeNull()
    expect(result?.price).toBeNull()
    expect(result?.location).toBeNull()
  })
})
