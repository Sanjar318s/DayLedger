import { useLocale } from '../context/LocaleContext';
import { Lang } from '../i18n/translations';

export default function LocaleSwitcher() {
  const { lang, setLang, currency, setCurrency } = useLocale();

  const languages: { code: Lang; label: string }[] = [
    { code: 'ru', label: 'Русский' },
    { code: 'uz', label: "O'zbek" },
    { code: 'en', label: 'English' },
  ];

  const currencies = ['UZS', 'USD', 'EUR', 'RUB'];

  return (
    <div className="flex gap-3 items-center">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="input-field flex-1"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="input-field flex-1"
      >
        {currencies.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
