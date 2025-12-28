"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";

interface TrailerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoKey: string | null;
    movieTitle?: string;
}

export default function TrailerModal({ isOpen, onClose, videoKey, movieTitle }: TrailerModalProps) {
    // Handle escape key to close
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!videoKey) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        className="relative z-10 w-full max-w-4xl mx-4"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors group z-20"
                            aria-label="Close trailer"
                        >
                            <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Movie Title */}
                        {movieTitle && (
                            <h3 className="text-white text-lg font-semibold mb-3 text-center truncate">
                                {movieTitle}
                            </h3>
                        )}

                        {/* YouTube Player */}
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
                                title={movieTitle ? `${movieTitle} Trailer` : "Movie Trailer"}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            />
                        </div>

                        {/* Helper text */}
                        <p className="text-white/40 text-xs text-center mt-3">
                            ESC veya dışarı tıklayarak kapat
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
