interface Category {
    id: string;
    label: string;
    count: number;
}

interface RewardFiltersProps {
    categories: Category[];
    selectedCategory: string;
    sortBy: 'points' | 'rarity' | 'name';
    onCategoryChange: (category: string) => void;
    onSortChange: (sort: 'points' | 'rarity' | 'name') => void;
}

export function RewardFilters({
    categories,
    selectedCategory,
    sortBy,
    onCategoryChange,
    onSortChange
}: RewardFiltersProps) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedCategory === category.id
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600/50'
                            }`}
                    >
                        {category.label}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${selectedCategory === category.id ? 'bg-white/20' : 'bg-slate-600/50'}`}>
                            {category.count}
                        </span>
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Sort by:</span>
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as any)}
                    className="px-3 py-2 border border-slate-600 bg-slate-800 text-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                    <option value="points">Points (Low to High)</option>
                    <option value="rarity">Rarity</option>
                    <option value="name">Name</option>
                </select>
            </div>
        </div>
    );
}
