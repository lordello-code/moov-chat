// Passthrough — sidebar e auth estão em [tenantSlug]/layout.tsx
// onde params.tenantSlug é garantido pelo segmento dinâmico
export default function LojaGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
