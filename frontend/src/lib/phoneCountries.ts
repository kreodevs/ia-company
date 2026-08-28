export interface PhoneCountry {
  code: string;
  label: string;
  dial: string;
  flag: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "MX", label: "México", dial: "+52", flag: "🇲🇽" },
  { code: "US", label: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "ES", label: "España", dial: "+34", flag: "🇪🇸" },
  { code: "CO", label: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "AR", label: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", label: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "PE", label: "Perú", dial: "+51", flag: "🇵🇪" },
  { code: "BR", label: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "GB", label: "Reino Unido", dial: "+44", flag: "🇬🇧" },
  { code: "DE", label: "Alemania", dial: "+49", flag: "🇩🇪" },
  { code: "FR", label: "Francia", dial: "+33", flag: "🇫🇷" },
  { code: "IT", label: "Italia", dial: "+39", flag: "🇮🇹" },
];

export function findCountryByCode(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}
