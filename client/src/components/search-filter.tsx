import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { debounce } from "@/lib/utils";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchFilter({ 
  onSearch,
  placeholder = "Search..."
}: SearchFilterProps) {
  const [value, setValue] = useState("");

  // Debounce the search to avoid too many API calls
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearch(query);
    }, 300),
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={handleChange}
        className="pl-9"
        placeholder={placeholder}
      />
    </div>
  );
}
