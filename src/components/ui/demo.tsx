import { MatrixText } from "./matrix-text";

export function DemoMatrixText() {
    return (
        <div className="flex flex-col items-center justify-center gap-6 py-24 bg-tema-negro/40 backdrop-blur-2xl rounded-[3.5rem] border border-tema-electrico/10 panel-de-vidrio overflow-hidden relative group">
            <div className="absolute inset-0 grid-bg opacity-5 group-hover:opacity-10 transition-opacity" />
            <MatrixText
                text="CYBER_AGENTE"
                initialDelay={400}
                letterAnimationDuration={800}
                letterInterval={150}
                className="text-6xl font-bold text-tema-texto tracking-tighter"
            />
            <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-tema-neon font-bold tracking-widest uppercase opacity-60">Protocolo de Enlace Neural v4.2</p>
                <div className="w-48 h-1 bg-tema-electrico/10 rounded-full overflow-hidden">
                    <div className="h-full bg-tema-neon w-1/3 animate-[loading_2s_infinite]" />
                </div>
            </div>
        </div>
    );
}
