import manifest from "./people-manifest.json";
import { slugify } from "@/lib/filmUrl";
export type PersonRole = "actor" | "director";
export type PilotPerson = { id:number; name:string; role:PersonRole };
export const PILOT_PEOPLE = manifest as PilotPerson[];
export const roleDirectory = (role:PersonRole) => role === "actor" ? "oyuncu" : "yonetmen";
export const personPath = (person:PilotPerson) => "/" + roleDirectory(person.role) + "/" + person.id + "-" + slugify(person.name);
export const getPilotPerson = (id:number,role:PersonRole) => PILOT_PEOPLE.find(p=>p.id===id && p.role===role);
