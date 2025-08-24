import { useWallet } from '@/context/WalletContext';

interface RewardShopHeaderProps {
    userPoints?: number;
}

export function RewardShopHeader({ userPoints = 1250 }: RewardShopHeaderProps) {
    const { wallet } = useWallet();
    const actualBalance = wallet?.balance ?? userPoints;

    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">🎁 Reward Shop</h2>
                        <p className="text-blue-100">Redeem your points for exclusive rewards and premium features</p>
                    </div>
                    <div className="text-right">
                        <div className="text-blue-100 text-sm">Your Balance</div>
                        <div className="text-4xl font-bold flex items-center gap-2">
                            {actualBalance.toLocaleString()}
                            <span className="text-yellow-300">🌕</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
        </div>
    );
}
