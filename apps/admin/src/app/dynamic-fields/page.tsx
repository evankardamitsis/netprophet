'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@netprophet/lib';
import { toast } from 'sonner';
import { Edit, Save, X, Plus, FileText } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

interface DynamicContent {
    id: string;
    key: string;
    component: string;
    language: 'en' | 'el';
    content: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function DynamicFieldsPage() {
    const [contents, setContents] = useState<DynamicContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<DynamicContent>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newForm, setNewForm] = useState({
        key: '',
        component: '',
        language: 'en' as 'en' | 'el',
        content: '',
        description: '',
        is_active: true
    });
    const [filterComponent, setFilterComponent] = useState<string>('all');
    const [filterLanguage, setFilterLanguage] = useState<string>('all');

    useEffect(() => {
        fetchContents();
    }, []);

    const fetchContents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('dynamic_content')
                .select('*')
                .order('component', { ascending: true })
                .order('key', { ascending: true })
                .order('language', { ascending: true });

            if (error) throw error;
            setContents(data || []);
        } catch (error) {
            console.error('Error fetching dynamic content:', error);
            toast.error('Failed to load dynamic content');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (content: DynamicContent) => {
        setEditingId(content.id);
        setEditForm({
            key: content.key,
            component: content.component,
            language: content.language,
            content: content.content,
            description: content.description || '',
            is_active: content.is_active
        });
    };

    const handleSave = async (id: string) => {
        try {
            const { error } = await supabase
                .from('dynamic_content')
                .update({
                    key: editForm.key,
                    component: editForm.component,
                    language: editForm.language,
                    content: editForm.content,
                    description: editForm.description || null,
                    is_active: editForm.is_active
                })
                .eq('id', id);

            if (error) throw error;
            toast.success('Content updated successfully');
            setEditingId(null);
            fetchContents();
        } catch (error) {
            console.error('Error updating content:', error);
            toast.error('Failed to update content');
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleAdd = async () => {
        try {
            const { error } = await supabase
                .from('dynamic_content')
                .insert([{
                    key: newForm.key,
                    component: newForm.component,
                    language: newForm.language,
                    content: newForm.content,
                    description: newForm.description || null,
                    is_active: newForm.is_active
                }]);

            if (error) throw error;
            toast.success('Content added successfully');
            setShowAddForm(false);
            setNewForm({
                key: '',
                component: '',
                language: 'en',
                content: '',
                description: '',
                is_active: true
            });
            fetchContents();
        } catch (error) {
            console.error('Error adding content:', error);
            toast.error('Failed to add content');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this content?')) return;

        try {
            const { error } = await supabase
                .from('dynamic_content')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Content deleted successfully');
            fetchContents();
        } catch (error) {
            console.error('Error deleting content:', error);
            toast.error('Failed to delete content');
        }
    };

    const filteredContents = contents.filter(content => {
        if (filterComponent !== 'all' && content.component !== filterComponent) return false;
        if (filterLanguage !== 'all' && content.language !== filterLanguage) return false;
        return true;
    });

    const uniqueComponents = Array.from(new Set(contents.map(c => c.component)));

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dynamic Fields</h1>
                    <p className="text-gray-600 mt-2">Manage app content and copies</p>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center py-8">Loading...</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dynamic Fields</h1>
                    <p className="text-gray-600 mt-2">
                        Manage dynamic content and copies used throughout the app
                    </p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                </Button>
            </div>

            {/* Add New Form */}
            {showAddForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Dynamic Content</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Key</Label>
                                <Input
                                    value={newForm.key}
                                    onChange={(e) => setNewForm({ ...newForm, key: e.target.value })}
                                    placeholder="e.g., info_bar_message"
                                />
                            </div>
                            <div>
                                <Label>Component</Label>
                                <Input
                                    value={newForm.component}
                                    onChange={(e) => setNewForm({ ...newForm, component: e.target.value })}
                                    placeholder="e.g., InfoBar"
                                />
                            </div>
                            <div>
                                <Label>Language</Label>
                                <Select
                                    value={newForm.language}
                                    onValueChange={(value: 'en' | 'el') => setNewForm({ ...newForm, language: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="el">Greek</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={newForm.is_active}
                                    onCheckedChange={(checked) => setNewForm({ ...newForm, is_active: checked })}
                                />
                                <Label>Active</Label>
                            </div>
                        </div>
                        <div>
                            <Label>Content</Label>
                            <RichTextEditor
                                value={newForm.content}
                                onChange={(value) => setNewForm({ ...newForm, content: value })}
                                placeholder="Enter the content/copy text"
                            />
                        </div>
                        <div>
                            <Label>Description (optional)</Label>
                            <Input
                                value={newForm.description}
                                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                placeholder="Description of where this content is used"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAdd}>Save</Button>
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <Label>Filter by Component</Label>
                            <Select value={filterComponent} onValueChange={setFilterComponent}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Components</SelectItem>
                                    {uniqueComponents.map(comp => (
                                        <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <Label>Filter by Language</Label>
                            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Languages</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="el">Greek</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Content List */}
                    <div className="space-y-4">
                        {filteredContents.map((content) => (
                            <Card key={content.id}>
                                <CardContent className="pt-6">
                                    {editingId === content.id ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Key</Label>
                                                    <Input
                                                        value={editForm.key || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Component</Label>
                                                    <Input
                                                        value={editForm.component || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, component: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Language</Label>
                                                    <Select
                                                        value={editForm.language || 'en'}
                                                        onValueChange={(value: 'en' | 'el') => setEditForm({ ...editForm, language: value })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="en">English</SelectItem>
                                                            <SelectItem value="el">Greek</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        checked={editForm.is_active ?? true}
                                                        onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                                                    />
                                                    <Label>Active</Label>
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Content</Label>
                                                <RichTextEditor
                                                    value={editForm.content || ''}
                                                    onChange={(value) => setEditForm({ ...editForm, content: value })}
                                                    placeholder="Enter the content/copy text"
                                                />
                                            </div>
                                            <div>
                                                <Label>Description</Label>
                                                <Input
                                                    value={editForm.description || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => handleSave(content.id)}>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save
                                                </Button>
                                                <Button variant="outline" onClick={handleCancel}>
                                                    <X className="h-4 w-4 mr-2" />
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant="outline">{content.component}</Badge>
                                                        <Badge variant={content.language === 'en' ? 'default' : 'secondary'}>
                                                            {content.language.toUpperCase()}
                                                        </Badge>
                                                        {!content.is_active && (
                                                            <Badge variant="destructive">Inactive</Badge>
                                                        )}
                                                        <span className="text-sm font-mono text-gray-500">{content.key}</span>
                                                    </div>
                                                    <p className="text-lg font-medium text-gray-900">{content.content}</p>
                                                    {content.description && (
                                                        <p className="text-sm text-gray-500 mt-1">{content.description}</p>
                                                    )}
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        Updated: {new Date(content.updated_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(content)}
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(content.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                        {filteredContents.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No content found. {showAddForm ? '' : 'Click "Add New" to create content.'}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
