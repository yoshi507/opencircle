"use client";

import { Plus } from "lucide-react";
import { CreateServerModal } from "@/components/create-server-modal";

export function CreateServerButton() {
  return (
    <CreateServerModal>
      <button
        className="w-12 h-12 rounded-2xl bg-card text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:rounded-xl flex items-center justify-center transition-all"
        title="Create a server"
      >
        <Plus className="w-5 h-5" />
      </button>
    </CreateServerModal>
  );
}
