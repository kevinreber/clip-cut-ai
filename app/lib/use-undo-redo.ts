import { useCallback, useRef, useState } from "react";

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setState((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      pastRef.current = [...pastRef.current, prev];
      futureRef.current = [];
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const past = pastRef.current;
      if (past.length === 0) return current;
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [...futureRef.current, current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const future = futureRef.current;
      if (future.length === 0) return current;
      const next = future[future.length - 1];
      futureRef.current = future.slice(0, -1);
      pastRef.current = [...pastRef.current, current];
      return next;
    });
  }, []);

  const reset = useCallback((value: T) => {
    setState(value);
    pastRef.current = [];
    futureRef.current = [];
  }, []);

  return {
    state,
    set,
    undo,
    redo,
    reset,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
