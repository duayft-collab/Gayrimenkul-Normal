import { create } from 'zustand';
import { mulkleriDinle, kiralarDinle, alarmlarDinle, mulkEkle, mulkGuncelle, mulkSil } from '../core/db';

const TOAST_MS = 4000;
const UNDO_MS  = 30_000;

/** K14 — PII içermeyen Firestore istatistikleri */
const BOS_STATS = {
  okumaSayisi: 0,
  yazmaSayisi: 0,
  silmeSayisi: 0,
  sonIslem:    null,
  tahminiBoyut: 0, // KB
};

export const useStore = create((set, get) => ({
  page:    'dashboard',
  setPage: (p) => set({ page: p }),

  /* Realtime Firestore listenerlari — App.jsx'te init() cagrılınca baslar */
  _unsubFns: [],

  init: (workspaceId) => {
    const unsubs = [
      mulkleriDinle(workspaceId, (mulkler) => set(state => {
        const tahmin = (mulkler.length + state.kiralar.length + state.alarmlar.length) * 2;
        return {
          mulkler,
          firestoreStats: {
            ...state.firestoreStats,
            okumaSayisi: state.firestoreStats.okumaSayisi + mulkler.length,
            sonIslem:    Date.now(),
            tahminiBoyut: tahmin,
          },
        };
      })),
      kiralarDinle(workspaceId, (kiralar) => set(state => {
        const tahmin = (state.mulkler.length + kiralar.length + state.alarmlar.length) * 2;
        return {
          kiralar,
          firestoreStats: {
            ...state.firestoreStats,
            okumaSayisi: state.firestoreStats.okumaSayisi + kiralar.length,
            sonIslem:    Date.now(),
            tahminiBoyut: tahmin,
          },
        };
      })),
      alarmlarDinle(workspaceId, (alarmlar) => set(state => {
        const tahmin = (state.mulkler.length + state.kiralar.length + alarmlar.length) * 2;
        return {
          alarmlar,
          firestoreStats: {
            ...state.firestoreStats,
            okumaSayisi: state.firestoreStats.okumaSayisi + alarmlar.length,
            sonIslem:    Date.now(),
            tahminiBoyut: tahmin,
          },
        };
      })),
    ];
    set({ _unsubFns: unsubs });
  },

  destroy: () => {
    get()._unsubFns.forEach(fn => fn());
    set({ _unsubFns: [] });
  },

  mulkler:  [],
  kiralar:  [],
  alarmlar: [],

  /** K05 — yazma sayacı merkezi */
  _kayitYazma: () => set(state => ({
    firestoreStats: {
      ...state.firestoreStats,
      yazmaSayisi: state.firestoreStats.yazmaSayisi + 1,
      sonIslem:    Date.now(),
    },
  })),
  _kayitSilme: () => set(state => ({
    firestoreStats: {
      ...state.firestoreStats,
      silmeSayisi: state.firestoreStats.silmeSayisi + 1,
      yazmaSayisi: state.firestoreStats.yazmaSayisi + 1,
      sonIslem:    Date.now(),
    },
  })),

  addProperty: async (veri) => {
    const { user, _kayitYazma } = get();
    const r = await mulkEkle(user?.workspaceId || 'ws_001', veri);
    _kayitYazma();
    return r;
  },

  updateProperty: async (id, veri) => {
    const r = await mulkGuncelle(id, veri);
    get()._kayitYazma();
    return r;
  },

  /* K06: Soft delete + 30sn undo */
  removeProperty: async (id) => {
    const { mulkler, toast, undoSil, user, _kayitSilme } = get();
    const hedef = mulkler.find(p => p.id === id);
    if (!hedef) return;

    await mulkSil(id, user?.name || 'bilinmiyor');
    _kayitSilme();

    const timer = setTimeout(() => {}, UNDO_MS);
    toast('warning', `"${hedef.ad || 'Mülk'}" silindi.`, {
      undoLabel: 'Geri Al',
      onUndo: () => { clearTimeout(timer); undoSil(id); },
      sure: UNDO_MS,
    });
  },

  undoSil: async (id) => {
    await mulkGuncelle(id, { isDeleted: false, deletedAt: null, deletedBy: null });
    get()._kayitYazma();
    get().toast('success', 'Silme geri alındı.');
  },

  aktifMulkler: () => get().mulkler.filter(p => !p.isDeleted),

  /* Piyasa (statik, ileriki sprint'te API'den gelir) */
  marketData: { usdTry:38.42, eurTry:41.85, goldGram:3850, btcTry:342000, bist100:9840, inflation:48.5 },

  /* Firestore stats — StatusBar için canlı */
  firestoreStats: { ...BOS_STATS },

  toasts: [],
  toast: (type, msg, opts = {}) => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, type, msg, ...opts }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), opts.sure || TOAST_MS);
  },
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  modal: null,
  openModal:  (m) => set({ modal: m }),
  closeModal: ()  => set({ modal: null }),
}));
