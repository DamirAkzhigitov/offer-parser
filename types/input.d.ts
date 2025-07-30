/**
 * Custom type declarations for the 'input' module, which lacks its own types.
 * This file provides TypeScript with the necessary type information for the module,
 * resolving the "implicitly has an 'any' type" error.
 */

declare module 'input' {
  interface IInput {
    /**
     * Prompts the user for text input.
     * @param question The question or prompt to display to the user.
     * @returns A promise that resolves to the user's string input.
     */
    text(question?: string): Promise<string>

    /**
     * Prompts the user for a password, hiding the input.
     * @param question The question or prompt to display to the user.
     * @returns A promise that resolves to the user's string input.
     */
    password(question?: string): Promise<string>

    /**
     * Prompts the user for a yes/no confirmation.
     * @param question The question or prompt to display to the user.
     * @returns A promise that resolves to a boolean value.
     */
    confirm(question?: string): Promise<boolean>
  }

  const input: IInput
  export default input
}
