import { Fragment } from "react";
import Link from "next/link";
import { T } from "@/components/preferences/Preferences";
import { getPilotPerson, personPath, type PilotPerson } from "@/lib/catalog/peopleManifest";
import type { IdentifiedCredit } from "@/lib/catalog/people";
import { normalizedName } from "@/lib/catalog/peopleModel.mjs";
import type { FilmDTO } from "@/lib/recommend/types";
export default function FilmPeopleLinks({film,credits}:{film:FilmDTO;credits:IdentifiedCredit[]}){
    const actors=new Map<number,PilotPerson>(),directors=new Map<number,PilotPerson>();
    for(const credit of credits){
        const role=credit.kind==="cast"?"actor":credit.job==="Director"?"director":null;
        if(!role)continue;
        const person=getPilotPerson(credit.person_id,role);
        if(person)(role==="actor"?actors:directors).set(person.id,person);
    }
    const link=(p:PilotPerson)=><Link href={personPath(p)} className="underline underline-offset-4 hover:text-accent-ink">{p.name}</Link>;
    const actorEntries=[...actors.values()],directorEntries=[...directors.values()];
    const cast=film.cast.slice(0,5);
    const extra=actorEntries.filter(p=>!cast.some(name=>normalizedName(name)===normalizedName(p.name)));
    const fallbackDirector=film.director&&!directorEntries.some(p=>normalizedName(p.name)===normalizedName(film.director))?film.director:null;
    return <>
        {(film.director||directorEntries.length>0)&&<><dt className="text-muted"><T text="Yönetmen" /></dt><dd className="font-semibold text-ink">{directorEntries.map((p,i)=><Fragment key={p.id}>{i>0?", ":""}{link(p)}</Fragment>)}{fallbackDirector&&<>{directorEntries.length?", ":""}{fallbackDirector}</>}</dd></>}
        {cast.length>0&&<><dt className="text-muted"><T text="Oyuncular" /></dt><dd className="text-ink">{cast.map((name,i)=>{const p=actorEntries.find(p=>normalizedName(p.name)===normalizedName(name));return <Fragment key={name+"-"+i}>{i>0?", ":""}{p?link(p):name}</Fragment>;})}</dd></>}
        {extra.length>0&&<><dt className="text-muted">Diğer filmografiler</dt><dd>{extra.map((p,i)=><Fragment key={p.id}>{i>0?", ":""}{link(p)}</Fragment>)}</dd></>}
    </>;
}
