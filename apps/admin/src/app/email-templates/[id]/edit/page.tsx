'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Code, Variable, ArrowLeft } from 'lucide-react';
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

interface EmailTemplateVariable {
    id: string;
    template_id: string;
    variable_name: string;
    display_name: string;
    description?: string;
    variable_type: string;
    is_required: boolean;
    default_value?: string;
    validation_rules: Record<string, any>;
}

export default function EditEmailTemplatePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [variables, setVariables] = useState<EmailTemplateVariable[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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

            // Initialize preview data with template variables
            setPreviewData(data.variables || {});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!template) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/email-templates/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(template),
            });

            if (!response.ok) {
                throw new Error('Failed to save template');
            }

            router.push('/email-templates');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const updateTemplate = (updates: Partial<EmailTemplate>) => {
        setTemplate(prev => prev ? { ...prev, ...updates } : null);
    };

    const addVariable = () => {
        const newVariable = {
            variable_name: '',
            display_name: '',
            description: '',
            variable_type: 'text',
            is_required: false,
            default_value: '',
            validation_rules: {}
        };

        // This would typically be handled by the variables API
        console.log('Add variable:', newVariable);
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
                    <Label>Subject Preview</Label>
                    <Input value={previewSubject} readOnly className="font-mono" />
                </div>
                <div>
                    <Label>HTML Preview</Label>
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
                        <h1 className="text-3xl font-bold">Edit Email Template</h1>
                        <p className="text-gray-600 mt-2">
                            Edit template: {template.name}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Template'}
                </Button>
            </div>

            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Template Name</Label>
                                    <Input
                                        id="name"
                                        value={template.name}
                                        onChange={(e) => updateTemplate({ name: e.target.value })}
                                        placeholder="Enter template name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="type">Template Type</Label>
                                    <Select value={template.type} onValueChange={(value) => updateTemplate({ type: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2fa">2FA Verification</SelectItem>
                                            <SelectItem value="promotional">Promotional</SelectItem>
                                            <SelectItem value="winnings">Winnings</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="language">Language</Label>
                                    <Select value={template.language} onValueChange={(value) => updateTemplate({ language: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en">English 🇺🇸</SelectItem>
                                            <SelectItem value="el">Greek 🇬🇷</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="version">Version</Label>
                                    <Input
                                        id="version"
                                        type="number"
                                        value={template.version}
                                        onChange={(e) => updateTemplate({ version: parseInt(e.target.value) })}
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={template.is_active}
                                    onCheckedChange={(checked) => updateTemplate({ is_active: checked })}
                                />
                                <Label htmlFor="is_active">Template is active</Label>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="content" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Email Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="subject">Subject Line</Label>
                                <Input
                                    id="subject"
                                    value={template.subject}
                                    onChange={(e) => updateTemplate({ subject: e.target.value })}
                                    placeholder="Enter email subject"
                                />
                            </div>
                            <div>
                                <Label htmlFor="html_content">HTML Content</Label>
                                <Textarea
                                    id="html_content"
                                    value={template.html_content}
                                    onChange={(e) => updateTemplate({ html_content: e.target.value })}
                                    placeholder="Enter HTML content"
                                    className="min-h-96 font-mono"
                                />
                            </div>
                            <div>
                                <Label htmlFor="text_content">Text Content (Optional)</Label>
                                <Textarea
                                    id="text_content"
                                    value={template.text_content || ''}
                                    onChange={(e) => updateTemplate({ text_content: e.target.value })}
                                    placeholder="Enter plain text content"
                                    className="min-h-32"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="variables" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Template Variables
                <Button onClick={addVariable} size="sm">
                  <Variable className="w-4 h-4 mr-2" />
                  Add Variable
                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {Object.keys(template.variables || {}).map((variableName) => (
                                    <div key={variableName} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{variableName}</Badge>
                                                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                                    {`{{${variableName}}}`}
                                                </code>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label>Default Value</Label>
                                                <Input
                                                    value={template.variables[variableName] || ''}
                                                    onChange={(e) => {
                                                        const newVariables = { ...template.variables };
                                                        newVariables[variableName] = e.target.value;
                                                        updateTemplate({ variables: newVariables });
                                                        setPreviewData({ ...previewData, [variableName]: e.target.value });
                                                    }}
                                                    placeholder="Enter default value"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(template.variables || {}).length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No variables defined for this template.
                                        <br />
                                        <Button onClick={addVariable} className="mt-2" variant="outline">
                                            Add your first variable
                                        </Button>
                                    </div>
                                )}
                            </div>
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
