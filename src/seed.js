require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: process.env.ADMIN_EMAIL 
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Create admin user
    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      firstName: 'Administrator',
      lastName: 'Systemu',
      role: 'admin',
      isActive: true,
      isVerified: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
    console.log(`   Role: ${admin.role}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

const seedSampleData = async () => {
  try {
    // Create sample users
    const sampleUsers = [
      {
        email: 'wykladowca@bcu-spedycja.pl',
        password: 'Wykladowca123!',
        firstName: 'Jan',
        lastName: 'Kowalski',
        role: 'wykladowca',
        isActive: true,
        isVerified: true
      },
      {
        email: 'redaktor@bcu-spedycja.pl',
        password: 'Redaktor123!',
        firstName: 'Anna',
        lastName: 'Nowak',
        role: 'redaktor',
        isActive: true,
        isVerified: true
      },
      {
        email: 'pracodawca@bcu-spedycja.pl',
        password: 'Pracodawca123!',
        firstName: 'Piotr',
        lastName: 'Wiśniewski',
        role: 'pracodawca',
        companyName: 'Logistics Solutions Sp. z o.o.',
        isActive: true,
        isVerified: true
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Sample user created: ${user.email} (${user.role})`);
      } else {
        console.log(`ℹ️  Sample user already exists: ${userData.email}`);
      }
    }

  } catch (error) {
    console.error('Error creating sample users:', error);
  }
};

const seedCourses = async () => {
  try {
    // Get admin user to assign as author
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('⚠️  No admin user found, skipping course seeding');
      return;
    }

    // Remove all existing courses
    await Course.deleteMany({});
    console.log('🗑️  Removed all existing courses');

    const courses = [
      {
        title: 'Marketing firmy transportowej',
        excerpt: 'Poznaj nowoczesne strategie marketingowe dla firm transportowych. Dowiedz się jak skutecznie promować usługi logistyczne i budować markę w branży TSL.',
        contentHTML: '<h2>Marketing firmy transportowej</h2><p>Ten kurs dotyczy nowoczesnych strategii marketingowych dedykowanych firmom transportowym. Poznasz techniki promocji usług logistycznych, budowania marki oraz skutecznego dotarcia do klientów w branży TSL.</p><h3>Program kursu:</h3><ul><li>Analiza rynku transportowego</li><li>Strategie marketingu cyfrowego</li><li>Budowanie relacji z klientami</li><li>Marketing usług logistycznych</li></ul>',
        imageUrl: './imgs/transport-logistics-concept.jpg',
        startDate: new Date('2025-02-15'),
        duration: '40 godzin',
        targetGroup: 'uczniowie i studenci',
        hours: 15,
        maxParticipants: 25,
        price: 1500,
        isPaid: true,
        status: 'published',
        tags: ['marketing', 'transport', 'logistyka', 'promocja'],
        author: admin._id
      },
      {
        title: 'Kody kreskowe i ich rola w zarządzaniu łańcuchem dostaw',
        excerpt: 'Naucz się wykorzystywać kody kreskowe w zarządzaniu magazynem i łańcuchem dostaw. Poznaj różne typy kodów, technologie skanowania i systemy śledzenia.',
        contentHTML: '<h2>Kody kreskowe w zarządzaniu łańcuchem dostaw</h2><p>Kompleksowy kurs dotyczący wykorzystania kodów kreskowych w nowoczesnej logistyce. Poznasz różne standardy kodów, technologie skanowania oraz systemy śledzenia przesyłek.</p><h3>Tematy:</h3><ul><li>Standardy kodów kreskowych</li><li>Technologie skanowania</li><li>Systemy WMS</li><li>Optymalizacja procesów magazynowych</li></ul>',
        imageUrl: './imgs/warehouse-worker-checking-inventory-arrived-goods-packages-storage-department.jpg',
        startDate: new Date('2025-02-20'),
        duration: '32 godziny',
        targetGroup: 'uczniowie i studenci',
        hours: 15,
        maxParticipants: 20,
        price: 1200,
        isPaid: true,
        status: 'published',
        tags: ['kody kreskowe', 'magazyn', 'WMS', 'skanowanie'],
        author: admin._id
      },
      {
        title: 'Jak zarabiać na transporcie? Kosztorysowanie i rozliczanie zleceń',
        excerpt: 'Kompleksowy kurs kalkulacji kosztów transportu. Poznaj metody wyceny zleceń, optymalizacji tras i maksymalizacji zysków w działalności transportowej.',
        contentHTML: '<h2>Kosztorysowanie i rozliczanie w transporcie</h2><p>Praktyczny kurs dotyczący wyceny usług transportowych. Nauczysz się kalkulować koszty, optymalizować trasy oraz maksymalizować zyski z działalności przewozowej.</p><h3>Zagadnienia:</h3><ul><li>Kalkulacja kosztów operacyjnych</li><li>Wycena zleceń transportowych</li><li>Optymalizacja tras</li><li>Analiza rentowności</li></ul>',
        imageUrl: './imgs/truck-logistics-operation-dusk.jpg',
        startDate: new Date('2025-03-01'),
        duration: '48 godzin',
        targetGroup: 'uczniowie i studenci',
        hours: 15,
        maxParticipants: 30,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['kosztorysowanie', 'finanse', 'optymalizacja', 'zyski'],
        author: admin._id
      },
      {
        title: 'Eksport i import ładunków – jak to robić z głową?',
        excerpt: 'Poznaj procedury międzynarodowego handlu. Dowiedz się o dokumentacji celnej, procedurach eksportowo-importowych i przepisach międzynarodowych.',
        contentHTML: '<h2>Eksport i import ładunków</h2><p>Kompleksowy przewodnik po międzynarodowym handlu towarami. Poznasz procedury celne, wymaganą dokumentację oraz przepisy regulujące handel zagraniczny.</p><h3>Program:</h3><ul><li>Procedury celne</li><li>Dokumentacja handlu zagranicznego</li><li>Incoterms 2020</li><li>Ubezpieczenia transportowe</li></ul>',
        imageUrl: './imgs/transportation-logistics-container-cargo-ship-cargo-plane.jpg',
        startDate: new Date('2025-03-10'),
        duration: '56 godzin',
        targetGroup: 'uczniowie i studenci',
        hours: 15,
        maxParticipants: 25,
        price: 2200,
        isPaid: true,
        status: 'published',
        tags: ['eksport', 'import', 'cło', 'handel zagraniczny'],
        author: admin._id
      },
      {
        title: 'Automatyzacja i optymalizacja transportu bliskiego w magazynie',
        excerpt: 'Nowoczesne rozwiązania automatyzacji w magazynach. Poznaj systemy WMS, roboty magazynowe i technologie optymalizujące przepływ towarów.',
        contentHTML: '<h2>Automatyzacja transportu magazynowego</h2><p>Kurs dotyczący nowoczesnych technologii automatyzacji w magazynach. Poznasz systemy WMS, roboty magazynowe oraz rozwiązania IoT optymalizujące procesy logistyczne.</p><h3>Technologie:</h3><ul><li>Systemy WMS/WCS</li><li>Roboty magazynowe AGV</li><li>Technologie IoT</li><li>Sztuczna inteligencja w logistyce</li></ul>',
        imageUrl: './imgs/cargo-transport-robot-is-parked-floor-near-shelves-with-merchandise-spacious-warehouse-that-is-lit-night-by-generative-ai.jpg',
        startDate: new Date('2025-03-15'),
        duration: '44 godzin',
        targetGroup: 'nauczyciele',
        hours: 15,
        maxParticipants: 20,
        price: 2000,
        isPaid: true,
        status: 'published',
        tags: ['automatyzacja', 'WMS', 'roboty', 'IoT'],
        author: admin._id
      },
      {
        title: 'Jak latać bez samolotu? Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        excerpt: 'Przyszłość dostaw dronem. Poznaj regulacje prawne, technologie dronów cargo i możliwości wykorzystania BSP w logistyce ostatniej mili.',
        contentHTML: '<h2>Transport dronami w logistyce</h2><p>Innowacyjny kurs o wykorzystaniu dronów w transporcie przesyłek. Poznasz regulacje prawne, technologie BSP oraz praktyczne zastosowania w logistyce ostatniej mili.</p><h3>Zagadnienia:</h3><ul><li>Regulacje prawne ULC</li><li>Technologie dronów cargo</li><li>Planowanie tras BSP</li><li>Bezpieczeństwo operacji</li></ul>',
        imageUrl: './imgs/drone-flying-modern-warehouse.jpg',
        startDate: new Date('2025-03-25'),
        duration: '36 godzin',
        targetGroup: 'nauczyciele',
        hours: 15,
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'BSP', 'innowacje', 'ostatnia mila'],
        author: admin._id
      },
      {
        title: 'Prowadzenie firmy spedycyjnej w zmieniającym się świecie',
        excerpt: 'Zarządzanie firmą spedycyjną w dobie transformacji cyfrowej. Poznaj trendy, wyzwania i strategie rozwoju w nowoczesnej logistyce.',
        contentHTML: '<h2>Prowadzenie firmy spedycyjnej</h2><p>Strategiczny kurs dla przedsiębiorców z branży TSL. Poznasz nowoczesne metody zarządzania, trendy rynkowe oraz strategie adaptacji do zmieniających się warunków biznesowych.</p><h3>Tematy:</h3><ul><li>Transformacja cyfrowa w TSL</li><li>Zarządzanie zmianą</li><li>Strategie rozwoju</li><li>Analiza konkurencji</li></ul>',
        imageUrl: './imgs/transport-logistic-manager-checking-control-logistic-network-distribution-customer.jpg',
        startDate: new Date('2025-04-01'),
        duration: '52 godzin',
        targetGroup: 'dorośli',
        hours: 120,
        maxParticipants: 30,
        price: 2400,
        isPaid: true,
        status: 'published',
        tags: ['zarządzanie', 'strategia', 'rozwój', 'cyfryzacja'],
        author: admin._id
      },
      {
        title: 'Prawidłowa realizacja obrotu towarowego z zagranicą – export/import',
        excerpt: 'Procedury prawne handlu zagranicznego. Poznaj dokumentację celną, certyfikaty, procedury VAT i compliance w handlu międzynarodowym.',
        contentHTML: '<h2>Realizacja obrotu z zagranicą</h2><p>Szczegółowy kurs procedur prawnych w handlu zagranicznym. Poznasz wymagania dokumentacyjne, procedury celne oraz aspekty prawno-podatkowe handlu międzynarodowego.</p><h3>Procedury:</h3><ul><li>Dokumentacja celna</li><li>Procedury VAT w UE</li><li>Certyfikaty pochodzenia</li><li>Compliance i audyty</li></ul>',
        imageUrl: './imgs/courier-with-delivery-cardboard-box-by-car.jpg',
        startDate: new Date('2025-04-10'),
        duration: '48 godzin',
        targetGroup: 'dorośli',
        hours: 120,
        maxParticipants: 25,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['prawo', 'export', 'import', 'dokumentacja'],
        author: admin._id
      },
      {
        title: 'Dobór urządzeń do mechanizacji prac ładunkowych',
        excerpt: 'Wybór i eksploatacja sprzętu do prac ładunkowych. Poznaj różne typy urządzeń, kryteria doboru i zasady bezpiecznej eksploatacji.',
        contentHTML: '<h2>Mechanizacja prac ładunkowych</h2><p>Praktyczny kurs dotyczący doboru i eksploatacji urządzeń do prac ładunkowych. Poznasz różne typy sprzętu, kryteria ekonomiczne wyboru oraz zasady bezpiecznego użytkowania.</p><h3>Urządzenia:</h3><ul><li>Wózki widłowe</li><li>Suwnice i żurawie</li><li>Przenośniki</li><li>Systemy automatyczne</li></ul>',
        imageUrl: './imgs/suwnica2.jpg',
        startDate: new Date('2025-04-20'),
        duration: '40 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 20,
        price: 1700,
        isPaid: true,
        status: 'published',
        tags: ['mechanizacja', 'sprzęt', 'wózki widłowe', 'bezpieczeństwo'],
        author: admin._id
      },
      {
        title: 'Harmonogramowanie czynności manipulacyjnych w magazynie',
        excerpt: 'Optymalizacja procesów magazynowych. Naucz się planowania pracy, zarządzania zasobami i harmonogramowania operacji w magazynie.',
        contentHTML: '<h2>Harmonogramowanie w magazynie</h2><p>Kurs optymalizacji procesów magazynowych poprzez skuteczne planowanie i harmonogramowanie. Poznasz metody organizacji pracy i zarządzania zasobami ludzkimi i technicznymi.</p><h3>Zagadnienia:</h3><ul><li>Planowanie operacji magazynowych</li><li>Zarządzanie zasobami</li><li>Optymalizacja przepływów</li><li>KPI w magazynie</li></ul>',
        imageUrl: './imgs/warehouse-operative-checking-purchase-order.jpg',
        startDate: new Date('2025-05-01'),
        duration: '36 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 25,
        price: 1400,
        isPaid: true,
        status: 'published',
        tags: ['harmonogramowanie', 'planowanie', 'optymalizacja', 'KPI'],
        author: admin._id
      },
      {
        title: 'Automatyczna identyfikacja ładunków w procesie komisjonowania przesyłek',
        excerpt: 'Nowoczesne technologie identyfikacji w komisjonowaniu. Poznaj systemy RFID, kody QR i inne technologie automatycznej identyfikacji.',
        contentHTML: '<h2>Automatyczna identyfikacja ładunków</h2><p>Zaawansowany kurs technologii automatycznej identyfikacji w procesach magazynowych. Poznasz systemy RFID, kody QR oraz inne nowoczesne rozwiązania wspierające komisjonowanie.</p><h3>Technologie:</h3><ul><li>Systemy RFID</li><li>Kody QR i DataMatrix</li><li>Technologie NFC</li><li>Systemy pick-by-light</li></ul>',
        imageUrl: './imgs/happy-employee-holding-scanner-distribution-warehouse.jpg',
        startDate: new Date('2025-05-10'),
        duration: '42 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 20,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['RFID', 'identyfikacja', 'komisjonowanie', 'automatyzacja'],
        author: admin._id
      },
      {
        title: 'Planowanie czynności manipulacyjnych podczas przeładunku',
        excerpt: 'Efektywne zarządzanie operacjami przeładunkowymi. Poznaj metody planowania, optymalizacji i koordynacji prac przeładunkowych.',
        contentHTML: '<h2>Planowanie operacji przeładunkowych</h2><p>Kompleksowy kurs zarządzania operacjami przeładunkowymi. Nauczysz się planować, koordynować i optymalizować procesy przeładunku w różnych typach terminali.</p><h3>Operacje:</h3><ul><li>Planowanie przeładunków</li><li>Koordynacja zespołów</li><li>Optymalizacja czasów</li><li>Zarządzanie zasobami</li></ul>',
        imageUrl: './imgs/medium-shot-smiley-man-warehouse.jpg',
        startDate: new Date('2025-05-20'),
        duration: '38 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 22,
        price: 1500,
        isPaid: true,
        status: 'published',
        tags: ['przeładunek', 'planowanie', 'koordynacja', 'terminale'],
        author: admin._id
      },
      {
        title: 'Transport przesyłek z wykorzystaniem bezzałogowego statku powietrznego',
        excerpt: 'Praktyczne wykorzystanie dronów w dostawach. Poznaj procedury operacyjne, planowanie misji i zarządzanie flotą dronów dostawczych.',
        contentHTML: '<h2>Transport dronami - aspekty praktyczne</h2><p>Praktyczny kurs operacji transportowych z wykorzystaniem dronów. Poznasz procedury planowania misji, zarządzanie flotą BSP oraz aspekty ekonomiczne dostaw dronami.</p><h3>Operacje:</h3><ul><li>Planowanie misji BSP</li><li>Zarządzanie flotą</li><li>Analiza ekonomiczna</li><li>Integracja z systemami logistycznymi</li></ul>',
        imageUrl: './imgs/white-truck-delivery-shipping-service-3d-rendering.jpg',
        startDate: new Date('2025-06-01'),
        duration: '44 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 18,
        price: 1900,
        isPaid: true,
        status: 'published',
        tags: ['drony', 'dostawy', 'planowanie misji', 'flota'],
        author: admin._id
      },
      {
        title: 'Język angielski w spedycji',
        excerpt: 'Angielski specjalistyczny dla branży TSL. Poznaj terminologię, dokumentację i komunikację w języku angielskim w międzynarodowej logistyce.',
        contentHTML: '<h2>Język angielski w spedycji</h2><p>Specjalistyczny kurs języka angielskiego dla pracowników branży TSL. Poznasz terminologię spedycyjną, dokumentację międzynarodową oraz komunikację biznesową w języku angielskim.</p><h3>Zakres:</h3><ul><li>Terminologia spedycyjna</li><li>Dokumentacja handlowa</li><li>Korespondencja biznesowa</li><li>Negocjacje w j. angielskim</li></ul>',
        imageUrl: './imgs/medium-shot-woman-with-tablet.jpg',
        startDate: new Date('2025-06-10'),
        duration: '60 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język angielski', 'terminologia', 'komunikacja', 'spedycja'],
        author: admin._id
      },
      {
        title: 'Język niemiecki w spedycji',
        excerpt: 'Niemiecki specjalistyczny dla logistyki. Naucz się komunikacji z partnerami niemieckimi, terminologii i dokumentacji w języku niemieckim.',
        contentHTML: '<h2>Język niemiecki w spedycji</h2><p>Kurs języka niemieckiego dedykowany branży logistycznej. Poznasz terminologię spedycyjną, dokumentację oraz skuteczną komunikację z partnerami niemieckimi w branży TSL.</p><h3>Program:</h3><ul><li>Terminologia logistyczna</li><li>Dokumentacja spedycyjna</li><li>Komunikacja telefoniczna</li><li>Kultura biznesowa niemiecka</li></ul>',
        imageUrl: './imgs/medium-shot-woman-storage.jpg',
        startDate: new Date('2025-06-20'),
        duration: '60 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 15,
        price: 1600,
        isPaid: true,
        status: 'published',
        tags: ['język niemiecki', 'komunikacja', 'partnerzy', 'kultura biznesowa'],
        author: admin._id
      },
      {
        title: 'Branżowy język polski jako język obcy',
        excerpt: 'Polski język specjalistyczny dla cudzoziemców w TSL. Kurs dedykowany pracownikom zagranicznym w polskiej branży transportowo-spedycyjnej.',
        contentHTML: '<h2>Polski język branżowy dla cudzoziemców</h2><p>Specjalistyczny kurs języka polskiego dla pracowników zagranicznych w branży TSL. Program obejmuje terminologię branżową, komunikację zawodową oraz kulturę pracy w Polsce.</p><h3>Elementy:</h3><ul><li>Terminologia TSL po polsku</li><li>Komunikacja zawodowa</li><li>Dokumentacja polska</li><li>Kultura pracy w Polsce</li></ul>',
        imageUrl: './imgs/woman-safety-equipment-working.jpg',
        startDate: new Date('2025-07-01'),
        duration: '80 godzin',
        targetGroup: 'dorośli',
        hours: 30,
        maxParticipants: 12,
        price: 1800,
        isPaid: true,
        status: 'published',
        tags: ['język polski', 'cudzoziemcy', 'integracja', 'kultura pracy'],
        author: admin._id
      }
    ];

    for (const courseData of courses) {
      const course = new Course(courseData);
      await course.save();
      console.log(`✅ Course created: ${course.title}`);
    }

    console.log(`🎓 Successfully created ${courses.length} new courses`);

  } catch (error) {
    console.error('Error creating courses:', error);
  }
};

const main = async () => {
  console.log('🌱 Starting database seeding...');
  
  await connectDB();
  await seedAdmin();
  
  if (process.env.NODE_ENV === 'development') {
    await seedSampleData();
  }
  
  // Always seed courses
  await seedCourses();
  
  console.log('✅ Seeding completed!');
  process.exit(0);
};

main().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});

