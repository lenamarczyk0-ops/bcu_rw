const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Konfiguracja kompresji
const QUALITY = 80; // 80% jakości (optymalna równowaga jakość/rozmiar)
const MAX_WIDTH = 1920; // Maksymalna szerokość
const MAX_HEIGHT = 1080; // Maksymalna wysokość

async function compressImage(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        
        console.log(`Kompresja: ${path.basename(inputPath)}`);
        console.log(`  Oryginalny rozmiar: ${metadata.width}x${metadata.height}`);
        
        await image
            .resize(MAX_WIDTH, MAX_HEIGHT, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: QUALITY, progressive: true })
            .toFile(outputPath);
        
        const originalSize = fs.statSync(inputPath).size;
        const compressedSize = fs.statSync(outputPath).size;
        const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        
        console.log(`  Oszczędność: ${savings}% (${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB)`);
        console.log('  ✓ Gotowe\n');
    } catch (error) {
        console.error(`  ✗ Błąd: ${error.message}\n`);
    }
}

async function compressGallery() {
    const galleryDir = path.join(__dirname, 'imgs', 'galeria');
    const compressedDir = path.join(__dirname, 'imgs', 'galeria-compressed');
    
    // Utwórz folder dla skompresowanych zdjęć
    if (!fs.existsSync(compressedDir)) {
        fs.mkdirSync(compressedDir, { recursive: true });
    }
    
    // Pobierz wszystkie pliki JPG/JPEG/PNG
    const files = fs.readdirSync(galleryDir)
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    
    console.log(`\n🖼️  Kompresja ${files.length} zdjęć...\n`);
    
    for (const file of files) {
        const inputPath = path.join(galleryDir, file);
        const outputPath = path.join(compressedDir, file.replace(/\.(jpg|jpeg|png)$/i, '.jpg'));
        
        await compressImage(inputPath, outputPath);
    }
    
    console.log('✅ Wszystkie zdjęcia zostały skompresowane!');
    console.log(`📁 Skompresowane zdjęcia znajdziesz w: ${compressedDir}`);
    console.log('\n💡 Następne kroki:');
    console.log('1. Sprawdź jakość zdjęć w folderze galeria-compressed/');
    console.log('2. Jeśli wszystko OK, zamień oryginalny folder galeria/ na galeria-compressed/');
    console.log('3. lub zaktualizuj ścieżki w build.html na galeria-compressed/');
}

// Uruchom kompresję
compressGallery().catch(console.error);





