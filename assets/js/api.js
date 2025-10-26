// API Integration for BCU SPEDYCJA
class BCUAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.token = localStorage.getItem('auth_token');
    }

    // Generic API call method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // For session-based auth
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Błąd API');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication methods - login moved below

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        localStorage.removeItem('user');
        this.user = null;
    }

    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Błąd logowania');
            }

            // Store user data for session-based auth
            localStorage.setItem('user', JSON.stringify(data.user));
            this.user = data.user;
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Course methods
    async getCourses(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/courses${queryString ? '?' + queryString : ''}`);
    }

    async getCourse(slug) {
        return await this.request(`/courses/${slug}`);
    }

    // News methods
    async getNews(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/news${queryString ? '?' + queryString : ''}`);
    }

    async getNewsArticle(slug) {
        return await this.request(`/news/${slug}`);
    }

    async getFeaturedNews() {
        return await this.request('/news/featured/list');
    }

    // Job offers methods
    async getJobOffers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/job-offers${queryString ? '?' + queryString : ''}`);
    }

    async getJobOffer(id) {
        return await this.request(`/job-offers/${id}`);
    }

    // Materials methods
    async getPublicMaterials(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/materials/public${queryString ? '?' + queryString : ''}`);
    }

    async getCourseMaterials(courseId) {
        return await this.request(`/materials/course/${courseId}`);
    }

    async downloadMaterial(id) {
        return await this.request(`/materials/download/${id}`);
    }

    // Application methods
    async submitApplication(applicationData) {
        return await this.request('/applications', {
            method: 'POST',
            body: JSON.stringify(applicationData)
        });
    }
}

// Initialize API instance
const api = new BCUAPI();

// Course loading functions
async function loadCourses() {
    try {
        const response = await api.getCourses({ limit: 6 });
        const coursesContainer = document.getElementById('courses-container');
        
        if (!coursesContainer) return;

        coursesContainer.innerHTML = response.courses.map(course => `
            <div class="text-center">
                <img src="${course.imageUrl}" alt="${course.title}" class="w-full image-standard object-cover rounded-lg shadow-lg mb-4 image-hover">
                <h4 class="text-lg font-bold text-black mb-2">${course.title}</h4>
                <p class="text-gray-600">${course.excerpt}</p>
                <div class="mt-4">
                    <button onclick="showCourseModal('${course.slug}')" class="bg-white hover:bg-gray-100 text-black py-2 px-4 rounded font-bold transition-colors border border-gray-200">
                        ZAŁADUJ KURS
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading courses:', error);
        showNotification('Błąd podczas ładowania kursów', 'error');
    }
}

async function showCourseModal(slug) {
    try {
        const response = await api.getCourse(slug);
        const course = response.course;
        
        // Create modal HTML
        const modalHTML = `
            <div id="course-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-4">
                            <h2 class="text-2xl font-bold text-gray-900">${course.title}</h2>
                            <button onclick="closeCourseModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        
                        <div class="mb-4">
                            <img src="${course.imageUrl}" alt="${course.title}" class="w-full h-48 object-cover rounded-lg">
                        </div>
                        
                        <div class="mb-4">
                            <p class="text-gray-700">${course.excerpt}</p>
                        </div>
                        
                        <div class="mb-4">
                            <div class="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <strong>Czas trwania:</strong><br>
                                    ${course.weeks ? `${course.weeks} tygodni` : '—'}
                                </div>
                                <div>
                                    <strong>Liczba godzin:</strong><br>
                                    ${course.hours || 0}h
                                </div>
                                <div>
                                    <strong>Max uczestników:</strong><br>
                                    ${course.maxParticipants || 20}
                                </div>
                                <div>
                                    <strong>Cena:</strong><br>
                                    ${course.price > 0 ? course.price + ' PLN' : 'Bezpłatny'}
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-6">
                            <h3 class="text-lg font-semibold mb-2">Opis kursu</h3>
                            <div class="prose max-w-none">${course.contentHTML}</div>
                        </div>
                        
                        <div class="flex gap-4">
                            <button onclick="submitCourseApplication('${course._id}', '${course.title}')" class="bg-gradient-to-r from-primary-dark to-primary-light text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-600 transition-all flex-1">
                                Zapisz się na kurs
                            </button>
                            <button onclick="closeCourseModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Error loading course details:', error);
        showNotification('Błąd podczas ładowania szczegółów kursu', 'error');
    }
}

function closeCourseModal() {
    const modal = document.getElementById('course-modal');
    if (modal) {
        modal.remove();
    }
}

// Application form
window.submitCourseApplication = function(courseId, courseTitle) {
    const modalHTML = `
        <div id="application-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-200 shadow-2xl">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Zapisz się na kurs: ${courseTitle}</h2>
                        <button id="close-modal-btn" class="text-gray-500 hover:text-gray-700 text-2xl hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors">&times;</button>
                    </div>
                    
                    <form id="application-form" class="space-y-4" action="javascript:void(0);">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Imię *</label>
                                <input type="text" name="firstName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
                                <input type="text" name="lastName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                            <input type="tel" name="phone" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Wiadomość (opcjonalnie)</label>
                            <textarea name="motivation" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"></textarea>
                        </div>
                        
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="consentRODO" required class="mr-2">
                                <span class="text-sm text-gray-700">Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z RODO *</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="consentMarketing" class="mr-2">
                                <span class="text-sm text-gray-700">Wyrażam zgodę na otrzymywanie informacji marketingowych</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="consentNoEUCourses" required class="mr-2">
                                <span class="text-sm text-gray-700">Oświadczam, że nie korzystałem/am z innych kursów realizowanych w ramach funduszy unijnych. *</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="consentDataAccuracy" required class="mr-2">
                                <span class="text-sm text-gray-700">Oświadczam, że dane podane w formularzu są zgodne ze stanem faktycznym. *</span>
                            </label>
                        </div>
                        
                        <!-- Hidden fields for course reference -->
                        ${/^[0-9a-fA-F]{24}$/.test(String(courseId)) ? `
                            <input type="hidden" name="course" value="${courseId}">
                        ` : `
                            <input type="hidden" name="courseTitle" value="${courseTitle}">
                            <input type="hidden" name="courseFileId" value="${courseId}">
                        `}
                        
                        <div class="flex gap-4 pt-4">
                            <button type="button" id="submit-application-btn" class="bg-gradient-to-r from-primary-dark to-primary-light text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-600 transition-all flex-1">
                                Zapisz się
                            </button>
                            <button type="button" id="cancel-application-btn" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Anuluj
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission function
    const submitApplicationForm = async () => {
        console.log('🔍 Rozpoczynam wysyłanie formularza...');
        
        try {
            const formEl = document.getElementById('application-form');
            if (!formEl) {
                console.error('❌ Nie znaleziono formularza!');
                alert('Błąd: Nie znaleziono formularza');
                return;
            }
            
            const formData = new FormData(formEl);
            const applicationData = Object.fromEntries(formData.entries());
            console.log('📝 Dane formularza:', applicationData);
            
            // Check RODO consent (required)
            const consentRODOChecked = formData.has('consentRODO');
            console.log('✅ Zgoda RODO zaznaczona:', consentRODOChecked);
            
            if (!consentRODOChecked) {
                console.warn('⚠️ Brak zgody RODO');
                showNotification('Musisz wyrazić zgodę na przetwarzanie danych osobowych (RODO)', 'error');
                return;
            }
            
            applicationData.consentRODO = consentRODOChecked;
            applicationData.consentMarketing = formData.has('consentMarketing');
            applicationData.consentNoEUCourses = formData.has('consentNoEUCourses');
            applicationData.consentDataAccuracy = formData.has('consentDataAccuracy');
            
            console.log('🚀 Wysyłam zgłoszenie...', applicationData);
            await api.submitApplication(applicationData);
            
            console.log('✅ Zgłoszenie wysłane pomyślnie!');
            showNotification('Twoje zgłoszenie zostało wysłane.', 'success');
            closeApplicationModal();
            closeCourseModal();
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania:', error);
            showNotification(error.message || 'Błąd podczas zapisywania zgłoszenia', 'error');
        }
    };
    
    // Attach event listeners
    const submitBtn = document.getElementById('submit-application-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-application-btn');
    const modal = document.getElementById('application-modal');
    const modalContent = modal.querySelector('.bg-white');
    
    // Submit button
    if (submitBtn) {
        submitBtn.addEventListener('click', submitApplicationForm);
        console.log('🔗 Event listener dodany do przycisku submit');
    } else {
        console.error('❌ Nie znaleziono przycisku submit');
    }
    
    // Close button (X)
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔗 Zamykanie przez przycisk X');
            closeApplicationModal();
        });
        console.log('🔗 Event listener dodany do przycisku X');
    }
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔗 Zamykanie przez przycisk Anuluj');
            closeApplicationModal();
        });
        console.log('🔗 Event listener dodany do przycisku Anuluj');
    }
    
    // Close on click outside modal
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                console.log('🔗 Zamykanie przez kliknięcie poza modal');
                closeApplicationModal();
            }
        });
        console.log('🔗 Event listener dodany do kliknięcia poza modal');
    }
    
    // Close on ESC key
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            console.log('🔗 Zamykanie przez ESC');
            closeApplicationModal();
        }
    };
    document.addEventListener('keydown', handleEscKey);
    console.log('🔗 Event listener dodany do klawisza ESC');
    
    // Store the handler reference for cleanup
    modal.escKeyHandler = handleEscKey;
}

window.closeApplicationModal = function() {
    console.log('🚪 Zamykanie modala...');
    const modal = document.getElementById('application-modal');
    if (modal) {
        // Usuń ESC key listener jeśli istnieje
        if (modal.escKeyHandler) {
            document.removeEventListener('keydown', modal.escKeyHandler);
            console.log('🔗 Usunięto ESC key listener');
        }
        
        // Usuń modal
        modal.remove();
        console.log('✅ Modal zamknięty');
    } else {
        console.warn('⚠️ Modal nie znaleziony');
    }
}

// News loading functions
async function loadNews() {
    try {
        const response = await api.getNews({ limit: 3 });
        const newsContainer = document.getElementById('news-container');
        
        if (!newsContainer) return;

        newsContainer.innerHTML = response.news.map(article => {
            // Enhanced smart image assignment for news
            let imageUrl = article.imageUrl;
            console.log('Original imageUrl:', imageUrl);
            if (!imageUrl || imageUrl === '/imgs/halazdjecie.jpg' || imageUrl === './imgs/halazdjecie.jpg' || imageUrl === './imgs/bcccuu.jpg' || imageUrl === '/imgs/bcccuu.jpg') {
                console.log('Using smart image assignment for article:', article.title);
                const title = (article.title || '').toLowerCase();
                const content = (article.excerpt || article.contentHTML || '').toLowerCase();
                const text = title + ' ' + content;
                
                if (text.includes('transport') || text.includes('pojazd') || text.includes('ciężar') || text.includes('truck') || text.includes('regulacje') || text.includes('drogowy')) {
                    const transportImages = [
                        '/imgs/truck-logistics-operation-dusk.jpg',
                        '/imgs/abstract-design-background-trucks-transport-trackinghighway-delivering.jpg',
                        '/imgs/truck-inside-warehouse.jpg',
                        '/imgs/transportation-logistics-container-cargo-ship-cargo-plane.jpg'
                    ];
                    imageUrl = transportImages[Math.abs(text.length) % transportImages.length];
                } else if (text.includes('magazyn') || text.includes('składow') || text.includes('storage') || text.includes('warehouse')) {
                    const magazynImages = [
                        '/imgs/cargo-transport-robot-is-parked-floor-near-shelves-with-merchandise-spacious-warehouse-that-is-lit-night-by-generative-ai.jpg',
                        '/imgs/warehouse-worker-checking-inventory-arrived-goods-packages-storage-department.jpg',
                        '/imgs/medium-shot-woman-storage.jpg',
                        '/imgs/medium-shot-smiley-man-warehouse.jpg'
                    ];
                    imageUrl = magazynImages[Math.abs(text.length) % magazynImages.length];
                } else if (text.includes('dostaw') || text.includes('kurier') || text.includes('przesył') || text.includes('delivery')) {
                    imageUrl = '/imgs/courier-with-delivery-cardboard-box-by-car.jpg';
                } else if (text.includes('logist') || text.includes('spedyc') || text.includes('zarządzanie') || text.includes('planowanie') || text.includes('zielona') || text.includes('raport') || text.includes('rynek')) {
                    imageUrl = '/imgs/transport-logistic-manager-checking-control-logistic-network-distribution-customer.jpg';
                } else if (text.includes('bezpieczeńst') || text.includes('bhp') || text.includes('pracowni') || text.includes('safety')) {
                    imageUrl = '/imgs/woman-safety-equipment-working.jpg';
                } else if (text.includes('pracowni') || text.includes('zespół') || text.includes('employee') || text.includes('worker')) {
                    imageUrl = '/imgs/happy-employee-holding-scanner-distribution-warehouse.jpg';
                } else if (text.includes('technolog') || text.includes('innowac') || text.includes('cyfrowy') || text.includes('robot') || text.includes('digitalizac') || text.includes('trendy') || text.includes('ai')) {
                    imageUrl = '/imgs/drone-flying-modern-warehouse.jpg';
                } else {
                    // Fallback: random selection from general logistics images
                    const fallbackImages = [
                        '/imgs/transport-logistics-concept.jpg',
                        '/imgs/truck-logistics-operation-dusk (1).jpg',
                        '/imgs/16617.jpg'
                    ];
                    imageUrl = fallbackImages[Math.abs(text.length) % fallbackImages.length];
                    console.log('Using fallback image:', imageUrl);
                }
                console.log('Final imageUrl:', imageUrl);
            } else {
                console.log('Using existing imageUrl:', imageUrl);
                if (imageUrl && imageUrl.startsWith('./imgs/')) {
                    imageUrl = imageUrl.replace('./imgs/', '/imgs/');
                }
            }
            
            return `
            <article class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div class="news-image-bg image-hover" style="background-image: url('${imageUrl}');"></div>
                <div class="p-6">
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs text-gray-500">${new Date(article.publishedAt).toLocaleDateString('pl-PL')}</span>
                        <span class="text-xs text-primary font-semibold">AKTUALNOŚCI</span>
                    </div>
                    <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">${article.title}</h3>
                    <p class="text-gray-600 text-sm mb-4 line-clamp-3">${article.excerpt || ''}</p>
                    <button onclick="console.log('🔍 API button clicked:', '${article._id || article.slug}'); 
                                     if(typeof openArticle === 'function') { 
                                         openArticle('${article._id || article.slug}'); 
                                     } else { 
                                         console.warn('openArticle not available, using direct redirect'); 
                                         window.location.href='/article/${encodeURIComponent(article._id || article.slug)}'; 
                                     }" class="text-primary hover:text-primary-dark font-medium text-sm">
                        Czytaj więcej →
                    </button>
                </div>
            </article>
        `;
        }).join('');
    } catch (error) {
        console.error('Error loading news:', error);
        showNotification('Błąd podczas ładowania aktualności', 'error');
    }
}

// Open article in dedicated page
function openArticle(articleId) {
    console.log('🔍 Opening article:', articleId);
    
    if (!articleId) {
        console.error('❌ No article ID provided');
        if (typeof showNotification === 'function') {
            showNotification('Błąd: Brak identyfikatora artykułu', 'error');
        } else {
            alert('Błąd: Brak identyfikatora artykułu');
        }
        return;
    }
    
    // Navigate to article page with clean URL
    const articleUrl = `/article/${encodeURIComponent(articleId)}`;
    console.log('🌐 Redirecting to:', articleUrl);
    window.location.href = articleUrl;
}

// Make function globally available
window.openArticle = openArticle;

// Legacy function for compatibility - redirects to new system
async function showNewsModal(slug) {
    openArticle(slug);
}

// Legacy function for compatibility
function closeNewsModal() {
    // No longer needed with dedicated pages
    console.log('Modal system replaced with dedicated article pages');
}

// Job offers loading functions
async function loadJobOffers() {
    try {
        const response = await api.getJobOffers({ limit: 3 });
        const jobsContainer = document.getElementById('jobs-container');
        
        if (!jobsContainer) return;

        jobsContainer.innerHTML = response.jobOffers.map(job => `
            <div class="bg-white rounded-xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 border-l-4 border-blue-400">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-black mb-2">${job.title}</h3>
                        <p class="text-gray-600 font-medium">${job.companyName}</p>
                        <p class="text-gray-500 text-sm">📍 ${job.location}</p>
                    </div>
                    <span class="text-xs text-blue-700 font-bold bg-blue-100 px-3 py-1 rounded-full">${job.employmentType}</span>
                </div>
                <div class="space-y-3 mb-4">
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="ri-calendar-line text-gray-400 mr-2"></i>
                        <span>Do: ${new Date(job.expireAt).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="ri-user-line text-gray-400 mr-2"></i>
                        <span>${job.experienceLevel}</span>
                    </div>
                </div>
                <p class="text-gray-700 text-sm mb-4 line-clamp-2">${job.descriptionHTML.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                <div class="flex gap-3">
                    ${job.applyUrl ? `
                        <a href="${job.applyUrl}" target="_blank" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2">
                            <i class="ri-external-link-line text-sm"></i>
                            Aplikuj
                        </a>
                    ` : ''}
                    <button onclick="showJobModal('${job._id}')" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors">
                        Szczegóły
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading job offers:', error);
        showNotification('Błąd podczas ładowania ofert pracy', 'error');
    }
}

async function showJobModal(id) {
    try {
        const response = await api.getJobOffer(id);
        const job = response.jobOffer;
        
        const modalHTML = `
            <div id="job-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div class="p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h2 class="text-2xl font-bold text-gray-900 mb-2">${job.title}</h2>
                                <p class="text-lg text-gray-600">${job.companyName}</p>
                                <p class="text-gray-500">📍 ${job.location}</p>
                            </div>
                            <button onclick="closeJobModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-gray-900 mb-2">Szczegóły oferty</h3>
                                <div class="space-y-2 text-sm">
                                    <div><strong>Typ zatrudnienia:</strong> ${job.employmentType}</div>
                                    <div><strong>Poziom:</strong> ${job.experienceLevel}</div>
                                    <div><strong>Wygasa:</strong> ${new Date(job.expireAt).toLocaleDateString('pl-PL')}</div>
                                    ${job.salaryFrom || job.salaryTo ? `
                                        <div><strong>Wynagrodzenie:</strong> 
                                            ${job.salaryFrom && job.salaryTo ? `${job.salaryFrom} - ${job.salaryTo} PLN` : 
                                              job.salaryFrom ? `od ${job.salaryFrom} PLN` : 
                                              `do ${job.salaryTo} PLN`}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-gray-900 mb-2">Kontakt</h3>
                                <div class="space-y-2 text-sm">
                                    ${job.contactEmail ? `<div><strong>Email:</strong> ${job.contactEmail}</div>` : ''}
                                    ${job.applyUrl ? `<div><strong>Link:</strong> <a href="${job.applyUrl}" target="_blank" class="text-primary hover:underline">Złóż aplikację</a></div>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="prose max-w-none">
                            <h3 class="font-semibold text-gray-900 mb-2">Opis stanowiska</h3>
                            ${job.descriptionHTML}
                            
                            ${job.requirements ? `
                                <h3 class="font-semibold text-gray-900 mb-2 mt-4">Wymagania</h3>
                                ${job.requirements}
                            ` : ''}
                            
                            ${job.benefits ? `
                                <h3 class="font-semibold text-gray-900 mb-2 mt-4">Benefity</h3>
                                ${job.benefits}
                            ` : ''}
                        </div>
                        
                        <div class="mt-6 flex gap-4">
                            ${job.applyUrl ? `
                                <a href="${job.applyUrl}" target="_blank" class="bg-gradient-to-r from-primary-dark to-primary-light text-white px-6 py-2 rounded-lg hover:from-red-700 hover:to-red-600 transition-all">
                                    Aplikuj teraz
                                </a>
                            ` : ''}
                            <button onclick="closeJobModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Zamknij
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Error loading job details:', error);
        showNotification('Błąd podczas ładowania szczegółów oferty', 'error');
    }
}

function closeJobModal() {
    const modal = document.getElementById('job-modal');
    if (modal) {
        modal.remove();
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-black' :
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        api.user = user;
        updateUI();
    }
    
    // Load content based on current page
    if (document.getElementById('courses-container')) {
        loadCourses();
    }
    
    if (document.getElementById('news-container')) {
        loadNews();
    }
    
    if (document.getElementById('jobs-container')) {
        loadJobOffers();
    }
    
    // Add loading states
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(el => {
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
    });
});

function updateUI() {
    // Update login buttons
    const loginButtons = document.querySelectorAll('[onclick="showLoginModal()"]');
    loginButtons.forEach(button => {
        if (api.user) {
            button.innerHTML = `
                <span class="hidden md:inline">${api.user.firstName}</span>
                <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <i class="ri-user-line"></i>
                </div>
            `;
            button.onclick = () => showUserMenu();
        } else {
            button.innerHTML = 'Zaloguj się';
            button.onclick = () => showLoginModal();
        }
    });
}

function showUserMenu() {
    const modalHTML = `
        <div id="user-menu-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-sm w-full">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Menu użytkownika</h2>
                        <button onclick="closeUserMenu()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="text-center">
                            <div class="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                                <i class="ri-user-line text-white text-2xl"></i>
                            </div>
                            <p class="font-semibold">${api.user.firstName} ${api.user.lastName}</p>
                            <p class="text-sm text-gray-600">${api.user.email}</p>
                            <p class="text-xs text-gray-500">${api.user.role}</p>
                        </div>
                        
                        <div class="border-t pt-4">
                            ${api.user.role === 'admin' ? '<a href="/admin" class="block w-full text-center bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors mb-2">Panel Administratora</a>' : ''}
                            <button onclick="logoutUser()" class="block w-full text-center bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Wyloguj się
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeUserMenu() {
    const modal = document.getElementById('user-menu-modal');
    if (modal) {
        modal.remove();
    }
}

async function logoutUser() {
    try {
        await api.logout();
        showNotification('Wylogowano pomyślnie', 'success');
        closeUserMenu();
        location.reload();
    } catch (error) {
        showNotification('Błąd wylogowywania: ' + error.message, 'error');
    }
}

// Show registration modal
function showRegistrationModal() {
    const modalHTML = `
        <div id="registration-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Zarejestruj się</h2>
                        <button onclick="closeRegistrationModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                    </div>
                    
                    <form id="registration-form" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Imię *</label>
                                <input type="text" name="firstName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Nazwisko *</label>
                                <input type="text" name="lastName" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hasło *</label>
                            <input type="password" name="password" required minlength="6" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input type="tel" name="phone" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Rola *</label>
                            <select name="role" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="kursant">Kursant</option>
                                <option value="pracodawca">Pracodawca</option>
                                <option value="wykladowca">Wykładowca</option>
                                <option value="redaktor">Redaktor</option>
                            </select>
                        </div>
                        
                        <div id="company-field" class="hidden">
                            <label class="block text-sm font-medium text-gray-700 mb-1">Nazwa firmy *</label>
                            <input type="text" name="companyName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" name="consentRODO" required class="mr-2">
                                <span class="text-sm text-gray-700">Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z RODO *</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" name="consentMarketing" class="mr-2">
                                <span class="text-sm text-gray-700">Wyrażam zgodę na otrzymywanie informacji marketingowych</span>
                            </label>
                        </div>
                        
                        <div class="flex gap-4 pt-4">
                            <button type="submit" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1">
                                Zarejestruj się
                            </button>
                            <button type="button" onclick="closeRegistrationModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Anuluj
                            </button>
                        </div>
                    </form>
                    
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-600">
                            Masz już konto? 
                            <button onclick="closeRegistrationModal(); showLoginModal();" class="text-primary hover:text-red-700 font-medium">
                                Zaloguj się
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show/hide company field based on role
    const roleSelect = document.querySelector('#registration-form select[name="role"]');
    const companyField = document.querySelector('#company-field');
    
    roleSelect.addEventListener('change', function() {
        if (this.value === 'pracodawca') {
            companyField.classList.remove('hidden');
            companyField.querySelector('input').required = true;
        } else {
            companyField.classList.add('hidden');
            companyField.querySelector('input').required = false;
        }
    });
    
    // Handle form submission
    document.getElementById('registration-form').addEventListener('submit', handleRegistration);
}

// Show login modal
function showLoginModal() {
    const modalHTML = `
        <div id="login-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-lg max-w-md w-full">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Zaloguj się</h2>
                        <button onclick="closeLoginModal()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                    </div>
                    
                    <form id="login-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" name="email" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hasło *</label>
                            <input type="password" name="password" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        </div>
                        
                        <div class="flex gap-4 pt-4">
                            <button type="submit" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1">
                                Zaloguj się
                            </button>
                            <button type="button" onclick="closeLoginModal()" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                                Anuluj
                            </button>
                        </div>
                    </form>
                    
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-600">
                            Nie masz konta? 
                            <button onclick="closeLoginModal(); showRegistrationModal();" class="text-primary hover:text-red-700 font-medium">
                                Zarejestruj się
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', handleLogin);
}

// Close modals
function closeRegistrationModal() {
    const modal = document.getElementById('registration-modal');
    if (modal) {
        modal.remove();
    }
}

function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.remove();
    }
}

// Handle registration
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        companyName: formData.get('companyName'),
        consentRODO: formData.get('consentRODO') === 'on',
        consentMarketing: formData.get('consentMarketing') === 'on'
    };
    
    try {
        const result = await api.register(userData);
        showNotification('Konto zostało utworzone. Oczekuje na zatwierdzenie przez administratora.', 'success');
        closeRegistrationModal();
    } catch (error) {
        showNotification('Błąd rejestracji: ' + error.message, 'error');
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
        const result = await api.login(email, password);
        showNotification('Zalogowano pomyślnie!', 'success');
        closeLoginModal();
        location.reload(); // Refresh to update UI
    } catch (error) {
        showNotification('Błąd logowania: ' + error.message, 'error');
    }
}

// Export for use in other scripts
window.BCUAPI = BCUAPI;
window.api = api;
window.showCourseModal = showCourseModal;
window.closeCourseModal = closeCourseModal;
window.showRegistrationModal = showRegistrationModal;
window.showLoginModal = showLoginModal;
window.closeRegistrationModal = closeRegistrationModal;
window.closeLoginModal = closeLoginModal;
window.showUserMenu = showUserMenu;
window.closeUserMenu = closeUserMenu;
window.logoutUser = logoutUser;

