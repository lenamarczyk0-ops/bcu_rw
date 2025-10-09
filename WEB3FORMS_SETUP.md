# 📧 Konfiguracja Web3Forms - Instrukcja

## 🚀 Krok po kroku

### 1️⃣ Uzyskaj Access Key

1. **Wejdź na:** https://web3forms.com
2. **Kliknij "Get Started Free"**
3. **Wpisz email:** `sekretariat@bcu-spedycja.pl`
4. **Sprawdź skrzynkę email** `sekretariat@bcu-spedycja.pl`
5. **Skopiuj Access Key** z emaila (wygląda jak: `abc123-def456-ghi789`)

### 2️⃣ Dodaj Access Key do kodu

1. **Otwórz plik:** `build.html`
2. **Znajdź linię ~1154:**
   ```html
   <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE">
   ```
3. **Zamień** `YOUR_ACCESS_KEY_HERE` na swój prawdziwy Access Key:
   ```html
   <input type="hidden" name="access_key" value="abc123-def456-ghi789">
   ```

### 3️⃣ Wypchnij zmiany na GitHub

```bash
git add .
git commit -m "Add Web3Forms for contact form"
git push origin main
```

### 4️⃣ Railway automatycznie wdroży zmiany

✅ Railway wykryje nowy commit i wdroży aktualizację automatycznie.

---

## ✅ Co zostało zmienione?

### Formularz kontaktowy (`build.html`):
- ✅ Używa Web3Forms API zamiast własnego backendu
- ✅ Wysyła maile na `sekretariat@bcu-spedycja.pl`
- ✅ Posiada ochronę antyspamową (honeypot)
- ✅ Automatyczny temat emaila: `[BCU SPEDYCJA] {wybrany temat}`

### Pola formularza:
- **name** - Imię i nazwisko
- **email** - Email nadawcy
- **phone** - Telefon (opcjonalne)
- **topic** - Temat (wybór z listy)
- **message** - Wiadomość

### Email jaki otrzymasz:
```
Od: Formularz kontaktowy BCU SPEDYCJA
Do: sekretariat@bcu-spedycja.pl
Temat: [BCU SPEDYCJA] Pytanie o kursy

Imię i nazwisko: Jan Kowalski
Email: jan@example.com
Telefon: +48 123 456 789
Temat: Pytanie o kursy

Wiadomość:
[treść wiadomości...]
```

---

## 🔧 Konfiguracja Web3Forms (opcjonalna)

Po zalogowaniu na https://web3forms.com możesz:

1. **Zmienić email docelowy** - domyślnie: `sekretariat@bcu-spedycja.pl`
2. **Dodać więcej emaili** - wyślij kopię do kilku adresów
3. **Ustawić auto-reply** - automatyczna odpowiedź dla nadawcy
4. **Włączyć webhook** - powiadomienia w Slack/Discord
5. **Zobaczyć statystyki** - ile formularzy zostało wysłanych

---

## ❓ FAQ

**Q: Czy Web3Forms jest darmowe?**  
A: Tak! 250 wiadomości miesięcznie za darmo.

**Q: Co jeśli przekroczę limit?**  
A: Web3Forms wysyła powiadomienie. Możesz dokupić więcej lub przejść na inny plan.

**Q: Czy maile mogą trafić do SPAM?**  
A: Nie, Web3Forms używa zweryfikowanych serwerów SMTP.

**Q: Jak mogę przetestować formularz?**  
A: Po wdrożeniu na Railway, wypełnij formularz kontaktowy i sprawdź skrzynkę `sekretariat@bcu-spedycja.pl`.

---

## 🆘 Wsparcie

Jeśli coś nie działa:
1. Sprawdź czy Access Key jest poprawnie wklejony
2. Sprawdź logi Railway: `railway logs`
3. Sprawdź console przeglądarki (F12) czy są błędy
4. Zweryfikuj email na Web3Forms.com

---

## 📝 Alternatywy

Jeśli Web3Forms nie działa, możesz użyć:
- **Formspree** - https://formspree.io
- **Getform** - https://getform.io
- **Basin** - https://usebasin.com

Wszystkie działają podobnie jak Web3Forms.

