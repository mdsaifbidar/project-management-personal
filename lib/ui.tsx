"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Item, NewItem } from "./types";

export interface ToastAction {
  label: string;
  run: () => void;
}

interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

interface UIValue {
  // Item modal
  modalOpen: boolean;
  editing: Item | null;
  prefill: Partial<NewItem> | null;
  openNew: (prefill?: Partial<NewItem>) => void;
  openEdit: (item: Item) => void;
  closeModal: () => void;

  // Command palette
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  // WIP "which project should pause?" prompt
  wipPromptFor: Item | null;
  openWipPrompt: (item: Item) => void;
  closeWipPrompt: () => void;

  // New project from template
  templateOpen: boolean;
  setTemplateOpen: (open: boolean) => void;

  // Keyboard shortcut help
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;

  // Toasts
  toasts: Toast[];
  /** durationMs overrides the default (2.6 s, or 5 s with an action). */
  toast: (message: string, action?: ToastAction, durationMs?: number) => void;
  dismissToast: (id: number) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [prefill, setPrefill] = useState<Partial<NewItem> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [wipPromptFor, setWipPromptFor] = useState<Item | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const openNew = useCallback((pf?: Partial<NewItem>) => {
    setEditing(null);
    setPrefill(pf ?? null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: Item) => {
    setPrefill(null);
    setEditing(item);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setPrefill(null);
  }, []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openWipPrompt = useCallback((item: Item) => setWipPromptFor(item), []);
  const closeWipPrompt = useCallback(() => setWipPromptFor(null), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, action?: ToastAction, durationMs?: number) => {
      const id = ++counter.current;
      setToasts((t) => [...t.slice(-2), { id, message, action }]);
      setTimeout(() => dismissToast(id), durationMs ?? (action ? 5000 : 2600));
    },
    [dismissToast]
  );

  return (
    <UIContext.Provider
      value={{
        modalOpen,
        editing,
        prefill,
        openNew,
        openEdit,
        closeModal,
        searchOpen,
        openSearch,
        closeSearch,
        wipPromptFor,
        openWipPrompt,
        closeWipPrompt,
        templateOpen,
        setTemplateOpen,
        helpOpen,
        setHelpOpen,
        toasts,
        toast,
        dismissToast,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
