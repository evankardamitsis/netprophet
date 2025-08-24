import { RewardItem } from './RewardCard';

export const mockRewards: RewardItem[] = [
    // Premium Features
    {
        id: 1,
        title: 'Pro Predictor Pass',
        description: 'Unlock advanced analytics, detailed stats, and premium prediction tools for 30 days',
        image: '🔮',
        points: 2000,
        category: 'premium',
        available: true,
        rarity: 'epic',
        featured: true
    },
    {
        id: 2,
        title: 'VIP Tournament Access',
        description: 'Exclusive access to private tournaments with higher stakes and better rewards',
        image: '👑',
        points: 3500,
        category: 'premium',
        available: true,
        rarity: 'legendary',
        featured: true
    },
    {
        id: 3,
        title: 'Double Points Boost',
        description: 'Earn 2x points on all predictions for the next 7 days',
        image: '⚡',
        points: 800,
        category: 'boost',
        available: true,
        rarity: 'rare'
    },
    {
        id: 4,
        title: 'Streak Protector',
        description: 'Protect your prediction streak from one wrong pick',
        image: '🛡️',
        points: 600,
        category: 'boost',
        available: true,
        rarity: 'rare'
    },
    {
        id: 5,
        title: 'Early Access Pass',
        description: 'Get early access to new features and tournaments before everyone else',
        image: '🚀',
        points: 1200,
        category: 'exclusive',
        available: true,
        rarity: 'epic'
    },
    // Merchandise
    {
        id: 6,
        title: 'NetProphet Cap',
        description: 'Exclusive branded cap with embroidered logo. Perfect for showing off your prediction skills!',
        image: '🎾',
        points: 500,
        category: 'merchandise',
        available: true,
        rarity: 'common',
        discount: 20
    },
    {
        id: 7,
        title: 'Prediction Master T-Shirt',
        description: 'Premium cotton t-shirt with unique NetProphet design. Limited edition!',
        image: '👕',
        points: 750,
        category: 'merchandise',
        available: true,
        rarity: 'rare'
    },
    {
        id: 8,
        title: 'Tennis Court Hoodie',
        description: 'Comfortable hoodie perfect for watching matches and making predictions',
        image: '🧥',
        points: 1200,
        category: 'merchandise',
        available: true,
        rarity: 'epic'
    },
    // Experiences
    {
        id: 9,
        title: 'Tournament Entry',
        description: 'Free entry to the next major tournament prediction contest. Compete with the best!',
        image: '🏆',
        points: 1000,
        category: 'experience',
        available: true,
        rarity: 'rare'
    },
    {
        id: 10,
        title: 'Meet & Greet Pass',
        description: 'Exclusive meet & greet with tennis pros at upcoming tournaments',
        image: '🤝',
        points: 2500,
        category: 'experience',
        available: true,
        rarity: 'legendary'
    },
    {
        id: 11,
        title: 'Prediction Workshop',
        description: 'Join our expert prediction workshop to improve your skills',
        image: '📚',
        points: 800,
        category: 'experience',
        available: true,
        rarity: 'rare'
    },
    // Badges
    {
        id: 12,
        title: 'Gold Badge',
        description: 'Prestigious gold badge for your profile. Unlock exclusive features and recognition.',
        image: '⭐',
        points: 750,
        category: 'badge',
        available: true,
        rarity: 'epic'
    },
    {
        id: 13,
        title: 'Diamond Badge',
        description: 'Ultra-rare diamond badge. Only the elite predictors earn this honor.',
        image: '💎',
        points: 1500,
        category: 'badge',
        available: true,
        rarity: 'legendary'
    },
    {
        id: 14,
        title: 'Prediction Master',
        description: 'Special badge for achieving 90%+ accuracy in a tournament',
        image: '🎯',
        points: 2000,
        category: 'badge',
        available: true,
        rarity: 'legendary'
    },
    // Exclusive Items
    {
        id: 15,
        title: 'Custom Profile Theme',
        description: 'Unlock a custom profile theme with animated elements and special effects',
        image: '🎨',
        points: 900,
        category: 'exclusive',
        available: true,
        rarity: 'epic'
    },
    {
        id: 16,
        title: 'Prediction History Export',
        description: 'Download your complete prediction history with detailed analytics',
        image: '📊',
        points: 400,
        category: 'exclusive',
        available: true,
        rarity: 'common'
    }
];
