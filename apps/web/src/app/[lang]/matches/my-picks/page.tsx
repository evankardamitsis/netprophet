'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@netprophet/ui';
import { useAuth } from '@/hooks/useAuth';
import { PredictionHistory } from '@/components/matches/PredictionHistory';
import { TopNavigation } from '@/components/matches/TopNavigation';

// Mock data for prediction history
const mockPredictions = [
    {
        id: 1,
        matchTitle: "Γιώργος vs Μαρίνος",
        date: "2024-01-15",
        time: "14:30",
        prediction: {
            winner: "Μαρίνος",
            score: "2-1",
            tiebreak: "Ναι"
        },
        status: "correct" as const,
        pointsEarned: 9,
        streak: 3
    },
    {
        id: 2,
        matchTitle: "Ελένη vs Σοφία",
        date: "2024-01-14",
        time: "16:45",
        prediction: {
            winner: "Ελένη",
            score: "2-0",
            tiebreak: "Όχι"
        },
        status: "pending" as const,
        pointsEarned: 0,
        streak: null
    },
    {
        id: 3,
        matchTitle: "Νίκος vs Κώστας",
        date: "2024-01-13",
        time: "12:15",
        prediction: {
            winner: "Νίκος",
            score: "2-1",
            tiebreak: "Ναι"
        },
        status: "wrong" as const,
        pointsEarned: 0,
        streak: null
    },
    {
        id: 4,
        matchTitle: "Μαρία vs Άννα",
        date: "2024-01-12",
        time: "18:20",
        prediction: {
            winner: "Μαρία",
            score: "2-0",
            tiebreak: "Όχι"
        },
        status: "correct" as const,
        pointsEarned: 12,
        streak: 2
    },
    {
        id: 5,
        matchTitle: "Δημήτρης vs Πέτρος",
        date: "2024-01-11",
        time: "15:10",
        prediction: {
            winner: "Δημήτρης",
            score: "2-1",
            tiebreak: "Ναι"
        },
        status: "correct" as const,
        pointsEarned: 15,
        streak: 1
    }
];

export default function MyPicksPage() {
    const router = useRouter();
    const params = useParams();
    const lang = params?.lang;
    const { user, signOut, loading } = useAuth();


    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/signin');
        }
    }, [user, loading, router]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Back to Dashboard Button */}
            <div className="max-w-4xl mx-auto px-6 pt-6">
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${lang}/matches`)}
                    className="mb-6 bg-yellow-500 text-white"
                >
                    ← Back to Dashboard
                </Button>
            </div>
            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-6 pb-6">
                {/* Page Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        Οι Προβλέψεις Μου
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Δες το ιστορικό των προβλέψεών σου και τους πόντους που έχεις κερδίσει.
                    </p>
                </div>

                {/* Prediction History */}
                <PredictionHistory predictions={mockPredictions} />
            </div>
        </div>
    );
} 