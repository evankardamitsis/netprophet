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
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>
                    {category ? 'Edit Category' : 'Create New Category'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Category Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter category name"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Gender</Label>
                            <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="age_min">Minimum Age</Label>
                            <Input
                                id="age_min"
                                type="number"
                                value={formData.age_min}
                                onChange={(e) => handleInputChange('age_min', e.target.value)}
                                placeholder="No minimum"
                                min="0"
                                max="100"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="age_max">Maximum Age</Label>
                            <Input
                                id="age_max"
                                type="number"
                                value={formData.age_max}
                                onChange={(e) => handleInputChange('age_max', e.target.value)}
                                placeholder="No maximum"
                                min="0"
                                max="100"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="skill_level_min">Minimum Skill Level</Label>
                            <Select value={formData.skill_level_min} onValueChange={(value) => handleInputChange('skill_level_min', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select minimum skill" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                    <SelectItem value="expert">Expert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="skill_level_max">Maximum Skill Level</Label>
                            <Select value={formData.skill_level_max} onValueChange={(value) => handleInputChange('skill_level_max', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select maximum skill" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="beginner">Beginner</SelectItem>
                                    <SelectItem value="intermediate">Intermediate</SelectItem>
                                    <SelectItem value="advanced">Advanced</SelectItem>
                                    <SelectItem value="expert">Expert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_participants">Max Participants</Label>
                            <Input
                                id="max_participants"
                                type="number"
                                value={formData.max_participants}
                                onChange={(e) => handleInputChange('max_participants', e.target.value)}
                                placeholder="Unlimited"
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="entry_fee">Entry Fee ($)</Label>
                            <Input
                                id="entry_fee"
                                type="number"
                                value={formData.entry_fee}
                                onChange={(e) => handleInputChange('entry_fee', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prize_pool">Prize Pool ($)</Label>
                            <Input
                                id="prize_pool"
                                type="number"
                                value={formData.prize_pool}
                                onChange={(e) => handleInputChange('prize_pool', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Enter category description"
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {category ? 'Update Category' : 'Create Category'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
} 