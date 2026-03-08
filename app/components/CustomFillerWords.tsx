import { useState, useCallback } from "react";

type CustomFillerWordsProps = {
  customWords: string[];
  onUpdate: (words: string[]) => void;
};

export function CustomFillerWords({
  customWords,
  onUpdate,
}: CustomFillerWordsProps) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const addWord = useCallback(() => {
    const word = inputValue.trim().toLowerCase();
    if (word && !customWords.includes(word)) {
      onUpdate([...customWords, word]);
      setInputValue("");
    }
  }, [inputValue, customWords, onUpdate]);

  const removeWord = useCallback(
    (word: string) => {
      onUpdate(customWords.filter((w) => w !== word));
    },
    [customWords, onUpdate]
  );

  return (
    <div className="rounded-lg bg-surface-light p-3" data-testid="custom-filler-words">
      <button
        onClick={() => setIsExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-sm font-medium text-white"
      >
        <span>Custom Filler Words</span>
        <span className="text-text-muted">
          {isExpanded ? "\u25B2" : "\u25BC"}{" "}
          {customWords.length > 0 && `(${customWords.length})`}
        </span>
      </button>
      {isExpanded && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addWord();
                }
              }}
              placeholder="Add a filler word..."
              className="flex-1 rounded-md border border-surface-lighter bg-surface px-2 py-1 text-sm text-white placeholder-text-muted outline-none focus:border-primary"
            />
            <button
              onClick={addWord}
              disabled={!inputValue.trim()}
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-30"
            >
              Add
            </button>
          </div>
          {customWords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {customWords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 rounded-full bg-filler/20 px-2 py-0.5 text-xs text-filler"
                >
                  {word}
                  <button
                    onClick={() => removeWord(word)}
                    className="text-filler/70 hover:text-filler"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-text-muted">
            These words will be flagged as fillers on next analysis.
          </p>
        </div>
      )}
    </div>
  );
}
