'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, ArrowLeft, Eye, Copy, Trash2 } from 'lucide-react';
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

export default function ViewEmailTemplatePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchTemplate();
    }, [params.id]);

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/email-templates/${params.id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch template');
            }
            const data = await response.json();
            setTemplate(data);
            setPreviewData(data.variables || {});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            const response = await fetch(`/api/email-templates/${params.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete template');
            }

            router.push('/email-templates');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete template');
        }
    };

    const handleDuplicate = async () => {
        if (!template) return;

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
            router.push(`/email-templates/${createdTemplate.id}`);
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

    const renderPreview = () => {
        if (!template) return null;

        let previewHtml = template.html_content;
        let previewSubject = template.subject;

        // Replace variables with preview data
        Object.keys(previewData).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = previewData[key] || `[${key}]`;
            previewHtml = previewHtml.replace(new RegExp(placeholder, 'g'), value);
            previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
        });

        return (
            <div className="space-y-4">
                <div>
                    <h4 className="font-medium mb-2">Subject Preview</h4>
                    <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm">
                        {previewSubject}
                    </div>
                </div>
                <div>
                    <h4 className="font-medium mb-2">HTML Preview</h4>
                    <div
                        className="border rounded-lg p-4 bg-white max-h-96 overflow-auto"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-lg">Loading template...</div>
                </div>
            </div>
        );
    }

    if (error || !template) {
        return (
            <div className="container mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-red-800 font-medium">Error</h3>
                    <p className="text-red-600">{error || 'Template not found'}</p>
                    <Link href="/email-templates">
                        <Button className="mt-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Templates
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/email-templates">
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{template.name}</h1>
                            <Badge className={getTypeColor(template.type)}>
                                {template.type}
                            </Badge>
                            <span className="text-lg">{getLanguageFlag(template.language)}</span>
                            {!template.is_active && (
                                <Badge variant="secondary">Inactive</Badge>
                            )}
                        </div>
                        <p className="text-gray-600">
                            Version {template.version} • Updated {new Date(template.updated_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/email-templates/${template.id}/edit`}>
                        <Button>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={handleDuplicate}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                    </Button>
                    <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Template Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                                    <p className="text-gray-900">{template.name}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Type</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={getTypeColor(template.type)}>
                                            {template.type}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Language</Label>
                                    <p className="text-gray-900 flex items-center gap-2">
                                        {getLanguageFlag(template.language)} {template.language.toUpperCase()}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Version</Label>
                                    <p className="text-gray-900">{template.version}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={template.is_active ? "default" : "secondary"}>
                                            {template.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Timestamps</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Created</Label>
                                    <p className="text-gray-900">{new Date(template.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                                    <p className="text-gray-900">{new Date(template.updated_at).toLocaleString()}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">Subject Line</Label>
                                <div className="p-3 bg-gray-50 rounded-lg font-mono text-sm">
                                    {template.subject}
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">HTML Content</Label>
                                <div className="p-3 bg-gray-50 rounded-lg max-h-96 overflow-auto">
                                    <pre className="text-xs whitespace-pre-wrap font-mono">
                                        {template.html_content}
                                    </pre>
                                </div>
                            </div>
                            {template.text_content && (
                                <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Text Content</Label>
                                    <div className="p-3 bg-gray-50 rounded-lg max-h-32 overflow-auto">
                                        <pre className="text-xs whitespace-pre-wrap font-mono">
                                            {template.text_content}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="variables" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template Variables</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {Object.keys(template.variables || {}).length > 0 ? (
                                <div className="space-y-4">
                                    {Object.entries(template.variables || {}).map(([key, value]) => (
                                        <div key={key} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">{key}</Badge>
                                                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                                        {`{{${key}}}`}
                                                    </code>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium text-gray-700">Default Value</Label>
                                                <p className="text-gray-900 mt-1">{String(value || 'Not set')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No variables defined for this template.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preview" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Live Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderPreview()}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
