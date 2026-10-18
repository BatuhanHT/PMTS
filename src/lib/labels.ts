import type { MovementType, ProjectStatus } from '../domain/types.ts'

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: 'Planlandı',
  active: 'Devam ediyor',
  completed: 'Tamamlandı',
}

export const STATUS_STYLE: Record<ProjectStatus, string> = {
  planned: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: 'Giriş',
  out: 'Çıkış',
  adjust: 'Düzeltme',
}
