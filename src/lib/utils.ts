export function uid(): string {
    return crypto.randomUUID();
}

export function formatDate(iso: string): string {
    if (!iso) return '';
    // Parse as local date (add noon time to avoid timezone shift at UTC midnight)
    const plain = iso.split('T')[0]; // take only YYYY-MM-DD
    const [year, month, day] = plain.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return d.toLocaleDateString('pt-BR');
}

export function today(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
