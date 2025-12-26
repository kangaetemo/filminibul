"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
    viewKey: string;
    direction: number; // 1 = forward, -1 = back
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
    }),
    center: {
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
    }),
};

// Smooth easeInOut curve for polished feel
const transition = {
    x: { type: "spring", stiffness: 300, damping: 30 },
    opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    scale: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
};

export default function PageTransition({ children, viewKey, direction }: PageTransitionProps) {
    return (
        <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
                key={viewKey}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
