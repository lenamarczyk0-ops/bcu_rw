const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://mongo:JmKfPSMiNRbXDpCgAgNjBlujlDUATFAT@mongodb.railway.internal:27017/bcu?authSource=admin';

// Import modeli
const User = require('./src/models/User');
const Course = require('./src/models/Course');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function updateCourses() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Połączono z MongoDB przez Mongoose');
    
    // Znajdź admina
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('❌ Nie znaleziono użytkownika admin');
      return;
    }
    console.log('👤 Znaleziono admina:', admin.email);
    
    // Usuń wszystkie stare kursy
    const deleteResult = await Course.deleteMany({});
    console.log(`🗑️  Usunięto ${deleteResult.deletedCount} starych kursów`);
    
    // Nowe kursy
    const courses = [
      {
        title: 'Kody kreskowe i ich rola w zarządzaniu łańcuchem dostaw',
        slug: slugify('Kody kreskowe i ich rola w zarządzaniu łańcuchem dostaw'),
        excerpt: 'Naucz się wykorzystywać kody kreskowe w zarządzaniu magazynem i łańcuchem dostaw. Poznaj różne typy kodów, technologie skanowania i systemy śledzenia.',
        contentHTML: '<h2>Kody kreskowe w zarządzaniu łańcuchem dostaw</h2><p>Kompleksowy kurs dotyczący wykorzystania kodów kreskowych w nowoczesnej logistyce. Poznasz różne standardy kodów, technologie skanowania oraz systemy śledzenia przesyłek.</p><h3>Tematy:</h3><ul><li>Standardy kodów kreskowych (EAN, UPC, Code 128)</li><li>Technologie skanowania i czytniki</li><li>Systemy WMS i integracja</li><li>Optymalizacja procesów magazynowych</li><li>Śledzenie przesyłek w łańcuchu dostaw</li></ul>',
        imageUrl: './imgs/warehouse-worker-checking-inventory-arrived-goods-packages-storage-department.jpg',
        weeks: 4,
        hours: 32,
        duration: '4 tygodnie (32h)',
        targetGroup: 'dorośli',
        maxParticipants: 20,
        price: 1200,
        isPaid: true,
        status: 'published',
        tags: ['kody kreskowe', 'magazyn', 'WMS', 'skanowanie', 'śledzenie'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Jak zarabiać na transporcie? Kosztorysowanie i rozliczanie zleceń',
        slug: slugify('Jak zarabiać na transporcie? Kosztorysowanie i rozliczanie zleceń'),
        excerpt: 'Kompleksowy kurs kalkulacji kosztów transportu. Poznaj metody wyceny zleceń, optymalizacji tras i maksymalizacji zysków w działalności transportowej.',
        contentHTML: '<h2>Kosztorysowanie i rozliczanie w transporcie</h2><p>Praktyczny kurs dotyczący wyceny usług transportowych. Nauczysz się kalkulować koszty, optymalizować trasy oraz maksymalizować zyski z działalności przewozowej.</p><h3>Zagadnienia:</h3><ul><li>Kalkulacja kosztów operacyjnych</li><li>Wycena zleceń transportowych</li><li>Optymalizacja tras i planowanie</li><li>Analiza rentowności i marży</li><li>Rozliczenia z klientami i podwykonawcami</li></ul>',
        imageUrl: './imgs/truck-logistics-operation-dusk.jpg',
        weeks: 6,
        hours: 48,
        duration: '6 tygodni (48h)',
        targetGroup: 'dorośli',
        maxParticipants: 25,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['kosztorysowanie', 'finanse', 'optymalizacja', 'zyski'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Eksport i import ładunków – jak to robić z głową?',
        slug: slugify('Eksport i import ładunków – jak to robić z głową?'),
        excerpt: 'Poznaj procedury międzynarodowego handlu. Dowiedz się o dokumentacji celnej, procedurach eksportowo-importowych i przepisach międzynarodowych.',
        contentHTML: '<h2>Eksport i import ładunków</h2><p>Kompleksowy przewodnik po międzynarodowym handlu towarami. Poznasz procedury celne, wymaganą dokumentację oraz przepisy regulujące handel zagraniczny.</p><h3>Program:</h3><ul><li>Procedury celne i dokumentacja</li><li>Incoterms 2020 w praktyce</li><li>Ubezpieczenia transportowe</li><li>Certyfikaty i licencje</li><li>Rozliczenia walutowe</li></ul>',
        imageUrl: './imgs/transportation-logistics-container-cargo-ship-cargo-plane.jpg',
        weeks: 7,
        hours: 56,
        duration: '7 tygodni (56h)',
        targetGroup: 'dorośli',
        maxParticipants: 20,
        price: 2200,
        isPaid: true,
        status: 'published',
        tags: ['eksport', 'import', 'cło', 'handel zagraniczny'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Automatyzacja i optymalizacja transportu bliskiego w magazynie',
        slug: slugify('Automatyzacja i optymalizacja transportu bliskiego w magazynie'),
        excerpt: 'Nowoczesne rozwiązania automatyzacji w magazynach. Poznaj systemy WMS, roboty magazynowe i technologie optymalizujące przepływ towarów.',
        contentHTML: '<h2>Automatyzacja transportu magazynowego</h2><p>Kurs dotyczący nowoczesnych technologii automatyzacji w magazynach. Poznasz systemy WMS, roboty magazynowe oraz rozwiązania IoT optymalizujące procesy logistyczne.</p><h3>Technologie:</h3><ul><li>Systemy WMS/WCS</li><li>Roboty magazynowe AGV/AMR</li><li>Technologie IoT i sensoryka</li><li>Sztuczna inteligencja w logistyce</li><li>Automatyczne systemy sortowania</li></ul>',
        imageUrl: './imgs/cargo-transport-robot-is-parked-floor-near-shelves-with-merchandise-spacious-warehouse-that-is-lit-night-by-generative-ai.jpg',
        weeks: 5,
        hours: 40,
        duration: '5 tygodni (40h)',
        targetGroup: 'dorośli',
        maxParticipants: 18,
        price: 2000,
        isPaid: true,
        status: 'published',
        tags: ['automatyzacja', 'WMS', 'roboty', 'IoT'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Jak latać bez samolotu? Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        slug: slugify('Jak latać bez samolotu? Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego'),
        excerpt: 'Przyszłość dostaw dronem. Poznaj regulacje prawne, technologie dronów cargo i możliwości wykorzystania BSP w logistyce ostatniej mili.',
        contentHTML: '<h2>Transport dronami w logistyce</h2><p>Innowacyjny kurs o wykorzystaniu dronów w transporcie przesyłek. Poznasz regulacje prawne, technologie BSP oraz praktyczne zastosowania w logistyce ostatniej mili.</p><h3>Zagadnienia:</h3><ul><li>Regulacje prawne ULC i EASA</li><li>Technologie dronów cargo</li><li>Planowanie tras i misji BSP</li><li>Bezpieczeństwo operacji</li><li>Integracja z systemami logistycznymi</li></ul>',
        imageUrl: './imgs/drone-flying-modern-warehouse.jpg',
        weeks: 4,
        hours: 32,
        duration: '4 tygodnie (32h)',
        targetGroup: 'dorośli',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'BSP', 'innowacje', 'ostatnia mila'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Prowadzenie firmy spedycyjnej w zmieniającym się świecie',
        slug: slugify('Prowadzenie firmy spedycyjnej w zmieniającym się świecie'),
        excerpt: 'Zarządzanie firmą spedycyjną w dobie transformacji cyfrowej. Poznaj trendy, wyzwania i strategie rozwoju w nowoczesnej logistyce.',
        contentHTML: '<h2>Prowadzenie firmy spedycyjnej</h2><p>Strategiczny kurs dla przedsiębiorców z branży TSL. Poznasz nowoczesne metody zarządzania, trendy rynkowe oraz strategie adaptacji do zmieniających się warunków biznesowych.</p><h3>Tematy:</h3><ul><li>Transformacja cyfrowa w TSL</li><li>Zarządzanie zmianą organizacyjną</li><li>Strategie rozwoju i ekspansji</li><li>Analiza konkurencji</li><li>Zrównoważony rozwój w logistyce</li></ul>',
        imageUrl: './imgs/transport-logistic-manager-checking-control-logistic-network-distribution-customer.jpg',
        weeks: 8,
        hours: 64,
        duration: '8 tygodni (64h)',
        targetGroup: 'dorośli',
        maxParticipants: 20,
        price: 2400,
        isPaid: true,
        status: 'published',
        tags: ['zarządzanie', 'strategia', 'rozwój', 'cyfryzacja'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Prawidłowa realizacja obrotu towarowego z zagranicą – export/import',
        slug: slugify('Prawidłowa realizacja obrotu towarowego z zagranicą – export/import'),
        excerpt: 'Procedury prawne handlu zagranicznego. Poznaj dokumentację celną, certyfikaty, procedury VAT i compliance w handlu międzynarodowym.',
        contentHTML: '<h2>Realizacja obrotu z zagranicą</h2><p>Szczegółowy kurs procedur prawnych w handlu zagranicznym. Poznasz wymagania dokumentacyjne, procedury celne oraz aspekty prawno-podatkowe handlu międzynarodowego.</p><h3>Procedury:</h3><ul><li>Dokumentacja celna i handlowa</li><li>Procedury VAT w UE i poza UE</li><li>Certyfikaty pochodzenia</li><li>Compliance i audyty celne</li><li>Procedury uprzywilejowane</li></ul>',
        imageUrl: './imgs/courier-with-delivery-cardboard-box-by-car.jpg',
        weeks: 6,
        hours: 48,
        duration: '6 tygodni (48h)',
        targetGroup: 'dorośli',
        maxParticipants: 22,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['prawo', 'export', 'import', 'dokumentacja'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Dobór urządzeń do mechanizacji prac ładunkowych',
        slug: slugify('Dobór urządzeń do mechanizacji prac ładunkowych'),
        excerpt: 'Wybór i eksploatacja sprzętu do prac ładunkowych. Poznaj różne typy urządzeń, kryteria doboru i zasady bezpiecznej eksploatacji.',
        contentHTML: '<h2>Mechanizacja prac ładunkowych</h2><p>Praktyczny kurs dotyczący doboru i eksploatacji urządzeń do prac ładunkowych. Poznasz różne typy sprzętu, kryteria ekonomiczne wyboru oraz zasady bezpiecznego użytkowania.</p><h3>Urządzenia:</h3><ul><li>Wózki widłowe i ich typy</li><li>Suwnice i żurawie</li><li>Przenośniki i transportery</li><li>Systemy automatyczne</li><li>Analiza kosztów eksploatacji</li></ul>',
        imageUrl: './imgs/suwnica2.jpg',
        weeks: 5,
        hours: 40,
        duration: '5 tygodni (40h)',
        targetGroup: 'dorośli',
        maxParticipants: 20,
        price: 1700,
        isPaid: true,
        status: 'published',
        tags: ['mechanizacja', 'sprzęt', 'wózki widłowe', 'bezpieczeństwo'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Harmonogramowanie czynności manipulacyjnych w magazynie',
        slug: slugify('Harmonogramowanie czynności manipulacyjnych w magazynie'),
        excerpt: 'Optymalizacja procesów magazynowych. Naucz się planowania pracy, zarządzania zasobami i harmonogramowania operacji w magazynie.',
        contentHTML: '<h2>Harmonogramowanie w magazynie</h2><p>Kurs optymalizacji procesów magazynowych poprzez skuteczne planowanie i harmonogramowanie. Poznasz metody organizacji pracy i zarządzania zasobami ludzkimi i technicznymi.</p><h3>Zagadnienia:</h3><ul><li>Planowanie operacji magazynowych</li><li>Zarządzanie zasobami ludzkimi</li><li>Optymalizacja przepływów towarowych</li><li>KPI w magazynie</li><li>Systemy planowania zasobów</li></ul>',
        imageUrl: './imgs/warehouse-operative-checking-purchase-order.jpg',
        weeks: 4,
        hours: 32,
        duration: '4 tygodnie (32h)',
        targetGroup: 'dorośli',
        maxParticipants: 25,
        price: 1400,
        isPaid: true,
        status: 'published',
        tags: ['harmonogramowanie', 'planowanie', 'optymalizacja', 'KPI'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Automatyczna identyfikacja ładunków w procesie komisjonowania przesyłek',
        slug: slugify('Automatyczna identyfikacja ładunków w procesie komisjonowania przesyłek'),
        excerpt: 'Nowoczesne technologie identyfikacji w komisjonowaniu. Poznaj systemy RFID, kody QR i inne technologie automatycznej identyfikacji.',
        contentHTML: '<h2>Automatyczna identyfikacja ładunków</h2><p>Zaawansowany kurs technologii automatycznej identyfikacji w procesach magazynowych. Poznasz systemy RFID, kody QR oraz inne nowoczesne rozwiązania wspierające komisjonowanie.</p><h3>Technologie:</h3><ul><li>Systemy RFID i NFC</li><li>Kody QR i DataMatrix</li><li>Systemy pick-by-light/voice</li><li>Technologie wizyjne</li><li>Integracja z systemami WMS</li></ul>',
        imageUrl: './imgs/happy-employee-holding-scanner-distribution-warehouse.jpg',
        weeks: 5,
        hours: 40,
        duration: '5 tygodni (40h)',
        targetGroup: 'dorośli',
        maxParticipants: 18,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['RFID', 'identyfikacja', 'komisjonowanie', 'automatyzacja'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Planowanie czynności manipulacyjnych podczas przeładunku',
        slug: slugify('Planowanie czynności manipulacyjnych podczas przeładunku'),
        excerpt: 'Efektywne zarządzanie operacjami przeładunkowymi. Poznaj metody planowania, optymalizacji i koordynacji prac przeładunkowych.',
        contentHTML: '<h2>Planowanie operacji przeładunkowych</h2><p>Kompleksowy kurs zarządzania operacjami przeładunkowymi. Nauczysz się planować, koordynować i optymalizować procesy przeładunku w różnych typach terminali.</p><h3>Operacje:</h3><ul><li>Planowanie przeładunków</li><li>Koordynacja zespołów roboczych</li><li>Optymalizacja czasów operacji</li><li>Zarządzanie zasobami sprzętowymi</li><li>Bezpieczeństwo prac przeładunkowych</li></ul>',
        imageUrl: './imgs/medium-shot-smiley-man-warehouse.jpg',
        weeks: 4,
        hours: 32,
        duration: '4 tygodnie (32h)',
        targetGroup: 'dorośli',
        maxParticipants: 22,
        price: 1500,
        isPaid: true,
        status: 'published',
        tags: ['przeładunek', 'planowanie', 'koordynacja', 'terminale'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        slug: slugify('Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego'),
        excerpt: 'Praktyczne wykorzystanie dronów w dostawach. Poznaj procedury operacyjne, planowanie misji i zarządzanie flotą dronów dostawczych.',
        contentHTML: '<h2>Transport dronami - aspekty praktyczne</h2><p>Praktyczny kurs operacji transportowych z wykorzystaniem dronów. Poznasz procedury planowania misji, zarządzanie flotą BSP oraz aspekty ekonomiczne dostaw dronami.</p><h3>Operacje:</h3><ul><li>Planowanie misji BSP</li><li>Zarządzanie flotą dronów</li><li>Analiza ekonomiczna dostaw</li><li>Integracja z systemami logistycznymi</li><li>Monitoring i kontrola operacji</li></ul>',
        imageUrl: './imgs/white-truck-delivery-shipping-service-3d-rendering.jpg',
        weeks: 5,
        hours: 40,
        duration: '5 tygodni (40h)',
        targetGroup: 'dorośli',
        maxParticipants: 16,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'dostawy', 'planowanie misji', 'flota'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Język angielski w spedycji',
        slug: slugify('Język angielski w spedycji'),
        excerpt: 'Angielski specjalistyczny dla branży TSL. Poznaj terminologię, dokumentację i komunikację w języku angielskim w międzynarodowej logistyce.',
        contentHTML: '<h2>Język angielski w spedycji</h2><p>Specjalistyczny kurs języka angielskiego dla pracowników branży TSL. Poznasz terminologię spedycyjną, dokumentację międzynarodową oraz komunikację biznesową w języku angielskim.</p><h3>Zakres:</h3><ul><li>Terminologia spedycyjna po angielsku</li><li>Dokumentacja handlowa międzynarodowa</li><li>Korespondencja biznesowa</li><li>Negocjacje w j. angielskim</li><li>Komunikacja telefoniczna</li></ul>',
        imageUrl: './imgs/medium-shot-woman-with-tablet.jpg',
        weeks: 8,
        hours: 64,
        duration: '8 tygodni (64h)',
        targetGroup: 'dorośli',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język angielski', 'terminologia', 'komunikacja', 'spedycja'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Język niemiecki w spedycji',
        slug: slugify('Język niemiecki w spedycji'),
        excerpt: 'Niemiecki specjalistyczny dla logistyki. Naucz się komunikacji z partnerami niemieckimi, terminologii i dokumentacji w języku niemieckim.',
        contentHTML: '<h2>Język niemiecki w spedycji</h2><p>Kurs języka niemieckiego dedykowany branży logistycznej. Poznasz terminologię spedycyjną, dokumentację oraz skuteczną komunikację z partnerami niemieckimi w branży TSL.</p><h3>Program:</h3><ul><li>Terminologia logistyczna po niemiecku</li><li>Dokumentacja spedycyjna</li><li>Komunikacja telefoniczna i mailowa</li><li>Kultura biznesowa niemiecka</li><li>Negocjacje z partnerami niemieckimi</li></ul>',
        imageUrl: './imgs/medium-shot-woman-storage.jpg',
        weeks: 8,
        hours: 64,
        duration: '8 tygodni (64h)',
        targetGroup: 'dorośli',
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język niemiecki', 'komunikacja', 'partnerzy', 'kultura biznesowa'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Branżowy język polski jako język obcy',
        slug: slugify('Branżowy język polski jako język obcy'),
        excerpt: 'Polski język specjalistyczny dla cudzoziemców w TSL. Kurs dedykowany pracownikom zagranicznym w polskiej branży transportowo-spedycyjnej.',
        contentHTML: '<h2>Polski język branżowy dla cudzoziemców</h2><p>Specjalistyczny kurs języka polskiego dla pracowników zagranicznych w branży TSL. Program obejmuje terminologię branżową, komunikację zawodową oraz kulturę pracy w Polsce.</p><h3>Elementy:</h3><ul><li>Terminologia TSL po polsku</li><li>Komunikacja zawodowa w Polsce</li><li>Dokumentacja polska</li><li>Kultura pracy w Polsce</li><li>Procedury prawne w języku polskim</li></ul>',
        imageUrl: './imgs/woman-safety-equipment-working.jpg',
        weeks: 10,
        hours: 80,
        duration: '10 tygodni (80h)',
        targetGroup: 'dorośli',
        maxParticipants: 12,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['język polski', 'cudzoziemcy', 'integracja', 'kultura pracy'],
        author: admin._id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Dodaj nowe kursy przez Mongoose
    const createdCourses = [];
    for (const courseData of courses) {
      const course = new Course(courseData);
      const savedCourse = await course.save();
      createdCourses.push(savedCourse);
    }
    
    console.log(`✅ Dodano ${createdCourses.length} nowych kursów`);
    
    // Wyświetl dodane kursy
    console.log('\n📚 Dodane kursy:');
    createdCourses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.title} (${course.weeks} tyg. / ${course.hours}h)`);
    });
    
  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Połączenie zamknięte');
  }
}

updateCourses().catch(console.error);
