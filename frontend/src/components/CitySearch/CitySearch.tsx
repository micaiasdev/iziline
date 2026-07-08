import { useEffect, useId, useRef, useState } from "react";
import type { CitySearchResult } from "../../types/trip";
import { searchCities } from "../../travel/service/cityService";
import "./CitySearch.css";

type CitySearchProps = {
  label: string;
  placeholder?: string;
  selectedCity: CitySearchResult | null;
  error?: string;
  onSelect: (city: CitySearchResult | null) => void;
};

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

export function CitySearch({
  label,
  placeholder,
  selectedCity,
  error,
  onSelect,
}: CitySearchProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState(selectedCity?.label ?? "");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (selectedCity && trimmed === selectedCity.label) {
      return;
    }

    if (trimmed.length < MIN_CHARS) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      setIsLoading(true);
      searchCities(trimmed)
        .then((found) => {
          if (cancelled) {
            return;
          }
          setResults(found);
          setActiveIndex(found.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selectedCity]);

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(true);
    if (selectedCity) {
      onSelect(null);
    }
  }

  function choose(city: CitySearchResult) {
    onSelect(city);
    setQuery(city.label);
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (
      event.key === "Enter" &&
      isOpen &&
      activeIndex >= 0 &&
      results[activeIndex]
    ) {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  }

  const trimmedQuery = query.trim();
  const matchesSelection = Boolean(
    selectedCity && trimmedQuery === selectedCity.label
  );
  const isQueryLongEnough = trimmedQuery.length >= MIN_CHARS && !matchesSelection;
  const isSearching = isLoading && isQueryLongEnough;
  const showList = isOpen && isQueryLongEnough;
  const showNoResults = showList && !isSearching && results.length === 0;

  return (
    <div className="city-search" ref={containerRef}>
      <label htmlFor={inputId} className="city-search__label">
        {label}
      </label>

      <div className="city-search__control">
        <input
          id={inputId}
          className="city-search__input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && activeIndex >= 0
              ? `${listId}-opt-${activeIndex}`
              : undefined
          }
          aria-invalid={Boolean(error)}
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (trimmedQuery.length >= MIN_CHARS) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {isSearching && <span className="city-search__spinner" aria-hidden="true" />}

        {selectedCity && !isSearching && (
          <span className="city-search__check" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3.5 8.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>

      {showList && (
        <ul className="city-search__list" id={listId} role="listbox">
          {isSearching && results.length === 0 && (
            <li className="city-search__status" role="presentation">
              Buscando…
            </li>
          )}

          {results.map((city, index) => (
            <li
              key={city.id}
              id={`${listId}-opt-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "city-search__option is-active"
                  : "city-search__option"
              }
              onPointerDown={(event) => {
                event.preventDefault();
                choose(city);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {city.label}
            </li>
          ))}

          {showNoResults && (
            <li className="city-search__status" role="presentation">
              Nenhuma cidade encontrada
            </li>
          )}
        </ul>
      )}

      {error && <span className="city-search__error">{error}</span>}
    </div>
  );
}
