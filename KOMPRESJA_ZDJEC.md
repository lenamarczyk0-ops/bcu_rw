# 📸 Instrukcja Kompresji Zdjęć w Galerii

## 🚀 Metoda 1: Automatyczna (Zalecana)

### Krok 1: Zainstaluj zależności
```bash
cd /Users/adamniewalda/Downloads/bcu_rw-main
npm install
```

### Krok 2: Uruchom skrypt kompresji
```bash
node compress-images.js
```

Skrypt:
- ✅ Skompresuje wszystkie zdjęcia z `imgs/galeria/` do jakości 80%
- ✅ Zmniejszy rozmiar do max 1920x1080px
- ✅ Zapisze w `imgs/galeria-compressed/`
- ✅ Pokaże oszczędności rozmiaru dla każdego zdjęcia

### Krok 3: Zastąp oryginalne zdjęcia
```bash
# Backup oryginalnych (opcjonalnie)
mv imgs/galeria imgs/galeria-original

# Użyj skompresowanych
mv imgs/galeria-compressed imgs/galeria
```

---

## 🌐 Metoda 2: Online (bez instalacji)

Jeśli nie chcesz instalować Node.js:

### Narzędzia online:
1. **TinyPNG** - https://tinypng.com/
   - Przeciągnij wszystkie 10 zdjęć z `imgs/galeria/`
   - Pobierz skompresowane
   - Zamień oryginalne pliki

2. **Compressor.io** - https://compressor.io/
   - Wysoka jakość przy małym rozmiarze
   - Po jednym zdjęciu na raz

3. **Squoosh** - https://squoosh.app/
   - Google'owe narzędzie
   - Pełna kontrola nad jakością

---

## 🖥️ Metoda 3: ImageMagick (dla zaawansowanych)

### macOS (z Homebrew):
```bash
brew install imagemagick

cd imgs/galeria
mkdir ../galeria-compressed

for img in *.jpg; do
  convert "$img" -quality 80 -resize 1920x1080\> "../galeria-compressed/$img"
  echo "Skompresowano: $img"
done
```

---

## 📊 Oczekiwane rezultaty

| Przed | Po | Oszczędność |
|-------|-----|-------------|
| ~3-8 MB/zdjęcie | ~300-800 KB/zdjęcie | 80-90% |
| Długie ładowanie | Szybkie ładowanie | 5-10x szybciej |

---

## ✅ Sprawdzanie wyniku

Po kompresji:
1. Otwórz stronę w przeglądarce
2. Przejdź do sekcji "NASZA GALERIA"
3. Sprawdź czy:
   - ✅ Zdjęcia ładują się szybko
   - ✅ Jakość jest akceptowalna
   - ✅ Karuzela działa płynnie
   - ✅ Lightbox (powiększenie) działa

---

## 🔧 Dodatkowe optymalizacje

### 1. Lazy Loading (już dodane)
```html
<img src="..." loading="lazy">
```
✅ Zdjęcia ładują się tylko gdy są widoczne

### 2. WebP Format (opcjonalnie)
Jeszcze lepsza kompresja (~30% mniej niż JPEG):
```bash
# Konwersja do WebP
for img in *.jpg; do
  cwebp -q 80 "$img" -o "${img%.jpg}.webp"
done
```

Wtedy zaktualizuj HTML:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="...">
</picture>
```

---

## ❓ Problemy?

### Błąd: "sharp not found"
```bash
npm install sharp --save-dev
```

### Błąd: "Cannot find module"
```bash
cd /Users/adamniewalda/Downloads/bcu_rw-main
npm install
```

### Zdjęcia nadal duże?
- Zmniejsz QUALITY w `compress-images.js` (np. do 70)
- Zmniejsz MAX_WIDTH i MAX_HEIGHT (np. do 1600x900)
- Uruchom ponownie: `node compress-images.js`

---

## 📝 Notatki

- **Nie kompresuj PNG logo** - tylko zdjęcia w galerii
- **Zachowaj backup** oryginalnych zdjęć na wszelki wypadek
- **Testuj na telefonie** - tam widać największą różnicę w szybkości

