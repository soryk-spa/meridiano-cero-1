/** Curated catalog of the study-tour destinations Meridiano Cero actually sells (meridianocero.cl). */
export const KNOWN_DESTINATIONS = [
  {
    id: 'bariloche',
    label: 'Bariloche, Argentina',
    lat: -41.1335,
    lng: -71.3103,
  },
  {
    id: 'camboriu',
    label: 'Camboriú, Brasil',
    lat: -26.9906,
    lng: -48.6349,
  },
  {
    id: 'sur-de-chile',
    label: 'Sur de Chile (Pucón)',
    lat: -39.2828,
    lng: -71.975,
  },
  {
    id: 'isla-de-pascua',
    label: 'Isla de Pascua, Chile',
    lat: -27.1502,
    lng: -109.426,
  },
] as const

export type KnownDestinationId = (typeof KNOWN_DESTINATIONS)[number]['id']
