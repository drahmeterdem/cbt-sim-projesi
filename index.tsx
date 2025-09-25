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
    id: string;
    title: string;
    url: string;
    type: 'article' | 'video' | 'pdf';
    associatedScenarioIds: string[];
}

// --- Gemini AI Client Initialization ---
// @ts-ignore
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// --- Global State & Constants ---
let currentStudentName: string = '';
let currentUserId: string = ''; // Will now store username
let reviewingStudentName: string = '';
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'requests'; // Default to requests for teacher workflow
let currentAnalysisCache: { transcript: string; analysis: any } | null = null;

const TEACHER_PASSWORD = 'teacher3243';
const USERS_KEY = 'cbt_sim_users_v2'; // v2 includes approval status
const SESSION_KEY = 'cbt_sim_session_v1';


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
    analyzeButton: document.getElementById('analyze-transcript-button')!,
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
    studentName: document.getElementById('review-student-name')!,
    problemDisplay: document.getElementById('review-problem-display')!,
    chatContainer: document.getElementById('review-chat-container')!,
    feedbackSection: document.getElementById('review-feedback-section')!,
    feedbackInput: document.getElementById('feedback-input') as HTMLInputElement,
    submitFeedbackButton: document.getElementById('submit-feedback-button')!,
    backButton: document.getElementById('back-to-dashboard-button')!,
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
        completedSimulations: [] as any[], // {scenarioId, title, finalScores, completionDate}
        teacherComms: {
            questions: [] as any[], // {id, text, timestamp}
            answers: [] as any[]    // {questionId, text, timestamp}
        },
        uploadedSessions: [] as any[], // {id, transcript, aiAnalysis, teacherFeedback, timestamp, status}
        achievements: [] as string[] // Array of achievement IDs
    };
}

function saveState(studentId: string, state: object) {
    if (!studentId) return;
    localStorage.setItem(`cbt_sim_state_v4_${studentId}`, JSON.stringify(state));
}

function loadState(studentId: string): ReturnType<typeof getInitialState> {
    const savedState = localStorage.getItem(`cbt_sim_state_v4_${studentId}`);
    const initialState = getInitialState();
    if (savedState) {
        const parsedState = JSON.parse(savedState);
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

function checkAndAwardAchievements(studentId: string) {
    const state = loadState(studentId);
    let newAchievements = false;
    ALL_ACHIEVEMENTS.forEach(ach => {
        if (!state.achievements.includes(ach.id) && ach.criteria(state)) {
            state.achievements.push(ach.id);
            showNotification(`Yeni Başarı Kazandın: ${ach.name}!`, 5000);
            newAchievements = true;
        }
    });
    if (newAchievements) {
        saveState(studentId, state);
    }
}


// --- UI Helper Functions ---

function showScreen(screenId: keyof typeof screens) {
    Object.values(screens).forEach(screen => screen.classList.add('hidden'));
    screens[screenId].classList.remove('hidden');
    currentScreen = screenId;
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
                <input type="text" placeholder="Yorum ekle..." class="flex-grow rounded-lg border-gray-300 shadow-sm text-sm">
                <button class="submit-inline-comment rounded-lg px-3 bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all">Gönder</button>
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

// --- Simulation Logic ---

async function getAiResponse() {
    const state = loadState(currentUserId);
    const scenario = getAllScenarios().find(s => s.id === state.simulation.currentScenarioId);
    
    showLoader(simulation.optionsContainer, "Elif düşünüyor...");

    let dynamicSystemInstruction = `${simulationSystemInstruction} Mevcut sorun alanı: ${state.simulation.currentProblem}.`;
    if (scenario?.isCustom && scenario.profile) {
        dynamicSystemInstruction += ` Danışan profili: ${scenario.profile}`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...state.simulation.conversationHistory.filter((h: any) => h.role !== 'teacher_feedback').map(h => ({role: h.role, parts: h.parts}))],
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
        state.simulation.conversationHistory.push({ id: turnId, role: 'model', parts: [{ text: JSON.stringify(data) }], teacherComment: '' });
        appendMessage(simulation.chatContainer, 'client', data.clientResponse, { rationale: data.rationale, turnId });
        displayOptions(data.therapistOptions);
        simulation.feedbackText.textContent = data.feedback;
        updateGraphs(simulation.feedbackSection, data.scoring, data.clientImpact, data.feedback);

        saveState(currentUserId, state);
    } catch (error) {
        console.error("Error generating AI response:", error);
        simulation.optionsContainer.innerHTML = `<p class="text-red-500 text-center col-span-1 md:col-span-2">${error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}</p>`;
    }
}

async function handleOptionSelect(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.option-button') as HTMLButtonElement | null;
    if (!button) return;

    const therapistMessage = button.dataset.description || '';
    const turnId = `turn_${Date.now()}`;
    appendMessage(simulation.chatContainer, 'therapist', therapistMessage, { turnId });
    
    const state = loadState(currentUserId);
    state.simulation.conversationHistory.push({ id: turnId, role: 'user', parts: [{ text: therapistMessage }], teacherComment: '' });
    saveState(currentUserId, state);
    
    simulation.feedbackSection.classList.add('hidden');
    await getAiResponse();
}

async function startSimulation(scenarioId: string) {
    const scenario = getAllScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;

    // If there's an unfinished simulation, archive it before starting a new one.
    const oldState = loadState(currentUserId);
    if (oldState.simulation && oldState.simulation.currentProblem) {
        archiveCurrentSimulation(currentUserId);
    }

    // Proceed with the new simulation, loading the state again as it has been modified.
    const state = loadState(currentUserId);
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
    state.simulation.conversationHistory.push({ id: turnId, role: 'user', parts: [{ text: `Merhaba, bugün ${scenario.title} üzerine konuşmak için buradayım. Lütfen danışan olarak başla.` }], teacherComment: '' });
    saveState(currentUserId, state);
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
        if (turn.role === 'user') {
            if(!turn.parts[0].text.includes('Lütfen danışan olarak başla.')) {
                 appendMessage(container, 'therapist', turn.parts[0].text, { turnId: turn.id, teacherComment: turn.teacherComment, isReview });
            }
        } else if (turn.role === 'model') {
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

function handleRegister() {
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
    if (password !== confirmPassword) {
        registerError.textContent = 'Şifreler eşleşmiyor.';
        registerError.classList.remove('hidden');
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (users[username]) {
        registerError.textContent = 'Bu kullanıcı adı zaten alınmış.';
        registerError.classList.remove('hidden');
        return;
    }

    users[username] = { password: password, status: 'pending' }; // Add with pending status
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

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
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
}

function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    loginError.classList.add('hidden');

    if (!username || !password) {
        loginError.textContent = 'Lütfen kullanıcı adı ve şifrenizi girin.';
        loginError.classList.remove('hidden');
        return;
    }

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    const user = users[username];

    if (user && user.password === password) {
        if (user.status === 'approved') {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'student', username: username }));
            location.reload();
        } else if (user.status === 'pending') {
            loginError.textContent = 'Hesabınız öğretmen onayını bekliyor.';
            loginError.classList.remove('hidden');
        } else if (user.status === 'rejected') {
            loginError.textContent = 'Hesap kaydınız reddedildi.';
            loginError.classList.remove('hidden');
        } else {
             loginError.textContent = 'Geçersiz kullanıcı durumu. Lütfen yöneticiyle iletişime geçin.';
             loginError.classList.remove('hidden');
        }
    } else {
        loginError.textContent = 'Geçersiz kullanıcı adı veya şifre.';
        loginError.classList.remove('hidden');
    }
}

function handleTeacherLogin() {
    const password = teacherPasswordInput.value;
    teacherLoginError.classList.add('hidden');

    if (password === TEACHER_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'teacher', username: 'Öğretmen' }));
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
        if (turn.role === 'model') {
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

function generateAndDisplayRecommendations(studentId: string) {
    const state = loadState(studentId);
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

function displayAchievements(studentId: string) {
    const state = loadState(studentId);
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


function populateStudentDashboard() {
    if (!currentUserId) return;
    const state = loadState(currentUserId);
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
    generateAndDisplayRecommendations(currentUserId);
    displayAchievements(currentUserId);

    // QA History
    teacherQASystem.history.innerHTML = ''; // Populate this from state
}


// --- Teacher Dashboard ---

function handleApprovalAction(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.approve-button, .reject-button') as HTMLButtonElement | null;
    if (!button) return;

    const studentId = button.dataset.studentId!;
    const action = button.dataset.action!;

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (users[studentId]) {
        users[studentId].status = action === 'approve' ? 'approved' : 'rejected';
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        showNotification(`Öğrenci ${action === 'approve' ? 'onaylandı' : 'reddedildi'}.`, 3000, 'success');
        populateTeacherDashboard(); // Refresh the list
    }
}


function setActiveTeacherTab(tabName: string) {
    activeTeacherTab = tabName;
    teacherDashboard.tabs.forEach(t => t.classList.remove('border-indigo-500', 'text-indigo-600'));
    const activeTab = document.querySelector(`.teacher-tab[data-tab="${tabName}"]`);
    activeTab?.classList.add('border-indigo-500', 'text-indigo-600');
    
    Object.values(teacherDashboard.contents).forEach(content => content.classList.add('hidden'));
    const activeContent = teacherDashboard.contents[tabName as keyof typeof teacherDashboard.contents];
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

function populateTeacherDashboard() {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    const allStudents = Object.entries(users);

    // Tab 1: Requests
    const pendingStudents = allStudents.filter(([, user]: [string, any]) => user.status === 'pending');
    let requestsHtml = '<div class="bg-white/70 p-6 rounded-2xl shadow-xl space-y-4">';
    if (pendingStudents.length === 0) {
        requestsHtml += '<p class="text-center text-gray-500 py-4">Onay bekleyen öğrenci bulunmuyor.</p>';
    } else {
         requestsHtml += pendingStudents.map(([username]) => `
            <div class="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                <span class="font-semibold text-gray-800">${username}</span>
                <div class="flex gap-2">
                    <button data-student-id="${username}" data-action="approve" class="approve-button bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors text-sm font-semibold">Onayla</button>
                    <button data-student-id="${username}" data-action="reject" class="reject-button bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors text-sm font-semibold">Reddet</button>
                </div>
            </div>
        `).join('');
    }
    requestsHtml += '</div>';
    teacherDashboard.contents.requests.innerHTML = requestsHtml;

    // Tab 2: Simulations
    let simulationsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
    const approvedStudents = allStudents.filter(([, user]: [string, any]) => user.status === 'approved');
    if (approvedStudents.length === 0) {
        simulationsHtml = '<p class="text-center text-gray-500 py-8 col-span-full">Henüz onaylanmış öğrenci bulunmuyor.</p>';
    } else {
        for (const [username] of approvedStudents) {
            const studentState = loadState(username as string);
            const completedCount = studentState.completedSimulations.length;
            simulationsHtml += `
                 <div class="bg-white/80 p-5 rounded-xl shadow-lg">
                    <h4 class="font-bold text-lg text-gray-800">${username}</h4>
                    <p class="text-gray-600 text-sm">${completedCount} seans tamamladı.</p>
                    <div class="mt-4 flex gap-2">
                        <button data-student-id="${username}" class="view-sessions-button flex-1 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors text-sm font-semibold">Seansları Görüntüle</button>
                        <button data-student-id="${username}" class="view-summary-button bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm font-semibold">AI Özet</button>
                    </div>
                </div>`;
        }
    }
    simulationsHtml += '</div>';
    teacherDashboard.contents.simulations.innerHTML = simulationsHtml;
}


// --- Other Functions ---
function archiveCurrentSimulation(studentId: string) {
    const state = loadState(studentId);
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

    saveState(studentId, state);
    checkAndAwardAchievements(studentId);
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

    saveProgressButton.addEventListener('click', () => {
        archiveCurrentSimulation(currentUserId);
        populateStudentDashboard();
        showScreen('studentDashboard');
        showNotification('İlerlemeniz başarıyla kaydedildi!', 3000);
    });

    backToSelectionButton.addEventListener('click', () => showScreen('problemSelection'));
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    analysis.backButton.addEventListener('click', () => showScreen('studentDashboard'));

    teacherDashboard.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = (tab as HTMLElement).dataset.tab!;
            setActiveTeacherTab(tabName);
        });
    });
    
    teacherDashboard.contents.requests.addEventListener('click', handleApprovalAction);


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
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');

    if (session) {
        currentUserId = session.username;
        currentStudentName = session.username;

        studentInfo.innerHTML = `<span class="material-symbols-outlined">person</span><span id="student-name-display" class="font-semibold">${currentStudentName}</span>`;
        studentInfo.classList.remove('hidden');
        logoutButton.classList.remove('hidden');
        
        if(session.type === 'teacher') {
            populateTeacherDashboard();
            setActiveTeacherTab('requests'); // Default to requests
            showScreen('teacherDashboard');
        } else { // student
            populateStudentDashboard();
            showScreen('studentDashboard');
        }
    } else {
        // No active session
        showScreen('login');
        studentInfo.classList.add('hidden');
        logoutButton.classList.add('hidden');
        backToSelectionButton.classList.add('hidden');
        saveProgressButton.classList.add('hidden');
    }


    // Initial population of scenarios
    const defaultContainer = document.getElementById('default-scenarios-container')!;
    defaultContainer.innerHTML = defaultScenarios.map(s => `
        <button class="problem-button group" data-scenario-id="${s.id}">
            <h4 class="text-lg font-bold text-gray-800 group-hover:text-white">${s.title}</h4>
            <p class="text-sm text-gray-600 group-hover:text-indigo-200 mt-1">${s.description}</p>
        </button>
    `).join('');
});
