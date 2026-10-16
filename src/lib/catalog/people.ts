import { cache } from "react";
import { supabaseSelect } from "@/lib/server/supabase";
import { catalogCard, type CardRow } from "./lists";
import { CARD_COLUMNS, PAGE_SIZE } from "./pilot";
import { getPilotPerson, type PersonRole } from "./peopleManifest";
import type { FilmDTO } from "@/lib/recommend/types";
import { creditLabel } from "./creditLabel.mjs";
export type PersonRow = { person_id:number; name:string; display_name:string; profile_path:string|null; pilot_role:PersonRole; published:boolean; updated_at:string };
export type CreditRow = { movie_id:number; kind:"cast"|"crew"; job:string; character_name:string|null; film:CardRow };
export const getPersonSnapshot = cache(async(id:number,role:PersonRole)=>{
    const entry=getPilotPerson(id,role);
    if(!entry)return null;
    const people=await supabaseSelect<PersonRow[]>("film_people?select=person_id,name,display_name,profile_path,pilot_role,published,updated_at&person_id=eq."+id+"&pilot_role=eq."+role+"&published=eq.true&limit=1",86400);
    const person=people[0];
    if(!person)return null;
    const films=new Map<number,FilmDTO>(), characters=new Map<number,Set<string>>();
    for(let offset=0;;offset+=1000){
        const params=new URLSearchParams({select:"movie_id,kind,job,character_name,film:film_embeddings_v3!inner("+CARD_COLUMNS+")",person_id:"eq."+id,kind:"eq."+(role==="actor"?"cast":"crew"),order:"movie_id.asc,credit_key.asc",limit:"1000",offset:String(offset)});
        if(role==="director")params.set("job","eq.Director");
        const rows=await supabaseSelect<CreditRow[]>("film_person_credits?"+params,86400);
        for(const row of rows){
            if(!row.film || row.film.year==null || row.film.year>2025)continue;
            films.set(row.movie_id,catalogCard(row.film));
            if(row.character_name?.trim()){
                if(!characters.has(row.movie_id))characters.set(row.movie_id,new Set());
                characters.get(row.movie_id)!.add(row.character_name.trim());
            }
        }
        if(rows.length<1000)break;
    }
    const sorted=Array.from(films.values()).sort((a,b)=>(b.voteCount??-1)-(a.voteCount??-1)||a.id-b.id);
    const notes:Record<number,string>={};
    for(const film of sorted)notes[film.id]=role==="director"?"Yönetmen":Array.from(characters.get(film.id)??[]).map(creditLabel).join(" · ");
    return {entry,person,films:sorted,notes,total:sorted.length,pages:Math.ceil(sorted.length/PAGE_SIZE)};
});
export type IdentifiedCredit = {person_id:number; kind:"cast"|"crew"; job:string; person:PersonRow};
export const getFilmPeople = cache(async(movieId:number)=>{
    // A small cacheable metadata read. A temporary failure must not remove the film page.
    try{
        const q=new URLSearchParams({select:"person_id,kind,job,person:film_people!inner(person_id,name,display_name,profile_path,pilot_role,published,updated_at)",movie_id:"eq."+movieId,"person.published":"eq.true",order:"person_id.asc,credit_key.asc",limit:"1000"});
        return await supabaseSelect<IdentifiedCredit[]>("film_person_credits?"+q,86400);
    }catch{ return []; }
});
