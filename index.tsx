// --- Gemini AI Client and Type Imports ---
import { GoogleGenAI, Type } from "@google/genai";

// --- Type Definitions ---
interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: 'student' | 'teacher';
    status: 'pending' | 'approved';
}

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

// --- App State ---
let currentUserId: string | null = null;
let currentUserProfile: UserProfile | null = null;
let reviewingStudentId: string | null = null;
let currentScreen: keyof typeof screens | null = null;
let activeTeacherTab: string = 'simulations';
let currentAnalysisCache: { transcript: string; analysis: any } | null = null;

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
const homeButton = document.getElementById('home-button')!;
const backToSelectionButton = document.getElementById('back-to-selection-button')!;
const notificationContainer = document.getElementById('notification-container')!;

// Login/Register Screen
const loginView = document.getElementById('login-view')!;
const registerView = document.getElementById('register-view')!;
const showRegisterView = document.getElementById('show-register-view')!;
const showLoginView = document.getElementById('show-login-view')!;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const passwordInput = document.getElementById('password-input') as HTMLInputElement;
const loginButton = document.getElementById('login-button')!;
const registerDisplayNameInput = document.getElementById('register-display-name-input') as HTMLInputElement;
const registerEmailInput = document.getElementById('register-email-input') as HTMLInputElement;
const registerPasswordInput = document.getElementById('register-password-input') as HTMLInputElement;
const registerConfirmPasswordInput = document.getElementById('register-confirm-password-input') as HTMLInputElement;
const registerButton = document.getElementById('register-button')!;
const loginError = document.getElementById('login-error')!;
const registerError = document.getElementById('register-error')!;
const registerSuccess = document.getElementById('register-success')!;

// Teacher Login
const showTeacherLogin = document.getElementById('show-teacher-login')!;
const teacherLoginForm = document.getElementById('teacher-login-form')!;
const teacherPasswordInput = document.getElementById('teacher-password-input') as HTMLInputElement;
const teacherLoginButton = document.getElementById('teacher-login-button')!;

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
    requestsCountBadge: document.getElementById('requests-count-badge')!,
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
4.  **keyMomentsAnalysis:** Transkriptteki 2-3 kritik anı belirle. Bu anlarda terapistin müdahalesini, bu müdahalesinin potentsiyel etkilerini ve alternatif yaklaşımları analiz et.`;

const studentSummarySystemInstruction = `Sen, BDT alanında uzman bir eğitim süpervizörüsün. Sana bir öğrencinin birden fazla simülasyon seansındaki konuşma kayıtları verilecek. Görevin, bu kayıtlara dayanarak öğrencinin genel performansı hakkında kapsamlı bir özet ve yapıcı geri bildirim oluşturmaktır.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin, açıklama veya kod bloğu içermemelidir. Analizini aşağıdaki başlıklara göre yapılandır:
1.  **overallPerformanceSummary:** Öğrencinin genel yetkinliği, yaklaşımı ve zaman içindeki gelişimi hakkında kısa bir yönetici özeti.
2.  **recurringStrengths:** Öğrencinin simülasyonlar boyunca tutarlı bir şekilde sergilediği güçlü yönler ve beceriler. Maddeler halinde listele.
3.  **patternsForImprovement:** Öğrencinin tekrar eden zorlukları, geliştirmesi gereken beceriler veya kaçındığı müdahaleler. Maddeler halinde listele.
4.  **actionableSuggestions:** Öğrencinin gelişimini desteklemek için 2-3 adet somut, eyleme geçirilebilir öneri (örn: "Sokratik sorgulama tekniğini daha derinden keşfetmek için 'X' senaryosunu tekrar deneyebilir.", "Danışan direnciyle karşılaştığında verdiği tepkileri gözden geçirmesi faydalı olacaktır.").`;


// --- Firebase Data Management ---

function getStudentStateDocRef(studentId: string) {
    return doc(db, 'studentStates', studentId);
}

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

async function saveState(studentId: string, state: object) {
    if (!studentId) return;
    await setDoc(getStudentStateDocRef(studentId), state, { merge: true });
}

async function loadState(studentId: string): Promise<ReturnType<typeof getInitialState>> {
    const docRef = getStudentStateDocRef(studentId);
    const docSnap = await getDoc(docRef);
    const initialState = getInitialState();

    if (docSnap.exists()) {
        const parsedState = docSnap.data();
         return {
            ...initialState,
            ...parsedState,
            simulation: { ...initialState.simulation, ...(parsedState.simulation || {}) },
            teacherComms: { ...initialState.teacherComms, ...(parsedState.teacherComms || {}) },
            uploadedSessions: parsedState.uploadedSessions || initialState.uploadedSessions,
            completedSimulations: parsedState.completedSimulations || initialState.completedSimulations,
            achievements: parsedState.achievements || initialState.achievements,
        };
    } else {
        await setDoc(docRef, initialState);
        return initialState;
    }
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

async function getCustomScenarios(): Promise<Scenario[]> {
    const q = query(collection(db, "scenarios"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scenario));
}

async function saveCustomScenario(scenario: Omit<Scenario, 'id' | 'isCustom'>): Promise<string> {
    const docRef = await addDoc(collection(db, "scenarios"), { ...scenario, isCustom: true });
    return docRef.id;
}

async function deleteCustomScenario(id: string) {
    await deleteDoc(doc(db, "scenarios", id));
}

async function getAllScenarios(): Promise<Scenario[]> {
    const custom = await getCustomScenarios();
    return [...defaultScenarios, ...custom];
}

// --- Resource Library Management ---
async function getResourceLibrary(): Promise<Resource[]> {
     const q = query(collection(db, "resources"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource));
}

async function saveResource(resource: Omit<Resource, 'id'>) {
    await addDoc(collection(db, "resources"), resource);
}

async function deleteResource(id: string) {
     await deleteDoc(doc(db, "resources", id));
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

function showNotification(message: string, duration: number = 3000) {
    const notification = document.createElement('div');
    notification.className = 'bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg animate-fade-in-up';
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

async function callApiProxy(endpoint: string, body: object) {
    const response = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API proxy error');
    }

    return response.json();
}


async function getAiResponse() {
    if (!currentUserId) return;
    const state = await loadState(currentUserId);
    const allScenarios = await getAllScenarios();
    const scenario = allScenarios.find(s => s.id === state.simulation.currentScenarioId);
    
    showLoader(simulation.optionsContainer, "Elif düşünüyor...");

    let dynamicSystemInstruction = `${simulationSystemInstruction} Mevcut sorun alanı: ${state.simulation.currentProblem}.`;
    if (scenario?.isCustom && scenario.profile) {
        dynamicSystemInstruction += ` Danışan profili: ${scenario.profile}`;
    }

    try {
        const payload = {
            history: [...state.simulation.conversationHistory.filter((h: any) => h.role !== 'teacher_feedback').map(h => ({role: h.role, parts: h.parts}))],
            systemInstruction: dynamicSystemInstruction,
            schema: {
                type: Type.OBJECT, properties: { clientResponse: { type: Type.STRING }, feedback: { type: Type.STRING }, rationale: { type: Type.STRING }, scoring: { type: Type.OBJECT, properties: { empathy: { type: Type.NUMBER }, technique: { type: Type.NUMBER }, rapport: { type: Type.NUMBER }, }, required: ["empathy", "technique", "rapport"], }, clientImpact: { type: Type.OBJECT, properties: { emotionalRelief: { type: Type.NUMBER }, cognitiveClarity: { type: Type.NUMBER }, }, required: ["emotionalRelief", "cognitiveClarity"], }, therapistOptions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, }, required: ["title", "description"], }, }, }, required: ["clientResponse", "feedback", "rationale", "scoring", "clientImpact", "therapistOptions"],
            }
        };

        const data = await callApiProxy('gemini-proxy', payload);

        const turnId = `turn_${Date.now()}`;
        state.simulation.conversationHistory.push({ id: turnId, role: 'model', parts: [{ text: JSON.stringify(data) }], teacherComment: '' });
        appendMessage(simulation.chatContainer, 'client', data.clientResponse, { rationale: data.rationale, turnId });
        displayOptions(data.therapistOptions);
        simulation.feedbackText.textContent = data.feedback;
        updateGraphs(simulation.feedbackSection, data.scoring, data.clientImpact, data.feedback);

        await saveState(currentUserId, state);
    } catch (error) {
        console.error("Error generating AI response:", error);
        simulation.optionsContainer.innerHTML = `<p class="text-red-500 text-center col-span-1 md:col-span-2">${error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.'}</p>`;
    }
}

async function handleOptionSelect(event: Event) {
    if (!currentUserId) return;
    const target = event.target as HTMLElement;
    const button = target.closest('.option-button') as HTMLButtonElement | null;
    if (!button) return;

    const therapistMessage = button.dataset.description || '';
    const turnId = `turn_${Date.now()}`;
    appendMessage(simulation.chatContainer, 'therapist', therapistMessage, { turnId });
    
    const state = await loadState(currentUserId);
    state.simulation.conversationHistory.push({ id: turnId, role: 'user', parts: [{ text: therapistMessage }], teacherComment: '' });
    await saveState(currentUserId, state);
    
    simulation.feedbackSection.classList.add('hidden');
    await getAiResponse();
}

async function startSimulation(scenarioId: string) {
    if (!currentUserId) return;
    const allScenarios = await getAllScenarios();
    const scenario = allScenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const oldState = await loadState(currentUserId);
    if (oldState.simulation && oldState.simulation.currentProblem) {
        await archiveCurrentSimulation(currentUserId);
    }

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
    state.simulation.conversationHistory.push({ id: turnId, role: 'user', parts: [{ text: `Merhaba, bugün ${scenario.title} üzerine konuşmak için buradayım. Lütfen danışan olarak başla.` }], teacherComment: '' });
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

async function handleRegister() {
    const displayName = registerDisplayNameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerConfirmPasswordInput.value;
    
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');

    if (!displayName || !email || !password) {
        registerError.textContent = 'Tüm alanlar zorunludur.';
        registerError.classList.remove('hidden');
        return;
    }
    if (password !== confirmPassword) {
        registerError.textContent = 'Şifreler eşleşmiyor.';
        registerError.classList.remove('hidden');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });

        const userProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: displayName,
            role: 'student',
            status: 'pending'
        };
        await setDoc(doc(db, "users", user.uid), userProfile);

        registerSuccess.textContent = 'Kayıt başarılı! Öğretmeninizin onayı sonrası giriş yapabilirsiniz.';
        registerSuccess.classList.remove('hidden');
        registerDisplayNameInput.value = '';
        registerEmailInput.value = '';
        registerPasswordInput.value = '';
        registerConfirmPasswordInput.value = '';

        setTimeout(() => {
            registerView.classList.add('hidden');
            loginView.classList.remove('hidden');
        }, 3000);

    } catch(error: any) {
        console.error("Registration Error: ", error);
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = 'Bu e-posta adresi zaten kullanılıyor.';
        } else {
            registerError.textContent = 'Kayıt sırasında bir hata oluştu.';
        }
        registerError.classList.remove('hidden');
    }
}

async function logout() {
    await signOut(auth);
    showScreen('login');
    studentInfo.classList.add('hidden');
    homeButton.classList.add('hidden');
    backToSelectionButton.classList.add('hidden');
    saveProgressButton.classList.add('hidden');
    currentUserId = null;
    currentUserProfile = null;
    reviewingStudentId = null;
    usernameInput.value = '';
    passwordInput.value = '';
    teacherPasswordInput.value = '';
    teacherLoginForm.classList.add('hidden');
    loginError.classList.add('hidden');
    registerError.classList.add('hidden');
    registerSuccess.classList.add('hidden');
}

async function handleLogin() {
    const email = usernameInput.value.trim();
    const password = passwordInput.value;
    
    loginError.classList.add('hidden');

    if (!email || !password) {
        loginError.textContent = 'Lütfen e-posta ve şifrenizi girin.';
        loginError.classList.remove('hidden');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
    } catch(error: any) {
        console.error("Login Error: ", error);
        loginError.textContent = 'Geçersiz e-posta veya şifre.';
        loginError.classList.remove('hidden');
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

async function generateAndDisplayRecommendations(studentId: string) {
    if(!studentId) return;
    const state = await loadState(studentId);
    const container = recommendations.container;
    const allResources = await getResourceLibrary();
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
                <p class="font-semibold text-gray-700">AI Analizi:</p>
                <p class="text-sm text-gray-600 mt-1">BDT tekniği uygulama puanların genel olarak geliştirilebilir görünüyor. Pratik yapmak için öğretmeninin oluşturduğu özel senaryoları denemeni öneririz!</p>
            </div>`;
    }

    if (recommendationsHtml === '') {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">Sana özel öneriler burada görünecek.</p>`;
    } else {
        container.innerHTML = recommendationsHtml;
    }
}


async function populateStudentDashboard() {
    if (!currentUserId || !currentUserProfile) return;
    dashboardStudentName.textContent = currentUserProfile.displayName;
    const state = await loadState(currentUserId);

    // Card 1: Continue Session
    continueSessionCard.innerHTML = ''; // Clear previous content
    if (state.simulation && state.simulation.currentProblem) {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-indigo-500 mb-3">play_circle</span>
            <h3 class="text-xl font-bold text-gray-800">Devam Eden Seans</h3>
            <p class="text-gray-600 mt-2 mb-4">"${state.simulation.currentProblem}" konulu seansınıza kaldığınız yerden devam edin.</p>`;
        
        const button = document.createElement('button');
        button.className = "w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg";
        button.innerHTML = `<span>Devam Et</span>`;
        button.addEventListener('click', continueSimulation);
        continueSessionCard.appendChild(button);
    } else {
        continueSessionCard.innerHTML = `
            <span class="material-symbols-outlined text-5xl text-indigo-500 mb-3">add_circle</span>
            <h3 class="text-xl font-bold text-gray-800">Yeni Simülasyon</h3>
            <p class="text-gray-600 mt-2 mb-4">Pratik yapmak için yeni bir BDT simülasyonu başlatın.</p>`;

        const button = document.createElement('button');
        button.className = "w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg";
        button.innerHTML = `<span>Yeni Seans Başlat</span>`;
        button.addEventListener('click', async () => {
            await renderProblemSelectionScreen();
            showScreen('problemSelection');
        });
        continueSessionCard.appendChild(button);
    }

    // Card 2: Current Session Progress Tracking
    const avgScores = calculateAverageScores(state.simulation.conversationHistory);
    if (state.simulation.conversationHistory.length > 0) { 
        progressTracking.card.classList.remove('hidden');
        progressTracking.container.innerHTML = `
            <div class="w-full"><span class="text-xs font-medium text-gray-500">Empati</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-fuchsia-400 chart-bar" style="width: ${avgScores.empathy * 10}%;">${avgScores.empathy.toFixed(1)}</div></div></div>
            <div class="w-full"><span class="text-xs font-medium text-gray-500">BDT Tekniği</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-amber-400 chart-bar" style="width: ${avgScores.technique * 10}%;">${avgScores.technique.toFixed(1)}</div></div></div>
            <div class="w-full"><span class="text-xs font-medium text-gray-500">İlişki Kurma</span><div class="h-4 bg-gray-200 rounded-full mt-1"><div class="h-4 rounded-full bg-teal-400 chart-bar" style="width: ${avgScores.rapport * 10}%;">${avgScores.rapport.toFixed(1)}</div></div></div>
        `;
    } else {
        progressTracking.container.innerHTML = `<p class="text-center text-gray-500 py-4">Grafikleri görmek için bir simülasyonu tamamlayın.</p>`;
    }

    // Card 3: Cumulative Progress
    if (state.completedSimulations.length > 0) {
        cumulativeProgress.card.classList.remove('hidden');
        let chartHtml = '<div class="space-y-2">';
        state.completedSimulations.forEach((sim, index) => {
            chartHtml += `
                <div>
                    <p class="text-sm font-semibold text-gray-700">${index + 1}. ${sim.title}</p>
                    <div class="flex items-center gap-2 text-xs mt-1">
                        <span class="w-16 text-gray-500">Empati:</span><div class="h-3 flex-1 bg-gray-200 rounded-full"><div class="h-3 rounded-full bg-fuchsia-400" style="width: ${sim.finalScores.empathy * 10}%"></div></div>
                        <span class="w-16 text-gray-500">Teknik:</span><div class="h-3 flex-1 bg-gray-200 rounded-full"><div class="h-3 rounded-full bg-amber-400" style="width: ${sim.finalScores.technique * 10}%"></div></div>
                        <span class="w-16 text-gray-500">İlişki:</span><div class="h-3 flex-1 bg-gray-200 rounded-full"><div class="h-3 rounded-full bg-teal-400" style="width: ${sim.finalScores.rapport * 10}%"></div></div>
                    </div>
                </div>
            `;
        });
        chartHtml += '</div>';
        cumulativeProgress.container.innerHTML = chartHtml;
    } else {
        cumulativeProgress.container.innerHTML = `<p class="text-center text-gray-500 py-4">Genel gelişiminizi görmek için en az bir simülasyonu tamamlayın.</p>`;
    }

    // Section 4: Achievements
    achievements.container.innerHTML = '';
    const earnedAchievements = ALL_ACHIEVEMENTS.filter(ach => state.achievements.includes(ach.id));
    if(earnedAchievements.length > 0) {
        earnedAchievements.forEach(ach => {
            achievements.container.innerHTML += `
                <div class="flex flex-col items-center group cursor-pointer">
                    <span class="material-symbols-outlined text-4xl text-amber-400 group-hover:text-amber-500 transition-colors">${ach.icon}</span>
                    <p class="text-xs text-gray-600 font-semibold mt-1">${ach.name}</p>
                    <p class="text-xs text-gray-500 text-center">${ach.description}</p>
                </div>
            `;
        });
    } else {
        achievements.container.innerHTML = `<p class="col-span-3 text-center text-gray-500 py-4">Rozet kazanmak için simülasyonları tamamlayın!</p>`;
    }

    // Section 5: Smart Recommendations
    await generateAndDisplayRecommendations(currentUserId);


    // Section 6: Teacher Q&A
    teacherQASystem.history.innerHTML = '';
    const allComms = [
        ...state.teacherComms.questions.map(q => ({ ...q, type: 'student_question' })),
        ...state.teacherComms.answers.map(a => ({ ...a, type: 'teacher_answer', timestamp: a.timestamp }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (allComms.length === 0) {
        teacherQASystem.history.innerHTML = `<p class="text-center text-gray-500 py-8">Öğretmeninize bir soru sorarak iletişimi başlatın.</p>`;
    } else {
        allComms.forEach(comm => {
            appendMessage(teacherQASystem.history, comm.type as any, comm.text);
        });
    }
}

async function continueSimulation() {
    if (!currentUserId) return;
    const state = await loadState(currentUserId);
    simulation.problemDisplay.textContent = state.simulation.currentProblem;
    
    const lastModelResponse = rebuildUiFromState(simulation.chatContainer, state.simulation.conversationHistory);
    if (lastModelResponse) {
        displayOptions(lastModelResponse.therapistOptions);
        simulation.feedbackText.textContent = lastModelResponse.feedback;
        updateGraphs(simulation.feedbackSection, lastModelResponse.scoring, lastModelResponse.clientImpact, lastModelResponse.feedback);
    }
    
    showScreen('simulation');
    backToSelectionButton.classList.remove('hidden');
    saveProgressButton.classList.remove('hidden');
}

async function handleAskTeacher() {
    if (!currentUserId) return;
    const questionText = teacherQASystem.input.value.trim();
    if (!questionText) return;

    const state = await loadState(currentUserId);
    const newQuestion = {
        id: `q_${Date.now()}`,
        text: questionText,
        timestamp: new Date().toISOString()
    };
    state.teacherComms.questions.push(newQuestion);
    await saveState(currentUserId, state);
    await checkAndAwardAchievements(currentUserId); // Check for curious_mind achievement
    
    teacherQASystem.input.value = '';
    await populateStudentDashboard(); // Refresh UI
    showNotification("Sorunuz öğretmeninize iletildi!");
}

async function renderProblemSelectionScreen() {
    const defaultContainer = document.getElementById('default-scenarios-container')!;
    const customContainer = document.getElementById('custom-scenarios-container')!;
    const customSection = document.getElementById('custom-scenarios-section')!;

    defaultContainer.innerHTML = '';
    customContainer.innerHTML = '';

    const scenarios = await getAllScenarios();
    const customScenarios = scenarios.filter(s => s.isCustom);

    scenarios.forEach(scenario => {
        const button = document.createElement('button');
        button.className = 'option-button problem-button relative group';
        button.dataset.scenarioId = scenario.id;
        button.innerHTML = `
            ${scenario.isCustom ? '<span class="absolute top-2 right-2 text-xs bg-amber-500 text-white font-semibold px-2 py-1 rounded-full">Öğretmen</span>' : ''}
            <span class="font-semibold block">${scenario.title}</span>
            <span class="text-sm text-gray-500 group-hover:text-indigo-100">${scenario.description}</span>
        `;
        if(scenario.isCustom) {
            customContainer.appendChild(button);
        } else {
            defaultContainer.appendChild(button);
        }
    });
    
    if (customScenarios.length > 0) {
        customSection.classList.remove('hidden');
    } else {
        customSection.classList.add('hidden');
    }
}


// --- Session Analysis Logic ---
async function handleAnalyzeTranscript() {
    const transcript = analysis.transcriptInput.value.trim();
    if (!transcript) {
        alert("Lütfen analiz için bir transkript girin.");
        return;
    }
    showLoader(analysis.output, "Yapay zeka transkripti analiz ediyor...");
    analysis.sendButton.classList.add('hidden');

    try {
        const payload = {
            contents: [{ role: 'user', parts: [{ text: transcript }] }],
            systemInstruction: analysisSystemInstruction,
            schema: {
                type: Type.OBJECT,
                properties: {
                    overallSummary: { type: Type.STRING },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
                    keyMomentsAnalysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { moment: { type: Type.STRING }, analysis: { type: Type.STRING } }, required: ["moment", "analysis"] } },
                },
                required: ["overallSummary", "strengths", "areasForImprovement", "keyMomentsAnalysis"]
            }
        };
        const data = await callApiProxy('gemini-proxy', payload);
        currentAnalysisCache = { transcript, analysis: data }; // Cache result

        let htmlOutput = `<h4 class="font-bold text-lg mb-2">Genel Özet</h4><p class="mb-4">${data.overallSummary}</p>`;
        htmlOutput += `<h4 class="font-bold text-lg mb-2">Güçlü Yönler</h4><ul class="list-disc list-inside mb-4">${data.strengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>`;
        htmlOutput += `<h4 class="font-bold text-lg mb-2">Geliştirilecek Alanlar</h4><ul class="list-disc list-inside mb-4">${data.areasForImprovement.map((a: string) => `<li>${a}</li>`).join('')}</ul>`;
        htmlOutput += `<h4 class="font-bold text-lg mb-2">Kilit Anlar Analizi</h4>`;
        data.keyMomentsAnalysis.forEach((moment: any) => {
            htmlOutput += `<h5 class="font-semibold mt-3">${moment.moment}</h5><p>${moment.analysis}</p>`;
        });
        analysis.output.innerHTML = htmlOutput;
        analysis.sendButton.classList.remove('hidden');

    } catch (error) {
        console.error("Analysis Error:", error);
        analysis.output.innerHTML = `<p class="text-red-500">Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.</p>`;
    }
}

async function handleSendToTeacher() {
    if (!currentAnalysisCache || !currentUserId) return;

    const state = await loadState(currentUserId);
    const newUpload = {
        id: `upload_${Date.now()}`,
        transcript: currentAnalysisCache.transcript,
        aiAnalysis: currentAnalysisCache.analysis,
        teacherFeedback: '',
        timestamp: new Date().toISOString(),
        status: 'pending_review'
    };
    state.uploadedSessions.push(newUpload);
    await saveState(currentUserId, state);
    await checkAndAwardAchievements(currentUserId); // Check for Analyst achievement

    showNotification("Analiz başarıyla öğretmeninize gönderildi!");
    analysis.sendButton.classList.add('hidden');
    analysis.transcriptInput.value = '';
    analysis.output.innerHTML = '<p class="text-gray-500">Analiz sonuçları burada görünecektir...</p>';
    currentAnalysisCache = null;
    
    await populateStudentDashboard();
    showScreen('studentDashboard');
}


// --- Teacher Logic ---

async function getAllStudentData() {
    const q = query(collection(db, "users"), where("role", "==", "student"), where("status", "==", "approved"));
    const querySnapshot = await getDocs(q);
    const studentProfiles = querySnapshot.docs.map(doc => doc.data() as UserProfile);

    const allData = [];
    for (const profile of studentProfiles) {
        const data = await loadState(profile.uid);
        allData.push({ studentProfile: profile, data });
    }
    return allData;
}

async function renderTeacherSimulations() {
    const container = teacherDashboard.contents.simulations;
    const allData = await getAllStudentData();
    const studentsWithSimulations = allData.filter(s => (s.data.simulation && s.data.simulation.currentProblem) || s.data.completedSimulations.length > 0);
    
    if (studentsWithSimulations.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-12">Henüz hiçbir öğrenci simülasyonu kaydedilmedi.</p>`;
        return;
    }
    
    let listHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
    studentsWithSimulations.forEach(({ studentProfile, data }) => {
        // Prioritize showing the active simulation
        const activeSim = data.simulation && data.simulation.currentProblem;
        const simToShow = activeSim 
            ? { title: data.simulation.currentProblem, status: 'Devam Ediyor' }
            : data.completedSimulations[data.completedSimulations.length - 1] 
                ? { title: data.completedSimulations[data.completedSimulations.length - 1].title, status: 'Tamamlandı' }
                : null;
        
        if (simToShow) {
            listHtml += `
                <div class="w-full text-left p-5 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-start">
                             <span class="font-bold text-lg text-gray-800">${studentProfile.displayName}</span>
                             <span class="text-xs font-semibold px-2 py-1 rounded-full ${activeSim ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">${simToShow.status}</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-1">"${simToShow.title}"</p>
                    </div>
                    <div class="flex justify-between items-center mt-4 pt-3 border-t">
                        <button class="generate-summary-button flex items-center text-sm font-semibold text-amber-600 hover:text-amber-800" data-student-id="${studentProfile.uid}" data-student-name="${studentProfile.displayName}">
                            <span class="material-symbols-outlined text-md mr-1">auto_awesome</span>AI Özet
                        </button>
                        <button class="review-simulation-button flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800" data-student-id="${studentProfile.uid}">
                            İncele <span class="material-symbols-outlined text-md ml-1">arrow_forward</span>
                        </button>
                    </div>
                </div>`;
        }
    });
    listHtml += '</div>';
    container.innerHTML = listHtml;
}


function renderTeacherUploads() {
     teacherDashboard.contents.uploads.innerHTML = `<p class="text-center text-gray-500 py-12">Yüklenen seansları inceleme özelliği yakında aktif olacaktır.</p>`;
}

async function renderTeacherQuestions() {
    const container = teacherDashboard.contents.questions;
    const allData = await getAllStudentData();
    const allQuestions: any[] = [];

    allData.forEach(({ studentProfile, data }) => {
        data.teacherComms.questions.forEach(q => {
            const answer = data.teacherComms.answers.find(a => a.questionId === q.id);
            allQuestions.push({ ...q, studentId: studentProfile.uid, studentName: studentProfile.displayName, answer });
        });
    });

    if (allQuestions.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-12">Henüz öğrenci sorusu bulunmuyor.</p>`;
        return;
    }

    let html = '<div class="space-y-6 max-w-3xl mx-auto">';
    allQuestions.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).forEach(q => {
        html += `
            <div class="bg-white p-5 rounded-xl shadow-lg" data-question-id="${q.id}" data-student-id="${q.studentId}">
                <div class="flex justify-between items-center mb-3">
                    <p class="font-bold text-gray-800">${q.studentName}</p>
                    <p class="text-xs text-gray-400">${new Date(q.timestamp).toLocaleString()}</p>
                </div>
                <p class="text-gray-600 p-3 bg-gray-50 rounded-md mb-4">${q.text}</p>
                ${q.answer ? `
                    <div class="border-t pt-3 mt-3">
                        <p class="text-sm font-semibold text-amber-700 mb-2">Sizin Yanıtınız:</p>
                        <p class="text-gray-700 p-3 bg-amber-50 rounded-md">${q.answer.text}</p>
                    </div>
                ` : `
                    <div class="flex flex-col gap-2">
                        <textarea class="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 transition-shadow" rows="2" placeholder="Yanıtınızı buraya yazın..."></textarea>
                        <button class="submit-answer-button flex self-end items-center justify-center rounded-lg h-10 px-5 bg-[var(--teacher-color)] text-white font-semibold hover:bg-amber-600 transition-all duration-300">
                            <span>Yanıtla</span>
                        </button>
                    </div>
                `}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function renderTeacherAnalytics() {
    const container = teacherDashboard.contents.analytics;
    const allData = await getAllStudentData();
    if (allData.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-12">Analiz için yeterli öğrenci verisi bulunmuyor.</p>`;
        return;
    }

    const classScores = { empathy: [] as number[], technique: [] as number[], rapport: [] as number[] };
    const scenarioCounts: { [key: string]: number } = {};

    allData.forEach(({ data }) => {
        const history = [...data.simulation.conversationHistory, ...data.completedSimulations.flatMap(s => s.history || [])];
        const avgScores = calculateAverageScores(history);
        if (avgScores.empathy > 0) classScores.empathy.push(avgScores.empathy);
        if (avgScores.technique > 0) classScores.technique.push(avgScores.technique);
        if (avgScores.rapport > 0) classScores.rapport.push(avgScores.rapport);
        
        const problems = [data.simulation.currentProblem, ...data.completedSimulations.map(s => s.title)].filter(Boolean);
        problems.forEach(problem => {
             scenarioCounts[problem] = (scenarioCounts[problem] || 0) + 1;
        });
    });
    
    const getAverage = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const classAvg = {
        empathy: getAverage(classScores.empathy),
        technique: getAverage(classScores.technique),
        rapport: getAverage(classScores.rapport),
    };
    
    const mostPlayedScenario = Object.entries(scenarioCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    container.innerHTML = `
        <h3 class="text-2xl font-bold text-gray-800 text-center mb-6">Sınıf Geneli Analizler</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-50 p-4 rounded-lg text-center"><h4 class="font-bold text-gray-700">Toplam Öğrenci</h4><p class="text-3xl font-bold text-[var(--teacher-color)]">${allData.length}</p></div>
            <div class="bg-gray-50 p-4 rounded-lg text-center"><h4 class="font-bold text-gray-700">Aktif Simülasyon</h4><p class="text-3xl font-bold text-[var(--teacher-color)]">${allData.filter(s => s.data.simulation.currentProblem).length}</p></div>
            <div class="bg-gray-50 p-4 rounded-lg text-center"><h4 class="font-bold text-gray-700">En Popüler Senaryo</h4><p class="text-xl font-bold text-[var(--teacher-color)] mt-2">${mostPlayedScenario}</p></div>
        </div>
        <div>
            <h4 class="font-semibold text-gray-800 mb-4 text-xl">Sınıfın Ortalama Beceri Puanları</h4>
            <div class="space-y-3">
                <div class="w-full"><span class="text-sm font-medium text-gray-600">Empati</span><div class="h-5 bg-gray-200 rounded-full mt-1"><div class="h-5 rounded-full bg-fuchsia-500 chart-bar text-white text-xs flex items-center justify-center font-bold" style="width: ${classAvg.empathy * 10}%;">${(classAvg.empathy).toFixed(1)}</div></div></div>
                <div class="w-full"><span class="text-sm font-medium text-gray-600">BDT Tekniği</span><div class="h-5 bg-gray-200 rounded-full mt-1"><div class="h-5 rounded-full bg-amber-500 chart-bar text-white text-xs flex items-center justify-center font-bold" style="width: ${classAvg.technique * 10}%;">${(classAvg.technique).toFixed(1)}</div></div></div>
                <div class="w-full"><span class="text-sm font-medium text-gray-600">İlişki Kurma</span><div class="h-5 bg-gray-200 rounded-full mt-1"><div class="h-5 rounded-full bg-teal-500 chart-bar text-white text-xs flex items-center justify-center font-bold" style="width: ${classAvg.rapport * 10}%;">${(classAvg.rapport).toFixed(1)}</div></div></div>
            </div>
        </div>
    `;
}

async function renderScenarioBuilder() {
    const container = teacherDashboard.contents.builder;
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Yeni Senaryo Oluştur</h3>
                <form id="scenario-builder-form" class="space-y-4">
                    <div>
                        <label for="scenario-title" class="block text-sm font-medium text-gray-700">Senaryo Başlığı</label>
                        <input type="text" id="scenario-title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" placeholder="Örn: İş Stresi" required>
                    </div>
                    <div>
                        <label for="scenario-desc" class="block text-sm font-medium text-gray-700">Kısa Açıklama (Seçim ekranı için)</label>
                        <input type="text" id="scenario-desc" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" placeholder="Örn: Yeni terfisi sonrası bunalmış bir danışan." required>
                    </div>
                    <div>
                        <label for="scenario-profile" class="block text-sm font-medium text-gray-700">Detaylı Danışan Profili (Yapay Zeka için)</label>
                        <textarea id="scenario-profile" rows="6" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" placeholder="Danışanın temel inançlarını, otomatik düşüncelerini, kişilik özelliklerini ve soruna dair detayları buraya yazın." required></textarea>
                    </div>
                    <button type="submit" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--teacher-color)] text-white font-semibold hover:bg-amber-600 transition-all duration-300 shadow-md">
                        <span class="material-symbols-outlined mr-2">add</span>
                        <span>Senaryoyu Kaydet</span>
                    </button>
                </form>
            </div>
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Oluşturulan Senaryolar</h3>
                <div id="custom-scenario-list" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- List will be populated here -->
                </div>
            </div>
        </div>
    `;
    await populateCustomScenarioList();

    const form = document.getElementById('scenario-builder-form');
    form?.addEventListener('submit', handleSaveCustomScenario);
}

async function renderResourceLibrary() {
    const container = teacherDashboard.contents.library;
    const scenarios = await getAllScenarios();
    container.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Yeni Kaynak Ekle</h3>
                <form id="resource-library-form" class="space-y-4">
                    <div>
                        <label for="resource-title" class="block text-sm font-medium text-gray-700">Kaynak Başlığı</label>
                        <input type="text" id="resource-title" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" placeholder="Örn: Etkili Nefes Egzersizleri" required>
                    </div>
                     <div>
                        <label for="resource-url" class="block text-sm font-medium text-gray-700">Kaynak URL (Link)</label>
                        <input type="url" id="resource-url" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500" placeholder="https://..." required>
                    </div>
                    <div>
                        <label for="resource-type" class="block text-sm font-medium text-gray-700">Kaynak Türü</label>
                        <select id="resource-type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500">
                            <option value="article">Makale</option>
                            <option value="video">Video</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <div>
                        <label for="resource-scenarios" class="block text-sm font-medium text-gray-700">İlişkili Senaryolar (İsteğe Bağlı)</label>
                        <select id="resource-scenarios" multiple class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 h-32">
                            ${scenarios.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--teacher-color)] text-white font-semibold hover:bg-amber-600 transition-all duration-300 shadow-md">
                        <span class="material-symbols-outlined mr-2">add</span>
                        <span>Kaynağı Kütüphaneye Ekle</span>
                    </button>
                </form>
            </div>
            <div class="bg-white/70 p-6 rounded-2xl shadow-xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Mevcut Kaynaklar</h3>
                <div id="resource-list-container" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- List will be populated here -->
                </div>
            </div>
        </div>
    `;
    await populateResourceList();
    const form = document.getElementById('resource-library-form');
    form?.addEventListener('submit', handleSaveResource);
}

async function populateResourceList() {
    const listContainer = document.getElementById('resource-list-container');
    if (!listContainer) return;
    const resources = await getResourceLibrary();
    const iconMap = { article: 'article', video: 'smart_display', pdf: 'picture_as_pdf' };

    if (resources.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500 py-8">Henüz kütüphaneye kaynak eklenmedi.</p>`;
        return;
    }
    listContainer.innerHTML = resources.map(r => `
        <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-gray-500">${iconMap[r.type]}</span>
                <div>
                    <a href="${r.url}" target="_blank" class="font-semibold text-gray-800 hover:text-indigo-600">${r.title}</a>
                    <p class="text-xs text-gray-500">${r.url}</p>
                </div>
            </div>
            <button data-resource-id="${r.id}" class="delete-resource-button p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `).join('');
}


async function populateCustomScenarioList() {
    const listContainer = document.getElementById('custom-scenario-list');
    if (!listContainer) return;
    const scenarios = await getCustomScenarios();
    if (scenarios.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-gray-500 py-8">Henüz özel senaryo oluşturulmadı.</p>`;
        return;
    }
    listContainer.innerHTML = scenarios.map(s => `
        <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-800">${s.title}</p>
                <p class="text-xs text-gray-500">${s.description}</p>
            </div>
            <button data-scenario-id="${s.id}" class="delete-scenario-button p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `).join('');
}

async function handleSaveCustomScenario(event: Event) {
    event.preventDefault();
    const titleInput = document.getElementById('scenario-title') as HTMLInputElement;
    const descInput = document.getElementById('scenario-desc') as HTMLInputElement;
    const profileInput = document.getElementById('scenario-profile') as HTMLTextAreaElement;

    const newScenario = {
        title: titleInput.value.trim(),
        description: descInput.value.trim(),
        profile: profileInput.value.trim(),
    };
    
    await saveCustomScenario(newScenario);

    showNotification("Yeni senaryo başarıyla oluşturuldu!");
    (event.target as HTMLFormElement).reset();
    await populateCustomScenarioList();
}

async function handleDeleteCustomScenario(scenarioId: string) {
    if(!confirm("Bu senaryoyu silmek istediğinizden emin misiniz?")) return;
    
    await deleteCustomScenario(scenarioId);

    showNotification("Senaryo silindi.");
    await populateCustomScenarioList();
}

async function handleSaveResource(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const title = (form.elements.namedItem('resource-title') as HTMLInputElement).value.trim();
    const url = (form.elements.namedItem('resource-url') as HTMLInputElement).value.trim();
    const type = (form.elements.namedItem('resource-type') as HTMLSelectElement).value as Resource['type'];
    const scenariosSelect = (form.elements.namedItem('resource-scenarios') as HTMLSelectElement);
    const associatedScenarioIds = Array.from(scenariosSelect.selectedOptions).map(opt => opt.value);

    const newResource = {
        title,
        url,
        type,
        associatedScenarioIds
    };

    await saveResource(newResource);

    showNotification("Kaynak başarıyla kütüphaneye eklendi!");
    form.reset();
    await populateResourceList();
}

async function handleDeleteResource(resourceId: string) {
    if (!confirm("Bu kaynağı silmek istediğinizden emin misiniz?")) return;
    await deleteResource(resourceId);
    showNotification("Kaynak silindi.");
    await populateResourceList();
}


async function handleAnswerSubmit(button: HTMLButtonElement) {
    const container = button.closest('[data-question-id]');
    if (!container) return;
    
    const studentId = (container as HTMLElement).dataset.studentId;
    const questionId = (container as HTMLElement).dataset.questionId;
    const textarea = container.querySelector('textarea');
    const answerText = textarea?.value.trim();

    if (!studentId || !questionId || !answerText || !textarea) return;

    const state = await loadState(studentId);
    const newAnswer = {
        questionId: questionId,
        text: answerText,
        timestamp: new Date().toISOString()
    };
    state.teacherComms.answers.push(newAnswer);
    await saveState(studentId, state);

    const studentProfileDoc = await getDoc(doc(db, "users", studentId));
    const studentName = studentProfileDoc.data()?.displayName || 'Öğrenci';

    showNotification(`${studentName} adlı öğrencinin sorusu yanıtlandı.`);
    const parent = button.parentElement!;
    parent.innerHTML = `
        <div class="border-t pt-3 mt-3">
            <p class="text-sm font-semibold text-amber-700 mb-2">Sizin Yanıtınız:</p>
            <p class="text-gray-700 p-3 bg-amber-50 rounded-md">${answerText}</p>
        </div>
    `;
}

async function renderRegistrationRequests() {
    const container = teacherDashboard.contents.requests;
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    const pendingUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);

    // Update badge
    if (pendingUsers.length > 0) {
        teacherDashboard.requestsCountBadge.textContent = String(pendingUsers.length);
        teacherDashboard.requestsCountBadge.classList.remove('hidden');
    } else {
        teacherDashboard.requestsCountBadge.classList.add('hidden');
    }

    if (pendingUsers.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-12">Onay bekleyen öğrenci kaydı bulunmuyor.</p>`;
        return;
    }

    let html = '<div class="space-y-4 max-w-2xl mx-auto">';
    pendingUsers.forEach(user => {
        html += `
            <div class="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                <div>
                    <p class="font-semibold text-gray-700">${user.displayName}</p>
                    <p class="text-sm text-gray-500">${user.email}</p>
                </div>
                <div class="flex gap-2">
                    <button data-uid="${user.uid}" class="approve-request-button h-10 px-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors text-sm">Onayla</button>
                    <button data-uid="${user.uid}" class="reject-request-button h-10 px-4 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors text-sm">Reddet</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function handleApproveRequest(uid: string) {
    await setDoc(doc(db, "users", uid), { status: 'approved' }, { merge: true });
    showNotification(`Öğrenci kaydı onaylandı.`);
    await renderRegistrationRequests();
}

async function handleRejectRequest(uid: string) {
     if (!confirm(`Bu öğrencinin kayıt isteğini reddetmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    await deleteDoc(doc(db, "users", uid));
    showNotification(`Öğrenci kaydı reddedildi.`);
    await renderRegistrationRequests();
}


async function handleTeacherTabClick(tabId: string) {
    activeTeacherTab = tabId;
    
    teacherDashboard.tabs.forEach(tabElement => {
        if (tabElement.getAttribute('data-tab') === tabId) {
            tabElement.classList.add('border-[var(--teacher-color)]', 'text-[var(--teacher-color)]');
            tabElement.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        } else {
            tabElement.classList.remove('border-[var(--teacher-color)]', 'text-[var(--teacher-color)]');
            tabElement.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        }
    });

    teacherDashboard.contentContainer.style.opacity = '0';
    
    setTimeout(async () => {
        Object.values(teacherDashboard.contents).forEach(content => (content as HTMLElement).classList.add('hidden'));
        const activeContent = teacherDashboard.contents[tabId as keyof typeof teacherDashboard.contents];
        (activeContent as HTMLElement).classList.remove('hidden');

        if (tabId === 'simulations') await renderTeacherSimulations();
        if (tabId === 'requests') await renderRegistrationRequests();
        if (tabId === 'uploads') renderTeacherUploads();
        if (tabId === 'questions') await renderTeacherQuestions();
        if (tabId === 'analytics') await renderTeacherAnalytics();
        if (tabId === 'builder') await renderScenarioBuilder();
        if (tabId === 'library') await renderResourceLibrary();
        
        teacherDashboard.contentContainer.style.opacity = '1';
    }, 200);
}

async function handleTeacherLogin() {
    if (teacherPasswordInput.value === '32433243') { // This should be a real login in a production app
        showScreen('teacherDashboard');
        studentInfo.innerHTML = `<span class="material-symbols-outlined text-amber-700">school</span><span class="font-semibold text-amber-700">Öğretmen Paneli</span>`;
        studentInfo.classList.remove('hidden');
        homeButton.classList.remove('hidden');
        backToSelectionButton.classList.add('hidden');
        saveProgressButton.classList.add('hidden');
        await handleTeacherTabClick('simulations'); // Default tab
        await renderRegistrationRequests(); // To update the badge count on login
    } else {
        alert('Yanlış şifre!');
    }
}

async function handleStudentSimSelect(studentId: string) {
    reviewingStudentId = studentId;
    const state = await loadState(reviewingStudentId);
    const studentProfileDoc = await getDoc(doc(db, "users", studentId));
    const studentProfile = studentProfileDoc.data() as UserProfile;

    const simHistory = state.simulation.currentProblem ? state.simulation.conversationHistory : state.completedSimulations[state.completedSimulations.length - 1]?.history;
    const simProblem = state.simulation.currentProblem || state.completedSimulations[state.completedSimulations.length - 1]?.title;

    if (simHistory && simProblem) {
        teacherReview.studentName.textContent = studentProfile.displayName;
        teacherReview.problemDisplay.textContent = simProblem;
        const lastModelResponse = rebuildUiFromState(teacherReview.chatContainer, simHistory, true);
        if (lastModelResponse) {
             updateGraphs(teacherReview.feedbackSection, lastModelResponse.scoring, lastModelResponse.clientImpact, lastModelResponse.feedback);
        } else {
             teacherReview.feedbackSection.classList.add('hidden');
        }
        showScreen('teacherReview');
    } else {
        alert("Bu öğrenci için incelenecek bir simülasyon bulunamadı.");
    }
}

async function submitTeacherFeedback() {
    const feedback = teacherReview.feedbackInput.value.trim();
    if (!feedback || !reviewingStudentId) return;

    const state = await loadState(reviewingStudentId);
    if (state) {
        state.simulation.conversationHistory.push({ role: 'teacher_feedback', parts: [{ text: feedback }] });
        await saveState(reviewingStudentId, state);
        appendMessage(teacherReview.chatContainer, 'teacher_feedback', feedback);
        teacherReview.feedbackInput.value = '';
        showNotification('Genel geri bildirim başarıyla eklendi!');
    }
}

async function archiveCurrentSimulation(studentId: string) {
    if (!studentId) return;
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

    state.simulation.currentProblem = '';
    state.simulation.currentScenarioId = '';
    state.simulation.conversationHistory = [];

    await saveState(studentId, state);
    await checkAndAwardAchievements(studentId);
}


async function handleGenerateAiSummary(studentId: string, studentName: string) {
    showModal('summary', studentName, `<div class="flex items-center justify-center py-10"><div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] text-[var(--teacher-color)] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status"></div><p class="ml-4">Öğrenci verileri analiz ediliyor...</p></div>`);

    try {
        const studentState = await loadState(studentId);
        const allHistory = [
            ...studentState.completedSimulations.flatMap(s => s.history),
            ...studentState.simulation.conversationHistory
        ];

        if (allHistory.length === 0) {
            showModal('summary', studentName, `<p>Analiz edilecek yeterli veri bulunmuyor.</p>`);
            return;
        }

        const formattedHistory = allHistory.map(turn => {
            if (turn.role === 'user') return `TERAPİST: ${turn.parts[0].text}`;
            if (turn.role === 'model') {
                 try {
                    const data = JSON.parse(turn.parts[0].text);
                    return `DANIŞAN (Elif): ${data.clientResponse}`;
                } catch { return ''; }
            }
            return '';
        }).join('\n');

        const payload = {
            contents: [{ role: 'user', parts: [{ text: `Aşağıdaki seans kayıtlarını analiz et:\n\n${formattedHistory}` }] }],
            systemInstruction: studentSummarySystemInstruction,
            schema: {
                type: Type.OBJECT,
                properties: {
                    overallPerformanceSummary: { type: Type.STRING },
                    recurringStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                    patternsForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
                    actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["overallPerformanceSummary", "recurringStrengths", "patternsForImprovement", "actionableSuggestions"]
            }
        };

        const data = await callApiProxy('gemini-proxy', payload);
        let htmlOutput = `
            <h4 class="font-bold text-lg mb-2">Genel Performans</h4>
            <p class="mb-4">${data.overallPerformanceSummary}</p>
            <h4 class="font-bold text-lg mb-2">Tekrar Eden Güçlü Yönler</h4>
            <ul class="list-disc list-inside mb-4 text-green-700">${data.recurringStrengths.map((s: string) => `<li>${s}</li>`).join('')}</ul>
            <h4 class="font-bold text-lg mb-2">Geliştirilmesi Gereken Alanlar</h4>
            <ul class="list-disc list-inside mb-4 text-red-700">${data.patternsForImprovement.map((a: string) => `<li>${a}</li>`).join('')}</ul>
             <h4 class="font-bold text-lg mb-2">Eyleme Geçirilebilir Öneriler</h4>
            <ul class="list-disc list-inside mb-4 text-indigo-700">${data.actionableSuggestions.map((a: string) => `<li>${a}</li>`).join('')}</ul>
        `;
        showModal('summary', studentName, htmlOutput);

    } catch (error) {
        console.error("AI Summary Error:", error);
        showModal('summary', studentName, `<p class="text-red-500">Özet oluşturulurken bir hata oluştu.</p>`);
    }
}


// --- General Event Listeners ---

function setupEventListeners() {
    // Navigation
    homeButton.addEventListener('click', logout);
    backToSelectionButton.addEventListener('click', async () => {
        await populateStudentDashboard();
        showScreen('studentDashboard');
    });
    teacherReview.backButton.addEventListener('click', async () => {
        showScreen('teacherDashboard');
        await handleTeacherTabClick(activeTeacherTab);
    });
    analysis.backButton.addEventListener('click', async () => {
        await populateStudentDashboard();
        showScreen('studentDashboard');
    });

    // Actions
    problemSelectionContainer.addEventListener('click', handleProblemSelect);
    simulation.optionsContainer.addEventListener('click', handleOptionSelect);
    saveProgressButton.addEventListener('click', async () => {
        if (!currentUserId) return;
        const state = await loadState(currentUserId);
        await saveState(currentUserId, state);
        showNotification('İlerlemeniz başarıyla kaydedildi!');
    });

    // Login / Register
    loginButton.addEventListener('click', handleLogin);
    passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    registerButton.addEventListener('click', handleRegister);
    registerConfirmPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleRegister(); });

    showRegisterView.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });
    showLoginView.addEventListener('click', (e) => {
        e.preventDefault();
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // Teacher Login
    showTeacherLogin.addEventListener('click', (e) => {
        e.preventDefault();
        teacherLoginForm.classList.toggle('hidden');
    });
    teacherLoginButton.addEventListener('click', handleTeacherLogin);
    teacherPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleTeacherLogin(); });
    teacherReview.submitFeedbackButton.addEventListener('click', submitTeacherFeedback);

    // Teacher Dashboard
    teacherDashboard.tabs.forEach(tab => {
        tab.addEventListener('click', () => handleTeacherTabClick(tab.getAttribute('data-tab')!));
    });

    teacherDashboard.contentContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const reviewButton = target.closest('.review-simulation-button');
        const summaryButton = target.closest('.generate-summary-button');
        const answerButton = target.closest('.submit-answer-button');
        const deleteScenarioBtn = target.closest('.delete-scenario-button');
        const deleteResourceBtn = target.closest('.delete-resource-button');
        const approveBtn = target.closest('.approve-request-button');
        const rejectBtn = target.closest('.reject-request-button');

        if (reviewButton) handleStudentSimSelect(reviewButton.getAttribute('data-student-id')!);
        if (summaryButton) handleGenerateAiSummary(summaryButton.getAttribute('data-student-id')!, summaryButton.getAttribute('data-student-name')!);
        if (answerButton) handleAnswerSubmit(answerButton as HTMLButtonElement);
        if (deleteScenarioBtn) handleDeleteCustomScenario(deleteScenarioBtn.getAttribute('data-scenario-id')!);
        if (deleteResourceBtn) handleDeleteResource(deleteResourceBtn.getAttribute('data-resource-id')!);
        if (approveBtn) handleApproveRequest(approveBtn.getAttribute('data-uid')!);
        if (rejectBtn) handleRejectRequest(rejectBtn.getAttribute('data-uid')!);
    });
    
    // Teacher Review Inline Comments
    teacherReview.chatContainer.addEventListener('click', async e => {
        const target = e.target as HTMLElement;
        const button = target.closest('.add-inline-comment-button');
        if (button) {
            const turnId = button.getAttribute('data-turn-id');
            const inputContainer = document.getElementById(`comment-input-${turnId}`);
            inputContainer?.classList.toggle('hidden');
            return;
        }

        const submitButton = target.closest('.submit-inline-comment');
        if (submitButton && reviewingStudentId) {
            const container = submitButton.parentElement!;
            const turnId = container.parentElement?.querySelector('[data-turn-id]')?.getAttribute('data-turn-id');
            const input = container.querySelector('input') as HTMLInputElement;
            const commentText = input.value.trim();

            if (commentText && turnId) {
                const state = await loadState(reviewingStudentId);
                const turn = state.simulation.conversationHistory.find(t => t.id === turnId);
                if (turn) {
                    turn.teacherComment = commentText;
                    await saveState(reviewingStudentId, state);
                    
                    const commentDiv = document.createElement('div');
                    commentDiv.className = `teacher-inline-comment animate-fade-in-up self-start`;
                    commentDiv.innerHTML = `<p class="font-semibold text-xs text-amber-700 mb-1">Öğretmen Notu:</p><p class="text-sm text-amber-800">${commentText}</p>`;
                    container.parentElement?.appendChild(commentDiv);
                    
                    input.value = '';
                    container.classList.add('hidden');
                    showNotification("Yorum eklendi.");
                }
            }
        }
    });

    // Student Dashboard
    goToAnalysisButton.addEventListener('click', () => showScreen('sessionAnalysis'));
    teacherQASystem.button.addEventListener('click', handleAskTeacher);
    teacherQASystem.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAskTeacher(); });

    // Analysis Screen
    analysis.analyzeButton.addEventListener('click', handleAnalyzeTranscript);
    analysis.sendButton.addEventListener('click', handleSendToTeacher);

    // Modals
    rationaleModal.closeButton.addEventListener('click', () => hideModal('rationale'));
    rationaleModal.container.addEventListener('click', (e) => { if (e.target === rationaleModal.container) hideModal('rationale'); });
    summaryModal.closeButton.addEventListener('click', () => hideModal('summary'));
    summaryModal.container.addEventListener('click', (e) => { if (e.target === summaryModal.container) hideModal('summary'); });

    simulation.chatContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const rationaleButton = target.closest('.rationale-button');
        if (rationaleButton) {
            const rationaleText = rationaleButton.getAttribute('data-rationale');
            if (rationaleText) {
                showModal('rationale', 'Terapötik Gerekçe', rationaleText);
            }
        }
    });
}

// --- Init ---
async function initializeApp() {
    homeButton.classList.add('hidden');
    backToSelectionButton.classList.add('hidden');
    saveProgressButton.classList.add('hidden');
    setupEventListeners();

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                currentUserProfile = userDoc.data() as UserProfile;
                if (currentUserProfile.status === 'pending') {
                    alert("Hesabınız henüz öğretmeniniz tarafından onaylanmadı.");
                    await logout();
                } else {
                    studentInfo.innerHTML = `<span class="material-symbols-outlined">person</span><span id="student-name-display" class="font-semibold">${currentUserProfile.displayName}</span>`;
                    studentInfo.classList.remove('hidden');
                    homeButton.classList.remove('hidden');
                    await populateStudentDashboard();
                    showScreen('studentDashboard');
                }
            } else {
                 await logout(); // Profile not found, force logout
            }
        } else {
            showScreen('login');
        }
    });
}

initializeApp();
