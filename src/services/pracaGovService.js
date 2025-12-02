/**
 * Serwis do pobierania ofert pracy z API praca.gov.pl (ePraca)
 * Dokumentacja: https://oferty.praca.gov.pl/portal/dla-integratorow
 * 
 * API Endpoint: https://oferty.praca.gov.pl/portal-api/v3/oferta/wyszukiwanie
 */

const JobOffer = require('../models/JobOffer');
const User = require('../models/User');

// Konfiguracja API praca.gov.pl
const API_BASE_URL = 'https://oferty.praca.gov.pl/portal-api/v3';
const SEARCH_ENDPOINT = `${API_BASE_URL}/oferta/wyszukiwanie`;

// Zawody do wyszukiwania (spedytor, logistyk)
const JOB_KEYWORDS = [
  'spedytor',
  'logistyk',
  'logistyka',
  'spedycja',
  'magazynier',
  'dyspozytor transportu',
  'koordynator logistyki',
  'specjalista ds. logistyki',
  'specjalista ds. spedycji',
  'kierownik magazynu',
  'planista transportu'
];

/**
 * Pobiera oferty pracy z API praca.gov.pl dla podanego słowa kluczowego
 * @param {string} keyword - Słowo kluczowe do wyszukania
 * @param {number} page - Numer strony (domyślnie 0)
 * @param {number} size - Liczba wyników na stronę (domyślnie 50)
 * @returns {Promise<Object>} - Odpowiedź z API
 */
async function searchJobOffers(keyword, page = 0, size = 50) {
  try {
    // API nie filtruje - wysyłamy pusty obiekt
    const searchPayload = {};

    const response = await fetch(`${SEARCH_ENDPOINT}?page=${page}&size=${size}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'pl-PL,pl;q=0.9',
        'User-Agent': 'BCU-Spedycja-JobImporter/1.0'
      },
      body: JSON.stringify(searchPayload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // API zwraca dane w formacie: { status, msg, payload: { ofertyPracyPage: { content: [...] } } }
    if (data.status === 200 && data.payload && data.payload.ofertyPracyPage) {
      return data.payload.ofertyPracyPage;
    }
    
    console.log(`⚠️ Nieoczekiwana odpowiedź API dla "${keyword}":`, JSON.stringify(data).substring(0, 200));
    return null;
  } catch (error) {
    console.error(`❌ Błąd pobierania ofert dla "${keyword}":`, error.message);
    return null;
  }
}

/**
 * Pobiera szczegóły pojedynczej oferty pracy
 * @param {string} offerId - ID oferty z praca.gov.pl
 * @returns {Promise<Object>} - Szczegóły oferty
 */
async function getOfferDetails(offerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/oferta/${offerId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'pl-PL,pl;q=0.9',
        'User-Agent': 'BCU-Spedycja-JobImporter/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Błąd pobierania szczegółów oferty ${offerId}:`, error.message);
    return null;
  }
}

/**
 * Mapuje ofertę z praca.gov.pl na format BCU JobOffer
 * API praca.gov.pl zwraca pola:
 * - id, stanowisko, miejscePracy, pracodawca, rodzajUmowy
 * - dataWaznDo, wynagrodzenie, zakresObowiazkow, wymagania
 * - telefon, email, typOferty
 * 
 * @param {Object} govOffer - Oferta z praca.gov.pl
 * @param {string} adminId - ID użytkownika admin jako owner
 * @returns {Object} - Oferta w formacie BCU
 */
function mapGovOfferToBcuFormat(govOffer, adminId) {
  // Parsowanie wynagrodzenia z tekstu np. "od 4 666 PLN" lub "od 37,00 PLN"
  let salaryFrom = null;
  let salaryTo = null;
  
  if (govOffer.wynagrodzenie) {
    const salaryText = govOffer.wynagrodzenie;
    // Szukaj liczb w tekście
    const numbers = salaryText.match(/[\d\s]+(?:[,.][\d]+)?/g);
    if (numbers && numbers.length > 0) {
      // Pierwsza liczba to "od"
      const firstNum = numbers[0].replace(/\s/g, '').replace(',', '.');
      salaryFrom = parseFloat(firstNum);
      
      // Jeśli jest druga liczba, to "do"
      if (numbers.length > 1) {
        const secondNum = numbers[1].replace(/\s/g, '').replace(',', '.');
        salaryTo = parseFloat(secondNum);
      }
    }
  }

  // Mapowanie typu umowy na employmentType
  let employmentType = 'full-time';
  const rodzajUmowy = (govOffer.rodzajUmowy || '').toLowerCase();
  if (rodzajUmowy.includes('praktyk') || rodzajUmowy.includes('staż')) {
    employmentType = 'internship';
  } else if (rodzajUmowy.includes('zleceni') || rodzajUmowy.includes('dzieło')) {
    employmentType = 'contract';
  } else if (rodzajUmowy.includes('część') || rodzajUmowy.includes('niepełn')) {
    employmentType = 'part-time';
  }

  // Budowanie opisu HTML
  const descriptionParts = [];
  
  if (govOffer.zakresObowiazkow) {
    descriptionParts.push(`<h3>Zakres obowiązków</h3><p>${govOffer.zakresObowiazkow.replace(/\n/g, '<br>')}</p>`);
  }
  
  if (govOffer.wymagania) {
    descriptionParts.push(`<h3>Wymagania</h3><p>${govOffer.wymagania.replace(/\n/g, '<br>')}</p>`);
  }
  
  if (govOffer.wynagrodzenie) {
    descriptionParts.push(`<h3>Wynagrodzenie</h3><p>${govOffer.wynagrodzenie}</p>`);
  }

  if (govOffer.rodzajUmowy) {
    descriptionParts.push(`<p><strong>Rodzaj umowy:</strong> ${govOffer.rodzajUmowy}</p>`);
  }

  // Informacja o źródle
  descriptionParts.push(`<hr><p class="text-sm text-gray-500"><em>Źródło: praca.gov.pl | ID: ${govOffer.id || 'N/A'}</em></p>`);

  // Lokalizacja - używamy miejscePracy
  const location = govOffer.miejscePracy || 'Polska';

  // Data wygaśnięcia - format "31.12.2025"
  let expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30);
  
  if (govOffer.dataWaznDo) {
    // Parsuj format DD.MM.YYYY
    const parts = govOffer.dataWaznDo.split('.');
    if (parts.length === 3) {
      expireAt = new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }

  // Tagi na podstawie stanowiska
  const tags = ['praca.gov.pl', 'import'];
  const stanowisko = (govOffer.stanowisko || '').toLowerCase();
  
  if (stanowisko.includes('spedytor') || stanowisko.includes('spedycj')) {
    tags.push('spedycja');
  }
  if (stanowisko.includes('logist')) {
    tags.push('logistyka');
  }
  if (stanowisko.includes('magazyn')) {
    tags.push('magazyn');
  }
  if (stanowisko.includes('transport')) {
    tags.push('transport');
  }
  if (stanowisko.includes('kierowca') || stanowisko.includes('driver')) {
    tags.push('kierowca');
  }

  return {
    title: govOffer.stanowisko || 'Oferta pracy',
    companyName: govOffer.pracodawca || 'Pracodawca',
    location: location,
    descriptionHTML: descriptionParts.join('\n') || '<p>Brak opisu</p>',
    requirements: govOffer.wymagania || '',
    benefits: '',
    salaryFrom: salaryFrom,
    salaryTo: salaryTo,
    employmentType: employmentType,
    experienceLevel: 'any',
    applyUrl: `https://oferty.praca.gov.pl/portal/oferta/${govOffer.id}`,
    contactEmail: govOffer.email || null,
    contactPhone: govOffer.telefon || null,
    expireAt: expireAt,
    owner: adminId,
    status: 'published',
    isActive: true,
    tags: tags,
    // Pole pomocnicze do identyfikacji importowanych ofert
    externalId: `praca-gov-${govOffer.id}`,
    source: 'praca.gov.pl'
  };
}

/**
 * Importuje oferty pracy z praca.gov.pl do bazy danych BCU
 * UWAGA: API praca.gov.pl nie obsługuje filtrowania - filtrujemy po stronie klienta
 * @param {Object} options - Opcje importu
 * @returns {Promise<Object>} - Wynik importu
 */
async function importJobOffers(options = {}) {
  const { 
    keywords = JOB_KEYWORDS,
    maxOffers = 200,
    updateExisting = false 
  } = options;

  console.log('🔄 Rozpoczynam import ofert pracy z praca.gov.pl...');
  console.log(`📋 Słowa kluczowe do filtrowania: ${keywords.join(', ')}`);

  // Znajdź administratora jako właściciela ofert
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Nie znaleziono użytkownika admin - wymagany do importu ofert');
  }

  const results = {
    totalFetched: 0,
    totalMatched: 0,
    newOffers: 0,
    updatedOffers: 0,
    skippedOffers: 0,
    errors: [],
    matchedKeywords: {}
  };

  try {
    // Pobierz dużą partię ofert (API nie filtruje, więc pobieramy więcej i filtrujemy sami)
    console.log(`\n📥 Pobieram ${maxOffers} najnowszych ofert z praca.gov.pl...`);
    
    const searchResult = await searchJobOffers('', 0, maxOffers);
    
    if (!searchResult || !searchResult.content) {
      console.log('⚠️ Brak wyników z API');
      return results;
    }

    const allOffers = searchResult.content || [];
    results.totalFetched = allOffers.length;
    console.log(`📦 Pobrano ${allOffers.length} ofert, filtruję po słowach kluczowych...`);

    // Filtruj oferty po słowach kluczowych (w stanowisku lub opisie)
    const matchedOffers = allOffers.filter(offer => {
      const searchText = [
        offer.stanowisko || '',
        offer.zakresObowiazkow || '',
        offer.wymagania || ''
      ].join(' ').toLowerCase();
      
      const matchedKeyword = keywords.find(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (matchedKeyword) {
        // Zliczaj które słowa kluczowe zostały dopasowane
        results.matchedKeywords[matchedKeyword] = (results.matchedKeywords[matchedKeyword] || 0) + 1;
        return true;
      }
      return false;
    });

    results.totalMatched = matchedOffers.length;
    console.log(`✅ Znaleziono ${matchedOffers.length} ofert pasujących do słów kluczowych`);
    
    if (Object.keys(results.matchedKeywords).length > 0) {
      console.log('📊 Dopasowania:', JSON.stringify(results.matchedKeywords));
    }

    // Przetwórz pasujące oferty
    for (const govOffer of matchedOffers) {
      try {
        const externalId = `praca-gov-${govOffer.id}`;
        
        // Sprawdź czy oferta już istnieje
        const existingOffer = await JobOffer.findOne({ 
          $or: [
            { externalId: externalId },
            { 
              title: govOffer.stanowisko,
              companyName: govOffer.pracodawca
            }
          ]
        });

        if (existingOffer) {
          if (updateExisting) {
            // Aktualizuj istniejącą ofertę
            const bcuOffer = mapGovOfferToBcuFormat(govOffer, admin._id);
            delete bcuOffer.owner; // Nie zmieniaj właściciela
            
            Object.assign(existingOffer, bcuOffer);
            await existingOffer.save();
            
            results.updatedOffers++;
            console.log(`🔄 Zaktualizowano: ${govOffer.stanowisko.substring(0, 50)}`);
          } else {
            results.skippedOffers++;
          }
          continue;
        }

        // Utwórz nową ofertę
        const bcuOffer = mapGovOfferToBcuFormat(govOffer, admin._id);
        bcuOffer.externalId = externalId;
        
        const newJobOffer = new JobOffer(bcuOffer);
        await newJobOffer.save();
        
        results.newOffers++;
        console.log(`✅ Zaimportowano: ${govOffer.stanowisko.substring(0, 50)} - ${bcuOffer.companyName.substring(0, 30)}`);

      } catch (offerError) {
        console.error(`❌ Błąd importu oferty ${govOffer.id}:`, offerError.message);
        results.errors.push({
          offerId: govOffer.id,
          title: govOffer.stanowisko,
          error: offerError.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Błąd pobierania ofert:', error.message);
    results.errors.push({ error: error.message });
  }

  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  console.log('📊 PODSUMOWANIE IMPORTU:');
  console.log(`   Pobrano z API: ${results.totalFetched}`);
  console.log(`   Pasujących do słów kluczowych: ${results.totalMatched}`);
  console.log(`   Nowych: ${results.newOffers}`);
  console.log(`   Zaktualizowanych: ${results.updatedOffers}`);
  console.log(`   Pominiętych (duplikaty): ${results.skippedOffers}`);
  console.log(`   Błędów: ${results.errors.length}`);
  console.log('='.repeat(50));

  return results;
}

/**
 * Usuwa wygasłe oferty importowane z praca.gov.pl
 * @returns {Promise<number>} - Liczba usuniętych ofert
 */
async function cleanupExpiredImportedOffers() {
  try {
    const result = await JobOffer.deleteMany({
      source: 'praca.gov.pl',
      expireAt: { $lt: new Date() }
    });
    
    console.log(`🗑️ Usunięto ${result.deletedCount} wygasłych ofert z praca.gov.pl`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Błąd usuwania wygasłych ofert:', error.message);
    return 0;
  }
}

/**
 * Pobiera statystyki importowanych ofert
 * @returns {Promise<Object>} - Statystyki
 */
async function getImportStats() {
  try {
    const total = await JobOffer.countDocuments({ source: 'praca.gov.pl' });
    const active = await JobOffer.countDocuments({ 
      source: 'praca.gov.pl',
      status: 'published',
      expireAt: { $gt: new Date() }
    });
    const expired = await JobOffer.countDocuments({
      source: 'praca.gov.pl',
      expireAt: { $lt: new Date() }
    });

    // Ostatnia importowana oferta
    const lastImported = await JobOffer.findOne({ source: 'praca.gov.pl' })
      .sort({ createdAt: -1 })
      .select('createdAt title');

    return {
      total,
      active,
      expired,
      lastImportedAt: lastImported?.createdAt || null,
      lastImportedTitle: lastImported?.title || null
    };
  } catch (error) {
    console.error('❌ Błąd pobierania statystyk:', error.message);
    return null;
  }
}

module.exports = {
  searchJobOffers,
  getOfferDetails,
  importJobOffers,
  cleanupExpiredImportedOffers,
  getImportStats,
  JOB_KEYWORDS
};

