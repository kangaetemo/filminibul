// Seri adının sitede gösterilen hâli: TMDB'deki Türkçe çevirisi (src/data/collections_tr.json, haftalık iş yeniler),
// yoksa İngilizce adın sadeleştirilmişi ("The Godfather Collection" → "The Godfather"). Sadece sunucuda kullanılır.

import collectionsTr from "@/data/collections_tr.json";
import { cleanCollectionName } from "./collectionName.mjs";

const TR = collectionsTr as Record<string, string | null>;

export function collectionLabel(id: number | null | undefined, name: string | null | undefined): string | null {
    if (!name) return null;
    return (id != null && TR[String(id)]) || cleanCollectionName(name);
}
