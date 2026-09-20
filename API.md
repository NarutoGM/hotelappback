# 🏨 Aura Hotel API - Documentación de Endpoints

Documentación técnica de la API REST del backend (`hotelback`) conectado a **PostgreSQL (Neon)** mediante **Prisma ORM**.

- **URL Base Local:** `http://localhost:3000/`
- **URL Base Emulador Android:** `http://10.0.2.2:3000/`

---

## 1. 🛏️ Habitaciones y Filtro por Capacidad / Fechas

### `GET /rooms`
Busca y filtra habitaciones disponibles directamente por **capacidad mínima** y **rango de fechas**.

#### Parámetros Query (Opcionales)
| Parámetro | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `capacity` | `number` | Cantidad de personas requerida (1 a 6). Solo devuelve habitaciones con `capacity >= valor`. | `2` |
| `checkIn` | `string` | Fecha de entrada (formato `YYYY-MM-DD`). | `2026-09-20` |
| `checkOut` | `string` | Fecha de salida (formato `YYYY-MM-DD`). | `2026-09-24` |

#### Ejemplo de Petición
```http
GET /rooms?capacity=3&checkIn=2026-09-20&checkOut=2026-09-24 HTTP/1.1
Host: localhost:3000
```

#### Respuesta Exitosa (`200 OK`)
```json
[
  {
    "id": "room_junior_412",
    "roomNumber": "Hab. 412",
    "title": "Junior Suite",
    "subtitle": "Piso 4 · Hasta 3 personas",
    "type": "Junior Suite",
    "floor": 4,
    "capacity": 3,
    "pricePerNight": 290.0,
    "isAvailable": true,
    "bedType": "1 Cama Queen + 1 Sofá Cama",
    "surfaceAreaM2": 38,
    "rating": 4.9,
    "reviewsCount": 82,
    "amenitiesCsv": "Wi-Fi;Minibar;TV 55;Sala de Estar;Desayuno"
  },
  {
    "id": "room_deluxe_704",
    "roomNumber": "Hab. 704",
    "title": "Suite Deluxe Familiar",
    "subtitle": "Piso 7 · Espacio amplio para 4 personas",
    "type": "Suite Deluxe",
    "floor": 7,
    "capacity": 4,
    "pricePerNight": 380.0,
    "isAvailable": true,
    "bedType": "1 Cama King + 2 Camas Twin",
    "surfaceAreaM2": 52,
    "rating": 4.9,
    "reviewsCount": 94,
    "amenitiesCsv": "Wi-Fi;Jacuzzi;Terraza;Desayuno Buffet;Smart TV"
  }
]
```

---

### `GET /rooms/:id`
Obtiene el detalle completo de una habitación por su identificador.

#### Ejemplo de Petición
```http
GET /rooms/room_deluxe_704 HTTP/1.1
Host: localhost:3000
```

---

### `GET /rooms/calendar`
Vista de Calendario / Matriz para Recepción. Devuelve **todas las habitaciones** con su lista de reservas en el rango de fechas solicitado (útil para pintar la cuadrícula del calendario).

#### Parámetros Query (Opcionales)
| Parámetro | Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `startDate` | `string` | Fecha inicial de la matriz (`YYYY-MM-DD`). Por defecto hoy. | `2026-09-20` |
| `endDate` | `string` | Fecha final de la matriz (`YYYY-MM-DD`). Por defecto hoy + 30 días. | `2026-09-30` |

#### Ejemplo de Petición
```http
GET /rooms/calendar?startDate=2026-09-20&endDate=2026-09-30 HTTP/1.1
Host: localhost:3000
```

#### Respuesta Exitosa (`200 OK`)
```json
[
  {
    "id": "room_deluxe_704",
    "roomNumber": "Hab. 704",
    "title": "Suite Deluxe Familiar",
    "subtitle": "Piso 7 · Espacio amplio para 4 personas",
    "type": "Suite Deluxe",
    "floor": 7,
    "capacity": 4,
    "pricePerNight": 380.0,
    "isAvailable": true,
    "bookings": [
      {
        "id": "cm...",
        "bookingId": "AG-10001",
        "guestName": "Carlos Mendoza",
        "guestEmail": "carlos@email.com",
        "checkInDate": "2026-09-21",
        "checkOutDate": "2026-09-24",
        "nights": 3,
        "guestsCount": 2,
        "status": "CONFIRMED",
        "totalAmount": 1140.0
      }
    ]
  }
]
```

---

### `POST /rooms/book`
Crea una nueva reserva validando que la capacidad solicitada no exceda la capacidad de la habitación y que no existan reservas solapadas en esas fechas.
- Para **huéspedes en la app**: omitir `status` (crea la reserva en estado `PENDING`).
- Para **recepción (mostrador / walk-in)**: enviar `status: "CONFIRMED"` para confirmar la reserva de inmediato sin necesidad de voucher.

#### Payload Request (Ejemplo Recepción con confirmación inmediata)
```json
{
  "roomId": "room_deluxe_704",
  "guestName": "Carlos Mendoza",
  "guestEmail": "carlos.mendoza@gmail.com",
  "checkInDate": "2026-09-21",
  "checkOutDate": "2026-09-24",
  "guestsCount": 2,
  "totalAmount": 1140.0,
  "status": "CONFIRMED"
}
```

#### Respuesta Exitosa (`201 Created`)
```json
{
  "id": "cmu9z1...",
  "bookingId": "AG-48921",
  "roomId": "room_deluxe_704",
  "guestName": "Carlos Mendoza",
  "guestEmail": "carlos.mendoza@gmail.com",
  "checkInDate": "2026-09-21",
  "checkOutDate": "2026-09-24",
  "nights": 3,
  "guestsCount": 2,
  "status": "CONFIRMED",
  "totalAmount": 1140.0
---

### `POST /rooms/:id/image`
Sube una foto de la habitación directamente a Firebase Storage (`banco-de-imagenes-eaffd.firebasestorage.app`) y actualiza el campo `imageUrl` en la base de datos PostgreSQL Neon.
- Formato: `multipart/form-data`
- Campo de archivo: `file`

#### Respuesta Exitosa (`201 Created`)
```json
{
  "id": "room_deluxe_704",
  "roomNumber": "704",
  "title": "Habitación Deluxe Vista al Mar",
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/banco-de-imagenes-eaffd.firebasestorage.app/o/rooms%2Froom_deluxe_704_1789918000.jpg?alt=media&token=..."
}
```

---

### `PATCH /rooms/:id`
Actualiza datos de la habitación (título, precio, piso, capacidad, imageUrl, etc.).

#### Payload Request (Ejemplo)
```json
{
  "pricePerNight": 420.0,
  "floor": 4,
  "imageUrl": "https://firebasestorage.googleapis.com/v0/b/..."
}
```


## 2. 🔐 Autenticación y Usuarios

### `POST /auth/login`
Inicia sesión verificando hash PBKDF2 en la base de datos de Neon.

#### Payload Request
```json
{
  "email": "admin@aurahotel.pe",
  "password": "Admin2026!"
}
```

#### Respuesta Exitosa (`200 OK`)
```json
{
  "id": "usr-admin-001",
  "email": "admin@aurahotel.pe",
  "fullName": "Administrador Aura",
  "documentNumber": "00000001",
  "role": "ADMIN",
  "createdAt": 1789916359594
}
```

---

### `POST /auth/register`
Registra un nuevo usuario en Neon PostgreSQL.

#### Payload Request
```json
{
  "email": "nuevo.cliente@gmail.com",
  "password": "Password123!",
  "fullName": "Ana Gómez",
  "documentNumber": "45892134",
  "role": "GUEST"
}
```

---

### `GET /auth/users`
Lista los usuarios registrados en el sistema.

---

## 3. 👥 Credenciales de Prueba (Seed en Neon)

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| 🛡️ **ADMIN** | `admin@aurahotel.pe` | `Admin2026!` |
| 🛎️ **RECEPTIONIST** | `recepcion@aurahotel.pe` | `Recepcion2026!` |
| 👤 **GUEST** | `huesped@aurahotel.pe` | `Aura2026!` |
