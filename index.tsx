// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";

// --- Type Definitions ---
interface Scenario {
    id: string;
    title: string;
    description: string;
    profile?: string;
    isCustom: boolean;
}

interface Resource {
    id:string;
    url: string;
    title: string;
    type: 'article' | 'video' | 'pdf';
    associatedScenarioIds: string[];
}

// --- Gemini AI Client Initialization ---
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Global State & Constants ---
let currentStudentName: string = '';
let currentUserId: string = ''; // Will now store username
let reviewingStudentId: string = '';
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests'; // Default to requests for teacher workflow
let currentAnalysisCache: { transcript: string; analysis: any } | null = null;

const TEACHER_PASSWORD = 'teacher3243';
const USERS_KEY = 'cbt_sim_users_v2'; // v2 includes approval status
const SESSION_KEY = 'cbt_sim_session_v1';


// --- DOM Element References ---
const screens = {
    welcome: document.getElementById('welcome-screen')!,
    login: document.getElementById('login-screen')!,
    studentDashboard: document.getElementById('student-dashboard-screen')!,
    problemSelection: document.getElementById('problem-selection-screen')!,
    simulation: document.getElementById('simulation-screen')!,
    sessionAnalysis: document.getElementById('session-analysis-screen')!,
    teacherDashboard: document.getElementById('teacher-dashboard-screen')!,
    teacherReview: document.getElementById('teacher-review-screen')!,
};

// Welcome Screen
const studentLoginButton = document.getElementById('student-login-button')!;
const teacherEntryButton = document.getElementById('teacher-entry-button')!;

// General UI
const studentInfo = document.getElementById('student-info')!;
const logoutButton = document.getElementById('logout-button')!;
const backToSelectionButton = document.getElementById('back-to-selection-button')!;
const notificationContainer = document.getElementById('notification-container')!;

// Login/Register Screen
const loginView = document.getElementById('login-view')!;
const registerView = document.getElementById('register-view')!;
const teacherLoginView = document.getElementById('teacher-login-view')!;
const showRegisterView = document.getElementById('show-register-view')!;
const showLoginView = document.getElementById('show-login-view')!;
const showTeacherLoginView = document.getElementById('show-teacher-login-view')!;
const showStudentLoginView = document.getElementById('show-student-login-view')!;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const passwordInput = document.getElementById('password-input') as HTMLInputElement;
const loginButton = document.getElementById('login-button')! as HTMLButtonElement;
const registerUsernameInput = document.getElementById('register-username-input') as HTMLInputElement;
const registerPasswordInput = document.getElementById('register-password-input') as HTMLInputElement;
const registerConfirmPasswordInput = document.getElementById('register-confirm-password-input') as HTMLInputElement;
const registerButton = document.getElementById('register-button')!;
const teacherPasswordInput = document.getElementById('teacher-password-input') as HTMLInputElement;
const teacherLoginButton = document.getElementById('teacher-login-button')! as HTMLButtonElement;
const loginError = document.getElementById('login-error')!;
const registerError = document.getElementById('register-error')!;
const registerSuccess = document.getElementById('register-success')!;
const teacherLoginError = document.getElementById('teacher-login-error')!;

// Problem Selection
const problemSelectionContainer = document.getElementById('problem-selection-container')!;

// Simulation Screen
const simulation = {
    problemDisplay: document.getElementById('current-problem-display')!,
    chatContainer: document.getElementById('chat-container')!,
    optionsContainer: document.getElementById('options-container')!,
    feedbackSection: document.getElementById('feedback-section')!,
    feedbackText: document.getElementById('feedback-text')!,
    customResponseInput: document.getElementById('custom-response-input') as HTMLTextAreaElement,
    sendCustomResponseButton: document.getElementById('send-custom-response-button') as HTMLButtonElement,
};
const saveProgressButton = document.getElementById('save-progress-button')!;

// Student Dashboard
const dashboardStudentName = document.getElementById('dashboard-student-name')!;
const continueSessionCard = document.getElementById('continue-session-card')!;
const goToAnalysisButton = document.getElementById('go-to-analysis-button')!;
const progressTracking = {
    card: document.getElementById('progress-tracking-card')!,
    container: document.getElementById('progress-charts-container')!,
};
const cumulativeProgress = {
    card: document.getElementById('cumulative-progress-card')!,
    container: document.getElementById('cumulative-charts-container')!,
};
const achievements = {
    container: document.getElementById('achievements-container')!,
};
const recommendations = {
    container: document.getElementById('recommendations-container')!,
};
const teacherQASystem = {
    history: document.getElementById('teacher-qa-history')!,
    input: document.getElementById('student-question-input') as HTMLInputElement,
    button: document.getElementById('ask-teacher-button')!,
};

// Session Analysis Screen
const analysis = {
    transcriptInput: document.getElementById('transcript-input') as HTMLTextAreaElement,
    analyzeButton: document.getElementById('analyze-transcript-button')! as HTMLButtonElement,
    output: document.getElementById('analysis-output')!,
    sendButton: document.getElementById('send-to-teacher-button')!,
    backButton: document.getElementById('back-to-dashboard-from-analysis')!,
};

// Teacher Dashboard
const teacherDashboard = {
    tabs: document.querySelectorAll('.teacher-tab'),
    contentContainer: document.getElementById('teacher-content-container')!,
    contents: {
        simulations: document.getElementById('simulations-content')!,
        requests: document.getElementById('requests-content')!,
        uploads: document.getElementById('uploads-content')!,
        questions: document.getElementById('questions-content')!,
        analytics: document.getElementById('analytics-content')!,
        builder: document.getElementById('builder-content')!,
        library: document.getElementById('library-content')!,
    }
};

// Teacher Review Screen
const teacherReview = {
    screen: document.getElementById('teacher-review-screen')!,
    listView: document.getElementById('teacher-review-list-view')!,
    detailView: document.getElementById('teacher-review-detail-view')!,
    listStudentName: document.getElementById('review-list-student-name')!,
    sessionListContainer: document.getElementById('review-session-list-container')!,
    backToDashboardButton: document.getElementById('back-to-teacher-dashboard-button')!,
    backToSessionListButton: document.getElementById('back-to-session-list-button')!,
    studentName: document.getElementById('review-student-name')!,
    problemDisplay: document.getElementById('review-problem-display')!,
    chatContainer: document.getElementById('review-chat-container')!,
    feedbackSection: document.getElementById('review-feedback-section')!,
    feedbackInput: document.getElementById('feedback-input') as HTMLInputElement,
    submitFeedbackButton: document.getElementById('submit-feedback-button')!,
};


// Modals
const rationaleModal = {
    container: document.getElementById('rationale-modal')!,
    title: document.getElementById('modal-title')!,
    content: document.getElementById('modal-content')!,
    closeButton: document.getElementById('close-modal-button')!,
};
const summaryModal = {
    container: document.getElementById('ai-summary-modal')!,
    title: document.getElementById('summary-modal-title')!,
    content: document.getElementById('summary-modal-content')!,
    closeButton: document.getElementById('close-summary-modal-button')!,
};


// --- System Prompts ---
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
2.  **strengths:** Terapistin seans boyunca sergilediği güçlü yönler (örn: etkili empati kullanımı, doğru yeniden yapılandırma tekniği, güçlü terapötik ittafak). Maddeler halinde listele.
3.  **areasForImprovement:** Terapistin geliştirebileceği alanlar (örn: daha açık uçlu sorular sorma, Sokratik sorgulamayı derinleştirme, danışanın otomatik düşüncelerini daha net belirleme). Maddeler halinde listele.
4.  **keyMomentsAnalysis:** Transkriptteki 2-3 kritik anı belirle. Bu anlarda terapistin müdahalesini, bu müdahalesinin potansiyel etkilerini ve alternatif yaklaşımları analiz et.`;

const studentSummarySystemInstruction = `Sen, BDT alanında uzman bir eğitim süpervizörüsün. Sana bir öğrencinin birden fazla simülasyon seansındaki konuşma kayıtları verilecek. Görevin, bu kayıtlara dayanarak öğrencinin genel performansı hakkında kapsamlı bir özet ve yapıcı geri bildirim oluşturmaktır.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin, açıklama veya kod bloğu içermemelidir. Analizini aşağıdaki başlıklara göre yapılandır:
1.  **overallPerformanceSummary:** Öğrencinin genel yetkinliği, yaklaşımı ve zaman içindeki gelişimi hakkında kısa bir yönetici özeti.
2.  **recurringStrengths:** Öğrencinin simülasyonlar boyunca tutarlı bir şekilde sergilediği güçlü yönler ve beceriler. Maddeler halinde listele.
3.  **patternsForImprovement:** Öğrencinin tekrar eden zorlukları, geliştirmesi gereken beceriler veya kaçındığı müdahaleler veya eğilimler. Maddeler halinde listele.
4.  **suggestedFocusAreas:** Gelecek simülasyonlar için odaklanması önerilen belirli 2-3 alan. Maddeler halinde listele.`;

// --- Database (LocalStorage) ---

// ... existing database functions (getUsers, saveUsers, etc.) ...
// These functions will be called by the new authentication logic.

// --- Core App Logic ---

let chatHistory: any[] = [];
let currentScenario: Scenario | null = null;
let sessionScores: any[] = []; // To track scores within a single session

// Data
const scenarios: Scenario[] = [
    { id: '1', title: 'Sosyal Kaygı', description: 'yakın zamanda yeni bir işe başladı ve toplantılarda konuşma veya yeni insanlarla tanışma konusunda yoğun bir endişe yaşıyor.', profile: 'Elif, 28 yaşında bir yazılım geliştirici. Genellikle sessiz ve kendi halinde. Çatışmadan kaçınır ve başkalarının onu yargılamasından çok korkar. Küçük bir arkadaş grubu var ama yeni ortamlarda gerginleşiyor.', isCustom: false },
    { id: '2', title: 'Erteleme Alışkanlığı', description: 'önemli bir proje teslim tarihi yaklaşmasına rağmen işe başlamakta zorlanıyor ve sürekli dikkat dağıtıcı şeylerle vaktini geçiriyor.', profile: 'Elif, 24 yaşında bir yüksek lisans öğrencisi. Başarısız olmaktan veya beklentileri karşılayamamaktan yoğun şekilde korkuyor. Mükemmeliyetçi bir yapısı var, bu yüzden bir işe "mükemmel" başlayamayacaksa hiç başlamamayı tercih ediyor.', isCustom: false },
    { id: '3', title: 'Panik Atak', description: 'geçen hafta markette aniden yoğun bir panik atak geçirdi ve o zamandan beri tekrar yaşayacağı korkusuyla kalabalık yerlere girmekten kaçınıyor.', profile: 'Elif, 35 yaşında, iki çocuk annesi bir ev hanımı. Her şeyin kontrolü altında olmasını seviyor. Belirsizlikten ve kontrolünü kaybetme hissinden aşırı rahatsız oluyor. Fiziksel belirtilere (kalp çarpıntısı gibi) aşırı odaklanma eğiliminde.', isCustom: false },
    { id: '4', title: 'Mükemmeliyetçilik', description: 'yaptığı işlerde asla yeterince iyi olmadığını düşünüyor ve küçük hatalar yaptığında yoğun bir şekilde kendini eleştiriyor.', profile: 'Elif, 30 yaşında bir grafik tasarımcı. Yüksek standartlara sahip ve bu standartlara ulaşamadığında büyük bir hayal kırıklığı ve yetersizlik hissediyor. Projeleri teslim etmekte zorlanıyor çünkü sürekli daha iyi olabileceğini düşünüyor ve son dokunuşları yapmaktan kendini alamıyor.', isCustom: false },
    { id: '5', title: 'İlişki Sorunları', description: 'partneriyle sık sık küçük konularda büyük tartışmalar yaşıyor ve iletişim kurmakta zorlandıklarını hissediyor.', profile: 'Elif, 32 yaşında, bir avukat. İlişkisinde anlaşılmadığını ve partnerinin onun ihtiyaçlarına karşı duyarsız olduğunu düşünüyor. Tartışma anlarında duygularını ifade etmek yerine savunmacı bir tutum sergiliyor ve sık sık "her zaman" veya "asla" gibi genellemeler kullanıyor.', isCustom: false },
    { id: '6', title: 'Genel Kaygı Bozukluğu', description: 'günlük hayattaki birçok farklı konu (iş, sağlık, aile) hakkında sürekli ve kontrol edilemeyen bir endişe hali yaşıyor.', profile: 'Elif, 40 yaşında bir öğretmen. "Ya olursa?" diye başlayan felaket senaryoları zihninde sürekli dönüyor. Bu endişeler nedeniyle geceleri uyumakta zorlanıyor ve sürekli bir gerginlik hissediyor. En kötü olasılığa odaklanma eğiliminde.', isCustom: false },
];

const resources: Resource[] = [
    { id: 'r1', title: 'Sosyal Kaygı Nedir?', url: '#', type: 'article', associatedScenarioIds: ['1'] },
    { id: 'r2', title: 'Ertelemeyle Başa Çıkma Yolları', url: '#', type: 'video', associatedScenarioIds: ['2'] },
    { id: 'r3', title: 'Panik Atak Anında Nefes Egzersizleri', url: '#', type: 'pdf', associatedScenarioIds: ['3'] },
];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    showScreen('welcome');
    setupEventListeners();
    renderProblemSelection();
});


// --- Screen Management ---
function showScreen(screenId: keyof typeof screens) {
    currentScreen = screenId;
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
    updateHeader();

    // Load data for the specific screen
    if (screenId === 'studentDashboard') {
        renderStudentDashboard();
    }
    if (screenId === 'teacherDashboard') {
        renderTeacherDashboard();
    }
    if (screenId === 'problemSelection') {
        renderProblemSelection();
    }
}

function updateHeader() {
    const isStudentScreen = ['studentDashboard', 'problemSelection', 'simulation', 'sessionAnalysis'].includes(currentScreen!);
    const isTeacherScreen = ['teacherDashboard', 'teacherReview'].includes(currentScreen!);

    if (isStudentScreen || isTeacherScreen) {
        logoutButton.classList.remove('hidden');
        if (isStudentScreen) {
            studentInfo.classList.remove('hidden');
             document.getElementById('student-name-display')!.textContent = currentStudentName;
        } else {
            studentInfo.classList.add('hidden');
        }
    } else {
        logoutButton.classList.add('hidden');
        studentInfo.classList.add('hidden');
    }
    
    backToSelectionButton.classList.toggle('hidden', currentScreen !== 'simulation' && currentScreen !== 'sessionAnalysis' && currentScreen !== 'studentDashboard');
    saveProgressButton.classList.toggle('hidden', currentScreen !== 'simulation');

    if (currentScreen === 'studentDashboard') {
        backToSelectionButton.onclick = () => showScreen('problemSelection');
        (backToSelectionButton.querySelector('span:last-child') as HTMLElement).textContent = 'Yeni Simülasyon Başlat';
    } else {
         backToSelectionButton.onclick = () => showScreen('problemSelection');
        (backToSelectionButton.querySelector('span:last-child') as HTMLElement).textContent = 'Senaryolara Dön';
    }
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    // Welcome Screen
    studentLoginButton.addEventListener('click', handleStudentEntry);
    teacherEntryButton.addEventListener('click', handleTeacherEntry);
    
    // Login/Register
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    teacherLoginButton.addEventListener('click', handleTeacherLogin);
    showRegisterView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('register'); });
    showLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    showTeacherLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('teacher'); });
    showStudentLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    
    // Navigation
    logoutButton.addEventListener('click', logout);
    backToSelectionButton.addEventListener('click', () => showScreen('problemSelection'));
    saveProgressButton.addEventListener('click', saveSessionProgress);
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));

    // Analysis Screen
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.backButton.addEventListener('click', () => showScreen('studentDashboard'));
    analysis.sendButton.addEventListener('click', handleSendAnalysisToTeacher);
    
    // Simulation Screen
    simulation.sendCustomResponseButton.addEventListener('click', () => {
        const text = simulation.customResponseInput.value.trim();
        if (text) {
            handleTherapistResponse(text);
            simulation.customResponseInput.value = '';
        } else {
            showNotification('Lütfen bir yanıt yazın.', 'info');
        }
    });

    // Modals
    rationaleModal.closeButton.addEventListener('click', () => rationaleModal.container.classList.add('hidden'));
    summaryModal.closeButton.addEventListener('click', () => summaryModal.container.classList.add('hidden'));
    
    // Teacher Dashboard
    teacherDashboard.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;
            activeTeacherTab = tabName;
            renderTeacherDashboard();
        });
    });

    // Teacher Review Screen
    teacherReview.backToDashboardButton.addEventListener('click', () => showScreen('teacherDashboard'));
    teacherReview.backToSessionListButton.addEventListener('click', () => {
        teacherReview.detailView.classList.add('hidden');
        teacherReview.listView.classList.remove('hidden');
    });

    // Student QA with Teacher
    teacherQASystem.button.addEventListener('click', handleStudentQuestion);
}

// --- Authentication & User Management ---

function handleStudentEntry() {
    currentUserId = 'ogrenci1'; // Default user for testing
    currentStudentName = 'Demo Öğrenci';
    document.getElementById('student-name-display')!.textContent = currentStudentName;
    showScreen('studentDashboard');
}

function handleTeacherEntry() {
    currentUserId = 'teacher'; // Set a generic teacher ID
    showScreen('teacherDashboard');
}

function toggleLoginViews(view: 'login' | 'register' | 'teacher') {
    loginView.classList.add('hidden');
    registerView.classList.add('hidden');
    teacherLoginView.classList.add('hidden');
    if (view === 'login') loginView.classList.remove('hidden');
    if (view === 'register') registerView.classList.remove('hidden');
    if (view === 'teacher') teacherLoginView.classList.remove('hidden');
}

function handleLogin() { /* ... Logic to be re-enabled later ... */ }
function handleRegister() { /* ... Logic to be re-enabled later ... */ }
function handleTeacherLogin() { /* ... Logic to be re-enabled later ... */ }
function logout() {
    // For now, just reloads the page to the "bypassed" state
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
}


// --- Problem Selection ---
function renderProblemSelection() {
    const defaultContainer = document.getElementById('default-scenarios-container')!;
    defaultContainer.innerHTML = '';
    scenarios.filter(s => !s.isCustom).forEach(scenario => {
        const card = createScenarioCard(scenario);
        defaultContainer.appendChild(card);
    });

    // Handle custom scenarios (if any)
    const customScenarios = getCustomScenarios();
    const customSection = document.getElementById('custom-scenarios-section')!;
    const customContainer = document.getElementById('custom-scenarios-container')!;
    if (customScenarios.length > 0) {
        customContainer.innerHTML = '';
        customScenarios.forEach(scenario => {
            const card = createScenarioCard(scenario);
            customContainer.appendChild(card);
        });
        customSection.classList.remove('hidden');
    } else {
        customSection.classList.add('hidden');
    }
}

function createScenarioCard(scenario: Scenario): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col';
    card.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800">${scenario.title}</h3>
        <p class="text-gray-600 mt-2 flex-grow">${scenario.description}</p>
        <button class="mt-4 w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg">
            <span>Simülasyonu Başlat</span>
        </button>
    `;
    card.querySelector('button')!.addEventListener('click', () => startSimulation(scenario));
    return card;
}

// --- Simulation Logic ---
function startSimulation(scenario: Scenario) {
    currentScenario = scenario;
    chatHistory = [];
    sessionScores = [];
    simulation.chatContainer.innerHTML = '';
    simulation.optionsContainer.innerHTML = '';
    simulation.feedbackSection.classList.add('hidden');
    simulation.customResponseInput.value = '';
    simulation.customResponseInput.disabled = false;
    simulation.sendCustomResponseButton.disabled = false;


    simulation.problemDisplay.textContent = scenario.title;
    showScreen('simulation');

    const initialResponseText = `Merhaba, ben Elif. ${currentScenario!.description} Bu konuda konuşmak için buradayım. Nereden başlamak istersiniz?`;
    const initialOptions = [
        "Bugün kendinizi nasıl hissediyorsunuz?",
        "Sizi buraya getiren şey hakkında daha fazla konuşalım mı?",
        "Bu durum hayatınızı nasıl etkiliyor?",
        "Bu konuda ne zamandır zorlanıyorsunuz?"
    ];

    addMessageToChat('client', initialResponseText);
    chatHistory.push({ role: 'model', parts: [{ text: initialResponseText }] });
    renderOptions(initialOptions);
}

function addMessageToChat(sender: 'therapist' | 'client' | 'teacher', text: string, rationale: string | null = null, onRationaleClick: (() => void) | null = null) {
    const messageElement = document.createElement('div');
    const bubble = document.createElement('div');
    
    const isTherapist = sender === 'therapist';
    const isClient = sender === 'client';
    const isTeacher = sender === 'teacher';

    messageElement.className = `flex flex-col animate-fade-in-up ${isTherapist ? 'items-start' : isClient ? 'items-end' : 'items-center w-full'}`;
    bubble.className = `chat-bubble ${isTherapist ? 'chat-bubble-therapist' : isClient ? 'chat-bubble-client' : 'chat-bubble-teacher'}`;
    bubble.textContent = text;
    
    messageElement.appendChild(bubble);

    if (isTherapist && rationale) {
        const rationaleButton = document.createElement('button');
        rationaleButton.innerHTML = `<span class="material-symbols-outlined text-sm mr-1">lightbulb</span> Gerekçeyi Gör`;
        rationaleButton.className = 'text-xs text-indigo-600 hover:underline mt-1 ml-2';
        rationaleButton.onclick = () => {
            if (onRationaleClick) onRationaleClick();
        };
        messageElement.appendChild(rationaleButton);
    }
    
    simulation.chatContainer.appendChild(messageElement);
    simulation.chatContainer.scrollTop = simulation.chatContainer.scrollHeight;
}


function renderOptions(options: string[], rationale: string = "") {
    simulation.optionsContainer.innerHTML = '';
    options.forEach(optionText => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = optionText;
        button.addEventListener('click', () => handleOptionSelection(optionText, rationale));
        simulation.optionsContainer.appendChild(button);
    });
}

async function handleOptionSelection(therapistResponse: string, rationale: string) {
    handleTherapistResponse(therapistResponse, rationale);
}

async function handleTherapistResponse(therapistResponse: string, rationale: string | null = null) {
    // Add therapist's message to chat
    addMessageToChat('therapist', therapistResponse, rationale, () => {
        if(rationale) showRationaleModal(rationale);
    });

    // Add to history
    chatHistory.push({ role: 'user', parts: [{ text: therapistResponse }] });

    // Disable all inputs (options and custom text)
    const options = document.querySelectorAll('.option-button');
    options.forEach(opt => (opt as HTMLButtonElement).disabled = true);
    simulation.customResponseInput.disabled = true;
    simulation.sendCustomResponseButton.disabled = true;

    // Get AI response
    await getAiResponse(chatHistory, currentScenario!);
}


function updateSimulationUI(aiData: any) {
    // Add client's response to chat
    addMessageToChat('client', aiData.clientResponse);

    // Update feedback section
    simulation.feedbackSection.classList.remove('hidden');
    simulation.feedbackText.textContent = aiData.feedback;

    // Update graphs
    updateScoreBars(aiData.scoring, aiData.clientImpact);

    // Save scores for session summary
    sessionScores.push({ scoring: aiData.scoring, clientImpact: aiData.clientImpact });

    // Render new options
    renderOptions(aiData.therapistOptions, aiData.rationale);
    
    // Re-enable custom input for the next turn
    simulation.customResponseInput.disabled = false;
    simulation.sendCustomResponseButton.disabled = false;
}

function updateScoreBars(scoring: any, clientImpact: any) {
    const skillEmpathyBar = document.getElementById('skill-empathy-bar') as HTMLElement;
    const skillTechniqueBar = document.getElementById('skill-technique-bar') as HTMLElement;
    const skillRapportBar = document.getElementById('skill-rapport-bar') as HTMLElement;
    const impactEmotionBar = document.getElementById('impact-emotion-bar') as HTMLElement;
    const impactCognitionBar = document.getElementById('impact-cognition-bar') as HTMLElement;

    skillEmpathyBar.style.width = `${scoring.empathy * 10}%`;
    skillTechniqueBar.style.width = `${scoring.technique * 10}%`;
    skillRapportBar.style.width = `${scoring.rapport * 10}%`;
    impactEmotionBar.style.width = `${clientImpact.emotionalRelief * 10}%`;
    impactCognitionBar.style.width = `${clientImpact.cognitiveClarity * 10}%`;
}


function showLoaderWithOptions(show: boolean, text: string = "Yükleniyor...") {
    if (show) {
        simulation.optionsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 flex items-center justify-center p-4 text-gray-600"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div><p class="ml-3">${text}</p></div>`;
    } else {
        simulation.optionsContainer.innerHTML = ''; // Cleared before new options are rendered
    }
}


function showRationaleModal(rationale: string) {
    rationaleModal.content.textContent = rationale;
    rationaleModal.container.classList.remove('hidden');
}


// --- Student Dashboard Rendering ---
function renderStudentDashboard() {
    dashboardStudentName.textContent = currentStudentName;
    renderContinueSessionCard();
    renderProgressTracking();
    renderCumulativeProgress();
    renderAchievements();
    renderRecommendations();
    renderQACard();
}

function renderContinueSessionCard() {
    const savedSession = getSavedSession(currentUserId);
    if (savedSession) {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-3">play_circle</span>
            <h3 class="text-xl font-bold text-gray-800">Kaldığın Yerden Devam Et</h3>
            <p class="text-gray-600 mt-2 mb-4">"${savedSession.scenario.title}" simülasyonuna devam et.</p>
            <div class="flex gap-2 w-full">
                <button id="resume-session-button" class="flex-1 flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg">Devam Et</button>
                <button id="delete-session-button" class="flex items-center justify-center rounded-lg h-12 w-12 bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 shadow-sm"><span class="material-symbols-outlined">delete</span></button>
            </div>
        `;
        document.getElementById('resume-session-button')!.addEventListener('click', resumeSession);
        document.getElementById('delete-session-button')!.addEventListener('click', deleteSavedSession);
    } else {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-[var(--secondary-color)] mb-3">add_circle</span>
            <h3 class="text-xl font-bold text-gray-800">Yeni Simülasyon Başlat</h3>
            <p class="text-gray-600 mt-2 mb-4">Yeni bir BDT senaryosuna başlayarak becerilerini geliştir.</p>
            <button id="start-new-session-button" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--secondary-color)] text-white font-semibold hover:bg-pink-600 transition-all duration-300 shadow-md hover:shadow-lg">Senaryo Seç</button>
        `;
        document.getElementById('start-new-session-button')!.addEventListener('click', () => showScreen('problemSelection'));
    }
}


function renderProgressTracking() {
    if (sessionScores.length > 0) {
        progressTracking.card.classList.remove('hidden');
        progressTracking.container.innerHTML = createChartHTML(calculateAverageScores(sessionScores), 'session');
    } else {
        progressTracking.card.classList.add('hidden');
    }
}

function renderCumulativeProgress() {
    const allSessions = getAllSessionsForStudent(currentUserId);
    if (allSessions.length > 0) {
        const allScores = allSessions.flatMap(s => s.scores);
        if (allScores.length > 0) {
            cumulativeProgress.card.classList.remove('hidden');
            cumulativeProgress.container.innerHTML = createChartHTML(calculateAverageScores(allScores), 'cumulative');
            return;
        }
    }
     cumulativeProgress.card.classList.add('hidden');
}

function createChartHTML(scores: any, type: string): string {
    return `
        <div class="space-y-2">
            <h5 class="font-semibold text-sm text-gray-700">Terapist Becerileri</h5>
            ${createBar('Empati', scores.empathy, 'fuchsia')}
            ${createBar('BDT Tekniği', scores.technique, 'amber')}
            ${createBar('İlişki Kurma', scores.rapport, 'teal')}
            <h5 class="font-semibold text-sm text-gray-700 mt-3">Danışan Etkisi</h5>
            ${createBar('Duygusal Rahatlama', scores.emotionalRelief, 'green')}
            ${createBar('Bilişsel Netlik', scores.cognitiveClarity, 'blue')}
        </div>
    `;
}

function createBar(label: string, value: number, color: string): string {
    const percentage = value * 10;
    return `
        <div class="w-full">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-500">${label}</span>
                <span class="text-xs font-bold text-gray-600">${value.toFixed(1)}/10</span>
            </div>
            <div class="h-3 bg-gray-200 rounded-full">
                <div class="h-3 rounded-full bg-${color}-400 chart-bar" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `;
}


function renderAchievements() {
    // Placeholder logic
    achievements.container.innerHTML = `
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="İlk simülasyonunu tamamla"><span class="material-symbols-outlined text-5xl">workspace_premium</span><span class="text-xs mt-1">İlk Adım</span></div>
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="5 simülasyon tamamla"><span class="material-symbols-outlined text-5xl">military_tech</span><span class="text-xs mt-1">Azimli</span></div>
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="Empati puanını 8'in üzerine çıkar"><span class="material-symbols-outlined text-5xl">psychology</span><span class="text-xs mt-1">Empati Ustası</span></div>
    `;
}

function renderRecommendations() {
    recommendations.container.innerHTML = '';
    const uniqueScenarioIds = [...new Set(getAllSessionsForStudent(currentUserId).map(s => s.scenario.id))];
    if (uniqueScenarioIds.length === 0) {
        recommendations.container.innerHTML = '<p class="text-gray-500 text-center">Simülasyonları tamamladıkça burada kişiselleştirilmiş kaynak önerileri göreceksiniz.</p>';
        return;
    }
    
    const relevantResources = resources.filter(r => r.associatedScenarioIds.some(id => uniqueScenarioIds.includes(id)));
    
    if (relevantResources.length > 0) {
         relevantResources.forEach(resource => {
            const resourceCard = `
                <a href="${resource.url}" target="_blank" class="block bg-white/50 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-2xl text-cyan-600">${resource.type === 'video' ? 'movie' : resource.type === 'pdf' ? 'picture_as_pdf' : 'article'}</span>
                        <div>
                            <h4 class="font-semibold text-gray-800">${resource.title}</h4>
                            <p class="text-sm text-gray-600 capitalize">${resource.type}</p>
                        </div>
                    </div>
                </a>`;
            recommendations.container.innerHTML += resourceCard;
        });
    } else {
        recommendations.container.innerHTML = '<p class="text-gray-500 text-center">Tamamladığınız senaryolarla ilişkili ek kaynak bulunamadı.</p>';
    }
}

function renderQACard() {
    const qaHistory = getQAsForStudent(currentUserId);
    teacherQASystem.history.innerHTML = '';
    if (qaHistory.length === 0) {
        teacherQASystem.history.innerHTML = '<p class="text-center text-gray-500 text-sm">Henüz bir soru sormadınız. Öğretmeninize danışmak istediğiniz bir konu var mı?</p>';
    } else {
        qaHistory.forEach(qa => {
            teacherQASystem.history.innerHTML += `<div class="chat-bubble chat-bubble-therapist !max-w-full !rounded-xl">${qa.question}</div>`;
            if (qa.answer) {
                teacherQASystem.history.innerHTML += `<div class="chat-bubble chat-bubble-teacher !max-w-full mt-2">${qa.answer}</div>`;
            } else {
                 teacherQASystem.history.innerHTML += `<div class="text-xs text-gray-500 italic text-center mt-1">Öğretmen yanıtı bekleniyor...</div>`;
            }
        });
    }
}


// --- Session Progress Management ---
function saveSessionProgress() {
    if (currentScenario && chatHistory.length > 0) {
        const sessionData = {
            userId: currentUserId,
            scenario: currentScenario,
            history: chatHistory,
            scores: sessionScores,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(`session_${currentUserId}`, JSON.stringify(sessionData));
        showNotification("İlerlemeniz başarıyla kaydedildi!", "success");
    } else {
        showNotification("Kaydedilecek bir ilerleme yok.", "info");
    }
}

function getSavedSession(userId: string) {
    const saved = localStorage.getItem(`session_${userId}`);
    return saved ? JSON.parse(saved) : null;
}

function resumeSession() {
    const savedSession = getSavedSession(currentUserId);
    if (savedSession) {
        currentScenario = savedSession.scenario;
        chatHistory = savedSession.history;
        sessionScores = savedSession.scores || [];

        showScreen('simulation');
        simulation.problemDisplay.textContent = currentScenario!.title;
        simulation.chatContainer.innerHTML = '';
        simulation.optionsContainer.innerHTML = '';

        // Re-render chat history
        chatHistory.forEach(turn => {
            if (turn.role === 'user') {
                 try {
                    const lastModelTurn = chatHistory[chatHistory.indexOf(turn) - 1];
                    const lastModelResponse = JSON.parse(lastModelTurn.parts[0].text);
                    addMessageToChat('therapist', turn.parts[0].text, lastModelResponse.rationale, () => showRationaleModal(lastModelResponse.rationale));
                } catch(e) {
                    addMessageToChat('therapist', turn.parts[0].text);
                }
            } else if (turn.role === 'model') {
                 try {
                    const modelResponse = JSON.parse(turn.parts[0].text);
                    addMessageToChat('client', modelResponse.clientResponse);
                } catch(e) {
                     addMessageToChat('client', turn.parts[0].text);
                }
            }
        });

        // Re-render last state
        const lastModelResponse = JSON.parse(chatHistory[chatHistory.length - 1].parts[0].text);
        updateSimulationUI(lastModelResponse);
    }
}

function deleteSavedSession() {
    localStorage.removeItem(`session_${currentUserId}`);
    showNotification("Kaydedilen seans silindi.", "info");
    renderContinueSessionCard();
}

function completeSession() {
    // This function is called when a session ends (e.g., by saving and quitting, or reaching an end point)
    const allSessions = getAllSessionsForStudent(currentUserId);
    const sessionData = {
        id: `sess_${Date.now()}`,
        userId: currentUserId,
        scenario: currentScenario,
        history: chatHistory,
        scores: sessionScores,
        timestamp: new Date().toISOString()
    };
    allSessions.push(sessionData);
    localStorage.setItem(`history_${currentUserId}`, JSON.stringify(allSessions));

    // Clear current session data
    localStorage.removeItem(`session_${currentUserId}`);
    chatHistory = [];
    sessionScores = [];
    currentScenario = null;
}

function getAllSessionsForStudent(userId: string) {
    const history = localStorage.getItem(`history_${userId}`);
    return history ? JSON.parse(history) : [];
}

// --- Analysis Screen Logic ---
async function handleAnalyzeTranscript() {
    const transcript = analysis.transcriptInput.value;
    if (!transcript.trim()) {
        showNotification("Lütfen analiz için bir transkript girin.", "error");
        return;
    }
    
    analysis.analyzeButton.disabled = true;
    analysis.analyzeButton.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Analiz Ediliyor...`;
    analysis.output.innerHTML = '<p>Yapay zeka transkripti analiz ediyor, bu işlem biraz zaman alabilir...</p>';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            config: {
                systemInstruction: analysisSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                       overallSummary: { type: Type.STRING },
                       strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                       areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
                       keyMomentsAnalysis: { type: Type.ARRAY, items: {
                           type: Type.OBJECT,
                           properties: {
                               moment: { type: Type.STRING },
                               analysis: { type: Type.STRING }
                           },
                           required: ['moment', 'analysis']
                       }}
                    },
                    required: ['overallSummary', 'strengths', 'areasForImprovement', 'keyMomentsAnalysis']
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        renderAnalysisOutput(jsonResponse);
        analysis.sendButton.classList.remove('hidden');
        currentAnalysisCache = { transcript, analysis: jsonResponse };

    } catch (error) {
        console.error("Analysis Error:", error);
        analysis.output.innerHTML = `<p class="text-red-500">Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.</p>`;
        showNotification("Analiz başarısız oldu.", "error");
    } finally {
        analysis.analyzeButton.disabled = false;
        analysis.analyzeButton.innerHTML = `<span class="material-symbols-outlined mr-2">psychology</span><span>Yapay Zeka ile Analiz Et</span>`;
    }
}

function renderAnalysisOutput(data: any) {
    let html = `<h3>Genel Özet</h3><p>${data.overallSummary}</p>`;
    html += `<h3>Güçlü Yönler</h3><ul>${data.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    html += `<h3>Geliştirilecek Alanlar</h3><ul>${data.areasForImprovement.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    html += `<h3>Kritik Anlar Analizi</h3>`;
    data.keyMomentsAnalysis.forEach((moment: any) => {
        html += `<h4>${moment.moment}</h4><p>${moment.analysis}</p>`;
    });
    analysis.output.innerHTML = html;
}

function handleSendAnalysisToTeacher() {
    if (!currentAnalysisCache) {
        showNotification("Gönderilecek bir analiz bulunamadı.", "error");
        return;
    }

    const allUploads = getUploadedAnalyses();
    const uploadData = {
        id: `upload_${Date.now()}`,
        studentId: currentUserId,
        ...currentAnalysisCache,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    allUploads.push(uploadData);
    localStorage.setItem('uploaded_analyses', JSON.stringify(allUploads));
    showNotification("Analiz başarıyla öğretmene gönderildi!", "success");
    analysis.sendButton.classList.add('hidden');
    currentAnalysisCache = null;
}

function getUploadedAnalyses() {
    const uploads = localStorage.getItem('uploaded_analyses');
    return uploads ? JSON.parse(uploads) : [];
}

// --- Student-Teacher Communication ---
function handleStudentQuestion() {
    const question = teacherQASystem.input.value.trim();
    if (!question) {
        showNotification("Lütfen bir soru girin.", "error");
        return;
    }
    const allQAs = getAllQAs();
    allQAs.push({
        id: `qa_${Date.now()}`,
        studentId: currentUserId,
        question: question,
        answer: null,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('student_qas', JSON.stringify(allQAs));
    teacherQASystem.input.value = '';
    renderQACard();
    showNotification("Sorunuz öğretmene iletildi.", "success");
}

function getAllQAs() {
    const qas = localStorage.getItem('student_qas');
    return qas ? JSON.parse(qas) : [];
}
function getQAsForStudent(studentId: string) {
    return getAllQAs().filter((qa: any) => qa.studentId === studentId);
}


// --- Utility Functions ---

function calculateAverageScores(scores: any[]) {
    const totals = {
        empathy: 0, technique: 0, rapport: 0,
        emotionalRelief: 0, cognitiveClarity: 0,
        count: scores.length
    };

    if (totals.count === 0) return { empathy: 0, technique: 0, rapport: 0, emotionalRelief: 0, cognitiveClarity: 0 };

    scores.forEach(s => {
        totals.empathy += s.scoring.empathy;
        totals.technique += s.scoring.technique;
        totals.rapport += s.scoring.rapport;
        totals.emotionalRelief += s.clientImpact.emotionalRelief;
        totals.cognitiveClarity += s.clientImpact.cognitiveClarity;
    });

    return {
        empathy: totals.empathy / totals.count,
        technique: totals.technique / totals.count,
        rapport: totals.rapport / totals.count,
        emotionalRelief: totals.emotionalRelief / totals.count,
        cognitiveClarity: totals.cognitiveClarity / totals.count
    };
}


function showNotification(message: string, type: 'success' | 'error' | 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
    };
    const icon = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
    };

    const notification = document.createElement('div');
    notification.className = `flex items-center gap-3 ${colors[type]} text-white p-4 rounded-lg shadow-lg animate-fade-in-up`;
    notification.innerHTML = `<span class="material-symbols-outlined">${icon[type]}</span><p>${message}</p>`;
    
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(10px)';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// --- AI Models ---

async function getAiResponse(history: any[], currentScenario: Scenario) {
    showLoaderWithOptions(true, "Yapay zeka düşünüyor...");
    const model = 'gemini-2.5-flash';

    // Create a clean history for the AI, only sending the text parts
    const cleanHistory = history.map(turn => {
        if (turn.role === 'model') {
             try {
                // Attempt to parse the model's previous response to get just the clientResponse text
                const modelResponse = JSON.parse(turn.parts[0].text);
                return { role: 'model', parts: [{ text: modelResponse.clientResponse }] };
            } catch (e) {
                // If parsing fails, it's likely the initial message, so use the text directly
                return { role: 'model', parts: [{ text: turn.parts[0].text }] };
            }
        }
        // User turns are already clean
        return turn;
    });

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                ...cleanHistory,
            ],
            config: {
                systemInstruction: `${simulationSystemInstruction}\n\nDanışan Profili:\n${currentScenario.profile}`,
                responseMimeType: "application/json",
                responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                        clientResponse: { type: Type.STRING },
                        feedback: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        scoring: {
                            type: Type.OBJECT,
                            properties: {
                                empathy: { type: Type.NUMBER },
                                technique: { type: Type.NUMBER },
                                rapport: { type: Type.NUMBER }
                            },
                            required: ['empathy', 'technique', 'rapport']
                        },
                        clientImpact: {
                            type: Type.OBJECT,
                            properties: {
                                emotionalRelief: { type: Type.NUMBER },
                                cognitiveClarity: { type: Type.NUMBER }
                            },
                            required: ['emotionalRelief', 'cognitiveClarity']
                        },
                        therapistOptions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                     },
                     required: ['clientResponse', 'feedback', 'rationale', 'scoring', 'clientImpact', 'therapistOptions']
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        
        // Add AI's full JSON response to history for potential future use (like resuming session)
        chatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        
        updateSimulationUI(jsonResponse);

    } catch (error) {
        console.error("AI Response Error:", error);
        showLoaderWithOptions(false);
        simulation.optionsContainer.innerHTML = '<p class="text-red-500 col-span-2 text-center">Yapay zeka yanıt verirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.</p>';
        showNotification("AI yanıt hatası.", "error");
    } 
    // No finally block needed as loader is handled by success/error paths
}

// --- Teacher Specific Functions (to be filled in) ---
function getCustomScenarios() { return []; } // Placeholder
function renderTeacherDashboard() {
    // This function will render the content based on the activeTeacherTab
    Object.values(teacherDashboard.contents).forEach(content => content.classList.add('hidden'));
    teacherDashboard.tabs.forEach(tab => {
        const tabName = (tab as HTMLElement).dataset.tab!;
        if (tabName === activeTeacherTab) {
            tab.classList.add('border-[var(--teacher-color)]', 'text-[var(--teacher-color)]');
            tab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            teacherDashboard.contents[tabName as keyof typeof teacherDashboard.contents].classList.remove('hidden');
        } else {
             tab.classList.remove('border-[var(--teacher-color)]', 'text-[var(--teacher-color)]');
             tab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        }
    });

    // Render content for the active tab
    switch (activeTeacherTab) {
        case 'requests':
            // renderRegistrationRequests();
            break;
        case 'simulations':
            // renderStudentSimulationsList();
            break;
        case 'uploads':
            // renderUploadedAnalysesList();
            break;
        case 'questions':
            // renderStudentQuestions();
            break;
        case 'analytics':
            // renderClassAnalytics();
            break;
         case 'builder':
            // renderScenarioBuilder();
            break;
         case 'library':
            // renderResourceLibrary();
            break;
    }
}
