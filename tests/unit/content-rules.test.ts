import { describe, it, expect } from 'vitest';
import { html, en, fr } from './site';

// Facts validated with the owner: see CLAUDE.md > Content conventions.
describe('content rules', () => {
  const sources: [string, string][] = [
    ['index.html', html],
    ['en.json', JSON.stringify(en)],
    ['fr.json', JSON.stringify(fr)],
  ];

  // "dipl[oô]m" is a stem on purpose: it also catches diplômé, diplômée, diplômes, diplomas…
  const forbidden = /\b(sharepoint|power platform|azure|aws|kubernetes|kafka|terraform|bachelor|bachelier|dipl[oô]m\w*|sans emploi|unemployed)\b/i;

  it.each(['diplôme', 'diplômé', 'diplômée', 'diplômés', 'diploma', 'diplomas', 'diplomé', 'Bachelor', 'AWS'])('the forbidden-claims pattern catches "%s"', (word) => {
    expect(`Titulaire d'un ${word} en informatique`).toMatch(forbidden);
  });

  it.each(sources)('%s makes none of the forbidden claims', (_name, text) => {
    expect(text.match(forbidden)?.[0] ?? null).toBeNull();
  });

  it('shows CyberOps as a training, never as a certification', () => {
    expect(en['education.edu_type.3']).toBe('Training');
    expect(fr['education.edu_type.3']).toBe('Formation');
  });

  it('shows CCNA as the only certification', () => {
    expect(en['education.edu_type.2']).toBe('Certification');
    expect(fr['education.edu_type.2']).toBe('Certification');
    const certifications = Object.entries(en).filter(([k, v]) => k.startsWith('education.edu_type') && v === 'Certification');
    expect(certifications).toHaveLength(1);
  });

  it('says "développeur solo" (not "unique") in French', () => {
    expect(JSON.stringify(fr)).not.toMatch(/développeur unique/i);
  });
});
