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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-3xl font-bold">{dict.rewards.rewardShop}</h2>
                            {onInfoClick && (
                                <button
                                    onClick={onInfoClick}
                                    className="text-blue-100 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                                    title={dict.rewards.howItWorks}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        <p className="text-blue-100">{dict.rewards.redeemDescription}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-blue-100 text-sm">{dict.rewards.yourBalance}</div>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            {actualBalance.toLocaleString()}
                            <CoinIcon size={40} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
        </div>
    );
}
