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
    const searchPayload = {
      stanowisko: keyword,
      kraj: 'Polska',
      // Możliwe filtry:
      // wojewodztwo: null,
      // miejscowosc: null,
      // typUmowy: null,
      // wymiaryEtatu: null,
      // dataDodaniaOd: null,
      // dataDodaniaDo: null
    };

    const response = await fetch(`${SEARCH_ENDPOINT}?page=${page}&size=${size}&sort=dataPublikacji,desc`, {
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
    return data;
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
 * @param {Object} govOffer - Oferta z praca.gov.pl
 * @param {string} adminId - ID użytkownika admin jako owner
 * @returns {Object} - Oferta w formacie BCU
 */
function mapGovOfferToBcuFormat(govOffer, adminId) {
  // Parsowanie wynagrodzenia
  let salaryFrom = null;
  let salaryTo = null;
  
  if (govOffer.wynagrodzenieOd) {
    salaryFrom = parseFloat(govOffer.wynagrodzenieOd);
  }
  if (govOffer.wynagrodzenieDo) {
    salaryTo = parseFloat(govOffer.wynagrodzenieDo);
  }

  // Mapowanie typu umowy na employmentType
  let employmentType = 'full-time';
  const typUmowy = (govOffer.typUmowy || '').toLowerCase();
  if (typUmowy.includes('praktyk') || typUmowy.includes('staż')) {
    employmentType = 'internship';
  } else if (typUmowy.includes('zleceni') || typUmowy.includes('dzieło')) {
    employmentType = 'contract';
  } else if (typUmowy.includes('część') || typUmowy.includes('niepełn')) {
    employmentType = 'part-time';
  }

  // Budowanie opisu HTML
  const descriptionParts = [];
  
  if (govOffer.opisStanowiska) {
    descriptionParts.push(`<h3>Opis stanowiska</h3><p>${govOffer.opisStanowiska}</p>`);
  }
  
  if (govOffer.wymaganiaKonieczne) {
    descriptionParts.push(`<h3>Wymagania</h3><p>${govOffer.wymaganiaKonieczne}</p>`);
  }
  
  if (govOffer.oferujemy) {
    descriptionParts.push(`<h3>Oferujemy</h3><p>${govOffer.oferujemy}</p>`);
  }

  if (govOffer.obowiazki) {
    descriptionParts.push(`<h3>Obowiązki</h3><p>${govOffer.obowiazki}</p>`);
  }

  // Informacja o źródle
  descriptionParts.push(`<hr><p class="text-sm text-gray-500"><em>Źródło: praca.gov.pl | ID: ${govOffer.id || 'N/A'}</em></p>`);

  // Lokalizacja
  const location = [
    govOffer.miejscowosc,
    govOffer.wojewodztwo
  ].filter(Boolean).join(', ') || 'Polska';

  // Data wygaśnięcia (domyślnie 30 dni od teraz jeśli brak)
  let expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + 30);
  
  if (govOffer.dataWaznosciOferty) {
    expireAt = new Date(govOffer.dataWaznosciOferty);
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

  return {
    title: govOffer.stanowisko || 'Oferta pracy',
    companyName: govOffer.pracodawca || govOffer.nazwaFirmy || 'Pracodawca',
    location: location,
    descriptionHTML: descriptionParts.join('\n') || '<p>Brak opisu</p>',
    requirements: govOffer.wymaganiaKonieczne || '',
    benefits: govOffer.oferujemy || '',
    salaryFrom: salaryFrom,
    salaryTo: salaryTo,
    employmentType: employmentType,
    experienceLevel: 'any',
    applyUrl: govOffer.linkDoAplikowania || `https://oferty.praca.gov.pl/portal/oferta/${govOffer.id}`,
    contactEmail: govOffer.email || null,
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
 * @param {Object} options - Opcje importu
 * @returns {Promise<Object>} - Wynik importu
 */
async function importJobOffers(options = {}) {
  const { 
    keywords = JOB_KEYWORDS,
    maxOffersPerKeyword = 20,
    updateExisting = false 
  } = options;

  console.log('🔄 Rozpoczynam import ofert pracy z praca.gov.pl...');
  console.log(`📋 Słowa kluczowe: ${keywords.join(', ')}`);

  // Znajdź administratora jako właściciela ofert
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Nie znaleziono użytkownika admin - wymagany do importu ofert');
  }

  const results = {
    totalFetched: 0,
    newOffers: 0,
    updatedOffers: 0,
    skippedOffers: 0,
    errors: [],
    keywords: {}
  };

  // Pobierz oferty dla każdego słowa kluczowego
  for (const keyword of keywords) {
    console.log(`\n🔍 Szukam ofert dla: "${keyword}"...`);
    
    try {
      const searchResult = await searchJobOffers(keyword, 0, maxOffersPerKeyword);
      
      if (!searchResult || !searchResult.content) {
        console.log(`⚠️ Brak wyników dla "${keyword}"`);
        results.keywords[keyword] = { fetched: 0, imported: 0 };
        continue;
      }

      const offers = searchResult.content || [];
      console.log(`📦 Znaleziono ${offers.length} ofert dla "${keyword}"`);
      
      results.totalFetched += offers.length;
      results.keywords[keyword] = { fetched: offers.length, imported: 0 };

      // Przetwórz każdą ofertę
      for (const govOffer of offers) {
        try {
          const externalId = `praca-gov-${govOffer.id}`;
          
          // Sprawdź czy oferta już istnieje
          const existingOffer = await JobOffer.findOne({ 
            $or: [
              { externalId: externalId },
              { 
                title: govOffer.stanowisko,
                companyName: govOffer.pracodawca || govOffer.nazwaFirmy
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
              results.keywords[keyword].imported++;
              console.log(`🔄 Zaktualizowano: ${govOffer.stanowisko}`);
            } else {
              results.skippedOffers++;
              console.log(`⏭️ Pominięto (już istnieje): ${govOffer.stanowisko}`);
            }
            continue;
          }

          // Utwórz nową ofertę
          const bcuOffer = mapGovOfferToBcuFormat(govOffer, admin._id);
          bcuOffer.externalId = externalId;
          
          const newJobOffer = new JobOffer(bcuOffer);
          await newJobOffer.save();
          
          results.newOffers++;
          results.keywords[keyword].imported++;
          console.log(`✅ Zaimportowano: ${govOffer.stanowisko} - ${bcuOffer.companyName}`);

        } catch (offerError) {
          console.error(`❌ Błąd importu oferty:`, offerError.message);
          results.errors.push({
            keyword,
            offerId: govOffer.id,
            error: offerError.message
          });
        }
      }

      // Opóźnienie między zapytaniami (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (keywordError) {
      console.error(`❌ Błąd dla słowa kluczowego "${keyword}":`, keywordError.message);
      results.errors.push({
        keyword,
        error: keywordError.message
      });
    }
  }

  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  console.log('📊 PODSUMOWANIE IMPORTU:');
  console.log(`   Pobrano ofert: ${results.totalFetched}`);
  console.log(`   Nowych: ${results.newOffers}`);
  console.log(`   Zaktualizowanych: ${results.updatedOffers}`);
  console.log(`   Pominiętych: ${results.skippedOffers}`);
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

