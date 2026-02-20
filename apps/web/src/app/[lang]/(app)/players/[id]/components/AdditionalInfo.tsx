'use client';

import { Player } from '@netprophet/lib';
import { Card, CardContent } from '@netprophet/ui';
import { useDictionary } from '@/context/DictionaryContext';

interface AdditionalInfoProps {
    player: Player;
}

export function AdditionalInfo({ player }: AdditionalInfoProps) {
    const { dict } = useDictionary();

    const hasContent = player.notes || (player.injuryStatus && player.injuryStatus !== 'healthy');

    if (!hasContent) return null;

    return (
        <div className="mt-8 sm:mt-12">
            <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-40 group-hover:opacity-60 blur transition"></div>
                <Card className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border-0 shadow-xl">
                    <CardContent className="p-6">
                        <h3 className="text-xl font-black text-white mb-6 drop-shadow-lg">
                            {dict?.athletes?.additionalInfo || 'Additional Information'}
                        </h3>
                        <div className="space-y-4">
                            {player.notes && (
                                <div>
                                    <div className="text-sm text-purple-300 mb-2 font-bold">
                                        {dict?.athletes?.notes || 'Notes'}
                                    </div>
                                    <div className="text-base text-white font-bold">{player.notes}</div>
                                </div>
                            )}

                            {player.injuryStatus && player.injuryStatus !== 'healthy' && (
                                <div>
                                    <div className="text-sm text-purple-300 mb-2 font-bold">
                                        {dict?.athletes?.injuryStatus || 'Injury Status'}
                                    </div>
                                    <div className="inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full text-sm font-bold shadow-lg">
                                        {player.injuryStatus === 'minor' ? (dict?.athletes?.minorInjury || 'Minor Injury') : (dict?.athletes?.majorInjury || 'Major Injury')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
