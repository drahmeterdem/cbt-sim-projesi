// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";
import * as fb from './firebase.js';

// --- Type Definitions ---
interface Scenario {
    id: string;
    title: string;
    description: string;
    profile?: string;
    isCustom: boolean;
}

// --- Gemini AI Client Initialization ---
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Global State & Constants ---
let currentStudentName: string = '';
let currentUserId: string = '';
let activeTeacherTab: string = 'requests';
const TEACHER_PASSWORD = 'teacher3243';
const TEACHER_SESSION_KEY = 'cbt_sim_teacher_session_v1';


// --- DOM Element References ---
const mainContentContainer = document.getElementById('main-content-container')!;
const mainNav = document.getElementById('main-nav')!;
const studentInfo = document.getElementById('student-info')!;
const headerButtons = document.getElementById('header-buttons')!;
const notificationContainer = document.getElementById('notification-container')!;
const rationaleModal = {
    container: document.getElementById('rationale-modal')!,
    title: document.getElementById('modal-title')!,
    content: document.getElementById('modal-content')!,
};
const summaryModal = {
    container: document.getElementById('ai-summary-modal')!,
    title: document.getElementById('summary-modal-title')!,
    content: document.getElementById('summary-modal-content')!,
};
const loadingOverlay = document.getElementById('loading-overlay')!;
const configWarningOverlay = document.getElementById('config-warning-overlay')!;


// --- System Prompts (Keep as is) ---
const simulationSystemInstruction = `SENİN BİRİNCİL VE EN ÖNEMLİ GÖREVİN: Bir Bilişsel Davranışçı Terapi (BDT) simülasyonunda, adı Elif olan sanal bir danışanı **olağanüstü derecede gerçekçi bir şekilde** canlandırmak. Belirlenen sorun alanını ve danışan profilini tamamen içselleştir. Yanıtların, sanki gerçekten o duyguları yaşayan, o düşüncelere sahip bir insanmışsın gibi gelmeli. Amacın, mümkün olan en otantik seans deneyimini yaratmak.

**Gerçekçilik İlkeleri:**
*   **Duygusal Derinlik:** Sadece belirtilen sorunu tekrar etme. O sorunun getirdiği umutsuzluğu, kaygıyı, öfkeyi veya hayal kırıklığını hissettir. Cevaplarının duygusal tonu, terapistin sözlerine göre anlık olarak değişsin.
*   **Doğal Dil ve Akış:** Kitaptan fırlamış gibi değil, günlük konuşma dilinde, doğal bir akışla konuş. Duraksamalar, "hmm...", "yani...", "aslında..." gibi ifadeler kullanmaktan çekinme. Cümlelerin kısa ve net olmak zorunda değil; bazen düşüncelerini toparlamaya çalışır gibi konuş.
*   **Tutarlı Hafıza ve Kişilik:** Konuşmanın önceki kısımlarını hatırla ve bunlara atıfta bulun. ("Daha önce de söylediğim gibi...", "Bu, az önce bahsettiğiniz şeyle ilgili sanırım...") Belirlenen kişilik profilinle tutarlı kal.
*   **Dinamik Tepkisellik:** Terapistin yaklaşımına göre tepkilerin organik olarak değişsin. Empatik ve etkili bir müdahalede yavaşça açılabilir, kendini daha güvende hissedebilirsin. Kötü, yargılayıcı veya aceleci bir müdahalede ise tamamen kapanabilir, savunmacı olabilir, "bilmiyorum" diyebilir veya konuyu değiştirebilirsin. Direnç göstermekten ve sessiz kalmaktan çekinme.
*   **Diyalog Odaklılık:** Önceliğin her zaman diyalogun kendisi olmalı. Konuşmayı bir dizi soru-cevap olarak değil, organik bir şekilde gelişen, kesintisiz bir sohbet olarak sürdür.

**İKİNCİL GÖREVİN (Arka Plan Analizi):**
Bu gerçekçi diyaloğu ('clientResponse' olarak) oluşturduktan sonra, arka planda bir analiz yapmalı ve terapistin son müdahalesini değerlendiren aşağıdaki JSON yapısını **eksiksiz** doldurmalısın:
1.  **Geri Bildirim (feedback):** Yapıcı, kısa ve net bir geri bildirim.
2.  **Gerekçe (rationale):** BDT temelli kısa bir teorik açıklama.
3.  **Puanlama (scoring):** 'empathy', 'technique', 'rapport' için 1-10 arası puanlama.
4.  **Danışan Etkisi (clientImpact):** 'emotionalRelief', 'cognitiveClarity' için 1-10 arası puanlama.
5.  **Yeni Seçenekler (therapistOptions):** Terapist için birbirinden farklı ve gerçekçi DÖRT adet yanıt seçeneği.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin içermemelidir.`;
const analysisSystemInstruction = `Sen, Bilişsel Davranışçı Terapi (BDT) alanında uzman bir süpervizörsün. Sana sunulan terapi seansı transkriptini analiz ederek yapılandırılmış bir geri bildirim sağlamalısın. Analizin, öğrencinin becerilerini geliştirmesine yardımcı olacak şekilde hem destekleyici hem de yapıcı olmalı.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin, açıklama veya kod bloğu içermemelidir. Analizini aşağıdaki başlıklara göre yapılandır:
1.  **overallSummary:** Seansın genel bir değerlendirmesi ve ana teması hakkında kısa bir özet.
2.  **strengths:** Terapistin seans boyunca sergilediği güçlü yönler (örn: etkili empati kullanımı, doğru yeniden yapılandırma tekniği, güçlü terapötik ittifak). Maddeler halinde listele.
3.  **areasForImprovement:** Terapistin geliştirebileceği alanlar (örn: daha açık uçlu sorular sorma, Sokratik sorgulamayı derinleştirme, danışanın otomatik düşüncelerini daha net belirleme). Maddeler halinde listele.
4.  **keyMomentsAnalysis:** Transkriptteki 2-3 kritik anı belirle. Bu anlarda terapistin müdahalesini, bu müdahalesinin potansiyel etkilerini ve alternatif yaklaşımları analiz et.`;
const studentSummarySystemInstruction = `Sen, BDT alanında uzman bir eğitim süpervizörüsün. Sana bir öğrencinin birden fazla simülasyon seansındaki konuşma kayıtları verilecek. Görevin, bu kayıtlara dayanarak öğrencinin genel performansı hakkında kapsamlı bir özet ve yapıcı geri bildirim oluşturmaktır.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin, açıklama veya kod bloğu içermemelidir. Analizini aşağıdaki başlıklara göre yapılandır:
1.  **overallPerformanceSummary:** Öğrencinin genel yetkinliği, yaklaşımı ve zaman içindeki gelişimi hakkında kısa bir yönetici özeti.
2.  **recurringStrengths:** Öğrencinin simülasyonlar boyunca tutarlı bir şekilde sergilediği güçlü yönler ve beceriler. Maddeler halinde listele.
3.  **patternsForImprovement:** Öğrencinin tekrar eden zorlukları, geliştirmesi gereken beceriler veya kaçındığı müdahaleler. Maddeler halinde listele.
4.  **actionableSuggestions:** Öğrencinin gelişimini desteklemek için 2-3 adet somut, eyleme geçirilebilir öneri (örn: "Sokratik sorgulama tekniğini daha derinden keşfetmek için 'X' senaryosunu tekrar deneyebilir.", "Danışan direnciyle karşılaştığında verdiği tepkileri gözden geçirmesi faydalı olacaktır.").`;

// --- User & State Management ---

function getInitialState() {
    return {
        simulation: {
            conversationHistory: [] as any[],
            currentProblem: '',
            currentScenarioId: ''
        },
        completedSimulations: [] as any[],
        uploadedSessions: [] as any[],
    };
}

async function loadState(studentId: string): Promise<ReturnType<typeof getInitialState>> {
    const savedState = await fb.loadState(studentId);
    const initialState = getInitialState();
    if (savedState) {
        const parsedState = savedState as any;
        return {
            ...initialState,
            ...parsedState,
            simulation: { ...initialState.simulation, ...(parsedState.simulation || {}) },
            uploadedSessions: parsedState.uploadedSessions || initialState.uploadedSessions,
            completedSimulations: parsedState.completedSimulations || initialState.completedSimulations,
        };
    }
    return initialState;
}

async function saveState(studentId: string, state: object) {
    if (!studentId) return;
    await fb.saveState(studentId, state);
}


// --- Scenarios Management ---
const defaultScenarios: Scenario[] = [
    { id: 'default_anxiety', title: 'Sınav Kaygısı', description: 'Yaklaşan önemli bir sınav nedeniyle yoğun stres ve başarısızlık korkusu yaşayan bir danışan.', isCustom: false },
    { id: 'default_social', title: 'Sosyal Fobi', description: 'Kalabalık ortamlarda konuşmaktan ve eleştirilmekten korkan, bu yüzden sosyal etkinliklerden kaçınan bir danışan.', isCustom: false },
    { id: 'default_motivation', title: 'Motivasyon Eksikliği', description: 'Hedeflerine ulaşma konusunda isteksizlik ve erteleme davranışı sergileyen bir danışan.', isCustom: false },
    { id: 'default_relationship', title: 'İlişki Sorunları', description: 'Partneriyle sürekli çatışma yaşayan ve iletişim kurmakta zorlanan bir danışan.', isCustom: false },
    { id: 'default_panic', title: 'Panik Atak', description: 'Beklenmedik anlarda gelen yoğun korku ve fiziksel belirtilerle (çarpıntı, nefes darlığı) mücadele eden bir danışan.', isCustom: false },
    { id: 'default_depression', title: 'Depresif Duygudurum', description: 'Hayattan keyif alamama, sürekli yorgunluk ve umutsuzluk hisleriyle başa çıkmaya çalışan bir danışan.', isCustom: false },
];

function getAllScenarios(): Scenario[] {
    return [...defaultScenarios]; // Custom scenarios can be added later
}

// --- UI Helper Functions ---
function showLoader(show: boolean) {
    loadingOverlay.classList.toggle('hidden', !show);
}

function showNotification(message: string, duration: number = 3000, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    notification.className = `${bgColor} text-white font-semibold py-2 px-4 rounded-lg shadow-lg animate-fade-in-up`;
    notification.textContent = message;
    notificationContainer.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => notification.remove(), 500);
    }, duration);
}

function showModal(modal: 'rationale' | 'summary', title: string, content: string) {
    const modalRef = modal === 'rationale' ? rationaleModal : summaryModal;
    modalRef.title.textContent = modal === 'summary' ? `${title} için AI Performans Özeti` : title;
    modalRef.content.innerHTML = content;
    modalRef.container.classList.remove('hidden');
}

function hideModal(modal: 'rationale' | 'summary') {
    const modalRef = modal === 'rationale' ? rationaleModal : summaryModal;
    modalRef.container.classList.add('hidden');
}


// --- Core Rendering Logic ---

/**
 * The main function to render content into the main container.
 * It clears the previous content and injects the new HTML.
 */
function renderContent(html: string) {
    mainContentContainer.innerHTML = html;
}

function renderLoginScreen(error = '', success = '') {
    headerButtons.innerHTML = '';
    mainNav.classList.add('hidden');
    studentInfo.classList.add('hidden');

    renderContent(`
        <div class="screen flex items-center justify-center">
            <div class="w-full max-w-md mx-auto bg-white/50 backdrop-blur-lg p-10 rounded-2xl shadow-xl">
                <!-- Login View -->
                <div id="login-view">
                    <h2 class="text-gray-900 tracking-tight text-3xl font-bold text-center">Öğrenci Girişi</h2>
                    <p class="text-center text-gray-600 mt-2">Lütfen bilgilerinizi girin.</p>
                    ${error ? `<div class="text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-sm">${error}</div>` : ''}
                    ${success ? `<div class="text-green-700 bg-green-100 p-3 rounded-lg mt-4 text-sm">${success}</div>` : ''}
                    <div class="mt-6 space-y-4">
                        <div>
                            <label for="username-input" class="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                            <input type="text" id="username-input" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-3">
                        </div>
                        <div>
                            <label for="password-input" class="block text-sm font-medium text-gray-700">Şifre</label>
                            <input type="password" id="password-input" class="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-3">
                        </div>
                        <button data-action="login" class="w-full flex items-center justify-center rounded-lg h-14 px-8 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all text-lg shadow-lg">Giriş Yap</button>
                    </div>
                    <div class="mt-6 text-center text-sm text-gray-600 space-x-4">
                        <a href="#" data-action="show-register-view" class="font-semibold text-[var(--primary-color)] hover:underline">Hesap Oluştur</a>
                        <a href="#" data-action="show-teacher-login-view" class="font-semibold text-amber-600 hover:underline">Öğretmen Girişi</a>
                    </div>
                </div>
                <!-- Register View (Initially Hidden) -->
                <div id="register-view" class="hidden">
                     <h2 class="text-gray-900 tracking-tight text-3xl font-bold text-center">Öğrenci Kaydı</h2>
                     <div id="register-error" class="hidden text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-sm"></div>
                     <div class="mt-6 space-y-4">
                         <input type="text" id="register-username-input" placeholder="Kullanıcı Adı" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-3">
                         <input type="password" id="register-password-input" placeholder="Şifre (en az 6 karakter)" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-3">
                         <input type="password" id="register-confirm-password-input" placeholder="Şifre Tekrar" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-3">
                         <button data-action="register" class="w-full flex items-center justify-center rounded-lg h-14 px-8 bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-all text-lg shadow-lg">Kayıt Ol</button>
                     </div>
                     <p class="text-center text-sm text-gray-600 mt-6">Zaten bir hesabın var mı? <a href="#" data-action="show-login-view" class="font-semibold text-[var(--primary-color)] hover:underline">Giriş Yap</a></p>
                </div>
                <!-- Teacher Login View (Initially Hidden) -->
                <div id="teacher-login-view" class="hidden">
                    <h2 class="text-gray-900 tracking-tight text-3xl font-bold text-center">Öğretmen Girişi</h2>
                    <div id="teacher-login-error" class="hidden text-red-600 bg-red-100 p-3 rounded-lg mt-4 text-sm"></div>
                    <div class="mt-6 space-y-4">
                        <input type="password" id="teacher-password-input" placeholder="Yönetici Şifresi" class="block w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-lg p-3">
                        <button data-action="teacher-login" class="w-full flex items-center justify-center rounded-lg h-14 px-8 bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all text-lg shadow-lg">Giriş Yap</button>
                    </div>
                    <p class="text-center text-sm text-gray-600 mt-6"><a href="#" data-action="show-login-view" class="font-semibold text-amber-600 hover:underline">Öğrenci Girişine Dön</a></p>
                </div>
            </div>
        </div>
    `);
}

async function renderStudentDashboard() {
    showLoader(true);
    const state = await loadState(currentUserId);
    
    headerButtons.innerHTML = `<button data-action="logout" class="flex items-center justify-center rounded-lg h-10 px-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-sm">
        <span class="material-symbols-outlined mr-2">logout</span><span>Çıkış Yap</span>
    </button>`;
    
    mainNav.innerHTML = `
        <button data-action="render-student-dashboard" class="nav-link active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold">
            <span class="material-symbols-outlined">dashboard</span> Panelim
        </button>
        <button data-action="render-problem-selection" class="nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100">
            <span class="material-symbols-outlined">play_circle</span> Yeni Simülasyon
        </button>
    `;
    mainNav.classList.remove('hidden');

    let continueSessionHtml = '';
    if (state.simulation.currentProblem) {
        continueSessionHtml = `
            <div class="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-xl text-center">
                <span class="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-3">play_circle</span>
                <h3 class="text-xl font-bold text-gray-800">Devam Et: ${state.simulation.currentProblem}</h3>
                <p class="text-gray-600 mt-2 mb-4">Kaldığın yerden simülasyona devam et.</p>
                <button data-action="resume-simulation" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all">Devam Et</button>
            </div>`;
    }

    let completedSimulationsHtml = '<p class="text-center text-gray-500">Henüz tamamlanmış bir simülasyonunuz yok.</p>';
    if (state.completedSimulations.length > 0) {
        completedSimulationsHtml = state.completedSimulations.map(sim => `
            <div class="p-4 bg-indigo-50 rounded-lg">
                <p class="font-semibold text-gray-800">${sim.title}</p>
                <p class="text-sm text-gray-500">Tamamlanma: ${new Date(sim.completionDate).toLocaleString()}</p>
            </div>
        `).join('');
    }

    renderContent(`
        <div class="w-full max-w-4xl mx-auto space-y-8">
            <div class="text-center">
                <h2 class="text-gray-900 tracking-tight text-3xl sm:text-4xl font-bold">Hoş Geldin, <span class="text-indigo-600">${currentStudentName}</span>!</h2>
                <p class="text-gray-600 text-lg mt-2">Bugün ne yapmak istersin?</p>
            </div>
            ${continueSessionHtml}
            <div class="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-xl">
                <h3 class="text-xl font-bold text-gray-800 text-center mb-4">Tamamlanan Simülasyonlar</h3>
                <div class="space-y-4">${completedSimulationsHtml}</div>
            </div>
        </div>
    `);
    showLoader(false);
}

function renderProblemSelection() {
    headerButtons.innerHTML = `<button data-action="logout" class="flex items-center justify-center rounded-lg h-10 px-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-sm">
        <span class="material-symbols-outlined mr-2">logout</span><span>Çıkış Yap</span>
    </button>`;
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-action="render-problem-selection"]')?.classList.add('active');

    const scenariosHtml = getAllScenarios().map(s => `
        <button class="problem-button group" data-action="start-simulation" data-scenario-id="${s.id}">
            <h4 class="text-lg font-bold text-gray-800 group-hover:text-white">${s.title}</h4>
            <p class="text-sm text-gray-600 group-hover:text-indigo-200 mt-1">${s.description}</p>
        </button>
    `).join('');

    renderContent(`
        <div class="w-full max-w-5xl mx-auto">
            <div class="text-center">
                <h2 class="text-gray-900 tracking-tight text-3xl sm:text-4xl font-bold">Bir Senaryo Seçin</h2>
                <p class="text-gray-600 text-lg mt-2">Simülasyonu başlatmak için bir sorun alanı seçin.</p>
            </div>
            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${scenariosHtml}
            </div>
        </div>
    `);
}

async function renderTeacherDashboard(tab = 'requests') {
    activeTeacherTab = tab;
    showLoader(true);

    headerButtons.innerHTML = `<button data-action="logout" class="flex items-center justify-center rounded-lg h-10 px-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-sm">
        <span class="material-symbols-outlined mr-2">logout</span><span>Çıkış Yap</span>
    </button>`;
    
    mainNav.innerHTML = `
        <button data-action="render-teacher-dashboard" data-tab="requests" class="nav-link nav-link-teacher ${tab === 'requests' ? 'active' : ''} flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100">
            <span class="material-symbols-outlined">how_to_reg</span> Kayıt İstekleri
        </button>
        <button data-action="render-teacher-dashboard" data-tab="simulations" class="nav-link nav-link-teacher ${tab === 'simulations' ? 'active' : ''} flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100">
            <span class="material-symbols-outlined">psychology</span> Öğrenciler
        </button>
    `;
    mainNav.classList.remove('hidden');

    let tabContentHtml = '';
    if (tab === 'requests') {
        const pendingStudents = await fb.getPendingUsers();
        if (pendingStudents.length === 0) {
            tabContentHtml = '<p class="text-center text-gray-500 py-4">Onay bekleyen öğrenci bulunmuyor.</p>';
        } else {
            tabContentHtml = pendingStudents.map((user) => `
                <div class="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                    <span class="font-semibold text-gray-800">${user.username}</span>
                    <div class="flex gap-2">
                        <button data-action="approve-user" data-user-id="${user.id}" class="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-sm font-semibold">Onayla</button>
                        <button data-action="reject-user" data-user-id="${user.id}" class="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-sm font-semibold">Reddet</button>
                    </div>
                </div>
            `).join('');
        }
    } else if (tab === 'simulations') {
        const approvedStudents = await fb.getApprovedStudents();
        if (approvedStudents.length === 0) {
            tabContentHtml = '<p class="text-center text-gray-500 py-8 col-span-full">Henüz onaylanmış öğrenci bulunmuyor.</p>';
        } else {
            let studentCardsHtml = '';
            for (const student of approvedStudents) {
                const studentState = await loadState(student.id as string);
                const completedCount = studentState.completedSimulations.length;
                studentCardsHtml += `
                     <div class="bg-white/80 p-5 rounded-xl shadow-lg">
                        <h4 class="font-bold text-lg text-gray-800">${student.username}</h4>
                        <p class="text-gray-600 text-sm">${completedCount} seans tamamladı.</p>
                        <div class="mt-4 flex gap-2">
                            <button data-action="view-summary" data-student-id="${student.id}" data-student-name="${student.username}" class="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 text-sm font-semibold">AI Özet</button>
                        </div>
                    </div>`;
            }
            tabContentHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${studentCardsHtml}</div>`;
        }
    }

    renderContent(`
        <div class="w-full max-w-5xl mx-auto">
            <div class="text-center mb-6">
                <h2 class="text-gray-900 tracking-tight text-3xl sm:text-4xl font-bold">Öğretmen Paneli</h2>
                <p class="text-gray-600 text-lg mt-2">Öğrenci çalışmalarını ve etkileşimlerini buradan yönetin.</p>
            </div>
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl space-y-4">
                ${tabContentHtml}
            </div>
        </div>
    `);
    showLoader(false);
}


// --- Event Delegation & App Initialization ---
async function handleGlobalClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const actionTarget = target.closest('[data-action]');

    if (!actionTarget) return;

    const action = actionTarget.getAttribute('data-action')!;
    const actionData = (actionTarget as HTMLElement).dataset;

    showLoader(true); // Show loader for most actions

    switch (action) {
        // --- Auth ---
        case 'show-register-view':
            document.getElementById('login-view')?.classList.add('hidden');
            document.getElementById('teacher-login-view')?.classList.add('hidden');
            document.getElementById('register-view')?.classList.remove('hidden');
            break;
        case 'show-login-view':
             document.getElementById('register-view')?.classList.add('hidden');
             document.getElementById('teacher-login-view')?.classList.add('hidden');
             document.getElementById('login-view')?.classList.remove('hidden');
            break;
        case 'show-teacher-login-view':
             document.getElementById('login-view')?.classList.add('hidden');
             document.getElementById('register-view')?.classList.add('hidden');
             document.getElementById('teacher-login-view')?.classList.remove('hidden');
            break;
        case 'login':
            await handleLogin();
            break;
        case 'register':
            await handleRegister();
            break;
        case 'teacher-login':
            await handleTeacherLogin();
            break;
        case 'logout':
            await handleLogout();
            break;

        // --- Navigation ---
        case 'render-student-dashboard':
            await renderStudentDashboard();
            break;
        case 'render-problem-selection':
            renderProblemSelection();
            break;
        case 'render-teacher-dashboard':
            await renderTeacherDashboard(actionData.tab);
            break;

        // --- Teacher Actions ---
        case 'approve-user':
            await fb.updateUserStatus(actionData.userId!, 'approved');
            showNotification('Öğrenci onaylandı.');
            await renderTeacherDashboard('requests');
            break;
        case 'reject-user':
            await fb.updateUserStatus(actionData.userId!, 'rejected');
            showNotification('Öğrenci reddedildi.');
            await renderTeacherDashboard('requests');
            break;
        case 'view-summary':
             // await handleViewSummary(actionData.studentId!, actionData.studentName!);
            break;
        
        // --- Modal ---
        case 'close-modal':
            hideModal(actionData.modal as 'rationale' | 'summary');
            break;
    }

    showLoader(false); // Hide loader after action is complete
}

// --- Action Handlers ---
async function handleLogin() {
    const username = (document.getElementById('username-input') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password-input') as HTMLInputElement).value;
    if (!username || !password) {
        renderLoginScreen('Kullanıcı adı ve şifre boş bırakılamaz.');
        return;
    }
    try {
        const user = await fb.loginUser(username, password);
        const userData = await fb.getUserData(user.uid);
        if (userData?.status !== 'approved') {
            await fb.logoutUser();
            const message = userData?.status === 'pending'
                ? 'Hesabınız öğretmen onayını bekliyor.'
                : 'Hesabınız reddedildi veya geçersiz.';
            renderLoginScreen(message);
        }
        // onAuthStateChanged will handle the successful login redirect
    } catch (error) {
        console.error("Login error:", error);
        renderLoginScreen('Geçersiz kullanıcı adı veya şifre.');
    }
}

async function handleRegister() {
    const username = (document.getElementById('register-username-input') as HTMLInputElement).value.trim();
    const password = (document.getElementById('register-password-input') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('register-confirm-password-input') as HTMLInputElement).value;
    const errorDiv = document.getElementById('register-error')!;

    const showError = (msg: string) => {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    };
    
    errorDiv.classList.add('hidden');

    if (!username || !password) return showError('Tüm alanlar zorunludur.');
    if (password.length < 6) return showError('Şifre en az 6 karakter olmalıdır.');
    if (password !== confirmPassword) return showError('Şifreler eşleşmiyor.');

    try {
        await fb.registerUser(username, password);
        renderLoginScreen('', 'Kayıt başarılı! Hesabınız öğretmen onayını bekliyor.');
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            showError('Bu kullanıcı adı zaten alınmış.');
        } else {
            showError('Kayıt sırasında bir hata oluştu.');
        }
        console.error("Registration error:", error);
    }
}

async function handleTeacherLogin() {
    const password = (document.getElementById('teacher-password-input') as HTMLInputElement).value;
    if (password === TEACHER_PASSWORD) {
        sessionStorage.setItem(TEACHER_SESSION_KEY, 'true');
        location.reload(); // Reload to trigger auth flow
    } else {
        const errorDiv = document.getElementById('teacher-login-error')!;
        errorDiv.textContent = 'Geçersiz yönetici şifresi.';
        errorDiv.classList.remove('hidden');
    }
}

async function handleLogout() {
    const isTeacher = sessionStorage.getItem(TEACHER_SESSION_KEY);
    if (isTeacher) {
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
        location.reload();
    } else {
        await fb.logoutUser();
        // onAuthStateChanged will handle the UI update
    }
}


// --- App Initialization ---
function initializeApp() {
    // 1. Check for Firebase config first.
    if (fb.firebaseConfig.apiKey === "YOUR_API_KEY" || !fb.firebaseConfig.apiKey) {
        document.querySelector('.layout-container')!.classList.add('hidden');
        configWarningOverlay.classList.remove('hidden');
        return; // Stop all further execution
    }

    // 2. Setup the single global event listener.
    document.body.addEventListener('click', handleGlobalClick);

    // 3. Start the authentication flow.
    showLoader(true);
    fb.onAuthStateChanged(async (user) => {
        const isTeacher = sessionStorage.getItem(TEACHER_SESSION_KEY);

        if (isTeacher) {
            currentStudentName = 'Öğretmen Hesabı';
            studentInfo.innerHTML = `<span class="material-symbols-outlined text-amber-600">school</span><span class="font-semibold text-gray-800">${currentStudentName}</span>`;
            studentInfo.classList.remove('hidden');
            await renderTeacherDashboard(activeTeacherTab);
        } else if (user) {
            const userData = await fb.getUserData(user.uid);
            if (userData && userData.status === 'approved') {
                currentUserId = user.uid;
                currentStudentName = userData.username;
                studentInfo.innerHTML = `<span class="material-symbols-outlined">person</span><span class="font-semibold">${currentStudentName}</span>`;
                studentInfo.classList.remove('hidden');
                await renderStudentDashboard();
            } else {
                // This will trigger another onAuthStateChanged with user=null
                await fb.logoutUser();
            }
        } else {
            // Logged out state
            currentUserId = '';
            currentStudentName = '';
            renderLoginScreen();
        }
        showLoader(false);
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
