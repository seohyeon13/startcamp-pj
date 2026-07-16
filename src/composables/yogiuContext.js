import { inject } from 'vue';
export const YOGIU_KEY = Symbol('YOGIU');
export function useYogiuContext(){ const ctx=inject(YOGIU_KEY); if(!ctx) throw new Error('YOGIU context missing'); return ctx; }
