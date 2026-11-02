"use client";

import { StoreProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import { UIProvider } from "@/lib/ui";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <StoreProvider>
        <UIProvider>{children}</UIProvider>
      </StoreProvider>
    </ThemeProvider>
  );
}
