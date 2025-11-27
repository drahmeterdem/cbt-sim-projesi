// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";
import * as db from './firebase';

// Declare Mammoth for TypeScript
declare const mammoth: any;

// Declare Speech Recognition API
declare var webkitSpeechRecognition: any;

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
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let isDbConnected: boolean = false;


// --- Global State & Constants ---
let currentStudentName: string = '';
let currentUserId: string = '';
let reviewingStudentId: string = '';
let reviewingSessionId: string = '';
let reviewingUploadId: string = '';
let activeSessionId: string = '';
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests';
let activeMySimsTab: 'active' | 'completed' | 'uploads' = 'active';
let currentAnalysisCache: { transcript: string; analysis: any; clientName?: string; sessionNumber?: string } | null = null;
let recognition: any = null;
let currentSessionToolsData: any = {};
let teacherUnsubscribe: (() => void) | null = null;

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
const registerNameInput = document.getElementById('register-name-input') as HTMLInputElement;
const registerSurnameInput = document.getElementById('register-surname-input') as HTMLInputElement;
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
    customResponseInput: document.getElementById('custom-response-input') as HTMLTextAreaElement,
    sendCustomResponseButton: document.getElementById('send-custom-response-button') as HTMLButtonElement,
    voiceButton: document.getElementById('voice-input-button') as HTMLButtonElement,
    // New controls
    backBtn: document.getElementById('sim-back-btn')!,
    saveBtn: document.getElementById('sim-save-exit-btn')!,
    helpBtn: document.getElementById('sim-cbt-help-btn')!,
    liveBars: {
        empathy: document.getElementById('live-bar-empathy')!,
        technique: document.getElementById('live-bar-technique')!,
        rapport: document.getElementById('live-bar-rapport')!,
        valEmpathy: document.getElementById('live-val-empathy')!,
        valTechnique: document.getElementById('live-val-technique')!,
        valRapport: document.getElementById('live-val-rapport')!,
    },
    liveFeedbackText: document.getElementById('live-feedback-text')!,
    typingIndicator: document.getElementById('typing-indicator')!
};

// Student Dashboard
const dashboardStudentName = document.getElementById('dashboard-student-name')!;
const continueSessionCard = document.getElementById('continue-session-card')!;
const goToAnalysisButton = document.getElementById('go-to-analysis-button')!;
const mySimulations = {
    list: document.getElementById('my-simulations-list')!,
    tabActive: document.getElementById('tab-sims-active')!,
    tabCompleted: document.getElementById('tab-sims-completed')!,
    tabUploads: document.getElementById('tab-uploads')!
};
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
    sendButton: document.getElementById('send-to-teacher-button')!, // Kept in DOM structure but unused
    backButton: document.getElementById('back-to-dashboard-from-analysis')!,
    fileInput: document.getElementById('file-upload') as HTMLInputElement,
    clientNameInput: document.getElementById('analysis-client-name') as HTMLInputElement,
    sessionNumInput: document.getElementById('analysis-session-number') as HTMLInputElement,
    statusMessage: document.getElementById('analysis-status-message')!
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
        // Fallback for others
        analytics: null, builder: null, library: null
    }
};
const requestsListContainer = document.getElementById('requests-list-container')!;


// Teacher Review Screen
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
        questions: document.getElementById('profile-questions')!,
        competency: document.getElementById('profile-competency')!,
        notes: document.getElementById('profile-notes')!
    },
    competencyContainer: document.getElementById('competency-matrix-container')!,
    privateNotesInput: document.getElementById('private-notes-input') as HTMLTextAreaElement,
    saveNotesButton: document.getElementById('save-private-notes-button')!
};

const teacherUploadReview = {
    screen: screens.teacherUploadReview,
    backButton: document.getElementById('back-to-dashboard-from-upload-review')!,
    studentName: document.getElementById('upload-review-student-name')!,
    transcript: document.getElementById('upload-review-transcript')!,
    analysis: document.getElementById('upload-review-analysis')!,
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

const cbtHelperModal = {
    container: document.getElementById('cbt-helper-modal')!,
    title: document.getElementById('cbt-helper-title')!,
    content: document.getElementById('cbt-helper-content')!,
};

const reflectionModal = {
    container: document.getElementById('reflection-modal')!,
    inputGood: document.getElementById('reflection-good') as HTMLTextAreaElement,
    inputBad: document.getElementById('reflection-bad') as HTMLTextAreaElement,
    cancelBtn: document.getElementById('cancel-save-button')!,
    confirmBtn: document.getElementById('confirm-save-button')!,
};

const historyModal = {
    container: document.getElementById('history-modal')!,
    content: document.getElementById('history-modal-content')!,
};

const studentUploadModal = {
    container: document.getElementById('student-upload-modal')!,
    content: document.getElementById('student-upload-content')!,
};

// --- System Prompts ---
const simulationSystemInstruction = `SENİN BİRİNCİL VE EN ÖNEMLİ GÖREVİN: Bir Bilişsel Davranışçı Terapi (BDT) simülasyonunda, adı Elif olan sanal bir danışanı **olağanüstü derecede gerçekçi bir şekilde** canlandırmak. 

**Gerçekçilik İlkeleri:**
*   **Duygusal Derinlik:** Sadece belirtilen sorunu tekrar etme. O sorunun getirdiği umutsuzluğu, kaygıyı, öfkeyi veya hayal kırıklığını hissettir.
*   **Doğal Dil ve Akış:** Kitaptan fırlamış gibi değil, günlük konuşma dilinde konuş. Duraksamalar, "hmm...", "yani..." gibi ifadeler kullan.
*   **Dinamik Tepkisellik:** Terapistin yaklaşımına göre tepkilerin organik olarak değişsin. Empatik müdahalede açıl, yargılayıcı müdahalede kapan.
*   **Diyalog Odaklılık:** Konuşmayı kesintisiz bir sohbet olarak sürdür.

**İKİNCİL GÖREVİN (Arka Plan Analizi):**
Bu gerçekçi diyaloğu ('clientResponse' olarak) oluşturduktan sonra, arka planda bir analiz yapmalı ve terapistin son müdahalesini değerlendiren aşağıdaki JSON yapısını **eksiksiz** doldurmalısın:
1.  **Geri Bildirim (feedback):** Yapıcı, kısa ve net bir geri bildirim.
2.  **Gerekçe (rationale):** BDT temelli kısa bir teorik açıklama.
3.  **Puanlama (scoring):** 'empathy', 'technique', 'rapport' için 1-10 arası puanlama.
4.  **Danışan Etkisi (clientImpact):** 'emotionalRelief', 'cognitiveClarity' için 1-10 arası puanlama.
5.  **Yeni Seçenekler (therapistOptions):** Terapist için birbirinden farklı ve gerçekçi DÖRT adet yanıt seçeneği.`;


const analysisSystemInstruction = `Sen, Bilişsel Davranışçı Terapi (BDT) alanında uzman bir süpervizörsün. Transkripti analiz ederek yapılandırılmış bir geri bildirim sağla. Çıktın sadece JSON olmalı.`;


// --- Core App Logic ---

let chatHistory: any[] = [];
let currentScenario: Scenario | null = null;
let sessionScores: any[] = [];

// Data
const scenarios: Scenario[] = [
    { id: '1', title: 'Sosyal Kaygı', description: 'yakın zamanda yeni bir işe başladı ve toplantılarda konuşma veya yeni insanlarla tanışma konusunda yoğun bir endişe yaşıyor.', profile: 'Elif, 28 yaşında bir yazılım geliştirici. Genellikle sessiz ve kendi halinde. Çatışmadan kaçınır ve başkalarının onu yargılamasından çok korkar.', isCustom: false },
    { id: '2', title: 'Erteleme Alışkanlığı', description: 'önemli bir proje teslim tarihi yaklaşmasına rağmen işe başlamakta zorlanıyor.', profile: 'Elif, 24 yaşında bir yüksek lisans öğrencisi. Başarısız olmaktan veya beklentileri karşılayamamaktan yoğun şekilde korkuyor.', isCustom: false },
    { id: '3', title: 'Panik Atak', description: 'geçen hafta markette aniden yoğun bir panik atak geçirdi.', profile: 'Elif, 35 yaşında, iki çocuk annesi bir ev hanımı. Her şeyin kontrolü altında olmasını seviyor.', isCustom: false },
    { id: '4', title: 'Mükemmeliyetçilik', description: 'yaptığı işlerde asla yeterince iyi olmadığını düşünüyor.', profile: 'Elif, 30 yaşında bir grafik tasarımcı. Yüksek standartlara sahip ve bu standartlara ulaşamadığında büyük bir hayal kırıklığı ve yetersizlik hissediyor.', isCustom: false },
    { id: '5', title: 'İlişki Sorunları', description: 'partneriyle sık sık küçük konularda büyük tartışmalar yaşıyor.', profile: 'Elif, 32 yaşında, bir avukat. İlişkisinde anlaşılmadığını ve partnerinin onun ihtiyaçlarına karşı duyarsız olduğunu düşünüyor.', isCustom: false },
    { id: '6', title: 'Genel Kaygı Bozukluğu', description: 'günlük hayattaki birçok farklı konu hakkında sürekli endişeli.', profile: 'Elif, 40 yaşında bir öğretmen. "Ya olursa?" diye başlayan felaket senaryoları zihninde sürekli dönüyor.', isCustom: false },
];


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupLoginTabs();
    initializeApp();
    (window as any).showCbtTool = showCbtTool;
});

async function initializeApp() {
    isDbConnected = db.initializeFirebase();

    db.onAuthStateChanged(async (user: any) => {
        if (user) {
            const userProfile = await db.getData('users', user.uid);
            if (userProfile && userProfile.role === 'teacher') {
                currentUserId = user.uid;
                activeTeacherTab = 'requests';
                showScreen('teacherDashboard');
            } else if (userProfile && userProfile.role === 'student') {
                if (userProfile.approved) {
                    currentUserId = user.uid;
                    currentStudentName = userProfile.name + ' ' + userProfile.surname;
                    showScreen('studentDashboard');
                } else {
                     showScreen('login');
                     loginError.textContent = "Hesabınız onay bekliyor.";
                     loginError.classList.remove('hidden');
                     await db.signOut();
                }
            } else {
                 if (user.email === 'drahmeterdem@gmail.com') {
                     const adminProfile = { email: user.email, name: 'Ahmet', surname: 'Erdem', approved: true, role: 'teacher', createdAt: new Date().toISOString() };
                     await db.setData('users', user.uid, adminProfile);
                     currentUserId = user.uid;
                     showScreen('teacherDashboard');
                 } else {
                     showScreen('login');
                     loginError.classList.remove('hidden');
                     await db.signOut();
                 }
            }
        } else {
            currentUserId = '';
            currentStudentName = '';
            showScreen('welcome');
        }
    });
}


// --- Screen Management ---
function showScreen(screenId: keyof typeof screens) {
    currentScreen = screenId;
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
    updateHeader();
    
    // Clear teacher listener when leaving dashboard
    if (screenId !== 'teacherDashboard' && teacherUnsubscribe) {
        teacherUnsubscribe();
        teacherUnsubscribe = null;
    }

    try {
        if (screenId === 'studentDashboard') renderStudentDashboard();
        if (screenId === 'teacherDashboard') renderTeacherDashboard();
        if (screenId === 'problemSelection') renderProblemSelection();
    } catch (e) { console.error("Error rendering screen:", e); }
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
    
    // Legacy Back button (handled by toolbar in sim screen now)
    backToSelectionButton.classList.toggle('hidden', currentScreen !== 'sessionAnalysis' && currentScreen !== 'studentDashboard' && currentScreen !== 'problemSelection');
    if (currentScreen === 'problemSelection' || currentScreen === 'sessionAnalysis') {
         backToSelectionButton.classList.remove('hidden');
         backToSelectionButton.onclick = () => showScreen('studentDashboard');
    }
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    goToLoginButton.addEventListener('click', () => showScreen('login'));
    loginButton.addEventListener('click', handleLogin);
    registerButton.addEventListener('click', handleRegister);
    showRegisterView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('register'); });
    showLoginView.addEventListener('click', (e) => { e.preventDefault(); toggleLoginViews('login'); });
    logoutButton.addEventListener('click', logout);
    
    // Simulation Toolbar
    simulation.backBtn.addEventListener('click', () => showScreen('problemSelection'));
    
    // New Save Logic with Reflection
    simulation.saveBtn.addEventListener('click', handleSaveAndExitClick);
    reflectionModal.cancelBtn.addEventListener('click', () => reflectionModal.container.classList.add('hidden'));
    reflectionModal.confirmBtn.addEventListener('click', confirmSaveWithReflection);

    simulation.helpBtn.addEventListener('click', () => showCbtTool('socratic'));

    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.backButton.addEventListener('click', () => showScreen('studentDashboard'));
    // Removed manual send button listener as it's now automatic
    // analysis.sendButton.addEventListener('click', handleSendAnalysisToTeacher); 
    analysis.fileInput.addEventListener('change', handleFileUpload);

    setupVoiceInteraction(); 

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
    
    // Student Dashboard Tabs
    mySimulations.tabActive.addEventListener('click', () => { activeMySimsTab = 'active'; renderMySimulations(); });
    mySimulations.tabCompleted.addEventListener('click', () => { activeMySimsTab = 'completed'; renderMySimulations(); });
    mySimulations.tabUploads.addEventListener('click', () => { activeMySimsTab = 'uploads'; renderStudentUploads(); });

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
            teacherReview.tabs.forEach(t => {
                t.classList.remove('border-teal-600', 'text-teal-700');
                t.classList.add('border-transparent', 'text-gray-500');
            });
            (e.target as HTMLElement).classList.add('border-teal-600', 'text-teal-700');
            (e.target as HTMLElement).classList.remove('border-transparent', 'text-gray-500');
            Object.values(teacherReview.contents).forEach(c => c.classList.add('hidden'));
            teacherReview.contents[targetId as keyof typeof teacherReview.contents].classList.remove('hidden');
        });
    });

    teacherReview.backToDashboardButton.addEventListener('click', () => showScreen('teacherDashboard'));
    teacherReview.saveNotesButton.addEventListener('click', handleSavePrivateNotes);

    teacherUploadReview.backButton.addEventListener('click', () => {
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
        
        // Student Dashboard Buttons
        const deleteSimButton = target.closest<HTMLButtonElement>('.delete-sim-button');
        const resumeSimButton = target.closest<HTMLButtonElement>('.resume-sim-button');
        const viewSimButton = target.closest<HTMLButtonElement>('.view-sim-button');
        const viewUploadButton = target.closest<HTMLButtonElement>('.view-upload-button');

        if (approveButton) await handleApproveRequest(approveButton.dataset.uid!);
        if (viewProfileButton) await showStudentFullProfile(viewProfileButton.dataset.studentid!);
        if (reviewUploadButton) await showUploadReviewDetail(reviewUploadButton.dataset.uploadid!, reviewUploadButton.dataset.studentid!);
        if (replyQuestionButton) await handleReplyToQuestion(replyQuestionButton.dataset.questionid!);
        
        if (deleteSimButton) await deleteSession(deleteSimButton.dataset.sid!);
        if (resumeSimButton) await resumeSession(resumeSimButton.dataset.sid!);
        if (viewSimButton) await viewSessionHistory(viewSimButton.dataset.sid!);
        if (viewUploadButton) await showStudentUploadDetail(viewUploadButton.dataset.uploadid!);
    });
}

// --- Voice Interaction Logic ---
function setupVoiceInteraction() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'tr-TR';

        recognition.onstart = () => {
            simulation.voiceButton.classList.add('voice-listening');
            simulation.customResponseInput.placeholder = "Dinliyorum...";
        };

        recognition.onend = () => {
            simulation.voiceButton.classList.remove('voice-listening');
            simulation.customResponseInput.placeholder = "Danışana ne söylemek istersiniz?";
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            simulation.customResponseInput.value = transcript;
        };

        simulation.voiceButton.addEventListener('click', () => {
            try { recognition.start(); } catch (e) { console.log("Recognition started or error"); }
        });
    } else {
        simulation.voiceButton.style.display = 'none';
    }
}

function speakText(text: string) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        window.speechSynthesis.speak(utterance);
    }
}

// --- Login UI Logic ---
function setupLoginTabs() {
    btnRoleStudent.addEventListener('click', () => toggleLoginMode('student'));
    btnRoleTeacher.addEventListener('click', () => toggleLoginMode('teacher'));
}

function toggleLoginMode(mode: 'student' | 'teacher') {
    if (mode === 'student') {
        roleSlider.style.transform = 'translateX(0%)';
        btnRoleStudent.classList.replace('text-gray-500', 'text-gray-800');
        btnRoleStudent.classList.add('font-bold');
        btnRoleStudent.classList.remove('font-medium');
        btnRoleTeacher.classList.replace('text-gray-800', 'text-gray-500');
        btnRoleTeacher.classList.remove('font-bold');
        btnRoleTeacher.classList.add('font-medium');
        loginBrandPanel.classList.remove('from-amber-800', 'to-amber-900');
        loginBrandPanel.classList.add('from-teal-800', 'to-teal-950');
        loginButton.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        loginButton.classList.add('from-teal-600', 'to-teal-700');
        brandTitle.textContent = "Hoş Geldiniz";
        registerLinkContainer.classList.remove('hidden');
    } else {
        roleSlider.style.transform = 'translateX(100%)';
        btnRoleTeacher.classList.replace('text-gray-500', 'text-gray-800');
        btnRoleTeacher.classList.add('font-bold');
        btnRoleTeacher.classList.remove('font-medium');
        btnRoleStudent.classList.replace('text-gray-800', 'text-gray-500');
        btnRoleStudent.classList.remove('font-bold');
        btnRoleStudent.classList.add('font-medium');
        loginBrandPanel.classList.remove('from-teal-800', 'to-teal-950');
        loginBrandPanel.classList.add('from-amber-800', 'to-amber-900');
        loginButton.classList.remove('from-teal-600', 'to-teal-700');
        loginButton.classList.add('from-amber-600', 'to-amber-700');
        brandTitle.textContent = "Yönetim Paneli";
        registerLinkContainer.classList.add('hidden');
    }
    loginError.classList.add('hidden');
}

function toggleLoginViews(view: 'login' | 'register') {
    loginView.classList.add('hidden');
    registerView.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');
    if (view === 'login') loginView.classList.remove('hidden');
    if (view === 'register') registerView.classList.remove('hidden');
}


async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    loginError.classList.add('hidden');

    if (!isDbConnected) { showNotification("Veritabanı bağlantısı yok.", "error"); return; }

    loginButton.disabled = true;
    loginButton.textContent = 'Giriş...';

    if (email === 'drahmeterdem@gmail.com' && password === '708090') {
        try {
            let userCredential;
            try { userCredential = await db.signInWithEmail(email, password); }
            catch (e: any) { userCredential = await db.signUpWithEmail(email, password); }
            
            const adminProfile = { email: email, name: 'Ahmet', surname: 'Erdem', approved: true, role: 'teacher', createdAt: new Date().toISOString() };
            await db.setData('users', userCredential.user.uid, adminProfile);
            currentUserId = userCredential.user.uid;
            activeTeacherTab = 'requests';
            showScreen('teacherDashboard');
            return;
        } catch (error: any) {
             if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/email-already-in-use') {
                 try {
                     const signIn = await db.signInWithEmail(email, password);
                     currentUserId = signIn.user.uid;
                     showScreen('teacherDashboard');
                 } catch(loginErr) {
                     loginError.textContent = "Şifre hatalı.";
                     loginError.classList.remove('hidden');
                 }
             } else {
                loginError.textContent = "Giriş hatası.";
                loginError.classList.remove('hidden');
             }
        } finally {
            loginButton.disabled = false;
        }
        return;
    }

    try {
        const userCredential = await db.signInWithEmail(email, password);
        const user = userCredential.user;
        const userProfile = await db.getData('users', user.uid);
        if (userProfile && userProfile.role === 'student' && !userProfile.approved) {
             loginError.textContent = "Hesap onaylanmadı.";
             loginError.classList.remove('hidden');
             await db.signOut();
             return;
        }
    } catch (error: any) {
        if (error.code === 'auth/invalid-login-credentials') loginError.textContent = "E-posta veya şifre hatalı.";
        else loginError.textContent = "Hatalı e-posta veya şifre.";
        loginError.classList.remove('hidden');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Giriş Yap';
    }
}

async function handleRegister() {
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value.trim();
    const name = registerNameInput.value.trim();
    const surname = registerSurnameInput.value.trim();
    
    if(!name || !surname) {
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Ad ve Soyad gereklidir.";
        registerError.classList.remove('hidden');
        return;
    }

    if(email === 'drahmeterdem@gmail.com') {
         (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Bu mail adresi ile öğrenci kaydı yapılamaz.";
         registerError.classList.remove('hidden');
         return;
    }

    try {
        const userCredential = await db.signUpWithEmail(email, password);
        const user = userCredential.user;
        const newUserProfile = { email: user.email, name: name, surname: surname, approved: false, role: 'student', createdAt: new Date().toISOString() };
        await db.setData('users', user.uid, newUserProfile);
        const newRequest = { email: user.email, uid: user.uid, timestamp: new Date().toISOString() };
        await db.setData('registrationRequests', user.uid, newRequest);
        (registerSuccess.querySelector('.register-success-text') as HTMLElement).textContent = "Kayıt talebi alındı. Yönetici onayı bekleniyor.";
        registerSuccess.classList.remove('hidden');
        await db.signOut();
        setTimeout(() => toggleLoginViews('login'), 3000);
    } catch (error: any) {
        (registerError.querySelector('.register-error-text') as HTMLElement).textContent = "Kayıt hatası.";
        registerError.classList.remove('hidden');
    }
}

async function logout() {
    await db.signOut();
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
}

function createScenarioCard(scenario: Scenario): HTMLElement {
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-3xl shadow-sm border border-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden';
    card.innerHTML = `
        <div class="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col h-full">
            <div class="flex items-center gap-3 mb-4">
                <div class="bg-teal-100 p-2 rounded-xl text-teal-700"><span class="material-symbols-outlined">psychology</span></div>
                <h3 class="text-lg font-bold text-gray-800 leading-tight">${scenario.title}</h3>
            </div>
            <p class="text-gray-600 text-sm flex-grow mb-6 leading-relaxed">${scenario.description}</p>
            <button class="w-full flex items-center justify-center rounded-xl h-11 bg-white border-2 border-teal-50 text-teal-700 font-bold hover:bg-teal-50 hover:border-teal-200 transition-all shadow-sm">
                <span>Başlat</span> <span class="material-symbols-outlined text-sm ml-2">play_arrow</span>
            </button>
        </div>
    `;
    card.querySelector('button')!.addEventListener('click', () => startSimulation(scenario));
    return card;
}

// --- Simulation Logic ---
function startSimulation(scenario: Scenario) {
    if (!ai) { showNotification("Yapay Zeka sistemi hatası.", "error"); return; }

    currentScenario = scenario;
    chatHistory = [];
    sessionScores = [];
    currentSessionToolsData = {}; // Reset tools data
    activeSessionId = `sess_${Date.now()}`;
    
    simulation.chatContainer.innerHTML = '';
    simulation.optionsContainer.innerHTML = '';
    simulation.customResponseInput.value = '';
    simulation.customResponseInput.disabled = false;
    simulation.sendCustomResponseButton.disabled = false;
    
    // Reset Live Bars
    updateLiveBars({ empathy: 0, technique: 0, rapport: 0 }, "Simülasyon başlatılıyor. Danışan odaya giriyor...");

    simulation.problemDisplay.textContent = scenario.title;
    showScreen('simulation');

    const initialResponseText = `Merhaba, ben Elif. ${currentScenario!.description} Bu konuda konuşmak için buradayım. Nereden başlamak istersiniz?`;
    const initialOptions = [
        "Bugün kendinizi nasıl hissediyorsunuz?",
        "Sizi buraya getiren şey hakkında konuşalım mı?",
        "Bu durum hayatınızı nasıl etkiliyor?"
    ];

    // Initial message from client
    // Simulate typing delay for initial message
    showTypingIndicator();
    setTimeout(() => {
        removeTypingIndicator();
        addMessageToChat(simulation.chatContainer, 'client', initialResponseText);
        chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify({clientResponse: initialResponseText}) }] });
        renderOptions(initialOptions);
    }, 1500);
}

function showTypingIndicator() {
    simulation.typingIndicator.classList.remove('hidden');
    simulation.chatContainer.appendChild(simulation.typingIndicator);
    simulation.chatContainer.scrollTop = simulation.chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    simulation.typingIndicator.classList.add('hidden');
}

// Typewriter effect function
function typeWriterEffect(element: HTMLElement, text: string, speed: number = 20) {
    let i = 0;
    element.innerHTML = ''; // Clear content
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            simulation.chatContainer.scrollTop = simulation.chatContainer.scrollHeight;
            setTimeout(type, speed);
        }
    }
    type();
}

function addMessageToChat(container: HTMLElement, sender: 'therapist' | 'client' | 'teacher', text: string, rationale: string | null = null, onRationaleClick: (() => void) | null = null, animate: boolean = true) {
    const messageElement = document.createElement('div');
    const bubbleWrapper = document.createElement('div');
    const bubble = document.createElement('div');
    const timeSpan = document.createElement('span');
    
    const isTherapist = sender === 'therapist';
    const isClient = sender === 'client';
    const time = new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});

    messageElement.className = `flex flex-col animate-fade-in-up ${isTherapist ? 'items-end' : 'items-start'}`;
    bubbleWrapper.className = `flex items-end gap-2 max-w-[85%] ${isTherapist ? 'flex-row-reverse' : ''}`;

    bubble.className = `chat-bubble ${isTherapist ? 'chat-bubble-therapist' : 'chat-bubble-client'}`;
    
    // For therapist, just show text. For client, we might animate (handled outside or here)
    // If animate is true and it's client, we might leave empty and let typeWriter fill it
    // But simplicity: we fill text here, typewriter is used specifically in getAiResponse
    if (!animate || isTherapist) {
        bubble.textContent = text;
    }

    timeSpan.className = `text-[10px] mt-1 px-1 opacity-70 ${isTherapist ? 'text-right mr-1' : 'text-left ml-1'}`;
    timeSpan.innerHTML = `${time} ${isTherapist ? '<span class="material-symbols-outlined text-[10px] align-middle">done_all</span>' : ''}`;

    if (isClient) {
        const speakBtn = document.createElement('button');
        speakBtn.className = "p-1.5 rounded-full bg-white/50 text-white hover:bg-white/80 hover:text-teal-800 transition-colors opacity-0 group-hover:opacity-100";
        speakBtn.innerHTML = '<span class="material-symbols-outlined text-lg">volume_up</span>';
        speakBtn.onclick = () => speakText(text);
        
        // Wrap bubble content for positioning
        const contentDiv = document.createElement('div');
        contentDiv.className = "relative group";
        contentDiv.appendChild(bubble); // Bubble content set later if animated
        
        // Add speak button inside or near bubble
        // Actually, let's keep it simple
        bubbleWrapper.appendChild(bubble);
    } else {
        bubbleWrapper.appendChild(bubble);
    }

    messageElement.appendChild(bubbleWrapper);
    messageElement.appendChild(timeSpan);
    
    if (rationale && onRationaleClick) {
        const rationaleButton = document.createElement('button');
        rationaleButton.innerHTML = `<span class="material-symbols-outlined text-sm mr-1">lightbulb</span> Analiz`;
        rationaleButton.className = 'text-xs text-amber-600 hover:underline mt-1 ml-1 flex items-center font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100';
        rationaleButton.onclick = () => onRationaleClick();
        messageElement.appendChild(rationaleButton);
    }
    
    // Insert before typing indicator if it exists
    if (simulation.typingIndicator.parentNode === container) {
        container.insertBefore(messageElement, simulation.typingIndicator);
    } else {
        container.appendChild(messageElement);
    }
    
    container.scrollTop = container.scrollHeight;
    return bubble; // Return bubble to allow typewriter effect
}

function renderOptions(options: string[], rationale: string = "") {
    simulation.optionsContainer.innerHTML = '';
    options.forEach(optionText => {
        const button = document.createElement('button');
        button.className = 'option-button animate-fade-in-up';
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
    // 1. Live Stats Update
    updateLiveBars(aiData.scoring, aiData.feedback);
    sessionScores.push({ scoring: aiData.scoring, clientImpact: aiData.clientImpact });
    
    // 2. Client Response with Typing Effect
    showTypingIndicator();
    
    // Random delay between 1s and 2.5s for realism
    const delay = Math.floor(Math.random() * 1500) + 1000;
    
    setTimeout(() => {
        removeTypingIndicator();
        const bubble = addMessageToChat(simulation.chatContainer, 'client', '', aiData.rationale, () => showRationaleModal(aiData.rationale), true);
        
        // Run typewriter on the bubble
        typeWriterEffect(bubble, aiData.clientResponse, 20); // 20ms per char

        // 3. Render Options AFTER typing finishes (approx)
        const typingDuration = aiData.clientResponse.length * 20;
        setTimeout(() => {
            renderOptions(aiData.therapistOptions);
            simulation.customResponseInput.disabled = false;
            simulation.sendCustomResponseButton.disabled = false;
        }, typingDuration + 500);

    }, delay);
}

function updateLiveBars(scoring: any, feedback: string) {
    simulation.liveBars.valEmpathy.textContent = `${scoring.empathy}/10`;
    simulation.liveBars.valTechnique.textContent = `${scoring.technique}/10`;
    simulation.liveBars.valRapport.textContent = `${scoring.rapport}/10`;
    
    simulation.liveBars.empathy.style.width = `${scoring.empathy * 10}%`;
    simulation.liveBars.technique.style.width = `${scoring.technique * 10}%`;
    simulation.liveBars.rapport.style.width = `${scoring.rapport * 10}%`;

    // Typewriter effect for sidebar feedback
    const feedbackEl = simulation.liveFeedbackText;
    feedbackEl.textContent = feedback;
    feedbackEl.classList.remove('animate-pulse');
    void feedbackEl.offsetWidth; // Trigger reflow
    feedbackEl.classList.add('animate-pulse'); // Simple pulse for update attention
}

function showLoaderWithOptions(show: boolean, text: string = "Yükleniyor...") {
    if (show) {
        simulation.optionsContainer.innerHTML = `<div class="col-span-1 md:col-span-2 flex items-center justify-center p-4 text-gray-400 gap-3"><div class="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500"></div><p class="text-xs font-bold uppercase tracking-wider">${text}</p></div>`;
    } else {
        simulation.optionsContainer.innerHTML = '';
    }
}

function showRationaleModal(rationale: string) {
    rationaleModal.content.textContent = rationale;
    rationaleModal.container.classList.remove('hidden');
}

// CBT Tools Modal Logic
function showCbtTool(toolType: string) {
    cbtHelperModal.container.classList.remove('hidden');
    const content = cbtHelperModal.content;
    
    if (toolType === 'socratic') {
        cbtHelperModal.title.innerHTML = `<span class="material-symbols-outlined">psychology</span> Sokratik Sorgulama`;
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                    <h4 class="font-bold text-indigo-900 text-sm mb-1">Kanıt Sorgulama</h4>
                    <p class="text-sm">"Bu düşüncenizi destekleyen kanıtlar nelerdir? Peki ya karşıt kanıtlar?"</p>
                </div>
                <div class="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                    <h4 class="font-bold text-indigo-900 text-sm mb-1">Alternatif Açıklama</h4>
                    <p class="text-sm">"Bu duruma bakmanın başka bir yolu olabilir mi?"</p>
                </div>
                <div class="bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                    <h4 class="font-bold text-indigo-900 text-sm mb-1">En Kötü Senaryo</h4>
                    <p class="text-sm">"Diyelim ki korktuğunuz oldu, bununla nasıl başa çıkardınız?"</p>
                </div>
            </div>`;
    } else if (toolType === 'distortions') {
        cbtHelperModal.title.innerHTML = `<span class="material-symbols-outlined">warning</span> Bilişsel Çarpıtmalar`;
        content.innerHTML = `
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-3 border border-gray-200 rounded-lg"><strong class="text-red-600 block text-xs uppercase mb-1">Hep ya da Hiç</strong><p class="text-xs">Olayları siyah-beyaz görmek.</p></div>
                <div class="p-3 border border-gray-200 rounded-lg"><strong class="text-red-600 block text-xs uppercase mb-1">Aşırı Genelleme</strong><p class="text-xs">Tek bir olaydan genel kural çıkarmak.</p></div>
                <div class="p-3 border border-gray-200 rounded-lg"><strong class="text-red-600 block text-xs uppercase mb-1">Zihinsel Filtreleme</strong><p class="text-xs">Sadece olumsuza odaklanmak.</p></div>
                <div class="p-3 border border-gray-200 rounded-lg"><strong class="text-red-600 block text-xs uppercase mb-1">Zihin Okuma</strong><p class="text-xs">Başkalarının ne düşündüğünü bildiğini varsaymak.</p></div>
                <div class="p-3 border border-gray-200 rounded-lg"><strong class="text-red-600 block text-xs uppercase mb-1">Felaketleştirme</strong><p class="text-xs">Geleceği felaket gibi görmek.</p></div>
            </div>`;
    } else if (toolType === 'abc') {
         cbtHelperModal.title.innerHTML = `<span class="material-symbols-outlined">edit_note</span> ABC Kaydı (İnteraktif)`;
         content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase">A (Olay)</label>
                    <input id="abc-a" class="w-full rounded-lg border-gray-300 text-sm" placeholder="Ne oldu?" value="${currentSessionToolsData.abcA || ''}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase">B (Düşünce)</label>
                    <input id="abc-b" class="w-full rounded-lg border-gray-300 text-sm" placeholder="Aklından ne geçti?" value="${currentSessionToolsData.abcB || ''}">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase">C (Duygu/Davranış)</label>
                    <input id="abc-c" class="w-full rounded-lg border-gray-300 text-sm" placeholder="Ne hissettin?" value="${currentSessionToolsData.abcC || ''}">
                </div>
                <div class="bg-indigo-50 p-3 rounded text-xs text-indigo-800 italic flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">save</span> Veriler otomatik olarak seans dosyasına eklenecektir.
                </div>
            </div>`;
            
            // Add listeners to save state
            const inputs = content.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', (e) => {
                    const target = e.target as HTMLInputElement;
                    if(target.id === 'abc-a') currentSessionToolsData.abcA = target.value;
                    if(target.id === 'abc-b') currentSessionToolsData.abcB = target.value;
                    if(target.id === 'abc-c') currentSessionToolsData.abcC = target.value;
                });
            });
    }
}


// --- Student Dashboard Rendering ---
async function renderStudentDashboard() {
    dashboardStudentName.textContent = currentStudentName;
    try { await renderContinueSessionCard(); } catch(e) {}
    try { await renderMySimulations(); } catch(e) {}
    try { await renderCumulativeProgress(); } catch(e) {}
    try { renderAchievements(); } catch(e) {}
    try { await renderRecommendations(); } catch(e) {}
    try { await renderQACard(); } catch(e) {}
}

async function renderContinueSessionCard() {
    let inProgressSession = null;
    try {
        if(isDbConnected) {
            const allSessions = await getAllSessionsForStudent(currentUserId);
            allSessions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            inProgressSession = allSessions.find(s => s.status === 'in-progress');
        }
    } catch (err) {}

    if (inProgressSession) {
        continueSessionCard.innerHTML = `
            <div class="flex items-center gap-4 mb-4">
                 <div class="bg-indigo-100 p-3 rounded-2xl text-indigo-600"><span class="material-symbols-outlined text-3xl">resume</span></div>
                 <div><h3 class="text-lg font-bold text-gray-800">Devam Et: ${inProgressSession.scenario.title}</h3><p class="text-sm text-gray-500">Kaldığınız yerden simülasyona dönün.</p></div>
            </div>
            <button id="resume-session-button" data-sid="${inProgressSession.id}" class="resume-sim-button w-full rounded-xl h-11 bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"><span>Simülasyona Dön</span> <span class="material-symbols-outlined text-sm">arrow_forward</span></button>
        `;
    } else {
        continueSessionCard.innerHTML = `
             <div class="flex items-center gap-4 mb-4">
                 <div class="bg-teal-100 p-3 rounded-2xl text-teal-600"><span class="material-symbols-outlined text-3xl">play_arrow</span></div>
                 <div><h3 class="text-lg font-bold text-gray-800">Yeni Simülasyon</h3><p class="text-sm text-gray-500">Vaka senaryoları ile pratik yapın.</p></div>
            </div>
            <button id="start-new-session-button" class="w-full rounded-xl h-11 bg-teal-600 text-white font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"><span>Senaryo Seç</span> <span class="material-symbols-outlined text-sm">list</span></button>
        `;
        document.getElementById('start-new-session-button')!.addEventListener('click', () => showScreen('problemSelection'));
    }
}

// NEW: My Simulations List Renderer
async function renderMySimulations() {
    if (!isDbConnected) return;
    const container = mySimulations.list;
    container.innerHTML = '';
    
    // Update Tab Styles
    [mySimulations.tabActive, mySimulations.tabCompleted, mySimulations.tabUploads].forEach(tab => {
        tab.classList.remove('bg-white', 'shadow-sm', 'text-gray-800');
        tab.classList.add('text-gray-500');
    });

    if (activeMySimsTab === 'active') mySimulations.tabActive.classList.add('bg-white', 'shadow-sm', 'text-gray-800');
    else if (activeMySimsTab === 'completed') mySimulations.tabCompleted.classList.add('bg-white', 'shadow-sm', 'text-gray-800');
    else mySimulations.tabUploads.classList.add('bg-white', 'shadow-sm', 'text-gray-800');

    if (activeMySimsTab === 'uploads') {
        renderStudentUploads();
        return;
    }

    const allSessions = await getAllSessionsForStudent(currentUserId);
    const filteredSessions = allSessions
        .filter(s => activeMySimsTab === 'active' ? s.status === 'in-progress' : s.status === 'completed')
        .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filteredSessions.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400 italic text-sm">Kayıt bulunamadı.</div>`;
        return;
    }

    filteredSessions.forEach(session => {
        const date = new Date(session.timestamp).toLocaleDateString('tr-TR');
        let actionBtn = '';
        
        if (activeMySimsTab === 'active') {
             actionBtn = `<button data-sid="${session.id}" class="resume-sim-button px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">Devam Et</button>`;
        } else {
             actionBtn = `<button data-sid="${session.id}" class="view-sim-button px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 flex items-center gap-1 transition-colors"><span class="material-symbols-outlined text-sm">visibility</span> İncele</button>`;
        }

        container.innerHTML += `
            <div class="p-5 border-b border-gray-100 flex items-center justify-between last:border-0 hover:bg-gray-50 transition-colors group">
                <div class="flex items-center gap-4">
                    <div class="bg-white border border-gray-200 p-2.5 rounded-xl text-gray-400 group-hover:border-teal-200 group-hover:text-teal-500 transition-colors"><span class="material-symbols-outlined">${activeMySimsTab === 'active' ? 'pending' : 'check_circle'}</span></div>
                    <div>
                        <h4 class="text-sm font-bold text-gray-800 group-hover:text-teal-700 transition-colors">${session.scenario.title}</h4>
                        <p class="text-xs text-gray-500">${date}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    ${actionBtn}
                    <button data-sid="${session.id}" class="delete-sim-button p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Sil"><span class="material-symbols-outlined text-lg">delete</span></button>
                </div>
            </div>`;
    });
}

async function renderStudentUploads() {
    const container = mySimulations.list;
    container.innerHTML = '';
    const uploads = await db.getSubcollection('users', currentUserId, 'uploads');
    
    if (uploads.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-gray-400 italic text-sm">Yüklenmiş analiz bulunamadı.</div>`;
        return;
    }

    uploads.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).forEach(upload => {
        const hasFeedback = !!upload.feedback;
        container.innerHTML += `
            <div class="p-5 border-b border-gray-100 flex items-center justify-between last:border-0 hover:bg-gray-50 transition-colors group">
                <div class="flex items-center gap-4">
                    <div class="bg-white border border-gray-200 p-2.5 rounded-xl text-gray-400 group-hover:border-purple-200 group-hover:text-purple-500 transition-colors"><span class="material-symbols-outlined">description</span></div>
                    <div>
                        <h4 class="text-sm font-bold text-gray-800 group-hover:text-purple-700 transition-colors">${upload.clientName || 'İsimsiz'}</h4>
                        <p class="text-xs text-gray-500">Oturum ${upload.sessionNumber} • ${new Date(upload.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>
                <button data-uploadid="${upload.id}" class="view-upload-button flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">
                    ${hasFeedback ? '<span class="w-2 h-2 rounded-full bg-green-500"></span>' : ''} İncele
                </button>
            </div>`;
    });
}

async function showStudentUploadDetail(uploadId: string) {
    const upload = await db.getData(`users/${currentUserId}/uploads`, uploadId);
    if(!upload) return;
    
    studentUploadModal.container.classList.remove('hidden');
    const content = studentUploadModal.content;
    content.innerHTML = '';
    
    // Feedback Section
    if(upload.feedback) {
        content.innerHTML += `
            <div class="bg-amber-50 p-6 rounded-2xl border border-amber-100 mb-8">
                <h4 class="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2"><span class="material-symbols-outlined">rate_review</span> Süpervizör Geri Bildirimi</h4>
                <p class="text-amber-800 text-sm leading-relaxed">${upload.feedback}</p>
            </div>`;
    }

    // AI Analysis and Transcript in Grid
    content.innerHTML += `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                 <h4 class="font-bold text-gray-400 text-xs uppercase tracking-widest mb-3">AI Analizi</h4>
                 <div id="student-upload-analysis-view" class="prose prose-sm max-w-none bg-teal-50/30 p-4 rounded-2xl border border-teal-100"></div>
            </div>
            <div>
                 <h4 class="font-bold text-gray-400 text-xs uppercase tracking-widest mb-3">Orijinal Metin</h4>
                 <div class="p-4 bg-gray-50 rounded-2xl border border-gray-200 font-mono text-xs text-gray-600 leading-relaxed max-h-[400px] overflow-y-auto">${upload.transcript}</div>
            </div>
        </div>
    `;
    
    renderAnalysisOutput(upload.analysis, document.getElementById('student-upload-analysis-view')!);
}


async function deleteSession(sessionId: string) {
    if(!confirm("Bu simülasyon kaydını silmek istediğinize emin misiniz?")) return;
    try {
        await db.deleteData(`users/${currentUserId}/sessions`, sessionId);
        showNotification("Kayıt silindi.", "success");
        renderMySimulations();
        renderContinueSessionCard();
    } catch(e) {
        showNotification("Silme hatası.", "error");
    }
}

async function viewSessionHistory(sessionId: string) {
    const sessions = await getAllSessionsForStudent(currentUserId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    historyModal.container.classList.remove('hidden');
    const content = historyModal.content;
    content.innerHTML = '';

    session.history.forEach((turn: any) => {
        let role = turn.role === 'user' ? 'Terapist' : 'Danışan';
        let text = turn.parts[0].text;
        let isModel = turn.role === 'model';
        
        if (isModel) {
            try {
                const json = JSON.parse(text);
                text = json.clientResponse;
                // Add feedback if exists
                if (json.feedback) text += `<div class="mt-3 p-3 bg-indigo-50/50 rounded-lg text-xs text-indigo-800 border border-indigo-100"><strong>Geri Bildirim:</strong> ${json.feedback}</div>`;
            } catch(e) {}
        }

        content.innerHTML += `
            <div class="flex flex-col ${isModel ? 'items-start' : 'items-end'} mb-6">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-2">${role}</span>
                <div class="${isModel ? 'bg-white border border-gray-200 text-gray-700' : 'bg-teal-50 border border-teal-100 text-teal-900'} p-4 rounded-2xl max-w-[85%] text-sm shadow-sm">
                    ${text}
                </div>
            </div>`;
    });
    
    if (session.reflection) {
        content.innerHTML += `
            <div class="mt-10 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                <h4 class="font-bold text-amber-900 text-sm mb-4 flex items-center gap-2 border-b border-amber-200 pb-2"><span class="material-symbols-outlined text-base">psychology_alt</span> Öz-Yansıtma Notları</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div><span class="block text-xs font-bold text-amber-600 uppercase mb-1">İyi Gidenler</span><p class="text-gray-700 bg-white/50 p-3 rounded-lg border border-amber-100">${session.reflection.good}</p></div>
                    <div><span class="block text-xs font-bold text-amber-600 uppercase mb-1">Zorlanılanlar</span><p class="text-gray-700 bg-white/50 p-3 rounded-lg border border-amber-100">${session.reflection.bad}</p></div>
                </div>
            </div>`;
    }
}

async function renderCumulativeProgress() {
    if (!isDbConnected) return;
    const allSessions = await getAllSessionsForStudent(currentUserId);
    if (allSessions.length > 0) {
        const completedSessions = allSessions.filter(s => s.status === 'completed');
        const allScores = completedSessions.flatMap(s => s.scores);
        if (allScores.length > 0) {
            cumulativeProgress.container.innerHTML = createChartHTML(calculateAverageScores(allScores));
        }
    }
}

function createChartHTML(scores: any): string {
    return `
        <div class="space-y-4">
            ${createBar('Empati', scores.empathy, 'fuchsia')}
            ${createBar('Teknik', scores.technique, 'amber')}
            ${createBar('İttifak', scores.rapport, 'teal')}
        </div>`;
}

function createBar(label: string, value: number, color: string): string {
    return `<div class="w-full group"><div class="flex justify-between items-center mb-1.5"><span class="text-xs font-bold text-gray-500 group-hover:text-${color}-600 transition-colors">${label}</span><span class="text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">${value.toFixed(1)}/10</span></div><div class="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-full rounded-full bg-${color}-500 chart-bar transition-all duration-1000" style="width: ${value * 10}%;"></div></div></div>`;
}

function renderAchievements() {
    achievements.container.innerHTML = `
        <div class="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"><span class="material-symbols-outlined text-4xl text-yellow-400 drop-shadow-sm mb-1">workspace_premium</span><span class="text-[10px] uppercase tracking-wide text-gray-500 font-bold">İlk Adım</span></div>
        <div class="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"><span class="material-symbols-outlined text-4xl text-gray-300 drop-shadow-sm mb-1">military_tech</span><span class="text-[10px] uppercase tracking-wide text-gray-400 font-bold">İstikrarlı</span></div>
        <div class="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all cursor-pointer"><span class="material-symbols-outlined text-4xl text-gray-300 drop-shadow-sm mb-1">psychology</span><span class="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Empatik</span></div>
    `;
}

async function renderRecommendations() {
    if (!isDbConnected) return;
    recommendations.container.innerHTML = '';
    const allSessions = await getAllSessionsForStudent(currentUserId);
    const uniqueScenarioIds = [...new Set(allSessions.map(s => s.scenario.id))];
    if (uniqueScenarioIds.length === 0) { recommendations.container.innerHTML = '<p class="text-gray-400 text-xs italic p-2">Öneriler simülasyon sonrası açılır.</p>'; return; }
    
    try {
        const allResources = await db.getCollection('resources');
        const relevantResources = allResources.filter(r => r.associatedScenarioIds.some((id: string) => uniqueScenarioIds.includes(id)));
        relevantResources.slice(0, 3).forEach(resource => {
            recommendations.container.innerHTML += `<a href="${resource.url}" target="_blank" class="block bg-white p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all group"><div class="flex items-start gap-3"><div class="bg-gray-50 p-2 rounded-lg text-gray-400 group-hover:text-teal-600 transition-colors"><span class="material-symbols-outlined text-xl">${resource.type === 'video' ? 'movie' : 'article'}</span></div><div><h4 class="font-bold text-gray-800 text-sm group-hover:text-teal-700 transition-colors">${resource.title}</h4></div></div></a>`;
        });
    } catch (e) {}
}

async function renderQACard() {
    if (!isDbConnected) return;
    const qaHistory = await getQAsForStudent(currentUserId);
    teacherQASystem.history.innerHTML = '';
    
    if(qaHistory.length === 0) {
        teacherQASystem.history.innerHTML = `<div class="text-center mt-10"><span class="material-symbols-outlined text-4xl text-gray-200">forum</span><p class="text-gray-400 text-xs mt-2">Hocaya henüz soru sormadınız.</p></div>`;
        return;
    }

    qaHistory.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).forEach(qa => {
        // Student Question
        teacherQASystem.history.innerHTML += `
        <div class="flex flex-col items-end mb-4 animate-fade-in-up">
            <div class="bg-slate-700 text-white rounded-2xl rounded-br-sm py-3 px-4 max-w-[90%] text-sm shadow-sm">${qa.question}</div>
            <span class="text-[10px] text-gray-400 mt-1 mr-1">${new Date(qa.timestamp).toLocaleDateString()}</span>
        </div>`;
        
        // Teacher Answer
        if (qa.answer) {
             teacherQASystem.history.innerHTML += `
             <div class="flex flex-col items-start mb-6 animate-fade-in-up">
                <div class="flex items-center gap-2 mb-1 ml-1"><span class="text-[10px] font-bold text-teal-600 uppercase bg-teal-50 px-1.5 rounded">Dr. Ahmet Erdem</span></div>
                <div class="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-sm py-3 px-4 max-w-[90%] text-sm shadow-sm relative">
                    ${qa.answer}
                    <div class="absolute -left-1 top-4 w-2 h-2 bg-white border-l border-b border-gray-200 transform rotate-45"></div>
                </div>
            </div>`;
        }
    });
    teacherQASystem.history.scrollTop = teacherQASystem.history.scrollHeight;
}


// --- Session Progress Management ---
function handleSaveAndExitClick() {
    if (!currentScenario || chatHistory.length === 0) { showScreen('studentDashboard'); return; }
    // Show Reflection Modal
    reflectionModal.inputGood.value = '';
    reflectionModal.inputBad.value = '';
    reflectionModal.container.classList.remove('hidden');
}

async function confirmSaveWithReflection() {
    reflectionModal.container.classList.add('hidden');
    const reflectionData = {
        good: reflectionModal.inputGood.value.trim(),
        bad: reflectionModal.inputBad.value.trim()
    };
    await saveSessionProgress('completed', reflectionData);
}

async function saveSessionProgress(status: 'completed' | 'in-progress' = 'completed', reflection: any = null) {
    if (!currentScenario) return;

    // Show loading state on save button
    simulation.saveBtn.innerHTML = `<span class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span> Kaydediliyor...`;
    
    try {
        const sessionId = activeSessionId || `sess_${Date.now()}`; 
        const sessionData = {
            id: sessionId,
            userId: currentUserId,
            scenario: currentScenario,
            history: chatHistory,
            scores: sessionScores,
            timestamp: new Date().toISOString(),
            status: status,
            reflection: reflection,
            toolsData: currentSessionToolsData // Save ABC Tool data
        };

        try {
            await db.setDataInSubcollection('users', currentUserId, 'sessions', sessionId, sessionData);
        } catch(e) {
             localStorage.setItem('backup_session_' + sessionId, JSON.stringify(sessionData));
             showNotification("Veritabanı erişim hatası, tarayıcıya yedeklendi.", "info");
        }
        
        // Celebration Effect
        if(status === 'completed') {
            const confetti = document.createElement('div');
            confetti.className = 'fixed inset-0 z-50 pointer-events-none flex items-center justify-center';
            confetti.innerHTML = `<div class="bg-white p-6 rounded-3xl shadow-2xl animate-pop text-center border border-gray-100"><span class="text-4xl">🎉</span><h3 class="font-bold text-gray-800 mt-2">Harika İş!</h3><p class="text-sm text-gray-500">Seans başarıyla tamamlandı.</p></div>`;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2500);
        }

        showNotification(status === 'completed' ? "Seans ve notlar kaydedildi!" : "İlerleme kaydedildi.", "success");
        setTimeout(() => {
            showScreen('studentDashboard');
            chatHistory = [];
            sessionScores = [];
            currentScenario = null;
            currentSessionToolsData = {};
        }, 1000);

    } catch (error) {
        showNotification("Kayıt hatası.", "error");
    } finally {
        simulation.saveBtn.innerHTML = `<span class="material-symbols-outlined text-base">save</span> Kaydet & Bitir`;
    }
}

async function resumeSession(sessionId: string) {
    const sessions = await getAllSessionsForStudent(currentUserId);
    const sessionToResume = sessions.find(s => s.id === sessionId);

    if (sessionToResume) {
        currentScenario = sessionToResume.scenario;
        chatHistory = sessionToResume.history;
        sessionScores = sessionToResume.scores || [];
        activeSessionId = sessionToResume.id;
        currentSessionToolsData = sessionToResume.toolsData || {};

        updateLiveBars({empathy: 0, technique: 0, rapport: 0}, "Kaldığınız yerden devam ediliyor...");

        showScreen('simulation');
        simulation.problemDisplay.textContent = currentScenario!.title;
        simulation.chatContainer.innerHTML = '';
        simulation.optionsContainer.innerHTML = '';

        chatHistory.forEach(turn => {
            if (turn.role === 'user') addMessageToChat(simulation.chatContainer,'therapist', turn.parts[0].text, null, null, false);
            else if (turn.role === 'model') {
                 try {
                    const modelResponse = JSON.parse(turn.parts[0].text);
                    addMessageToChat(simulation.chatContainer, 'client', modelResponse.clientResponse, null, null, false);
                } catch(e) { addMessageToChat(simulation.chatContainer, 'client', turn.parts[0].text, null, null, false); }
            }
        });

        // Smart Resume
        if (chatHistory.length > 0) {
            const lastTurn = chatHistory[chatHistory.length - 1];
            if (lastTurn.role === 'model') {
                try {
                    const lastModelResponse = JSON.parse(lastTurn.parts[0].text);
                    // Just update options, don't re-type chat
                    updateLiveBars(lastModelResponse.scoring, lastModelResponse.feedback);
                    renderOptions(lastModelResponse.therapistOptions);
                    simulation.customResponseInput.disabled = false;
                    simulation.sendCustomResponseButton.disabled = false;
                } catch (e) {
                     renderOptions(["Daha fazla anlatır mısın?", "Bu durum sana ne hissettiriyor?", "Bununla ilgili aklından neler geçiyor?"]);
                     simulation.customResponseInput.disabled = false;
                     simulation.sendCustomResponseButton.disabled = false;
                }
            }
        }
    }
}

async function getAllSessionsForStudent(userId: string): Promise<any[]> {
    if (!isDbConnected) return [];
    try { return await db.getSubcollection('users', userId, 'sessions'); } 
    catch (e) { return []; }
}

// --- Analysis Logic ---
async function handleFileUpload() {
    const file = analysis.fileInput.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            mammoth.extractRawText({arrayBuffer: event.target?.result})
                .then(function(result: any){ analysis.transcriptInput.value = result.value; })
                .catch(function(err: any){ showNotification("Dosya okunamadı.", "error"); });
        };
        reader.readAsArrayBuffer(file);
    }
}

async function handleAnalyzeTranscript() {
    if (!ai) return;
    const transcript = analysis.transcriptInput.value;
    if (!transcript.trim()) return;

    (analysis.analyzeButton as HTMLButtonElement).disabled = true;
    analysis.analyzeButton.innerHTML = `<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>`;
    
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
                       keyMomentsAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { moment: { type: Type.STRING }, analysis: { type: Type.STRING } }, required: ['moment', 'analysis'] }}
                    },
                    required: ['overallSummary', 'strengths', 'areasForImprovement', 'keyMomentsAnalysis']
                }
            }
        });
        const jsonResponse = JSON.parse(extractJsonFromString(response.text.trim())!);
        renderAnalysisOutput(jsonResponse);
        
        // AUTO SAVE AND TRANSMIT TO SUPERVISOR
        if (isDbConnected) {
             const uploadId = `upload_${Date.now()}`;
             const uploadData = {
                id: uploadId,
                studentId: currentUserId,
                studentEmail: currentStudentName,
                clientName: analysis.clientNameInput.value,
                sessionNumber: analysis.sessionNumInput.value,
                transcript: transcript,
                analysis: jsonResponse,
                timestamp: new Date().toISOString(),
                feedback: null
            };
            await db.setDataInSubcollection('users', currentUserId, 'uploads', uploadId, uploadData);
            
            // Show success message
            analysis.statusMessage.classList.remove('hidden');
            showNotification("Analiz tamamlandı ve süpervizöre iletildi.", "success");
        }

    } catch (error) {
        showNotification("Analiz başarısız.", "error");
    } finally {
        (analysis.analyzeButton as HTMLButtonElement).disabled = false;
        analysis.analyzeButton.innerHTML = `<span class="material-symbols-outlined mr-2">auto_awesome</span> Analizi Başlat`;
    }
}

function renderAnalysisOutput(data: any, container: HTMLElement = analysis.output) {
    let html = `<div class="space-y-6">`;
    html += `<div class="bg-blue-50 p-4 rounded-xl border border-blue-100"><h3 class="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">Genel Özet</h3><p class="text-blue-800 leading-relaxed">${data.overallSummary}</p></div>`;
    
    html += `<div><h3 class="flex items-center gap-2 text-sm font-bold text-teal-700 mb-3 uppercase tracking-wide"><span class="material-symbols-outlined">thumb_up</span> Güçlü Yönler</h3>
            <ul class="space-y-2">${data.strengths.map((s: string) => `<li class="flex items-start gap-2 bg-teal-50 p-3 rounded-lg border border-teal-100"><span class="material-symbols-outlined text-teal-500 text-sm mt-0.5">check_circle</span><span class="text-teal-900">${s}</span></li>`).join('')}</ul></div>`;
            
    html += `<div><h3 class="flex items-center gap-2 text-sm font-bold text-amber-700 mb-3 uppercase tracking-wide"><span class="material-symbols-outlined">warning</span> Gelişim Alanları</h3>
            <ul class="space-y-2">${data.areasForImprovement.map((s: string) => `<li class="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100"><span class="material-symbols-outlined text-amber-500 text-sm mt-0.5">arrow_upward</span><span class="text-amber-900">${s}</span></li>`).join('')}</ul></div>`;
    html += `</div>`;
    container.innerHTML = html;
}

// Removed legacy manual send function
// async function handleSendAnalysisToTeacher() { ... }

// --- Student-Teacher Communication ---
async function handleStudentQuestion() {
    const question = teacherQASystem.input.value.trim();
    if (!question || !isDbConnected) return;
    const qaId = `qa_${Date.now()}`;
    const qaData = { id: qaId, studentId: currentUserId, studentEmail: currentStudentName, question: question, answer: null, timestamp: new Date().toISOString() };
    await db.setDataInSubcollection('users', currentUserId, 'qas', qaId, qaData);
    teacherQASystem.input.value = '';
    await renderQACard();
}

async function getQAsForStudent(studentId: string) {
    try { return await db.getSubcollection('users', studentId, 'qas'); } catch(e) { return []; }
}

// --- Utility Functions ---
function extractJsonFromString(text: string): string | null {
    let firstBracket = text.indexOf('{');
    let lastBracket = text.lastIndexOf('}');
    if (firstBracket > -1 && lastBracket > -1) return text.substring(firstBracket, lastBracket + 1);
    return null;
}

function calculateAverageScores(scores: any[]) {
    const totals = { empathy: 0, technique: 0, rapport: 0, count: scores.length };
    if (totals.count === 0) return totals;
    scores.forEach(s => {
        totals.empathy += s.scoring.empathy;
        totals.technique += s.scoring.technique;
        totals.rapport += s.scoring.rapport;
    });
    return {
        empathy: totals.empathy / totals.count,
        technique: totals.technique / totals.count,
        rapport: totals.rapport / totals.count
    };
}

function showNotification(message: string, type: 'success' | 'error' | 'info') {
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-teal-600' };
    const notification = document.createElement('div');
    notification.className = `flex items-center gap-3 ${colors[type]} text-white py-3 px-6 rounded-2xl shadow-xl animate-fade-in-up border border-white/20 backdrop-blur-md`;
    notification.innerHTML = `<span class="material-symbols-outlined text-xl">info</span><p class="text-sm font-bold">${message}</p>`;
    notificationContainer.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

// --- AI Models ---
async function generateContentWithRetry(params: any, retries = 3) {
    if (!ai) throw new Error("API Key Missing");
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent(params);
            if (response.text) return response;
        } catch (error) { if (i === retries - 1) throw error; await new Promise(r => setTimeout(r, 1000)); }
    }
}

async function getAiResponse(history: any[], currentScenario: Scenario) {
    // Note: Loader handled in updateSimulationUI logic now via typing indicator, but kept for options
    showLoaderWithOptions(true, "Elif düşünüyor..."); 
    
    // Ensure user turn first
    const apiContents = [...history];
    if (apiContents.length > 0 && apiContents[0].role === 'model') {
        apiContents.unshift({ role: 'user', parts: [{ text: "Oturum başlıyor." }] });
    }

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: apiContents,
            config: {
                systemInstruction: `${simulationSystemInstruction}\n\nProfil:\n${currentScenario.profile}`,
                responseMimeType: "application/json",
                responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                        clientResponse: { type: Type.STRING },
                        feedback: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        scoring: { type: Type.OBJECT, properties: { empathy: { type: Type.NUMBER }, technique: { type: Type.NUMBER }, rapport: { type: Type.NUMBER } }, required: ['empathy', 'technique', 'rapport'] },
                        clientImpact: { type: Type.OBJECT, properties: { emotionalRelief: { type: Type.NUMBER }, cognitiveClarity: { type: Type.NUMBER } }, required: ['emotionalRelief', 'cognitiveClarity'] },
                        therapistOptions: { type: Type.ARRAY, items: { type: Type.STRING } }
                     },
                     required: ['clientResponse', 'feedback', 'rationale', 'scoring', 'clientImpact', 'therapistOptions']
                }
            }
        });
        
        const jsonResponse = JSON.parse(extractJsonFromString(response.text.trim())!);
        chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(jsonResponse) }] });
        updateSimulationUI(jsonResponse);
    } catch (error) {
        showLoaderWithOptions(false);
        showNotification("AI yanıt hatası.", "error");
    } 
}

// --- Teacher Specific Functions ---
async function handleApproveRequest(uidToApprove: string) {
    await db.updateData('users', uidToApprove, { approved: true });
    await db.deleteData('registrationRequests', uidToApprove);
    showNotification(`Öğrenci onaylandı.`, 'success');
    // Note: renderRegistrationRequests will update automatically via subscription
}

// Modified for Real-time
async function renderRegistrationRequests() {
    if (!isDbConnected) return;
    if (teacherUnsubscribe) teacherUnsubscribe();
    
    teacherUnsubscribe = db.subscribeToCollection('registrationRequests', (pendingRequests: any[]) => {
        requestsListContainer.innerHTML = '';
        if (pendingRequests.length === 0) { requestsListContainer.innerHTML = '<p class="text-center text-gray-500 italic text-sm py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">Bekleyen kayıt isteği yok.</p>'; return; }

        pendingRequests.forEach((request: any) => {
            requestsListContainer.innerHTML += `
                <div class="flex items-center justify-between bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div class="flex items-center gap-4">
                        <div class="bg-blue-50 p-3 rounded-full text-blue-600"><span class="material-symbols-outlined">person_add</span></div>
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${request.email}</p>
                            <p class="text-xs text-gray-400 mt-0.5">${new Date(request.timestamp).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <button data-uid="${request.uid}" class="approve-button flex items-center justify-center rounded-lg h-10 px-6 bg-green-600 text-white font-bold text-sm hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/20 transition-all">Onayla</button>
                </div>`;
        });
    });
}

// Teacher Dashboard Render
function renderTeacherDashboard() {
    teacherDashboard.tabs.forEach(tab => {
        const tabName = (tab as HTMLElement).dataset.tab;
        if (tabName === activeTeacherTab) { tab.classList.add('bg-white', 'shadow-md', 'text-teal-800'); tab.classList.remove('text-gray-500'); }
        else { tab.classList.remove('bg-white', 'shadow-md', 'text-teal-800'); tab.classList.add('text-gray-500'); }
    });
    Object.values(teacherDashboard.contents).forEach(c => { if (c) c.classList.add('hidden'); });
    const activeContent = teacherDashboard.contents[activeTeacherTab as keyof typeof teacherDashboard.contents];
    if (activeContent) activeContent.classList.remove('hidden');

    if (activeTeacherTab === 'requests') renderRegistrationRequests();
    if (activeTeacherTab === 'simulations') renderStudentSimulationsList();
    if (activeTeacherTab === 'uploads') renderUploadedAnalysesList();
    if (activeTeacherTab === 'questions') renderStudentQuestions();
}

async function renderStudentSimulationsList() {
    const container = teacherDashboard.contents.simulations;
    container.innerHTML = `<h3 class="text-2xl font-bold text-gray-800 mb-6">Öğrenci Listesi</h3>`;
    // We don't necessarily need real-time for the list of students themselves unless new ones approve often
    // But let's stick to standard get for now to avoid complexity of subscribing to 'users'
    const students = await db.getCollectionWhere('users', 'approved', '==', true);
    if (students.length === 0) return;
    
    students.forEach(student => {
        if (student.role === 'teacher') return;
        container.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mb-4 hover:shadow-md transition-shadow group">
                <div class="flex items-center gap-4">
                    <div class="bg-gradient-to-br from-teal-100 to-teal-200 text-teal-800 rounded-2xl w-12 h-12 flex items-center justify-center font-bold text-xl shadow-inner">${student.email[0].toUpperCase()}</div>
                    <div>
                        <p class="font-bold text-gray-800 text-base">${student.name} ${student.surname}</p>
                        <p class="text-xs text-gray-500 font-medium">${student.email}</p>
                    </div>
                </div>
                <button data-studentid="${student.id}" class="view-sessions-button rounded-xl p-3 bg-gray-50 text-gray-400 hover:text-white hover:bg-teal-600 transition-all"><span class="material-symbols-outlined">arrow_forward_ios</span></button>
            </div>`;
    });
}

async function showStudentFullProfile(studentId: string) {
    reviewingStudentId = studentId;
    showScreen('teacherReview');
    const studentProfile = await db.getData('users', studentId);
    teacherReview.studentName.textContent = `${studentProfile?.name} ${studentProfile?.surname}`;
    teacherReview.studentEmail.textContent = studentProfile?.email;

    // Reset Tabs
    teacherReview.tabs.forEach(t => t.classList.remove('border-teal-600', 'text-teal-700'));
    (document.querySelector('[data-target="profile-simulations"]') as HTMLElement).classList.add('border-teal-600', 'text-teal-700');
    Object.values(teacherReview.contents).forEach(c => c.classList.add('hidden'));
    teacherReview.contents.simulations.classList.remove('hidden');

    const [sessions, uploads, questions] = await Promise.all([
        getAllSessionsForStudent(studentId),
        db.getSubcollection('users', studentId, 'uploads'),
        db.getSubcollection('users', studentId, 'qas')
    ]);

    teacherReview.statCompleted.textContent = sessions.filter(s => s.status === 'completed').length.toString();
    teacherReview.statIncomplete.textContent = sessions.filter(s => s.status === 'in-progress').length.toString();

    teacherReview.contents.simulations.innerHTML = '';
    sessions.forEach(session => {
        teacherReview.contents.simulations.innerHTML += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-teal-200 transition-colors">
            <div>
                <p class="font-bold text-gray-800 text-base">${session.scenario.title}</p>
                <div class="flex items-center gap-2 mt-1"><span class="material-symbols-outlined text-xs text-gray-400">calendar_today</span><span class="text-xs text-gray-500 font-medium">${new Date(session.timestamp).toLocaleDateString()}</span></div>
            </div>
             <button class="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors">Detaylar</button>
        </div>`;
    });

    teacherReview.contents.uploads.innerHTML = '';
    uploads.forEach(upload => {
        teacherReview.contents.uploads.innerHTML += `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-teal-200 transition-colors">
            <div><p class="font-bold text-gray-800 text-base">Danışan: ${upload.clientName}</p><span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Oturum: ${upload.sessionNumber}</span></div>
             <button data-uploadid="${upload.id}" data-studentid="${studentId}" class="review-upload-button text-sm font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-lg hover:bg-teal-100 transition-colors">İncele</button>
        </div>`;
    });

    // Render Competency Matrix
    renderCompetencyMatrix(sessions);
    
    // Load Private Notes from DB
    teacherReview.privateNotesInput.value = studentProfile.privateNotes || '';
}

function renderCompetencyMatrix(sessions: any[]) {
    const scores = sessions.flatMap(s => s.scores || []);
    const avgs = calculateAverageScores(scores);
    
    const createMetricCard = (title: string, score: number, color: string) => `
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
            <h4 class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">${title}</h4>
            <div class="relative w-32 h-32 mx-auto flex items-center justify-center">
                 <svg class="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#f3f4f6" stroke-width="12" fill="none"></circle>
                    <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="12" fill="none" stroke-dasharray="351" stroke-dashoffset="${351 - (351 * score) / 10}" class="text-${color}-500 transition-all duration-1000"></circle>
                </svg>
                <span class="absolute text-3xl font-black text-gray-800">${score.toFixed(1)}</span>
            </div>
        </div>
    `;

    teacherReview.competencyContainer.innerHTML = `
        ${createMetricCard('Empati', avgs.empathy, 'fuchsia')}
        ${createMetricCard('Teknik', avgs.technique, 'amber')}
        ${createMetricCard('İttifak', avgs.rapport, 'teal')}
    `;
}

async function handleSavePrivateNotes() {
    const notes = teacherReview.privateNotesInput.value;
    try {
        await db.updateData('users', reviewingStudentId, { privateNotes: notes });
        showNotification("Notlar şifrelenerek kaydedildi.", "success");
    } catch(e) {
        showNotification("Not kaydetme hatası.", "error");
    }
}

// Modified for Real-time
async function renderUploadedAnalysesList() {
    if (!isDbConnected) return;
    if (teacherUnsubscribe) teacherUnsubscribe();

    const container = teacherDashboard.contents.uploads.querySelector('#uploads-list-container')!;
    
    teacherUnsubscribe = db.subscribeToCollectionGroup('uploads', (uploads: any[]) => {
        container.innerHTML = '';
        if(uploads.length === 0) { container.innerHTML = '<p class="text-gray-400 text-center italic">Henüz yükleme yok.</p>'; return; }
        
        uploads.forEach(upload => {
            container.innerHTML += `
                <div class="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div class="flex gap-4 items-center">
                        <div class="bg-purple-50 p-3 rounded-full text-purple-600"><span class="material-symbols-outlined">description</span></div>
                        <div><p class="font-bold text-gray-800 text-sm">${upload.studentEmail}</p><p class="text-xs text-gray-500 mt-0.5">Danışan: <span class="font-medium text-gray-700">${upload.clientName}</span></p></div>
                    </div>
                    <button data-uploadid="${upload.id}" data-studentid="${upload.studentId}" class="review-upload-button rounded-xl h-10 px-5 bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 shadow-lg shadow-teal-500/20 transition-all">İncele</button>
                </div>`;
        });
    });
}

async function showUploadReviewDetail(uploadId: string, studentId: string) {
    reviewingUploadId = uploadId;
    reviewingStudentId = studentId;
    const upload = await db.getData(`users/${studentId}/uploads`, uploadId);
    showScreen('teacherUploadReview');
    teacherUploadReview.studentName.textContent = upload.studentEmail;
    teacherUploadReview.transcript.textContent = upload.transcript;
    renderAnalysisOutput(upload.analysis, teacherUploadReview.analysis);
    teacherUploadReview.feedbackInput.value = upload.feedback || '';
    if(upload.feedback) teacherUploadReview.existingFeedback.innerHTML = upload.feedback;
    teacherUploadReview.metaDisplay.textContent = `OTURUM ${upload.sessionNumber}`;
}

async function handleSubmitUploadFeedback() {
    const feedbackText = teacherUploadReview.feedbackInput.value.trim();
    if (!feedbackText) return;
    await db.updateDataInSubcollection('users', reviewingStudentId, 'uploads', reviewingUploadId, { feedback: feedbackText });
    showNotification("Geri bildirim başarıyla iletildi.", "success");
}

// Modified for Real-time
async function renderStudentQuestions() {
    if (!isDbConnected) return;
    if (teacherUnsubscribe) teacherUnsubscribe();
    
    const container = teacherDashboard.contents.questions.querySelector('#questions-list-container')!;
    
    teacherUnsubscribe = db.subscribeToCollectionGroup('qas', (questions: any[]) => {
        container.innerHTML = '';
        if(questions.length === 0) { container.innerHTML = '<p class="text-gray-400 text-center italic">Henüz soru yok.</p>'; return; }
        
        questions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).forEach(qa => {
            container.innerHTML += `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-teal-100 transition-colors">
                    <div class="flex justify-between items-start mb-3">
                        <p class="font-bold text-gray-800 text-sm flex items-center gap-2"><span class="material-symbols-outlined text-gray-400 text-lg">account_circle</span> ${qa.studentEmail}</p>
                        <span class="text-[10px] text-gray-400">${new Date(qa.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 mb-4 border border-gray-100 italic">"${qa.question}"</div>
                    ${qa.answer ? `<div class="pl-4 border-l-4 border-teal-400 bg-teal-50/30 p-3 rounded-r-xl"><p class="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1">Yanıtınız:</p><p class="text-sm text-gray-800">${qa.answer}</p></div>` : 
                    `<div class="flex gap-2"><textarea id="reply-input-${qa.id}" class="flex-grow rounded-xl border-gray-200 bg-gray-50 focus:bg-white text-sm p-3" placeholder="Yanıt yazın..."></textarea><button data-questionid="${qa.id}" data-studentid="${qa.studentId}" class="reply-question-button rounded-xl px-5 bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 shadow-md">Gönder</button></div>`}
                </div>`;
        });
    });
}

async function handleReplyToQuestion(questionId: string) {
    const button = document.querySelector(`button[data-questionid="${questionId}"]`) as HTMLElement;
    const studentId = button?.dataset.studentid;
    const input = document.getElementById(`reply-input-${questionId}`) as HTMLTextAreaElement;
    if (!input.value.trim()) return;
    await db.updateDataInSubcollection('users', studentId, 'qas', questionId, { answer: input.value.trim() });
    showNotification("Yanıt gönderildi.", "success");
    // renderStudentQuestions updates automatically via subscription
}
