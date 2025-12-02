/**
 * Scheduler do automatycznej aktualizacji ofert pracy
 * Pobiera oferty z praca.gov.pl co tydzień (lub wg konfiguracji)
 */

const pracaGovService = require('./pracaGovService');

// Konfiguracja harmonogramu
const SCHEDULE_CONFIG = {
  // Domyślnie: co tydzień w niedzielę o 3:00 w nocy
  WEEKLY_DAY: 0,        // 0 = niedziela, 1 = poniedziałek, itd.
  WEEKLY_HOUR: 3,       // Godzina (0-23)
  WEEKLY_MINUTE: 0,     // Minuta (0-59)
  
  // Dodatkowa aktualizacja w środę (środek tygodnia)
  MIDWEEK_DAY: 3,       // Środa
  MIDWEEK_HOUR: 14,     // Godzina 14:00
  MIDWEEK_MINUTE: 0
};

// Status schedulera
let schedulerStatus = {
  isRunning: false,
  lastRun: null,
  lastResult: null,
  nextScheduledRun: null,
  intervalId: null
};

/**
 * Oblicza czas do następnego uruchomienia (w milisekundach)
 * @returns {number} - Czas w ms do następnego uruchomienia
 */
function getTimeToNextRun() {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Znajdź najbliższy zaplanowany termin
  const scheduledTimes = [
    { day: SCHEDULE_CONFIG.WEEKLY_DAY, hour: SCHEDULE_CONFIG.WEEKLY_HOUR, minute: SCHEDULE_CONFIG.WEEKLY_MINUTE },
    { day: SCHEDULE_CONFIG.MIDWEEK_DAY, hour: SCHEDULE_CONFIG.MIDWEEK_HOUR, minute: SCHEDULE_CONFIG.MIDWEEK_MINUTE }
  ];

  let minTimeToNext = Infinity;
  let nextRunDate = null;

  for (const scheduled of scheduledTimes) {
    let daysUntil = scheduled.day - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && (currentHour > scheduled.hour || (currentHour === scheduled.hour && currentMinute >= scheduled.minute)))) {
      daysUntil += 7;
    }

    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + daysUntil);
    nextRun.setHours(scheduled.hour, scheduled.minute, 0, 0);

    const timeToNext = nextRun.getTime() - now.getTime();
    if (timeToNext < minTimeToNext) {
      minTimeToNext = timeToNext;
      nextRunDate = nextRun;
    }
  }

  schedulerStatus.nextScheduledRun = nextRunDate;
  return minTimeToNext;
}

/**
 * Wykonuje zaplanowaną aktualizację ofert pracy
 */
async function runScheduledUpdate() {
  if (schedulerStatus.isRunning) {
    console.log('⚠️ Aktualizacja już w toku, pomijam...');
    return;
  }

  schedulerStatus.isRunning = true;
  console.log('\n' + '🕐'.repeat(25));
  console.log('⏰ AUTOMATYCZNA AKTUALIZACJA OFERT PRACY');
  console.log(`📅 Data: ${new Date().toLocaleString('pl-PL')}`);
  console.log('🕐'.repeat(25));

  try {
    // 1. Usuń wygasłe oferty
    console.log('\n🗑️ Usuwam wygasłe oferty...');
    await pracaGovService.cleanupExpiredImportedOffers();

    // 2. Importuj nowe oferty
    console.log('\n📥 Importuję nowe oferty z praca.gov.pl...');
    const result = await pracaGovService.importJobOffers({
      maxOffers: 300,
      updateExisting: true
    });

    schedulerStatus.lastResult = result;
    schedulerStatus.lastRun = new Date();

    console.log('\n✅ Automatyczna aktualizacja zakończona pomyślnie!');

  } catch (error) {
    console.error('\n❌ Błąd automatycznej aktualizacji:', error.message);
    schedulerStatus.lastResult = { error: error.message };
    schedulerStatus.lastRun = new Date();
  } finally {
    schedulerStatus.isRunning = false;
    
    // Zaplanuj następne uruchomienie
    scheduleNextRun();
  }
}

/**
 * Planuje następne uruchomienie
 */
function scheduleNextRun() {
  if (schedulerStatus.intervalId) {
    clearTimeout(schedulerStatus.intervalId);
  }

  const timeToNext = getTimeToNextRun();
  
  console.log(`\n⏱️ Następna aktualizacja zaplanowana na: ${schedulerStatus.nextScheduledRun?.toLocaleString('pl-PL')}`);
  console.log(`   (za ${Math.round(timeToNext / 1000 / 60 / 60)} godzin)`);

  schedulerStatus.intervalId = setTimeout(runScheduledUpdate, timeToNext);
}

/**
 * Uruchamia scheduler
 */
function startScheduler() {
  console.log('\n📆 Uruchamiam scheduler automatycznej aktualizacji ofert pracy...');
  console.log(`   Harmonogram: co niedzielę o ${SCHEDULE_CONFIG.WEEKLY_HOUR}:00 i środę o ${SCHEDULE_CONFIG.MIDWEEK_HOUR}:00`);
  
  // Zaplanuj następne uruchomienie
  scheduleNextRun();
  
  // Automatyczny import przy starcie jest wyłączony - użyj przycisku w panelu admina
  // checkAndRunInitialImport();
  console.log('   💡 Aby zaimportować oferty z praca.gov.pl, użyj przycisku w panelu administratora');
}

/**
 * Sprawdza czy potrzebny jest początkowy import
 */
async function checkAndRunInitialImport() {
  try {
    const stats = await pracaGovService.getImportStats();
    
    if (!stats || stats.active === 0) {
      console.log('\n📋 Brak aktywnych ofert z praca.gov.pl - uruchamiam początkowy import...');
      // Uruchom import po 10 sekundach (po uruchomieniu serwera)
      setTimeout(async () => {
        try {
          await runScheduledUpdate();
        } catch (error) {
          console.error('❌ Błąd początkowego importu:', error.message);
        }
      }, 10000);
    } else {
      console.log(`\n📊 Znaleziono ${stats.active} aktywnych ofert z praca.gov.pl`);
      if (stats.lastImportedAt) {
        console.log(`   Ostatni import: ${new Date(stats.lastImportedAt).toLocaleString('pl-PL')}`);
      }
    }
  } catch (error) {
    console.error('⚠️ Nie można sprawdzić statusu importu:', error.message);
  }
}

/**
 * Zatrzymuje scheduler
 */
function stopScheduler() {
  if (schedulerStatus.intervalId) {
    clearTimeout(schedulerStatus.intervalId);
    schedulerStatus.intervalId = null;
    console.log('⏹️ Scheduler zatrzymany');
  }
}

/**
 * Pobiera status schedulera
 * @returns {Object} - Status schedulera
 */
function getSchedulerStatus() {
  return {
    ...schedulerStatus,
    config: SCHEDULE_CONFIG
  };
}

/**
 * Wymusza natychmiastowe uruchomienie aktualizacji
 * @returns {Promise<Object>} - Wynik aktualizacji
 */
async function forceUpdate() {
  console.log('\n🔄 Wymuszono natychmiastową aktualizację ofert pracy...');
  await runScheduledUpdate();
  return schedulerStatus.lastResult;
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  forceUpdate,
  runScheduledUpdate
};

