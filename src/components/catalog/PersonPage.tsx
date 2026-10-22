import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { getPersonSnapshot } from "@/lib/catalog/people";
import { getPilotPerson, personPath, type PersonRole } from "@/lib/catalog/peopleManifest";
import { parseFilmParam } from "@/lib/filmUrl";
import { parsePage, pagePath, PAGE_SIZE } from "@/lib/catalog/pilot";
import { OG_BASE, isPreviewSite } from "@/lib/seo";
import { ownImageAbsoluteUrl, ownImageUrl } from "@/lib/ownImage";
import CatalogList from "./CatalogList";
export type PersonProps={params:{id:string};searchParams?:Record<string,string|string[]|undefined>};
export async function personMetadata(props:PersonProps,role:PersonRole):Promise<Metadata>{
    const id=parseFilmParam(props.params.id),page=parsePage(props.searchParams?.page);
    if(!id||!page||!getPilotPerson(id,role))return {title:"Kişi bulunamadı",robots:{index:false,follow:false}};
    const data=await getPersonSnapshot(id,role);
    if(!data||!data.total||page>data.pages)return {title:"Filmografi bulunamadı",robots:{index:false,follow:false}};
    const title=data.entry.name+(role==="actor"?" filmleri":" yönetmenliğini yaptığı filmler")+(page>1?" · Sayfa "+page:"")+" · Filminibul";
    const description=data.entry.name+" için katalogumuzdaki "+data.total+(role==="actor"?" oyunculuk":" yönetmenlik")+" filmi. Film ayrıntılarını ve benzer film önerilerini keşfet.";
    const path=pagePath(personPath(data.entry),page);
    return {title,description,alternates:{canonical:path},robots:{index:!isPreviewSite()&&data.total>=5&&Object.keys(props.searchParams??{}).every(k=>k==="page"),follow:true},openGraph:{...OG_BASE,type:"profile",title,description,url:path,...(data.person.profile_path?{images:[{url:ownImageUrl("https://image.tmdb.org/t/p/w500"+data.person.profile_path),alt:data.entry.name}]}:{})}};
}
export default async function PersonPage({params,searchParams,role}:PersonProps&{role:PersonRole}){
    const id=parseFilmParam(params.id),page=parsePage(searchParams?.page);
    const entry=id?getPilotPerson(id,role):null;
    if(!id||!page||!entry)notFound();
    const canonical=personPath(entry);
    if("/"+(role==="actor"?"oyuncu":"yonetmen")+"/"+params.id!==canonical || searchParams?.page==="1"){
        const query=new URLSearchParams();
        if(page>1)query.set("page",String(page));
        if(searchParams?.lang==="en"||searchParams?.lang==="tr")query.set("lang",searchParams.lang);
        permanentRedirect(canonical+(query.size?"?"+query:""));
    }
    const data=await getPersonSnapshot(id,role);
    if(!data||!data.total||page>data.pages)notFound();
    const years=data.films.map(f=>f.year).filter((year):year is number=>year!==null);
    const range=Math.min(...years)+"–"+Math.max(...years);
    const examples=data.films.slice(0,3).map(f=>f.title).join(", ");
    const title=entry.name+(role==="actor"?" filmleri":" yönetmenliğini yaptığı filmler");
    const description=entry.name+" için bu seçkide "+range+" döneminden "+data.total+" film bulunuyor. "+examples+" en çok oy alan örnekler arasında. Seçki, 2025 ve öncesinde katalogumuzda bulunan "+(role==="actor"?"oyunculuk":"yönetmenlik")+" çalışmalarını kapsıyor.";
    const image=data.person.profile_path?"https://image.tmdb.org/t/p/w185"+data.person.profile_path:null;
    return <CatalogList title={title} description={description} path={canonical} films={data.films.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)} total={data.total} page={page} pages={data.pages} context="person" filmNotes={data.notes}
        structuredData={[{"@type":"Person","@id":"https://www.themoviedb.org/person/"+id,name:entry.name,url:"https://filminibul.com"+canonical,sameAs:"https://www.themoviedb.org/person/"+id,...(image?{image:ownImageAbsoluteUrl(image)}:{})}]}>
        <div className="mt-5 flex items-center gap-4">{image?<Image src={image} alt={entry.name} width={80} height={112} className="rounded-lg object-cover" />:<span className="flex h-20 w-20 items-center justify-center rounded-full bg-ink/5 text-xl font-bold" aria-hidden>{entry.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</span>}<p className="text-sm text-muted">{role==="actor"?"Oyunculuk filmografisi":"Yönetmenlik filmografisi"}</p></div>
    </CatalogList>;
}
