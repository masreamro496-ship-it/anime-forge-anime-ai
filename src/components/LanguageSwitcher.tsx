import { useState, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

// قائمة لغات العالم المعتمدة
const WORLD_LANGUAGES = [
  { code: 'ar', name: 'العربية', native: 'العربية' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '中文 (简体)' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'ko', name: 'Korean', native: '한국어' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe' },
  { code: 'it', name: 'Italian', native: 'Italiano' },
  { code: 'pt', name: 'Portuguese', native: 'Português' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'fa', name: 'Persian', native: 'فارسی' },
  { code: 'nl', name: 'Dutch', native: 'Nederlands' },
  { code: 'pl', name: 'Polish', native: 'Polski' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', native: 'ไทย' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська' },
  { code: 'el', name: 'Greek', native: 'Ελληνικά' },
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'sv', name: 'Swedish', native: 'Svenska' },
  { code: 'ro', name: 'Romanian', native: 'Română' },
  { code: 'cs', name: 'Czech', native: 'Čeština' },
  { code: 'hu', name: 'Hungarian', native: 'Magyar' },
  { code: 'fi', name: 'Finnish', native: 'Suomi' },
  { code: 'da', name: 'Danish', native: 'Dansk' },
];

export function GlobalLanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('ar');

  // دالة تغيير اللغة عبر Google Translate
  const changeLanguage = (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);

    const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = langCode;
      selectElement.dispatchEvent(new Event('change'));
    }
  };

  useEffect(() => {
    // حقن سكربت ترجمة جوجل ليعمل خلف الكواليس وبشكل خفي
    if (!document.getElementById('google-translate-script')) {
      const addScript = document.createElement('script');
      addScript.id = 'google-translate-script';
      addScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(addScript);

      const allCodes = WORLD_LANGUAGES.map(l => l.code).join(',');
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { 
            pageLanguage: 'ar', 
            includedLanguages: allCodes, 
            autoDisplay: false 
          },
          'google_translate_element'
        );
      };
    }
  }, []);

  return (
    <div className="relative inline-block text-left">
      {/* عنصر جوجل المخفي لتفعيل ترجمة الموقع بالكامل */}
      <div id="google_translate_element" className="hidden"></div>

      {/* زر اختيار اللغات (صغير جداً، أزرق، وبجانبه أيقونة الكوكب 🌐) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/90 hover:bg-blue-600 text-white text-[11px] font-bold shadow-md transition-all active:scale-95"
        title="تغيير لغة الموقع"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>🌐</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* قائمة اللغات المنسدلة (تحتوي على كل اللغات مع شريط تمرير أنيق) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 max-h-64 overflow-y-auto rounded-xl border border-border bg-slate-950/95 backdrop-blur-md shadow-2xl py-1 z-50 text-right scrollbar-thin">
          {WORLD_LANGUAGES.map((lang) => {
            const isSelected = currentLang === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-600/20 transition ${
                  isSelected ? 'text-blue-400 font-bold bg-blue-600/10' : 'text-slate-200'
                }`}
              >
                <span className="truncate">{lang.native}</span>
                {isSelected && <Check className="h-3 w-3 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
