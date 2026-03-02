// Landing page has no auth/navbar — just wrap children
export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
