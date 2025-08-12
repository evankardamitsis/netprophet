'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Category, CategoryFormData } from '@/types';

interface CategoryFormProps {
    category?: Category | null;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
        description: '',
        age_min: '',
        age_max: '',
        skill_level_min: '',
        skill_level_max: '',
        gender: '',
        max_participants: '',
        entry_fee: '0',
        prize_pool: ''
    });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                description: category.description || '',
                age_min: category.age_min?.toString() || '',
                age_max: category.age_max?.toString() || '',
                skill_level_min: category.skill_level_min || '',
                skill_level_max: category.skill_level_max || '',
                gender: category.gender || '',
                max_participants: category.max_participants?.toString() || '',
                entry_fee: category.entry_fee.toString(),
                prize_pool: category.prize_pool?.toString() || ''
            });
        }
    }, [category]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            age_min: formData.age_min ? parseInt(formData.age_min) : null,
            age_max: formData.age_max ? parseInt(formData.age_max) : null,
            skill_level_min: formData.skill_level_min || null,
            skill_level_max: formData.skill_level_max || null,
            gender: formData.gender || null,
            max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
            entry_fee: parseFloat(formData.entry_fee),
            prize_pool: formData.prize_pool ? parseFloat(formData.prize_pool) : null
        };

        onSubmit(submitData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-semibold">Category Name *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter category name"
                        className="h-12 text-base"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="gender" className="text-base font-semibold">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="male" className="text-base py-3">Male</SelectItem>
                            <SelectItem value="female" className="text-base py-3">Female</SelectItem>
                            <SelectItem value="mixed" className="text-base py-3">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="age_min" className="text-base font-semibold">Minimum Age</Label>
                    <Input
                        id="age_min"
                        type="number"
                        value={formData.age_min}
                        onChange={(e) => handleInputChange('age_min', e.target.value)}
                        placeholder="No minimum"
                        min="0"
                        max="100"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="age_max" className="text-base font-semibold">Maximum Age</Label>
                    <Input
                        id="age_max"
                        type="number"
                        value={formData.age_max}
                        onChange={(e) => handleInputChange('age_max', e.target.value)}
                        placeholder="No maximum"
                        min="0"
                        max="100"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="skill_level_min" className="text-base font-semibold">Minimum Skill Level</Label>
                    <Select value={formData.skill_level_min} onValueChange={(value) => handleInputChange('skill_level_min', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select minimum skill" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="beginner" className="text-base py-3">Beginner</SelectItem>
                            <SelectItem value="intermediate" className="text-base py-3">Intermediate</SelectItem>
                            <SelectItem value="advanced" className="text-base py-3">Advanced</SelectItem>
                            <SelectItem value="expert" className="text-base py-3">Expert</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="skill_level_max" className="text-base font-semibold">Maximum Skill Level</Label>
                    <Select value={formData.skill_level_max} onValueChange={(value) => handleInputChange('skill_level_max', value)}>
                        <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select maximum skill" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="beginner" className="text-base py-3">Beginner</SelectItem>
                            <SelectItem value="intermediate" className="text-base py-3">Intermediate</SelectItem>
                            <SelectItem value="advanced" className="text-base py-3">Advanced</SelectItem>
                            <SelectItem value="expert" className="text-base py-3">Expert</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="max_participants" className="text-base font-semibold">Max Participants</Label>
                    <Input
                        id="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => handleInputChange('max_participants', e.target.value)}
                        placeholder="Unlimited"
                        min="1"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="entry_fee" className="text-base font-semibold">Entry Fee ($)</Label>
                    <Input
                        id="entry_fee"
                        type="number"
                        value={formData.entry_fee}
                        onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="prize_pool" className="text-base font-semibold">Prize Pool ($)</Label>
                    <Input
                        id="prize_pool"
                        type="number"
                        value={formData.prize_pool}
                        onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="h-12 text-base"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter category description"
                    rows={4}
                    className="text-base resize-none"
                />
            </div>

            <div className="flex justify-end gap-4 pt-6">
                <Button type="button" variant="outline" onClick={onCancel} className="h-12 px-8 text-base">
                    Cancel
                </Button>
                <Button type="submit" className="h-12 px-8 text-base">
                    {category ? 'Update Category' : 'Create Category'}
                </Button>
            </div>
        </form>
    );
} 