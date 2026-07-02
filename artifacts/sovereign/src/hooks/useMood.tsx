import { useState, useEffect } from 'react';

export type Mood = 'calm' | 'professional' | 'focus' | 'work';

export interface MoodConfig {
  id: Mood;
  label: { ar: string; en: string; fr: string; es: string };
  description: { ar: string; en: string; fr: string; es: string };
  emoji: string;
}

export const moodConfigs: MoodConfig[] = [
  {
    id: 'calm',
    label: { ar: 'هادئ', en: 'Calm', fr: 'Calme', es: 'Calma' },
    description: { ar: 'تواصل مريح بدون ضغط', en: 'Relaxed communication', fr: 'Communication détendue', es: 'Comunicación relajada' },
    emoji: '🌊',
  },
  {
    id: 'professional',
    label: { ar: 'احترافي', en: 'Professional', fr: 'Pro', es: 'Profesional' },
    description: { ar: 'وضوح وجدية', en: 'Clear and serious', fr: 'Clair et sérieux', es: 'Claro y serio' },
    emoji: '💼',
  },
  {
    id: 'focus',
    label: { ar: 'تركيز', en: 'Focus', fr: 'Focus', es: 'Enfoque' },
    description: { ar: 'الأهم فقط', en: 'Essentials only', fr: 'L\'essentiel', es: 'Solo lo esencial' },
    emoji: '🎯',
  },
  {
    id: 'work',
    label: { ar: 'عمل', en: 'Work', fr: 'Travail', es: 'Trabajo' },
    description: { ar: 'إنتاجية عالية', en: 'High productivity', fr: 'Haute productivité', es: 'Alta productividad' },
    emoji: '⚡',
  },
];

export function useMood() {
  const [mood, setMood] = useState<Mood>(() =>
    (localStorage.getItem('directly-mood') as Mood) || 'calm'
  );

  useEffect(() => {
    localStorage.setItem('directly-mood', mood);
    document.documentElement.setAttribute('data-mood', mood);
  }, [mood]);

  return { mood, setMood };
}
