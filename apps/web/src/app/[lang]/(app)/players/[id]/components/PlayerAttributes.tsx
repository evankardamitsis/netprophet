'use client';

import { Player } from '@netprophet/lib';
import { useDictionary } from '@/context/DictionaryContext';

interface PlayerAttributesProps {
    player: Player;
}

const ATTRS = [
    { key: 'aggressiveness', color: '#FF4545', label: (dict: any) => dict?.athletes?.aggressiveness || 'Επιθετικότητα' },
    { key: 'stamina',        color: '#00E676', label: (dict: any) => dict?.athletes?.stamina        || 'Αντοχή'       },
    { key: 'consistency',   color: '#38BDF8', label: (dict: any) => dict?.athletes?.consistency    || 'Σταθερότητα'  },
] as const;

export function PlayerAttributes({ player }: PlayerAttributesProps) {
    const { dict } = useDictionary();

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#161F35] border border-white/[0.06] p-5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
            <h3 className="text-sm font-black text-white mb-4">
                {dict?.athletes?.attributes || 'Χαρακτηριστικά'}
            </h3>
            <div className="space-y-4">
                {ATTRS.map(attr => {
                    const val = player[attr.key] as number;
                    const pct = Math.round((val / 10) * 100);
                    return (
                        <div key={attr.key}>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[12px] font-semibold text-[#94A3B8]">{attr.label(dict)}</span>
                                <span className="text-xs font-black tabular-nums" style={{ color: attr.color }}>{val}/10</span>
                            </div>
                            <div className="h-2 rounded-full bg-[#0F1628] overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: attr.color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
