"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";

export default function UserMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { user, loading, signIn, logOut } = useAuth();
    const { t } = useTranslation();

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (loading) {
        return (
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <button
                onClick={signIn}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 hover:border-accent/50 transition-all group"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                    {t("header.signIn")}
                </span>
            </button>
        );
    }

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full glass border border-white/10 hover:border-white/30 transition-all"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="w-7 h-7 rounded-full"
                    />
                ) : (
                    <User className="w-5 h-5 text-white/70" />
                )}
                <span className="text-sm text-white/80 max-w-[100px] truncate hidden sm:block">
                    {user.displayName?.split(" ")[0]}
                </span>
                <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-card border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                        <div className="p-3 border-b border-white/10">
                            <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                            <p className="text-xs text-white/50 truncate">{user.email}</p>
                        </div>
                        <button
                            onClick={() => {
                                logOut();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            {t("header.signOut")}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
