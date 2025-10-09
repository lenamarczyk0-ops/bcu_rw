# BCU SPEDYCJA - System CMS i Panel Administratora

Kompletny system zarządzania treścią dla Branżowego Centrum Umiejętności SPEDYCJA z panelem administratora, autoryzacją użytkowników i API REST.

## 🚀 Funkcjonalności

### 👥 Zarządzanie użytkownikami
- **Rejestracja i logowanie** z weryfikacją email
- **Role użytkowników:**
  - `admin` - pełen dostęp, zarządzanie użytkownikami
  - `redaktor` - zarządzanie treścią (kursy, aktualności, oferty)
  - `wykladowca` - tworzenie kursów i aktualności
  - `pracodawca` - dodawanie ofert pracy
  - `kursant` - zapisywanie się na kursy

### 📚 CMS - Zarządzanie treścią
- **Kursy** - pełne zarządzanie z materiałami i aplikacjami
- **Aktualności** - artykuły z systemem publikacji
- **Oferty pracy** - zarządzanie przez pracodawców
- **Materiały edukacyjne** - repozytorium plików i linków
- **Aplikacje na kursy** - system zapisów z statusami

### 🎛️ Panel Administratora (AdminJS)
- Intuicyjny interfejs administracyjny
- Zarządzanie wszystkimi zasobami
- Kontrola uprawnień na podstawie ról
- Automatyczne przypisywanie autorów

### 🔌 API REST
- Publiczne endpointy dla kursów, aktualności, ofert
- Chronione endpointy dla zarządzania treścią
- System autoryzacji oparty na sesjach
- Walidacja i sanitizacja danych

## 🛠️ Technologie

- **Backend:** Node.js (>=16), Express.js
- **Baza danych:** MongoDB (>=5) z Mongoose
- **Autoryzacja:** Passport.js (local strategy)
- **Panel admin:** AdminJS z React
- **Sesje:** connect-mongo
- **Bezpieczeństwo:** helmet, cors, rate limiting
- **Frontend:** HTML/CSS/JavaScript (Tailwind CSS)

## 📦 Instalacja

### Wymagania
- Node.js >= 16
- MongoDB >= 5
- npm lub yarn

### Kroki instalacji

1. **Sklonuj repozytorium i zainstaluj zależności:**
```bash
npm install
```

2. **Skonfiguruj zmienne środowiskowe:**
```bash
cp env.example .env
```

3. **Edytuj plik `.env`:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/bcu_spedycja

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Admin User (created on first run)
ADMIN_EMAIL=admin@bcu-spedycja.pl
ADMIN_PASSWORD=Admin123!

# File Upload
UPLOAD_PATH=./public/uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

4. **Uruchom MongoDB:**
```bash
# macOS z Homebrew
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongod

# Windows
net start MongoDB
```

5. **Utwórz konto administratora:**
```bash
npm run seed
```

6. **Uruchom serwer:**
```bash
# Produkcja
npm start

# Rozwój (z auto-reload)
npm run dev
```

## 🌐 Dostęp do aplikacji

- **Strona główna:** http://localhost:3000
- **Kursy:** http://localhost:3000/courses
- **Panel administratora:** http://localhost:3000/admin
- **API:** http://localhost:3000/api

## 👤 Logowanie do panelu administratora

Po uruchomieniu `npm run seed` możesz się zalogować do panelu administratora:

- **Email:** `admin@bcu-spedycja.pl`
- **Hasło:** `Admin123!`

## 📁 Struktura projektu

```
bcu_html/
├── src/
│   ├── models/          # Modele Mongoose
│   ├── routes/          # API routes
│   ├── auth/           # Konfiguracja Passport.js
│   ├── admin/          # Konfiguracja AdminJS
│   ├── config/         # Konfiguracja bazy danych i sesji
│   ├── app.js          # Główny plik aplikacji
│   └── seed.js         # Skrypt tworzenia administratora
├── public/             # Pliki statyczne (HTML, CSS, JS, obrazy)
│   ├── assets/
│   │   └── js/
│   │       └── api.js  # Integracja API z frontendem
│   ├── build.html      # Strona główna
│   └── courses.html    # Strona kursów
├── package.json
├── env.example
└── README.md
```

## 🔐 Bezpieczeństwo

- **Helmet.js** - nagłówki bezpieczeństwa HTTP
- **CORS** - kontrola dostępu cross-origin
- **Rate limiting** - ograniczenie liczby żądań
- **Walidacja** - express-validator dla wszystkich inputów
- **Sanityzacja** - czyszczenie danych wejściowych
- **Sesje** - bezpieczne przechowywanie w MongoDB
- **Hasła** - hashowanie bcrypt

## 📊 API Endpoints

### Publiczne (bez autoryzacji)
- `GET /api/courses` - Lista opublikowanych kursów
- `GET /api/courses/:slug` - Szczegóły kursu
- `GET /api/news` - Lista aktualności
- `GET /api/news/:slug` - Artykuł
- `GET /api/job-offers` - Lista ofert pracy
- `GET /api/job-offers/:id` - Szczegóły oferty
- `GET /api/materials/public` - Publiczne materiały
- `POST /api/applications` - Zapis na kurs

### Chronione (wymagana autoryzacja)
- `POST /api/auth/login` - Logowanie
- `POST /api/auth/register` - Rejestracja
- `GET /api/auth/me` - Aktualny użytkownik
- Wszystkie operacje CRUD dla kursów, aktualności, ofert (w zależności od roli)

## 🎯 Role i uprawnienia

### Admin
- Pełny dostęp do wszystkich funkcji
- Zarządzanie użytkownikami i rolami
- Moderowanie wszystkich treści

### Redaktor
- Zarządzanie kursami, aktualnościami, ofertami pracy
- Brak dostępu do zarządzania użytkownikami
- Publikowanie treści

### Wykładowca
- Tworzenie i edycja własnych kursów
- Tworzenie aktualności
- Przeglądanie aplikacji na swoje kursy

### Pracodawca
- Tworzenie i edycja własnych ofert pracy
- Przeglądanie aplikacji na swoje oferty

### Kursant
- Przeglądanie opublikowanych treści
- Zapisywanie się na kursy
- Pobieranie materiałów

## 🔧 Konfiguracja produkcji

1. **Zmienne środowiskowe:**
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
SESSION_SECRET=very-secure-secret-key
```

2. **Reverse proxy (Nginx):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. **PM2 (process manager):**
```bash
npm install -g pm2
pm2 start src/app.js --name "bcu-cms"
pm2 startup
pm2 save
```

## 🐛 Rozwiązywanie problemów

### MongoDB connection error
```bash
# Sprawdź czy MongoDB działa
mongosh --eval "db.runCommand('ping')"

# Restart MongoDB
brew services restart mongodb-community  # macOS
sudo systemctl restart mongod            # Linux
```

### Port already in use
```bash
# Znajdź proces używający portu 3000
lsof -ti:3000

# Zabij proces
kill -9 $(lsof -ti:3000)
```

### Admin panel nie działa
```bash
# Sprawdź czy admin został utworzony
npm run seed

# Sprawdź logi
npm run dev
```

## 📝 Licencja

MIT License - zobacz plik LICENSE dla szczegółów.

## 🤝 Wsparcie

W przypadku problemów lub pytań:
1. Sprawdź sekcję "Rozwiązywanie problemów"
2. Przejrzyj logi aplikacji
3. Sprawdź konfigurację bazy danych
4. Skontaktuj się z zespołem developerskim

## 🚀 Wdrożenie

Aplikacja jest gotowa do wdrożenia na:
- **Heroku** (z MongoDB Atlas)
- **DigitalOcean** (z Docker)
- **AWS EC2** (z RDS MongoDB)
- **VPS** (z lokalnym MongoDB)

Wszystkie niezbędne konfiguracje są zawarte w kodzie i dokumentacji.