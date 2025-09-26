'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EmailTemplate {
    name: string;
    type: string;
    language: string;
    subject: string;
    html_content: string;
    text_content?: string;
    variables: Record<string, any>;
    is_active: boolean;
    version: number;
}

export default function NewEmailTemplatePage() {
    const router = useRouter();
    const [template, setTemplate] = useState<EmailTemplate>({
        name: '',
        type: '2fa',
        language: 'en',
        subject: '',
        html_content: '',
        text_content: '',
        variables: {},
        is_active: true,
        version: 1
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateTemplate = (updates: Partial<EmailTemplate>) => {
        setTemplate(prev => ({ ...prev, ...updates }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch('/api/email-templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(template),
            });

            if (!response.ok) {
                throw new Error('Failed to create template');
            }

            const createdTemplate = await response.json();
            router.push(`/email-templates/${createdTemplate.id}/edit`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create template');
        } finally {
            setSaving(false);
        }
    };

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
                        <h1 className="text-3xl font-bold">New Email Template</h1>
                        <p className="text-gray-600 mt-2">
                            Create a new email template with variables and multi-language support
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Creating...' : 'Create Template'}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h3 className="text-red-800 font-medium">Error</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
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
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="type">Template Type</Label>
                                    <Select value={template.type} onValueChange={(value) => updateTemplate({ type: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
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
                                    required
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
                                    required
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
            </Tabs>
        </div>
    );
}
