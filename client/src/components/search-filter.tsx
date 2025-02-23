import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { debounce } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onTypeFilter?: (type: string) => void;
  onYearFilter?: (year: string) => void;
  placeholder?: string;
}

const PUBLICATION_TYPES = [
  "All Types",
  "Journal Article",
  "Conference Paper",
  "Book Chapter",
  "Workshop Paper",
  "Technical Report",
  "Other"
];

const YEARS = Array.from(
  { length: 30 },
  (_, i) => new Date().getFullYear() - i
);

export default function SearchFilter({ 
  onSearch,
  onTypeFilter,
  onYearFilter,
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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={handleChange}
          className="pl-9"
          placeholder={placeholder}
        />
      </div>

      <div className="flex gap-4">
        {onTypeFilter && (
          <Select onValueChange={onTypeFilter} defaultValue="All Types">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Publication Type" />
            </SelectTrigger>
            <SelectContent>
              {PUBLICATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {onYearFilter && (
          <Select onValueChange={onYearFilter} defaultValue="All Years">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Years">All Years</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}