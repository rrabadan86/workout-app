export function uid(): string {
    return crypto.randomUUID();
}

export function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
}

export function today(): string {
    return new Date().toISOString().split('T')[0];
}
