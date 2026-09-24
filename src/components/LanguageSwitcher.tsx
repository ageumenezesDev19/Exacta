import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/LanguageSwitcher.scss';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const currentLang = i18n.language.startsWith('pt') ? 'pt' : 'en';

  const changeLanguage = (lng: string) => {
    if (currentLang === lng) return;
    
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    
    // Reload to ensure all context / storage hooks grab the new keys
    window.location.reload();
  };

  return (
    <div className="language-switcher segmented" role="group" aria-label="Idioma / Language">
      <button
        onClick={() => changeLanguage('pt')}
        title="Português"
        aria-pressed={currentLang === 'pt'}
      >
        PT
      </button>
      <button
        onClick={() => changeLanguage('en')}
        title="English"
        aria-pressed={currentLang === 'en'}
      >
        EN
      </button>
    </div>
  );
};
