import { randomInt } from 'crypto'

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const DIGITS = '23456789'
const ALL = UPPER + LOWER + DIGITS

function pick(chars: string): string {
  return chars[randomInt(chars.length)]
}

/** Strong random password for admin-created accounts, guaranteed to mix case and digits. */
export function generatePassword(length = 14): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS)]
  const rest = Array.from({ length: length - required.length }, () => pick(ALL))
  const chars = [...required, ...rest]

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
