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
const allPages = document.querySelectorAll('.page');
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
2.  **strengths:** Terapistin seans boyunca sergilediği güçlü yönler (örn: etkili empati kullanımı, doğru yeniden yapılandırma tekniği, güçlü terapötik ittikak). Maddeler halinde listele.
3.  **areasForImprovement:** Terapistin geliştirebileceği alanlar (örn: daha açık uçlu sorular sorma, Sokratik sorgulamayı derinleştirme, danışanın otomatik düşüncelerini daha net belirleme). Maddeler halinde listele.
4.  **keyMomentsAnalysis:** Transkriptteki 2-3 kritik anı belirle. Bu anlarda terapistin müdahalesini, bu müdahalesinin potansiyel etkilerini ve alternatif yaklaşımları analiz et.`;
const studentSummarySystemInstruction = `Sen, BDT alanında uzman bir eğitim süpervizörüsün. Sana bir öğrencinin birden fazla simülasyon seansındaki konuşma kayıtları verilecek. Görevin, bu kayıtlara dayanarak öğrencinin genel performansı hakkında kapsamlı bir özet ve yapıcı geri bildirim oluşturmaktır.

Tüm çıktın, sağlanan şemaya uygun, geçerli bir JSON formatında olmalı ve başka hiçbir metin, açıklama veya kod bloğu içermemelidir. Analizini aşağıdaki başlıklara göre yapılandır:
1.  **overallPerformanceSummary:** Öğrencinin genel yetkinliği, yaklaşımı ve zaman içindeki gelişimi hakkında kısa bir yönetici özeti.
2.  **recurringStrengths:** Öğrencinin simülasyonlar boyunca tutarlı bir şekilde sergilediği güçlü yönler ve beceriler. Maddeler halinde listele.
3.  **patternsForImprovement:** Öğrencinin tekrar eden zorlukları, geliştirmesi gereken beceriler veya kaçındığı müdahaledeler. Maddeler halinde listele.
4.  **actionableSuggestions:** Öğrencinin gelişimini desteklemek için 2-3 adet somut, eyleme geçirilebilir öneri (örn: "Sokratik sorgulama tekniğini daha derinden keşfetmek için 'X' senaryosunu tekrar deneyebilir.", "Danışan direnciyle karşılaştığında verdiği tepkileri gözden geçirmesi faydalı olacaktır.").`;

// --- User & State Management ---
function getInitialState() {
    return {
        simulation: { conversationHistory: [] as any[], currentProblem: '', currentScenarioId: '' },
        completedSimulations: [] as any[],
        uploadedSessions: [] as any[],
    };
}

async function loadState(studentId: string): Promise<ReturnType<typeof getInitialState>> {
    const savedState = await fb.loadState(studentId);
    const initialState = getInitialState();
    if (savedState) {
        const parsedState = savedState as any;
        return { ...initialState, ...parsedState, simulation: { ...initialState.simulation, ...(parsedState.simulation || {}) }, uploadedSessions: parsedState.uploadedSessions || initialState.uploadedSessions, completedSimulations: parsedState.completedSimulations || initialState.completedSimulations, };
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
    return [...defaultScenarios];
}

// --- Core UI & Rendering Logic ---
function showLoader(show: boolean) {
    loadingOverlay.classList.toggle('hidden', !show);
}

function showPage(pageId: string) {
    allPages.forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId)?.classList.remove('hidden');
}

function showNotification(message: string, duration: number = 3000, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.className = `${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white font-semibold py-2 px-4 rounded-lg shadow-lg animate-fade-in-up`;
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

function showLoginMessage(message: string, type: 'success' | 'error' = 'error') {
    const container = document.getElementById('login-message-container')!;
    const color = type === 'success' ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100';
    container.innerHTML = `<div class="${color} p-3 rounded-lg">${message}</div>`;
}


// --- Page Population Functions ---
function populateLoginScreen() {
    headerButtons.innerHTML = '';
    mainNav.classList.add('hidden');
    studentInfo.classList.add('hidden');
    showPage('page-login');
}

async function populateStudentDashboard() {
    showLoader(true);
    try {
        const state = await loadState(currentUserId);
        
        document.getElementById('student-dashboard-name')!.textContent = currentStudentName;
        
        headerButtons.innerHTML = `<button data-action="logout" class="flex items-center justify-center rounded-lg h-10 px-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-sm">
            <span class="material-symbols-outlined mr-2">logout</span><span>Çıkış Yap</span>
        </button>`;
        
        mainNav.innerHTML = `
            <button data-action="populate-student-dashboard" class="nav-link active flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold">
                <span class="material-symbols-outlined">dashboard</span> Panelim
            </button>
            <button data-action="populate-problem-selection" class="nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-100">
                <span class="material-symbols-outlined">play_circle</span> Yeni Simülasyon
            </button>
        `;
        mainNav.classList.remove('hidden');

        const continueContainer = document.getElementById('student-continue-session-container')!;
        if (state.simulation.currentProblem) {
            continueContainer.innerHTML = `<div class="bg-white/70 backdrop-blur-lg p-6 rounded-2xl shadow-xl text-center">
                <span class="material-symbols-outlined text-5xl text-[var(--primary-color)] mb-3">play_circle</span>
                <h3 class="text-xl font-bold text-gray-800">Devam Et: ${state.simulation.currentProblem}</h3>
                <p class="text-gray-600 mt-2 mb-4">Kaldığın yerden simülasyona devam et.</p>
                <button data-action="resume-simulation" class="w-full flex items-center justify-center rounded-lg h-12 px-6 bg-[var(--primary-color)] text-white font-semibold hover:bg-indigo-700 transition-all">Devam Et</button>
            </div>`;
        } else {
            continueContainer.innerHTML = '';
        }

        const completedContainer = document.getElementById('student-completed-simulations')!;
        if (state.completedSimulations.length > 0) {
            completedContainer.innerHTML = state.completedSimulations.map(sim => `
                <div class="p-4 bg-indigo-50 rounded-lg">
                    <p class="font-semibold text-gray-800">${sim.title}</p>
                    <p class="text-sm text-gray-500">Tamamlanma: ${new Date(sim.completionDate).toLocaleString()}</p>
                </div>
            `).join('');
        } else {
            completedContainer.innerHTML = '<p class="text-center text-gray-500">Henüz tamamlanmış bir simülasyonunuz yok.</p>';
        }

        showPage('page-student-dashboard');
    } catch(error) {
        console.error("Error populating student dashboard:", error);
        showLoginMessage("Öğrenci paneli yüklenirken bir hata oluştu.");
        populateLoginScreen();
    } finally {
        showLoader(false);
    }
}

function populateProblemSelection() {
    document.querySelectorAll('#main-nav .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-action="populate-problem-selection"]')?.classList.add('active');

    const scenariosHtml = getAllScenarios().map(s => `
        <button class="problem-button group" data-action="start-simulation" data-scenario-id="${s.id}">
            <h4 class="text-lg font-bold text-gray-800 group-hover:text-white">${s.title}</h4>
            <p class="text-sm text-gray-600 group-hover:text-indigo-200 mt-1">${s.description}</p>
        </button>
    `).join('');
    
    document.getElementById('problem-selection-grid')!.innerHTML = scenariosHtml;
    showPage('page-problem-selection');
}

async function populateTeacherDashboard(tab = 'requests') {
    showLoader(true);
    activeTeacherTab = tab;
    
    headerButtons.innerHTML = `<button data-action="logout" class="flex items-center justify-center rounded-lg h-10 px-4 bg-red-500 text-white font-semibold hover:bg-red-600 transition-all shadow-sm">
        <span class="material-symbols-outlined mr-2">logout</span><span>Çıkış Yap</span>
    </button>`;
    
    mainNav.innerHTML = `
        <button data-action="populate-teacher-dashboard" data-tab="requests" class="nav-link nav-link-teacher ${tab === 'requests' ? 'active' : ''} flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100">
            <span class="material-symbols-outlined">how_to_reg</span> Kayıt İstekleri
        </button>
        <button data-action="populate-teacher-dashboard" data-tab="simulations" class="nav-link nav-link-teacher ${tab === 'simulations' ? 'active' : ''} flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100">
            <span class="material-symbols-outlined">psychology</span> Öğrenciler
        </button>
    `;
    mainNav.classList.remove('hidden');

    const contentContainer = document.getElementById('teacher-dashboard-content')!;
    contentContainer.innerHTML = ''; // Clear previous content
    showPage('page-teacher-dashboard');

    try {
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
        contentContainer.innerHTML = tabContentHtml;
    } catch(error: any) {
        console.error("Error rendering teacher dashboard:", error);
        if (error.code && error.code.includes('permission-denied')) {
            contentContainer.innerHTML = `
                <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                    <p class="font-bold">Veritabanı Erişim Hatası</p>
                    <p>Öğrenci verileri alınamadı. Bu genellikle Firebase Firestore güvenlik kurallarından kaynaklanır.</p>
                    <p class="mt-2"><b>Çözüm:</b> Lütfen Firebase projenizin Firestore veritabanı kurallarını aşağıdaki gibi güncelleyin:</p>
                    <pre class="bg-gray-800 text-white p-2 rounded-md mt-2 text-xs"><code>rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Öğretmenlerin kullanıcı listesini okumasına izin ver
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    // Öğrencilerin kendi durumlarını okumasına/yazmasına izin ver
    match /studentStates/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}</code></pre>
                </div>
            `;
        } else {
            contentContainer.innerHTML = `<p class="text-center text-red-500 py-4">Öğretmen paneli yüklenirken bir hata oluştu.</p>`;
        }
    } finally {
        showLoader(false);
    }
}


// --- Event Delegation & Action Handlers ---
async function handleGlobalClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const actionTarget = target.closest('[data-action]');
    if (!actionTarget) return;

    const action = actionTarget.getAttribute('data-action')!;
    const actionData = (actionTarget as HTMLElement).dataset;

    switch (action) {
        // --- UI View Toggles ---
        case 'show-register-view':
            document.getElementById('login-view')?.classList.add('hidden');
            document.getElementById('teacher-login-view')?.classList.add('hidden');
            document.getElementById('register-view')?.classList.remove('hidden');
            return;
        case 'show-login-view':
             document.getElementById('register-view')?.classList.add('hidden');
             document.getElementById('teacher-login-view')?.classList.add('hidden');
             document.getElementById('login-view')?.classList.remove('hidden');
            return;
        case 'show-teacher-login-view':
             document.getElementById('login-view')?.classList.add('hidden');
             document.getElementById('register-view')?.classList.add('hidden');
             document.getElementById('teacher-login-view')?.classList.remove('hidden');
            return;
        case 'close-modal':
            hideModal(actionData.modal as 'rationale' | 'summary');
            return;

        // --- Auth Actions ---
        case 'login': await handleLogin(); break;
        case 'register': await handleRegister(); break;
        case 'teacher-login': handleTeacherLogin(); break;
        case 'logout': await handleLogout(); break;
        
        // --- Page Navigation ---
        case 'populate-student-dashboard': await populateStudentDashboard(); break;
        case 'populate-problem-selection': populateProblemSelection(); break;
        case 'populate-teacher-dashboard': await populateTeacherDashboard(actionData.tab); break;

        // --- Teacher Actions ---
        case 'approve-user':
            showLoader(true);
            await fb.updateUserStatus(actionData.userId!, 'approved');
            showNotification('Öğrenci onaylandı.');
            await populateTeacherDashboard('requests');
            break;
        case 'reject-user':
            showLoader(true);
            await fb.updateUserStatus(actionData.userId!, 'rejected');
            showNotification('Öğrenci reddedildi.');
            await populateTeacherDashboard('requests');
            break;
        case 'view-summary':
            await handleViewSummary(actionData.studentId!, actionData.studentName!);
            break;
    }
}

async function handleLogin() {
    showLoader(true);
    const username = (document.getElementById('username-input') as HTMLInputElement).value.trim();
    const password = (document.getElementById('password-input') as HTMLInputElement).value;
    if (!username || !password) {
        showLoginMessage('Kullanıcı adı ve şifre boş bırakılamaz.');
        showLoader(false);
        return;
    }
    try {
        await fb.loginUser(username, password);
        // onAuthStateChanged will handle UI changes
    } catch (error) {
        console.error("Login error:", error);
        showLoginMessage('Geçersiz kullanıcı adı veya şifre.');
        showLoader(false);
    }
}

async function handleRegister() {
    showLoader(true);
    const username = (document.getElementById('register-username-input') as HTMLInputElement).value.trim();
    const password = (document.getElementById('register-password-input') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('register-confirm-password-input') as HTMLInputElement).value;
    const errorDiv = document.getElementById('register-error')!;

    const showError = (msg: string) => { errorDiv.textContent = msg; errorDiv.classList.remove('hidden'); };
    errorDiv.classList.add('hidden');

    if (!username || !password || password.length < 6 || password !== confirmPassword) {
        showError('Lütfen formu doğru doldurun (şifre en az 6 karakter ve eşleşmeli).');
        showLoader(false); return;
    }
    try {
        await fb.registerUser(username, password);
        document.getElementById('register-view')?.classList.add('hidden');
        document.getElementById('login-view')?.classList.remove('hidden');
        showLoginMessage('Kayıt başarılı! Hesabınız öğretmen onayını bekliyor.', 'success');
    } catch (error: any) {
        showError(error.code === 'auth/email-already-in-use' ? 'Bu kullanıcı adı zaten alınmış.' : 'Kayıt sırasında bir hata oluştu.');
        console.error("Registration error:", error);
    } finally {
        showLoader(false);
    }
}

function handleTeacherLogin() {
    showLoader(true);
    const password = (document.getElementById('teacher-password-input') as HTMLInputElement).value;
    const errorDiv = document.getElementById('teacher-login-error')!;
    if (password === TEACHER_PASSWORD) {
        sessionStorage.setItem(TEACHER_SESSION_KEY, 'true');
        location.reload();
    } else {
        errorDiv.textContent = 'Geçersiz yönetici şifresi.';
        errorDiv.classList.remove('hidden');
        showLoader(false);
    }
}

async function handleLogout() {
    showLoader(true);
    const isTeacher = sessionStorage.getItem(TEACHER_SESSION_KEY);
    if (isTeacher) {
        sessionStorage.removeItem(TEACHER_SESSION_KEY);
        location.reload();
    } else {
        await fb.logoutUser();
        // onAuthStateChanged will show login screen
    }
}

async function handleViewSummary(studentId: string, studentName: string) {
    showLoader(true);
    try {
        const state = await loadState(studentId);
        if (!state || !state.completedSimulations || state.completedSimulations.length === 0) {
            showNotification(`${studentName} için özetlenecek tamamlanmış simülasyon bulunmuyor.`, 4000, 'error');
            return;
        }

        const formattedHistory = state.completedSimulations.map((sim: any) => {
            const conversationText = sim.conversationHistory.map((turn: any) => `Terapist: ${turn.therapist}\nDanışan: ${turn.clientResponse}`).join('\n\n');
            return `--- SİMÜLASYON: ${sim.title} ---\n${conversationText}`;
        }).join('\n\n---\n\n');

        const request = { model: "gemini-2.5-flash", contents: formattedHistory, config: { systemInstruction: studentSummarySystemInstruction, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { overallPerformanceSummary: { type: Type.STRING }, recurringStrengths: { type: Type.ARRAY, items: { type: Type.STRING } }, patternsForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } }, actionableSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }, } } } };

        const response = await ai.models.generateContent(request);
        const summaryData = JSON.parse(response.text);

        const summaryHtml = `
            <h4>Genel Performans</h4><p>${summaryData.overallPerformanceSummary}</p>
            <h4 class="mt-4">Tekrar Eden Güçlü Yönler</h4><ul>${summaryData.recurringStrengths.map((s: string) => `<li>- ${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Geliştirilmesi Gereken Yönler</h4><ul>${summaryData.patternsForImprovement.map((s: string) => `<li>- ${s}</li>`).join('')}</ul>
            <h4 class="mt-4">Eyleme Geçirilebilir Öneriler</h4><ul>${summaryData.actionableSuggestions.map((s: string) => `<li>- ${s}</li>`).join('')}</ul>
        `;
        showModal('summary', studentName, summaryHtml);
    } catch (error) {
        console.error("Error generating student summary:", error);
        showNotification('AI özeti oluşturulurken bir hata oluştu.', 4000, 'error');
    } finally {
        showLoader(false);
    }
}

// --- Central Authentication & State Logic ---
async function handleAuthState(user: any) {
    showLoader(true);
    try {
        if (user) {
            const userData = await fb.getUserData(user.uid);
            if (userData && userData.status === 'approved') {
                currentUserId = user.uid;
                currentStudentName = userData.username;
                studentInfo.innerHTML = `<span class="material-symbols-outlined">person</span><span class="font-semibold">${currentStudentName}</span>`;
                studentInfo.classList.remove('hidden');
                await populateStudentDashboard();
            } else {
                await fb.logoutUser(); 
                const message = userData?.status === 'pending' ? 'Hesabınız öğretmen onayını bekliyor.' : 'Hesabınız reddedildi veya geçersiz.';
                showLoginMessage(message);
                populateLoginScreen();
            }
        } else {
            currentUserId = '';
            currentStudentName = '';
            populateLoginScreen();
        }
    } catch (error) {
        console.error("Auth state error:", error);
        showLoginMessage("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        populateLoginScreen();
    } finally {
        showLoader(false);
    }
}

// --- App Initialization ---
function initializeApp() {
    if (fb.firebaseConfig.apiKey === "YOUR_API_KEY" || !fb.firebaseConfig.apiKey) {
        document.querySelector('.layout-container')?.classList.add('hidden');
        configWarningOverlay.classList.remove('hidden');
        return;
    }

    document.body.addEventListener('click', handleGlobalClick);

    if (sessionStorage.getItem(TEACHER_SESSION_KEY)) {
        currentStudentName = 'Öğretmen Hesabı';
        studentInfo.innerHTML = `<span class="material-symbols-outlined text-amber-600">school</span><span class="font-semibold text-gray-800">${currentStudentName}</span>`;
        studentInfo.classList.remove('hidden');
        populateTeacherDashboard(activeTeacherTab);
    } else {
        fb.onAuthStateChanged(handleAuthState);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
