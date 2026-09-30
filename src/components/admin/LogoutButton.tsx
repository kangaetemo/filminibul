"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
    const router = useRouter();
    return (
        <button
            type="button"
            onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                router.replace("/admin/login");
            }}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
            <LogOut className="w-4 h-4" />
            Çıkış
        </button>
    );
}
