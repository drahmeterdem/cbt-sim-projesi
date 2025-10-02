// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";
import * as db from './firebase';

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

// --- AI & DB Client Initialization ---
let ai: GoogleGenAI | null = null;
let isDbConnected: boolean = false;
const API_KEY_STORAGE_KEY = 'gemini_api_key';


// --- Global State & Constants ---
let currentStudentName: string = '';
let currentUserId: string = ''; // Will now store username
let reviewingStudentId: string = '';
let reviewingSessionId: string = '';
let reviewingUploadId: string = '';
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests'; // Default to requests for teacher workflow
let currentAnalysisCache: { transcript: string; analysis: any } | null = null;

const TEACHER_PASSWORD = 'teacher3243';
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
    teacherUploadReview: document.getElementById('teacher-upload-review-screen')!,
};

// Welcome Screen
const goToLoginButton = document.getElementById('go-to-login-button')!;

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
const registerButton = document.getElementById('register-button')! as HTMLButtonElement;
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
        settings: document.getElementById('settings-content')!,
    }
};
const requestsListContainer = document.getElementById('requests-list-container')!;


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
    chartsContainer: document.getElementById('review-charts-container')!,
    feedbackForm: document.getElementById('review-feedback-form')!,
    existingFeedback: document.getElementById('existing-feedback-display')!,
    feedbackInput: document.getElementById('feedback-input') as HTMLInputElement,
    submitFeedbackButton: document.getElementById('submit-feedback-button')!,
};

const teacherUploadReview = {
    screen: screens.teacherUploadReview,
    backButton: document.getElementById('back-to-dashboard-from-upload-review')!,
    studentName: document.getElementById('upload-review-student-name')!,
    transcript: document.getElementById('upload-review-transcript')!,
    analysis: document.getElementById('upload-review-analysis')!,
    feedbackForm: document.getElementById('upload-feedback-form')!,
    existingFeedback: document.getElementById('existing-upload-feedback-display')!,
    feedbackInput: document.getElementById('upload-feedback-input') as HTMLTextAreaElement,
    submitButton: document.getElementById('submit-upload-feedback-button')!,
}


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


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSessionAndRoute();
});

function safeJsonParse<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        if (!item || item === 'undefined') return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.warn(`Error parsing JSON from localStorage key "${key}". Returning default.`, error);
        return defaultValue;
    }
}

async function checkSessionAndRoute() {
    // 1. Initialize services (DB first, then AI)
    isDbConnected = db.initializeFirebase();
    
    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) initializeAiClient(savedApiKey);

    // 2. Check for an active session
    const session = safeJsonParse(SESSION_KEY, null);
    if (session) {
        const { userId, userType, studentName } = session;
        currentUserId = userId;
        
        if (userType === 'student') {
            currentStudentName = studentName;
            showScreen('studentDashboard');
        } else if (userType === 'teacher') {
            // If AI is not set up, force teacher to settings tab
            if (!ai) {
                activeTeacherTab = 'settings';
                showNotification("Lütfen sistemi etkinleştirmek için Gemini API anahtarınızı girin.", "info");
            }
            showScreen('teacherDashboard');
        }
    } else {
        showScreen('welcome');
    }
}


function initializeAiClient(apiKey: string): boolean {
    if (!apiKey) {
        ai = null;
        return false;
    }
    try {
        ai = new GoogleGenAI({ apiKey });
        localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
        console.log("AI client initialized successfully.");
        return true;
    } catch (error) {
        console.error("Failed to initialize GoogleGenAI with provided key:", error);
        ai = null;
        return false;
    }
}


// --- Screen Management ---
function showScreen(screenId: keyof typeof screens) {
    currentScreen = screenId;
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
    updateHeader();

    if (screenId === 'studentDashboard') renderStudentDashboard();
    if (screenId === 'teacherDashboard') renderTeacherDashboard();
    if (screenId === 'problemSelection') renderProblemSelection();
}

function updateHeader() {
    const isStudentScreen = ['studentDashboard', 'problemSelection', 'simulation', 'sessionAnalysis'].includes(currentScreen!);
    const isTeacherScreen = ['teacherDashboard', 'teacherReview', 'teacherUploadReview'].includes(currentScreen!);

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
    goToLoginButton.addEventListener('click', () => showScreen('login'));
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    teacherLoginButton.addEventListener('click', handleTeacherLogin);
    showRegisterView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('register'); });
    showLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    showTeacherLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('teacher'); });
    showStudentLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    logoutButton.addEventListener('click', logout);
    backToSelectionButton.addEventListener('click', () => showScreen('problemSelection'));
    saveProgressButton.addEventListener('click', saveSessionProgress);
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.backButton.addEventListener('click', () => showScreen('studentDashboard'));
    analysis.sendButton.addEventListener('click', handleSendAnalysisToTeacher);
    simulation.sendCustomResponseButton.addEventListener('click', () => {
        const text = simulation.customResponseInput.value.trim();
        if (text) {
            handleTherapistResponse(text);
            simulation.customResponseInput.value = '';
        } else {
            showNotification('Lütfen bir yanıt yazın.', 'info');
        }
    });
    rationaleModal.closeButton.addEventListener('click', () => rationaleModal.container.classList.add('hidden'));
    summaryModal.closeButton.addEventListener('click', () => summaryModal.container.classList.add('hidden'));
    teacherDashboard.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;
            activeTeacherTab = tabName;
            renderTeacherDashboard();
        });
    });
    teacherReview.backToDashboardButton.addEventListener('click', () => showScreen('teacherDashboard'));
    teacherReview.backToSessionListButton.addEventListener('click', () => {
        teacherReview.detailView.classList.add('hidden');
        teacherReview.listView.classList.remove('hidden');
    });
    teacherReview.submitFeedbackButton.addEventListener('click', handleSubmitSessionFeedback);
    teacherUploadReview.backButton.addEventListener('click', () => showScreen('teacherDashboard'));
    teacherUploadReview.submitButton.addEventListener('click', handleSubmitUploadFeedback);
    teacherQASystem.button.addEventListener('click', handleStudentQuestion);

    // Event Delegation
    document.body.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const approveButton = target.closest<HTMLButtonElement>('.approve-button');
        const viewSessionsButton = target.closest<HTMLButtonElement>('.view-sessions-button');
        const reviewSessionButton = target.closest<HTMLButtonElement>('.review-session-button');
        const reviewUploadButton = target.closest<HTMLButtonElement>('.review-upload-button');
        const replyQuestionButton = target.closest<HTMLButtonElement>('.reply-question-button');

        if (approveButton) await handleApproveRequest(approveButton.dataset.username!);
        if (viewSessionsButton) await showStudentSessionReviewList(viewSessionsButton.dataset.studentid!);
        if (reviewSessionButton) await showSessionDetailReview(reviewSessionButton.dataset.studentid!, reviewSessionButton.dataset.sessionid!);
        if (reviewUploadButton) await showUploadReviewDetail(reviewUploadButton.dataset.uploadid!);
        if (replyQuestionButton) await handleReplyToQuestion(replyQuestionButton.dataset.questionid!);
    });
}

// --- Authentication & User Management ---

function toggleLoginViews(view: 'login' | 'register' | 'teacher') {
    loginView.classList.add('hidden');
    registerView.classList.add('hidden');
    teacherLoginView.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    teacherLoginError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    if (view === 'login') loginView.classList.remove('hidden');
    if (view === 'register') registerView.classList.remove('hidden');
    if (view === 'teacher') teacherLoginView.classList.remove('hidden');
}

async function handleLogin() {
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    loginError.classList.add('hidden');

    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.", "error");
        return;
    }
    if (!username || !password) {
        loginError.textContent = "Kullanıcı adı ve şifre gereklidir.";
        loginError.classList.remove('hidden');
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Giriş Yapılıyor...';

    try {
        const user = await db.getData('users', username);

        if (user && user.password === password) {
            if (user.approved) {
                currentUserId = user.username;
                currentStudentName = user.username;
                localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.username, studentName: user.username, userType: 'student' }));
                await checkSessionAndRoute();
            } else {
                loginError.textContent = "Hesabınız henüz öğretmen tarafından onaylanmadı.";
                loginError.classList.remove('hidden');
            }
        } else {
            loginError.textContent = "Geçersiz kullanıcı adı veya şifre.";
            loginError.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Login failed:", error);
        loginError.textContent = "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.";
        loginError.classList.remove('hidden');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Giriş Yap';
    }
}

async function handleRegister() {
    const username = registerUsernameInput.value.trim().toLowerCase();
    const password = registerPasswordInput.value.trim();
    const confirmPassword = registerConfirmPasswordInput.value.trim();
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.", "error");
        return;
    }
    if (!username || !password || !confirmPassword) {
        registerError.textContent = "Tüm alanlar zorunludur.";
        registerError.classList.remove('hidden');
        return;
    }
    if (password !== confirmPassword) {
        registerError.textContent = "Şifreler eşleşmiyor.";
        registerError.classList.remove('hidden');
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = 'Kayıt Yapılıyor...';
    
    try {
        const existingUser = await db.getData('users', username);
        if (existingUser) {
            registerError.textContent = "Bu kullanıcı adı zaten alınmış.";
            registerError.classList.remove('hidden');
            return;
        }

        const newUser = { username, password, approved: false };
        await db.setData('users', username, newUser);

        registerSuccess.textContent = "Kayıt başarılı! Hesabınız öğretmen tarafından onaylandıktan sonra giriş yapabilirsiniz.";
        registerSuccess.classList.remove('hidden');
        registerUsernameInput.value = '';
        registerPasswordInput.value = '';
        registerConfirmPasswordInput.value = '';

    } catch (error) {
        console.error("Registration failed:", error);
        registerError.textContent = "Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.";
        registerError.classList.remove('hidden');
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Kayıt Ol';
    }
}

async function handleTeacherLogin() {
    const password = teacherPasswordInput.value;
    teacherLoginError.classList.add('hidden');

    if (password === TEACHER_PASSWORD) {
        currentUserId = 'teacher';
        localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: 'teacher', userType: 'teacher' }));
        await checkSessionAndRoute();
    } else {
        teacherLoginError.textContent = "Geçersiz yönetici şifresi.";
        teacherLoginError.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem(SESSION_KEY);
    currentUserId = '';
    currentStudentName = '';
    // Do not clear API or DB keys on logout, just the session
    window.location.reload();
}


// --- Problem Selection ---
async function renderProblemSelection() {
    const defaultContainer = document.getElementById('default-scenarios-container')!;
    defaultContainer.innerHTML = '';
    scenarios.filter(s => !s.isCustom).forEach(scenario => {
        const card = createScenarioCard(scenario);
        defaultContainer.appendChild(card);
    });

    const customScenarios = isDbConnected ? await db.getCollection('customScenarios') : [];
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
    if (!ai) {
        showNotification("Yapay Zeka sistemi aktif değil. Lütfen öğretmenin API anahtarını yapılandırmasını sağlayın.", "error");
        return;
    }
    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı yok. İlerlemeniz kaydedilemeyecek.", "info");
    }

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

    addMessageToChat(simulation.chatContainer, 'client', initialResponseText);
    chatHistory.push({ role: 'model', parts: [{ text: initialResponseText }] });
    renderOptions(initialOptions);
}

function addMessageToChat(container: HTMLElement, sender: 'therapist' | 'client' | 'teacher', text: string, rationale: string | null = null, onRationaleClick: (() => void) | null = null) {
    const messageElement = document.createElement('div');
    const bubble = document.createElement('div');
    
    const isTherapist = sender === 'therapist';
    const isClient = sender === 'client';
    const isTeacher = sender === 'teacher';

    messageElement.className = `flex flex-col animate-fade-in-up ${isTherapist ? 'items-start' : isClient ? 'items-end' : 'items-center w-full'}`;
    bubble.className = `chat-bubble ${isTherapist ? 'chat-bubble-therapist' : isClient ? 'chat-bubble-client' : 'chat-bubble-teacher'}`;
    bubble.textContent = text;
    
    messageElement.appendChild(bubble);

    if (isTherapist && rationale && onRationaleClick) {
        const rationaleButton = document.createElement('button');
        rationaleButton.innerHTML = `<span class="material-symbols-outlined text-sm mr-1">lightbulb</span> Gerekçeyi Gör`;
        rationaleButton.className = 'text-xs text-indigo-600 hover:underline mt-1 ml-2';
        rationaleButton.onclick = () => onRationaleClick();
        messageElement.appendChild(rationaleButton);
    }
    
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
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
    await handleTherapistResponse(therapistResponse, rationale);
}

async function handleTherapistResponse(therapistResponse: string, rationale: string | null = null) {
    addMessageToChat(simulation.chatContainer, 'therapist', therapistResponse, rationale, () => {
        if(rationale) showRationaleModal(rationale);
    });
    chatHistory.push({ role: 'user', parts: [{ text: therapistResponse }] });

    const options = document.querySelectorAll('.option-button');
    options.forEach(opt => (opt as HTMLButtonElement).disabled = true);
    simulation.customResponseInput.disabled = true;
    simulation.sendCustomResponseButton.disabled = true;

    await getAiResponse(chatHistory, currentScenario!);
}


function updateSimulationUI(aiData: any) {
    addMessageToChat(simulation.chatContainer, 'client', aiData.clientResponse);
    simulation.feedbackSection.classList.remove('hidden');
    simulation.feedbackText.textContent = aiData.feedback;
    updateScoreBars(aiData.scoring, aiData.clientImpact);
    sessionScores.push({ scoring: aiData.scoring, clientImpact: aiData.clientImpact });
    renderOptions(aiData.therapistOptions, aiData.rationale);
    simulation.customResponseInput.disabled = false;
    simulation.sendCustomResponseButton.disabled = false;
}

function updateScoreBars(scoring: any, clientImpact: any) {
    (document.getElementById('skill-empathy-bar') as HTMLElement).style.width = `${scoring.empathy * 10}%`;
    (document.getElementById('skill-technique-bar') as HTMLElement).style.width = `${scoring.technique * 10}%`;
    (document.getElementById('skill-rapport-bar') as HTMLElement).style.width = `${scoring.rapport * 10}%`;
    (document.getElementById('impact-emotion-bar') as HTMLElement).style.width = `${clientImpact.emotionalRelief * 10}%`;
    (document.getElementById('impact-cognition-bar') as HTMLElement).style.width = `${clientImpact.cognitiveClarity * 10}%`;
}


function showLoaderWithOptions(show: boolean, text: string = "Yükleniyor...") {
    if (show) {
        simulation.optionsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 flex items-center justify-center p-4 text-gray-600"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div><p class="ml-3">${text}</p></div>`;
    } else {
        simulation.optionsContainer.innerHTML = '';
    }
}


function showRationaleModal(rationale: string) {
    rationaleModal.content.textContent = rationale;
    rationaleModal.container.classList.remove('hidden');
}


// --- Student Dashboard Rendering ---
async function renderStudentDashboard() {
    dashboardStudentName.textContent = currentStudentName;
    await renderContinueSessionCard();
    await renderCumulativeProgress();
    renderAchievements(); // This can be made async if achievements are stored in DB
    await renderRecommendations();
    await renderQACard();
}

async function renderContinueSessionCard() {
    const savedSession = getSavedSession(); // Local session is temporary
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
        progressTracking.container.innerHTML = createChartHTML(calculateAverageScores(sessionScores));
    } else {
        progressTracking.card.classList.add('hidden');
    }
}

async function renderCumulativeProgress() {
    if (!isDbConnected) {
        cumulativeProgress.card.classList.add('hidden');
        return;
    }
    const allSessions = await getAllSessionsForStudent(currentUserId);
    if (allSessions.length > 0) {
        const allScores = allSessions.flatMap(s => s.scores);
        if (allScores.length > 0) {
            cumulativeProgress.card.classList.remove('hidden');
            cumulativeProgress.container.innerHTML = createChartHTML(calculateAverageScores(allScores));
            return;
        }
    }
     cumulativeProgress.card.classList.add('hidden');
}

function createChartHTML(scores: any): string {
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
    achievements.container.innerHTML = `
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="İlk simülasyonunu tamamla"><span class="material-symbols-outlined text-5xl">workspace_premium</span><span class="text-xs mt-1">İlk Adım</span></div>
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="5 simülasyon tamamla"><span class="material-symbols-outlined text-5xl">military_tech</span><span class="text-xs mt-1">Azimli</span></div>
        <div class="flex flex-col items-center text-gray-400 opacity-60" title="Empati puanını 8'in üzerine çıkar"><span class="material-symbols-outlined text-5xl">psychology</span><span class="text-xs mt-1">Empati Ustası</span></div>
    `;
}

async function renderRecommendations() {
    if (!isDbConnected) {
        recommendations.container.innerHTML = '<p class="text-gray-500 text-center">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    recommendations.container.innerHTML = '';
    const allSessions = await getAllSessionsForStudent(currentUserId);
    const uniqueScenarioIds = [...new Set(allSessions.map(s => s.scenario.id))];

    if (uniqueScenarioIds.length === 0) {
        recommendations.container.innerHTML = '<p class="text-gray-500 text-center">Simülasyonları tamamladıkça burada kişiselleştirilmiş kaynak önerileri göreceksiniz.</p>';
        return;
    }
    
    const allResources = await db.getCollection('resources');
    const relevantResources = allResources.filter(r => r.associatedScenarioIds.some((id: string) => uniqueScenarioIds.includes(id)));
    
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

async function renderQACard() {
    if (!isDbConnected) {
        teacherQASystem.history.innerHTML = '<p class="text-center text-gray-500 text-sm">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    const qaHistory = await getQAsForStudent(currentUserId);
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
async function saveSessionProgress() {
    if (currentScenario && chatHistory.length > 0) {
        await completeSession(); 
        showNotification("İlerlemeniz kalıcı olarak kaydedildi ve seans tamamlandı!", "success");
        setTimeout(() => showScreen('studentDashboard'), 1000);
    } else {
        showNotification("Kaydedilecek bir ilerleme yok.", "info");
    }
}

// Temporary session is saved locally for quick resume
function getSavedSession() {
    return safeJsonParse(`session_${currentUserId}`, null);
}

function resumeSession() {
    const savedSession = getSavedSession();
    if (savedSession) {
        currentScenario = savedSession.scenario;
        chatHistory = savedSession.history;
        sessionScores = savedSession.scores || [];

        showScreen('simulation');
        simulation.problemDisplay.textContent = currentScenario!.title;
        simulation.chatContainer.innerHTML = '';
        simulation.optionsContainer.innerHTML = '';

        chatHistory.forEach(turn => {
            if (turn.role === 'user') {
                 try {
                    const lastModelTurn = chatHistory[chatHistory.indexOf(turn) - 1];
                    const lastModelResponse = JSON.parse(lastModelTurn.parts[0].text);
                    addMessageToChat(simulation.chatContainer,'therapist', turn.parts[0].text, lastModelResponse.rationale, () => showRationaleModal(lastModelResponse.rationale));
                } catch(e) {
                    addMessageToChat(simulation.chatContainer,'therapist', turn.parts[0].text);
                }
            } else if (turn.role === 'model') {
                 try {
                    const modelResponse = JSON.parse(turn.parts[0].text);
                    addMessageToChat(simulation.chatContainer, 'client', modelResponse.clientResponse);
                } catch(e) {
                     addMessageToChat(simulation.chatContainer, 'client', turn.parts[0].text);
                }
            }
        });
        try {
            const lastModelResponse = JSON.parse(chatHistory[chatHistory.length - 1].parts[0].text);
            updateSimulationUI(lastModelResponse);
        } catch (e) {
            console.error("Failed to parse last model response on session resume:", e);
            simulation.optionsContainer.innerHTML = `<p class="text-red-500 col-span-2 text-center">Kaydedilmiş seans yüklenirken bir hata oluştu. Lütfen seansı silip baştan başlayın.</p>`;
            showNotification("Kaydedilmiş seans verisi bozuk.", "error");
        }
    }
}

function deleteSavedSession() {
    localStorage.removeItem(`session_${currentUserId}`);
    showNotification("Kaydedilen seans silindi.", "info");
    renderContinueSessionCard();
}

async function completeSession() {
    if (!currentScenario || chatHistory.length === 0 || !isDbConnected) {
        if(!isDbConnected) showNotification("Veritabanı bağlantısı olmadığından seans kaydedilemedi.", "error");
        return;
    }

    const sessionData = {
        userId: currentUserId,
        scenario: currentScenario,
        history: chatHistory,
        scores: sessionScores,
        timestamp: new Date().toISOString(),
        feedback: null
    };

    const newId = `sess_${Date.now()}`;
    await db.setDataInSubcollection('students', currentUserId, 'sessions', newId, sessionData);

    // Clear local temporary session
    localStorage.removeItem(`session_${currentUserId}`);
    chatHistory = [];
    sessionScores = [];
    currentScenario = null;
}

async function getAllSessionsForStudent(userId: string): Promise<any[]> {
    if (!isDbConnected) return [];
    return await db.getSubcollection('students', userId, 'sessions');
}

// --- Analysis Screen Logic ---
async function handleAnalyzeTranscript() {
    if (!ai) {
        showNotification("Sistem aktif değil. Lütfen öğretmenin API anahtarını yapılandırmasını sağlayın.", "error");
        return;
    }
    const transcript = analysis.transcriptInput.value;
    if (!transcript.trim()) {
        showNotification("Lütfen analiz için bir transkript girin.", "error");
        return;
    }
    analysis.analyzeButton.disabled = true;
    analysis.analyzeButton.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Analiz Ediliyor...`;
    analysis.output.innerHTML = '<p>Yapay zeka transkripti analiz ediyor, bu işlem biraz zaman alabilir...</p>';

    try {
        const response = await generateContentWithRetry({
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

        const rawText = response.text.trim();
        const jsonString = extractJsonFromString(rawText);
        if (!jsonString) throw new Error("AI analysis response did not contain a valid JSON object.");
        
        try {
            const jsonResponse = JSON.parse(jsonString);
            renderAnalysisOutput(jsonResponse);
            analysis.sendButton.classList.remove('hidden');
            currentAnalysisCache = { transcript, analysis: jsonResponse };
        } catch (parseError) {
            throw new Error("Failed to parse the JSON data from the AI analysis.");
        }

    } catch (error) {
        console.error("Analysis Error:", error);
        analysis.output.innerHTML = `<p class="text-red-500">Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.</p>`;
        showNotification("Analiz başarısız oldu.", "error");
    } finally {
        analysis.analyzeButton.disabled = false;
        analysis.analyzeButton.innerHTML = `<span class="material-symbols-outlined mr-2">psychology</span><span>Yapay Zeka ile Analiz Et</span>`;
    }
}

function renderAnalysisOutput(data: any, container: HTMLElement = analysis.output) {
    let html = `<h3>Genel Özet</h3><p>${data.overallSummary}</p>`;
    html += `<h3>Güçlü Yönler</h3><ul>${data.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    html += `<h3>Geliştirilecek Alanlar</h3><ul>${data.areasForImprovement.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    html += `<h3>Kritik Anlar Analizi</h3>`;
    data.keyMomentsAnalysis.forEach((moment: any) => {
        html += `<h4>${moment.moment}</h4><p>${moment.analysis}</p>`;
    });
    container.innerHTML = html;
}

async function handleSendAnalysisToTeacher() {
    if (!currentAnalysisCache) {
        showNotification("Gönderilecek bir analiz bulunamadı.", "error");
        return;
    }
    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı olmadığından gönderilemedi.", "error");
        return;
    }

    const uploadId = `upload_${Date.now()}`;
    const uploadData = {
        id: uploadId,
        studentId: currentUserId,
        ...currentAnalysisCache,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    await db.setData('uploads', uploadId, uploadData);
    showNotification("Analiz başarıyla öğretmene gönderildi!", "success");
    analysis.sendButton.classList.add('hidden');
    currentAnalysisCache = null;
}

// --- Student-Teacher Communication ---
async function handleStudentQuestion() {
    const question = teacherQASystem.input.value.trim();
    if (!question) {
        showNotification("Lütfen bir soru girin.", "error");
        return;
    }
     if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı olmadığından soru gönderilemedi.", "error");
        return;
    }
    const qaId = `qa_${Date.now()}`;
    const qaData = {
        id: qaId,
        studentId: currentUserId,
        question: question,
        answer: null,
        timestamp: new Date().toISOString()
    };
    await db.setData('qas', qaId, qaData);
    teacherQASystem.input.value = '';
    await renderQACard();
    showNotification("Sorunuz öğretmene iletildi.", "success");
}

async function getQAsForStudent(studentId: string) {
    if (!isDbConnected) return [];
    return await db.getCollectionWhere('qas', 'studentId', '==', studentId);
}


// --- Utility Functions ---
function extractJsonFromString(text: string): string | null {
    let firstBracket = text.indexOf('{');
    let firstSquare = text.indexOf('[');
    let firstOpen = -1;
    if (firstBracket > -1 && firstSquare > -1) firstOpen = Math.min(firstBracket, firstSquare);
    else if (firstBracket > -1) firstOpen = firstBracket;
    else firstOpen = firstSquare;
    if (firstOpen === -1) return null;
    let lastBracket = text.lastIndexOf('}');
    let lastSquare = text.lastIndexOf(']');
    let lastClose = -1;
    if (lastBracket > -1 && lastSquare > -1) lastClose = Math.max(lastBracket, lastSquare);
    else if (lastBracket > -1) lastClose = lastBracket;
    else lastClose = lastSquare;
    if (lastClose === -1 || lastClose < firstOpen) return null;
    return text.substring(firstOpen, lastClose + 1);
}

function calculateAverageScores(scores: any[]) {
    const totals = { empathy: 0, technique: 0, rapport: 0, emotionalRelief: 0, cognitiveClarity: 0, count: scores.length };
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
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const icon = { success: 'check_circle', error: 'error', info: 'info' };
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
async function generateContentWithRetry(params: any, retries = 3) {
    if (!ai) throw new Error("AI client is not initialized. Please set the API key.");
    let lastError: any = null;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent(params);
            if (!response.text || response.text.trim() === '') throw new Error("AI returned an empty or blocked response.");
            return response;
        } catch (error) {
            lastError = error;
            console.warn(`AI call attempt ${i + 1}/${retries} failed.`, error);
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    throw lastError;
}

async function getAiResponse(history: any[], currentScenario: Scenario) {
    showLoaderWithOptions(true, "Yapay zeka düşünüyor...");
    const cleanHistory = history.map(turn => {
        if (turn.role === 'model') {
             try {
                const modelResponse = JSON.parse(turn.parts[0].text);
                return { role: 'model', parts: [{ text: modelResponse.clientResponse }] };
            } catch (e) {
                return { role: 'model', parts: [{ text: turn.parts[0].text }] };
            }
        }
        return turn;
    });

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: [...cleanHistory],
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
                            type: Type.OBJECT, properties: { empathy: { type: Type.NUMBER }, technique: { type: Type.NUMBER }, rapport: { type: Type.NUMBER } }, required: ['empathy', 'technique', 'rapport']
                        },
                        clientImpact: {
                            type: Type.OBJECT, properties: { emotionalRelief: { type: Type.NUMBER }, cognitiveClarity: { type: Type.NUMBER } }, required: ['emotionalRelief', 'cognitiveClarity']
                        },
                        therapistOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
                     },
                     required: ['clientResponse', 'feedback', 'rationale', 'scoring', 'clientImpact', 'therapistOptions']
                }
            }
        });
        
        const rawText = response.text.trim();
        const jsonString = extractJsonFromString(rawText);
        if (!jsonString) throw new Error("AI response did not contain a valid JSON object.");
        
        try {
            const jsonResponse = JSON.parse(jsonString);
            chatHistory.push({ role: 'model', parts: [{ text: jsonString }] });
            updateSimulationUI(jsonResponse);
        } catch(parseError) {
             throw new Error("Failed to parse the JSON data from the AI.");
        }
    } catch (error) {
        console.error("AI Response Error:", error);
        showLoaderWithOptions(false);
        simulation.optionsContainer.innerHTML = '<p class="text-red-500 col-span-2 text-center">Yapay zeka yanıt verirken bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin.</p>';
        showNotification("AI yanıt hatası.", "error");
    } 
}

// --- Teacher Specific Functions ---

async function handleApproveRequest(usernameToApprove: string) {
    if (usernameToApprove) {
        // Approve the user in the 'users' collection
        await db.updateData('users', usernameToApprove, { approved: true });
        
        // Create the corresponding main document in the 'students' collection
        // This ensures subcollections like 'sessions' can be added later.
        await db.setData('students', usernameToApprove, {
             username: usernameToApprove,
             joinedAt: new Date().toISOString()
        });

        showNotification(`'${usernameToApprove}' adlı öğrenci onaylandı.`, 'success');
        await renderRegistrationRequests();
    }
}

async function renderRegistrationRequests() {
    if (!isDbConnected) {
        requestsListContainer.innerHTML = '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    const pendingUsers = await db.getCollectionWhere('users', 'approved', '==', false);
    requestsListContainer.innerHTML = '';
    if (pendingUsers.length === 0) {
        requestsListContainer.innerHTML = '<p class="text-center text-gray-500">Onay bekleyen öğrenci kaydı bulunmuyor.</p>';
        return;
    }
    pendingUsers.forEach((user: any) => {
        const requestElement = document.createElement('div');
        requestElement.className = 'flex items-center justify-between bg-white p-4 rounded-lg shadow-sm';
        requestElement.innerHTML = `
            <div><p class="font-semibold text-gray-800">${user.username}</p><p class="text-sm text-gray-500">Onay bekliyor</p></div>
            <button data-username="${user.username}" class="approve-button flex items-center justify-center rounded-lg h-10 px-4 bg-green-500 text-white font-semibold hover:bg-green-600 transition-all duration-300 shadow-sm hover:shadow-md">
                <span class="material-symbols-outlined mr-2">check_circle</span><span>Onayla</span>
            </button>
        `;
        requestsListContainer.appendChild(requestElement);
    });
}

function renderSettingsTab() {
    // Gemini API Key Section
    const currentKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const maskedKey = currentKey ? `•••••••••••••••••••••••••••••••${currentKey.slice(-4)}` : "Henüz ayarlanmadı.";
    
    teacherDashboard.contents.settings.innerHTML = `
        <div class="max-w-xl mx-auto">
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl">
                <div class="flex items-center gap-3 mb-4"><span class="material-symbols-outlined text-4xl text-indigo-500">psychology</span><div><h3 class="text-2xl font-bold text-gray-800">Yapay Zeka Ayarları</h3><p class="text-gray-500">Gemini AI sistemini yapılandırın.</p></div></div>
                <div class="mt-6 border-t pt-6">
                    <label for="teacher-api-key-input" class="block text-sm font-medium text-gray-700">Gemini API Anahtarı</label>
                    <p class="text-xs text-gray-500 mb-2">Mevcut Anahtar: <span class="font-mono">${maskedKey}</span></p>
                    <input type="password" id="teacher-api-key-input" class="mt-1 block w-full rounded-lg" placeholder="Yeni API anahtarını buraya girin...">
                    <button id="teacher-save-api-key-button" class="mt-4 w-full flex items-center justify-center rounded-lg h-12 bg-indigo-500 text-white font-semibold hover:bg-indigo-600"><span>API Anahtarını Kaydet</span></button>
                </div>
            </div>
        </div>`;

    document.getElementById('teacher-save-api-key-button')!.addEventListener('click', () => {
        const input = document.getElementById('teacher-api-key-input') as HTMLInputElement;
        const newKey = input.value.trim();
        if (!newKey) {
            showNotification("Lütfen bir API anahtarı girin.", "error");
            return;
        }
        if (initializeAiClient(newKey)) {
            showNotification("API anahtarı başarıyla güncellendi ve sistem aktif!", "success");
            input.value = "";
            renderSettingsTab();
        } else {
            showNotification("API anahtarı geçersiz. Lütfen kontrol edip tekrar girin.", "error");
        }
    });
}

// New Teacher Dashboard Functions
async function renderStudentSimulationsList() {
    const container = teacherDashboard.contents.simulations;
    container.innerHTML = `<h3 class="text-xl font-bold text-gray-800 mb-4">Öğrenci Simülasyonları</h3>`;
    if (!isDbConnected) {
        container.innerHTML += '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    const students = await db.getCollectionWhere('users', 'approved', '==', true);
    if (students.length === 0) {
        container.innerHTML += '<p class="text-center text-gray-500">İncelenecek öğrencisi olan simülasyon bulunmuyor.</p>';
        return;
    }
    const studentList = document.createElement('div');
    studentList.className = 'space-y-3';
    students.forEach(student => {
        studentList.innerHTML += `
            <div class="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
                <p class="font-semibold text-gray-800">${student.username}</p>
                <button data-studentid="${student.username}" class="view-sessions-button flex items-center justify-center rounded-lg h-10 px-4 bg-[var(--teacher-color)] text-white font-semibold hover:bg-amber-600 transition-all">
                    <span>Seansları Görüntüle</span><span class="material-symbols-outlined ml-2">arrow_forward</span>
                </button>
            </div>`;
    });
    container.appendChild(studentList);
}

async function showStudentSessionReviewList(studentId: string) {
    reviewingStudentId = studentId;
    showScreen('teacherReview');
    teacherReview.listView.classList.remove('hidden');
    teacherReview.detailView.classList.add('hidden');
    teacherReview.listStudentName.textContent = studentId;
    const sessions = await getAllSessionsForStudent(studentId);
    teacherReview.sessionListContainer.innerHTML = '';
    if (sessions.length === 0) {
        teacherReview.sessionListContainer.innerHTML = '<p class="text-center text-gray-500">Bu öğrencinin tamamlanmış seansı bulunmuyor.</p>';
        return;
    }
    sessions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    sessions.forEach(session => {
        teacherReview.sessionListContainer.innerHTML += `
            <div class="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
                <div>
                    <p class="font-semibold text-gray-800">${session.scenario.title}</p>
                    <p class="text-sm text-gray-500">${new Date(session.timestamp).toLocaleString('tr-TR')}</p>
                </div>
                <button data-studentid="${studentId}" data-sessionid="${session.id}" class="review-session-button flex items-center justify-center rounded-lg h-10 px-4 bg-indigo-500 text-white font-semibold hover:bg-indigo-600">
                    <span>İncele</span>
                </button>
            </div>`;
    });
}

async function showSessionDetailReview(studentId: string, sessionId: string) {
    reviewingStudentId = studentId;
    reviewingSessionId = sessionId;
    const sessions = await getAllSessionsForStudent(studentId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    teacherReview.listView.classList.add('hidden');
    teacherReview.detailView.classList.remove('hidden');
    teacherReview.studentName.textContent = studentId;
    teacherReview.problemDisplay.textContent = session.scenario.title;
    teacherReview.chatContainer.innerHTML = '';

    session.history.forEach((turn: any) => {
        if (turn.role === 'user') {
            addMessageToChat(teacherReview.chatContainer, 'therapist', turn.parts[0].text);
        } else if (turn.role === 'model') {
            try {
                const modelResponse = JSON.parse(turn.parts[0].text);
                addMessageToChat(teacherReview.chatContainer, 'client', modelResponse.clientResponse);
            } catch (e) {
                addMessageToChat(teacherReview.chatContainer, 'client', turn.parts[0].text);
            }
        }
    });

    teacherReview.chartsContainer.innerHTML = createChartHTML(calculateAverageScores(session.scores));
    
    teacherReview.feedbackInput.value = session.feedback || '';
    if (session.feedback) {
        teacherReview.existingFeedback.innerHTML = `<h5 class="font-semibold text-sm text-gray-700 mb-2">Mevcut Geri Bildiriminiz:</h5><p class="text-sm p-3 bg-amber-50 rounded-lg">${session.feedback}</p>`;
    } else {
        teacherReview.existingFeedback.innerHTML = '';
    }
}

async function handleSubmitSessionFeedback() {
    const feedbackText = teacherReview.feedbackInput.value.trim();
    if (!feedbackText) {
        showNotification("Lütfen bir geri bildirim yazın.", "error");
        return;
    }
    
    const feedbackData = { feedback: feedbackText };
    await db.updateDataInSubcollection('students', reviewingStudentId, 'sessions', reviewingSessionId, feedbackData);
    
    showNotification("Geri bildirim başarıyla kaydedildi!", "success");
    await showSessionDetailReview(reviewingStudentId, reviewingSessionId); // Refresh view
}


async function renderUploadedAnalysesList() {
    const container = teacherDashboard.contents.uploads.querySelector('#uploads-list-container')!;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    const uploads = await db.getCollection('uploads');
    container.innerHTML = '';
    if (uploads.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Öğrenciler tarafından yüklenmiş seans bulunmuyor.</p>';
        return;
    }
    uploads.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    uploads.forEach(upload => {
        container.innerHTML += `
            <div class="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
                <div>
                    <p class="font-semibold text-gray-800">Öğrenci: ${upload.studentId}</p>
                    <p class="text-sm text-gray-500">${new Date(upload.timestamp).toLocaleString('tr-TR')}</p>
                </div>
                <button data-uploadid="${upload.id}" class="review-upload-button flex items-center justify-center rounded-lg h-10 px-4 bg-teal-500 text-white font-semibold hover:bg-teal-600">
                    <span>İncele</span>
                </button>
            </div>`;
    });
}

async function showUploadReviewDetail(uploadId: string) {
    reviewingUploadId = uploadId;
    const upload = await db.getData('uploads', uploadId);
    if (!upload) return;

    showScreen('teacherUploadReview');
    teacherUploadReview.studentName.textContent = upload.studentId;
    teacherUploadReview.transcript.textContent = upload.transcript;
    renderAnalysisOutput(upload.analysis, teacherUploadReview.analysis);

    teacherUploadReview.feedbackInput.value = upload.feedback || '';
     if (upload.feedback) {
        teacherUploadReview.existingFeedback.innerHTML = `<h5 class="font-semibold text-sm text-gray-700 mb-2">Mevcut Geri Bildiriminiz:</h5><p class="text-sm p-3 bg-amber-50 rounded-lg">${upload.feedback}</p>`;
    } else {
        teacherUploadReview.existingFeedback.innerHTML = '';
    }
}

async function handleSubmitUploadFeedback() {
    const feedbackText = teacherUploadReview.feedbackInput.value.trim();
    if (!feedbackText) {
        showNotification("Lütfen bir geri bildirim yazın.", "error");
        return;
    }
    await db.updateData('uploads', reviewingUploadId, { feedback: feedbackText });
    showNotification("Geri bildirim başarıyla kaydedildi!", "success");
    await showUploadReviewDetail(reviewingUploadId); // Refresh view
}

async function renderStudentQuestions() {
    const container = teacherDashboard.contents.questions.querySelector('#questions-list-container')!;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    const questions = await db.getCollection('qas');
    container.innerHTML = '';
    if (questions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500">Henüz öğrenci sorusu bulunmuyor.</p>';
        return;
    }
    questions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    questions.forEach(qa => {
        container.innerHTML += `
            <div class="bg-white p-4 rounded-lg shadow-sm">
                <div class="flex justify-between items-start">
                    <p class="text-sm text-gray-500">Öğrenci: <span class="font-bold text-gray-700">${qa.studentId}</span></p>
                    <p class="text-xs text-gray-400">${new Date(qa.timestamp).toLocaleString('tr-TR')}</p>
                </div>
                <p class="mt-2 p-3 bg-gray-50 rounded-md">${qa.question}</p>
                <div class="mt-3">
                    ${qa.answer ? 
                        `<p class="text-sm font-semibold text-amber-700">Sizin Yanıtınız:</p><p class="p-3 bg-amber-50 rounded-md text-sm">${qa.answer}</p>` :
                        `<div class="flex gap-2"><textarea id="reply-input-${qa.id}" class="flex-grow rounded-lg border-gray-300 text-sm" placeholder="Yanıtınızı buraya yazın..."></textarea><button data-questionid="${qa.id}" class="reply-question-button rounded-lg px-4 bg-green-500 text-white font-semibold hover:bg-green-600">Yanıtla</button></div>`
                    }
                </div>
            </div>`;
    });
}

async function handleReplyToQuestion(questionId: string) {
    const input = document.getElementById(`reply-input-${questionId}`) as HTMLTextAreaElement;
    const answer = input.value.trim();
    if (!answer) {
        showNotification("Lütfen bir yanıt yazın.", "error");
        return;
    }
    await db.updateData('qas', questionId, { answer });
    showNotification("Yanıtınız öğrenciye iletildi.", "success");
    await renderStudentQuestions();
}

async function renderClassAnalytics() {
    const container = teacherDashboard.contents.analytics;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }
    
    const students = await db.getCollectionWhere('users', 'approved', '==', true);
    let allSessions: any[] = [];
    for (const student of students) {
        const studentSessions = await getAllSessionsForStudent(student.id);
        allSessions.push(...studentSessions);
    }
    const allScores = allSessions.flatMap(s => s.scores);
    
    const totalSimulations = allSessions.length;
    let mostPracticed = 'N/A';
    if(totalSimulations > 0) {
        const scenarioCounts = allSessions.reduce((acc, session) => {
            acc[session.scenario.title] = (acc[session.scenario.title] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        mostPracticed = Object.keys(scenarioCounts).reduce((a, b) => scenarioCounts[a] > scenarioCounts[b] ? a : b);
    }

    const averageScores = calculateAverageScores(allScores);

    container.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-6 text-center">Sınıf Geneli Analitiği</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <span class="material-symbols-outlined text-4xl text-indigo-500">group</span>
                <p class="text-3xl font-bold text-gray-800 mt-2">${students.length}</p>
                <p class="text-gray-500">Onaylı Öğrenci</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <span class="material-symbols-outlined text-4xl text-teal-500">psychology</span>
                <p class="text-3xl font-bold text-gray-800 mt-2">${totalSimulations}</p>
                <p class="text-gray-500">Tamamlanan Simülasyon</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <span class="material-symbols-outlined text-4xl text-pink-500">star</span>
                 <p class="text-lg font-bold text-gray-800 mt-2">${mostPracticed}</p>
                <p class="text-gray-500">En Popüler Senaryo</p>
            </div>
        </div>
        <div class="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h4 class="text-lg font-bold text-gray-800 mb-4 text-center">Sınıf Ortalamaları</h4>
            ${createChartHTML(averageScores)}
        </div>
    `;
}

function renderScenarioBuilder() {
    const container = teacherDashboard.contents.builder;
    container.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">Yeni Senaryo Oluştur</h3>
        <div class="space-y-4">
            <div><label class="block text-sm font-medium">Başlık</label><input type="text" id="builder-title" class="w-full rounded-lg"></div>
            <div><label class="block text-sm font-medium">Açıklama (Öğrencinin göreceği kısa tanım)</label><textarea id="builder-desc" class="w-full rounded-lg" rows="3"></textarea></div>
            <div><label class="block text-sm font-medium">Danışan Profili (Yapay zekanın canlandıracağı detaylı profil)</label><textarea id="builder-profile" class="w-full rounded-lg" rows="5"></textarea></div>
            <button id="save-scenario-button" class="w-full h-12 px-6 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600">Senaryoyu Kaydet</button>
        </div>`;
    
    document.getElementById('save-scenario-button')!.addEventListener('click', async () => {
        if (!isDbConnected) {
            showNotification("Bu özellik için veritabanı bağlantısı gerekli.", "error");
            return;
        }
        const title = (document.getElementById('builder-title') as HTMLInputElement).value.trim();
        const description = (document.getElementById('builder-desc') as HTMLTextAreaElement).value.trim();
        const profile = (document.getElementById('builder-profile') as HTMLTextAreaElement).value.trim();
        if (!title || !description || !profile) {
            showNotification("Tüm alanlar zorunludur.", "error");
            return;
        }
        const scenarioId = `custom_${Date.now()}`;
        const newScenario: Scenario = {
            id: scenarioId,
            title, description, profile,
            isCustom: true
        };
        await db.setData('customScenarios', scenarioId, newScenario);
        showNotification("Özel senaryo başarıyla kaydedildi!", "success");
        (document.getElementById('builder-title') as HTMLInputElement).value = '';
        (document.getElementById('builder-desc') as HTMLTextAreaElement).value = '';
        (document.getElementById('builder-profile') as HTMLTextAreaElement).value = '';
    });
}

async function renderResourceLibrary() {
    const container = teacherDashboard.contents.library;
     if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bu özellik için veritabanı bağlantısı gerekli.</p>';
        return;
    }

    let allDbScenarios = await db.getCollection('customScenarios');
    let allScenarios = [...scenarios, ...allDbScenarios];

    let scenarioOptions = allScenarios.map(s => `<option value="${s.id}">${s.title}</option>`).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <h3 class="text-xl font-bold text-gray-800 mb-4">Mevcut Kaynaklar</h3>
                <div id="resource-list" class="space-y-3 max-h-96 overflow-y-auto"></div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-inner">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Yeni Kaynak Ekle</h3>
                <div class="space-y-4">
                     <div><label class="block text-sm font-medium">Başlık</label><input type="text" id="resource-title" class="w-full rounded-lg"></div>
                     <div><label class="block text-sm font-medium">URL</label><input type="text" id="resource-url" class="w-full rounded-lg"></div>
                     <div><label class="block text-sm font-medium">Tür</label><select id="resource-type" class="w-full rounded-lg"><option value="article">Makale</option><option value="video">Video</option><option value="pdf">PDF</option></select></div>
                     <div><label class="block text-sm font-medium">İlişkili Senaryolar</label><select id="resource-scenarios" class="w-full rounded-lg" multiple>${scenarioOptions}</select></div>
                     <button id="save-resource-button" class="w-full h-12 px-6 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">Kaynağı Kaydet</button>
                </div>
            </div>
        </div>
    `;

    const renderList = async () => {
        const listContainer = document.getElementById('resource-list')!;
        const resources = await db.getCollection('resources');
        listContainer.innerHTML = '';
        resources.forEach(r => {
            listContainer.innerHTML += `
                <div class="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                    <div>
                        <p class="font-semibold">${r.title}</p>
                        <p class="text-xs text-gray-500">${r.url}</p>
                    </div>
                    <button class="delete-resource-button text-red-500 hover:text-red-700" data-id="${r.id}"><span class="material-symbols-outlined">delete</span></button>
                </div>`;
        });
        document.querySelectorAll('.delete-resource-button').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id!;
            await db.deleteData('resources', id);
            await renderList();
        }));
    };
    
    document.getElementById('save-resource-button')!.addEventListener('click', async () => {
        const title = (document.getElementById('resource-title') as HTMLInputElement).value.trim();
        const url = (document.getElementById('resource-url') as HTMLInputElement).value.trim();
        const type = (document.getElementById('resource-type') as HTMLSelectElement).value as 'article' | 'video' | 'pdf';
        const associatedScenarioIds = Array.from((document.getElementById('resource-scenarios') as HTMLSelectElement).selectedOptions).map(opt => opt.value);
        if (!title || !url) {
            showNotification("Başlık ve URL zorunludur.", "error");
            return;
        }
        const resourceId = `res_${Date.now()}`;
        const newResource: Resource = { id: resourceId, title, url, type, associatedScenarioIds };
        await db.setData('resources', resourceId, newResource);
        showNotification("Kaynak kaydedildi.", "success");
        (document.getElementById('resource-title') as HTMLInputElement).value = '';
        (document.getElementById('resource-url') as HTMLInputElement).value = '';
        await renderList();
    });

    await renderList();
}


function renderTeacherDashboard() {
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

    switch (activeTeacherTab) {
        case 'requests': renderRegistrationRequests(); break;
        case 'settings': renderSettingsTab(); break;
        case 'simulations': renderStudentSimulationsList(); break;
        case 'uploads': renderUploadedAnalysesList(); break;
        case 'questions': renderStudentQuestions(); break;
        case 'analytics': renderClassAnalytics(); break;
        case 'builder': renderScenarioBuilder(); break;
        case 'library': renderResourceLibrary(); break;
    }
}
