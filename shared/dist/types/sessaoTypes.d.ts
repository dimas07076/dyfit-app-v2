export declare const TIPOS_COMPROMISSO: readonly ["avaliacao", "checkin", "treino_acompanhado", "outro"];
export type TipoCompromisso = typeof TIPOS_COMPROMISSO[number];
export interface CompromissoDataShareable {
    _id: string;
    sessionDate: string;
    tipoCompromisso: TipoCompromisso;
    notes?: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    studentId: {
        _id: string;
        nome: string;
    } | string;
}
