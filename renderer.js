/* ============================================
   Nebula — Renderer
   Chat-first assistant. Ollama-powered.
   ============================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ============================================================
  //  STATE
  // ============================================================
  let data = { groups: [], chats: [] };     // персистентные данные
  let settings = {
    selectedModel: null,
    thinkLevel: "medium",
    accessMode: "ask",
    appLanguage: "en",
    theme: "dark",
    downloadedLanguages: ["en"]
  };

  let currentChatId = null;
  let isGenerating = false;
  let abortController = null;

  let ollamaRunning = false;
  let availableModels = [];          // установленные модели [{name,size,details}]
  let pullingModels = {};            // { modelName: percent }
  let ollamaEnsureInFlight = false;

  let attachments = [];              // [{kind:'image'|'file', name, dataUrl, base64, text}]

  let thinkingEl = null;
  let activeCodeActivityEl = null;
  let lastCodeActivity = null;
  let currentCodeProjectFolderName = null;
  let currentThinkingLines = [];
  let agentProgress = [];
  let progressDismissed = false;
  let codingPreviewItems = [];
  let acceptedChangeChatId = null;
  let pendingApprovalResolve = null;
  let typingTimer = null;

  // ============================================================
  //  DOM
  // ============================================================
  const messagesEl = $("messages");
  const welcomeEl = $("welcomeScreen");
  const welcomeTitle = $("welcomeTitle");
  const mainArea = document.querySelector(".main-area");
  const inputEl = $("userInput");
  const sendBtn = $("sendBtn");
  const stopBtn = $("stopBtn");
  const chatContainer = $("chatContainer");
  const attachBtn = $("attachBtn");
  const fileInput = $("fileInput");
  const attachmentStrip = $("attachmentStrip");
  const statusDot = $("statusDot");
  const welcomeHint = $("welcomeHint");
  const openProjectsBtn = $("openProjectsBtn");
  const searchChatsBtn = $("searchChatsBtn");
  const settingsBtn = $("settingsBtn");
  const settingsModal = $("settingsModal");
  const closeSettingsBtn = $("closeSettingsBtn");
  const appLanguageSelect = $("appLanguageSelect");
  const themeSegment = $("themeSegment");
  const languagePackList = $("languagePackList");
  const toggleTabBtn = $("toggleTabBtn");
  const sideLogo = document.querySelector(".side-logo");
  const toolbarExplorerBtn = $("toolbarExplorerBtn");
  const toolbarTerminalBtn = $("toolbarTerminalBtn");
  const toolbarPanelBtn = $("toolbarPanelBtn");
  const terminalPanel = $("terminalPanel");
  const terminalOutput = $("terminalOutput");
  const terminalInput = $("terminalInput");
  const terminalCwd = $("terminalCwd");
  const closeTerminalBtn = $("closeTerminalBtn");
  const sidePanel = $("sidePanel");
  const closePanelBtn = $("closePanelBtn");
  const progressCard = $("progressCard");
  const progressHideBtn = $("progressHideBtn");
  const progressCount = $("progressCount");
  const progressList = $("progressList");
  const panelProgressList = $("panelProgressList");
  const accessBtn = $("accessBtn");
  const accessLabel = $("accessLabel");
  const accessDropdown = $("accessDropdown");
  const approvalModal = $("approvalModal");
  const approvalText = $("approvalText");
  const approvalAcceptBtn = $("approvalAcceptBtn");
  const approvalAcceptChatBtn = $("approvalAcceptChatBtn");
  const approvalDenyBtn = $("approvalDenyBtn");
  const approvalCloseBtn = $("approvalCloseBtn");
  const setupSheet = $("setupSheet");
  const setupQuestion = $("setupQuestion");
  const setupOptions = $("setupOptions");

  const modelBtn = $("modelBtn");
  const modelLabel = $("modelLabel");
  const modelDropdown = $("modelDropdown");

  const thinkBtn = $("thinkBtn");
  const thinkLabel = $("thinkLabel");
  const thinkDropdown = $("thinkDropdown");
  const modelsSearch = $("modelsSearch");

  const chatHistoryList = $("chatHistoryList");

  const APP_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "ru", name: "Русский" },
    { code: "es", name: "Español" },
    { code: "zh", name: "中文" },
    { code: "hi", name: "हिन्दी" },
    { code: "ar", name: "العربية" },
    { code: "pt", name: "Português" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "it", name: "Italiano" },
    { code: "tr", name: "Türkçe" },
    { code: "pl", name: "Polski" },
    { code: "uk", name: "Українська" },
  ];

  const UI_TEXT = {
    en: {
      settings: "Settings",
      theme: "Theme",
      themeDesc: "Choose the visual theme.",
      dark: "Dark",
      light: "Light",
      languagePacks: "Language packs",
      languagePacksDesc: "Download a language, then choose it for the app interface.",
      download: "Download",
      choose: "Choose",
      selected: "Selected",
      newChat: "New chat",
      projects: "Projects",
      recent: "Recent",
      models: "Models",
      chooseModel: "Choose model",
      askPlaceholder: "Ask Nebula anything...",
      modelSearch: "Search models...",
      folderPlaceholder: "Folder name...",
      setupTitle: "Clarify the task",
      newFolder: "New folder",
      create: "Create",
      intro: "Intro",
      explain: "Explain topic",
      ideas: "Project ideas",
      translate: "Translate",
      access: {
        ask: "Ask before changes",
        auto: "Edit automatically",
        plan: "Plan mode",
        full: "Full access",
      },
      setupInterfaceQuestion: "What kind of interface should it be?",
      setupDashboard: "Dashboard / workspace",
      setupPortfolio: "Portfolio / personal page",
      setupSaas: "SaaS / product interface",
      setupVisualQuestion: "Which visual mode?",
      setupDark: "Dark theme",
      setupLight: "Light theme",
      setupMixed: "Mixed contrast theme",
      setupStackQuestion: "What should it be built with?",
      setupCustom: "Custom option",
      setupCustomPlaceholder: "Describe your option...",
      setupUse: "Use",
      interfaceParameters: "Interface parameters",
      interfaceType: "Type",
      visualMode: "Visual mode",
      stack: "Language/stack",
      motivationLines: [
        "Build the thing you keep imagining.",
        "Make the idea real.",
        "Turn the blank screen into progress.",
        "Start small. Ship something alive.",
        "Design it. Break it. Make it better.",
        "Your next version starts here.",
      ],
    },
    ru: {
      settings: "Настройки",
      theme: "Тема",
      themeDesc: "Выберите внешний вид приложения.",
      dark: "Тёмная",
      light: "Светлая",
      languagePacks: "Языки интерфейса",
      languagePacksDesc: "Скачайте язык, потом выберите его для интерфейса.",
      download: "Скачать",
      choose: "Выбрать",
      selected: "Выбран",
      newChat: "Новый чат",
      projects: "Проекты",
      recent: "Недавнее",
      models: "Модели",
      chooseModel: "Выбрать модель",
      askPlaceholder: "Спросите Nebula о чём угодно...",
      modelSearch: "Поиск моделей...",
      folderPlaceholder: "Название папки...",
      setupTitle: "Уточнить задачу",
      newFolder: "Новая папка",
      create: "Создать",
      intro: "Знакомство",
      explain: "Объясни тему",
      ideas: "Идеи проекта",
      translate: "Перевод",
      access: {
        ask: "Спрашивать перед изменениями",
        auto: "Редактировать автоматически",
        plan: "Режим плана",
        full: "Полный доступ",
      },
      setupInterfaceQuestion: "\u041a\u0430\u043a\u043e\u0439 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0441\u0434\u0435\u043b\u0430\u0442\u044c?",
      setupDashboard: "\u0414\u0430\u0448\u0431\u043e\u0440\u0434 / \u0440\u0430\u0431\u043e\u0447\u0430\u044f \u043f\u0430\u043d\u0435\u043b\u044c",
      setupPortfolio: "\u041f\u043e\u0440\u0442\u0444\u043e\u043b\u0438\u043e / \u043b\u0438\u0447\u043d\u0430\u044f \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u0430",
      setupSaas: "SaaS / \u043f\u0440\u043e\u0434\u0443\u043a\u0442\u043e\u0432\u044b\u0439 \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441",
      setupVisualQuestion: "\u041a\u0430\u043a\u043e\u0439 \u0440\u0435\u0436\u0438\u043c \u0441\u0434\u0435\u043b\u0430\u0442\u044c?",
      setupDark: "\u0422\u0451\u043c\u043d\u0430\u044f \u0442\u0435\u043c\u0430",
      setupLight: "\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430",
      setupMixed: "\u041a\u043e\u043d\u0442\u0440\u0430\u0441\u0442\u043d\u0430\u044f mixed-\u0442\u0435\u043c\u0430",
      setupStackQuestion: "\u041d\u0430 \u0447\u0451\u043c \u043f\u0438\u0441\u0430\u0442\u044c?",
      setupCustom: "\u0421\u0432\u043e\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442",
      setupCustomPlaceholder: "\u041e\u043f\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442...",
      setupUse: "\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u044c",
      interfaceParameters: "\u041f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430",
      interfaceType: "\u0422\u0438\u043f",
      visualMode: "\u0420\u0435\u0436\u0438\u043c",
      stack: "\u042f\u0437\u044b\u043a/\u0441\u0442\u0435\u043a",
      motivationLines: [
        "\u0421\u043e\u0431\u0435\u0440\u0438 \u0442\u043e, \u0447\u0442\u043e \u0434\u0430\u0432\u043d\u043e \u043a\u0440\u0443\u0442\u0438\u0442\u0441\u044f \u0432 \u0433\u043e\u043b\u043e\u0432\u0435.",
        "\u0421\u0434\u0435\u043b\u0430\u0439 \u0438\u0434\u0435\u044e \u0436\u0438\u0432\u043e\u0439.",
        "\u041f\u0440\u0435\u0432\u0440\u0430\u0442\u0438 \u043f\u0443\u0441\u0442\u043e\u0439 \u044d\u043a\u0440\u0430\u043d \u0432 \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441.",
        "\u041d\u0430\u0447\u043d\u0438 \u043c\u0430\u043b\u043e. \u0414\u043e\u0432\u0435\u0434\u0438 \u0434\u043e \u0440\u0430\u0431\u043e\u0442\u044b.",
        "\u041f\u0440\u0438\u0434\u0443\u043c\u0430\u0439. \u0421\u043b\u043e\u043c\u0430\u0439. \u0421\u0434\u0435\u043b\u0430\u0439 \u043b\u0443\u0447\u0448\u0435.",
        "\u0422\u0432\u043e\u044f \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f \u0432\u0435\u0440\u0441\u0438\u044f \u043d\u0430\u0447\u0438\u043d\u0430\u0435\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.",
      ],
    },
  };

  const EXTRA_UI_TEXT = {
    es: {
      settings: "Configuracion",
      theme: "Tema",
      themeDesc: "Elige el tema visual.",
      dark: "Oscuro",
      light: "Claro",
      languagePacks: "Paquetes de idioma",
      languagePacksDesc: "Descarga un idioma y luego elige uno para la interfaz.",
      download: "Descargar",
      choose: "Elegir",
      selected: "Seleccionado",
      newChat: "Nuevo chat",
      projects: "Proyectos",
      recent: "Reciente",
      models: "Modelos",
      chooseModel: "Elegir modelo",
      askPlaceholder: "Pregunta a Nebula cualquier cosa...",
      modelSearch: "Buscar modelos...",
      setupTitle: "Aclarar tarea",
      access: { ask: "Preguntar antes de cambios", auto: "Editar automaticamente", plan: "Modo plan", full: "Acceso completo" },
      motivationLines: ["Construye lo que sigues imaginando.", "Haz real la idea.", "Tu siguiente version empieza aqui."],
    },
    fr: {
      settings: "Parametres",
      theme: "Theme",
      themeDesc: "Choisissez le theme visuel.",
      dark: "Sombre",
      light: "Clair",
      languagePacks: "Packs de langue",
      languagePacksDesc: "Telechargez une langue, puis choisissez-la pour l'interface.",
      download: "Telecharger",
      choose: "Choisir",
      selected: "Selectionne",
      newChat: "Nouveau chat",
      projects: "Projets",
      recent: "Recent",
      models: "Modeles",
      chooseModel: "Choisir un modele",
      askPlaceholder: "Demandez n'importe quoi a Nebula...",
      modelSearch: "Rechercher des modeles...",
      setupTitle: "Preciser la tache",
      access: { ask: "Demander avant modifications", auto: "Modifier automatiquement", plan: "Mode plan", full: "Acces complet" },
      motivationLines: ["Construis ce que tu imagines.", "Rends l'idee reelle.", "Ta prochaine version commence ici."],
    },
    de: {
      settings: "Einstellungen",
      theme: "Design",
      themeDesc: "Wahle das visuelle Design.",
      dark: "Dunkel",
      light: "Hell",
      languagePacks: "Sprachpakete",
      languagePacksDesc: "Lade eine Sprache herunter und wahle sie fur die Oberflache.",
      download: "Herunterladen",
      choose: "Wahlen",
      selected: "Ausgewahlt",
      newChat: "Neuer Chat",
      projects: "Projekte",
      recent: "Zuletzt",
      models: "Modelle",
      chooseModel: "Modell wahlen",
      askPlaceholder: "Frag Nebula alles...",
      modelSearch: "Modelle suchen...",
      setupTitle: "Aufgabe klaren",
      access: { ask: "Vor Anderungen fragen", auto: "Automatisch bearbeiten", plan: "Planmodus", full: "Voller Zugriff" },
      motivationLines: ["Baue, was du dir vorstellst.", "Mach die Idee real.", "Deine nachste Version beginnt hier."],
    },
    pt: {
      settings: "Configuracoes",
      theme: "Tema",
      themeDesc: "Escolha o tema visual.",
      dark: "Escuro",
      light: "Claro",
      languagePacks: "Pacotes de idioma",
      languagePacksDesc: "Baixe um idioma e escolha-o para a interface.",
      download: "Baixar",
      choose: "Escolher",
      selected: "Selecionado",
      newChat: "Novo chat",
      projects: "Projetos",
      recent: "Recentes",
      models: "Modelos",
      chooseModel: "Escolher modelo",
      askPlaceholder: "Pergunte qualquer coisa ao Nebula...",
      modelSearch: "Buscar modelos...",
      setupTitle: "Esclarecer tarefa",
      access: { ask: "Perguntar antes de alterar", auto: "Editar automaticamente", plan: "Modo plano", full: "Acesso total" },
      motivationLines: ["Construa o que voce imagina.", "Torne a ideia real.", "Sua proxima versao comeca aqui."],
    },
    it: {
      settings: "Impostazioni",
      theme: "Tema",
      themeDesc: "Scegli il tema visivo.",
      dark: "Scuro",
      light: "Chiaro",
      languagePacks: "Pacchetti lingua",
      languagePacksDesc: "Scarica una lingua e sceglila per l'interfaccia.",
      download: "Scarica",
      choose: "Scegli",
      selected: "Selezionato",
      newChat: "Nuova chat",
      projects: "Progetti",
      recent: "Recenti",
      models: "Modelli",
      chooseModel: "Scegli modello",
      askPlaceholder: "Chiedi qualsiasi cosa a Nebula...",
      modelSearch: "Cerca modelli...",
      setupTitle: "Chiarisci attivita",
      access: { ask: "Chiedi prima delle modifiche", auto: "Modifica automaticamente", plan: "Modalita piano", full: "Accesso completo" },
      motivationLines: ["Costruisci cio che immagini.", "Rendi reale l'idea.", "La tua prossima versione inizia qui."],
    },
    tr: {
      settings: "Ayarlar",
      theme: "Tema",
      themeDesc: "Gorsel temayi sec.",
      dark: "Koyu",
      light: "Acik",
      languagePacks: "Dil paketleri",
      languagePacksDesc: "Bir dil indir, sonra arayuz icin sec.",
      download: "Indir",
      choose: "Sec",
      selected: "Secildi",
      newChat: "Yeni sohbet",
      projects: "Projeler",
      recent: "Son",
      models: "Modeller",
      chooseModel: "Model sec",
      askPlaceholder: "Nebula'ya istedigini sor...",
      modelSearch: "Model ara...",
      setupTitle: "Gorevi netlestir",
      access: { ask: "Degisiklikten once sor", auto: "Otomatik duzenle", plan: "Plan modu", full: "Tam erisim" },
      motivationLines: ["Hayal ettigini insa et.", "Fikri gercege donustur.", "Sonraki surumun burada baslar."],
    },
    pl: {
      settings: "Ustawienia",
      theme: "Motyw",
      themeDesc: "Wybierz wyglad aplikacji.",
      dark: "Ciemny",
      light: "Jasny",
      languagePacks: "Pakiety jezykowe",
      languagePacksDesc: "Pobierz jezyk, a potem wybierz go dla interfejsu.",
      download: "Pobierz",
      choose: "Wybierz",
      selected: "Wybrano",
      newChat: "Nowy czat",
      projects: "Projekty",
      recent: "Ostatnie",
      models: "Modele",
      chooseModel: "Wybierz model",
      askPlaceholder: "Zapytaj Nebule o cokolwiek...",
      modelSearch: "Szukaj modeli...",
      setupTitle: "Doprecyzuj zadanie",
      access: { ask: "Pytaj przed zmianami", auto: "Edytuj automatycznie", plan: "Tryb planu", full: "Pelny dostep" },
      motivationLines: ["Zbuduj to, co sobie wyobrazasz.", "Zmien pomysl w rzeczywistosc.", "Twoja nastepna wersja zaczyna sie tutaj."],
    },
    uk: {
      settings: "\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f",
      theme: "\u0422\u0435\u043c\u0430",
      themeDesc: "\u041e\u0431\u0435\u0440\u0456\u0442\u044c \u0432\u0456\u0437\u0443\u0430\u043b\u044c\u043d\u0443 \u0442\u0435\u043c\u0443.",
      dark: "\u0422\u0435\u043c\u043d\u0430",
      light: "\u0421\u0432\u0456\u0442\u043b\u0430",
      languagePacks: "\u041c\u043e\u0432\u043d\u0456 \u043f\u0430\u043a\u0435\u0442\u0438",
      download: "\u0417\u0430\u0432\u0430\u043d\u0442\u0430\u0436\u0438\u0442\u0438",
      choose: "\u0412\u0438\u0431\u0440\u0430\u0442\u0438",
      selected: "\u0412\u0438\u0431\u0440\u0430\u043d\u043e",
      newChat: "\u041d\u043e\u0432\u0438\u0439 \u0447\u0430\u0442",
      projects: "\u041f\u0440\u043e\u0454\u043a\u0442\u0438",
      recent: "\u041d\u0435\u0434\u0430\u0432\u043d\u0456",
      models: "\u041c\u043e\u0434\u0435\u043b\u0456",
      askPlaceholder: "\u0417\u0430\u043f\u0438\u0442\u0430\u0439 Nebula \u043f\u0440\u043e \u0449\u043e \u0437\u0430\u0432\u0433\u043e\u0434\u043d\u043e...",
      access: { ask: "\u041f\u0438\u0442\u0430\u0442\u0438 \u043f\u0435\u0440\u0435\u0434 \u0437\u043c\u0456\u043d\u0430\u043c\u0438", auto: "\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u043d\u043e", plan: "\u0420\u0435\u0436\u0438\u043c \u043f\u043b\u0430\u043d\u0443", full: "\u041f\u043e\u0432\u043d\u0438\u0439 \u0434\u043e\u0441\u0442\u0443\u043f" },
      motivationLines: ["\u0417\u0431\u0435\u0440\u0438 \u0442\u0435, \u0449\u043e \u0434\u0430\u0432\u043d\u043e \u0443\u044f\u0432\u043b\u044f\u0454\u0448.", "\u0417\u0440\u043e\u0431\u0438 \u0456\u0434\u0435\u044e \u0436\u0438\u0432\u043e\u044e.", "\u0422\u0432\u043e\u044f \u043d\u0430\u0441\u0442\u0443\u043f\u043d\u0430 \u0432\u0435\u0440\u0441\u0456\u044f \u043f\u043e\u0447\u0438\u043d\u0430\u0454\u0442\u044c\u0441\u044f \u0442\u0443\u0442."],
    },
  };

  ["zh", "hi", "ar", "ja", "ko"].forEach(code => {
    EXTRA_UI_TEXT[code] = {
      settings: UI_TEXT.en.settings,
      languagePacks: UI_TEXT.en.languagePacks,
      download: UI_TEXT.en.download,
      choose: UI_TEXT.en.choose,
      selected: UI_TEXT.en.selected,
      newChat: UI_TEXT.en.newChat,
      projects: UI_TEXT.en.projects,
      recent: UI_TEXT.en.recent,
      models: UI_TEXT.en.models,
      motivationLines: UI_TEXT.en.motivationLines,
    };
  });

  Object.entries(EXTRA_UI_TEXT).forEach(([code, pack]) => {
    UI_TEXT[code] = {
      ...UI_TEXT.en,
      ...pack,
      access: { ...UI_TEXT.en.access, ...(pack.access || {}) },
      motivationLines: pack.motivationLines || UI_TEXT.en.motivationLines,
    };
  });

  function t(key) {
    const lang = UI_TEXT[settings.appLanguage] ? settings.appLanguage : "en";
    return key.split(".").reduce((obj, part) => obj && obj[part], UI_TEXT[lang]) || key;
  }

  // ============================================================
  //  КАТАЛОГ МОДЕЛЕЙ
  // ============================================================
  const MODEL_CATALOG = [
    { name: "gemma4:12b",        desc: "Google Gemma 4 12B — reasoning, code, vision",                 size: "~8 GB",   category: "Google",   vision: true,  think: true },
    { name: "gemma4:e4b",        desc: "Google Gemma 4 E4B — быстрая мультимодальная модель",          size: "~3 GB",   category: "Google",   vision: true,  think: true },
    { name: "gemma3:4b",         desc: "Google Gemma 3 4B — лёгкая vision-модель",                     size: "~3.3 GB", category: "Google",   vision: true },
    { name: "gemma3:12b",        desc: "Google Gemma 3 12B — сильная модель для одного GPU",           size: "~8.1 GB", category: "Google",   vision: true },
    { name: "gpt-oss:20b",       desc: "OpenAI GPT-OSS 20B — open-weight reasoning и tool use",        size: "~12 GB",  category: "OpenAI",   think: true },
    { name: "gpt-oss:120b",      desc: "OpenAI GPT-OSS 120B — крупная reasoning-модель",               size: "~70 GB",  category: "OpenAI",   think: true },
    { name: "qwen3.5:4b",        desc: "Qwen 3.5 4B — современная лёгкая multimodal-модель",           size: "~3 GB",   category: "Qwen",     vision: true,  think: true },
    { name: "qwen3.5:9b",        desc: "Qwen 3.5 9B — универсальная модель нового поколения",          size: "~6 GB",   category: "Qwen",     vision: true,  think: true },
    { name: "qwen3:8b",          desc: "Qwen 3 8B — thinking, coding, tool use",                       size: "~5 GB",   category: "Qwen",     think: true },
    { name: "qwen3:4b",          desc: "Qwen 3 4B — быстрый reasoning для обычных ПК",                 size: "~2.5 GB", category: "Qwen",     think: true },
    { name: "qwen3:1.7b",        desc: "Qwen 3 1.7B — лёгкая модель для слабых ПК",                    size: "~1.5 GB", category: "Qwen",     think: true },
    { name: "qwen3-coder:30b",   desc: "Qwen3 Coder 30B — agentic coding и длинный контекст",          size: "~18 GB",  category: "Code" },
    { name: "qwen2.5-coder:7b",  desc: "Qwen 2.5 Coder 7B — практичная модель для кода",               size: "~4.7 GB", category: "Code" },
    { name: "deepseek-r1:8b",    desc: "DeepSeek R1 8B — reasoning-модель",                            size: "~4.9 GB", category: "DeepSeek", think: true },
    { name: "deepseek-r1:14b",   desc: "DeepSeek R1 14B — более сильное рассуждение",                  size: "~9 GB",   category: "DeepSeek", think: true },
    { name: "deepseek-coder:6.7b", desc: "DeepSeek Coder 6.7B — программирование и объяснение кода",    size: "~3.8 GB", category: "Code" },
    { name: "llama3.1:8b",       desc: "Meta Llama 3.1 8B — универсальная разговорная модель",         size: "~4.7 GB", category: "Meta" },
    { name: "llama3.2:3b",       desc: "Meta Llama 3.2 3B — лёгкая и быстрая",                         size: "~2 GB",   category: "Meta" },
    { name: "llama3.2:1b",       desc: "Meta Llama 3.2 1B — минимальная локальная модель",             size: "~1.3 GB", category: "Meta" },
    { name: "llama3.2-vision:11b", desc: "Meta Llama 3.2 Vision 11B — анализ изображений",             size: "~7.9 GB", category: "Vision",   vision: true },
    { name: "qwen3-vl:8b",       desc: "Qwen3-VL 8B — vision, tools, thinking",                         size: "~6 GB",   category: "Vision",   vision: true,  think: true },
    { name: "qwen2.5vl:7b",      desc: "Qwen2.5-VL 7B — мультимодальная модель для изображений",       size: "~5 GB",   category: "Vision",   vision: true },
    { name: "llava:7b",          desc: "LLaVA 7B — классическая vision-модель",                        size: "~4.7 GB", category: "Vision",   vision: true },
    { name: "llava-llama3:8b",   desc: "LLaVA Llama3 8B — vision + диалог",                            size: "~4.9 GB", category: "Vision",   vision: true },
    { name: "moondream:1.8b",    desc: "Moondream 1.8B — маленькая vision-модель",                     size: "~1.7 GB", category: "Vision",   vision: true },
    { name: "mistral:7b",        desc: "Mistral 7B — быстрая универсальная модель",                    size: "~4.1 GB", category: "Mistral" },
    { name: "mistral-nemo:12b",  desc: "Mistral Nemo 12B — баланс качества и скорости",                size: "~7.1 GB", category: "Mistral" },
    { name: "mistral-small:24b", desc: "Mistral Small 24B — сильная модель ниже 70B",                  size: "~14 GB",  category: "Mistral" },
    { name: "phi4:14b",          desc: "Microsoft Phi-4 14B — компактная сильная модель",              size: "~9 GB",   category: "Microsoft" },
    { name: "phi4-mini:3.8b",    desc: "Microsoft Phi-4 Mini — лёгкая multilingual/function calling",  size: "~2.5 GB", category: "Microsoft" },
    { name: "starcoder2:3b",     desc: "StarCoder2 3B — лёгкая модель для кода",                       size: "~1.7 GB", category: "Code" },
    { name: "codellama:7b",      desc: "Code Llama 7B — генерация и обсуждение кода",                  size: "~3.8 GB", category: "Code" },
    { name: "tinyllama:1.1b",    desc: "TinyLlama 1.1B — очень лёгкая модель",                         size: "~0.7 GB", category: "Small" },
    { name: "smollm2:1.7b",      desc: "SmolLM2 1.7B — компактная модель для слабых ПК",               size: "~1.1 GB", category: "Small" },
  ];

  // ============================================================
  //  PERSISTENCE
  // ============================================================
  async function loadData() {
    if (!window.api) return;
    const d = await window.api.dataGet();
    if (d && d.groups && d.chats) data = d;
    const s = await window.api.settingsGet();
    if (s) settings = Object.assign(settings, s);
    if (!settings.appLanguage) settings.appLanguage = "en";
    if (!settings.theme) settings.theme = "dark";
    if (!Array.isArray(settings.downloadedLanguages)) settings.downloadedLanguages = ["en"];
    if (!settings.downloadedLanguages.includes("en")) settings.downloadedLanguages.unshift("en");
  }
  async function persist() {
    if (!window.api) return;
    await window.api.dataSave(data);
    await window.api.settingsSave(settings);
  }

  function renderProgress() {
    const done = agentProgress.filter(item => item.status === "done").length;
    const total = agentProgress.length;
    if (progressCount) progressCount.textContent = `${done}/${total}`;
    if (progressCard) {
      progressCard.classList.toggle("show", total > 0);
      progressCard.classList.toggle("collapsed", total > 0 && progressDismissed);
    }
    if (progressHideBtn) {
      progressHideBtn.title = progressDismissed ? "Show progress" : "Collapse progress";
      progressHideBtn.setAttribute("aria-label", progressDismissed ? "Show progress" : "Collapse progress");
    }

    const renderInto = (root) => {
      if (!root) return;
      root.innerHTML = "";
      agentProgress.forEach(item => {
        const row = document.createElement("div");
        row.className = `progress-item ${item.status || "done"}`;
        const symbol = item.status === "denied" ? "×" : item.status === "pending" ? "" : "✓";
        row.innerHTML = `<span class="progress-dot">${symbol}</span><span class="progress-text">${escapeHtml(item.text)}</span>`;
        root.appendChild(row);
      });
    };

    renderInto(progressList);
  }

  function renderCodingPreview() {
    if (!panelProgressList) return;
    panelProgressList.innerHTML = "";
    codingPreviewItems.forEach(item => {
      if (item.kind === "overview") {
        const row = document.createElement("div");
        row.className = "panel-app-card";
        row.innerHTML = `
          <div class="panel-app-title">App preview</div>
          <div class="panel-app-name">${escapeHtml(item.name || "Nebula app")}</div>
          <div class="panel-app-grid">
            <span>Interface</span><strong>${escapeHtml(item.interface || "Generated UI")}</strong>
            <span>Entry</span><strong>${escapeHtml(item.entry || "main.txt")}</strong>
            <span>Run</span><code>${escapeHtml(item.run || "Open project folder")}</code>
          </div>
        `;
        panelProgressList.appendChild(row);
        return;
      }
      const row = document.createElement("div");
      row.className = `panel-code-card ${item.state === "edited" ? "edited" : "editing"}`;
      const preview = String(item.code || "").trim().split(/\r?\n/).slice(0, 7).join("\n");
      row.innerHTML = `
        ${renderCodeActivity(item)}
        ${item.summary ? `<div class="panel-code-summary">${escapeHtml(item.summary)}</div>` : ""}
        ${preview ? `<pre class="panel-code-preview"><code>${escapeHtml(preview)}</code></pre>` : ""}
      `;
      panelProgressList.appendChild(row);
    });
  }

  function upsertCodingPreview(activity, summary = "") {
    if (!activity) return;
    const key = `${activity.path || ""}${activity.file || "main.txt"}`;
    const item = Object.assign({}, activity, { key, summary });
    const index = codingPreviewItems.findIndex(existing => existing.key === key);
    if (index >= 0) codingPreviewItems[index] = Object.assign({}, codingPreviewItems[index], item);
    else codingPreviewItems.unshift(item);
    codingPreviewItems = codingPreviewItems.slice(0, 8);
    renderCodingPreview();
  }

  function inferAppPreview(activity) {
    if (!activity) return null;
    const file = activity.file || "main.txt";
    const entry = `${activity.path || ""}${file}`;
    const label = String(activity.label || "").toLowerCase();
    const code = String(activity.code || "").toLowerCase();
    let run = `open ${entry}`;
    let iface = "Code file";
    if (label === "py" || /\.py$/i.test(file)) {
      run = `py ${entry}`;
      iface = code.includes("pygame") ? "Pygame window" : code.includes("tkinter") ? "Desktop window" : "Python app";
    } else if (/\.(html|css)$/i.test(file)) {
      run = `open ${entry}`;
      iface = "Web interface";
    } else if (/\.(js|jsx|ts|tsx)$/i.test(file)) {
      run = /\.jsx|\.tsx$/i.test(file) ? "npm run dev" : `node ${entry}`;
      iface = "JavaScript interface";
    }
    return {
      kind: "overview",
      key: "__overview",
      name: file.replace(/\.[^.]+$/, "") || "Nebula app",
      interface: iface,
      entry,
      run
    };
  }

  function upsertAppPreview(activity) {
    const preview = inferAppPreview(activity);
    if (!preview) return;
    const index = codingPreviewItems.findIndex(item => item.key === preview.key);
    if (index >= 0) codingPreviewItems[index] = preview;
    else codingPreviewItems.unshift(preview);
    renderCodingPreview();
  }

  function addProgressItem(text, status = "done") {
    if (!text) return null;
    const item = { id: "p" + Date.now() + Math.random().toString(16).slice(2), text, status };
    agentProgress.push(item);
    if (agentProgress.length > 8) agentProgress = agentProgress.slice(-8);
    renderProgress();
    return item.id;
  }

  function updateProgressItem(id, status, text = null) {
    const item = agentProgress.find(p => p.id === id);
    if (!item) return;
    item.status = status;
    if (text) item.text = text;
    renderProgress();
  }

  function resetProgress() {
    agentProgress = [];
    progressDismissed = false;
    codingPreviewItems = [];
    renderProgress();
    renderCodingPreview();
  }

  function updateHomeMode() {
    const chat = getCurrentChat();
    const isEmpty = !chat || !chat.messages || chat.messages.length === 0;
    mainArea?.classList.toggle("home-mode", isEmpty && !isGenerating);
  }

  function applyTheme() {
    document.body.classList.toggle("theme-light", settings.theme === "light");
    if (themeSegment) {
      themeSegment.querySelectorAll("button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === settings.theme);
      });
    }
  }

  function renderSettings() {
    const downloaded = new Set(settings.downloadedLanguages || ["en"]);
    applyAppLanguageBasics();

    if (languagePackList) {
      languagePackList.innerHTML = "";
      APP_LANGUAGES.forEach(lang => {
        const installed = downloaded.has(lang.code);
        const selected = (settings.appLanguage || "en") === lang.code;
        const label = selected ? t("selected") : installed ? t("choose") : t("download");
        const row = document.createElement("div");
        row.className = `language-pack ${selected ? "selected" : ""}`;
        row.innerHTML = `
          <div>
            <div class="language-pack-name">${escapeHtml(lang.name)}</div>
            <div class="language-pack-code">${escapeHtml(lang.code.toUpperCase())}</div>
          </div>
          <button class="catalog-btn ${installed ? "" : "primary"}" data-lang="${lang.code}" ${selected ? "disabled" : ""}>${label}</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          const next = new Set(settings.downloadedLanguages || ["en"]);
          if (!installed) {
            next.add(lang.code);
          } else {
            settings.appLanguage = lang.code;
          }
          settings.downloadedLanguages = Array.from(next);
          applyAppLanguageBasics();
          renderSettings();
          persist();
        });
        languagePackList.appendChild(row);
      });
    }
    applyTheme();
  }

  function applyAppLanguageBasics() {
    document.documentElement.lang = settings.appLanguage || "en";
    document.title = "Nebula";
    const textById = {
      setupTitle: t("setupTitle"),
      closeSettingsBtn: "×",
      groupModalTitle: t("newFolder"),
      saveGroupBtn: t("create"),
      accessLabel: t(`access.${settings.accessMode || "ask"}`),
    };
    Object.entries(textById).forEach(([id, text]) => {
      const el = $(id);
      if (el) el.textContent = text;
    });
    const placeholders = [
      [inputEl, t("askPlaceholder")],
      [modelsSearch, t("modelSearch")],
      [$("groupInput"), t("folderPlaceholder")],
    ];
    placeholders.forEach(([el, text]) => { if (el) el.placeholder = text; });
    const navLabels = [
      ["newChatBtn", t("newChat")],
      ["openProjectsBtn", t("projects")],
    ];
    navLabels.forEach(([id, text]) => {
      const label = $(id)?.querySelector("span");
      if (label) label.textContent = text;
    });
    const sectionTitle = document.querySelector(".tab-section-title");
    if (sectionTitle) sectionTitle.textContent = t("recent");
    const modelsTitle = document.querySelector("#modelsModal .modal-header h2");
    if (modelsTitle) modelsTitle.textContent = t("models");
    if (modelLabel && !settings.selectedModel) modelLabel.textContent = t("chooseModel");
    const settingsTitle = document.querySelector("#settingsModal .modal-header h2");
    if (settingsTitle) settingsTitle.textContent = t("settings");
    const settingsTitles = settingsModal?.querySelectorAll(".settings-title");
    const settingsDescs = settingsModal?.querySelectorAll(".settings-desc");
    if (settingsTitles?.[0]) settingsTitles[0].textContent = t("theme");
    if (settingsDescs?.[0]) settingsDescs[0].textContent = t("themeDesc");
    if (settingsTitles?.[1]) settingsTitles[1].textContent = t("languagePacks");
    if (settingsDescs?.[1]) settingsDescs[1].textContent = t("languagePacksDesc");
    themeSegment?.querySelector('[data-theme="dark"]') && (themeSegment.querySelector('[data-theme="dark"]').textContent = t("dark"));
    themeSegment?.querySelector('[data-theme="light"]') && (themeSegment.querySelector('[data-theme="light"]').textContent = t("light"));
    const accessDescriptions = {
      en: {
        ask: "Ask before file changes.",
        auto: "Edit files automatically.",
        plan: "Plan before editing.",
        full: "Run with fewer confirmations.",
      },
      ru: {
        ask: "\u0421\u043f\u0440\u043e\u0441\u0438\u0442 \u043f\u0435\u0440\u0435\u0434 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435\u043c \u0444\u0430\u0439\u043b\u043e\u0432.",
        auto: "\u041c\u043e\u0436\u0435\u0442 \u0440\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0444\u0430\u0439\u043b\u044b \u0441\u0430\u043c.",
        plan: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u043b\u0430\u043d, \u043f\u043e\u0442\u043e\u043c \u043a\u043e\u0434.",
        full: "\u041c\u0435\u043d\u044c\u0448\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0439.",
      }
    };
    const descPack = accessDescriptions[settings.appLanguage] || accessDescriptions.en;
    accessDropdown?.querySelectorAll(".access-item").forEach(item => {
      const mode = item.dataset.access;
      const title = item.querySelector(".access-title");
      const desc = item.querySelector(".access-desc");
      if (title) title.textContent = t(`access.${mode}`);
      if (desc) desc.textContent = descPack[mode] || accessDescriptions.en[mode];
    });
    const quickLabels = [t("intro"), t("explain"), t("ideas"), t("translate")];
    document.querySelectorAll(".quick-btn").forEach((btn, index) => {
      if (quickLabels[index]) btn.textContent = quickLabels[index];
    });
    if (welcomeEl && welcomeEl.style.display !== "none" && welcomeTitle) {
      typeWelcomeTitle();
    }
  }

  function typeWelcomeTitle() {
    if (!welcomeTitle) return;
    if (typingTimer) clearInterval(typingTimer);
    const lines = Array.isArray(t("motivationLines")) ? t("motivationLines") : UI_TEXT.en.motivationLines;
    const line = lines[Math.floor(Math.random() * lines.length)];
    let index = 0;
    welcomeTitle.textContent = "";
    welcomeTitle.classList.add("typing");
    typingTimer = setInterval(() => {
      index += 1;
      welcomeTitle.textContent = line.slice(0, index);
      if (index >= line.length) {
        clearInterval(typingTimer);
        typingTimer = setTimeout(() => welcomeTitle.classList.remove("typing"), 650);
      }
    }, 28);
  }

  async function syncProjectFolders() {
    if (!window.api || !window.api.ensureProjectFolder) return;
    let changed = false;
    for (const group of data.groups) {
      if (!group.folderName) {
        const folder = await window.api.ensureProjectFolder(group.name);
        if (folder.ok) {
          group.folderName = folder.folderName;
          changed = true;
        }
      }
    }
    if (changed) await persist();
  }

  function getCurrentChat() {
    return data.chats.find(c => c.id === currentChatId);
  }

  // ============================================================
  //  OLLAMA STATUS
  // ============================================================
  async function checkOllama() {
    if (!window.api) return;
    const res = await window.api.ollamaStatus();
    ollamaRunning = res.running;
    if (ollamaRunning) {
      availableModels = res.models || [];
      statusDot.className = "status-dot online";
      if (!settings.selectedModel && availableModels.length > 0) {
        selectModel(availableModels[0].name);
      }
      if (availableModels.length === 0) {
        welcomeHint.textContent = "Нет моделей. Скачайте модель кнопкой «Выбрать модель» →.";
      } else {
        welcomeHint.textContent = `${availableModels.length} моделей доступно. Готово к работе.`;
      }
    } else {
      availableModels = [];
      statusDot.className = res.installing ? "status-dot loading" : "status-dot offline";
      if (res.installing) {
        welcomeHint.textContent = "Ollama устанавливается. Nebula запустит её автоматически после установки.";
      } else if (!res.installed) {
        welcomeHint.textContent = "Ollama не найдена. Nebula попробует установить и запустить её автоматически.";
      } else {
        welcomeHint.textContent = "Ollama запускается автоматически.";
      }
      if (!ollamaEnsureInFlight && window.api && window.api.ollamaEnsure) {
        ollamaEnsureInFlight = true;
        statusDot.className = "status-dot loading";
        window.api.ollamaEnsure()
          .then(() => setTimeout(checkOllama, 500))
          .finally(() => { ollamaEnsureInFlight = false; });
      }
    }
    renderModelDropdown();
  }

  // ============================================================
  //  MODEL SELECTOR
  // ============================================================
  function modelSupportsVision(name) {
    const n = name.toLowerCase();
    const cat = MODEL_CATALOG.find(m => m.name === name);
    if (cat && cat.vision) return true;
    return n.includes("vision") || n.includes("llava") || n.includes("vl") || n.includes("minicpm") || n.includes("moondream") || n.includes("gemma3") || n.includes("gemma4");
  }
  function modelSupportsThink(name) {
    const cat = MODEL_CATALOG.find(m => m.name === name);
    if (cat && cat.think) return true;
    const n = name.toLowerCase();
    return n.includes("r1") || n.includes("gpt-oss") || n.includes("qwen3") || n.includes("deepseek-r1");
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    const gb = bytes / 1e9;
    if (gb >= 1) return gb.toFixed(1) + " GB";
    return (bytes / 1e6).toFixed(0) + " MB";
  }

  function getModelsByLevel() {
    const levels = { "Лёгкие (<4GB)": [], "Стандарт (4-8GB)": [], "Мощные (>8GB)": [] };
    availableModels.forEach(m => {
      const gb = (m.size || 0) / 1e9;
      const key = gb >= 8 ? "Мощные (>8GB)" : gb >= 4 ? "Стандарт (4-8GB)" : "Лёгкие (<4GB)";
      levels[key].push(m);
    });
    Object.keys(levels).forEach(k => { if (levels[k].length === 0) delete levels[k]; });
    return levels;
  }

  function renderModelDropdown() {
    modelDropdown.innerHTML = "";
    if (!ollamaRunning) {
      modelDropdown.innerHTML = `
        <div class="model-empty">
          ${statusDot.classList.contains("loading") ? "Ollama устанавливается или запускается." : "Ollama запускается автоматически."}<br>
          <small>Подождите несколько секунд.</small>
        </div>`;
      return;
    }
    if (availableModels.length === 0) {
      modelDropdown.innerHTML = `
        <div class="model-empty">
          Нет установленных моделей.<br>
          <button class="model-empty-btn" id="ddOpenModels">Скачать модель</button>
        </div>`;
      const b = $("ddOpenModels");
      if (b) b.addEventListener("click", () => { modelDropdown.classList.remove("show"); openModelsModal(); });
      return;
    }

    const levels = getModelsByLevel();
    Object.entries(levels).forEach(([level, models]) => {
      const label = document.createElement("div");
      label.className = "model-group-label";
      label.textContent = level;
      modelDropdown.appendChild(label);
      models.forEach(m => {
        const item = document.createElement("div");
        item.className = "model-item" + (m.name === settings.selectedModel ? " selected" : "");
        const flags = [];
        if (modelSupportsVision(m.name)) flags.push("Vision");
        if (modelSupportsThink(m.name)) flags.push("Think");
        item.innerHTML = `
          <span class="model-item-name">${m.name} ${flags.length ? `<span style="opacity:0.6">${flags.join(" ")}</span>` : ""}</span>
          ${m.size ? `<span class="model-item-size">${formatSize(m.size)}</span>` : ""}
        `;
        item.addEventListener("click", () => {
          selectModel(m.name);
          modelDropdown.classList.remove("show");
        });
        modelDropdown.appendChild(item);
      });
    });

    // кнопка "ещё модели" → модалка
    const moreRow = document.createElement("div");
    moreRow.className = "model-download-row";
    moreRow.innerHTML = `<span>Нужно больше моделей?</span>`;
    const moreBtn = document.createElement("button");
    moreBtn.className = "catalog-btn primary";
    moreBtn.textContent = "Каталог";
    moreBtn.addEventListener("click", () => { modelDropdown.classList.remove("show"); openModelsModal(); });
    moreRow.appendChild(moreBtn);
    modelDropdown.appendChild(moreRow);
  }

  function selectModel(name) {
    settings.selectedModel = name;
    modelLabel.textContent = name;
    welcomeHint.textContent = `Модель: ${name} — готов.`;
    persist();
    renderModelDropdown();
  }

  modelBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    thinkDropdown.classList.remove("show");
    accessDropdown?.classList.remove("show");
    modelDropdown.classList.toggle("show");
    renderModelDropdown();
  });

  // ============================================================
  //  THINKING SELECTOR
  // ============================================================
  const THINK_LABELS = {
    max:    "Thinking: Max",
    high:   "Thinking: High",
    medium: "Thinking: Medium",
    low:    "Thinking: Low",
    none:   "No thinking",
  };
  function setThinkLevel(level) {
    settings.thinkLevel = level;
    thinkLabel.textContent = THINK_LABELS[level];
    thinkDropdown.querySelectorAll(".think-item").forEach(it => {
      it.classList.toggle("active", it.dataset.think === level);
    });
    persist();
  }
  thinkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    modelDropdown.classList.remove("show");
    accessDropdown?.classList.remove("show");
    thinkDropdown.classList.toggle("show");
  });
  thinkDropdown.querySelectorAll(".think-item").forEach(it => {
    it.addEventListener("click", () => {
      setThinkLevel(it.dataset.think);
      thinkDropdown.classList.remove("show");
    });
  });

  const ACCESS_LABELS = {
    ask: "Ask before changes",
    auto: "Edit automatically",
    plan: "Plan mode",
    full: "Full access",
  };
  function setAccessMode(mode) {
    settings.accessMode = mode || "ask";
    if (accessLabel) accessLabel.textContent = t(`access.${settings.accessMode}`) || ACCESS_LABELS[settings.accessMode] || ACCESS_LABELS.ask;
    if (accessDropdown) {
      accessDropdown.querySelectorAll(".access-item").forEach(it => {
        it.classList.toggle("active", it.dataset.access === settings.accessMode);
      });
    }
    persist();
  }
  accessBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    modelDropdown.classList.remove("show");
    thinkDropdown.classList.remove("show");
    accessDropdown?.classList.toggle("show");
  });
  accessDropdown?.querySelectorAll(".access-item").forEach(it => {
    it.addEventListener("click", () => {
      setAccessMode(it.dataset.access);
      accessDropdown.classList.remove("show");
    });
  });

  const thinkTexts = {
    max: "Max thinking lvl",
    high: "High",
    medium: "Medium",
    low: "Low",
    none: "No thinking",
  };
  thinkDropdown.querySelectorAll(".think-item").forEach(it => {
    it.textContent = thinkTexts[it.dataset.think] || it.textContent;
  });

  // закрытие дропдаунов по клику вне
  document.addEventListener("click", () => {
    modelDropdown.classList.remove("show");
    thinkDropdown.classList.remove("show");
    accessDropdown?.classList.remove("show");
  });
  window.addEventListener("resize", () => {
    if (setupSheet?.classList.contains("show")) positionSetupSheet();
  });

  // ============================================================
  //  STATUS PILL — запуск Ollama
  // ============================================================
  $("statusPill").addEventListener("click", async () => {
    statusDot.className = "status-dot loading";
    await window.api.ollamaEnsure();
    await checkOllama();
  });
  toggleTabBtn?.addEventListener("click", () => {
    document.querySelector(".app")?.classList.add("tab-collapsed");
  });
  sideLogo?.addEventListener("click", () => {
    document.querySelector(".app")?.classList.remove("tab-collapsed");
  });
  progressHideBtn?.addEventListener("click", () => {
    progressDismissed = !progressDismissed;
    renderProgress();
  });
  settingsBtn?.addEventListener("click", () => {
    renderSettings();
    settingsModal?.classList.add("show");
  });
  closeSettingsBtn?.addEventListener("click", () => settingsModal?.classList.remove("show"));
  settingsModal?.addEventListener("click", e => {
    if (e.target === settingsModal) settingsModal.classList.remove("show");
  });
  appLanguageSelect?.addEventListener("change", () => {
    settings.appLanguage = appLanguageSelect.value || "en";
    applyAppLanguageBasics();
    renderSettings();
    persist();
  });
  themeSegment?.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      settings.theme = btn.dataset.theme || "dark";
      applyTheme();
      persist();
    });
  });

  openProjectsBtn.addEventListener("click", async () => {
    if (!window.api || !window.api.openProjectsFolder) return;
    const res = await window.api.openProjectsFolder();
    if (res.ok) {
      appendTerminalLine(`explorer ${res.path}`);
    }
    if (!res.ok) alert("Не удалось открыть папку проектов: " + (res.error || res.path || "неизвестная ошибка"));
  });
  searchChatsBtn?.addEventListener("click", () => {
    const query = prompt("Искать чаты:");
    if (!query) return;
    const found = data.chats.find(chat => {
      const title = chat.title || "";
      const text = (chat.messages || []).map(m => m.content || "").join("\n");
      return `${title}\n${text}`.toLowerCase().includes(query.toLowerCase());
    });
    if (found) loadChat(found.id);
  });

  function appendTerminalLine(text) {
    if (!terminalOutput) return;
    terminalOutput.textContent += (terminalOutput.textContent ? "\n" : "") + text;
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  async function updateTerminalCwd() {
    if (!window.api || !window.api.getProjectsRoot || !terminalCwd) return;
    const res = await window.api.getProjectsRoot();
    if (res.ok) terminalCwd.textContent = `PS ${res.path}`;
  }

  toolbarExplorerBtn?.addEventListener("click", async () => {
    const res = await window.api.openProjectsFolder();
    if (res.ok) {
      appendTerminalLine(`explorer ${res.path}`);
    }
  });
  toolbarTerminalBtn?.addEventListener("click", async () => {
    terminalPanel.classList.toggle("show");
    toolbarTerminalBtn.classList.toggle("active", terminalPanel.classList.contains("show"));
    await updateTerminalCwd();
    if (terminalPanel.classList.contains("show") && !terminalOutput.textContent) {
      appendTerminalLine("Windows PowerShell");
      appendTerminalLine("Terminal ready.");
    }
    terminalInput?.focus();
  });
  toolbarPanelBtn?.addEventListener("click", () => {
    sidePanel.classList.toggle("show");
    toolbarPanelBtn.classList.toggle("active", sidePanel.classList.contains("show"));
    mainArea?.classList.toggle("panel-open", sidePanel.classList.contains("show"));
  });
  closeTerminalBtn?.addEventListener("click", () => {
    terminalPanel.classList.remove("show");
    toolbarTerminalBtn?.classList.remove("active");
  });
  closePanelBtn?.addEventListener("click", () => {
    sidePanel.classList.remove("show");
    toolbarPanelBtn?.classList.remove("active");
    mainArea?.classList.remove("panel-open");
  });
  terminalInput?.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const cmd = terminalInput.value.trim();
    if (!cmd) return;
    terminalInput.value = "";
    appendTerminalLine(`${terminalCwd.textContent}> ${cmd}`);
    if (cmd.toLowerCase() === "explorer") {
      const res = await window.api.openProjectsFolder();
      if (res.ok) {
        appendTerminalLine(`explorer ${res.path}`);
      }
    } else {
      appendTerminalLine("Command execution is routed through Nebula actions.");
    }
  });

  // ============================================================
  //  INLINE THINKING INDICATOR
  // ============================================================
  function showThinkingMessage() {
    removeThinkingMessage();
    currentThinkingLines = [
      "Reading the request",
      "Choosing the right model context",
      "Preparing an answer"
    ];
    thinkingEl = document.createElement("div");
    thinkingEl.className = "message assistant thinking-message";
    thinkingEl.innerHTML = `
      <div class="message-body">
        <button class="thinking-inline" type="button">
          <span class="thinking-spark" aria-hidden="true"></span>
          <span class="thinking-label">Thinking</span>
        </button>
        <div class="thinking-details">
          <div class="thinking-card">${currentThinkingLines.map(line => `<div class="thinking-log-line">${escapeHtml(line)}</div>`).join("")}</div>
        </div>
      </div>
    `;
    thinkingEl.querySelector(".thinking-inline").addEventListener("click", () => thinkingEl.classList.toggle("open"));
    messagesEl.appendChild(thinkingEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function addThinkingLine(line) {
    if (!thinkingEl) return;
    currentThinkingLines.push(line);
    const card = thinkingEl.querySelector(".thinking-card");
    if (card) card.innerHTML = currentThinkingLines.map(item => `<div class="thinking-log-line">${escapeHtml(item)}</div>`).join("");
  }

  function closeApproval(value) {
    approvalModal?.classList.remove("show");
    if (pendingApprovalResolve) {
      const resolve = pendingApprovalResolve;
      pendingApprovalResolve = null;
      resolve(value);
    }
  }

  function requestChangeApproval(filePath, summary) {
    if (!approvalModal || !approvalText) return Promise.resolve("accept");
    approvalText.textContent = summary || `Nebula wants to edit ${filePath}.`;
    approvalModal.classList.add("show");
    return new Promise(resolve => {
      pendingApprovalResolve = resolve;
    });
  }

  approvalAcceptBtn?.addEventListener("click", () => closeApproval("accept"));
  approvalAcceptChatBtn?.addEventListener("click", () => closeApproval("chat"));
  approvalDenyBtn?.addEventListener("click", () => closeApproval("deny"));
  approvalCloseBtn?.addEventListener("click", () => closeApproval("deny"));

  function removeThinkingMessage() {
    if (thinkingEl) {
      thinkingEl.remove();
      thinkingEl = null;
    }
  }

  const LANGUAGE_META = {
    js: { label: "JS", ext: "js", file: "main.js" },
    javascript: { label: "JS", ext: "js", file: "main.js" },
    jsx: { label: "JSX", ext: "jsx", file: "App.jsx" },
    ts: { label: "TS", ext: "ts", file: "main.ts" },
    typescript: { label: "TS", ext: "ts", file: "main.ts" },
    tsx: { label: "TSX", ext: "tsx", file: "App.tsx" },
    py: { label: "PY", ext: "py", file: "main.py" },
    python: { label: "PY", ext: "py", file: "main.py" },
    html: { label: "HTML", ext: "html", file: "index.html" },
    css: { label: "CSS", ext: "css", file: "styles.css" },
    json: { label: "JSON", ext: "json", file: "data.json" },
    java: { label: "JAVA", ext: "java", file: "Main.java" },
    c: { label: "C", ext: "c", file: "main.c" },
    cpp: { label: "C++", ext: "cpp", file: "main.cpp" },
    "c++": { label: "C++", ext: "cpp", file: "main.cpp" },
    cs: { label: "C#", ext: "cs", file: "Program.cs" },
    go: { label: "GO", ext: "go", file: "main.go" },
    rs: { label: "RS", ext: "rs", file: "main.rs" },
    rust: { label: "RS", ext: "rs", file: "main.rs" },
    php: { label: "PHP", ext: "php", file: "index.php" },
    rb: { label: "RB", ext: "rb", file: "main.rb" },
    ruby: { label: "RB", ext: "rb", file: "main.rb" },
    sh: { label: "SH", ext: "sh", file: "script.sh" },
    bash: { label: "SH", ext: "sh", file: "script.sh" },
    sql: { label: "SQL", ext: "sql", file: "query.sql" }
  };

  function normalizeLanguage(raw) {
    const token = String(raw || "").trim().split(/\s+/)[0].replace(/^[./\\]+/, "").toLowerCase();
    return token || "";
  }

  function stripCodeBlocks(text) {
    return String(text || "")
      .replace(/```[^\n`]*\n[\s\S]*?(?:```|$)/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function inferCodeFile(lang, info) {
    const fileMatch = String(info || "").match(/(?:^|\s)([\w.-]+\.[a-z0-9]+)(?:\s|$)/i);
    if (fileMatch) return fileMatch[1];
    const meta = LANGUAGE_META[lang] || { label: (lang || "CODE").slice(0, 6).toUpperCase(), file: "main.txt" };
    return meta.file;
  }

  function inferCodePath(fileName) {
    if (/\.(js|jsx|ts|tsx)$/i.test(fileName)) return "electron/";
    if (/\.(html|css)$/i.test(fileName)) return "web/";
    if (/\.(py|rb|php|sh)$/i.test(fileName)) return "src/";
    return "";
  }

  function getLatestCodeActivity(text) {
    const re = /```([^\n`]*)\n([\s\S]*?)(?:```|$)/g;
    let match;
    let latest = null;
    while ((match = re.exec(text))) {
      const info = match[1] || "";
      const code = match[2] || "";
      const lang = normalizeLanguage(info);
      const meta = LANGUAGE_META[lang] || { label: (lang || "CODE").slice(0, 6).toUpperCase(), file: "main.txt" };
      const file = inferCodeFile(lang, info);
      latest = {
        state: "editing",
        label: meta.label,
        file,
        path: inferCodePath(file),
        added: code.split(/\r?\n/).filter(line => line.trim()).length,
        removed: 0,
        code
      };
    }
    return latest;
  }

  const PYTHON_STDLIB = new Set([
    "abc","argparse","asyncio","base64","collections","csv","datetime","decimal","functools","hashlib","heapq",
    "html","http","itertools","json","logging","math","os","pathlib","pickle","random","re","shutil","socket",
    "sqlite3","statistics","string","subprocess","sys","threading","time","tkinter","typing","urllib","uuid"
  ]);
  const PYTHON_PACKAGE_MAP = {
    cv2: "opencv-python",
    PIL: "pillow",
    sklearn: "scikit-learn",
    yaml: "pyyaml",
    bs4: "beautifulsoup4",
    dotenv: "python-dotenv",
  };

  function detectPythonPackages(activity) {
    if (!activity || !/^(py|python)$/i.test(activity.label || "") && !/\.py$/i.test(activity.file || "")) return [];
    const code = String(activity.code || "");
    const found = new Set();
    const re = /^\s*(?:import\s+([a-zA-Z_][\w.]*)|from\s+([a-zA-Z_][\w.]*)\s+import\s+)/gm;
    let match;
    while ((match = re.exec(code))) {
      const root = String(match[1] || match[2] || "").split(".")[0];
      if (!root || PYTHON_STDLIB.has(root)) continue;
      found.add(PYTHON_PACKAGE_MAP[root] || root);
    }
    return Array.from(found);
  }

  async function maybeInstallPythonPackages(activity, folderName) {
    const packages = detectPythonPackages(activity);
    if (!packages.length || settings.accessMode === "plan" || !window.api?.installPythonPackages) return;
    if (settings.accessMode === "ask") {
      const decision = await requestChangeApproval(
        "python packages",
        `Nebula needs to install Python packages so the app can run: ${packages.join(", ")}`
      );
      if (decision === "deny") {
        addProgressItem(`Denied package install ${packages.join(", ")}`, "denied");
        upsertCodingPreview(Object.assign({}, activity, { state: "editing" }), `Dependency install denied: ${packages.join(", ")}`);
        return;
      }
    }
    const progressId = addProgressItem(`Installing ${packages.join(", ")}`, "pending");
    appendTerminalLine(`py -m pip install ${packages.join(" ")}`);
    const result = await window.api.installPythonPackages(packages, folderName);
    if (result && result.ok) {
      updateProgressItem(progressId, "done", `Installed ${packages.join(", ")}`);
      upsertCodingPreview(Object.assign({}, activity, { state: "edited" }), `Dependencies installed: ${packages.join(", ")}`);
    } else {
      updateProgressItem(progressId, "denied", `Failed install ${packages.join(", ")}`);
      upsertCodingPreview(Object.assign({}, activity, { state: "editing" }), `Dependency install failed: ${result?.error || "pip failed"}`);
    }
  }

  function renderCodeActivity(activity) {
    if (!activity) return "";
    const stateText = activity.state === "edited" ? "Edited" : "Editing";
    const langClass = `lang-${String(activity.label || "code").toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    return `
      <div class="code-activity ${activity.state === "edited" ? "edited" : "editing"}">
        <span class="code-activity-pencil" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/><path d="m15 5 4 4"/></svg>
        </span>
        <span class="code-activity-state">${stateText}</span>
        <span class="code-lang-icon ${langClass}">${languageIconSvg(activity.label || "CODE")}</span>
        <span class="code-file-name">${escapeHtml(activity.file || "main.txt")}</span>
        ${activity.path ? `<span class="code-file-path">${escapeHtml(activity.path)}</span>` : ""}
        <span class="code-lines added">+${activity.added || 0}</span>
        <span class="code-lines removed">-${activity.removed || 0}</span>
      </div>
    `;
  }

  function languageIconSvg(label) {
    const l = String(label || "").toLowerCase();
    if (l === "html") return `<svg viewBox="0 0 64 64" aria-label="HTML"><path fill="#e44d26" d="M10 4h44l-4 50-18 6-18-6L10 4z"/><path fill="#f16529" d="M32 8h18l-3.4 42.8L32 55.8V8z"/><path fill="#fff" d="M20 17h24l-.5 6H26l.4 5H43l-1.3 16L32 47l-9.7-3-.7-8h6l.3 3.5 4.1 1.2 4.2-1.2.5-5.5H21.2L20 17z"/></svg>`;
    if (l === "css") return `<svg viewBox="0 0 64 64" aria-label="CSS"><path fill="#1572b6" d="M10 4h44l-4 50-18 6-18-6L10 4z"/><path fill="#33a9dc" d="M32 8h18l-3.4 42.8L32 55.8V8z"/><path fill="#fff" d="M20 17h24l-.5 6H27l.4 5h15.6l-1.3 16L32 47l-9.7-3-.6-7h6l.2 2.5 4.1 1.2 4.2-1.2.4-5.4H21.3L20 17z"/></svg>`;
    if (l === "py") return `<svg viewBox="0 0 64 64" aria-label="Python"><path fill="#3776ab" d="M31 4c-12 0-11 5-11 5v5h12v2H15s-8-1-8 12 7 12 7 12h4v-6s0-7 7-7h12s6 0 6-6V10s1-6-12-6z"/><circle cx="25" cy="10" r="2" fill="#fff"/><path fill="#ffd43b" d="M33 60c12 0 11-5 11-5v-5H32v-2h17s8 1 8-12-7-12-7-12h-4v6s0 7-7 7H27s-6 0-6 6v11s-1 6 12 6z"/><circle cx="39" cy="54" r="2" fill="#fff"/></svg>`;
    if (l === "c++" || l === "cpp") return `<svg viewBox="0 0 64 64" aria-label="C++"><path fill="#659ad2" d="M32 2 58 17v30L32 62 6 47V17L32 2z"/><path fill="#00599c" d="M32 2 58 17v30L32 62V2z"/><path fill="#fff" d="M31 42c-8 0-14-6-14-14s6-14 14-14c5 0 9 2 12 6l-5 3c-2-2-4-3-7-3-5 0-8 3-8 8s3 8 8 8c3 0 5-1 7-3l5 3c-3 4-7 6-12 6zM44 25h4v-4h3v4h4v3h-4v4h-3v-4h-4v-3zm9 0h4v-4h3v4h4v3h-4v4h-3v-4h-4v-3z"/></svg>`;
    if (l === "js") return `<svg viewBox="0 0 64 64" aria-label="JavaScript"><rect width="56" height="56" x="4" y="4" rx="6" fill="#f7df1e"/><path fill="#111" d="M22 46c1 2 3 3 5 3 3 0 5-1 5-5V22h6v22c0 7-4 10-10 10-5 0-9-2-11-6l5-2zm22 0c2 3 4 4 7 4 3 0 5-1 5-3 0-3-3-4-6-5l-2-1c-5-2-8-4-8-10s4-9 10-9c4 0 8 1 10 5l-5 3c-1-2-3-3-5-3s-4 1-4 3 2 3 6 5l2 1c6 2 9 5 9 10 0 6-5 9-12 9-6 0-10-3-12-7l5-2z"/></svg>`;
    return `<span class="code-lang-text">${escapeHtml(label).slice(0, 5)}</span>`;
  }

  function upsertCodeActivity(container, activity) {
    if (!activity) return;
    const previousAdded = lastCodeActivity ? lastCodeActivity.added : null;
    const previousRemoved = lastCodeActivity ? lastCodeActivity.removed : null;
    lastCodeActivity = activity;
    if (!activeCodeActivityEl) {
      activeCodeActivityEl = document.createElement("div");
      activeCodeActivityEl.className = "code-activity-wrap";
      const actions = container.querySelector(".message-actions");
      if (actions) container.insertBefore(activeCodeActivityEl, actions);
      else container.appendChild(activeCodeActivityEl);
    }
    activeCodeActivityEl.innerHTML = renderCodeActivity(activity);
    upsertAppPreview(activity);
    upsertCodingPreview(activity, activity.state === "edited" ? "Saved file preview" : "Streaming code preview");
    const addedEl = activeCodeActivityEl.querySelector(".code-lines.added");
    const removedEl = activeCodeActivityEl.querySelector(".code-lines.removed");
    if (previousAdded !== null && previousAdded !== activity.added && addedEl) {
      addedEl.classList.add("bump");
      setTimeout(() => addedEl.classList.remove("bump"), 240);
    }
    if (previousRemoved !== null && previousRemoved !== activity.removed && removedEl) {
      removedEl.classList.add("bump");
      setTimeout(() => removedEl.classList.remove("bump"), 240);
    }
  }

  async function ensureCodeProjectForCurrentChat() {
    const chat = getCurrentChat();
    if (!chat) return null;
    if (chat.groupId) {
      const existing = data.groups.find(g => g.id === chat.groupId);
      return existing ? existing.folderName || existing.name : null;
    }
    const groupName = "NebulaProject";
    let folderName = groupName;
    if (window.api && window.api.ensureProjectFolder) {
      const folder = await window.api.ensureProjectFolder(groupName);
      if (folder.ok) folderName = folder.folderName;
    }
    const group = { id: "g" + Date.now(), name: folderName, folderName, collapsed: false };
    data.groups.push(group);
    chat.groupId = group.id;
    chat.updatedAt = Date.now();
    addProgressItem(`Created project ${folderName}`);
    renderSidebar();
    persist();
    return folderName;
  }

  async function writeLatestCodeActivity() {
    if (!lastCodeActivity || !lastCodeActivity.code || !window.api || !window.api.writeProjectFile) return;
    const folderName = currentCodeProjectFolderName || await ensureCodeProjectForCurrentChat();
    if (!folderName) return;
    const filePath = `${lastCodeActivity.path || ""}${lastCodeActivity.file || "main.txt"}`;
    if (settings.accessMode === "plan") {
      addProgressItem(`Plan mode: prepared ${filePath}, no file edited`);
      upsertCodingPreview(Object.assign({}, lastCodeActivity, { state: "editing" }), `Plan only: ${filePath}`);
      return;
    }
    let fileAlreadyExists = false;
    if (window.api.projectFileExists) {
      const info = await window.api.projectFileExists(folderName, filePath);
      fileAlreadyExists = !!(info && info.ok && info.exists);
    }
    const needsApproval = fileAlreadyExists && settings.accessMode === "ask" && acceptedChangeChatId !== currentChatId;
    if (needsApproval) {
      const decision = await requestChangeApproval(filePath, `Nebula wants to change an existing file: ${filePath}`);
      if (decision === "deny") {
        addProgressItem(`Denied edit ${filePath}`, "denied");
        upsertCodingPreview(Object.assign({}, lastCodeActivity, { state: "editing" }), `Denied: ${filePath}`);
        return;
      }
      if (decision === "chat") acceptedChangeChatId = currentChatId;
    }
    const progressId = addProgressItem(`${fileAlreadyExists ? "Editing" : "Creating"} ${filePath}`, "pending");
    const res = await window.api.writeProjectFile(folderName, filePath, lastCodeActivity.code);
    if (res && res.ok) {
      updateProgressItem(progressId, "done", `${res.existed ? "Edited" : "Created"} ${filePath}`);
      upsertCodingPreview(Object.assign({}, lastCodeActivity, { state: "edited" }), `${res.existed ? "Edited" : "Created"} ${filePath}`);
      await maybeInstallPythonPackages(lastCodeActivity, folderName);
    } else {
      updateProgressItem(progressId, "denied", `Failed ${filePath}`);
      upsertCodingPreview(Object.assign({}, lastCodeActivity, { state: "editing" }), `Failed: ${filePath}`);
    }
  }

  // ============================================================
  //  ATTACHMENTS
  // ============================================================
  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    for (const file of fileInput.files) addAttachment(file);
    fileInput.value = "";
  });

  function addAttachment(file) {
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        attachments.push({ kind: "image", name: file.name, dataUrl, base64 });
        renderAttachments();
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        attachments.push({ kind: "file", name: file.name, text: reader.result });
        renderAttachments();
      };
      reader.readAsText(file);
    }
  }

  function renderAttachments() {
    if (attachments.length === 0) { attachmentStrip.style.display = "none"; return; }
    attachmentStrip.style.display = "flex";
    attachmentStrip.innerHTML = "";
    attachments.forEach((a, idx) => {
      const el = document.createElement("div");
      el.className = "attachment-item" + (a.kind === "file" ? " file" : "");
      if (a.kind === "image") {
        el.innerHTML = `<img src="${a.dataUrl}" alt=""><button class="attachment-remove" data-idx="${idx}">&times;</button>`;
      } else {
        el.innerHTML = `
          <span class="file-icon"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-4-6zm-1 7V3.5L18.5 9H13z"/></svg></span>
          <span class="file-name">${a.name}</span>
          <button class="attachment-remove" data-idx="${idx}" style="position:static;width:16px;height:16px;background:transparent;color:var(--text-muted)">&times;</button>
        `;
      }
      attachmentStrip.appendChild(el);
    });
    attachmentStrip.querySelectorAll(".attachment-remove").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        attachments.splice(parseInt(b.dataset.idx), 1);
        renderAttachments();
        updateSendBtn();
      });
    });
  }

  // drag&drop файлов в composer
  const composerInner = $("composerInner");
  let dragCounter = 0;
  composerInner.addEventListener("dragenter", e => {
    e.preventDefault(); dragCounter++;
    const field = composerInner.querySelector(".composer-field");
    if (field) field.style.borderColor = "#666";
  });
  composerInner.addEventListener("dragover", e => { e.preventDefault(); });
  composerInner.addEventListener("dragleave", e => {
    e.preventDefault(); dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      const field = composerInner.querySelector(".composer-field");
      if (field) field.style.borderColor = "";
    }
  });
  composerInner.addEventListener("drop", e => {
    e.preventDefault(); dragCounter = 0;
    const field = composerInner.querySelector(".composer-field");
    if (field) field.style.borderColor = "";
    if (e.dataTransfer && e.dataTransfer.files) {
      for (const f of e.dataTransfer.files) addAttachment(f);
    }
  });

  // ============================================================
  //  MARKDOWN
  // ============================================================
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function renderMarkdown(text) {
    // Убираем <think>...</think> блоки из видимого вывода
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    cleaned = cleaned.replace(/<think>/gi, "").replace(/<\/think>/gi, "");
    let html = escapeHtml(cleaned);

    // Блочные элементы обрабатываем построчно
    const lines = html.split("\n");
    const out = [];
    let inUl = false, inOl = false, inCode = false, codeLang = "", codeBuf = [];

    function closeLists() {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // код-блок
      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (!inCode) { inCode = true; codeLang = fence[1]; codeBuf = []; }
        else { out.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`); inCode = false; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      // заголовки
      let m;
      if ((m = line.match(/^### (.+)$/))) { closeLists(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
      if ((m = line.match(/^## (.+)$/)))  { closeLists(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
      if ((m = line.match(/^# (.+)$/)))   { closeLists(); out.push(`<h1>${inline(m[1])}</h1>`); continue; }
      if ((m = line.match(/^&gt; (.+)$/))) { closeLists(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }

      // ненумерованный список
      if ((m = line.match(/^[\-\*] (.+)$/))) {
        if (inOl) { out.push("</ol>"); inOl = false; }
        if (!inUl) { out.push("<ul>"); inUl = true; }
        out.push(`<li>${inline(m[1])}</li>`);
        continue;
      }
      // нумерованный список
      if ((m = line.match(/^\d+\. (.+)$/))) {
        if (inUl) { out.push("</ul>"); inUl = false; }
        if (!inOl) { out.push("<ol>"); inOl = true; }
        out.push(`<li>${inline(m[1])}</li>`);
        continue;
      }

      closeLists();
      // пустая строка → разделитель абзаца
      if (line.trim() === "") out.push("");
      else out.push(inline(line));
    }
    if (inCode) out.push(`<pre><code>${codeBuf.join("\n")}</code></pre>`);
    closeLists();

    // Собираем в абзацы
    let body = out.join("\n");
    body = body.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
    // удаляем <br> вокруг блочных элементов (если блок стоит отдельно в абзаце)
    body = body.replace(/<br>(<(?:ul|ol|pre|h1|h2|h3|blockquote|table))/g, "$1");
    body = body.replace(/(<\/(?:ul|ol|pre|h1|h2|h3|blockquote|table)>)<br>/g, "$1");
    // удаляем пустые <p></p>
    body = body.replace(/<p>\s*<\/p>/g, "");
    return `<p>${body}</p>`;
  }

  // инлайн-форматирование: code, bold, italic
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // ============================================================
  //  MESSAGES RENDERING
  // ============================================================
  function createMessageElement(msg) {
    const role = msg.role;
    const m = document.createElement("div");
    m.className = `message ${role}`;
    const body = document.createElement("div");
    body.className = "message-body";

    const textEl = document.createElement("div");
    textEl.className = "message-text";
    const visibleAssistantText = msg.codeActivity ? stripCodeBlocks(msg.content || "") : (msg.content || "");
    textEl.innerHTML = role === "user" ? escapeHtml(msg.content) : renderMarkdown(visibleAssistantText);
    if (role === "assistant" && !visibleAssistantText.trim()) textEl.style.display = "none";
    body.appendChild(textEl);
    if (role === "assistant" && msg.codeActivity) {
      const activityWrap = document.createElement("div");
      activityWrap.className = "code-activity-wrap";
      const finalActivity = Object.assign({}, msg.codeActivity, { state: msg.codeActivity.state || "edited" });
      activityWrap.innerHTML = renderCodeActivity(finalActivity);
      body.appendChild(activityWrap);
    }

    // вложения (картинки/файлы пользователя)
    if (role === "user" && msg.images && msg.images.length) {
      const att = document.createElement("div");
      att.className = "message-attachments";
      msg.images.forEach(dataUrl => {
        const img = document.createElement("img");
        img.className = "chat-image";
        img.src = dataUrl;
        img.addEventListener("click", () => window.open(dataUrl));
        att.appendChild(img);
      });
      body.appendChild(att);
    }

    if (role === "assistant") {
      const actions = document.createElement("div");
      actions.className = "message-actions";
      const copyBtn = document.createElement("button");
      copyBtn.className = "msg-action-btn";
      copyBtn.title = "Копировать";
      copyBtn.innerHTML = `
        <span class="copy-icon copy-default" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/></svg>
        </span>
        <span class="copy-icon copy-done" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
        <span class="copy-label">Copy</span>
      `;
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(msg.content || "").then(() => {
          copyBtn.classList.add("copied");
          copyBtn.querySelector(".copy-label").textContent = "copied!";
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            copyBtn.querySelector(".copy-label").textContent = "Copy";
          }, 1500);
        });
      });
      actions.appendChild(copyBtn);
      body.appendChild(actions);
    }

    m.appendChild(body);
    return m;
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    const chat = getCurrentChat();
    if (!chat || chat.messages.length === 0) {
      welcomeEl.style.display = "flex";
      if (!welcomeTitle.textContent.trim()) typeWelcomeTitle();
      updateHomeMode();
      return;
    }
    welcomeEl.style.display = "none";
    updateHomeMode();
    chat.messages.forEach(m => messagesEl.appendChild(createMessageElement(m)));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // ============================================================
  //  SYSTEM PROMPT (общий ассистент, не только код)
  // ============================================================
  function buildSystemPrompt() {
    const base = `Ты — Nebula, дружелюбный и полезный AI-ассистент. Ты помогаешь людям с любыми задачами: ответами на вопросы, объяснениями, письмом, переводами, идеями, программированием, анализом текста и многим другим. Отвечай естественно и понятно, как ChatGPT. Всегда отвечай на языке пользователя (если он пишет по-русски — по-русски). Используй Markdown для форматирования: **жирный**, списки, заголовки и блоки кода с подсветкой.`;

    const think = settings.thinkLevel;
    let thinkHint = "";
    if (think === "none") {
      thinkHint = "Отвечай коротко и прямо, без длинных рассуждений.";
    } else if (think === "low") {
      thinkHint = "Отвечай кратко и по делу, минимально рассуждая.";
    } else if (think === "medium") {
      thinkHint = "Давай вдумчивые, полезные ответы обычной длины.";
    } else if (think === "high") {
      thinkHint = "Размышляй глубоко и давай развёрнутые, продуманные ответы.";
    } else if (think === "max") {
      thinkHint = "Размышляй максимально глубоко. Рассматривай задачу со всех сторон, давай максимально полный и продуманный ответ.";
    }
    return `${base}\n\n${thinkHint}`;
  }

  // ============================================================
  //  GENERATE (Ollama streaming)
  // ============================================================
  function ollamaOptionsForThink() {
    const level = settings.thinkLevel;
    const opts = { num_ctx: 32768 };
    if (level === "none") opts.num_predict = 800;
    else if (level === "low") opts.num_predict = 1200;
    else if (level === "medium") opts.num_predict = 2500;
    else if (level === "high") opts.num_predict = 5000;
    else if (level === "max") opts.num_predict = 10000;
    return opts;
  }

  function providerKindForModel(model) {
    const value = `${model.category || ""} ${model.name || ""}`.toLowerCase();
    if (value.includes("openai") || value.includes("gpt-oss")) return "openai";
    if (value.includes("google") || value.includes("gemma")) return "gemini";
    if (value.includes("qwen") || value.includes("alibaba")) return "qwen";
    if (value.includes("deepseek")) return "deepseek";
    if (value.includes("moondream")) return "moondream";
    if (value.includes("starcoder")) return "starcoder";
    if (value.includes("llava")) return "llava";
    if (value.includes("smollm")) return "huggingface";
    if (value.includes("meta") || value.includes("llama") || value.includes("tinyllama") || value.includes("codellama")) return "meta";
    if (value.includes("mistral")) return "mistral";
    if (value.includes("microsoft") || value.includes("phi")) return "microsoft";
    return "ollama";
  }

  function providerIconMarkup(model) {
    const kind = providerKindForModel(model);
    const logoMap = {
      openai: "https://commons.wikimedia.org/wiki/Special:FilePath/OpenAI_Logo.svg",
      gemini: "https://commons.wikimedia.org/wiki/Special:FilePath/Google_Gemini_logo.svg",
      qwen: "https://commons.wikimedia.org/wiki/Special:FilePath/Qwen_Logo.svg",
      mistral: "https://commons.wikimedia.org/wiki/Special:FilePath/Mistral_AI_logo_(2025%E2%80%93).svg",
      deepseek: "https://commons.wikimedia.org/wiki/Special:FilePath/DeepSeek_logo.svg",
      meta: "https://commons.wikimedia.org/wiki/Special:FilePath/Meta_Platforms_Inc._logo.svg",
      microsoft: "https://commons.wikimedia.org/wiki/Special:FilePath/Microsoft_logo.svg",
      huggingface: "https://huggingface.co/front/assets/huggingface_logo-noborder.svg",
      moondream: "https://www.google.com/s2/favicons?domain=moondream.ai&sz=128",
      starcoder: "https://www.google.com/s2/favicons?domain=bigcode-project.org&sz=128",
      llava: "https://www.google.com/s2/favicons?domain=llava-vl.github.io&sz=128",
      ollama: "https://cdn.simpleicons.org/ollama/111111",
    };
    const src = logoMap[kind] || "";
    const initial = escapeHtml(providerInitial(model));
    return src
      ? `<img class="provider-logo-img provider-${kind}" src="${src}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span style="display:none">${initial}</span>`
      : `<span>${initial}</span>`;
  }

  function providerInitial(model) {
    const text = (model.category || model.name || "AI").trim();
    return text.slice(0, 2).toUpperCase();
  }

  async function generateResponse(userText, userImages) {
    if (!ollamaRunning) return "Ollama не запущен. Nebula запускает его автоматически, подождите несколько секунд.";
    if (!settings.selectedModel) return "Модель не выбрана. Нажмите кнопку модели внизу, чтобы выбрать.";

    // предупреждение о vision
    if (userImages && userImages.length && !modelSupportsVision(settings.selectedModel)) {
      // всё равно пробуем — некоторые модели просто проигнорируют
    }

    const chat = getCurrentChat();
    const history = chat ? chat.messages : [];

    // история без вложений-картинок для context window
    const contextMsgs = history.slice(-12).map(m => ({
      role: m.role,
      content: m.content
    }));

    // текущее сообщение пользователя (с картинками и текстом файлов)
    let currentUserContent = userText || "";
    if (userImages && userImages.length === 0) {
      // ничего
    }
    const fileTexts = attachments.filter(a => a.kind === "file");
    if (fileTexts.length) {
      currentUserContent += "\n\n" + fileTexts.map(f => `Файл «${f.name}»:\n\`\`\`\n${f.text.slice(0, 12000)}\n\`\`\``).join("\n\n");
    }

    const apiMessages = [
      { role: "system", content: buildSystemPrompt() },
      ...contextMsgs,
      { role: "user", content: currentUserContent || (userImages && userImages.length ? "Опиши это изображение." : ""), images: (userImages && userImages.length ? userImages : undefined) }
    ];

    const reqBody = {
      model: settings.selectedModel,
      messages: apiMessages,
      stream: true,
      options: ollamaOptionsForThink()
    };
    // think-параметр для моделей, которые его поддерживают
    if (modelSupportsThink(settings.selectedModel)) {
      reqBody.think = settings.thinkLevel !== "none";
    }

    abortController = new AbortController();

    try {
      const response = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: abortController.signal
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let msgEl = null, textEl = null;
      let msgBody = null;
      let firstToken = true;
      let codeProjectEnsured = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const content = json.message?.content || "";
            if (content) {
              if (firstToken) {
                firstToken = false;
                addThinkingLine("Started streaming the answer");
                removeThinkingMessage();
              }
              fullText += content;
              if (!msgEl) {
                msgEl = createMessageElement({ role: "assistant", content: "" });
                msgBody = msgEl.querySelector(".message-body");
                textEl = msgEl.querySelector(".message-text");
                messagesEl.appendChild(msgEl);
              }
              const activity = getLatestCodeActivity(fullText);
              if (activity && msgBody) {
                if (!codeProjectEnsured) {
                  codeProjectEnsured = true;
                  addThinkingLine("Detected code output");
                  addProgressItem(`Detected code for ${activity.file}`);
                  ensureCodeProjectForCurrentChat().then(folderName => {
                    if (folderName) currentCodeProjectFolderName = folderName;
                    if (folderName) addThinkingLine(`Project folder: ${folderName}`);
                  });
                }
                upsertCodeActivity(msgBody, activity);
              }
              const visibleText = activity ? stripCodeBlocks(fullText) : fullText;
              textEl.innerHTML = renderMarkdown(visibleText);
              textEl.style.display = visibleText.trim() ? "" : "none";
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          } catch { /* partial */ }
        }
      }

      if (lastCodeActivity && activeCodeActivityEl) {
        lastCodeActivity = Object.assign({}, lastCodeActivity, { state: "edited" });
        activeCodeActivityEl.innerHTML = renderCodeActivity(lastCodeActivity);
        addThinkingLine(`Writing ${lastCodeActivity.file}`);
        await writeLatestCodeActivity();
        addThinkingLine("Finished");
        addProgressItem(`Finished ${lastCodeActivity.file}`);
      } else {
        addProgressItem("Finished answer");
      }
      return fullText || "(пустой ответ)";
    } catch (err) {
      if (err.name === "AbortError") return "_STOPPED_";
      return `Ошибка: ${err.message}`;
    } finally {
      abortController = null;
    }
  }

  // ============================================================
  //  SEND
  // ============================================================
  function updateSendBtn() {
    const hasText = inputEl.value.trim().length > 0;
    const hasAttach = attachments.length > 0;
    sendBtn.disabled = (isGenerating || (!hasText && !hasAttach));
  }

  function looksLikeBroadBuildRequest(text) {
    const lower = text.toLowerCase();
    if (lower.includes("\u0442\u0435\u043c\u0430:")) return false;
    const readableBuildWords = [
      "\u043d\u0430\u043f\u0438\u0448\u0438",
      "\u0441\u043e\u0437\u0434\u0430\u0439",
      "\u0441\u0434\u0435\u043b\u0430\u0439",
      "\u043d\u0430\u0440\u0438\u0441\u0443\u0439",
      "interface",
      "\u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441",
      "\u0441\u0430\u0439\u0442",
      "\u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435",
      "app",
      "ui",
      "\u043b\u0435\u043d\u0434\u0438\u043d\u0433"
    ];
    const readableVagueWords = [
      "\u043a\u0440\u0430\u0441\u0438\u0432",
      "\u0441\u043e\u0432\u0440\u0435\u043c\u0435\u043d",
      "\u043d\u043e\u0440\u043c\u0430\u043b\u044c\u043d",
      "\u043b\u044e\u0431\u043e\u0439",
      "\u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0441"
    ];
    if (readableBuildWords.some(w => lower.includes(w)) && readableVagueWords.some(w => lower.includes(w))) {
      return true;
    }
    const buildWords = ["напиши", "создай", "сделай", "нарисуй", "interface", "интерфейс", "сайт", "приложение", "app", "ui", "лендинг"];
    const vagueWords = ["красив", "современ", "нормальн", "любой", "интерфейс"];
    return buildWords.some(w => lower.includes(w)) && vagueWords.some(w => lower.includes(w)) && !lower.includes("тема:");
  }

  function inferBuildDetailsFromText(text) {
    const lower = text.toLowerCase();
    const has = (...words) => words.some(word => lower.includes(word));
    return {
      theme: has("dashboard", "\u0434\u0430\u0448\u0431\u043e\u0440\u0434", "\u043f\u0430\u043d\u0435\u043b\u044c") ? "dashboard" :
        has("portfolio", "\u043f\u043e\u0440\u0442\u0444\u043e\u043b\u0438\u043e") ? "portfolio" :
        has("saas", "\u043f\u0440\u043e\u0434\u0443\u043a\u0442") ? "saas" : null,
      palette: has("dark", "\u0442\u0435\u043c\u043d", "\u0442\u0451\u043c\u043d") ? "dark" :
        has("light", "\u0441\u0432\u0435\u0442\u043b") ? "light" : null,
      language: has("react") ? "react" :
        has("html", "\u0445\u0442\u043c\u043b") ? "html/css/js" :
        has("python", "\u043f\u0438\u0442\u043e\u043d", "\u043f\u0430\u0439\u0442\u043e\u043d") ? "python" :
        has("c++", "cpp", "\u0441\u0438++") ? "cpp" : null,
    };
  }

  function positionSetupSheet() {
    if (!setupSheet) return;
    const composer = $("composerInner");
    if (!composer) return;
    const field = composer.querySelector(".composer-field");
    const rect = (field || composer).getBoundingClientRect();
    const desired = window.innerHeight - rect.top - 1;
    const bottom = Math.max(86, Math.min(desired, Math.max(120, window.innerHeight - 260)));
    setupSheet.style.setProperty("--setup-bottom", `${bottom}px`);
    setupSheet.style.setProperty("--setup-width", `${Math.round(rect.width)}px`);
    setupSheet.style.setProperty("--setup-left", `${Math.round(rect.left)}px`);
  }

  function askSetupStep(question, options) {
    if (!setupSheet || !setupQuestion || !setupOptions) return Promise.resolve(null);
    positionSetupSheet();
    setupQuestion.textContent = question;
    setupOptions.innerHTML = "";
    setupSheet.classList.add("show");
    setupSheet.setAttribute("aria-hidden", "false");

    return new Promise(resolve => {
      options.forEach(option => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `setup-option ${option.kind || ""}`;
        btn.textContent = option.label;
        btn.addEventListener("click", () => {
          if (option.kind === "custom") {
            const existing = setupOptions.querySelector(".setup-custom-row");
            if (existing) {
              existing.querySelector("input")?.focus();
              return;
            }
            const row = document.createElement("div");
            row.className = "setup-custom-row";
            row.innerHTML = `
              <input class="setup-custom-input" type="text" placeholder="${escapeHtml(t("setupCustomPlaceholder"))}">
              <button class="setup-custom-submit" type="button">${escapeHtml(t("setupUse"))}</button>
            `;
            const input = row.querySelector("input");
            const submit = row.querySelector("button");
            const finish = () => {
              const value = input.value.trim();
              if (!value) return;
              setupSheet.classList.remove("show");
              setupSheet.setAttribute("aria-hidden", "true");
              resolve(value);
            };
            submit.addEventListener("click", finish);
            input.addEventListener("keydown", e => {
              if (e.key === "Enter") {
                e.preventDefault();
                finish();
              }
            });
            setupOptions.appendChild(row);
            input.focus();
            return;
          }
          setupSheet.classList.remove("show");
          setupSheet.setAttribute("aria-hidden", "true");
          resolve(option.value);
        });
        setupOptions.appendChild(btn);
      });
    });
  }

  async function collectBuildDetails(text) {
    if (!looksLikeBroadBuildRequest(text)) return text;
    const inferred = inferBuildDetailsFromText(text);
    const theme = inferred.theme || await askSetupStep(t("setupInterfaceQuestion"), [
      { label: t("setupDashboard"), value: "dashboard" },
      { label: t("setupPortfolio"), value: "portfolio" },
      { label: t("setupSaas"), value: "saas" },
      { label: t("setupCustom"), value: "custom", kind: "custom" },
    ]);
    const palette = inferred.palette || await askSetupStep(t("setupVisualQuestion"), [
      { label: t("setupDark"), value: "dark" },
      { label: t("setupLight"), value: "light" },
      { label: t("setupMixed"), value: "mixed" },
      { label: t("setupCustom"), value: "custom", kind: "custom" },
    ]);
    const language = inferred.language || await askSetupStep(t("setupStackQuestion"), [
      { label: "HTML + CSS + JS", value: "html/css/js" },
      { label: "React", value: "react" },
      { label: "Python", value: "python" },
      { label: "C++", value: "cpp" },
    ]);
    return `${text}\n\n${t("interfaceParameters")}:\n- ${t("interfaceType")}: ${theme}\n- ${t("visualMode")}: ${palette}\n- ${t("stack")}: ${language}`;
  }

  async function sendMessage() {
    const displayText = inputEl.value.trim();
    let text = displayText;
    const imgs = attachments.filter(a => a.kind === "image").map(a => a.base64);
    if ((!text && attachments.length === 0) || isGenerating) return;
    text = await collectBuildDetails(text);
    resetProgress();
    if (!currentChatId) createNewChat();
    activeCodeActivityEl = null;
    lastCodeActivity = null;
    currentCodeProjectFolderName = null;

    const chat = getCurrentChat();
    const userMsg = {
      role: "user",
      content: displayText || "",
      images: attachments.filter(a => a.kind === "image").map(a => a.dataUrl)
    };
    chat.messages.push(userMsg);
    if (!chat.title) chat.title = (displayText || "Изображение").slice(0, 40);
    chat.updatedAt = Date.now();

    // очистка composer
    inputEl.value = "";
    autoResize();
    attachments = [];
    renderAttachments();

    // UI
    welcomeEl.style.display = "none";
    renderMessages();
    updateSendBtn();
    sendBtn.style.display = "none";
    stopBtn.style.display = "flex";
    isGenerating = true;
    updateHomeMode();
    showThinkingMessage();

    const reply = await generateResponse(text, imgs);

    removeThinkingMessage();
    isGenerating = false;
    stopBtn.style.display = "none";
    sendBtn.style.display = "flex";

    if (reply !== "_STOPPED_") {
      const assistantMsg = { role: "assistant", content: reply };
      if (lastCodeActivity) {
        const { code, ...activityMeta } = lastCodeActivity;
        assistantMsg.codeActivity = Object.assign({}, activityMeta, { state: "edited" });
      }
      chat.messages.push(assistantMsg);
      chat.updatedAt = Date.now();
    }
    renderMessages();
    updateSendBtn();
    renderSidebar();
    persist();
  }

  stopBtn.addEventListener("click", () => { if (abortController) abortController.abort(); });

  // input
  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
  }
  inputEl.addEventListener("input", () => { autoResize(); updateSendBtn(); });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn.addEventListener("click", sendMessage);

  // quick actions
  document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      inputEl.value = btn.dataset.prompt;
      autoResize();
      updateSendBtn();
      sendMessage();
    });
  });

  // ============================================================
  //  CHATS & GROUPS (sidebar)
  // ============================================================
  function createNewChat() {
    const chat = {
      id: "c" + Date.now(),
      groupId: null,
      title: "",
      messages: [],
      model: settings.selectedModel,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    data.chats.unshift(chat);
    currentChatId = chat.id;
    if (welcomeTitle) welcomeTitle.textContent = "";
    renderSidebar();
    renderMessages();
    persist();
    inputEl.focus();
  }
  $("newChatBtn").addEventListener("click", createNewChat);

  function deleteChat(id) {
    data.chats = data.chats.filter(c => c.id !== id);
    if (currentChatId === id) {
      currentChatId = data.chats.length ? data.chats[0].id : null;
      renderMessages();
    }
    renderSidebar();
    persist();
  }

  function moveToGroup(chatId, groupId) {
    const c = data.chats.find(c => c.id === chatId);
    if (c) { c.groupId = groupId; c.updatedAt = Date.now(); }
    renderSidebar();
    persist();
  }

  // --- модалка группы ---
  let editingGroupId = null;
  function openGroupModal(editId = null) {
    editingGroupId = editId;
    $("groupModalTitle").textContent = editId ? "Переименовать папку" : "Новая папка";
    $("groupInput").value = editId ? (data.groups.find(g => g.id === editId) || {}).name || "" : "";
    $("groupModal").classList.add("show");
    setTimeout(() => $("groupInput").focus(), 50);
  }
  function closeGroupModal() { $("groupModal").classList.remove("show"); }
  const newGroupBtn = $("newGroupBtn");
  if (newGroupBtn) newGroupBtn.addEventListener("click", () => openGroupModal());
  $("closeGroupBtn").addEventListener("click", closeGroupModal);
  $("groupModal").addEventListener("click", e => { if (e.target === $("groupModal")) closeGroupModal(); });
  $("saveGroupBtn").addEventListener("click", async () => {
    const name = $("groupInput").value.trim();
    if (!name) return;
    if (editingGroupId) {
      const g = data.groups.find(g => g.id === editingGroupId);
      if (g) {
        if (window.api && window.api.renameProjectFolder) {
          const folder = await window.api.renameProjectFolder(g.folderName || g.name, name);
          if (folder.ok) g.folderName = folder.folderName;
          else alert("Не удалось переименовать папку проекта: " + (folder.error || "неизвестная ошибка"));
        }
        g.name = name;
      }
    } else {
      let folderName = name;
      if (window.api && window.api.ensureProjectFolder) {
        const folder = await window.api.ensureProjectFolder(name);
        if (folder.ok) folderName = folder.folderName;
        else alert("Не удалось создать папку проекта: " + (folder.error || "неизвестная ошибка"));
      }
      data.groups.push({ id: "g" + Date.now(), name, folderName, collapsed: false });
    }
    closeGroupModal();
    renderSidebar();
    persist();
  });
  $("groupInput").addEventListener("keydown", e => { if (e.key === "Enter") $("saveGroupBtn").click(); });

  function deleteGroup(id) {
    if (!confirm("Удалить папку? Чаты внутри останутся (перейдут в общий список).")) return;
    data.groups = data.groups.filter(g => g.id !== id);
    data.chats.forEach(c => { if (c.groupId === id) c.groupId = null; });
    renderSidebar();
    persist();
  }

  function renderSidebar() {
    chatHistoryList.innerHTML = "";

    // чаты без группы
    const ungrouped = data.chats.filter(c => !c.groupId);
    ungrouped.forEach(c => chatHistoryList.appendChild(buildChatItem(c)));

    // группы
    data.groups.forEach(g => {
      const groupChats = data.chats.filter(c => c.groupId === g.id);
      const wrap = document.createElement("div");
      wrap.className = "chat-group";

      const header = document.createElement("div");
      header.className = "chat-group-header";
      header.innerHTML = `
        <span class="chat-group-chevron ${g.collapsed ? "" : "open"}">
          <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        </span>
        <span class="chat-group-name">${escapeHtml(g.name)}</span>
        <span class="chat-group-actions">
          <button class="chat-group-action" title="Переименовать" data-act="rename">
            <svg viewBox="0 0 24 24" width="11" height="11"><path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zM20.7 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="chat-group-action" title="Удалить" data-act="delete">
            <svg viewBox="0 0 24 24" width="11" height="11"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </span>
      `;
      header.addEventListener("click", (e) => {
        if (e.target.closest("[data-act]")) return;
        g.collapsed = !g.collapsed;
        renderSidebar();
        persist();
      });
      header.querySelector('[data-act="rename"]').addEventListener("click", (e) => { e.stopPropagation(); openGroupModal(g.id); });
      header.querySelector('[data-act="delete"]').addEventListener("click", (e) => { e.stopPropagation(); deleteGroup(g.id); });

      const body = document.createElement("div");
      body.className = "chat-group-body" + (g.collapsed ? " collapsed" : "");
      groupChats.forEach(c => body.appendChild(buildChatItem(c)));

      wrap.appendChild(header);
      wrap.appendChild(body);
      chatHistoryList.appendChild(wrap);
    });

    if (data.chats.length === 0) {
      const hint = document.createElement("div");
      hint.className = "history-drop-hint";
      hint.textContent = "Нет чатов. Нажмите + чтобы создать.";
      chatHistoryList.appendChild(hint);
    }
  }

  function buildChatItem(c) {
    const item = document.createElement("div");
    item.className = "history-item" + (c.id === currentChatId ? " active" : "");
    item.draggable = true;

    const title = document.createElement("span");
    title.className = "history-item-title";
    title.textContent = c.title || "Новый чат";
    item.appendChild(title);

    // меню "переместить"
    const moveBtn = document.createElement("button");
    moveBtn.className = "history-item-del";
    moveBtn.title = "В папку";
    moveBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11"><path fill="currentColor" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
    moveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showMoveMenu(c.id, moveBtn);
    });
    item.appendChild(moveBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "history-item-del";
    delBtn.title = "Удалить";
    delBtn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
    delBtn.addEventListener("click", (e) => { e.stopPropagation(); deleteChat(c.id); });
    item.appendChild(delBtn);

    item.addEventListener("click", () => loadChat(c.id));

    // drag&drop
    item.addEventListener("dragstart", () => { item.dataset.drag = c.id; });
    return item;
  }

  function showMoveMenu(chatId, anchor) {
    // простой prompt-список групп
    const options = ["(без группы)", ...data.groups.map(g => g.name)];
    const choice = prompt("Выберите папку:\n" + options.map((o, i) => `${i}: ${o}`).join("\n"), "0");
    if (choice === null) return;
    const idx = parseInt(choice);
    if (isNaN(idx)) return;
    if (idx === 0) moveToGroup(chatId, null);
    else moveToGroup(chatId, data.groups[idx - 1].id);
  }

  function loadChat(id) {
    currentChatId = id;
    const c = getCurrentChat();
    if (c && c.model && c.model !== settings.selectedModel) {
      // подгружаем модель чата
      settings.selectedModel = c.model;
      modelLabel.textContent = c.model;
    }
    renderMessages();
    renderSidebar();
    inputEl.focus();
  }

  // drop чата на группу
  chatHistoryList.addEventListener("dragover", e => e.preventDefault());
  chatHistoryList.addEventListener("drop", e => {
    e.preventDefault();
    const header = e.target.closest(".chat-group-header");
    if (header) {
      const dragging = chatHistoryList.querySelector('[data-drag]');
      if (dragging) {
        const groupName = header.querySelector(".chat-group-name").textContent;
        const g = data.groups.find(g => g.name === groupName);
        if (g) moveToGroup(dragging.dataset.drag, g.id);
        delete dragging.dataset.drag;
      }
    }
  });

  // ============================================================
  //  MODELS MODAL
  // ============================================================
  function openModelsModal() {
    $("modelsModal").classList.add("show");
    if (modelsSearch) {
      modelsSearch.value = "";
      setTimeout(() => modelsSearch.focus(), 30);
    }
    renderModelsCatalog(modelsSearch ? modelsSearch.value : "");
  }
  function closeModelsModal() { $("modelsModal").classList.remove("show"); }
  $("closeModelsBtn").addEventListener("click", closeModelsModal);
  $("modelsModal").addEventListener("click", e => { if (e.target === $("modelsModal")) closeModelsModal(); });

  if (modelsSearch) {
    modelsSearch.addEventListener("input", () => renderModelsCatalog(modelsSearch.value));
  }

  function renderModelsCatalog(filter) {
    const body = $("modelsModalBody");
    body.innerHTML = "";

    if (!ollamaRunning) {
      const warn = document.createElement("div");
      warn.className = "model-empty";
      warn.innerHTML = `${statusDot.classList.contains("loading") ? "Ollama устанавливается или запускается." : "Ollama запускается автоматически."}<br><small>Подождите несколько секунд и откройте каталог снова.</small>`;
      body.appendChild(warn);
      return;
    }

    const installedNames = availableModels.map(m => m.name);
    const lower = filter.toLowerCase();

    const categories = {};
    MODEL_CATALOG.forEach(m => {
      if (lower && !m.name.toLowerCase().includes(lower) && !m.desc.toLowerCase().includes(lower) && !m.category.toLowerCase().includes(lower)) return;
      if (!categories[m.category]) categories[m.category] = [];
      categories[m.category].push(m);
    });

    // также показываем установленные модели, которых нет в каталоге
    const extraInstalled = availableModels.filter(m => !MODEL_CATALOG.find(c => c.name === m.name));
    if (extraInstalled.length && !lower) {
      categories["Установленные (другие)"] = extraInstalled.map(m => ({
        name: m.name, desc: "Установлена локально", size: formatSize(m.size), category: "Установленные (другие)"
      }));
    }

    Object.entries(categories).forEach(([cat, models]) => {
      const section = document.createElement("section");
      section.className = "models-provider-section";
      const label = document.createElement("div");
      label.className = "model-category-label";
      label.innerHTML = `<span>${escapeHtml(cat)}</span>`;
      section.appendChild(label);
      const grid = document.createElement("div");
      grid.className = "models-card-grid";
      section.appendChild(grid);
      body.appendChild(section);

      models.forEach(m => {
        const isInstalled = installedNames.includes(m.name);
        const isActive = m.name === settings.selectedModel;
        const isPulling = pullingModels[m.name] !== undefined;

        const item = document.createElement("div");
        item.className = "catalog-item";

        let statusHtml = "";
        if (isActive) statusHtml += `<span class="catalog-item-status active">Active</span>`;
        else if (isInstalled) statusHtml += `<span class="catalog-item-status installed">Installed</span>`;
        else statusHtml += `<span class="catalog-item-status">Ready</span>`;
        if (m.vision) statusHtml += `<span class="catalog-item-status">Vision</span>`;
        if (m.think) statusHtml += `<span class="catalog-item-status">Think</span>`;

        let actionHtml = "";
        if (isPulling) {
          const pct = pullingModels[m.name];
          actionHtml = `<div style="display:flex;align-items:center;gap:8px">
              <div class="catalog-progress"><div class="catalog-progress-fill" style="width:${pct}%"></div></div>
              <span style="font-size:11px;color:var(--text-muted);min-width:40px">${pct}%</span>
            </div>`;
        } else if (isInstalled) {
          if (isActive) {
            actionHtml = `<button class="catalog-btn" disabled>Активна</button>`;
          } else {
            actionHtml = `<div style="display:flex;gap:6px">
              <button class="catalog-btn primary" data-action="select" data-model="${m.name}">Выбрать</button>
              <button class="catalog-btn danger" data-action="delete" data-model="${m.name}" title="Удалить">✕</button>
            </div>`;
          }
        } else {
          actionHtml = `<button class="catalog-btn primary" data-action="pull" data-model="${m.name}">Скачать</button>`;
        }

        item.innerHTML = `
          <div class="catalog-provider-icon">
            ${providerIconMarkup(m)}
          </div>
          <div class="catalog-item-info">
            <div class="catalog-item-name">${escapeHtml(m.name)}</div>
            <div class="catalog-item-desc">${escapeHtml(m.desc || "")}</div>
            <div class="catalog-item-meta">${statusHtml}<span class="catalog-size">${escapeHtml(m.size || "")}</span></div>
          </div>
          <div class="catalog-action">${actionHtml}</div>
        `;

        item.querySelectorAll(".catalog-btn[data-action]").forEach(btn => {
          btn.addEventListener("click", async () => {
            const action = btn.dataset.action;
            const model = btn.dataset.model;
            if (action === "select") {
              selectModel(model);
              renderModelsCatalog(modelsSearch ? modelsSearch.value : filter);
            } else if (action === "pull") {
              await pullModel(model, modelsSearch ? modelsSearch.value : filter);
            } else if (action === "delete") {
              if (confirm(`Удалить модель «${model}»?`)) {
                await window.api.deleteModel(model);
                await checkOllama();
                renderModelsCatalog(modelsSearch ? modelsSearch.value : filter);
              }
            }
          });
        });
        grid.appendChild(item);
      });
    });

    if (Object.keys(categories).length === 0) {
      const empty = document.createElement("div");
      empty.className = "model-empty";
      empty.textContent = "Ничего не найдено.";
      body.appendChild(empty);
    }
  }

  async function pullModel(modelName, filter) {
    pullingModels[modelName] = 0;
    renderModelsCatalog(filter);
    const result = await window.api.pullModel(modelName);
    delete pullingModels[modelName];
    await checkOllama();
    if (result.ok) {
      selectModel(modelName);
    } else {
      alert("Не удалось скачать модель: " + (result.error || "неизвестная ошибка"));
    }
    renderModelsCatalog(filter);
  }

  // прогресс скачивания
  if (window.api && window.api.onPullProgress) {
    window.api.onPullProgress((d) => {
      if (d.model && d.percent !== undefined) {
        pullingModels[d.model] = d.percent;
        const fills = document.querySelectorAll(".catalog-progress-fill");
        const items = document.querySelectorAll(".catalog-item");
        items.forEach(item => {
          const name = item.querySelector(".catalog-item-name");
          if (name && name.textContent.includes(d.model)) {
            const fill = item.querySelector(".catalog-progress-fill");
            const pctText = item.querySelector(".catalog-progress + span");
            if (fill) fill.style.width = d.percent + "%";
            if (pctText) pctText.textContent = d.percent + "%";
          }
        });
      }
    });
  }

  // ============================================================
  //  INIT
  // ============================================================
  async function init() {
    await loadData();
    await syncProjectFolders();
    setThinkLevel(settings.thinkLevel || "medium");
    setAccessMode(settings.accessMode || "ask");
    applyTheme();
    applyAppLanguageBasics();
    renderSettings();
    renderProgress();
    if (settings.selectedModel) modelLabel.textContent = settings.selectedModel;
    typeWelcomeTitle();
    renderSidebar();
    renderMessages();
    updateSendBtn();
    await checkOllama();
    // повторная проверка статуса Ollama каждые 15с
    setInterval(checkOllama, 15000);
    inputEl.focus();
  }

  init();

})();
