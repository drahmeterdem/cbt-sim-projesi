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
let currentUserId: string = ''; // Will now store Firebase UID
let reviewingStudentId: string = '';
let reviewingStudentName: string = '';
let reviewingSessionIndex: number = -1;
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests'; // Default to requests for teacher workflow
let currentAnalysisCache: { transcript: string; analysis: any } | null = null;

const TEACHER_PASSWORD = 'teacher3243';
const TEACHER_SESSION_KEY = 'cbt_sim_teacher_session_v1';


// --- DOM Element References ---
const screens = {
    login: document.getElementById('login-screen')!,
    studentDashboard: document.getElementById('student-dashboard-screen')!,
    problemSelection: document.getElementById('problem-selection-screen')!,
    simulation: document.getElementById('simulation-screen')!,
    sessionAnalysis: document.getElementById('session-analysis-screen')!,
    teacherDashboard: document.getElementById('teacher-dashboard-screen')!,
    teacherReview: document.getElementById('teacher-review-screen')!,
};

// General UI
const mainNav = document.getElementById('main-nav')!;
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
// FIX: Cast to HTMLButtonElement to fix 'disabled' property error.
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
    feedbackInput: document.getElementById('feedback-input') as HTMLTextAreaElement,
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
            conversationHistory: [] as any[], // {id, role, parts, teacherComment}
            currentProblem: '',
            currentScenarioId: ''
        },
        completedSimulations: [] as any[], // {scenarioId, title, finalScores, completionDate, history}
        teacherComms: {
            questions: [] as any[], // {id, text, timestamp, studentId}
            answers: [] as any[]    // {questionId, text, timestamp}
        },
        uploadedSessions: [] as any[], // {id, transcript, aiAnalysis, teacherFeedback, timestamp, studentId}
        achievements: [] as string[] // Array of achievement IDs
    };
}

async function saveState(studentId: string, state: object) {
    if (!studentId) return;
    await fb.saveState(studentId, state);
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
            teacherComms: { ...initialState.teacherComms, ...(parsedState.teacherComms || {}) },
            uploadedSessions: parsedState.uploadedSessions || initialState.uploadedSessions,
            completedSimulations: parsedState.completedSimulations || initialState.completedSimulations,
            achievements: parsedState.achievements || initialState.achievements,
        };
    }
    return initialState;
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

function getCustomScenarios(): Scenario[] {
    return JSON.parse(localStorage.getItem('cbt_sim_custom_scenarios_v2') || '[]');
}

function saveCustomScenarios(scenarios: Scenario[]) {
    localStorage.setItem('cbt_sim_custom_scenarios_v2', JSON.stringify(scenarios));
}

function getAllScenarios(): Scenario[] {
    return [...defaultScenarios, ...getCustomScenarios()];
}

// --- Resource Library Management ---
function getResourceLibrary(): Resource[] {
    return JSON.parse(localStorage.getItem('cbt_sim_resource_library') || '[]');
}

function saveResourceLibrary(resources: Resource[]) {
    localStorage.setItem('cbt_sim_resource_library', JSON.stringify(resources));
}


// --- Gamification: Achievements ---
const ALL_ACHIEVEMENTS = [
    { id: 'first_step', name: 'İlk Adım', description: 'İlk simülasyonunu tamamladın!', icon: 'footprint', criteria: (state: ReturnType<typeof getInitialState>) => state.completedSimulations.length >= 1 },
    { id: 'scenario_master', name: 'Senaryo Ustası', description: 'Tüm standart senaryoları tamamladın.', icon: 'trophy', criteria: (state: ReturnType<typeof getInitialState>) => {
        const completedIds = new Set(state.completedSimulations.map(s => s.scenarioId));
        return defaultScenarios.every(s => completedIds.has(s.id));
    }},
    { id: 'empathy_expert', name: 'Empati Uzmanı', description: 'Bir seansta ortalama 8+ empati puanı aldın.', icon: 'volunteer_activism', criteria: (state: ReturnType<typeof getInitialState>) => state.completedSimulations.some(s => s.finalScores.empathy >= 8) },
    { id: 'technique_guru', name: 'Teknik Gurusu', description: 'Bir seansta ortalama 8+ BDT Tekniği puanı aldın.', icon: 'psychology', criteria: (state: ReturnType<typeof getInitialState>) => state.completedSimulations.some(s => s.finalScores.technique >= 8) },
    { id: 'curious_mind', name: 'Meraklı Zihin', description: 'Öğretmenine ilk sorunu sordun.', icon: 'contact_support', criteria: (state: ReturnType<typeof getInitialState>) => state.teacherComms.questions.length >= 1 },
    { id: 'analyst', name: 'Analist', description: 'İlk harici seansını analiz ettin.', icon: 'science', criteria: (state: ReturnType<typeof getInitialState>) => state.uploadedSessions.length >= 1 },
];

async function checkAndAwardAchievements(studentId: string) {
    const state = await loadState(studentId);
    let newAchievements = false;
    ALL_ACHIEVEMENTS.forEach(ach => {
        if (!state.achievements.includes(ach.id) && ach.criteria(state)) {
            state.achievements.push(ach.id);
            showNotification(`Yeni Başarı Kazandın: ${ach.name}!`, 5000);
            newAchievements = true;
        }
    });
    if (newAchievements) {
        await saveState(studentId, state);
    }
}


// --- UI Helper Functions ---

function showScreen(screenId: keyof typeof screens) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
    currentScreen = screenId;
    
    // Update active state in nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-screen') === screenId) {
            link.classList.add('active');
        }
    });

    window.scrollTo(0, 0);
}


function appendMessage(
    container: HTMLElement, 
    role: 'therapist' | 'client' | 'teacher_feedback' | 'student_question' | 'teacher_answer', 
    text: string, 
    options: { rationale?: string; turnId?: string; teacherComment?: string; isReview?: boolean } = {}
) {
  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'flex flex-col w-full';
  
  if (role === 'teacher_feedback') {
    messageWrapper.innerHTML = `
      <div class="flex w-full flex-row items-center gap-3 animate-fade-in-up justify-center mt-2">
          <div class="chat-bubble-teacher flex items-start gap-3">
             <span class="material-symbols-outlined text-amber-600">school</span>
             <div>
                <p class="font-semibold mb-1">Öğretmen Geri Bildirimi</p>
                <p>${text}</p>
             </div>
          </div>
      </div>`;
  } else if (role === 'student_question' || role === 'teacher_answer') {
        const isStudent = role === 'student_question';
        messageWrapper.className = `flex flex-col animate-fade-in-up ${isStudent ? 'items-end' : 'items-start'}`;
        messageWrapper.innerHTML = `
            <div class="p-3 rounded-2xl max-w-[90%] ${isStudent ? 'bg-indigo-100 text-gray-800 rounded-br-none' : 'bg-amber-100 text-gray-800 rounded-bl-none'}">
                <p class="text-sm">${text}</p>
            </div>
            <p class="text-xs mt-1 px-2 opacity-60">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        `;
  } else {
      const isTherapist = role === 'therapist';
      const bubbleClasses = isTherapist ? 'chat-bubble-therapist' : 'chat-bubble-client';
      const justifyClass = isTherapist ? 'justify-end' : 'justify-start';
      const profilePic = isTherapist 
        ? `<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 shadow-md" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuCpEUlkiuaM-PqmLRfuMdvGVcPG7083Ivwo2Eu-rqhUWkJQ3nbCEOvtAJ8KAQPomgBMrmNGVRwf-bqJdXiLrNeavfuTie6TnUDV2FzF_tjMgYfmW6KXXEA55XwMGKq_g9m0cxT6O1hui-yub_4Mq4gks2jSt1C3Wl6MlagLZDjp3qdg-NFKzAuxj-vCOJS-4_lp4tjEXjw01xZKP4KhDwk7SK7GmX8V_Z1YySgLWbtyssFIFlRz_pUUvPxzMPbLSUTZdRCC_ogQS8k");'></div>`
        : `<div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 shrink-0 shadow-md" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuB29Zm5vxgysOZbmplS4A3nRzN4ms7bsrZ4Q8FDmI4lIYttvFcGpEInwgJkcjZ0aAujSEEbhhshOvWNnPG1WZPoDurJR3lUYJW1-iBvUc4rx3LkRXq6CG7up0dxmQ9iEdBRXLce-RLW81-rnCfgfYMo4ImKiG3RJ_Vr2ffqBMqX-dMd-s4R_pjVglrPtC6IwshdBxF8nIqkxHSOCF8ni9FhwAVJ5mI5vlGY9gKgdkmum9V8X6xjTk_g85zgmmzEW-5b5TOJgom7Prw");'></div>`;
      
      const messageElement = document.createElement('div');
      messageElement.className = `flex w-full flex-row items-end gap-3 animate-fade-in-up ${justifyClass}`;
      messageElement.dataset.turnId = options.turnId;

      const commentButton = options.isReview ? `<button data-turn-id="${options.turnId}" class="add-inline-comment-button -mr-2 -mb-2 p-2 rounded-full hover:bg-black/10 transition-colors"><span class="material-symbols-outlined text-lg text-gray-500">add_comment</span></button>` : '';
      const rationaleButton = !isTherapist && options.rationale ? `<button data-rationale="${options.rationale}" class="rationale-button -mr-2 -mb-2 p-2 rounded-full hover:bg-white/20 transition-colors"><span class="material-symbols-outlined text-lg text-white">lightbulb</span></button>` : '';
      
      const content = `
        <div class="flex flex-col items-start chat-bubble ${bubbleClasses}">
            <p class="text-base">${text}</p>
            <div class="flex items-center justify-between w-full mt-2">
                <p class="text-xs ${isTherapist ? 'opacity-60' : 'text-indigo-200'}">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="flex items-center">${rationaleButton}${commentButton}</div>
            </div>
        </div>
      `;

      if (isTherapist) {
        messageElement.innerHTML = `${content} ${profilePic}`;
      } else {
        messageElement.innerHTML = `${profilePic} ${content}`;
      }
      messageWrapper.appendChild(messageElement);

      if (options.teacherComment) {
         const commentDiv = document.createElement('div');
         commentDiv.className = `teacher-inline-comment animate-fade-in-up ${justifyClass === 'justify-end' ? 'self-end' : 'self-start'}`;
         commentDiv.innerHTML = `<p class="font-semibold text-xs text-amber-700 mb-1">Öğretmen Notu:</p><p class="text-sm text-amber-800">${options.teacherComment}</p>`;
         messageWrapper.appendChild(commentDiv);
      }
       if (options.isReview) {
            const commentInputDiv = document.createElement('div');
            commentInputDiv.id = `comment-input-${options.turnId}`;
            commentInputDiv.className = 'hidden w-full flex gap-2 mt-2';
            commentInputDiv.innerHTML = `
                <input type="text" placeholder="Yorum ekle..." class="inline-comment-input flex-grow rounded-lg border-gray-300 shadow-sm text-sm">
                <button data-turn-id="${options.turnId}" class="submit-inline-comment rounded-lg px-3 bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all">Gönder</button>
            `;
            messageWrapper.appendChild(commentInputDiv);
        }
  }

  container.appendChild(messageWrapper);
  container.scrollTop = container.scrollHeight;
}


function displayOptions(options: { title: string; description: string }[]) {
  simulation.optionsContainer.innerHTML = ''; 
  if (!options) return;

  options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'option-button group';
    button.innerHTML = `
      <span class="font-semibold block">${option.title}</span>
      <span class="text-sm text-gray-500 group-hover:text-indigo-100">${option.description}</span>
    `;
    button.dataset.description = option.description;
    simulation.optionsContainer.appendChild(button);
  });
}

function updateGraphs(container: HTMLElement, scoring: any, clientImpact: any, feedback: string) {
    container.classList.remove('hidden');
    container.innerHTML = `
        <h4 class="text-gray-700 font-bold text-lg mb-4 text-center">Anlık Geri Bildirim ve Analiz</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h5 class="font-semibold text-gray-800 mb-2">Geri Bildirim</h5>
                <p class="text-sm text-gray-600 bg-indigo-50 p-3 rounded-lg">${feedback}</p>
            </div>
            <div class="space-y-4">
                <div>
                    <h5 class="font-semibold text-gray-800 mb-2">Danışan Etki Grafiği</h5>
                    <div class="space-y-2">
                        <div class="w-full"><span class="text-xs font-medium text-gray-500">Duygusal Rahatlama</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-green-400 chart-bar" style="width: ${clientImpact.emotionalRelief * 10}%;"></div></div></div>
                        <div class="w-full"><span class="text-xs font-medium text-gray-500">Bilişsel Netlik</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-blue-400 chart-bar" style="width: ${clientImpact.cognitiveClarity * 10}%;"></div></div></div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-800 mb-2">Terapist Beceri Puanları (Son Tur)</h5>
                    <div class="space-y-2">
                        <div class="w-full"><span class="text-xs font-medium text-gray-500">Empati</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-fuchsia-400 chart-bar" style="width: ${scoring.empathy * 10}%;"></div></div></div>
                        <div class="w-full"><span class="text-xs font-medium text-gray-500">BDT Tekniği</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-amber-400 chart-bar" style="width: ${scoring.technique * 10}%;"></div></div></div>
                        <div class="w-full"><span class="text-xs font-medium text-gray-500">İlişki Kurma</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-teal-400 chart-bar" style="width: ${scoring.rapport * 10}%;"></div></div></div>
                    </div>
                </div>
            </div>
        </div>`;
}

function showLoader(container: HTMLElement, message: string) {
    container.innerHTML = `
      <div class="col-span-1 md:col-span-2 flex justify-center items-center py-4 animate-fade-in-up">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-[var(--primary-color)] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span class="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Yükleniyor...</span>
        </div>
        <p class="ml-4 text-gray-600">${message}</p>
      </div>
    `;
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
    if (modal === 'rationale') {
        rationaleModal.title.textContent = title;
        rationaleModal.content.innerHTML = content;
        rationaleModal.container.classList.remove('hidden');
    } else {
        summaryModal.title.textContent = `${title} için AI Performans Özeti`;
        summaryModal.content.innerHTML = content;
        summaryModal.container.classList.remove('hidden');
    }
}

function hideModal(modal: 'rationale' | 'summary') {
    if (modal === 'rationale') {
        rationaleModal.container.classList.add('hidden');
    } else {
        summaryModal.container.classList.add('hidden');
    }
}

// --- Navigation ---
function populateTeacherNav() {
    mainNav.innerHTML = `
        <button data-tab="requests" class="nav-link nav-link-teacher active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors">
            <span class="material-symbols-outlined">how_to_reg</span> Kayıt İstekleri
        </button>
        <button data-tab="simulations" class="nav-link nav-link-teacher flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors">
            <span class="material-symbols-outlined">psychology</span> Simülasyonlar
        </button>
        <button data-tab="uploads" class="nav-link nav-link-teacher flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors">
            <span class="material-symbols-outlined">upload_file</span> Yüklenenler
        </button>
         <button data-tab="questions" class="nav-link nav-link-teacher flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-colors">
            <span class="material-symbols-outlined">contact_support</span> Sorular
        </button>
    `;
    mainNav.classList.remove('hidden');
}

function populateStudentNav() {
    mainNav.innerHTML = `
        <button data-screen="studentDashboard" class="nav-link active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors">
            <span class="material-symbols-outlined">dashboard</span> Panelim
        </button>
        <button data-screen="problemSelection" class="nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors">
            <span class="material-symbols-outlined">play_circle</span> Yeni Simülasyon
        </button>
        <button data-screen="sessionAnalysis" class="nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors">
            <span class="material-symbols-outlined">science</span> Seans Analizi
        </button>
    `;
    mainNav.classList.remove('hidden');
}

// --- Simulation Logic ---

async function getAiResponse() {
    // @ts-ignore
    if (!process.env.API_KEY) {
        simulation.optionsContainer.innerHTML = `<p class="text-red-500 text-center col-span-1 md:col-span-2">Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.</p>`;
        return;
    }
    const state = await loadState(currentUserId);
    const scenario = getAllScenarios().find(s => s.id === state.simulation.currentScenarioId);
    
    showLoader(simulation.optionsContainer, "Elif düşünüyor...");

    let dynamicSystemInstruction = `${simulationSystemInstruction} Mevcut sorun alanı: ${state.simulation.currentProblem}.`;
    if (scenario?.isCustom && scenario.profile) {
        dynamicSystemInstruction += ` Danışan profili: ${scenario.profile}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...state.simulation.conversationHistory.filter((h: any) => h.role !== 'teacher_feedback').map(h => ({role: h.role.replace("therapist", "user").replace("client", "model"), parts: h.parts}))],
            config: {
                systemInstruction: dynamicSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT, properties: { clientResponse: { type: Type.STRING }, feedback: { type: Type.STRING }, rationale: { type: Type.STRING }, scoring: { type: Type.OBJECT, properties: { empathy: { type: Type.NUMBER }, technique: { type: Type.NUMBER }, rapport: { type: Type.NUMBER }, }, required: ["empathy", "technique", "rapport"], }, clientImpact: { type: Type.OBJECT, properties: { emotionalRelief: { type: Type.NUMBER }, cognitiveClarity: { type: Type.NUMBER }, }, required: ["emotionalRelief", "cognitiveClarity"], }, therapistOptions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, }, required: ["title", "description"], }, }, }, required: ["clientResponse", "feedback", "rationale", "scoring", "clientImpact", "therapistOptions"],
                },
            },
        });

        const data = JSON.parse(response.text);
        const turnId = `turn_${Date.now()}`;
        state.simulation.conversationHistory.push({ id: turnId, role: 'client', parts: [{ text: JSON.stringify(data) }], teacherComment: '' });
        appendMessage(simulation.chatContainer, 'client', data.clientResponse, { rationale: data.rationale, turnId });
        displayOptions(data.therapistOptions);
        simulation.feedbackText.textContent = data.feedback;
        updateGraphs(simulation.feedbackSection, data.scoring, data.clientImpact, data.feedback);

        await saveState(currentUserId, state);
    } catch (error) {
        console.error("Error generating AI response:", error);
        const errorString = String(error);
        let errorMessage = 'Yapay zeka ile iletişimde bir sorun oluştu.';
        if (errorString.includes("API_KEY_INVALID") || errorString.includes("API key not valid")) {
             errorMessage = "Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.";
        }
        simulation.optionsContainer.innerHTML = `<p class="text-red-500 text-center col-span-1 md:col-span-2">${errorMessage}</p>`;
    }
}

async function handleOptionSelect(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.option-button') as HTMLButtonElement | null;
    if (!button) return;

    const therapistMessage = button.dataset.description || '';
    const turnId = `turn_${Date.now()}`;
    appendMessage(simulation.chatContainer, 'therapist', therapistMessage, { turnId });
    
    const state = await loadState(currentUserId);
    state.simulation.conversationHistory.push({ id: turnId, role: 'therapist', parts: [{ text: therapistMessage }], teacherComment: '' });
    await saveState(currentUserId, state);
    
    simulation.feedbackSection.classList.add('hidden');
    await getAiResponse();
}

async function startSimulation(scenarioId: string) {
    const scenario = getAllScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;

    // If there's an unfinished simulation, archive it before starting a new one.
    const oldState = await loadState(currentUserId);
    if (oldState.simulation && oldState.simulation.currentProblem) {
        await archiveCurrentSimulation(currentUserId);
    }

    // Proceed with the new simulation, loading the state again as it has been modified.
    const state = await loadState(currentUserId);
    state.simulation.currentProblem = scenario.title;
    state.simulation.currentScenarioId = scenario.id;
    state.simulation.conversationHistory = []; // Start fresh
    
    simulation.problemDisplay.textContent = scenario.title;
    showScreen('simulation');
    
    backToSelectionButton.classList.remove('hidden');
    saveProgressButton.classList.remove('hidden');

    simulation.chatContainer.innerHTML = '';
    simulation.optionsContainer.innerHTML = '';
    simulation.feedbackSection.classList.add('hidden');

    const turnId = `turn_${Date.now()}`;
    state.simulation.conversationHistory.push({ id: turnId, role: 'therapist', parts: [{ text: `Merhaba, bugün ${scenario.title} üzerine konuşmak için buradayım. Lütfen danışan olarak başla.` }], teacherComment: '' });
    await saveState(currentUserId, state);
    await getAiResponse();
}

function handleProblemSelect(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.problem-button') as HTMLButtonElement | null;
    if (!button) return;
    const scenarioId = button.dataset.scenarioId;
    if (scenarioId) startSimulation(scenarioId);
}

function rebuildUiFromState(container: HTMLElement, history: any[], isReview: boolean = false) {
    container.innerHTML = '';
    let lastModelResponse: any = null;

    history.forEach((turn: any) => {
        if (turn.role === 'therapist') {
            if(!turn.parts[0].text.includes('Lütfen danışan olarak başla.')) {
                 appendMessage(container, 'therapist', turn.parts[0].text, { turnId: turn.id, teacherComment: turn.teacherComment, isReview });
            }
        } else if (turn.role === 'client') {
            const data = JSON.parse(turn.parts[0].text);
            appendMessage(container, 'client', data.clientResponse, { rationale: data.rationale, turnId: turn.id, teacherComment: turn.teacherComment, isReview });
            lastModelResponse = data;
        } else if (turn.role === 'teacher_feedback') {
            appendMessage(container, 'teacher_feedback', turn.parts[0].text);
        }
    });
    return lastModelResponse;
}

// --- Login, Register & Logout ---

async function handleRegister() {
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmPasswordInput.value;

    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    if (!username || !password) {
        registerError.textContent = 'Kullanıcı adı ve şifre boş bırakılamaz.';
        registerError.classList.remove('hidden');
        return;
    }
     if (password.length < 6) {
        registerError.textContent = 'Şifre en az 6 karakter olmalıdır.';
        registerError.classList.remove('hidden');
        return;
    }
    if (password !== confirmPassword) {
        registerError.textContent = 'Şifreler eşleşmiyor.';
        registerError.classList.remove('hidden');
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = 'Kaydediliyor...';

    try {
        await fb.registerUser(username, password);
        registerSuccess.textContent = 'Kayıt başarılı! Hesabınız öğretmen onayını bekliyor.';
        registerSuccess.classList.remove('hidden');
        registerUsernameInput.value = '';
        registerPasswordInput.value = '';
        registerConfirmPasswordInput.value = '';

        setTimeout(() => {
            registerView.classList.add('hidden');
            loginView.classList.remove('hidden');
            registerSuccess.classList.add('hidden');
        }, 3000);

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = 'Bu kullanıcı adı zaten alınmış.';
        } else {
            registerError.textContent = 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.';
        }
        registerError.classList.remove('hidden');
        console.error("Registration error:", error);
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Kayıt Ol';
    }
}

function logout() {
    const teacherSession = sessionStorage.getItem(TEACHER_SESSION_KEY);
    if (teacherSession) {
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
        location.reload();
    } else {
        fb.logoutUser();
    }
}

async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    loginError.classList.add('hidden');

    if (!username || !password) {
        loginError.textContent = 'Lütfen kullanıcı adı ve şifrenizi girin.';
        loginError.classList.remove('hidden');
        return;
    }
    
    loginButton.disabled = true;
    loginButton.innerHTML = '<span>Giriş Yapılıyor...</span>';

    try {
        const user = await fb.loginUser(username, password);
        const userData = await fb.getUserData(user.uid);
        
        if (userData?.status === 'approved') {
            // onAuthStateChanged will handle the redirect
        } else if (userData?.status === 'pending') {
            loginError.textContent = 'Hesabınız öğretmen onayını bekliyor.';
            loginError.classList.remove('hidden');
            await fb.logoutUser();
        } else if (userData?.status === 'rejected') {
            loginError.textContent = 'Hesap kaydınız reddedildi.';
            loginError.classList.remove('hidden');
            await fb.logoutUser();
        } else {
            loginError.textContent = 'Geçersiz kullanıcı durumu. Lütfen yöneticiyle iletişime geçin.';
            loginError.classList.remove('hidden');
            await fb.logoutUser();
        }
    } catch (error: any) {
        loginError.textContent = 'Geçersiz kullanıcı adı veya şifre.';
        loginError.classList.remove('hidden');
        console.error("Login error:", error);
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = '<span>Giriş Yap</span>';
    }
}

async function handleTeacherLogin() {
    const password = teacherPasswordInput.value;
    teacherLoginError.classList.add('hidden');

    if (password === TEACHER_PASSWORD) {
        sessionStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify({ type: 'teacher', username: 'Öğretmen' }));
        location.reload();
    } else {
        teacherLoginError.textContent = 'Geçersiz yönetici şifresi.';
        teacherLoginError.classList.remove('hidden');
    }
}

// --- Student Dashboard Logic ---
function calculateAverageScores(history: any[]) {
    const scores: { [key: string]: number[] } = { empathy: [], technique: [], rapport: [] };
    history.forEach(turn => {
        if (turn.role === 'client') {
            try {
                const data = JSON.parse(turn.parts[0].text);
                if (data.scoring) {
                    scores.empathy.push(data.scoring.empathy || 0);
                    scores.technique.push(data.scoring.technique || 0);
                    scores.rapport.push(data.scoring.rapport || 0);
                }
            } catch (e) { /* ignore parse errors */ }
        }
    });

    const getAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
        empathy: getAverage(scores.empathy),
        technique: getAverage(scores.technique),
        rapport: getAverage(scores.rapport),
    };
}

async function generateAndDisplayRecommendations(studentId: string) {
    const state = await loadState(studentId);
    const container = recommendations.container;
    const allResources = getResourceLibrary();
    let recommendationsHtml = '';

    // Recommendation 1: Based on last completed session's associated resources
    const lastCompleted = state.completedSimulations[state.completedSimulations.length - 1];
    if (lastCompleted) {
        const associatedResources = allResources.filter(r => r.associatedScenarioIds.includes(lastCompleted.scenarioId));
        if (associatedResources.length > 0) {
            recommendationsHtml += `<div class="p-3 bg-indigo-50 rounded-lg">
                <p class="font-semibold text-gray-700">"${lastCompleted.title}" senaryosunu tamamladın. Bu kaynaklar ilgini çekebilir:</p>
                <ul class="list-disc list-inside mt-2 text-sm">
                    ${associatedResources.map(r => `<li><a href="${r.url}" target="_blank" class="text-indigo-600 hover:underline">${r.title}</a></li>`).join('')}
                </ul>
            </div>`;
        }
    }

    // Recommendation 2: Based on performance
    const allHistory = state.completedSimulations.flatMap(s => s.history || []);
    const overallScores = calculateAverageScores(allHistory);
    if (allHistory.length > 0 && overallScores.technique < 6) {
         recommendationsHtml += `<div class="p-3 bg-amber-50 rounded-lg">
            <p class="font-semibold text-gray-700">BDT tekniği puanın ortalamanın altında görünüyor. Belki bu kaynak yardımcı olabilir:</p>
            <ul class="list-disc list-inside mt-2 text-sm">
                <li><a href="#" target="_blank" class="text-indigo-600 hover:underline">Sokratik Sorgulama Derinlemesine Bakış (Makale)</a></li>
            </ul>
        </div>`;
    }

    container.innerHTML = recommendationsHtml || '<p class="text-center text-gray-500">Henüz size özel bir öneri bulunmuyor.</p>';
}

async function displayAchievements(studentId: string) {
    const state = await loadState(studentId);
    const container = achievements.container;
    container.innerHTML = ALL_ACHIEVEMENTS.map(ach => {
        const earned = state.achievements.includes(ach.id);
        return `
            <div class="flex flex-col items-center p-2 rounded-lg ${earned ? 'bg-amber-100' : 'bg-gray-100'}">
                <span class="material-symbols-outlined text-4xl ${earned ? 'text-amber-500' : 'text-gray-400'}">${ach.icon}</span>
                <p class="font-semibold text-xs mt-1 ${earned ? 'text-amber-800' : 'text-gray-500'}" title="${ach.description}">${ach.name}</p>
            </div>
        `;
    }).join('');
}


async function populateStudentDashboard() {
    if (!currentUserId) return;
    const state = await loadState(currentUserId);
    dashboardStudentName.textContent = currentStudentName;

    // Continue session card
    if (state.simulation.currentProblem) {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-3">play_circle</span>
            <h3 class="text-xl font-bold text-gray-800">Devam Et: ${state.simulation.currentProblem}</h3>
            <p class="text-gray-600 mt-2 mb-4">Kaldığın yerden simülasyona devam et.</p>
            <button id="resume-simulation-button" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg">
                <span>Devam Et</span>
            </button>`;
        document.getElementById('resume-simulation-button')?.addEventListener('click', () => {
            simulation.problemDisplay.textContent = state.simulation.currentProblem;
            showScreen('simulation');
            backToSelectionButton.classList.remove('hidden');
            saveProgressButton.classList.remove('hidden');
            const lastModelResponse = rebuildUiFromState(simulation.chatContainer, state.simulation.conversationHistory);
            if (lastModelResponse) {
                displayOptions(lastModelResponse.therapistOptions);
                updateGraphs(simulation.feedbackSection, lastModelResponse.scoring, lastModelResponse.clientImpact, lastModelResponse.feedback);
            }
        });
    } else {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-pink-500 mb-3">psychology</span>
            <h3 class="text-xl font-bold text-gray-800">Yeni Simülasyon</h3>
            <p class="text-gray-600 mt-2 mb-4">Yeni bir BDT simülasyonu başlatarak becerilerini geliştir.</p>
            <button id="start-new-simulation-button" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-pink-500 text-white font-semibold hover:bg-pink-600 transition-all duration-300 shadow-md hover:shadow-lg">
                <span>Başla</span>
            </button>`;
        document.getElementById('start-new-simulation-button')?.addEventListener('click', () => showScreen('problemSelection'));
    }

    // Progress tracking
    if (state.simulation.currentProblem) {
        const currentScores = calculateAverageScores(state.simulation.conversationHistory);
        updateGraphs(progressTracking.container, currentScores, { emotionalRelief: 0, cognitiveClarity: 0 }, "Mevcut seans ortalama puanların.");
    } else {
        progressTracking.container.innerHTML = '<p class="text-center text-gray-500">Aktif bir seans bulunmuyor.</p>';
    }

    // Cumulative progress
    const allHistory = state.completedSimulations.flatMap(s => s.history || []);
    if (allHistory.length > 0) {
        const cumulativeScores = calculateAverageScores(allHistory);
        updateGraphs(cumulativeProgress.container, cumulativeScores, { emotionalRelief: 0, cognitiveClarity: 0 }, "Tüm tamamlanan seansların ortalama puanları.");
    } else {
        cumulativeProgress.container.innerHTML = '<p class="text-center text-gray-500">Henüz tamamlanmış seans yok.</p>';
    }
    
    // Recommendations & Achievements
    await generateAndDisplayRecommendations(currentUserId);
    await displayAchievements(currentUserId);

    // QA History
    teacherQASystem.history.innerHTML = '';
    state.teacherComms.questions.forEach(q => {
        appendMessage(teacherQASystem.history, 'student_question', q.text);
        const answer = state.teacherComms.answers.find(a => a.questionId === q.id);
        if (answer) {
            appendMessage(teacherQASystem.history, 'teacher_answer', answer.text);
        }
    });
}


// --- Teacher Dashboard ---

async function handleViewSummary(studentId: string, studentName: string) {
    // @ts-ignore
    if (!process.env.API_KEY) {
        showModal('summary', studentName, '<p class="text-red-500">Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.</p>');
        return;
    }

    const state = await loadState(studentId);
    if (state.completedSimulations.length === 0) {
        showNotification("Bu öğrencinin henüz tamamlanmış bir simülasyonu yok.", 3000, 'error');
        return;
    }
    
    showModal('summary', studentName, '<div id="summary-loader-content"></div>');
    const loaderContainer = document.getElementById('summary-loader-content')!;
    showLoader(loaderContainer, `${studentName} için özet oluşturuluyor...`);

    const combinedHistory = state.completedSimulations.map(sim => {
        const transcript = sim.history.map((turn: any) => {
            if (turn.role === 'therapist') return `Terapist: ${turn.parts[0].text}`;
            if (turn.role === 'client') {
                try {
                    const data = JSON.parse(turn.parts[0].text);
                    return `Danışan: ${data.clientResponse}`;
                } catch { return ''; }
            }
            return '';
        }).join('\n');
        return `--- ${sim.title} SEANSI ---\n${transcript}\n--- SEANS SONU ---`;
    }).join('\n\n');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: combinedHistory }] }],
            config: {
                systemInstruction: studentSummarySystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        overallPerformanceSummary: { type: Type.STRING },
                        recurringStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        patternsForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
                        actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["overallPerformanceSummary", "recurringStrengths", "patternsForImprovement", "actionableSuggestions"]
                }
            }
        });
        const data = JSON.parse(response.text);
        const summaryContent = `
            <h4>Genel Performans Özeti</h4>
            <p>${data.overallPerformanceSummary}</p>
            <h4 class="mt-4">Tekrar Eden Güçlü Yönler</h4>
            <ul>${data.recurringStrengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Geliştirilmesi Gereken Kalıplar</h4>
            <ul>${data.patternsForImprovement.map((s: string) => `<li>${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Eyleme Geçirilebilir Öneriler</h4>
            <ul>${data.actionableSuggestions.map((s: string) => `<li>${s}</li>`).join('')}</ul>
        `;
        showModal('summary', studentName, summaryContent);

    } catch(error) {
        console.error("Error generating student summary:", error);
        const errorString = String(error);
        let errorMessage = "Özet oluşturulurken bir hata oluştu.";
        if (errorString.includes("API_KEY_INVALID") || errorString.includes("API key not valid")) {
             errorMessage = "Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.";
        }
        showModal('summary', studentName, `<p class="text-red-500">${errorMessage}</p>`);
    }
}


async function handleApprovalAction(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.approve-button, .reject-button') as HTMLButtonElement | null;
    if (!button) return;

    const userId = button.dataset.userId!;
    const action = button.dataset.action!;

    try {
        await fb.updateUserStatus(userId, action === 'approve' ? 'approved' : 'rejected');
        showNotification(`Öğrenci ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`, 3000, 'success');
        await populateTeacherDashboard(); // Refresh the list
    } catch (error) {
        showNotification('İşlem sırasında bir hata oluştu.', 3000, 'error');
        console.error("Error updating user status:", error);
    }
}


function setActiveTeacherTab(tabName: string) {
    activeTeacherTab = tabName;

    // Update nav link active state
    document.querySelectorAll('.nav-link-teacher').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabName) {
            link.classList.add('active');
        }
    });
    
    Object.values(teacherDashboard.contents).forEach(content => content.classList.add('hidden'));
    const activeContent = teacherDashboard.contents[tabName as keyof typeof teacherDashboard.contents];
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

async function populateTeacherDashboard() {
    // Tab 1: Requests
    const pendingStudents = await fb.getPendingUsers();
    let requestsHtml = '<div class="bg-white/70 p-6 rounded-2xl shadow-xl space-y-4">';
    if (pendingStudents.length === 0) {
        requestsHtml += '<p class="text-center text-gray-500 py-4">Onay bekleyen öğrenci bulunmuyor.</p>';
    } else {
         requestsHtml += pendingStudents.map((user) => `
            <div class="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                <span class="font-semibold text-gray-800">${user.username}</span>
                <div class="flex gap-2">
                    <button data-user-id="${user.id}" data-action="approve" class="approve-button bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-sm font-semibold">Onayla</button>
                    <button data-user-id="${user.id}" data-action="reject" class="reject-button bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-sm font-semibold">Reddet</button>
                </div>
            </div>
        `).join('');
    }
    requestsHtml += '</div>';
    teacherDashboard.contents.requests.innerHTML = requestsHtml;

    // Tab 2: Simulations
    const approvedStudents = await fb.getApprovedStudents();
    let simulationsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
    if (approvedStudents.length === 0) {
        simulationsHtml = '<p class="text-center text-gray-500 py-8 col-span-full">Henüz onaylanmış öğrenci bulunmuyor.</p>';
    } else {
        for (const student of approvedStudents) {
            const studentState = await loadState(student.id as string);
            const completedCount = studentState.completedSimulations.length;
            simulationsHtml += `
                 <div class="bg-white/80 p-5 rounded-xl shadow-lg">
                    <h4 class="font-bold text-lg text-gray-800">${student.username}</h4>
                    <p class="text-gray-600 text-sm">${completedCount} seans tamamladı.</p>
                    <div class="mt-4 flex gap-2">
                        <button data-student-id="${student.id}" data-student-name="${student.username}" class="view-sessions-button flex-1 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm font-semibold">Seansları Görüntüle</button>
                        <button data-student-id="${student.id}" data-student-name="${student.username}" class="view-summary-button bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm font-semibold">AI Özet</button>
                    </div>
                </div>`;
        }
    }
    simulationsHtml += '</div>';
    teacherDashboard.contents.simulations.innerHTML = simulationsHtml;

    // Tab 3: Uploads
    let allUploads: any[] = [];
    for (const student of approvedStudents) {
        const state = await loadState(student.id as string);
        allUploads.push(...state.uploadedSessions);
    }
    const uploadsContainer = document.getElementById('uploads-list-container')!;
    if (allUploads.length === 0) {
        uploadsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Öğrenciler tarafından yüklenmiş seans bulunmuyor.</p>';
    } else {
        uploadsContainer.innerHTML = allUploads.map(upload => `
             <div class="p-4 bg-indigo-50 rounded-lg">
                <p class="font-semibold">${upload.studentId} <span class="font-normal text-gray-500 text-sm">- ${new Date(upload.timestamp).toLocaleDateString()}</span></p>
                <p class="text-sm mt-2 text-gray-600 truncate">"${upload.transcript.substring(0, 100)}..."</p>
                 <button class="text-indigo-600 hover:underline mt-2 text-sm font-semibold">İncele</button>
             </div>
        `).join('');
    }


    // Tab 4: Questions
    let allQuestions: any[] = [];
    for (const student of approvedStudents) {
        const state = await loadState(student.id as string);
        allQuestions.push(...state.teacherComms.questions);
    }
    const questionsContainer = document.getElementById('questions-list-container')!;
     if (allQuestions.length === 0) {
        questionsContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Henüz öğrenci sorusu bulunmuyor.</p>';
    } else {
        questionsContainer.innerHTML = allQuestions.map(q => `
            <div class="p-4 bg-amber-50 rounded-lg">
                <p class="font-semibold">${q.studentId} sordu: <span class="font-normal text-gray-600">"${q.text}"</span></p>
                <!-- Add answer input and button here -->
            </div>
        `).join('');
    }
}


// --- Teacher Review Logic ---
async function addTeacherComment(studentId: string, sessionIndex: number, turnId: string, commentText: string) {
    if (!studentId || sessionIndex < 0 || !turnId || !commentText) return false;

    try {
        const state = await loadState(studentId);
        const session = state.completedSimulations[sessionIndex];
        if (!session) return false;

        const turn = session.history.find((t: any) => t.id === turnId);
        if (!turn) return false;

        turn.teacherComment = commentText;
        await saveState(studentId, state);
        return true;
    } catch (error) {
        console.error("Error adding teacher comment:", error);
        return false;
    }
}

async function addGeneralFeedback(studentId: string, sessionIndex: number, feedbackText: string) {
    if (!studentId || sessionIndex < 0 || !feedbackText) return false;

    try {
        const state = await loadState(studentId);
        const session = state.completedSimulations[sessionIndex];
        if (!session) return false;

        session.history.push({
            id: `feedback_${Date.now()}`,
            role: 'teacher_feedback',
            parts: [{ text: feedbackText }],
        });

        await saveState(studentId, state);
        return true;
    } catch (error) {
        console.error("Error adding general feedback:", error);
        return false;
    }
}

async function displayStudentSessionsForReview(studentId: string, studentName: string) {
    reviewingStudentId = studentId;
    reviewingStudentName = studentName;
    const state = await loadState(studentId);
    teacherReview.listStudentName.textContent = studentName;

    if (state.completedSimulations.length === 0) {
        teacherReview.sessionListContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Bu öğrencinin tamamlanmış simülasyonu yok.</p>';
    } else {
        teacherReview.sessionListContainer.innerHTML = state.completedSimulations.map((sim, index) => `
            <div class="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm hover:bg-indigo-50 transition-colors">
                <div>
                    <p class="font-semibold text-gray-800">${sim.title}</p>
                    <p class="text-sm text-gray-500">Tamamlanma: ${new Date(sim.completionDate).toLocaleString()}</p>
                </div>
                <button data-session-index="${index}" class="review-specific-session-button bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm font-semibold">İncele</button>
            </div>
        `).join('');
    }

    teacherReview.listView.classList.remove('hidden');
    teacherReview.detailView.classList.add('hidden');
    showScreen('teacherReview');
}


async function reviewSpecificSession(sessionIndex: number) {
    reviewingSessionIndex = sessionIndex;
    const state = await loadState(reviewingStudentId);
    const session = state.completedSimulations[sessionIndex];
    if (!session) return;
    
    teacherReview.studentName.textContent = reviewingStudentName;
    teacherReview.problemDisplay.textContent = session.title;
    
    const lastModelResponse = rebuildUiFromState(teacherReview.chatContainer, session.history, true);
    if(lastModelResponse) {
        updateGraphs(teacherReview.feedbackSection, lastModelResponse.scoring, lastModelResponse.clientImpact, lastModelResponse.feedback);
    }

    teacherReview.listView.classList.add('hidden');
    teacherReview.detailView.classList.remove('hidden');
}


// --- Analysis Screen Logic ---
async function handleAnalyzeTranscript() {
    const transcript = analysis.transcriptInput.value.trim();
    if (!transcript) {
        showNotification("Lütfen analiz için bir transkript girin.", 3000, 'error');
        return;
    }

    // @ts-ignore
    if (!process.env.API_KEY) {
        analysis.output.innerHTML = `<p class="text-red-500">Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.</p>`;
        return;
    }

    showLoader(analysis.output, "Transkript analiz ediliyor...");
    analysis.analyzeButton.setAttribute('disabled', 'true');
    analysis.analyzeButton.innerHTML = `<span>Analiz Ediliyor...</span>`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
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
                        keyMomentsAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["overallSummary", "strengths", "areasForImprovement", "keyMomentsAnalysis"]
                }
            }
        });

        const data = JSON.parse(response.text);
        currentAnalysisCache = { transcript, analysis: data }; // Cache the analysis

        analysis.output.innerHTML = `
            <h4>Genel Özet</h4>
            <p>${data.overallSummary}</p>
            <h4 class="mt-4">Güçlü Yönler</h4>
            <ul>${data.strengths.map((s: string) => `<li>• ${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Geliştirilebilecek Alanlar</h4>
            <ul>${data.areasForImprovement.map((s: string) => `<li>• ${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Kritik Anların Analizi</h4>
            <ul>${data.keyMomentsAnalysis.map((s: string) => `<li>• ${s}</li>`).join('')}</ul>
        `;
        analysis.sendButton.classList.remove('hidden');

    } catch (error) {
        console.error("Error analyzing transcript:", error);
        const errorString = String(error);
        let errorMessage = "Analiz sırasında bir hata oluştu.";
        if (errorString.includes("API_KEY_INVALID") || errorString.includes("API key not valid")) {
             errorMessage = "Yapay zeka servisi doğru yapılandırılmamış. Lütfen site yöneticisi ile iletişime geçin.";
        }
        analysis.output.innerHTML = `<p class="text-red-500">${errorMessage}</p>`;
    } finally {
        analysis.analyzeButton.removeAttribute('disabled');
        analysis.analyzeButton.innerHTML = `<span class="material-symbols-outlined mr-2">psychology</span><span>Yapay Zeka ile Analiz Et</span>`;
    }
}


// --- Other Functions ---
async function archiveCurrentSimulation(studentId: string) {
    const state = await loadState(studentId);
    if (!state.simulation.currentProblem) return;

    const finalScores = calculateAverageScores(state.simulation.conversationHistory);
    state.completedSimulations.push({
        scenarioId: state.simulation.currentScenarioId,
        title: state.simulation.currentProblem,
        finalScores,
        completionDate: new Date().toISOString(),
        history: state.simulation.conversationHistory,
    });
    
    // Reset current simulation state
    state.simulation.currentProblem = '';
    state.simulation.currentScenarioId = '';
    state.simulation.conversationHistory = [];

    await saveState(studentId, state);
    await checkAndAwardAchievements(studentId);
}


// --- Event Listeners ---
function setupEventListeners() {
    loginButton.addEventListener('click', handleLogin);
    teacherLoginButton.addEventListener('click', handleTeacherLogin);
    registerButton.addEventListener('click', handleRegister);
    logoutButton.addEventListener('click', logout);

    showRegisterView.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        teacherLoginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });

    showLoginView.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        teacherLoginView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });
    
    showTeacherLoginView.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        registerView.classList.add('hidden');
        teacherLoginView.classList.remove('hidden');
    });

    showStudentLoginView.addEventListener('click', (e) => {
        e.preventDefault();
        teacherLoginView.classList.add('hidden');
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });


    problemSelectionContainer.addEventListener('click', handleProblemSelect);
    simulation.optionsContainer.addEventListener('click', handleOptionSelect);

    saveProgressButton.addEventListener('click', async () => {
        await archiveCurrentSimulation(currentUserId);
        await populateStudentDashboard();
        showScreen('studentDashboard');
        showNotification('İlerlemeniz başarıyla kaydedildi!', 3000);
    });

    backToSelectionButton.addEventListener('click', () => showScreen('problemSelection'));
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    // analysis.backButton.addEventListener('click', () => showScreen('studentDashboard')); // Replaced by Nav
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.sendButton.addEventListener('click', async () => {
        if(currentAnalysisCache) {
            const state = await loadState(currentUserId);
            state.uploadedSessions.push({
                id: `upload_${Date.now()}`,
                studentId: currentUserId,
                ...currentAnalysisCache,
                teacherFeedback: '',
                timestamp: new Date().toISOString()
            });
            await saveState(currentUserId, state);
            showNotification("Analiz başarıyla öğretmene gönderildi!", 3000);
            showScreen('studentDashboard');
            currentAnalysisCache = null; // Clear cache
        }
    });

    teacherQASystem.button.addEventListener('click', async () => {
        const questionText = teacherQASystem.input.value.trim();
        if(!questionText) return;

        const state = await loadState(currentUserId);
        const newQuestion = {
            id: `q_${Date.now()}`,
            studentId: currentUserId,
            text: questionText,
            timestamp: new Date().toISOString()
        };
        state.teacherComms.questions.push(newQuestion);
        await saveState(currentUserId, state);
        
        appendMessage(teacherQASystem.history, 'student_question', questionText);
        teacherQASystem.input.value = '';
        showNotification("Sorunuz öğretmene iletildi.", 3000);
    });
    
    mainNav.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const navButton = target.closest('.nav-link') as HTMLButtonElement | null;
        if (!navButton) return;

        const screen = navButton.dataset.screen as keyof typeof screens | undefined;
        const tab = navButton.dataset.tab;

        if (screen) {
            showScreen(screen);
        } else if (tab) {
            setActiveTeacherTab(tab);
            showScreen('teacherDashboard'); // Always show the main dashboard container
        }
    });

    
    teacherDashboard.contents.requests.addEventListener('click', handleApprovalAction);
    teacherDashboard.contents.simulations.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const summaryButton = target.closest('.view-summary-button') as HTMLElement;
        const sessionsButton = target.closest('.view-sessions-button') as HTMLElement;

        if (summaryButton) {
            const studentId = summaryButton.dataset.studentId;
            const studentName = summaryButton.dataset.studentName;
            if (studentId && studentName) handleViewSummary(studentId, studentName);
        }
        if (sessionsButton) {
            const studentId = sessionsButton.dataset.studentId;
            const studentName = sessionsButton.dataset.studentName;
            if (studentId && studentName) displayStudentSessionsForReview(studentId, studentName);
        }
    });

    teacherReview.screen.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const specificSessionButton = target.closest('.review-specific-session-button');
        const addCommentButton = target.closest('.add-inline-comment-button');
        const submitCommentButton = target.closest('.submit-inline-comment');

        if (specificSessionButton) {
            const sessionIndex = parseInt((specificSessionButton as HTMLElement).dataset.sessionIndex!, 10);
            reviewSpecificSession(sessionIndex);
        }

        if (addCommentButton) {
            const turnId = (addCommentButton as HTMLElement).dataset.turnId;
            if (turnId) {
                const commentInputDiv = document.getElementById(`comment-input-${turnId}`);
                commentInputDiv?.classList.toggle('hidden');
            }
        }

        if (submitCommentButton) {
            const turnId = (submitCommentButton as HTMLElement).dataset.turnId;
            const commentInput = submitCommentButton.previousElementSibling as HTMLInputElement;
            const commentText = commentInput.value.trim();
            if (turnId && commentText) {
                const success = await addTeacherComment(reviewingStudentId, reviewingSessionIndex, turnId, commentText);
                if (success) {
                    showNotification("Yorum başarıyla eklendi.", 2000);
                    await reviewSpecificSession(reviewingSessionIndex); // Refresh the view
                } else {
                    showNotification("Yorum eklenirken hata oluştu.", 3000, 'error');
                }
            }
        }
    });
    
    teacherReview.submitFeedbackButton.addEventListener('click', async () => {
        const feedbackText = teacherReview.feedbackInput.value.trim();
        if (feedbackText) {
            const success = await addGeneralFeedback(reviewingStudentId, reviewingSessionIndex, feedbackText);
            if(success) {
                showNotification("Genel geri bildirim eklendi.", 2000);
                teacherReview.feedbackInput.value = '';
                await reviewSpecificSession(reviewingSessionIndex); // Refresh view to show feedback
            } else {
                 showNotification("Geri bildirim eklenirken hata oluştu.", 3000, 'error');
            }
        }
    });

    teacherReview.backToDashboardButton.addEventListener('click', () => {
        setActiveTeacherTab('simulations'); // Go back to the student list
        showScreen('teacherDashboard');
    });
    teacherReview.backToSessionListButton.addEventListener('click', () => displayStudentSessionsForReview(reviewingStudentId, reviewingStudentName));

    rationaleModal.closeButton.addEventListener('click', () => hideModal('rationale'));
    summaryModal.closeButton.addEventListener('click', () => hideModal('summary'));
    simulation.chatContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.rationale-button');
        if (button) {
            const rationale = button.getAttribute('data-rationale');
            showModal('rationale', 'Terapötik Gerekçe', rationale || 'Gerekçe bulunamadı.');
        }
    });
}

// --- App Initialization ---
async function initializeApp() {
    setupEventListeners();

    // Proactive check for Firebase configuration
    if (fb.firebaseConfig.apiKey === "YOUR_API_KEY") {
        alert("UYARI: Firebase yapılandırması tamamlanmamış. Lütfen 'firebase.ts' dosyasını kendi proje bilgilerinizle güncelleyin. Aksi takdirde uygulama çalışmayacaktır.");
        return;
    }

    // Initial population of scenarios
    const defaultContainer = document.getElementById('default-scenarios-container')!;
    defaultContainer.innerHTML = defaultScenarios.map(s => `
        <button class="problem-button group" data-scenario-id="${s.id}">
            <h4 class="text-lg font-bold text-gray-800 group-hover:text-white">${s.title}</h4>
            <p class="text-sm text-gray-600 group-hover:text-indigo-200 mt-1">${s.description}</p>
        </button>
    `).join('');

    // --- Unified & Robust Authentication Gatekeeper ---
    fb.onAuthStateChanged(async (user) => {
        const teacherSession = JSON.parse(sessionStorage.getItem(TEACHER_SESSION_KEY) || 'null');

        // Priority 1: Check for an active teacher session
        if (teacherSession && teacherSession.type === 'teacher') {
            currentStudentName = 'Öğretmen Hesabı';
            studentInfo.innerHTML = `<span class="material-symbols-outlined text-amber-600">school</span><span id="student-name-display" class="font-semibold text-gray-800">${currentStudentName}</span>`;
            studentInfo.classList.remove('hidden');
            logoutButton.classList.remove('hidden');
            populateTeacherNav();
            await populateTeacherDashboard();
            setActiveTeacherTab(activeTeacherTab || 'requests');
            showScreen('teacherDashboard');
        } 
        // Priority 2: Check for a logged-in Firebase user (student)
        else if (user) {
            const userData = await fb.getUserData(user.uid);
            if (userData && userData.status === 'approved') {
                currentUserId = user.uid;
                currentStudentName = userData.username;
                studentInfo.innerHTML = `<span class="material-symbols-outlined">person</span><span id="student-name-display" class="font-semibold">${currentStudentName}</span>`;
                studentInfo.classList.remove('hidden');
                logoutButton.classList.remove('hidden');
                populateStudentNav();
                await populateStudentDashboard();
                showScreen('studentDashboard');
            } else {
                 // Student is not approved or data is missing. Sign them out.
                 // This will trigger onAuthStateChanged again with user=null.
                 await fb.logoutUser();
            }
        } 
        // Priority 3: No one is logged in
        else {
            currentUserId = '';
            currentStudentName = '';
            showScreen('login');
            loginError.textContent = '';
            loginError.classList.add('hidden');
            studentInfo.classList.add('hidden');
            logoutButton.classList.add('hidden');
            mainNav.classList.add('hidden');
            mainNav.innerHTML = '';
            backToSelectionButton.classList.add('hidden');
            saveProgressButton.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
