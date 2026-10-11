"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics/client";
import type { EventData, EventName } from "@/lib/analytics/schema";
export default function TrackedLink({ event, data, ...props }: ComponentProps<typeof Link> & { event: EventName; data: EventData }) {
    return <Link {...props} onClick={() => track(event, data)} />;
}
