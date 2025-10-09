# Konfiguracja Email dla Formularza Kontaktowego

## 📧 Wymagana konfiguracja na Railway

Aby formularz kontaktowy działał poprawnie na Railway, należy skonfigurować zmienne środowiskowe dla wysyłania emaili.

### 🔧 Opcja 1: Gmail (Najprostsze)

1. **Przejdź do Railway Dashboard → Variables**
2. **Dodaj następujące zmienne:**

```
GMAIL_USER=twoj-email@gmail.com
GMAIL_PASS=twoje-haslo-aplikacji
```

3. **Wygeneruj hasło aplikacji Gmail:**
   - Idź do [Google Account Security](https://myaccount.google.com/security)
   - Włącz "2-Step Verification"
   - Przejdź do "App passwords"
   - Wybierz "Mail" i "Other (Custom name)"
   - Wpisz "BCU SPEDYCJA"
   - Skopiuj wygenerowane hasło (16 znaków)
   - Użyj tego hasła jako `GMAIL_PASS`

### 🔧 Opcja 2: SMTP (Profesjonalne)

Jeśli masz serwer SMTP (np. od dostawcy hostingu):

```
SMTP_HOST=mail.twoja-domena.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sekretariat@bcu-spedycja.pl
SMTP_PASS=haslo-do-skrzynki
```

### 🔧 Opcja 3: SendGrid (Zalecane dla produkcji)

1. **Załóż konto na [SendGrid](https://sendgrid.com/)**
2. **Dodaj zmienne:**

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=twoj-sendgrid-api-key
```

## 🚀 Wdrożenie

1. **Ustaw zmienne środowiskowe na Railway**
2. **Zrestartuj aplikację**
3. **Przetestuj formularz na https://app.bcu-spedycja.pl/#kontakt**

## 🧪 Testowanie

W trybie development (bez konfiguracji SMTP), system automatycznie użyje Ethereal Email (test):
- Emaile nie będą wysyłane na prawdziwe adresy
- W konsoli pojawi się link do podglądu emaila
- To pozwala na testowanie bez prawdziwego SMTP

## 📝 Funkcjonalności

### ✅ Co działa:
- **Walidacja formularza** - sprawdza wymagane pola
- **Zabezpieczenia** - ochrona przed spamem
- **HTML Templates** - profesjonalne szablony emaili
- **Auto-Reply** - możliwość odpowiedzi na email nadawcy
- **Responsywny design** - działa na wszystkich urządzeniach
- **Statusy** - informacje o sukcesie/błędzie

### 📧 Format emaila:
- **Do:** sekretariat@bcu-spedycja.pl
- **Od:** dane z formularza
- **Temat:** [BCU SPEDYCJA] + temat z formularza
- **Reply-To:** email nadawcy (łatwa odpowiedź)
- **Content:** HTML + plain text

## 🔒 Bezpieczeństwo

- **Express-validator** - walidacja danych
- **Escape HTML** - ochrona przed XSS
- **Rate limiting** - ochrona przed spamem
- **IP tracking** - logowanie adresów IP
- **Error handling** - bezpieczne obsługiwanie błędów

## 🎯 Użycie

Formularz dostępny pod:
- **https://app.bcu-spedycja.pl/#kontakt** (strona główna)
- **Linki "Kontakt"** w menu wszystkich stron

### Pola formularza:
- **Imię i nazwisko*** (wymagane)
- **Email*** (wymagane)
- **Telefon** (opcjonalne)
- **Temat*** (wymagane - dropdown)
- **Wiadomość*** (wymagane)
- **Zgoda RODO*** (wymagane)

## ❗ Ważne

**Po skonfigurowaniu zmiennych środowiskowych na Railway, nie zapomnij zrestartować aplikacji!**
