// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";
import * as db from './firebase';

// Declare Mammoth for TypeScript
declare const mammoth: any;

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
let currentUserId: string = ''; // Will now store Firebase Auth UID
let reviewingStudentId: string = '';
let reviewingSessionId: string = '';
let reviewingUploadId: string = '';
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests'; // Default to requests for teacher workflow
let currentAnalysisCache: { transcript: string; analysis: any; clientName?: string; sessionNumber?: string } | null = null;

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
const showRegisterView = document.getElementById('show-register-view')!;
const showLoginView = document.getElementById('show-login-view')!;
const emailInput = document.getElementById('email-input') as HTMLInputElement;
const passwordInput = document.getElementById('password-input') as HTMLInputElement;
const loginButton = document.getElementById('login-button')! as HTMLButtonElement;
const registerEmailInput = document.getElementById('register-email-input') as HTMLInputElement;
const registerPasswordInput = document.getElementById('register-password-input') as HTMLInputElement;
const registerConfirmPasswordInput = document.getElementById('register-confirm-password-input') as HTMLInputElement;
const registerButton = document.getElementById('register-button')! as HTMLButtonElement;
const loginError = document.getElementById('login-error')!;
const registerError = document.getElementById('register-error')!;
const registerSuccess = document.getElementById('register-success')!;

// Login UI Toggles
const btnRoleStudent = document.getElementById('btn-role-student')!;
const btnRoleTeacher = document.getElementById('btn-role-teacher')!;
const roleSlider = document.getElementById('role-slider')!;
const loginBrandPanel = document.getElementById('login-brand-panel')!;
const brandTitle = document.getElementById('brand-title')!;
const brandSubtitle = document.getElementById('brand-subtitle')!;
const registerLinkContainer = document.getElementById('register-link-container')!;

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
    fileInput: document.getElementById('file-upload') as HTMLInputElement,
    clientNameInput: document.getElementById('analysis-client-name') as HTMLInputElement,
    sessionNumInput: document.getElementById('analysis-session-number') as HTMLInputElement
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


// Teacher Review Screen (Now Profile Screen)
const teacherReview = {
    screen: document.getElementById('teacher-review-screen')!,
    backToDashboardButton: document.getElementById('back-to-teacher-dashboard-button')!,
    studentName: document.getElementById('review-student-name')!,
    studentEmail: document.getElementById('review-student-email')!,
    statCompleted: document.getElementById('stat-completed-sessions')!,
    statIncomplete: document.getElementById('stat-incomplete-sessions')!,
    tabs: document.querySelectorAll('.profile-tab'),
    contents: {
        simulations: document.getElementById('profile-simulations')!,
        uploads: document.getElementById('profile-uploads')!,
        questions: document.getElementById('profile-questions')!
    }
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
    metaDisplay: document.getElementById('upload-meta-display')!,
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
    { id: '7', title: 'Test Senaryo', description: 'Test', profile: 'Test profile', isCustom: true }, 
];


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupLoginTabs(); // Initialize login tabs
    initializeApp();
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

async function initializeApp() {
    isDbConnected = db.initializeFirebase();

    const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedApiKey) initializeAiClient(savedApiKey);

    db.onAuthStateChanged(async (user: any) => {
        if (user) {
            // User is signed in.
            const userProfile = await db.getData('users', user.uid);
            
            if (userProfile && userProfile.role === 'teacher') {
                currentUserId = user.uid;
                if (!ai) {
                    activeTeacherTab = 'settings';
                    showNotification("Lütfen sistemi etkinleştirmek için Gemini API anahtarınızı girin.", "info");
                }
                showScreen('teacherDashboard');
            } else if (userProfile && userProfile.role === 'student') {
                if (userProfile.approved) {
                    currentUserId = user.uid;
                    currentStudentName = userProfile.email; // Use email
                    showScreen('studentDashboard');
                } else {
                     showScreen('login');
                     loginError.textContent = "Hesabınız Dr. Ahmet Erdem tarafından henüz onaylanmamıştır. Onay sürecini bekleyiniz.";
                     (loginError.querySelector('.login-error-text') as HTMLElement).textContent = "Hesabınız Dr. Ahmet Erdem tarafından henüz onaylanmamıştır. Onay sürecini bekleyiniz.";
                     loginError.classList.remove('hidden');
                     await db.signOut();
                }
            } else {
                 if (user.email === 'drahmeterdem@gmail.com') {
                     // Auto-fix admin profile
                     const adminProfile = {
                         email: user.email,
                         approved: true,
                         role: 'teacher',
                         createdAt: new Date().toISOString()
                     };
                     await db.setData('users', user.uid, adminProfile);
                     currentUserId = user.uid;
                     showScreen('teacherDashboard');
                 } else {
                     showScreen('login');
                     (loginError.querySelector('.login-error-text') as HTMLElement).textContent = "Kullanıcı profili bulunamadı. Lütfen tekrar kayıt olun.";
                     loginError.classList.remove('hidden');
                     await db.signOut();
                 }
            }
        } else {
            // User is signed out.
            currentUserId = '';
            currentStudentName = '';
            showScreen('welcome');
        }
    });
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
            studentInfo.classList.add('flex');
            document.getElementById('student-name-display')!.textContent = currentStudentName;
        } else {
            studentInfo.classList.add('hidden');
             studentInfo.classList.remove('flex');
        }
    } else {
        logoutButton.classList.add('hidden');
        studentInfo.classList.add('hidden');
        studentInfo.classList.remove('flex');
    }
    
    // Toggle Back button logic
    backToSelectionButton.classList.toggle('hidden', currentScreen !== 'simulation' && currentScreen !== 'sessionAnalysis' && currentScreen !== 'studentDashboard' && currentScreen !== 'problemSelection');
    if (currentScreen === 'studentDashboard') backToSelectionButton.classList.add('hidden'); // Dashboard is the root
    if (currentScreen === 'problemSelection') {
         backToSelectionButton.classList.remove('hidden');
         backToSelectionButton.onclick = () => showScreen('studentDashboard');
         (backToSelectionButton.querySelector('span:last-child') as HTMLElement).textContent = 'Panele Dön';
    } else if (currentScreen === 'simulation' || currentScreen === 'sessionAnalysis') {
         backToSelectionButton.classList.remove('hidden');
         backToSelectionButton.onclick = () => showScreen('studentDashboard');
         (backToSelectionButton.querySelector('span:last-child') as HTMLElement).textContent = 'Panele Dön';
    }

    saveProgressButton.classList.toggle('hidden', currentScreen !== 'simulation');
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    goToLoginButton.addEventListener('click', () => showScreen('login'));
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    showRegisterView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('register'); });
    showLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    logoutButton.addEventListener('click', logout);
    saveProgressButton.addEventListener('click', async () => {
        await saveSessionProgress('in-progress');
    });
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.backButton.addEventListener('click', () => showScreen('studentDashboard'));
    analysis.sendButton.addEventListener('click', handleSendAnalysisToTeacher);
    analysis.fileInput.addEventListener('change', handleFileUpload);

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
    
    // Teacher Tabs
    teacherDashboard.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;
            activeTeacherTab = tabName;
            renderTeacherDashboard();
        });
    });

    // Profile Tabs
    teacherReview.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = (e.target as HTMLElement).dataset.target!;
            // Switch tabs UI
            teacherReview.tabs.forEach(t => {
                t.classList.remove('border-teal-600', 'text-teal-700');
                t.classList.add('border-transparent', 'text-gray-500');
            });
            (e.target as HTMLElement).classList.add('border-teal-600', 'text-teal-700');
            (e.target as HTMLElement).classList.remove('border-transparent', 'text-gray-500');

            // Show content
            Object.values(teacherReview.contents).forEach(c => c.classList.add('hidden'));
            teacherReview.contents[targetId as keyof typeof teacherReview.contents].classList.remove('hidden');
        });
    });

    teacherReview.backToDashboardButton.addEventListener('click', () => showScreen('teacherDashboard'));
    teacherUploadReview.backButton.addEventListener('click', () => {
        // Go back to the student's profile instead of main dashboard
        showStudentFullProfile(reviewingStudentId);
    });
    teacherUploadReview.submitButton.addEventListener('click', handleSubmitUploadFeedback);
    teacherQASystem.button.addEventListener('click', handleStudentQuestion);

    // Event Delegation
    document.body.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const approveButton = target.closest<HTMLButtonElement>('.approve-button');
        const viewProfileButton = target.closest<HTMLButtonElement>('.view-sessions-button');
        
        const reviewUploadButton = target.closest<HTMLButtonElement>('.review-upload-button');
        const replyQuestionButton = target.closest<HTMLButtonElement>('.reply-question-button');

        if (approveButton) await handleApproveRequest(approveButton.dataset.uid!);
        if (viewProfileButton) await showStudentFullProfile(viewProfileButton.dataset.studentid!);
        if (reviewUploadButton) await showUploadReviewDetail(reviewUploadButton.dataset.uploadid!, reviewUploadButton.dataset.studentid!);
        if (replyQuestionButton) await handleReplyToQuestion(replyQuestionButton.dataset.questionid!);
    });
}

// --- Login UI Logic ---
function setupLoginTabs() {
    btnRoleStudent.addEventListener('click', () => toggleLoginMode('student'));
    btnRoleTeacher.addEventListener('click', () => toggleLoginMode('teacher'));
}

function toggleLoginMode(mode: 'student' | 'teacher') {
    if (mode === 'student') {
        // Switch Slider
        roleSlider.style.transform = 'translateX(0%)';
        btnRoleStudent.classList.replace('text-gray-500', 'text-gray-800');
        btnRoleStudent.classList.add('font-bold');
        btnRoleStudent.classList.remove('font-medium');
        
        btnRoleTeacher.classList.replace('text-gray-800', 'text-gray-500');
        btnRoleTeacher.classList.remove('font-bold');
        btnRoleTeacher.classList.add('font-medium');

        // Styles for Student
        loginBrandPanel.classList.remove('from-amber-800', 'to-amber-900');
        loginBrandPanel.classList.add('from-teal-800', 'to-teal-900');
        
        loginButton.classList.remove('bg-amber-600', 'hover:bg-amber-700', 'shadow-amber-100');
        loginButton.classList.add('bg-[#0f766e]', 'hover:bg-teal-800', 'shadow-teal-100');
        
        brandTitle.textContent = "Hoş Geldiniz";
        brandSubtitle.textContent = "Gelişiminizi takip edin, süpervizyon alın ve yetkinliğinizi artırın.";
        
        registerLinkContainer.classList.remove('hidden');
    } else {
        // Switch Slider
        roleSlider.style.transform = 'translateX(100%)';
        btnRoleTeacher.classList.replace('text-gray-500', 'text-gray-800');
        btnRoleTeacher.classList.add('font-bold');
        btnRoleTeacher.classList.remove('font-medium');

        btnRoleStudent.classList.replace('text-gray-800', 'text-gray-500');
        btnRoleStudent.classList.remove('font-bold');
        btnRoleStudent.classList.add('font-medium');

        // Styles for Teacher (Supervisor)
        loginBrandPanel.classList.remove('from-teal-800', 'to-teal-900');
        loginBrandPanel.classList.add('from-amber-800', 'to-amber-900');

        loginButton.classList.remove('bg-[#0f766e]', 'hover:bg-teal-800', 'shadow-teal-100');
        loginButton.classList.add('bg-amber-600', 'hover:bg-amber-700', 'shadow-amber-100');

        brandTitle.textContent = "Yönetim Paneli";
        brandSubtitle.textContent = "Öğrenci gelişimlerini takip edin ve profesyonel geri bildirim sağlayın.";

        registerLinkContainer.classList.add('hidden'); // Supervisors can't self-register
    }
    
    // Clear errors
    loginError.classList.add('hidden');
}


// --- Authentication & User Management ---

function toggleLoginViews(view: 'login' | 'register') {
    loginView.classList.add('hidden');
    registerView.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    // Reset inputs
    emailInput.value = '';
    passwordInput.value = '';
    registerEmailInput.value = '';
    registerPasswordInput.value = '';
    registerConfirmPasswordInput.value = '';

    if (view === 'login') loginView.classList.remove('hidden');
    if (view === 'register') registerView.classList.remove('hidden');
}

function getFirebaseAuthErrorMessage(error: any): string {
    switch (error.code) {
        case 'auth/invalid-login-credentials':
        case 'auth/invalid-credential':
            return 'E-posta veya şifre hatalı.';
        case 'auth/invalid-email':
            return 'Geçersiz e-posta adresi formatı.';
        case 'auth/user-not-found':
            return 'Kullanıcı bulunamadı.';
        case 'auth/wrong-password':
            return 'Şifre hatalı.';
        case 'auth/email-already-in-use':
            return 'Bu e-posta adresi zaten sisteme kayıtlı.';
        case 'auth/weak-password':
            return 'Şifre çok zayıf. En az 6 karakter olmalı.';
        case 'auth/too-many-requests':
            return 'Çok fazla başarısız giriş denemesi. Lütfen biraz bekleyin.';
        case 'auth/network-request-failed':
            return 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
        default:
            return `Bir hata oluştu: ${error.message}`;
    }
}

async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    loginError.classList.add('hidden');

    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı kurulamadı.", "error");
        return;
    }
    if (!email || !password) {
        (loginError.querySelector('.login-error-text') as HTMLElement).textContent = "E-posta ve şifre gereklidir.";
        loginError.classList.remove('hidden');
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Giriş Yapılıyor...';

    // --- ADMIN BOOTSTRAP LOGIC ---
    if (email === 'drahmeterdem@gmail.com' && password === '708090') {
        try {
            console.log("Admin bootstrap initiated...");
            let userCredential;
            try {
                userCredential = await db.signInWithEmail(email, password);
            } catch (loginErr: any) {
                if (loginErr.code === 'auth/user-not-found' || 
                    loginErr.code === 'auth/invalid-login-credentials' || 
                    loginErr.code === 'auth/invalid-credential') {
                    
                    try {
                        userCredential = await db.signUpWithEmail(email, password);
                    } catch (createErr: any) {
                        if (createErr.code === 'auth/email-already-in-use') {
                            throw new Error("Admin hesabı zaten var ancak girilen şifre (708090) bu hesapla eşleşmiyor.");
                        }
                        throw createErr;
                    }
                } else {
                    throw loginErr;
                }
            }

            const adminProfile = {
                email: email,
                approved: true,
                role: 'teacher',
                createdAt: new Date().toISOString()
            };
            await db.setData('users', userCredential.user.uid, adminProfile);
            return;
        } catch (error: any) {
            console.error("Admin bootstrap failed:", error);
            (loginError.querySelector('.login-error-text') as HTMLElement).textContent = "Admin girişi başarısız: " + (error.message || getFirebaseAuthErrorMessage(error));
            loginError.classList.remove('hidden');
            loginButton.disabled = false;
            loginButton.textContent = 'Giriş Yap';
            return;
        }
    }

    try {
        const userCredential = await db.signInWithEmail(email, password);
        const user = userCredential.user;
        const userProfile = await db.getData('users', user.uid);
        if (userProfile && userProfile.role === 'student' && !userProfile.approved) {
             (loginError.querySelector('.login-error-text') as HTMLElement).textContent = "Hesabınız henüz Dr. Ahmet Erdem tarafından onaylanmamıştır.";
             loginError.classList.remove('hidden');
             await db.signOut();
             return;
        }
    } catch (error) {
        console.error("Login failed:", error);
        (loginError.querySelector('.login-error-text') as HTMLElement).textContent = getFirebaseAuthErrorMessage(error);
        loginError.classList.remove('hidden');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Giriş Yap';
    }
}

async function handleRegister() {
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value.trim();
    const confirmPassword = registerConfirmPasswordInput.value.trim();
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı kurulamadı.", "error");
        return;
    }
    if (!email || !password || !confirmPassword) {
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Tüm alanlar zorunludur.";
        registerError.classList.remove('hidden');
        return;
    }
    if (password !== confirmPassword) {
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Şifreler eşleşmiyor.";
        registerError.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Şifre en az 6 karakter olmalıdır.";
        registerError.classList.remove('hidden');
        return;
    }
    if (email === 'drahmeterdem@gmail.com' || email === 'teacher@admin.com') { 
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Bu e-posta adresi yönetici için ayrılmıştır.";
        registerError.classList.remove('hidden');
        return;
    }

    registerButton.disabled = true;
    registerButton.innerHTML = '<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span> Kayıt Yapılıyor...';
    
    try {
        const userCredential = await db.signUpWithEmail(email, password);
        const user = userCredential.user;

        const newUserProfile = { 
            email: user.email, 
            approved: false,
            role: 'student',
            createdAt: new Date().toISOString()
        };
        await db.setData('users', user.uid, newUserProfile);

        const newRequest = {
            email: user.email,
            uid: user.uid,
            timestamp: new Date().toISOString()
        };
        await db.setData('registrationRequests', user.uid, newRequest);


        (registerSuccess.querySelector('.register-success-text') as HTMLElement).textContent = "Kayıt talebiniz alındı! Dr. Ahmet Erdem hesabınızı onayladıktan sonra giriş yapabilirsiniz.";
        registerSuccess.classList.remove('hidden');
        
        await db.signOut();
        
        setTimeout(() => {
            toggleLoginViews('login');
        }, 4000);

    } catch (error) {
        console.error("Registration failed:", error);
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = getFirebaseAuthErrorMessage(error);
        registerError.classList.remove('hidden');
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Kayıt Talebi Gönder';
    }
}


async function logout() {
    await db.signOut();
    currentUserId = '';
    currentStudentName = '';
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
    card.className = 'bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col group';
    card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
            <h3 class="text-lg font-bold text-gray-800 group-hover:text-teal-600 transition-colors">${scenario.title}</h3>
            ${scenario.isCustom ? '<span class="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Özel</span>' : ''}
        </div>
        <p class="text-gray-600 text-sm mt-2 flex-grow leading-relaxed">${scenario.description}</p>
        <button class="mt-5 w-full flex items-center justify-center rounded-lg h-10 px-6 bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all">
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

    messageElement.className = `flex flex-col animate-fade-in-up ${isTherapist ? 'items-end' : isClient ? 'items-start' : 'items-center w-full'}`;
    bubble.className = `chat-bubble ${isTherapist ? 'chat-bubble-therapist' : isClient ? 'chat-bubble-client' : 'chat-bubble-teacher'}`;
    bubble.textContent = text;
    
    messageElement.appendChild(bubble);

    if (rationale && onRationaleClick) {
        const rationaleButton = document.createElement('button');
        rationaleButton.innerHTML = `<span class="material-symbols-outlined text-sm mr-1">lightbulb</span> Analiz`;
        rationaleButton.className = 'text-xs text-amber-600 hover:text-amber-800 hover:underline mt-1 ml-1 flex items-center';
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
    addMessageToChat(simulation.chatContainer, 'therapist', therapistResponse);
    chatHistory.push({ role: 'user', parts: [{ text: therapistResponse }] });

    const options = document.querySelectorAll('.option-button');
    options.forEach(opt => (opt as HTMLButtonElement).disabled = true);
    simulation.customResponseInput.disabled = true;
    simulation.sendCustomResponseButton.disabled = true;

    await getAiResponse(chatHistory, currentScenario!);
}


function updateSimulationUI(aiData: any) {
    addMessageToChat(simulation.chatContainer, 'client', aiData.clientResponse, aiData.rationale, () => showRationaleModal(aiData.rationale));
    
    simulation.feedbackSection.classList.remove('hidden');
    simulation.feedbackText.textContent = aiData.feedback;
    updateScoreBars(aiData.scoring, aiData.clientImpact);
    
    sessionScores.push({ scoring: aiData.scoring, clientImpact: aiData.clientImpact });
    renderOptions(aiData.therapistOptions);
    
    simulation.customResponseInput.disabled = false;
    simulation.sendCustomResponseButton.disabled = false;
    
    setTimeout(() => {
        simulation.chatContainer.scrollTop = simulation.chatContainer.scrollHeight;
    }, 100);
}

function updateScoreBars(scoring: any, clientImpact: any) {
    document.getElementById('val-empathy')!.textContent = scoring.empathy;
    document.getElementById('val-technique')!.textContent = scoring.technique;
    document.getElementById('val-relief')!.textContent = clientImpact.emotionalRelief;

    (document.getElementById('skill-empathy-bar') as HTMLElement).style.width = `${scoring.empathy * 10}%`;
    (document.getElementById('skill-technique-bar') as HTMLElement).style.width = `${scoring.technique * 10}%`;
    (document.getElementById('impact-emotion-bar') as HTMLElement).style.width = `${clientImpact.emotionalRelief * 10}%`;
}


function showLoaderWithOptions(show: boolean, text: string = "Yükleniyor...") {
    if (show) {
        simulation.optionsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 flex items-center justify-center p-4 text-gray-500 gap-3"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div><p class="text-sm font-medium animate-pulse">${text}</p></div>`;
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
    // Check if there are any sessions with status "in-progress" in DB
    const allSessions = await getAllSessionsForStudent(currentUserId);
    const inProgressSession = allSessions.find(s => s.status === 'in-progress');

    if (inProgressSession) {
        continueSessionCard.innerHTML = `
            <div class="flex items-center gap-4">
                 <div class="bg-indigo-100 p-3 rounded-full text-indigo-600">
                    <span class="material-symbols-outlined text-2xl">resume</span>
                 </div>
                 <div>
                    <h3 class="text-lg font-bold text-gray-800">Devam Et: ${inProgressSession.scenario.title}</h3>
                    <p class="text-sm text-gray-500">Yarım kalan simülasyonunuza dönün.</p>
                 </div>
            </div>
            <div class="mt-4 flex gap-2 w-full">
                <button id="resume-session-button" data-sid="${inProgressSession.id}" class="flex-1 rounded-lg h-9 bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-all text-sm shadow-sm">Simülasyona Dön</button>
            </div>
        `;
        document.getElementById('resume-session-button')!.addEventListener('click', (e) => resumeSession((e.target as HTMLElement).dataset.sid!));
    } else {
        continueSessionCard.innerHTML = `
             <div class="flex items-center gap-4">
                 <div class="bg-teal-100 p-3 rounded-full text-teal-600">
                    <span class="material-symbols-outlined text-2xl">play_arrow</span>
                 </div>
                 <div>
                    <h3 class="text-lg font-bold text-gray-800">Yeni Simülasyon</h3>
                    <p class="text-sm text-gray-500">BDT becerilerinizi geliştirmek için pratik yapın.</p>
                 </div>
            </div>
            <button id="start-new-session-button" class="mt-4 w-full rounded-lg h-9 bg-white border border-gray-300 text-gray-700 font-medium hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all text-sm">Senaryo Seç</button>
        `;
        document.getElementById('start-new-session-button')!.addEventListener('click', () => showScreen('problemSelection'));
    }
}


function renderProgressTracking() {
    if (sessionScores.length > 0) {
        progressTracking.card.classList.remove('hidden');
        progressTracking.container.innerHTML = createChartHTML(calculateAverageScores(sessionScores));
    }
}

async function renderCumulativeProgress() {
    if (!isDbConnected) {
        cumulativeProgress.card.classList.add('hidden');
        return;
    }
    const allSessions = await getAllSessionsForStudent(currentUserId);
    if (allSessions.length > 0) {
        const completedSessions = allSessions.filter(s => s.status === 'completed');
        const allScores = completedSessions.flatMap(s => s.scores);
        if (allScores.length > 0) {
            cumulativeProgress.card.classList.remove('hidden');
            cumulativeProgress.container.innerHTML = createChartHTML(calculateAverageScores(allScores));
            return;
        }
    }
}

function createChartHTML(scores: any): string {
    return `
        <div class="space-y-3">
            ${createBar('Empati & Anlayış', scores.empathy, 'fuchsia')}
            ${createBar('Teknik Yeterlilik', scores.technique, 'amber')}
            ${createBar('Terapötik İttifak', scores.rapport, 'teal')}
            <div class="h-px bg-gray-100 my-2"></div>
            ${createBar('Danışan Faydası', scores.emotionalRelief, 'green')}
        </div>
    `;
}

function createBar(label: string, value: number, color: string): string {
    const percentage = value * 10;
    return `
        <div class="w-full">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs font-medium text-gray-500">${label}</span>
                <span class="text-xs font-bold text-gray-700">${value.toFixed(1)}/10</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full bg-${color}-500 chart-bar" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `;
}


function renderAchievements() {
    achievements.container.innerHTML = `
        <div class="flex flex-col items-center p-2 rounded-lg bg-gray-50 border border-gray-100" title="İlk simülasyonunu tamamla"><span class="material-symbols-outlined text-3xl text-gray-400">workspace_premium</span><span class="text-[10px] mt-1 text-gray-500 font-medium">İlk Adım</span></div>
        <div class="flex flex-col items-center p-2 rounded-lg bg-gray-50 border border-gray-100" title="5 simülasyon tamamla"><span class="material-symbols-outlined text-3xl text-gray-400">military_tech</span><span class="text-[10px] mt-1 text-gray-500 font-medium">İstikrarlı</span></div>
        <div class="flex flex-col items-center p-2 rounded-lg bg-gray-50 border border-gray-100" title="Empati puanını 8'in üzerine çıkar"><span class="material-symbols-outlined text-3xl text-gray-400">psychology</span><span class="text-[10px] mt-1 text-gray-500 font-medium">Empatik</span></div>
    `;
}

async function renderRecommendations() {
    if (!isDbConnected) {
        recommendations.container.innerHTML = '<p class="text-gray-400 text-xs text-center">Bağlantı yok.</p>';
        return;
    }
    recommendations.container.innerHTML = '';
    const allSessions = await getAllSessionsForStudent(currentUserId);
    const uniqueScenarioIds = [...new Set(allSessions.map(s => s.scenario.id))];

    if (uniqueScenarioIds.length === 0) {
        recommendations.container.innerHTML = '<p class="text-gray-400 text-sm italic">Simülasyon tamamladıkça öneriler burada görünecek.</p>';
        return;
    }
    
    const allResources = await db.getCollection('resources');
    const relevantResources = allResources.filter(r => r.associatedScenarioIds.some((id: string) => uniqueScenarioIds.includes(id)));
    
    if (relevantResources.length > 0) {
         relevantResources.slice(0, 3).forEach(resource => {
            const resourceCard = `
                <a href="${resource.url}" target="_blank" class="block bg-white p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:shadow-sm transition-all group">
                    <div class="flex items-start gap-3">
                        <div class="bg-gray-50 p-1.5 rounded text-gray-500 group-hover:text-teal-600 group-hover:bg-teal-50 transition-colors">
                            <span class="material-symbols-outlined text-xl">${resource.type === 'video' ? 'movie' : resource.type === 'pdf' ? 'picture_as_pdf' : 'article'}</span>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800 text-sm group-hover:text-teal-700 transition-colors">${resource.title}</h4>
                            <p class="text-xs text-gray-500 capitalize mt-0.5">${resource.type} • Tıklayıp İncele</p>
                        </div>
                    </div>
                </a>`;
            recommendations.container.innerHTML += resourceCard;
        });
    } else {
        recommendations.container.innerHTML = '<p class="text-gray-400 text-sm italic">Şu an için yeni bir öneri bulunmuyor.</p>';
    }
}

async function renderQACard() {
    if (!isDbConnected) {
        teacherQASystem.history.innerHTML = '<p class="text-center text-gray-500 text-sm">Bağlantı gerekli.</p>';
        return;
    }
    const qaHistory = await getQAsForStudent(currentUserId);
    teacherQASystem.history.innerHTML = '';
    if (qaHistory.length === 0) {
        teacherQASystem.history.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center p-4">
                <span class="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
                <p class="text-gray-500 text-sm">Aklınıza takılan soruları buradan Dr. Ahmet Erdem'e iletebilirsiniz.</p>
            </div>`;
    } else {
        qaHistory.forEach(qa => {
            teacherQASystem.history.innerHTML += `
                <div class="flex flex-col items-end mb-4">
                    <div class="bg-slate-200 text-slate-800 rounded-2xl rounded-tr-sm py-2 px-3 max-w-[90%] text-sm">
                        ${qa.question}
                    </div>
                    <span class="text-[10px] text-gray-400 mt-1 mr-1">Siz</span>
                </div>
            `;
            if (qa.answer) {
                teacherQASystem.history.innerHTML += `
                    <div class="flex flex-col items-start mb-4">
                         <div class="flex items-center gap-2 mb-1 ml-1">
                             <span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 rounded">Dr. Erdem</span>
                         </div>
                        <div class="bg-white border border-gray-200 text-gray-700 rounded-2xl rounded-tl-sm py-2 px-3 max-w-[90%] text-sm shadow-sm">
                            ${qa.answer}
                        </div>
                    </div>
                `;
            } else {
                 teacherQASystem.history.innerHTML += `<div class="text-xs text-gray-400 italic text-center my-2 flex items-center justify-center gap-1"><span class="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></span> Yanıt bekleniyor</div>`;
            }
        });
         teacherQASystem.history.scrollTop = teacherQASystem.history.scrollHeight;
    }
}


// --- Session Progress Management ---
async function saveSessionProgress(status: 'completed' | 'in-progress' = 'completed') {
    if (!currentScenario || chatHistory.length === 0 || !isDbConnected) {
        if(!isDbConnected) showNotification("Veritabanı bağlantısı olmadığından seans kaydedilemedi.", "error");
        return;
    }

    // Always use a session ID (new or existing)
    // For now, let's create a new ID if not resuming, or overwrite if we had a resume feature
    // To support "Resume", we'd need to store currentSessionID in a variable. 
    // Simplified: Always use timestamp ID for now, but save "status".
    // Better: If user is resuming, use that ID.
    
    // NOTE: For MVP simplicity with the "incomplete" request:
    // When saving as "in-progress", we save to DB. 
    // We should probably check if we are already in a session ID.
    const sessionId = reviewingSessionId || `sess_${Date.now()}`; 

    const sessionData = {
        id: sessionId,
        userId: currentUserId,
        scenario: currentScenario,
        history: chatHistory,
        scores: sessionScores,
        timestamp: new Date().toISOString(),
        feedback: null,
        status: status // 'in-progress' or 'completed'
    };

    await db.setDataInSubcollection('students', currentUserId, 'sessions', sessionId, sessionData);

    if (status === 'completed') {
        showNotification("Seans başarıyla tamamlandı ve kaydedildi!", "success");
        setTimeout(() => showScreen('studentDashboard'), 1000);
        
        // Reset state
        chatHistory = [];
        sessionScores = [];
        currentScenario = null;
        reviewingSessionId = '';
    } else {
        showNotification("İlerlemeniz kaydedildi.", "success");
        setTimeout(() => showScreen('studentDashboard'), 1000);
        // Reset state because we left the screen
        chatHistory = [];
        sessionScores = [];
        currentScenario = null;
        reviewingSessionId = '';
    }
}

async function resumeSession(sessionId: string) {
    const sessions = await getAllSessionsForStudent(currentUserId);
    const sessionToResume = sessions.find(s => s.id === sessionId);

    if (sessionToResume) {
        currentScenario = sessionToResume.scenario;
        chatHistory = sessionToResume.history;
        sessionScores = sessionToResume.scores || [];
        reviewingSessionId = sessionToResume.id; // Track ID to update it later

        showScreen('simulation');
        simulation.problemDisplay.textContent = currentScenario!.title;
        simulation.chatContainer.innerHTML = '';
        simulation.optionsContainer.innerHTML = '';

        chatHistory.forEach(turn => {
            if (turn.role === 'user') {
                addMessageToChat(simulation.chatContainer,'therapist', turn.parts[0].text);
            } else if (turn.role === 'model') {
                 try {
                    const modelResponse = JSON.parse(turn.parts[0].text);
                    addMessageToChat(simulation.chatContainer, 'client', modelResponse.clientResponse);
                } catch(e) {
                     addMessageToChat(simulation.chatContainer, 'client', turn.parts[0].text);
                }
            }
        });
        
        // Re-render options from last turn
        try {
            const lastModelResponse = JSON.parse(chatHistory[chatHistory.length - 1].parts[0].text);
            updateSimulationUI(lastModelResponse);
        } catch (e) {
            // If last turn wasn't model or parsing failed
             const initialOptions = [
                "Devam edelim...",
                "Başka bir konuya geçelim mi?",
             ];
             renderOptions(initialOptions);
        }
    }
}


async function getAllSessionsForStudent(userId: string): Promise<any[]> {
    if (!isDbConnected) return [];
    return await db.getSubcollection('students', userId, 'sessions');
}

// --- Analysis Screen Logic ---
async function handleFileUpload() {
    const file = analysis.fileInput.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            mammoth.extractRawText({arrayBuffer: arrayBuffer})
                .then(function(result: any){
                    analysis.transcriptInput.value = result.value;
                })
                .catch(function(err: any){
                    console.error(err);
                    showNotification("Dosya okunamadı.", "error");
                });
        };
        reader.readAsArrayBuffer(file);
    } else {
        showNotification("Lütfen .docx uzantılı bir Word dosyası seçin.", "error");
    }
}

async function handleAnalyzeTranscript() {
    if (!ai) {
        showNotification("Sistem aktif değil. Lütfen öğretmenin API anahtarını yapılandırmasını sağlayın.", "error");
        return;
    }
    const transcript = analysis.transcriptInput.value;
    if (!transcript.trim()) {
        showNotification("Lütfen analiz için bir metin girin veya dosya yükleyin.", "error");
        return;
    }
    
    // Metadata is optional for analysis but required for sending
    const clientName = analysis.clientNameInput.value.trim();
    const sessionNum = analysis.sessionNumInput.value.trim();

    analysis.analyzeButton.disabled = true;
    analysis.analyzeButton.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Analiz Ediliyor...`;
    analysis.output.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full space-y-3">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
            <p class="text-gray-500 text-sm animate-pulse">Yapay zeka transkripti inceliyor...</p>
        </div>`;

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
            currentAnalysisCache = { 
                transcript, 
                analysis: jsonResponse,
                clientName: clientName,
                sessionNumber: sessionNum
            };
        } catch (parseError) {
            throw new Error("Failed to parse the JSON data from the AI analysis.");
        }

    } catch (error) {
        console.error("Analysis Error:", error);
        analysis.output.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-lg text-sm">Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.</div>`;
        showNotification("Analiz başarısız oldu.", "error");
    } finally {
        analysis.analyzeButton.disabled = false;
        analysis.analyzeButton.innerHTML = `<span class="material-symbols-outlined mr-2">analytics</span><span>Yapay Zeka Analizini Başlat</span>`;
    }
}

function renderAnalysisOutput(data: any, container: HTMLElement = analysis.output) {
    let html = `<h3 class="text-lg font-bold text-gray-800 mb-2">Genel Özet</h3><p class="mb-4 text-gray-600">${data.overallSummary}</p>`;
    
    html += `<h3 class="text-lg font-bold text-teal-700 mb-2 flex items-center gap-2"><span class="material-symbols-outlined">thumb_up</span> Güçlü Yönler</h3><ul class="list-disc pl-5 mb-4 space-y-1 text-gray-600">${data.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    
    html += `<h3 class="text-lg font-bold text-amber-700 mb-2 flex items-center gap-2"><span class="material-symbols-outlined">construction</span> Geliştirilecek Alanlar</h3><ul class="list-disc pl-5 mb-4 space-y-1 text-gray-600">${data.areasForImprovement.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
    
    html += `<h3 class="text-lg font-bold text-gray-800 mb-2">Kritik Anlar</h3>`;
    data.keyMomentsAnalysis.forEach((moment: any) => {
        html += `<div class="bg-white border-l-4 border-indigo-500 p-3 mb-3 shadow-sm"><h4 class="font-semibold text-gray-800 text-sm mb-1">${moment.moment}</h4><p class="text-sm text-gray-600">${moment.analysis}</p></div>`;
    });
    container.innerHTML = html;
}

async function handleSendAnalysisToTeacher() {
    // If user edited the inputs after analysis, update the cache locally before sending
    const clientName = analysis.clientNameInput.value.trim() || "Belirtilmedi";
    const sessionNum = analysis.sessionNumInput.value.trim() || "1";

    if (!currentAnalysisCache) {
        showNotification("Lütfen önce analizi tamamlayın.", "error");
        return;
    }
    
    if (!isDbConnected) {
        showNotification("Veritabanı bağlantısı olmadığından gönderilemedi.", "error");
        return;
    }

    const uploadId = `upload_${Date.now()}`;

    // Merge current input values with the cached analysis result
    const uploadData = {
        id: uploadId,
        studentId: currentUserId,
        studentEmail: currentStudentName,
        clientName: clientName,
        sessionNumber: sessionNum,
        transcript: currentAnalysisCache.transcript,
        analysis: currentAnalysisCache.analysis,
        timestamp: new Date().toISOString(),
        feedback: null
    };
    
    await db.setData('uploads', uploadId, uploadData);
    showNotification("Rapor başarıyla Dr. Ahmet Erdem'e iletildi!", "success");
    analysis.sendButton.classList.add('hidden');
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
        studentEmail: currentStudentName,
        question: question,
        answer: null,
        timestamp: new Date().toISOString()
    };
    await db.setData('qas', qaId, qaData);
    teacherQASystem.input.value = '';
    await renderQACard();
    showNotification("Sorunuz iletildi.", "success");
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
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-teal-600' };
    const icon = { success: 'check_circle', error: 'error', info: 'info' };
    const notification = document.createElement('div');
    notification.className = `flex items-center gap-3 ${colors[type]} text-white py-3 px-4 rounded-lg shadow-lg animate-fade-in-up border border-white/20`;
    notification.innerHTML = `<span class="material-symbols-outlined text-xl">${icon[type]}</span><p class="text-sm font-medium">${message}</p>`;
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
    showLoaderWithOptions(true, "Elif düşünüyor...");
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
        simulation.optionsContainer.innerHTML = '<p class="text-red-500 col-span-2 text-center text-sm">Yapay zeka yanıt verirken bir hata oluştu. Lütfen tekrar deneyin.</p>';
        showNotification("AI yanıt hatası.", "error");
    } 
}

// --- Teacher Specific Functions ---

async function handleApproveRequest(uidToApprove: string) {
    if (!uidToApprove) return;

    // 1. Update the user's profile to be approved
    await db.updateData('users', uidToApprove, { approved: true });

    // 2. Delete the request from the registrationRequests collection
    await db.deleteData('registrationRequests', uidToApprove);

    // 3. Create the main student document in the 'students' collection for session data
    const userProfile = await db.getData('users', uidToApprove);
    if (userProfile) {
        await db.setData('students', uidToApprove, {
            email: userProfile.email,
            joinedAt: userProfile.createdAt || new Date().toISOString()
        });
        showNotification(`'${userProfile.email}' adlı öğrenci onaylandı.`, 'success');
    } else {
        showNotification(`Onaylanacak kullanıcı profili bulunamadı.`, 'error');
    }
    
    await renderRegistrationRequests();
}

async function renderRegistrationRequests() {
    if (!isDbConnected) {
        requestsListContainer.innerHTML = '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }
    const pendingRequests = await db.getCollection('registrationRequests');

    requestsListContainer.innerHTML = '';
    if (pendingRequests.length === 0) {
        requestsListContainer.innerHTML = '<p class="text-center text-gray-500 italic text-sm py-4">Bekleyen kayıt isteği yok.</p>';
        return;
    }

    pendingRequests.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // oldest first

    pendingRequests.forEach((request: any) => {
        const requestElement = document.createElement('div');
        requestElement.className = 'flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow';
        requestElement.innerHTML = `
            <div class="flex items-center gap-3">
                 <div class="bg-gray-100 p-2 rounded-full"><span class="material-symbols-outlined text-gray-500">person_add</span></div>
                 <div>
                    <p class="font-bold text-gray-800 text-sm">${request.email}</p>
                    <p class="text-xs text-gray-500">Tarih: ${new Date(request.timestamp).toLocaleString('tr-TR')}</p>
                 </div>
            </div>
            <button data-uid="${request.uid}" class="approve-button flex items-center justify-center rounded-lg h-9 px-4 bg-green-600 text-white font-semibold hover:bg-green-700 transition-all shadow-sm text-sm">
                <span class="material-symbols-outlined text-lg mr-1.5">check_circle</span><span>Onayla</span>
            </button>
        `;
        requestsListContainer.appendChild(requestElement);
    });
}

function renderSettingsTab() {
    const currentKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    const maskedKey = currentKey ? `•••••••••••••••••••••••••••••••${currentKey.slice(-4)}` : "Henüz ayarlanmadı.";
    
    teacherDashboard.contents.settings.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-6">
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div class="flex items-center gap-3 mb-6">
                    <div class="bg-indigo-100 p-2 rounded-full"><span class="material-symbols-outlined text-indigo-600 text-2xl">psychology</span></div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Yapay Zeka Yapılandırması</h3>
                        <p class="text-sm text-gray-500">Gemini modelini etkinleştirmek için anahtarınızı girin.</p>
                    </div>
                </div>
                <div>
                    <label for="teacher-api-key-input" class="block text-sm font-medium text-gray-700 mb-1">Gemini API Anahtarı</label>
                    <p class="text-xs text-gray-500 mb-2 font-mono bg-gray-50 p-1 inline-block rounded">Aktif: ${maskedKey}</p>
                    <input type="password" id="teacher-api-key-input" class="block w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" placeholder="AI Studio anahtarınızı buraya yapıştırın...">
                    <button id="teacher-save-api-key-button" class="mt-4 w-full flex items-center justify-center rounded-lg h-10 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">Anahtarı Kaydet</button>
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
            showNotification("Sistem başarıyla etkinleştirildi!", "success");
            input.value = "";
            renderSettingsTab();
        } else {
            showNotification("Geçersiz anahtar formatı.", "error");
        }
    });
}

// New Teacher Dashboard Functions
async function renderStudentSimulationsList() {
    const container = teacherDashboard.contents.simulations;
    container.innerHTML = `<h3 class="text-lg font-bold text-gray-800 mb-4">Öğrenci Listesi</h3>`;
    if (!isDbConnected) {
        container.innerHTML += '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }
    const students = await db.getCollectionWhere('users', 'approved', '==', true);
    if (students.length === 0) {
        container.innerHTML += '<p class="text-center text-gray-500 text-sm">Sisteme kayıtlı öğrenci bulunmuyor.</p>';
        return;
    }
    const studentList = document.createElement('div');
    studentList.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    students.forEach(student => {
        // Exclude teacher from this list
        if (student.role === 'teacher') return;

        studentList.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center justify-between">
                <div class="flex items-center gap-3">
                     <div class="bg-teal-50 text-teal-700 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">${student.email[0].toUpperCase()}</div>
                     <div class="overflow-hidden">
                        <p class="font-semibold text-gray-800 text-sm truncate w-32 md:w-auto" title="${student.email}">${student.email}</p>
                        <p class="text-xs text-gray-400">Öğrenci</p>
                     </div>
                </div>
                <button data-studentid="${student.id}" class="view-sessions-button flex-shrink-0 rounded-lg p-2 bg-gray-50 text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                    <span class="material-symbols-outlined">arrow_forward_ios</span>
                </button>
            </div>`;
    });
    container.appendChild(studentList);
}

// New: Full Profile Aggregation
async function showStudentFullProfile(studentId: string) {
    reviewingStudentId = studentId;
    showScreen('teacherReview');
    
    // Hide details, show loading or empty first
    teacherReview.contents.simulations.innerHTML = '<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div></div>';
    
    const studentProfile = await db.getData('users', studentId);
    teacherReview.studentName.textContent = studentProfile?.email.split('@')[0] || "Öğrenci";
    teacherReview.studentEmail.textContent = studentProfile?.email || studentId;

    // Fetch all data in parallel
    const [sessions, uploads, questions] = await Promise.all([
        getAllSessionsForStudent(studentId),
        db.getCollectionWhere('uploads', 'studentId', '==', studentId),
        db.getCollectionWhere('qas', 'studentId', '==', studentId)
    ]);

    // Update Stats
    const completed = sessions.filter(s => s.status === 'completed').length;
    const incomplete = sessions.filter(s => s.status === 'in-progress').length;
    teacherReview.statCompleted.textContent = completed.toString();
    teacherReview.statIncomplete.textContent = incomplete.toString();

    // 1. Render Simulations
    teacherReview.contents.simulations.innerHTML = '';
    if (sessions.length === 0) {
        teacherReview.contents.simulations.innerHTML = '<p class="text-center text-gray-400 py-8">Simülasyon kaydı yok.</p>';
    } else {
        sessions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        sessions.forEach(session => {
            const isCompleted = session.status === 'completed';
            teacherReview.contents.simulations.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border ${isCompleted ? 'border-gray-100' : 'border-amber-200 bg-amber-50'} flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="${isCompleted ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-100 text-amber-700'} text-xs font-bold px-2 py-0.5 rounded-full">
                            ${isCompleted ? 'Tamamlandı' : 'Devam Ediyor'}
                        </span>
                        <span class="text-xs text-gray-400">${new Date(session.timestamp).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p class="font-bold text-gray-800 text-sm">${session.scenario.title}</p>
                </div>
                 <button onclick="showSessionDetailReview('${studentId}', '${session.id}')" class="text-sm font-medium text-indigo-600 hover:underline">İncele</button>
            </div>`;
        });
    }

    // 2. Render Uploads
    teacherReview.contents.uploads.innerHTML = '';
    if (uploads.length === 0) {
        teacherReview.contents.uploads.innerHTML = '<p class="text-center text-gray-400 py-8">Yüklenen belge yok.</p>';
    } else {
        uploads.sort((a: any,b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        uploads.forEach(upload => {
            teacherReview.contents.uploads.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">Belge</span>
                        <span class="text-xs text-gray-400">${new Date(upload.timestamp).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <p class="font-bold text-gray-800 text-sm">Danışan: ${upload.clientName || '?'}</p>
                    <p class="text-xs text-gray-500">Oturum: ${upload.sessionNumber || '?'}</p>
                </div>
                 <button data-uploadid="${upload.id}" data-studentid="${studentId}" class="review-upload-button text-sm font-medium text-teal-600 hover:underline">İncele</button>
            </div>`;
        });
    }

    // 3. Render Questions
    teacherReview.contents.questions.innerHTML = '';
    if (questions.length === 0) {
        teacherReview.contents.questions.innerHTML = '<p class="text-center text-gray-400 py-8">Soru kaydı yok.</p>';
    } else {
        questions.sort((a: any,b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        questions.forEach(qa => {
            teacherReview.contents.questions.innerHTML += `
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <p class="text-xs text-gray-400 mb-1">${new Date(qa.timestamp).toLocaleString('tr-TR')}</p>
                <p class="text-sm text-gray-800 italic mb-2">"${qa.question}"</p>
                ${qa.answer ? 
                    `<div class="pl-3 border-l-2 border-green-500 text-sm text-gray-600"><span class="font-bold text-green-700">Cevap:</span> ${qa.answer}</div>` : 
                    `<span class="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">Yanıt Bekliyor</span>`
                }
            </div>`;
        });
    }
}

// Make this globally accessible for the onclick in HTML string
(window as any).showSessionDetailReview = showSessionDetailReview;

async function showSessionDetailReview(studentId: string, sessionId: string) {
    reviewingStudentId = studentId;
    reviewingSessionId = sessionId;

    // Dynamically create and show a modal for detailed session review
    const existingModal = document.getElementById('session-review-modal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
    <div id="session-review-modal" class="fixed inset-0 bg-black/60 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
        <div class="bg-white w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <div class="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-none">
                <h3 class="font-bold text-gray-800 flex items-center gap-2"><span class="material-symbols-outlined text-indigo-600">history_edu</span> Simülasyon Detayı</h3>
                <button id="close-session-modal" class="text-gray-500 hover:text-red-600 bg-white p-1 rounded-full shadow-sm"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="flex-1 flex overflow-hidden">
                 <div id="modal-chat-container" class="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4">
                    <p class="text-center text-gray-400 mt-10">Sohbet geçmişi yükleniyor...</p>
                 </div>
                 <div class="w-80 border-l border-gray-200 p-4 bg-white overflow-y-auto flex-none">
                     <div class="mb-6">
                        <h4 class="font-bold text-xs text-gray-500 uppercase mb-3">Performans Analizi</h4>
                        <div id="modal-charts" class="space-y-4"></div>
                     </div>
                     <div class="pt-4 border-t border-gray-100">
                         <h4 class="font-bold text-xs text-gray-500 uppercase mb-2">Süpervizör Notu</h4>
                         <textarea id="modal-feedback-input" class="w-full border-gray-300 rounded-lg text-sm mb-3 focus:ring-amber-500 focus:border-amber-500" rows="5" placeholder="Öğrenciye geri bildirim yazın..."></textarea>
                         <button id="modal-save-feedback" class="w-full bg-amber-600 text-white rounded-lg py-2 font-medium hover:bg-amber-700 transition-colors">Notu Kaydet</button>
                     </div>
                 </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('close-session-modal')!.onclick = () => document.getElementById('session-review-modal')!.remove();
    
    const sessions = await getAllSessionsForStudent(studentId);
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
        showNotification("Seans verisi bulunamadı.", "error");
        document.getElementById('session-review-modal')!.remove();
        return;
    }
    
    const chatContainer = document.getElementById('modal-chat-container')!;
    chatContainer.innerHTML = '';
    
    if (!session.history || session.history.length === 0) {
        chatContainer.innerHTML = '<p class="text-center text-gray-400 mt-10">Bu seansta kaydedilmiş mesaj yok.</p>';
    } else {
        session.history.forEach((turn: any) => {
            if (turn.role === 'user') {
                addMessageToChat(chatContainer, 'therapist', turn.parts[0].text);
            } else if (turn.role === 'model') {
                try {
                    // Try parsing JSON if stored as JSON string
                    const modelResponse = JSON.parse(turn.parts[0].text);
                    addMessageToChat(chatContainer, 'client', modelResponse.clientResponse);
                } catch (e) {
                    // Fallback for raw text or simple objects
                    const text = typeof turn.parts[0].text === 'object' ? JSON.stringify(turn.parts[0].text) : turn.parts[0].text;
                    addMessageToChat(chatContainer, 'client', text);
                }
            }
        });
        // Scroll to bottom
        setTimeout(() => chatContainer.scrollTop = chatContainer.scrollHeight, 100);
    }
    
    if (session.scores && session.scores.length > 0) {
        document.getElementById('modal-charts')!.innerHTML = createChartHTML(calculateAverageScores(session.scores));
    } else {
        document.getElementById('modal-charts')!.innerHTML = '<p class="text-xs text-gray-400 italic">Puanlama verisi yok (Yarım kalmış olabilir).</p>';
    }

    const feedbackInput = document.getElementById('modal-feedback-input') as HTMLTextAreaElement;
    feedbackInput.value = session.feedback || '';
    
    document.getElementById('modal-save-feedback')!.addEventListener('click', async () => {
         const fb = feedbackInput.value.trim();
         if(fb) {
             await db.updateDataInSubcollection('students', studentId, 'sessions', sessionId, { feedback: fb });
             showNotification("Geri bildirim kaydedildi.", "success");
         } else {
             showNotification("Lütfen bir not yazın.", "info");
         }
    });
}


async function renderUploadedAnalysesList() {
    const container = teacherDashboard.contents.uploads.querySelector('#uploads-list-container')!;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }
    const uploads = await db.getCollection('uploads');
    container.innerHTML = '';
    if (uploads.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-6">İncelenecek döküman bulunmuyor.</p>';
        return;
    }
    uploads.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    uploads.forEach(upload => {
        container.innerHTML += `
            <div class="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                    <div class="bg-teal-50 p-2.5 rounded-lg text-teal-600"><span class="material-symbols-outlined">description</span></div>
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${upload.studentEmail || upload.studentId}</p>
                        <p class="text-xs text-gray-500">${new Date(upload.timestamp).toLocaleString('tr-TR')} • Danışan: ${upload.clientName || '-'}</p>
                    </div>
                </div>
                <button data-uploadid="${upload.id}" data-studentid="${upload.studentId}" class="review-upload-button flex items-center justify-center rounded-lg h-9 px-4 bg-teal-600 text-white hover:bg-teal-700 transition-colors text-sm font-medium shadow-sm">
                    İncele
                </button>
            </div>`;
    });
}

async function showUploadReviewDetail(uploadId: string, studentId: string) {
    reviewingUploadId = uploadId;
    reviewingStudentId = studentId; // Ensure we know who we are reviewing to go back correctly
    const upload = await db.getData('uploads', uploadId);
    if (!upload) return;

    showScreen('teacherUploadReview');
    teacherUploadReview.studentName.textContent = upload.studentEmail || upload.studentId;
    teacherUploadReview.metaDisplay.textContent = `Danışan: ${upload.clientName || '-'} | Oturum: ${upload.sessionNumber || '-'}`;
    teacherUploadReview.transcript.textContent = upload.transcript;
    renderAnalysisOutput(upload.analysis, teacherUploadReview.analysis);

    teacherUploadReview.feedbackInput.value = upload.feedback || '';
     if (upload.feedback) {
        teacherUploadReview.existingFeedback.innerHTML = upload.feedback;
        teacherUploadReview.existingFeedback.parentElement!.classList.remove('hidden');
    } else {
        teacherUploadReview.existingFeedback.innerHTML = '';
        teacherUploadReview.existingFeedback.parentElement!.classList.add('hidden');
    }
}

async function handleSubmitUploadFeedback() {
    const feedbackText = teacherUploadReview.feedbackInput.value.trim();
    if (!feedbackText) {
        showNotification("Lütfen bir geri bildirim yazın.", "error");
        return;
    }
    await db.updateData('uploads', reviewingUploadId, { feedback: feedbackText });
    showNotification("Geri bildirim kaydedildi.", "success");
    await showUploadReviewDetail(reviewingUploadId, reviewingStudentId); // Refresh view
}

async function renderStudentQuestions() {
    const container = teacherDashboard.contents.questions.querySelector('#questions-list-container')!;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }
    const questions = await db.getCollection('qas');
    container.innerHTML = '';
    if (questions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-6">Bekleyen soru yok.</p>';
        return;
    }
    questions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // newest first
    questions.forEach(qa => {
        container.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <div class="bg-slate-100 p-1 rounded text-slate-500"><span class="material-symbols-outlined text-lg">person</span></div>
                        <span class="font-bold text-gray-700 text-sm">${qa.studentEmail || qa.studentId}</span>
                    </div>
                    <span class="text-xs text-gray-400">${new Date(qa.timestamp).toLocaleString('tr-TR')}</span>
                </div>
                <div class="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100">
                    ${qa.question}
                </div>
                <div>
                    ${qa.answer ? 
                        `<div class="pl-4 border-l-2 border-amber-400">
                            <p class="text-xs font-bold text-amber-700 mb-1">Yanıtınız:</p>
                            <p class="text-sm text-gray-600">${qa.answer}</p>
                         </div>` :
                        `<div class="flex gap-2">
                            <textarea id="reply-input-${qa.id}" class="flex-grow rounded-lg border-gray-300 text-sm focus:border-green-500 focus:ring-green-500" placeholder="Yanıt yazın..." rows="1"></textarea>
                            <button data-questionid="${qa.id}" class="reply-question-button rounded-lg px-4 bg-green-600 text-white font-semibold hover:bg-green-700 text-sm">Gönder</button>
                        </div>`
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
    showNotification("Yanıt gönderildi.", "success");
    await renderStudentQuestions();
}

async function renderClassAnalytics() {
    const container = teacherDashboard.contents.analytics;
    if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }
    
    const students = await db.getCollectionWhere('users', 'role', '==', 'student');
    let allSessions: any[] = [];
    for (const student of students) {
        if(student.approved) { // Only count approved students' sessions
            const studentSessions = await getAllSessionsForStudent(student.id);
            allSessions.push(...studentSessions);
        }
    }
    const allScores = allSessions.flatMap(s => s.scores);
    
    const totalSimulations = allSessions.length;
    let mostPracticed = 'Veri Yok';
    if(totalSimulations > 0) {
        const scenarioCounts = allSessions.reduce((acc, session) => {
            acc[session.scenario.title] = (acc[session.scenario.title] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        mostPracticed = Object.keys(scenarioCounts).reduce((a, b) => scenarioCounts[a] > scenarioCounts[b] ? a : b);
    }

    const averageScores = calculateAverageScores(allScores);

    container.innerHTML = `
        <h3 class="text-lg font-bold text-gray-800 mb-6">Sınıf Genel Bakışı</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div class="bg-blue-50 p-3 rounded-lg text-blue-600"><span class="material-symbols-outlined text-3xl">groups</span></div>
                <div>
                    <p class="text-2xl font-bold text-gray-800">${students.filter(s=>s.approved).length}</p>
                    <p class="text-xs text-gray-500 uppercase font-semibold">Aktif Öğrenci</p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div class="bg-teal-50 p-3 rounded-lg text-teal-600"><span class="material-symbols-outlined text-3xl">psychology_alt</span></div>
                <div>
                    <p class="text-2xl font-bold text-gray-800">${totalSimulations}</p>
                    <p class="text-xs text-gray-500 uppercase font-semibold">Toplam Seans</p>
                </div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div class="bg-pink-50 p-3 rounded-lg text-pink-600"><span class="material-symbols-outlined text-3xl">trending_up</span></div>
                <div>
                     <p class="text-lg font-bold text-gray-800 truncate w-32 md:w-auto" title="${mostPracticed}">${mostPracticed}</p>
                    <p class="text-xs text-gray-500 uppercase font-semibold">Popüler Vaka</p>
                </div>
            </div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h4 class="text-sm font-bold text-gray-800 uppercase tracking-wide mb-6 text-center">Ortalama Performans Metrikleri</h4>
            <div class="max-w-2xl mx-auto">
                ${createChartHTML(averageScores)}
            </div>
        </div>
    `;
}

function renderScenarioBuilder() {
    const container = teacherDashboard.contents.builder;
    container.innerHTML = `
        <div class="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500">add_circle</span> Yeni Vaka Senaryosu
            </h3>
            <div class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Senaryo Başlığı</label>
                    <input type="text" id="builder-title" class="w-full rounded-lg border-gray-300 focus:ring-amber-500 focus:border-amber-500" placeholder="Örn: OKB - Temizlik Takıntısı">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Kısa Açıklama (Öğrenci Görünümü)</label>
                    <textarea id="builder-desc" class="w-full rounded-lg border-gray-300 focus:ring-amber-500 focus:border-amber-500" rows="3" placeholder="Öğrencinin seçim ekranında göreceği özet..."></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Danışan Profili & AI Talimatı (Detaylı)</label>
                    <div class="relative">
                        <textarea id="builder-profile" class="w-full rounded-lg border-gray-300 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm" rows="8" placeholder="Simülasyonun kişiliği, semptomları, konuşma tarzı ve direnç noktaları buraya detaylıca yazılmalı..."></textarea>
                        <span class="absolute right-2 bottom-2 text-xs text-gray-400 bg-white px-1">AI Prompt</span>
                    </div>
                </div>
                <div class="pt-4 border-t border-gray-100">
                    <button id="save-scenario-button" class="w-full h-11 px-6 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all shadow-sm">Senaryoyu Yayınla</button>
                </div>
            </div>
        </div>`;
    
    document.getElementById('save-scenario-button')!.addEventListener('click', async () => {
        if (!isDbConnected) {
            showNotification("Bağlantı yok.", "error");
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
        showNotification("Yeni vaka senaryosu eklendi.", "success");
        (document.getElementById('builder-title') as HTMLInputElement).value = '';
        (document.getElementById('builder-desc') as HTMLTextAreaElement).value = '';
        (document.getElementById('builder-profile') as HTMLTextAreaElement).value = '';
    });
}

async function renderResourceLibrary() {
    const container = teacherDashboard.contents.library;
     if (!isDbConnected) {
        container.innerHTML = '<p class="text-center text-gray-500">Bağlantı gerekli.</p>';
        return;
    }

    let allDbScenarios = await db.getCollection('customScenarios');
    let allScenarios = [...scenarios, ...allDbScenarios];

    let scenarioOptions = allScenarios.map(s => `<option value="${s.id}">${s.title}</option>`).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-[600px]">
                <div class="p-4 border-b border-gray-200 bg-gray-50">
                     <h3 class="text-lg font-bold text-gray-800">Mevcut Kaynaklar</h3>
                </div>
                <div id="resource-list" class="flex-1 overflow-y-auto p-4 space-y-3"></div>
            </div>
            
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-blue-600">post_add</span> Yeni Kaynak Ekle</h3>
                <div class="space-y-4">
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Kaynak Başlığı</label>
                        <input type="text" id="resource-title" class="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" placeholder="Örn: BDT Temel İlkeler PDF">
                     </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">URL / Link</label>
                        <input type="text" id="resource-url" class="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500" placeholder="https://...">
                     </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Materyal Türü</label>
                        <select id="resource-type" class="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                            <option value="article">Makale</option>
                            <option value="video">Video</option>
                            <option value="pdf">PDF Dökümanı</option>
                        </select>
                     </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">İlgili Senaryolar (Çoklu Seçim)</label>
                        <select id="resource-scenarios" class="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 h-32" multiple>
                            ${scenarioOptions}
                        </select>
                        <p class="text-xs text-gray-500 mt-1">Ctrl/Cmd tuşuna basılı tutarak birden fazla seçebilirsiniz.</p>
                     </div>
                     <button id="save-resource-button" class="w-full h-10 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Kaynağı Kütüphaneye Ekle</button>
                </div>
            </div>
        </div>
    `;

    const renderList = async () => {
        const listContainer = document.getElementById('resource-list')!;
        const resources = await db.getCollection('resources');
        listContainer.innerHTML = '';
        if (resources.length === 0) listContainer.innerHTML = '<p class="text-center text-gray-400 py-4">Henüz kaynak eklenmemiş.</p>';
        
        resources.forEach(r => {
            listContainer.innerHTML += `
                <div class="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow group">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="bg-blue-50 text-blue-600 p-2 rounded-lg flex-shrink-0"><span class="material-symbols-outlined">${r.type === 'video' ? 'movie' : r.type === 'pdf' ? 'picture_as_pdf' : 'article'}</span></div>
                        <div class="truncate">
                            <p class="font-semibold text-gray-800 text-sm truncate" title="${r.title}">${r.title}</p>
                            <a href="${r.url}" target="_blank" class="text-xs text-blue-500 hover:underline truncate block">${r.url}</a>
                        </div>
                    </div>
                    <button class="delete-resource-button text-gray-400 hover:text-red-500 p-1 rounded transition-colors" data-id="${r.id}"><span class="material-symbols-outlined">delete</span></button>
                </div>`;
        });
        document.querySelectorAll('.delete-resource-button').forEach(btn => btn.addEventListener('click', async (e) => {
            const id = (e.currentTarget as HTMLElement).dataset.id!;
            if(confirm('Bu kaynağı silmek istediğinize emin misiniz?')) {
                await db.deleteData('resources', id);
                await renderList();
            }
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
        showNotification("Kaynak kütüphaneye eklendi.", "success");
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
            tab.classList.add('bg-teal-50', 'text-teal-700', 'shadow-sm', 'border-teal-100');
            tab.classList.remove('hover:bg-white', 'text-gray-500');
            teacherDashboard.contents[tabName as keyof typeof teacherDashboard.contents].classList.remove('hidden');
        } else {
             tab.classList.remove('bg-teal-50', 'text-teal-700', 'shadow-sm', 'border-teal-100');
             tab.classList.add('hover:bg-white', 'text-gray-500');
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
