export const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'upcoming': return 'bg-blue-100 text-blue-800';
        case 'finished': return 'bg-gray-100 text-gray-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        case 'live': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getSurfaceColor = (surface: string) => {
    switch (surface) {
        case 'Clay Court': return 'bg-orange-100 text-orange-800';
        case 'Grass Court': return 'bg-green-100 text-green-800';
        case 'Hard Court': return 'bg-blue-100 text-blue-800';
        case 'Indoor': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getGenderColor = (gender: string | null) => {
    switch (gender) {
        case 'male': return 'bg-blue-100 text-blue-800';
        case 'female': return 'bg-pink-100 text-pink-800';
        case 'mixed': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const formatTime = (timeString: string | null) => {
    if (!timeString) return 'TBD';
    const date = new Date(timeString);
    return date.toISOString().slice(0, 16).replace('T', ' ');
}; 