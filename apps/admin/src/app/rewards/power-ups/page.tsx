'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Zap, Coins, Star, AlertTriangle, Shield, Target, Flame, Euro } from 'lucide-react';

interface PowerUp {
    id: string;
    power_up_id: string;
    name: string;
    cost: number;
    effect: string;
    usage_type: string;
    icon: string;
    description: string;
    gradient: string;
    glow_color: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function PowerUpsPage() {
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPowerUp, setEditingPowerUp] = useState<PowerUp | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [processingPowerUp, setProcessingPowerUp] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'delete' | 'toggle' | null;
        powerUp: PowerUp | null;
        action: (() => void) | null;
    }>({
        isOpen: false,
        type: null,
        powerUp: null,
        action: null
    });

    // Load power-ups from database
    const loadPowerUps = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('power_ups')
                .select('*')
                .order('cost', { ascending: true });

            if (error) throw error;
            setPowerUps(data || []);
        } catch (error) {
            console.error('Error loading power-ups:', error);
            toast.error('Failed to load power-ups');
        } finally {
            setLoading(false);
        }
    };

    // Save power-up
    const savePowerUp = async (powerUp: Partial<PowerUp>) => {
        try {
            if (editingPowerUp) {
                const { error } = await supabase
                    .from('power_ups')
                    .update(powerUp)
                    .eq('id', editingPowerUp.id);

                if (error) throw error;
                toast.success('Power-up updated successfully');
            } else {
                const { error } = await supabase
                    .from('power_ups')
                    .insert([powerUp]);

                if (error) throw error;
                toast.success('Power-up created successfully');
            }

            setEditingPowerUp(null);
            setShowAddForm(false);
            loadPowerUps();
        } catch (error) {
            console.error('Error saving power-up:', error);
            toast.error('Failed to save power-up');
        }
    };

    // Toggle power-up status
    const togglePowerUpStatus = (powerUp: PowerUp) => {
        setConfirmDialog({
            isOpen: true,
            type: 'toggle',
            powerUp,
            action: async () => {
                try {
                    setProcessingPowerUp(powerUp.id);
                    const { error } = await supabase
                        .from('power_ups')
                        .update({ is_active: !powerUp.is_active })
                        .eq('id', powerUp.id);

                    if (error) throw error;
                    toast.success(`Power-up ${powerUp.is_active ? 'deactivated' : 'activated'} successfully`);
                    loadPowerUps();
                } catch (error) {
                    console.error('Error toggling power-up status:', error);
                    toast.error('Failed to update power-up status');
                } finally {
                    setProcessingPowerUp(null);
                    setConfirmDialog({ isOpen: false, type: null, powerUp: null, action: null });
                }
            }
        });
    };

    // Delete power-up
    const deletePowerUp = (powerUp: PowerUp) => {
        setConfirmDialog({
            isOpen: true,
            type: 'delete',
            powerUp,
            action: async () => {
                try {
                    setProcessingPowerUp(powerUp.id);
                    const { error } = await supabase
                        .from('power_ups')
                        .delete()
                        .eq('id', powerUp.id);

                    if (error) throw error;
                    toast.success('Power-up deleted successfully');
                    loadPowerUps();
                } catch (error) {
                    console.error('Error deleting power-up:', error);
                    toast.error('Failed to delete power-up');
                } finally {
                    setProcessingPowerUp(null);
                    setConfirmDialog({ isOpen: false, type: null, powerUp: null, action: null });
                }
            }
        });
    };

    useEffect(() => {
        loadPowerUps();
    }, []);

    const getIconComponent = (icon: string) => {
        const iconMap: { [key: string]: any } = {
            '🛡': Shield,
            '🔥': Flame,
            '🎯': Target,
            '⚡': Zap
        };
        return iconMap[icon] || Zap;
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Power-ups Management</h1>
                    <p className="text-gray-600 mt-2">
                        Manage power-ups that players can purchase and use in the game.
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Power-up
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Power-ups</p>
                                <p className="text-2xl font-bold text-gray-900">{powerUps.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {powerUps.filter(p => p.is_active).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Inactive</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {powerUps.filter(p => !p.is_active).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Coins className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Avg Cost</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {powerUps.length > 0
                                        ? Math.round(powerUps.reduce((sum, p) => sum + p.cost, 0) / powerUps.length)
                                        : 0
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Power-ups List */}
            <Card>
                <CardHeader>
                    <CardTitle>Power-ups</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600 mt-2">Loading power-ups...</p>
                        </div>
                    ) : powerUps.length === 0 ? (
                        <div className="text-center py-8">
                            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">No power-ups found</p>
                            <Button
                                onClick={() => setShowAddForm(true)}
                                className="mt-4 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add First Power-up
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {powerUps.map((powerUp) => {
                                const IconComponent = getIconComponent(powerUp.icon);
                                return (
                                    <div
                                        key={powerUp.id}
                                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${powerUp.is_active
                                            ? 'border-gray-200 hover:bg-gray-50'
                                            : 'border-red-200 bg-red-50 hover:bg-red-100'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`p-3 rounded-lg ${powerUp.is_active ? powerUp.gradient.replace('from-', 'bg-gradient-to-r from-') : 'bg-gray-400'} ${powerUp.is_active ? powerUp.glow_color : ''}`}>
                                                <IconComponent className={`h-6 w-6 ${powerUp.is_active ? 'text-white' : 'text-gray-600'}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <h3 className={`font-semibold ${powerUp.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{powerUp.name}</h3>
                                                    <Badge variant={powerUp.is_active ? "default" : "destructive"}>
                                                        {powerUp.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <p className={`text-sm ${powerUp.is_active ? 'text-gray-600' : 'text-gray-500'}`}>{powerUp.description}</p>
                                                <div className="flex items-center space-x-4 mt-1">
                                                    <span className="text-sm text-gray-500">
                                                        <Coins className="h-3 w-3 inline mr-1" />
                                                        {powerUp.cost}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        <Target className="h-3 w-3 inline mr-1" />
                                                        {powerUp.usage_type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEditingPowerUp(powerUp)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => togglePowerUpStatus(powerUp)}
                                                disabled={processingPowerUp === powerUp.id}
                                            >
                                                {powerUp.is_active ? "Deactivate" : "Activate"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deletePowerUp(powerUp)}
                                                disabled={processingPowerUp === powerUp.id}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Form Dialog */}
            <Dialog open={showAddForm || !!editingPowerUp} onOpenChange={() => {
                setShowAddForm(false);
                setEditingPowerUp(null);
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPowerUp ? 'Edit Power-up' : 'Add New Power-up'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingPowerUp ? 'Update power-up details' : 'Create a new power-up for players to purchase'}
                        </DialogDescription>
                    </DialogHeader>
                    <PowerUpForm
                        powerUp={editingPowerUp}
                        onSave={savePowerUp}
                        onCancel={() => {
                            setShowAddForm(false);
                            setEditingPowerUp(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.isOpen} onOpenChange={() => setConfirmDialog({ isOpen: false, type: null, powerUp: null, action: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmDialog.type === 'delete' ? 'Delete Power-up' : 'Toggle Power-up Status'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmDialog.type === 'delete'
                                ? `Are you sure you want to delete "${confirmDialog.powerUp?.name}"? This action cannot be undone.`
                                : `Are you sure you want to ${confirmDialog.powerUp?.is_active ? 'deactivate' : 'activate'} "${confirmDialog.powerUp?.name}"?`
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialog({ isOpen: false, type: null, powerUp: null, action: null })}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmDialog.action || (() => { })}
                            variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
                        >
                            {confirmDialog.type === 'delete' ? 'Delete' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface PowerUpFormProps {
    powerUp?: PowerUp | null;
    onSave: (powerUp: Partial<PowerUp>) => void;
    onCancel: () => void;
}

function PowerUpForm({ powerUp, onSave, onCancel }: PowerUpFormProps) {
    const [formData, setFormData] = useState({
        power_up_id: powerUp?.power_up_id || '',
        name: powerUp?.name || '',
        cost: powerUp?.cost || 0,
        effect: powerUp?.effect || '',
        usage_type: powerUp?.usage_type || '',
        icon: powerUp?.icon || '⚡',
        description: powerUp?.description || '',
        gradient: powerUp?.gradient || 'from-blue-500 to-purple-600',
        glow_color: powerUp?.glow_color || 'shadow-blue-500/25',
        is_active: powerUp?.is_active ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="power_up_id">Power-up ID</Label>
                    <Input
                        id="power_up_id"
                        value={formData.power_up_id}
                        onChange={(e) => setFormData({ ...formData, power_up_id: e.target.value })}
                        placeholder="e.g., safeParlay"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Safe Parlay Slip"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="cost">Cost (coins)</Label>
                    <Input
                        id="cost"
                        type="number"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                        min="0"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="usage_type">Usage Type</Label>
                    <Select value={formData.usage_type} onValueChange={(value) => setFormData({ ...formData, usage_type: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select usage type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Once per slip">Once per slip</SelectItem>
                            <SelectItem value="Once per match">Once per match</SelectItem>
                            <SelectItem value="Time-based">Time-based</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label htmlFor="effect">Effect</Label>
                <Input
                    id="effect"
                    value={formData.effect}
                    onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
                    placeholder="e.g., Survive 1 wrong pick in a parlay slip"
                    required
                />
            </div>

            <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the power-up"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="🛡">🛡 Shield</SelectItem>
                            <SelectItem value="🔥">🔥 Flame</SelectItem>
                            <SelectItem value="🎯">🎯 Target</SelectItem>
                            <SelectItem value="⚡">⚡ Zap</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="gradient">Gradient</Label>
                    <Select value={formData.gradient} onValueChange={(value) => setFormData({ ...formData, gradient: value })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select gradient" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="from-blue-500 to-purple-600">Blue to Purple</SelectItem>
                            <SelectItem value="from-green-500 to-emerald-600">Green to Emerald</SelectItem>
                            <SelectItem value="from-orange-500 to-red-600">Orange to Red</SelectItem>
                            <SelectItem value="from-purple-500 to-pink-600">Purple to Pink</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label htmlFor="glow_color">Glow Color</Label>
                <Input
                    id="glow_color"
                    value={formData.glow_color}
                    onChange={(e) => setFormData({ ...formData, glow_color: e.target.value })}
                    placeholder="e.g., shadow-blue-500/25"
                    required
                />
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {powerUp ? 'Update' : 'Create'} Power-up
                </Button>
            </DialogFooter>
        </form>
    );
}
