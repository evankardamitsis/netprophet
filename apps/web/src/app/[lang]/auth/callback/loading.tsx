export default function AuthCallbackLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121A39' }}>
            {/* Decorative circles */}
            <div className="absolute top-20 left-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute top-40 right-20 w-48 h-48 bg-pink-400 rounded-full opacity-15 blur-3xl"></div>
            <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>

            <div className="text-center relative z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
                <p className="text-white">Completing authentication...</p>
            </div>
        </div>
    );
} 