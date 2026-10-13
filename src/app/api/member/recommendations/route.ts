import { createPersonalHandler } from "@/lib/server/personalHandler.mjs";
import { createWatchlistStorage } from "@/lib/server/watchlistStorage.mjs";
import { verifyMember } from "@/lib/server/memberAuth.mjs";
import { getPersonalRecommendations } from "@/lib/recommend/personal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = createPersonalHandler({ verify: verifyMember, storage: createWatchlistStorage(), recommend: getPersonalRecommendations });
