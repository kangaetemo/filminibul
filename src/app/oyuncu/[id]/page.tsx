import PersonPage,{personMetadata,type PersonProps} from "@/components/catalog/PersonPage";
export const revalidate=86400;
export const generateMetadata=(props:PersonProps)=>personMetadata(props,"actor");
export default function Page(props:PersonProps){return <PersonPage {...props} role="actor" />;}
