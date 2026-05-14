import { useWallet } from '@/context/WalletContext';
import { useDictionary } from '@/context/DictionaryContext';
import CoinIcon from '@/components/CoinIcon';

interface RewardShopHeaderProps {
    userPoints?: number;
    onInfoClick?: () => void;
}

export function RewardShopHeader({ userPoints, onInfoClick }: RewardShopHeaderProps) {
    const { wallet } = useWallet();
    const { dict } = useDictionary();
    const actualBalance = wallet?.balance ?? userPoints ?? 0;

    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                    {dict.rewards.rewardShop || 'Κατάστημα'}
                </h1>
                <p className="text-[13px] text-[#94A3B8] mt-0.5">
                    Αγορά νομισμάτων & ενισχύσεις
                </p>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/25">
                    <CoinIcon size={16} />
                    <span className="text-[#FFD60A] font-black text-sm tabular-nums">
                        {actualBalance.toLocaleString('el-GR')}
                    </span>
                </div>
                {onInfoClick && (
                    <button
                        onClick={onInfoClick}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1E2A45] border border-white/[0.08] text-[#4B5975] hover:text-white hover:border-white/[0.16] transition-colors"
                        title={dict.rewards.howItWorks}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
