import { useState, useEffect } from 'react';

export default function VanDonInlineEdit({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  function handleSave() {
    onSave(val);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="input-field py-1 text-xs w-28"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <button
          onClick={handleSave}
          className="text-xs px-1.5 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          ✓
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-1.5 py-1 bg-gray-200 text-gray-600 rounded"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-xs text-gray-600 hover:text-primary-700 hover:underline min-w-[60px]"
    >
      {value || <span className="text-gray-300 italic">+ Thêm</span>}
    </button>
  );
}
