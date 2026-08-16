import React from 'react';

function SearchBar({ value, onChange, placeholder = 'Search notes...' }) {
  return (
    <div className="search-wrap">
      <span className="search-icon">🔍</span>
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search notes"
      />
    </div>
  );
}

export default SearchBar;
