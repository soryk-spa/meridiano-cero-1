const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Random access code, avoiding visually ambiguous characters (I, O, 0, 1). */
export function generateAccessCode(length = 6): string {
  return Array.from({ length }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}
