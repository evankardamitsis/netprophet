'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, Tag, MoreHorizontal } from 'lucide-react';
import { Category } from '@/types';

interface TournamentCategoriesProps {
    categories: Category[];
    onAddCategory: () => void;
    onEditCategory: (category: Category) => void;
    onDeleteCategory: (id: string) => void;
    getGenderColor: (gender: string | null) => string;
}

export function TournamentCategories({
    categories,
    onAddCategory,
    onEditCategory,
    onDeleteCategory,
    getGenderColor
}: TournamentCategoriesProps) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tournament Categories</h2>
                <p className="text-gray-600">Manage categories for this tournament</p>
            </div>
            <Button
                onClick={onAddCategory}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
                <Plus className="h-4 w-4" />
                Add Category
            </Button>
            {categories.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {categories.map((category) => (
                        <Card key={category.id} className="group hover:shadow-xl transition-all duration-200 border-0 shadow-md">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors truncate">
                                            {category.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={`${getGenderColor(category.gender)} text-xs font-medium px-2 py-1`}>
                                                {category.gender || 'Mixed'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs font-medium px-2 py-1">
                                                {category.skill_level_min} - {category.skill_level_max}
                                            </Badge>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEditCategory(category)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Category
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDeleteCategory(category.id)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Category
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-4">
                                    <div className="text-sm text-gray-700 font-medium">
                                        Age Range: {category.age_min || 'N/A'} - {category.age_max || 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-700 font-medium">
                                        Entry Fee: ${category.entry_fee}
                                    </div>
                                    <div className="text-sm text-gray-700 font-medium">
                                        Prize Pool: ${category.prize_pool || 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-700 font-medium">
                                        Current Participants: {category.current_participants} / {category.max_participants || 'Unlimited'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-0 shadow-lg">
                    <CardContent className="p-12 text-center">
                        <Tag className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-medium text-gray-900 mb-3">No categories found</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Add categories to this tournament to get started. Categories help organize matches by skill level and gender.
                        </p>
                        <Button
                            onClick={onAddCategory}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Add First Category
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 