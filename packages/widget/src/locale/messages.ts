/**
 * Built-in translations for the widget's own chrome — loading/empty states,
 * confirm buttons, accessibility labels. Authored content is translated
 * through the localization pipeline; these strings never leave the widget
 * bundle, so they ship as a plain dictionary instead of going through an
 * i18n framework.
 *
 * Adding a language = adding one entry here; the `WidgetMessages` type makes
 * missing keys a compile error.
 */
export interface WidgetMessages {
  loading: string;
  retry: string;
  loadFailed: string;
  noAnnouncements: string;
  loadAnnouncementsFailed: string;
  noResults: string;
  noItems: string;
  readMore: string;
  search: string;
  home: string;
  untitled: string;
  untitledAction: string;
  untitledSubPage: string;
  liveChat: string;
  contentList: string;
  announcements: string;
  dismissChecklist: string;
  dismissChecklistConfirm: string;
  dismissChecklistYes: string;
  cancel: string;
  closeChecklist: string;
  completeTask: string;
  uncompleteTask: string;
  close: string;
  back: string;
  closeResourceCenter: string;
  dismissBanner: string;
  submit: string;
  enterText: string;
  npsLowLabel: string;
  npsHighLabel: string;
  optionPrefix: string;
  otherPlaceholder: string;
  textInput: string;
  starRating: string;
  scaleOptions: string;
  customIcon: string;
  logo: string;
  image: string;
}

const en: WidgetMessages = {
  loading: 'Loading...',
  retry: 'Retry',
  loadFailed: "Couldn't load.",
  noAnnouncements: 'No announcements yet',
  loadAnnouncementsFailed: "Couldn't load announcements.",
  noResults: 'No results found',
  noItems: 'No items',
  readMore: 'Read more',
  search: 'Search',
  home: 'Home',
  untitled: 'Untitled',
  untitledAction: 'Untitled action',
  untitledSubPage: 'Untitled sub-page',
  liveChat: 'Live chat',
  contentList: 'Content list',
  announcements: 'Announcements',
  dismissChecklist: 'Dismiss checklist',
  dismissChecklistConfirm: 'Dismiss checklist?',
  dismissChecklistYes: 'Yes, dismiss',
  cancel: 'Cancel',
  closeChecklist: 'Close checklist',
  completeTask: 'Complete task',
  uncompleteTask: 'Uncomplete task',
  close: 'Close',
  back: 'Back',
  closeResourceCenter: 'Close resource center',
  dismissBanner: 'Dismiss banner',
  submit: 'Submit',
  enterText: 'Enter text...',
  npsLowLabel: 'Not at all likely',
  npsHighLabel: 'Extremely likely',
  optionPrefix: 'Option',
  otherPlaceholder: 'Other...',
  textInput: 'Text input field',
  starRating: 'Star rating',
  scaleOptions: 'Scale options',
  customIcon: 'Custom icon',
  logo: 'Logo',
  image: 'Image',
};

const zhHans: WidgetMessages = {
  loading: '加载中...',
  retry: '重试',
  loadFailed: '加载失败。',
  noAnnouncements: '暂无公告',
  loadAnnouncementsFailed: '公告加载失败。',
  noResults: '未找到相关结果',
  noItems: '暂无内容',
  readMore: '阅读更多',
  search: '搜索',
  home: '首页',
  untitled: '未命名',
  untitledAction: '未命名操作',
  untitledSubPage: '未命名子页面',
  liveChat: '在线客服',
  contentList: '内容列表',
  announcements: '公告',
  dismissChecklist: '关闭清单',
  dismissChecklistConfirm: '关闭清单？',
  dismissChecklistYes: '确认关闭',
  cancel: '取消',
  closeChecklist: '收起清单',
  completeTask: '标记为完成',
  uncompleteTask: '标记为未完成',
  close: '关闭',
  back: '返回',
  closeResourceCenter: '关闭资源中心',
  dismissBanner: '关闭横幅',
  submit: '提交',
  enterText: '请输入内容...',
  npsLowLabel: '完全不可能',
  npsHighLabel: '极有可能',
  optionPrefix: '选项',
  otherPlaceholder: '其他...',
  textInput: '文本输入框',
  starRating: '星级评分',
  scaleOptions: '量表选项',
  customIcon: '自定义图标',
  logo: 'Logo',
  image: '图片',
};

const zhHant: WidgetMessages = {
  loading: '載入中...',
  retry: '重試',
  loadFailed: '載入失敗。',
  noAnnouncements: '暫無公告',
  loadAnnouncementsFailed: '公告載入失敗。',
  noResults: '未找到相關結果',
  noItems: '暫無內容',
  readMore: '閱讀更多',
  search: '搜尋',
  home: '首頁',
  untitled: '未命名',
  untitledAction: '未命名操作',
  untitledSubPage: '未命名子頁面',
  liveChat: '線上客服',
  contentList: '內容列表',
  announcements: '公告',
  dismissChecklist: '關閉清單',
  dismissChecklistConfirm: '關閉清單？',
  dismissChecklistYes: '確認關閉',
  cancel: '取消',
  closeChecklist: '收起清單',
  completeTask: '標記為完成',
  uncompleteTask: '標記為未完成',
  close: '關閉',
  back: '返回',
  closeResourceCenter: '關閉資源中心',
  dismissBanner: '關閉橫幅',
  submit: '提交',
  enterText: '請輸入內容...',
  npsLowLabel: '完全不可能',
  npsHighLabel: '極有可能',
  optionPrefix: '選項',
  otherPlaceholder: '其他...',
  textInput: '文字輸入框',
  starRating: '星級評分',
  scaleOptions: '量表選項',
  customIcon: '自訂圖示',
  logo: 'Logo',
  image: '圖片',
};

const ja: WidgetMessages = {
  loading: '読み込み中...',
  retry: '再試行',
  loadFailed: '読み込みに失敗しました。',
  noAnnouncements: 'お知らせはまだありません',
  loadAnnouncementsFailed: 'お知らせを読み込めませんでした。',
  noResults: '結果が見つかりません',
  noItems: 'アイテムはありません',
  readMore: '続きを読む',
  search: '検索',
  home: 'ホーム',
  untitled: '無題',
  untitledAction: '無題のアクション',
  untitledSubPage: '無題のサブページ',
  liveChat: 'ライブチャット',
  contentList: 'コンテンツリスト',
  announcements: 'お知らせ',
  dismissChecklist: 'チェックリストを非表示にする',
  dismissChecklistConfirm: 'チェックリストを非表示にしますか？',
  dismissChecklistYes: '非表示にする',
  cancel: 'キャンセル',
  closeChecklist: 'チェックリストを閉じる',
  completeTask: 'タスクを完了にする',
  uncompleteTask: 'タスクを未完了にする',
  close: '閉じる',
  back: '戻る',
  closeResourceCenter: 'リソースセンターを閉じる',
  dismissBanner: 'バナーを閉じる',
  submit: '送信',
  enterText: 'テキストを入力...',
  npsLowLabel: '全く思わない',
  npsHighLabel: '非常にそう思う',
  optionPrefix: '選択肢',
  otherPlaceholder: 'その他...',
  textInput: 'テキスト入力欄',
  starRating: '星評価',
  scaleOptions: 'スケール選択肢',
  customIcon: 'カスタムアイコン',
  logo: 'ロゴ',
  image: '画像',
};

const ko: WidgetMessages = {
  loading: '로딩 중...',
  retry: '다시 시도',
  loadFailed: '불러오지 못했습니다.',
  noAnnouncements: '아직 공지사항이 없습니다',
  loadAnnouncementsFailed: '공지사항을 불러오지 못했습니다.',
  noResults: '검색 결과가 없습니다',
  noItems: '항목이 없습니다',
  readMore: '더 보기',
  search: '검색',
  home: '홈',
  untitled: '제목 없음',
  untitledAction: '제목 없는 작업',
  untitledSubPage: '제목 없는 하위 페이지',
  liveChat: '라이브 채팅',
  contentList: '콘텐츠 목록',
  announcements: '공지사항',
  dismissChecklist: '체크리스트 숨기기',
  dismissChecklistConfirm: '체크리스트를 숨기시겠습니까?',
  dismissChecklistYes: '숨기기',
  cancel: '취소',
  closeChecklist: '체크리스트 닫기',
  completeTask: '작업 완료로 표시',
  uncompleteTask: '작업 미완료로 표시',
  close: '닫기',
  back: '뒤로',
  closeResourceCenter: '리소스 센터 닫기',
  dismissBanner: '배너 닫기',
  submit: '제출',
  enterText: '내용을 입력하세요...',
  npsLowLabel: '전혀 그렇지 않다',
  npsHighLabel: '매우 그렇다',
  optionPrefix: '옵션',
  otherPlaceholder: '기타...',
  textInput: '텍스트 입력란',
  starRating: '별점',
  scaleOptions: '척도 옵션',
  customIcon: '사용자 지정 아이콘',
  logo: '로고',
  image: '이미지',
};

const fr: WidgetMessages = {
  loading: 'Chargement...',
  retry: 'Réessayer',
  loadFailed: 'Échec du chargement.',
  noAnnouncements: 'Aucune annonce pour le moment',
  loadAnnouncementsFailed: 'Impossible de charger les annonces.',
  noResults: 'Aucun résultat trouvé',
  noItems: 'Aucun élément',
  readMore: 'En savoir plus',
  search: 'Rechercher',
  home: 'Accueil',
  untitled: 'Sans titre',
  untitledAction: 'Action sans titre',
  untitledSubPage: 'Sous-page sans titre',
  liveChat: 'Chat en direct',
  contentList: 'Liste de contenus',
  announcements: 'Annonces',
  dismissChecklist: 'Masquer la liste de tâches',
  dismissChecklistConfirm: 'Masquer la liste de tâches ?',
  dismissChecklistYes: 'Oui, masquer',
  cancel: 'Annuler',
  closeChecklist: 'Fermer la liste de tâches',
  completeTask: 'Marquer la tâche comme terminée',
  uncompleteTask: 'Marquer la tâche comme non terminée',
  close: 'Fermer',
  back: 'Retour',
  closeResourceCenter: 'Fermer le centre de ressources',
  dismissBanner: 'Fermer la bannière',
  submit: 'Envoyer',
  enterText: 'Saisissez du texte...',
  npsLowLabel: 'Pas du tout probable',
  npsHighLabel: 'Très probable',
  optionPrefix: 'Option',
  otherPlaceholder: 'Autre...',
  textInput: 'Champ de texte',
  starRating: 'Note par étoiles',
  scaleOptions: "Options d'échelle",
  customIcon: 'Icône personnalisée',
  logo: 'Logo',
  image: 'Image',
};

const de: WidgetMessages = {
  loading: 'Wird geladen...',
  retry: 'Erneut versuchen',
  loadFailed: 'Laden fehlgeschlagen.',
  noAnnouncements: 'Noch keine Ankündigungen',
  loadAnnouncementsFailed: 'Ankündigungen konnten nicht geladen werden.',
  noResults: 'Keine Ergebnisse gefunden',
  noItems: 'Keine Einträge',
  readMore: 'Mehr erfahren',
  search: 'Suchen',
  home: 'Start',
  untitled: 'Ohne Titel',
  untitledAction: 'Aktion ohne Titel',
  untitledSubPage: 'Unterseite ohne Titel',
  liveChat: 'Live-Chat',
  contentList: 'Inhaltsliste',
  announcements: 'Ankündigungen',
  dismissChecklist: 'Checkliste ausblenden',
  dismissChecklistConfirm: 'Checkliste ausblenden?',
  dismissChecklistYes: 'Ja, ausblenden',
  cancel: 'Abbrechen',
  closeChecklist: 'Checkliste schließen',
  completeTask: 'Aufgabe als erledigt markieren',
  uncompleteTask: 'Aufgabe als unerledigt markieren',
  close: 'Schließen',
  back: 'Zurück',
  closeResourceCenter: 'Ressourcencenter schließen',
  dismissBanner: 'Banner schließen',
  submit: 'Absenden',
  enterText: 'Text eingeben...',
  npsLowLabel: 'Überhaupt nicht wahrscheinlich',
  npsHighLabel: 'Äußerst wahrscheinlich',
  optionPrefix: 'Option',
  otherPlaceholder: 'Sonstiges...',
  textInput: 'Textfeld',
  starRating: 'Sternebewertung',
  scaleOptions: 'Skalenoptionen',
  customIcon: 'Eigenes Symbol',
  logo: 'Logo',
  image: 'Bild',
};

const es: WidgetMessages = {
  loading: 'Cargando...',
  retry: 'Reintentar',
  loadFailed: 'No se pudo cargar.',
  noAnnouncements: 'Aún no hay anuncios',
  loadAnnouncementsFailed: 'No se pudieron cargar los anuncios.',
  noResults: 'No se encontraron resultados',
  noItems: 'No hay elementos',
  readMore: 'Leer más',
  search: 'Buscar',
  home: 'Inicio',
  untitled: 'Sin título',
  untitledAction: 'Acción sin título',
  untitledSubPage: 'Subpágina sin título',
  liveChat: 'Chat en vivo',
  contentList: 'Lista de contenido',
  announcements: 'Anuncios',
  dismissChecklist: 'Ocultar la lista de tareas',
  dismissChecklistConfirm: '¿Ocultar la lista de tareas?',
  dismissChecklistYes: 'Sí, ocultar',
  cancel: 'Cancelar',
  closeChecklist: 'Cerrar la lista de tareas',
  completeTask: 'Marcar tarea como completada',
  uncompleteTask: 'Marcar tarea como no completada',
  close: 'Cerrar',
  back: 'Atrás',
  closeResourceCenter: 'Cerrar el centro de recursos',
  dismissBanner: 'Cerrar el banner',
  submit: 'Enviar',
  enterText: 'Escribe texto...',
  npsLowLabel: 'Nada probable',
  npsHighLabel: 'Muy probable',
  optionPrefix: 'Opción',
  otherPlaceholder: 'Otro...',
  textInput: 'Campo de texto',
  starRating: 'Calificación por estrellas',
  scaleOptions: 'Opciones de escala',
  customIcon: 'Icono personalizado',
  logo: 'Logotipo',
  image: 'Imagen',
};

const pt: WidgetMessages = {
  loading: 'Carregando...',
  retry: 'Tentar novamente',
  loadFailed: 'Não foi possível carregar.',
  noAnnouncements: 'Nenhum anúncio ainda',
  loadAnnouncementsFailed: 'Não foi possível carregar os anúncios.',
  noResults: 'Nenhum resultado encontrado',
  noItems: 'Nenhum item',
  readMore: 'Leia mais',
  search: 'Pesquisar',
  home: 'Início',
  untitled: 'Sem título',
  untitledAction: 'Ação sem título',
  untitledSubPage: 'Subpágina sem título',
  liveChat: 'Chat ao vivo',
  contentList: 'Lista de conteúdo',
  announcements: 'Anúncios',
  dismissChecklist: 'Ocultar a lista de tarefas',
  dismissChecklistConfirm: 'Ocultar a lista de tarefas?',
  dismissChecklistYes: 'Sim, ocultar',
  cancel: 'Cancelar',
  closeChecklist: 'Fechar a lista de tarefas',
  completeTask: 'Marcar tarefa como concluída',
  uncompleteTask: 'Marcar tarefa como não concluída',
  close: 'Fechar',
  back: 'Voltar',
  closeResourceCenter: 'Fechar a central de recursos',
  dismissBanner: 'Fechar o banner',
  submit: 'Enviar',
  enterText: 'Digite o texto...',
  npsLowLabel: 'Nada provável',
  npsHighLabel: 'Muito provável',
  optionPrefix: 'Opção',
  otherPlaceholder: 'Outro...',
  textInput: 'Campo de texto',
  starRating: 'Avaliação por estrelas',
  scaleOptions: 'Opções de escala',
  customIcon: 'Ícone personalizado',
  logo: 'Logotipo',
  image: 'Imagem',
};

const nl: WidgetMessages = {
  loading: 'Laden...',
  retry: 'Opnieuw proberen',
  loadFailed: 'Laden mislukt.',
  noAnnouncements: 'Nog geen aankondigingen',
  loadAnnouncementsFailed: 'Aankondigingen konden niet worden geladen.',
  noResults: 'Geen resultaten gevonden',
  noItems: 'Geen items',
  readMore: 'Lees meer',
  search: 'Zoeken',
  home: 'Home',
  untitled: 'Naamloos',
  untitledAction: 'Naamloze actie',
  untitledSubPage: 'Naamloze subpagina',
  liveChat: 'Livechat',
  contentList: 'Inhoudslijst',
  announcements: 'Aankondigingen',
  dismissChecklist: 'Checklist verbergen',
  dismissChecklistConfirm: 'Checklist verbergen?',
  dismissChecklistYes: 'Ja, verbergen',
  cancel: 'Annuleren',
  closeChecklist: 'Checklist sluiten',
  completeTask: 'Taak markeren als voltooid',
  uncompleteTask: 'Taak markeren als onvoltooid',
  close: 'Sluiten',
  back: 'Terug',
  closeResourceCenter: 'Resourcecentrum sluiten',
  dismissBanner: 'Banner sluiten',
  submit: 'Verzenden',
  enterText: 'Voer tekst in...',
  npsLowLabel: 'Zeer onwaarschijnlijk',
  npsHighLabel: 'Zeer waarschijnlijk',
  optionPrefix: 'Optie',
  otherPlaceholder: 'Anders...',
  textInput: 'Tekstveld',
  starRating: 'Sterrenbeoordeling',
  scaleOptions: 'Schaalopties',
  customIcon: 'Aangepast pictogram',
  logo: 'Logo',
  image: 'Afbeelding',
};

export const WIDGET_MESSAGES: Record<string, WidgetMessages> = {
  en,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ja,
  ko,
  fr,
  de,
  es,
  pt,
  nl,
};

export const DEFAULT_WIDGET_LOCALE = 'en';

/**
 * Regional and legacy codes that don't reduce to a dictionary key by
 * primary-subtag matching. Chinese is the notable case: the script, not the
 * region, decides the dictionary.
 */
const LOCALE_ALIASES: Record<string, string> = {
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-my': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
};

const DICTIONARY_KEYS_BY_LOWERCASE = new Map(
  Object.keys(WIDGET_MESSAGES).map((key) => [key.toLowerCase(), key]),
);

/**
 * Reduce a user locale (BCP-47, any casing, possibly garbage) to a dictionary
 * key: alias → exact match → alias/exact on the primary subtag → English.
 */
export const resolveWidgetLocale = (locale: string | undefined): string => {
  if (!locale) {
    return DEFAULT_WIDGET_LOCALE;
  }
  const lower = locale.trim().toLowerCase();
  const aliased = LOCALE_ALIASES[lower] ?? DICTIONARY_KEYS_BY_LOWERCASE.get(lower);
  if (aliased) {
    return aliased;
  }
  const primary = lower.split('-')[0];
  return (
    LOCALE_ALIASES[primary] ?? DICTIONARY_KEYS_BY_LOWERCASE.get(primary) ?? DEFAULT_WIDGET_LOCALE
  );
};

export const getWidgetMessages = (locale: string | undefined): WidgetMessages => {
  return WIDGET_MESSAGES[resolveWidgetLocale(locale)] ?? WIDGET_MESSAGES[DEFAULT_WIDGET_LOCALE];
};

/**
 * The locale Intl formatting should use. Keeps the raw locale (so 'fr-CA'
 * keeps its regional date format even though the dictionary reduces it to
 * 'fr'), but falls back to English when the language has no dictionary —
 * dates shouldn't disagree with the (English) chrome around them. English
 * regional variants pass through: their chrome is English natively, not by
 * fallback.
 */
export const resolveWidgetIntlLocale = (locale: string | undefined): string => {
  if (!locale) {
    return DEFAULT_WIDGET_LOCALE;
  }
  const trimmed = locale.trim();
  if (trimmed.toLowerCase().split('-')[0] === 'en') {
    return trimmed;
  }
  return resolveWidgetLocale(trimmed) === DEFAULT_WIDGET_LOCALE ? DEFAULT_WIDGET_LOCALE : trimmed;
};
