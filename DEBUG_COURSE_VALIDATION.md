# 🐛 Problem z dodawaniem kursu w panelu admin

## ❗ Błąd: "Błąd zapisywania: Błędy walidacji"

### 🔧 Co zostało poprawione:

#### **1️⃣ Konwersja typów w JavaScript:**
```javascript
// DODANO w admin-panel.html
if (data.weeks) data.weeks = parseInt(data.weeks);
if (data.hours) data.hours = parseInt(data.hours);
if (data.maxParticipants) data.maxParticipants = parseInt(data.maxParticipants);
if (data.price) data.price = parseFloat(data.price);
```

#### **2️⃣ Lepsze debugowanie błędów:**
```javascript
// DODANO szczegółowe logi błędów walidacji
console.error('API Error Response:', errorData);
if (errorData.errors && Array.isArray(errorData.errors)) {
    const validationErrors = errorData.errors.map(err => err.msg || err.message).join(', ');
    errorMessage = 'Błędy walidacji: ' + validationErrors;
}
```

#### **3️⃣ Logi przed wysłaniem:**
```javascript
console.log('Course data before submit:', data);
console.log('URL:', url, 'Method:', method);
```

### 🔍 Jak zdiagnozować problem:

#### **1️⃣ Otwórz Developer Tools (F12)**
#### **2️⃣ Przejdź do zakładki Console**
#### **3️⃣ Spróbuj dodać kurs**
#### **4️⃣ Sprawdź logi:**

**Oczekiwane logi:**
```
Course data before submit: {
  title: "Nazwa kursu",
  excerpt: "Opis kursu", 
  contentHTML: "<p>Treść kursu</p>",
  weeks: 4,           // ✅ NUMBER, nie string
  hours: 30,          // ✅ NUMBER, nie string
  targetGroup: "dorośli",
  maxParticipants: 20, // ✅ NUMBER, nie string
  isActive: true,
  isPaid: false
}
```

### 🎯 Możliwe przyczyny błędów:

#### **❌ Problem 1: Puste wymagane pola**
- **Tytuł** - musi być wypełniony
- **Opis (excerpt)** - musi być wypełniony  
- **Treść HTML** - musi być wypełniona
- **Liczba tygodni** - musi być > 0
- **Liczba godzin** - musi być > 0

#### **❌ Problem 2: Błędne typy danych**
- `weeks` - musi być liczbą całkowitą
- `hours` - musi być liczbą całkowitą
- `maxParticipants` - musi być liczbą całkowitą
- `price` - musi być liczbą zmiennoprzecinkową

#### **❌ Problem 3: Błędne wartości enum**
- `targetGroup` - musi być jedną z: "uczniowie i studenci", "nauczyciele", "dorośli"

### 🚀 Jak przetestować po zmianach:

#### **1️⃣ Odśwież stronę admin panelu**
#### **2️⃣ Otwórz Developer Tools (F12)**
#### **3️⃣ Kliknij "Dodaj kurs"**
#### **4️⃣ Wypełnij WSZYSTKIE wymagane pola:**
- **Tytuł:** "Test Kurs"
- **Opis:** "Opis testowego kursu" 
- **Treść HTML:** "<p>Testowa treść kursu</p>"
- **Liczba tygodni:** 4
- **Liczba godzin:** 30
- **Grupa docelowa:** "dorośli"
- **Max uczestników:** 20

#### **5️⃣ Sprawdź w Console:**
```
Course data before submit: {
  title: "Test Kurs",
  excerpt: "Opis testowego kursu", 
  contentHTML: "<p>Testowa treść kursu</p>",
  weeks: 4,
  hours: 30,
  targetGroup: "dorośli",
  maxParticipants: 20,
  isActive: false,
  isPaid: false
}
```

#### **6️⃣ Jeśli nadal błąd, sprawdź:**
```
API Error Response: {
  message: "Błędy walidacji",
  errors: [
    { msg: "Konkretny błąd walidacji", field: "nazwa_pola" }
  ]
}
```

### 📧 Co robimy dalej:

#### **Jeśli nadal nie działa:**
1. **Skopiuj dokładny błąd** z Console
2. **Sprawdź logi** `Course data before submit`
3. **Sprawdź logi** `API Error Response`
4. **Prześlij screenshoty** błędów

#### **Możliwe kolejne kroki:**
- Sprawdzenie walidacji w backendzie
- Sprawdzenie modelu Course
- Sprawdzenie uprawnień użytkownika
- Sprawdzenie konfiguracji bazy danych

### ✅ Oczekiwany rezultat:

Po poprawkach, dodawanie kursu powinno:
1. **Wyświetlić szczegółowe błędy** zamiast ogólnego "Błędy walidacji"
2. **Konwertować liczby** z stringów na proper types
3. **Pokazać dokładne logi** w Console
4. **Zapisać kurs** bez błędów walidacji
