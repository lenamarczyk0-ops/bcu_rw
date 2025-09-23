const mongoose = require('mongoose');

// Course model (simplified for this script)
const courseSchema = new mongoose.Schema({
  title: String,
  targetGroup: {
    type: String,
    enum: ['uczniowie i studenci', 'nauczyciele', 'dorośli'],
    default: 'dorośli'
  },
  weeks: Number,
  hours: Number
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);

// Połączenie z MongoDB
const MONGODB_URI = 'mongodb://mongo:JmKfPSMiNRbXDpCgAgNjBlujlDUATFAT@mongodb.railway.internal:27017/bcu?authSource=admin';

async function updateTargetGroups() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Połączono z MongoDB');

    // Znajdź kursy bez targetGroup lub z pustym targetGroup
    const coursesWithoutTargetGroup = await Course.find({
      $or: [
        { targetGroup: { $exists: false } },
        { targetGroup: null },
        { targetGroup: '' }
      ]
    });

    console.log(`📋 Znaleziono ${coursesWithoutTargetGroup.length} kursów do aktualizacji`);

    if (coursesWithoutTargetGroup.length === 0) {
      console.log('🎉 Wszystkie kursy mają już ustawioną grupę docelową');
      return;
    }

    // Zaktualizuj kursy
    for (const course of coursesWithoutTargetGroup) {
      // Można dostosować logikę przypisywania grup na podstawie tytułu
      let targetGroup = 'dorośli'; // domyślnie
      
      const title = course.title.toLowerCase();
      
      if (title.includes('student') || title.includes('uczeń') || title.includes('młodzie')) {
        targetGroup = 'uczniowie i studenci';
      } else if (title.includes('nauczyciel') || title.includes('edukator') || title.includes('szkoleniowiec')) {
        targetGroup = 'nauczyciele';
      }
      
      course.targetGroup = targetGroup;
      await course.save();
      
      console.log(`✅ Zaktualizowano: "${course.title}" -> ${targetGroup}`);
    }

    console.log(`🎉 Pomyślnie zaktualizowano ${coursesWithoutTargetGroup.length} kursów`);

  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Rozłączono z bazą danych');
  }
}

// Uruchom script
updateTargetGroups();
