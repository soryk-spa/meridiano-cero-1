import { createClerkClient } from '@clerk/backend'
import { PrismaClient, Role, TripStatus, ItineraryStatus, AnnouncementType } from '@prisma/client'

const prisma = new PrismaClient()
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

function daysFromToday(days: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

async function findClerkUserId(email: string): Promise<string | null> {
  try {
    const user = (await clerk.users.getUserList({ emailAddress: [email] })).data[0]
    return user?.id ?? null
  } catch {
    return null
  }
}

type DayEntry = {
  time: string
  title: string
  location: string
  description: string
  requirementsMessage?: string | null
}

type SeedItineraryItem = DayEntry & {
  dayNumber: number
  status: ItineraryStatus
  order: number
  requirementsMessage: string | null
}

/**
 * Builds a multi-day itinerary from a per-day content generator, deriving each
 * item's status from where `currentDay` sits relative to the trip's timeline —
 * so seeded trips actually exercise the day-by-day grid (Organizador) instead
 * of dumping every item on day 1.
 */
function buildItinerary(totalDays: number, currentDay: number, dayContent: (day: number) => DayEntry[]): SeedItineraryItem[] {
  const items: SeedItineraryItem[] = []
  let order = 1
  for (let day = 1; day <= totalDays; day++) {
    dayContent(day).forEach((entry, idx) => {
      const status =
        day < currentDay
          ? ItineraryStatus.COMPLETED
          : day > currentDay
            ? ItineraryStatus.PENDING
            : idx === 0
              ? ItineraryStatus.IN_PROGRESS
              : ItineraryStatus.PENDING
      items.push({ ...entry, requirementsMessage: entry.requirementsMessage ?? null, dayNumber: day, status, order: order++ })
    })
  }
  return items
}

/** Creates a Program mirroring the given itinerary, so every seed trip is traceable to a program. */
async function createProgramFor(name: string, description: string, itinerary: SeedItineraryItem[]) {
  return prisma.program.create({
    data: {
      name,
      description,
      items: {
        create: itinerary.map((item) => ({
          dayNumber: item.dayNumber,
          time: item.time,
          title: item.title,
          location: item.location,
          description: item.description,
          requirementsMessage: item.requirementsMessage,
          order: item.order,
        })),
      },
    },
  })
}

async function main() {
  await prisma.locationPing.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.itineraryItem.deleteMany()
  await prisma.tripLeg.deleteMany()
  await prisma.tripMembership.deleteMany()
  await prisma.accessCode.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.program.deleteMany()
  await prisma.school.deleteMany()

  const schools = await Promise.all([
    prisma.school.create({ data: { name: 'Colegio San Martín de Tours' } }),
    prisma.school.create({ data: { name: 'Colegio Santa Teresa de los Andes' } }),
    prisma.school.create({ data: { name: 'Colegio Inglés de Talca' } }),
    prisma.school.create({ data: { name: 'Colegio Los Andes' } }),
    prisma.school.create({ data: { name: 'Colegio Sagrados Corazones' } }),
  ])
  const [sanMartin, santaTeresa, ingles, losAndes, sagradosCorazones] = schools

  const monitorId = await findClerkUserId('franciscomuniozs+monitor@gmail.com')
  const parentId = await findClerkUserId('franciscomuniozs+apoderado@gmail.com')
  if (!monitorId) console.warn('No se encontró la cuenta de monitor de prueba en Clerk — las giras quedarán sin monitor asignado.')

  // ---------------------------------------------------------------------------
  // Gira A — multi-destino (TripLeg), en curso, cruza "hoy": prueba giras que
  // empiezan en el sur de Chile y terminan en Bariloche, y el grid de 10 días.
  // ---------------------------------------------------------------------------
  const surBarilocheName = '4° Medio B – Sur de Chile y Bariloche 2026'
  const surBarilocheTotalDays = 10
  const surBarilocheCurrentDay = 5
  const surBarilocheItinerary = buildItinerary(surBarilocheTotalDays, surBarilocheCurrentDay, (day) => {
    if (day <= 3) {
      return [
        { time: '09:00', title: 'Actividad en Puerto Varas', location: 'Puerto Varas', description: 'Recorrido por el lago Llanquihue y el volcán Osorno.' },
        { time: '20:00', title: 'Cena en hospedaje', location: 'Hotel Cabañas del Lago', description: 'Cena y descanso.' },
      ]
    }
    if (day === 4) {
      return [
        { time: '08:00', title: 'Cruce Andino a Bariloche', location: 'Paso Cardenal Samoré', description: 'Traslado en bus con cruce fronterizo.', requirementsMessage: 'Llevar pasaporte o cédula de identidad vigente.' },
        { time: '19:30', title: 'Llegada y check-in', location: 'Hotel Cabañas del Lago, Bariloche', description: 'Instalación en el hospedaje de Bariloche.' },
      ]
    }
    return [
      { time: '09:30', title: 'Excursión Cerro Campanario', location: 'Cerro Campanario, Bariloche', description: 'Subida en aerosilla y vista panorámica del lago Nahuel Huapi.', requirementsMessage: 'Llevar ropa de abrigo y bloqueador solar.' },
      { time: '20:00', title: 'Cena de camaradería', location: 'Hotel Cabañas del Lago, Bariloche', description: 'Cena grupal en el hotel.' },
    ]
  })
  const surBarilocheProgram = await createProgramFor(
    surBarilocheName,
    `Programa derivado de la gira "${surBarilocheName}" (sur de Chile → Bariloche).`,
    surBarilocheItinerary
  )
  const surBarilocheTrip = await prisma.trip.create({
    data: {
      name: surBarilocheName,
      destination: 'Puerto Varas, Chile → Bariloche, Argentina',
      schoolId: sanMartin.id,
      startDate: daysFromToday(-(surBarilocheCurrentDay - 1)),
      endDate: daysFromToday(surBarilocheTotalDays - surBarilocheCurrentDay),
      status: TripStatus.IN_ACTIVITY,
      currentDay: surBarilocheCurrentDay,
      totalDays: surBarilocheTotalDays,
      studentCount: 34,
      hotel: 'Hotel Cabañas del Lago',
      initialLat: -41.3195,
      initialLng: -72.9856,
      programId: surBarilocheProgram.id,
      legs: {
        create: [
          { order: 0, label: 'Puerto Varas, Chile', lat: -41.3195, lng: -72.9856 },
          { order: 1, label: 'Bariloche, Argentina', lat: -41.1335, lng: -71.3103 },
        ],
      },
      accessCodes: {
        create: [
          { code: 'BAR-2026', role: Role.PARENT },
          { code: 'MON-2026', role: Role.MONITOR },
          { code: 'ALU-BAR26', role: Role.STUDENT },
        ],
      },
      itineraryItems: { create: surBarilocheItinerary },
      announcements: {
        create: [
          {
            title: '¡Cruzamos a Bariloche!',
            message: 'Llegamos sin novedades tras el cruce andino. Todos los alumnos están bien e instalados en el hotel.',
            authorName: 'Prof. Carolina Herrera',
            type: AnnouncementType.ACHIEVEMENT,
            createdAt: minutesAgo(60 * 20),
          },
          {
            title: 'En el Cerro Campanario',
            message: 'Subimos en aerosilla, el clima está despejado y las vistas son espectaculares. Todo el grupo disfrutando.',
            authorName: 'Prof. Carolina Herrera',
            type: AnnouncementType.INFO,
            createdAt: minutesAgo(35),
          },
        ],
      },
      locationPings: {
        create: [
          { lat: -41.0699, lng: -71.2853, accuracy: 12, createdAt: minutesAgo(40) },
          { lat: -41.0668, lng: -71.2901, accuracy: 9, createdAt: minutesAgo(6) },
        ],
      },
    },
  })

  // ---------------------------------------------------------------------------
  // Gira B — descansando, cruza "hoy", requirementsMessage variado.
  // ---------------------------------------------------------------------------
  const atacamaName = '3° Medio A – San Pedro de Atacama 2026'
  const atacamaTotalDays = 5
  const atacamaCurrentDay = 3
  const atacamaItinerary = buildItinerary(atacamaTotalDays, atacamaCurrentDay, (day) => {
    const activities: Record<number, DayEntry[]> = {
      1: [
        { time: '07:30', title: 'Salida a Valle de la Luna', location: 'Valle de la Luna', description: 'Recorrido guiado por formaciones rocosas y miradores.' },
        { time: '20:00', title: 'Cena en hostal', location: 'Hostal Tulor', description: 'Cena y descanso.' },
      ],
      2: [
        { time: '11:00', title: 'Caminata en Valle Arcoíris', location: 'Valle Arcoíris', description: 'Caminata moderada.', requirementsMessage: 'Llevar bastante agua y protector solar.' },
        { time: '21:00', title: 'Observación astronómica', location: 'Observatorio SPACE', description: 'Charla y observación con telescopios.', requirementsMessage: 'Llevar ropa de abrigo, hace frío en la noche.' },
      ],
      3: [
        { time: '14:00', title: 'Visita a Laguna Cejar', location: 'Laguna Cejar', description: 'Flotación en la laguna salada.' },
        { time: '20:30', title: 'Cena de camaradería', location: 'Hostal Tulor', description: 'Cena grupal.' },
      ],
      4: [
        { time: '08:00', title: 'Géiseres del Tatio', location: 'El Tatio', description: 'Salida muy temprano para ver los géiseres al amanecer.', requirementsMessage: 'Llevar ropa muy abrigada, salida a las 05:30.' },
        { time: '19:00', title: 'Tarde libre en el pueblo', location: 'San Pedro de Atacama', description: 'Tiempo libre supervisado en el centro del pueblo.' },
      ],
      5: [
        { time: '10:00', title: 'Check-out y despedida', location: 'Hostal Tulor', description: 'Desayuno final y traslado al aeropuerto de Calama.' },
      ],
    }
    return activities[day] ?? []
  })
  const atacamaProgram = await createProgramFor(
    atacamaName,
    `Programa derivado de la gira "${atacamaName}" (San Pedro de Atacama, Chile).`,
    atacamaItinerary
  )
  const atacamaTrip = await prisma.trip.create({
    data: {
      name: atacamaName,
      destination: 'San Pedro de Atacama, Chile',
      schoolId: santaTeresa.id,
      startDate: daysFromToday(-(atacamaCurrentDay - 1)),
      endDate: daysFromToday(atacamaTotalDays - atacamaCurrentDay),
      status: TripStatus.RESTING,
      currentDay: atacamaCurrentDay,
      totalDays: atacamaTotalDays,
      studentCount: 28,
      hotel: 'Hostal Tulor',
      initialLat: -22.9098,
      initialLng: -68.1997,
      programId: atacamaProgram.id,
      accessCodes: {
        create: [
          { code: 'ATA-2026', role: Role.PARENT },
          { code: 'MON-ATA', role: Role.MONITOR },
          { code: 'ALU-ATA26', role: Role.STUDENT },
        ],
      },
      itineraryItems: { create: atacamaItinerary },
      announcements: {
        create: [
          {
            title: 'Flotamos en la Laguna Cejar',
            message: 'El grupo disfrutó muchísimo la flotación. Sin novedades, todos con muy buena energía.',
            authorName: 'Prof. Ignacio Reyes',
            type: AnnouncementType.ACHIEVEMENT,
            createdAt: minutesAgo(60 * 3),
          },
          {
            title: 'Recordatorio: salida madrugadora mañana',
            message: 'Mañana salimos a las 05:30 rumbo a los géiseres del Tatio. Recomendamos dormir temprano y llevar ropa muy abrigada.',
            authorName: 'Coordinación',
            type: AnnouncementType.ALERT,
            createdAt: minutesAgo(50),
          },
        ],
      },
      locationPings: {
        create: [{ lat: -22.9192, lng: -68.2883, accuracy: 15, createdAt: minutesAgo(45) }],
      },
    },
  })

  // ---------------------------------------------------------------------------
  // Gira C — finalizada, fechas pasadas (prueba filtros de rango del Organizador).
  // ---------------------------------------------------------------------------
  const valparaisoName = '2° Medio C – Valparaíso y Viña del Mar 2026'
  const valparaisoTotalDays = 3
  const valparaisoItinerary = buildItinerary(valparaisoTotalDays, valparaisoTotalDays, (day) => {
    const activities: Record<number, DayEntry[]> = {
      1: [
        { time: '09:00', title: 'Tour por los cerros', location: 'Cerro Alegre, Valparaíso', description: 'Recorrido a pie por los cerros y su arte callejero.' },
        { time: '19:00', title: 'Descanso en hospedaje', location: 'Hostal Brisa Marina', description: 'Regreso al hospedaje.' },
      ],
      2: [
        { time: '11:30', title: 'Museo a Cielo Abierto', location: 'Cerro Bellavista', description: 'Recorrido por murales históricos.' },
        { time: '15:30', title: 'Tarde libre en la playa', location: 'Playa Las Salinas, Viña del Mar', description: 'Tarde de descanso supervisada.' },
      ],
      3: [{ time: '10:00', title: 'Despedida y regreso', location: 'Valparaíso', description: 'Cierre de la gira y traslado de vuelta al colegio.' }],
    }
    return activities[day] ?? []
  })
  const valparaisoProgram = await createProgramFor(
    valparaisoName,
    `Programa derivado de la gira "${valparaisoName}" (Valparaíso, Chile).`,
    valparaisoItinerary
  )
  const valparaisoTrip = await prisma.trip.create({
    data: {
      name: valparaisoName,
      destination: 'Valparaíso, Chile',
      schoolId: ingles.id,
      startDate: daysFromToday(-18),
      endDate: daysFromToday(-16),
      status: TripStatus.FINISHED,
      currentDay: valparaisoTotalDays,
      totalDays: valparaisoTotalDays,
      studentCount: 32,
      hotel: 'Hostal Brisa Marina',
      initialLat: -33.0472,
      initialLng: -71.6127,
      programId: valparaisoProgram.id,
      accessCodes: {
        create: [
          { code: 'VAL-2026', role: Role.PARENT },
          { code: 'MON-VAL', role: Role.MONITOR },
        ],
      },
      itineraryItems: { create: valparaisoItinerary },
      announcements: {
        create: [
          {
            title: '¡Gira finalizada con éxito!',
            message: 'Cerramos la gira a Valparaíso sin novedades, con todos los alumnos en perfecto estado. ¡Gracias a las familias por su confianza!',
            authorName: 'Prof. Daniela Soto',
            type: AnnouncementType.ACHIEVEMENT,
            createdAt: daysFromToday(-16),
          },
        ],
      },
    },
  })

  // ---------------------------------------------------------------------------
  // Gira D — todavía no empieza (prueba estado inicial y "sin monitores").
  // ---------------------------------------------------------------------------
  const puconName = '4° Medio A – Pucón y la Araucanía 2026'
  const puconTotalDays = 7
  const puconItinerary = buildItinerary(puconTotalDays, 1, (day) => {
    const activities: Record<number, DayEntry[]> = {
      1: [{ time: '09:30', title: 'Trekking sector Los Pozones', location: 'Los Pozones', description: 'Caminata por sendero habilitado con guías de montaña.' }],
      2: [{ time: '15:00', title: 'Termas Geométricas', location: 'Termas Geométricas', description: 'Visita a las termas.', requirementsMessage: 'Llevar traje de baño y toalla.' }],
      3: [{ time: '10:00', title: 'Kayak en el lago Villarrica', location: 'Lago Villarrica', description: 'Actividad acuática guiada.' }],
    }
    return activities[day] ?? [{ time: '10:00', title: 'Actividad libre', location: 'Pucón', description: 'Día abierto, itinerario a confirmar.' }]
  })
  const puconProgram = await createProgramFor(
    puconName,
    `Programa derivado de la gira "${puconName}" (Pucón, Chile).`,
    puconItinerary
  )
  const puconTrip = await prisma.trip.create({
    data: {
      name: puconName,
      destination: 'Pucón, Chile',
      schoolId: losAndes.id,
      startDate: daysFromToday(13),
      endDate: daysFromToday(13 + puconTotalDays - 1),
      status: TripStatus.IN_TRANSIT,
      currentDay: 1,
      totalDays: puconTotalDays,
      studentCount: 30,
      hotel: 'Refugio Los Volcanes',
      initialLat: -39.2784,
      initialLng: -71.976,
      programId: puconProgram.id,
      accessCodes: {
        create: [
          { code: 'PUC-2026', role: Role.PARENT },
          { code: 'MON-PUC', role: Role.MONITOR },
        ],
      },
      itineraryItems: { create: puconItinerary },
    },
  })

  // ---------------------------------------------------------------------------
  // Gira E — en curso, larga (11 días): estresa la grilla auto-ajustada del
  // Organizador y el conteo "Día X de Y".
  // ---------------------------------------------------------------------------
  const rapaNuiName = '3° Medio B – Isla de Pascua 2026'
  const rapaNuiTotalDays = 11
  const rapaNuiCurrentDay = 7
  const rapaNuiItinerary = buildItinerary(rapaNuiTotalDays, rapaNuiCurrentDay, (day) => {
    const spots = [
      { title: 'Visita Ahu Tongariki', location: 'Ahu Tongariki', description: 'Visita al sitio arqueológico más grande de la isla.' },
      { title: 'Cráter Rano Raraku', location: 'Rano Raraku', description: 'Visita a la cantera donde se esculpieron los moái.' },
      { title: 'Playa Anakena', location: 'Anakena', description: 'Tarde de playa y descanso.' },
      { title: 'Caminata Orongo', location: 'Orongo', description: 'Recorrido por el centro ceremonial.', requirementsMessage: 'Llevar bloqueador solar y agua.' },
    ]
    const spot = spots[(day - 1) % spots.length]
    return [
      { time: '09:00', title: spot.title, location: spot.location, description: spot.description, requirementsMessage: spot.requirementsMessage },
      { time: '20:00', title: 'Cena en hotel', location: 'Hotel Tupa, Hanga Roa', description: 'Cena y descanso en el hotel.' },
    ]
  })
  const rapaNuiProgram = await createProgramFor(
    rapaNuiName,
    `Programa derivado de la gira "${rapaNuiName}" (Isla de Pascua, Chile).`,
    rapaNuiItinerary
  )
  const rapaNuiTrip = await prisma.trip.create({
    data: {
      name: rapaNuiName,
      destination: 'Isla de Pascua, Chile',
      schoolId: sagradosCorazones.id,
      startDate: daysFromToday(-(rapaNuiCurrentDay - 1)),
      endDate: daysFromToday(rapaNuiTotalDays - rapaNuiCurrentDay),
      status: TripStatus.IN_ACTIVITY,
      currentDay: rapaNuiCurrentDay,
      totalDays: rapaNuiTotalDays,
      studentCount: 26,
      hotel: 'Hotel Tupa',
      initialLat: -27.1127,
      initialLng: -109.3497,
      programId: rapaNuiProgram.id,
      accessCodes: {
        create: [
          { code: 'RAP-2026', role: Role.PARENT },
          { code: 'MON-RAP', role: Role.MONITOR },
          { code: 'ALU-RAP26', role: Role.STUDENT },
        ],
      },
      itineraryItems: { create: rapaNuiItinerary },
      announcements: {
        create: [
          {
            title: 'Visitamos Orongo',
            message: 'Día tranquilo recorriendo el centro ceremonial. Todos los alumnos bien y muy interesados en la historia rapa nui.',
            authorName: 'Prof. Valentina Muñoz',
            type: AnnouncementType.INFO,
            createdAt: minutesAgo(60 * 5),
          },
        ],
      },
      locationPings: {
        create: [{ lat: -27.1212, lng: -109.3652, accuracy: 14, createdAt: minutesAgo(20) }],
      },
    },
  })

  // ---------------------------------------------------------------------------
  // Monitor real de prueba (Clerk) — asociado a todas menos Pucón, para poder
  // probar el estado "Sin monitores asignados" ahí.
  // ---------------------------------------------------------------------------
  const tripsWithMonitor = [surBarilocheTrip, atacamaTrip, valparaisoTrip, rapaNuiTrip]
  if (monitorId) {
    await prisma.tripMembership.createMany({
      data: tripsWithMonitor.map((trip) => ({ clerkUserId: monitorId, tripId: trip.id, role: Role.MONITOR })),
    })
  }
  if (parentId) {
    await prisma.tripMembership.createMany({
      data: [surBarilocheTrip, atacamaTrip].map((trip) => ({ clerkUserId: parentId, tripId: trip.id, role: Role.PARENT })),
    })
  }

  const allTrips = [surBarilocheTrip, atacamaTrip, valparaisoTrip, puconTrip, rapaNuiTrip]
  console.log(`Seeded ${allTrips.length} trips across ${schools.length} schools:`)
  for (const trip of allTrips) {
    console.log(`  - ${trip.name} (${trip.status})`)
  }
  console.log('')
  console.log('Access codes:')
  console.log('  Sur de Chile → Bariloche → BAR-2026 (apoderado) / MON-2026 (monitor) / ALU-BAR26 (alumno)')
  console.log('  Atacama                  → ATA-2026 (apoderado) / MON-ATA (monitor) / ALU-ATA26 (alumno)')
  console.log('  Valparaíso                → VAL-2026 (apoderado) / MON-VAL (monitor)')
  console.log('  Pucón                     → PUC-2026 (apoderado) / MON-PUC (monitor) — sin canjear, sin monitor asignado')
  console.log('  Isla de Pascua             → RAP-2026 (apoderado) / MON-RAP (monitor) / ALU-RAP26 (alumno)')
  console.log('')
  console.log(monitorId ? `Monitor de prueba asociado: ${monitorId}` : 'No se asoció monitor de prueba (no encontrado en Clerk).')
  console.log(parentId ? `Apoderado de prueba asociado: ${parentId}` : 'No se asoció apoderado de prueba (no encontrado en Clerk).')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
