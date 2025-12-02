# Automatyczny Import Ofert Pracy z praca.gov.pl

## Opis

System automatycznie pobiera oferty pracy z portalu [oferty.praca.gov.pl](https://oferty.praca.gov.pl/) dla zawodów związanych ze spedycją i logistyką. Oferty są aktualizowane automatycznie co tydzień.

## Funkcje

### 🔄 Automatyczna Aktualizacja

- **Harmonogram**: Co niedzielę o 3:00 i co środę o 14:00
- **Słowa kluczowe**: spedytor, logistyk, magazynier, dyspozytor transportu, i inne
- **Automatyczne czyszczenie**: Wygasłe oferty są usuwane automatycznie

### 📥 Ręczny Import

Możesz ręcznie uruchomić import przez panel administracyjny lub API.

## Endpointy API

### Import ofert

```http
POST /api/job-offers/import/praca-gov
Authorization: Bearer <token>
Content-Type: application/json

{
  "keywords": ["spedytor", "logistyk"],
  "maxOffersPerKeyword": 20,
  "updateExisting": false
}
```

### Statystyki importu

```http
GET /api/job-offers/import/stats
Authorization: Bearer <token>
```

Odpowiedź:
```json
{
  "success": true,
  "importStats": {
    "total": 45,
    "active": 38,
    "expired": 7,
    "lastImportedAt": "2025-01-15T14:00:00.000Z",
    "lastImportedTitle": "Spedytor międzynarodowy"
  },
  "scheduler": {
    "isRunning": false,
    "lastRun": "2025-01-15T14:00:00.000Z",
    "nextScheduledRun": "2025-01-19T03:00:00.000Z"
  }
}
```

### Status schedulera

```http
GET /api/job-offers/scheduler/status
Authorization: Bearer <token>
```

### Wymuś aktualizację

```http
POST /api/job-offers/scheduler/force-update
Authorization: Bearer <token>
```

### Usuń wygasłe oferty

```http
DELETE /api/job-offers/import/cleanup
Authorization: Bearer <token>
```

### Lista słów kluczowych

```http
GET /api/job-offers/import/keywords
```

### Wyszukaj oferty (bez zapisywania)

```http
GET /api/job-offers/search/praca-gov?keyword=spedytor&limit=10
```

## Słowa Kluczowe

System wyszukuje oferty dla następujących słów kluczowych:

- `spedytor`
- `logistyk`
- `logistyka`
- `spedycja`
- `magazynier`
- `dyspozytor transportu`
- `koordynator logistyki`
- `specjalista ds. logistyki`
- `specjalista ds. spedycji`
- `kierownik magazynu`
- `planista transportu`

## Konfiguracja

### Harmonogram (src/services/jobScheduler.js)

```javascript
const SCHEDULE_CONFIG = {
  WEEKLY_DAY: 0,        // 0 = niedziela
  WEEKLY_HOUR: 3,       // Godzina 3:00
  WEEKLY_MINUTE: 0,
  
  MIDWEEK_DAY: 3,       // Środa
  MIDWEEK_HOUR: 14,     // Godzina 14:00
  MIDWEEK_MINUTE: 0
};
```

### Dodawanie nowych słów kluczowych

Edytuj plik `src/services/pracaGovService.js`:

```javascript
const JOB_KEYWORDS = [
  'spedytor',
  'logistyk',
  // ... dodaj nowe słowa kluczowe
];
```

## Model Danych

Importowane oferty są zapisywane z dodatkowymi polami:

```javascript
{
  // ... standardowe pola JobOffer
  externalId: 'praca-gov-123456',  // ID z praca.gov.pl
  source: 'praca.gov.pl',          // Źródło oferty
  lastSyncedAt: Date               // Data ostatniej synchronizacji
}
```

## Logowanie

System loguje wszystkie operacje:

```
🔄 Rozpoczynam import ofert pracy z praca.gov.pl...
📋 Słowa kluczowe: spedytor, logistyk, ...
🔍 Szukam ofert dla: "spedytor"...
📦 Znaleziono 15 ofert dla "spedytor"
✅ Zaimportowano: Spedytor międzynarodowy - LogiTrans Sp. z o.o.
⏭️ Pominięto (już istnieje): Spedytor krajowy
...
📊 PODSUMOWANIE IMPORTU:
   Pobrano ofert: 45
   Nowych: 12
   Zaktualizowanych: 5
   Pominiętych: 28
   Błędów: 0
```

## Rozwiązywanie Problemów

### Brak ofert po imporcie

1. Sprawdź czy serwer ma dostęp do internetu
2. Sprawdź logi serwera
3. Przetestuj API ręcznie: `GET /api/job-offers/search/praca-gov?keyword=spedytor`

### Scheduler nie działa

1. Sprawdź status: `GET /api/job-offers/scheduler/status`
2. Wymuś aktualizację: `POST /api/job-offers/scheduler/force-update`
3. Zrestartuj serwer

### Błędy połączenia z praca.gov.pl

API praca.gov.pl może być czasowo niedostępne. System automatycznie ponowi próbę przy następnej zaplanowanej aktualizacji.

## Źródło Danych

Oferty są pobierane z oficjalnego API portalu ePraca:
- Portal: https://oferty.praca.gov.pl/
- API: https://oferty.praca.gov.pl/portal-api/v3/oferta/wyszukiwanie
- Dokumentacja: https://oferty.praca.gov.pl/portal/dla-integratorow

---

**Uwaga**: System wymaga uprawnień administratora do ręcznego importu i zarządzania schedulerem.

