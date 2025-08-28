'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface NotificationTemplate {
    id: string;
    type: string;
    language: string;
    title: string;
    message: string;
    created_at: string;
    updated_at: string;
}

export default function NotificationsPage() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        message: ''
    });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('*')
                .order('type, language');

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Failed to load notification templates');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template: NotificationTemplate) => {
        setEditingTemplate(template);
        setEditForm({
            title: template.title,
            message: template.message
        });
    };

    const handleSave = async () => {
        if (!editingTemplate) return;

        try {
            const { error } = await supabase
                .from('notification_templates')
                .update({
                    title: editForm.title,
                    message: editForm.message,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTemplate.id);

            if (error) throw error;

            toast.success('Template updated successfully');
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            console.error('Error updating template:', error);
            toast.error('Failed to update template');
        }
    };

    const handleCancel = () => {
        setEditingTemplate(null);
    };

    const getTemplateTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'match_cancelled': 'Match Cancelled',
            'bet_won': 'Bet Won',
            'bet_lost': 'Bet Lost',
            'bet_resolved': 'Bet Resolved'
        };
        return labels[type] || type;
    };

    const getLanguageLabel = (lang: string) => {
        return lang === 'en' ? 'English' : 'Greek';
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Notification Templates</h1>
                <p className="text-gray-600 mt-2">
                    Manage notification messages for different events. Use placeholders like {'{player_a}'} and {'{player_b}'} for dynamic content.
                </p>
            </div>

            <div className="grid gap-6">
                {templates.map((template) => (
                    <Card key={template.id}>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <div>
                                    {getTemplateTypeLabel(template.type)} - {getLanguageLabel(template.language)}
                                </div>
                                {editingTemplate?.id === template.id ? (
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSave}>
                                            Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleCancel}>
                                            Cancel
                                        </Button>
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={() => handleEdit(template)}>
                                        Edit
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {editingTemplate?.id === template.id ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Title</label>
                                        <Input
                                            value={editForm.title}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="Notification title"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Message</label>
                                        <Textarea
                                            value={editForm.message}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, message: e.target.value }))}
                                            placeholder="Notification message (use {player_a} and {player_b} for placeholders)"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div>
                                        <span className="font-medium">Title:</span>
                                        <div className="text-gray-700">{template.title}</div>
                                    </div>
                                    <div>
                                        <span className="font-medium">Message:</span>
                                        <div className="text-gray-700">{template.message}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
