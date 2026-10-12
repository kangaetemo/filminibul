import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Account from "./Account";
export const metadata: Metadata = { title: "Hesabım · Filminibul", robots: { index: false, follow: false } };
export default function AccountPage() {
    return <><SiteHeader search={false} /><main className="page-width py-12 sm:py-16"><Account /></main><Footer /></>;
}
