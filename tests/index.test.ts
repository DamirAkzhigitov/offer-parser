import {
  analyzeMessageWithOpenAI,
  doesItemMeetCriteria,
  ParsedItem
} from '../index'
import * as dotenv from 'dotenv'

// Load environment variables to use the real OpenRouter API key
dotenv.config()

describe('analyzeMessageWithOpenAI', () => {
  // Test case 1: Standard English message
  test('should parse a standard English message correctly', async () => {
    const message =
      'For sale: lightly used IKEA sofa. Price is 250 EUR. Pickup in Berlin.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item_name).toContain('IKEA sofa')
    expect(result?.price).toBe(250)
    expect(result?.location?.toLowerCase()).toBe('berlin')
    expect(result?.is_free).toBe(false)
    expect(result?.category).toBe('furniture')
  })

  // Test case 2: English message for a free item
  test('should handle free items in English', async () => {
    const message =
      'Giving away a baby crib for free. Must pick up from London.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item_name).toContain('baby crib')
    expect(result?.price).toBe(0)
    expect(result?.location?.toLowerCase()).toBe('london')
    expect(result?.is_free).toBe(true)
    expect(result?.category).toBe('furniture')
  })

  // Test case 3: Standard Russian message
  test('should parse a standard Russian message correctly', async () => {
    const message =
      'Продам холодильник Indesit в хорошем состоянии. Цена 5000 рублей. Самовывоз, Москва.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item_name).toMatch(/холодильник/i)
    expect(result?.price).toBe(5000)
    expect(result?.location?.toLowerCase()).toBe('москва')
    expect(result?.is_free).toBe(false)
  })

  // Test case 4: Russian message for a free item
  test('should handle free items in Russian', async () => {
    const message =
      'Отдам даром котенка, 2 месяца. Очень ласковый. Новосибирск.'
    const result = await analyzeMessageWithOpenAI(message)
    expect(result).not.toBeNull()
    expect(result?.item_name).toMatch(/котенкок/i)
    expect(result?.price).toBe(0)
    expect(result?.location?.toLowerCase()).toBe('новосибирск')
    expect(result?.is_free).toBe(true)
    expect(result?.category).toBe('other')
  })
})

describe('doesItemMeetCriteria', () => {
  test('should return true for an item that meets all criteria', () => {
    const item: ParsedItem = {
      item_name: 'Old TV Stand',
      category: 'furniture',
      price: 20,
      location: 'Limassol, near the marina',
      is_free: false
    }
    expect(doesItemMeetCriteria(item)).toBe(true)
  })

  test('should return true for a free item that meets other criteria', () => {
    const item: ParsedItem = {
      item_name: 'тумбочка под телевизор',
      category: 'furniture',
      price: 0,
      location: 'Лимассол',
      is_free: true
    }
    expect(doesItemMeetCriteria(item)).toBe(true)
  })

  test('should return false if the price is too high', () => {
    const item: ParsedItem = {
      item_name: 'TV Stand',
      category: 'furniture',
      price: 50,
      location: 'Limassol',
      is_free: false
    }
    expect(doesItemMeetCriteria(item)).toBe(false)
  })

  test('should return false if the category is wrong', () => {
    const item: ParsedItem = {
      item_name: 'TV Stand',
      category: 'electronics',
      price: 10,
      location: 'Limassol',
      is_free: false
    }
    expect(doesItemMeetCriteria(item)).toBe(false)
  })

  test('should return false if the location is wrong', () => {
    const item: ParsedItem = {
      item_name: 'TV Stand',
      category: 'furniture',
      price: 10,
      location: 'Nicosia',
      is_free: false
    }
    expect(doesItemMeetCriteria(item)).toBe(false)
  })

  test('should return false if the item name is wrong', () => {
    const item: ParsedItem = {
      item_name: 'Coffee Table',
      category: 'furniture',
      price: 10,
      location: 'Limassol',
      is_free: false
    }
    expect(doesItemMeetCriteria(item)).toBe(false)
  })
})
