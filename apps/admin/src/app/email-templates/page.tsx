'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Eye, Trash2, Copy } from 'lucide-react';
import Link from 'next/link';

interface EmailTemplate {
    id: string;
    name: string;
    type: string;
    language: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables: Record<string, any>;
    is_active: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/email-templates');
            if (!response.ok) {
                throw new Error('Failed to fetch templates');
            }
            const data = await response.json();
            setTemplates(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            const response = await fetch(`/api/email-templates/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete template');
            }

            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete template');
        }
    };

    const handleDuplicateTemplate = async (template: EmailTemplate) => {
        try {
            const newTemplate = {
                name: `${template.name} (Copy)`,
                type: template.type,
                language: template.language,
                subject: template.subject,
                html_content: template.html_content,
                text_content: template.text_content,
                variables: template.variables,
                is_active: template.is_active,
                version: 1,
            };

            const response = await fetch('/api/email-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTemplate),
            });

            if (!response.ok) {
                throw new Error('Failed to duplicate template');
            }

            const createdTemplate = await response.json();
            setTemplates([...templates, createdTemplate]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to duplicate template');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case '2fa': return 'bg-blue-100 text-blue-800';
            case 'promotional': return 'bg-green-100 text-green-800';
            case 'winnings': return 'bg-yellow-100 text-yellow-800';
            case 'admin': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getLanguageFlag = (language: string) => {
        switch (language) {
            case 'en': return '🇺🇸';
            case 'el': return '🇬🇷';
            default: return '🌐';
        }
    };

    const groupedTemplates = templates.reduce((acc, template) => {
        const key = `${template.type}-${template.language}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(template);
        return acc;
    }, {} as Record<string, EmailTemplate[]>);

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading templates...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-medium">Error</h3>
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchTemplates} className="mt-2">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Email Templates</h1>
                    <p className="text-gray-600 mt-2">
                        Manage your email templates with variables and multi-language support
                    </p>
                </div>
                <Link href="/email-templates/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Template
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="all">All Templates ({templates.length})</TabsTrigger>
                    <TabsTrigger value="promotional">Promotional ({templates.filter(t => t.type === 'promotional').length})</TabsTrigger>
                    <TabsTrigger value="winnings">Winnings ({templates.filter(t => t.type === 'winnings').length})</TabsTrigger>
                    <TabsTrigger value="admin">Admin ({templates.filter(t => t.type === 'admin').length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {templates.map((template) => (
                            <Card key={template.id} className="group hover:shadow-lg transition-all duration-200">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{getLanguageFlag(template.language)}</span>
                                            <Badge className={getTypeColor(template.type)}>
                                                {template.type}
                                            </Badge>
                                        </div>
                                    </div>
                                    {!template.is_active && (
                                        <Badge variant="secondary" className="w-fit">Inactive</Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                        {template.subject}
                                    </p>

                                    <div className="text-xs text-gray-500 mb-4">
                                        Version {template.version} • Updated {new Date(template.updated_at).toLocaleDateString()}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/email-templates/${template.id}`}>
                                            <Button size="sm" variant="outline" className="flex-1">
                                                <Eye className="w-3 h-3 mr-1" />
                                                View
                                            </Button>
                                        </Link>
                                        <Link href={`/email-templates/${template.id}/edit`}>
                                            <Button size="sm" variant="outline" className="flex-1">
                                                <Edit className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDuplicateTemplate(template)}
                                            className="flex-1"
                                        >
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteTemplate(template.id)}
                                            className="text-red-600 hover:text-red-700 flex-1"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {['2fa', 'promotional', 'winnings', 'admin'].map((type) => (
                    <TabsContent key={type} value={type} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {templates
                                .filter(template => template.type === type)
                                .map((template) => (
                                    <Card key={template.id} className="group hover:shadow-lg transition-all duration-200">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{getLanguageFlag(template.language)}</span>
                                                    <Badge className={getTypeColor(template.type)}>
                                                        {template.type}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {!template.is_active && (
                                                <Badge variant="secondary" className="w-fit">Inactive</Badge>
                                            )}
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                                                {template.subject}
                                            </p>

                                            <div className="text-xs text-gray-500 mb-4">
                                                Version {template.version} • Updated {new Date(template.updated_at).toLocaleDateString()}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Link href={`/email-templates/${template.id}`}>
                                                    <Button size="sm" variant="outline" className="flex-1">
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        View
                                                    </Button>
                                                </Link>
                                                <Link href={`/email-templates/${template.id}/edit`}>
                                                    <Button size="sm" variant="outline" className="flex-1">
                                                        <Edit className="w-3 h-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDuplicateTemplate(template)}
                                                    className="flex-1"
                                                >
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Copy
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="text-red-600 hover:text-red-700 flex-1"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
