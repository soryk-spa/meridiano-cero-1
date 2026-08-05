# Meridiano Cero — Estado actual del sistema

> Documento generado a partir del código real del repo `meridiano-cero` (panel web). Refleja lo que existe hoy, no un roadmap.

## 1. Qué es

Plataforma de seguimiento operativo para giras escolares. Conecta tres roles — **administrador** (colegio/operador de la gira), **monitor** (acompaña al grupo en terreno) y **apoderado** (familia) — alrededor de una **gira** (`Trip`): su ubicación en vivo, su itinerario día a día y sus comunicados.

Este repo es la app web (Next.js 16, App Router). Existe además una app móvil nativa separada (Expo, repo `meridiano-cero-app`) para los roles Monitor y Apoderado, en desarrollo temprano (solo auth + una pantalla por rol construida hasta ahora); las rutas web `/monitor/[tripId]` y `/parent/[tripId]` descritas aquí son la versión actualmente en producción de esos dos roles.

## 2. Stack

- **Next.js 16** (App Router, Turbopack) — el repo usa `proxy.ts` en vez de `middleware.ts` y otras convenciones que difieren del Next.js "clásico" (ver `AGENTS.md`).
- **Tailwind CSS v4** (config CSS-first en `app/globals.css`, sin `tailwind.config.js`) + `tw-animate-css` para las utilidades `animate-in`/`animate-out`.
- **shadcn/ui**, componentes vendidos a mano en `components/ui/`, más un puñado de componentes tomados de ReUI (`components/reui/`) — timeline con hitos, drawer.
- **Prisma ORM** sobre **PostgreSQL** (Neon).
- **Clerk** para autenticación (sign-in/sign-up, sesiones, `AdminUser`/membresías de gira).
- **Zod** para validación de payloads de API.
- **Vercel Blob** para las fotos que suben los monitores.

## 3. Modelo de datos (Prisma)

```
School 1──* Trip *──1 Program 1──* ProgramItem
                │
                ├──* TripMembership (clerkUserId + role: PARENT | MONITOR)
                ├──* AccessCode (código canjeable → rol + gira)
                ├──* ItineraryItem (status: PENDING | IN_PROGRESS | COMPLETED)
                ├──* Announcement (type: INFO | ALERT | ACHIEVEMENT)
                └──* LocationPing (lat/lng/accuracy, histórico de GPS)

AdminUser (clerkUserId) — acceso total, no depende de TripMembership
AnnouncementTemplate — mensajes predefinidos que usa el monitor
ActivityTemplate — actividades predefinidas para armar itinerarios
RedeemAttempt — rate-limit del canje de códigos
```

Puntos clave del modelo:

- **`Trip.programId` es obligatorio.** Toda gira nace de un `Program` (plantilla de itinerario reutilizable); no existen giras "desde cero". El `Program` no puede borrarse mientras alguna `Trip` lo referencie (`onDelete: Restrict`, con mensaje de error explícito en la API).
- **Copiar, no enlazar.** Al crear una gira o aplicar un programa a una gira existente, los `ProgramItem` se copian como `ItineraryItem` nuevos. Editar el programa después no reescribe giras que ya lo aplicaron — el programa es un punto de partida, no una fuente viva.
- **`AccessCode`** es el mecanismo de invitación: un código único por rol y gira; canjearlo crea una `TripMembership`. Rate-limited (10 intentos / 15 min por usuario) vía `RedeemAttempt`.
- **`AdminUser`** es una tabla aparte de `TripMembership` — un admin no "pertenece" a ninguna gira, tiene acceso a todas.

## 4. Roles y control de acceso

Todas las rutas bajo `/admin`, `/parent`, `/monitor`, `/redeem` y `/api/v1` exigen sesión de Clerk (`proxy.ts`). Dentro de eso, `lib/api/require-role.ts` define cuatro guards usados por cada endpoint:

| Guard | Regla |
|---|---|
| `requireAuthenticated` | Cualquier usuario con sesión. |
| `requireAdmin` | Debe existir un `AdminUser` con ese `clerkUserId`. |
| `requireTripAccess(tripId)` | Admin, o tener alguna `TripMembership` en esa gira. |
| `requireTripWrite(tripId, roles[])` | Admin, o tener membresía con uno de los roles indicados. |

**Enrutamiento post-login** (`app/page.tsx`): admin → `/admin`; sin membresías → `/redeem`; una sola membresía → directo a `/monitor/[tripId]` o `/parent/[tripId]` según el rol; varias membresías → selector de gira.

**Flujo de canje** (`/redeem`): al entrar, primero intenta auto-reclamar una invitación pendiente (`/api/v1/auth/claim-invite`); si no hay nada, muestra pantalla de "sin acceso" con instrucción de pedirle un código a un administrador.

## 5. Panel de administración (`/admin`)

Sidebar con estas secciones (`components/app-sidebar.tsx`):

| Página | Qué hace |
|---|---|
| **Dashboard** (`/admin`) | Vista general. |
| **Giras** (`/admin/trips`) | Tabla de todas las giras: búsqueda por texto, filtro por colegio, toggle "Operación"/"En terreno" (oculta finalizadas). Crear gira vía slide-over (`Sheet`, animado) o página completa `/admin/trips/new`. Acciones por fila (editar/eliminar) con confirmación y notificación toast. |
| **Detalle de gira** (`/admin/trips/[tripId]`) | Organizado en 4 tabs: **Resumen** (estado, destino, alumnos, ubicación en mapa), **Itinerario** (lista de `ItineraryItem`, agregar/editar vía slide-over compartido, aplicar/reemplazar programa), **Comunicados** (historial de `Announcement`), **Personas** (apoderados, monitores, códigos de acceso — agregar/revocar). |
| **Programas** (`/admin/programs`) | Tabla de `Program`. Detalle (`/admin/programs/[id]`) muestra las actividades como **timeline con hitos** (día/hora/lugar/descripción), mismo editor de actividad que usa el itinerario de una gira. No se puede borrar un programa en uso por alguna gira. |
| **Analítica** (`/admin/analytics`) | Métricas agregadas de la plataforma. |
| **Mapa operativo** (`/admin/map`) | Todas las giras en terreno, ubicación en tiempo real sobre un mapa. |
| **Equipo** (`/admin/team`) | Administradores y monitores de la plataforma. |
| **Usuarios** (`/admin/users`) | Todas las cuentas registradas (tabla), independiente de a qué gira pertenecen. |
| **Reportes** (`/admin/reports`) | Alertas y logros (`Announcement` tipo `ALERT`/`ACHIEVEMENT`) reportados en terreno, filtrables por tipo y colegio, exportables a CSV. |
| **Colegios** (`/admin/schools`) | Tabla de `School`: giras totales, en terreno, alumnos. |
| **Códigos** (`/admin/codes`) | Códigos de acceso para apoderados y monitores. |
| **Mensajes** (`/admin/messages`) | CRUD de `AnnouncementTemplate` — plantillas que el monitor puede enviar sin redactar texto libre. |
| **Actividades** (`/admin/activities`) | CRUD de `ActivityTemplate` — actividades genéricas reutilizables al armar el itinerario de una gira o un programa. |
| **Configuración** / **Ayuda** | Cuenta del administrador (Clerk) / FAQ y soporte. |

**Patrones de UI consistentes en todo el panel** (aplicados esta última ronda a Giras, Reportes, Programas, Colegios, Mensajes y Actividades):
- Listas como tabla con búsqueda y filtros en cliente (sin endpoints nuevos).
- Estado vacío compartido (`components/empty-state.tsx`): ícono + texto + acción, hermano de `components/fetch-error.tsx` para el caso de error de carga.
- Notificación toast (`sonner`) en cada creación/edición/eliminación, además del error inline en formularios cuando aplica.
- Paneles laterales (`Sheet`) para formularios largos en vez de diálogos centrados, con animación de entrada/salida (`ease-out` tipo "snappy" al abrir, `ease-in` más rápido al cerrar).
- El editor de ítem de actividad (día, hora, título, lugar, descripción, requisitos) es un único componente compartido (`components/activity-item-form.tsx`) usado tanto por el itinerario de una gira como por un programa — el único parámetro que cambia es si el "día" es un selector acotado a la duración de la gira o un número libre (programa).

## 6. Vista del monitor (`/monitor/[tripId]`)

Pantalla operativa en terreno, pensada para uso durante la gira:

- **GPS**: transmite ubicación cada 15 s mientras "Transmitiendo" está activo (usa `navigator.geolocation`, con un fallback simulado si no hay permiso/soporte, para demos). Cada envío crea un `LocationPing` y actualiza `Trip` con la posición más reciente.
- **Actividad actual**: primer ítem del itinerario que no está `COMPLETED`. Tres botones de transición — **En ruta** → `PENDING`, **En actividad** → `IN_PROGRESS` (pide foto), **Terminada** → `COMPLETED` — cada transición genera automáticamente un comunicado tipo `INFO` (el monitor no redacta texto).
- **Control de hitos**: itinerario completo agrupado por día, con las mismas transiciones por ítem, subida/eliminación de foto, y botón para enviar los "requisitos" de una actividad (si el ítem tiene `requirementsMessage`) como comunicado aparte.
- **Publicar comunicado**: elegir una `AnnouncementTemplate` predefinida y publicarla (no hay texto libre).

## 7. Vista del apoderado (`/parent/[tripId]`)

Consumo de solo lectura, cuatro páginas:

- **Inicio**: mapa con la última ubicación conocida, actividad actual o próxima, último comunicado, estadísticas rápidas (alumnos, día N/M, destino).
- **Itinerario** (`/itinerary`): plan completo día por día con estado de cada ítem.
- **Comunicados** (`/announcements`): historial completo de `Announcement`.
- **Mapa** (`/map`): vista de mapa a pantalla completa.

Todo se sirve desde un `TripContext` (`lib/trip-context.tsx`) cargado una vez en el layout de `/parent/[tripId]`.

## 8. API (`app/api/v1/`)

REST convencional bajo `/api/v1`, protegido por los guards de `require-role.ts`, con manejo de errores centralizado (`lib/api/handler.ts` + `lib/api/errors.ts` → siempre `{ error: { code, message } }`).

- `trips/` — CRUD de giras (crear exige `programId`; al crear, aplica el programa al itinerario automáticamente vía `lib/api/programs.ts`), `[tripId]/itinerary`, `[tripId]/itinerary/[id]/photo`, `[tripId]/announcements`, `[tripId]/location`.
- `admin/programs/`, `admin/programs/[id]` — CRUD de programas; borrar valida que ninguna gira lo esté usando.
- `admin/activity-templates/`, `announcement-templates/` — CRUD de plantillas.
- `admin/schools/`, `admin/team/`, `admin/users/`, `admin/codes/`, `admin/reports/`, `admin/analytics/`, `admin/map/`, `admin/search/` — soporte de cada página admin correspondiente.
- `auth/redeem` — canjea un `AccessCode` por una `TripMembership` (rate-limited).
- `auth/claim-invite` — auto-reclamo de invitación pendiente al entrar a `/redeem`.
- `me/trips` — a qué giras/roles tiene acceso el usuario actual (o si es admin).

## 9. Estado de los datos de prueba

`prisma/seed.ts` crea 5 giras de demostración (Bariloche, Atacama, Valparaíso, Pucón, Rapa Nui), cada una con su propio `Program` generado a partir del mismo itinerario que se le asigna a la gira — de modo que el seed respeta la regla de "programa obligatorio" y sirve como ejemplo de la relación Program → Trip.

## 10. Fuera de alcance / pendiente (no construido aún)

- Perfil de alumno (4º rol, de solo lectura) — postergado, sin fecha.
- GPS en segundo plano en la app móvil — postergado hasta después de la primera aprobación en tiendas.
- Acciones masivas (bulk actions) en Usuarios/Códigos.
- Extender el patrón de tabla+filtros+toast+EmptyState a Equipo, Usuarios, Códigos y Mapa (documentado como próxima ronda, no iniciado).
