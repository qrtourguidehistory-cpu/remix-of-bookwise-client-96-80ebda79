import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';
import { CountrySelector, Country, countries } from './CountrySelector';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  placeholder?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  placeholder = 'Phone number',
  className,
}) => {
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  const formatPhoneNumber = (input: string) => {
    // Remove all non-numeric characters
    const numbers = input.replace(/\D/g, '');
    
    // Format based on length
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    } else {
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <>
      <div className={cn('relative flex items-center', className)}>
        {/* Country Code Button */}
        <button
          type="button"
          onClick={() => setShowCountrySelector(true)}
          className="flex items-center gap-1 px-4 py-4 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl hover:bg-slate-100 transition-colors"
        >
          <span className="text-xl">{selectedCountry.flag}</span>
          <span className="text-slate-900 font-medium">{selectedCountry.dialCode}</span>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </button>

        {/* Phone Input */}
        <Input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 h-14 rounded-l-none rounded-r-xl border-l-0 text-lg bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <CountrySelector
        open={showCountrySelector}
        onOpenChange={setShowCountrySelector}
        selectedCountry={selectedCountry}
        onSelect={onCountryChange}
      />
    </>
  );
};

export { countries };
