'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface PlayerAttributesProps {
    player: Player;
}

export function PlayerAttributes({ player }: PlayerAttributesProps) {
    const { dict } = useDictionary();

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
            <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-6">
                    <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                        {dict?.athletes?.attributes || 'Player Attributes'}
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-purple-300 font-bold">{dict?.athletes?.aggressiveness || 'Aggressiveness'}</span>
                                <span className="text-white font-black">{player.aggressiveness}/10</span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-red-500 to-orange-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                    style={{ width: `${(player.aggressiveness / 10) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-purple-300 font-bold">{dict?.athletes?.stamina || 'Stamina'}</span>
                                <span className="text-white font-black">{player.stamina}/10</span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                    style={{ width: `${(player.stamina / 10) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-purple-300 font-bold">{dict?.athletes?.consistency || 'Consistency'}</span>
                                <span className="text-white font-black">{player.consistency}/10</span>
                            </div>
                            <div className="w-full bg-slate-700/50 rounded-full h-3 shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                                    style={{ width: `${(player.consistency / 10) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
