#!/usr/bin/env python3
"""
Kompresja zdjęć w galerii BCU
"""
import os
from PIL import Image
import sys

# Konfiguracja
QUALITY = 80  # Jakość JPEG (80 = dobra równowaga)
MAX_SIZE = (1920, 1080)  # Maksymalny rozmiar
GALLERY_DIR = 'imgs/galeria'

def compress_image(input_path, output_path):
    """Kompresuje pojedyncze zdjęcie"""
    try:
        # Otwórz obraz
        img = Image.open(input_path)
        
        # Konwertuj RGBA do RGB jeśli potrzeba
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Pobierz oryginalny rozmiar
        original_size = os.path.getsize(input_path)
        original_width, original_height = img.size
        
        # Zmień rozmiar jeśli potrzeba (zachowując proporcje)
        img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        
        # Zapisz skompresowany
        img.save(output_path, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
        
        # Sprawdź nowy rozmiar
        new_size = os.path.getsize(output_path)
        savings = ((1 - new_size / original_size) * 100)
        
        print(f"✓ {os.path.basename(input_path)}")
        print(f"  {original_width}x{original_height} → {img.size[0]}x{img.size[1]}")
        print(f"  {original_size//1024}KB → {new_size//1024}KB ({savings:.1f}% mniej)\n")
        
        return True
    except Exception as e:
        print(f"✗ Błąd: {e}\n")
        return False

def main():
    """Główna funkcja kompresji"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    gallery_path = os.path.join(script_dir, GALLERY_DIR)
    temp_dir = os.path.join(script_dir, 'imgs', 'galeria-temp')
    
    if not os.path.exists(gallery_path):
        print(f"❌ Folder {GALLERY_DIR} nie istnieje!")
        sys.exit(1)
    
    # Utwórz folder tymczasowy
    os.makedirs(temp_dir, exist_ok=True)
    
    # Znajdź wszystkie zdjęcia
    images = [f for f in os.listdir(gallery_path) 
              if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not images:
        print("❌ Nie znaleziono zdjęć w galerii!")
        sys.exit(1)
    
    print(f"\n🖼️  Kompresja {len(images)} zdjęć...\n")
    
    # Kompresuj każde zdjęcie
    success_count = 0
    for filename in images:
        input_path = os.path.join(gallery_path, filename)
        output_filename = os.path.splitext(filename)[0] + '.jpg'
        output_path = os.path.join(temp_dir, output_filename)
        
        if compress_image(input_path, output_path):
            success_count += 1
    
    if success_count == len(images):
        print(f"✅ Wszystkie {success_count} zdjęć skompresowane pomyślnie!")
        print("\n🔄 Zastępowanie oryginalnych plików...")
        
        # Usuń oryginalne pliki
        for filename in images:
            os.remove(os.path.join(gallery_path, filename))
            print(f"  🗑️  Usunięto: {filename}")
        
        # Przenieś skompresowane na miejsce oryginalnych
        for filename in os.listdir(temp_dir):
            src = os.path.join(temp_dir, filename)
            dst = os.path.join(gallery_path, filename)
            os.rename(src, dst)
            print(f"  ✓ Zastąpiono: {filename}")
        
        # Usuń folder tymczasowy
        os.rmdir(temp_dir)
        
        print("\n✅ GOTOWE! Zdjęcia zostały skompresowane i zastąpione.")
    else:
        print(f"\n⚠️  Skompresowano {success_count}/{len(images)} zdjęć")
        print(f"Skompresowane pliki są w: {temp_dir}")
        print("Sprawdź błędy powyżej.")

if __name__ == '__main__':
    main()



