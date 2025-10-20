'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@netprophet/lib';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Eye, Coins, Euro, Star, AlertTriangle } from 'lucide-react';

interface CoinPack {
    id: string;
    name: string;
    price_euro: number;
    base_coins: number;
    bonus_coins: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}



export default function RewardsPage() {
    const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPack, setEditingPack] = useState<CoinPack | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [processingPack, setProcessingPack] = useState<string | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'delete' | 'toggle' | null;
        pack: CoinPack | null;
        action: (() => void) | null;
    }>({
        isOpen: false,
        type: null,
        pack: null,
        action: null
    });


    // Load coin packs from database
    const loadCoinPacks = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('coin_packs')
                .select('*')
                .order('price_euro', { ascending: true });

            if (error) {
                throw error;
            }

            setCoinPacks(data || []);
        } catch (error) {
            console.error('Error loading coin packs:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Failed to load coin packs: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Save coin pack
    const saveCoinPack = async (pack: Partial<CoinPack>) => {
        try {
            if (editingPack) {
                const { error } = await supabase
                    .from('coin_packs')
                    .update(pack)
                    .eq('id', editingPack.id);

                if (error) throw error;
                toast.success('Coin pack updated successfully');
            } else {
                const { error } = await supabase
                    .from('coin_packs')
                    .insert([pack]);

                if (error) throw error;
                toast.success('Coin pack created successfully');
            }

            setEditingPack(null);
            setShowAddForm(false);

            // Reload coin packs to reflect changes
            await loadCoinPacks();
        } catch (error) {
            console.error('Error saving coin pack:', error);
            toast.error('Failed to save coin pack');
        }
    };

    // Toggle pack status
    const togglePackStatus = (pack: CoinPack) => {
        setConfirmDialog({
            isOpen: true,
            type: 'toggle',
            pack,
            action: async () => {
                const action = pack.is_active ? 'deactivate' : 'activate';
                setProcessingPack(pack.id);
                try {
                    const { error } = await supabase
                        .from('coin_packs')
                        .update({ is_active: !pack.is_active })
                        .eq('id', pack.id);

                    if (error) throw error;
                    toast.success(`"${pack.name}" ${action}d successfully`);
                    await loadCoinPacks();
                } catch (error) {
                    console.error('Error toggling pack status:', error);
                    toast.error('Failed to update pack status');
                } finally {
                    setProcessingPack(null);
                }
            }
        });
    };

    // Delete coin pack
    const deleteCoinPack = (packId: string) => {
        const pack = coinPacks.find(p => p.id === packId);
        if (!pack) return;

        setConfirmDialog({
            isOpen: true,
            type: 'delete',
            pack,
            action: async () => {
                setProcessingPack(packId);
                try {
                    const { error } = await supabase
                        .from('coin_packs')
                        .delete()
                        .eq('id', packId);

                    if (error) throw error;
                    toast.success(`"${pack.name}" deleted successfully`);
                    await loadCoinPacks();
                } catch (error) {
                    console.error('Error deleting coin pack:', error);
                    toast.error('Failed to delete coin pack');
                } finally {
                    setProcessingPack(null);
                }
            }
        });
    };



    useEffect(() => {
        // Add a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('Loading timeout reached, forcing loading to false');
                setLoading(false);
            }
        }, 10000); // 10 second timeout

        loadCoinPacks();

        return () => clearTimeout(timeoutId);
    }, []);

    const totalCoins = (pack: CoinPack) => pack.base_coins + pack.bonus_coins;
    const valueRatio = (pack: CoinPack) => totalCoins(pack) / pack.price_euro;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Coin Pack Management</h1>
                    <p className="text-gray-600 mt-2">
                        Manage coin top-up packs and pricing
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add New Pack
                </Button>
            </div>



            {/* Add/Edit Form */}
            {(showAddForm || editingPack) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-gray-900">
                            {editingPack ? 'Edit Coin Pack' : 'Add New Coin Pack'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CoinPackForm
                            key={editingPack?.id || 'new'}
                            pack={editingPack}
                            onSave={saveCoinPack}
                            onCancel={() => {
                                setEditingPack(null);
                                setShowAddForm(false);
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Coin Packs List */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-8">
                        <div className="text-gray-600">Loading coin packs...</div>
                    </div>
                ) : coinPacks.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="text-center py-8">
                            <div className="text-gray-600">No coin packs found</div>
                            <Button
                                onClick={() => setShowAddForm(true)}
                                className="mt-4"
                            >
                                Create First Pack
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    coinPacks.map((pack) => (
                        <CoinPackCard
                            key={pack.id}
                            pack={pack}
                            onEdit={() => setEditingPack(pack)}
                            onToggleStatus={() => togglePackStatus(pack)}
                            onDelete={() => deleteCoinPack(pack.id)}
                            valueRatio={valueRatio(pack)}
                            isProcessing={processingPack === pack.id}
                        />
                    ))
                )}
            </div>

            {/* Product Management Info */}
            <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                        ℹ️ Product Management
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-blue-800 mb-4">
                        Manage coin packs here. The web app will automatically use these products for Stripe payments.
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="text-blue-900 text-sm">
                            • Active packs are available for purchase in the web app
                        </div>
                        <div className="text-blue-900 text-sm mt-1">
                            • Changes are automatically reflected in the payment system
                        </div>
                        <div className="text-blue-900 text-sm mt-1">
                            • Inactive packs are hidden from users
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Confirmation Modal */}
            <Dialog open={confirmDialog.isOpen} onOpenChange={(open) => {
                if (!open) {
                    setConfirmDialog({
                        isOpen: false,
                        type: null,
                        pack: null,
                        action: null
                    });
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-semibold text-gray-900">
                                    {confirmDialog.type === 'delete' ? 'Delete Coin Pack' : 'Update Coin Pack Status'}
                                </DialogTitle>
                                <DialogDescription className="text-gray-600 mt-1">
                                    {confirmDialog.pack?.name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-4">
                        {confirmDialog.type === 'delete' && (
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Are you sure you want to delete <strong>&quot;{confirmDialog.pack?.name}&quot;</strong>?
                                </p>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-red-700 text-sm">
                                        <strong>Warning:</strong> This action cannot be undone and will permanently remove the coin pack from the system.
                                    </p>
                                </div>
                            </div>
                        )}

                        {confirmDialog.type === 'toggle' && (
                            <div className="space-y-3">
                                <p className="text-gray-700">
                                    Are you sure you want to {confirmDialog.pack?.is_active ? 'deactivate' : 'activate'} <strong>&quot;{confirmDialog.pack?.name}&quot;</strong>?
                                </p>
                                <div className={`border rounded-lg p-3 ${confirmDialog.pack?.is_active
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : 'bg-green-50 border-green-200'
                                    }`}>
                                    <p className={`text-sm ${confirmDialog.pack?.is_active
                                        ? 'text-yellow-700'
                                        : 'text-green-700'
                                        }`}>
                                        <strong>{confirmDialog.pack?.is_active ? 'Deactivating' : 'Activating'}</strong> this pack will {
                                            confirmDialog.pack?.is_active
                                                ? 'hide it from users and disable purchases.'
                                                : 'make it available for purchase again.'
                                        }
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setConfirmDialog({
                                    isOpen: false,
                                    type: null,
                                    pack: null,
                                    action: null
                                });
                            }}
                            disabled={processingPack === confirmDialog.pack?.id}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
                            onClick={() => {
                                if (confirmDialog.action) {
                                    confirmDialog.action();
                                }
                                setConfirmDialog({
                                    isOpen: false,
                                    type: null,
                                    pack: null,
                                    action: null
                                });
                            }}
                            disabled={processingPack === confirmDialog.pack?.id}
                        >
                            {processingPack === confirmDialog.pack?.id ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    {confirmDialog.type === 'delete' ? 'Deleting...' : 'Updating...'}
                                </div>
                            ) : (
                                confirmDialog.type === 'delete' ? 'Delete Pack' : 'Confirm'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Coin Pack Form Component
function CoinPackForm({
    pack,
    onSave,
    onCancel
}: {
    pack: CoinPack | null;
    onSave: (pack: Partial<CoinPack>) => void;
    onCancel: () => void;
}) {
    const [formData, setFormData] = useState({
        name: pack?.name || '',
        price_euro: pack?.price_euro || 0,
        base_coins: pack?.base_coins || 0,
        bonus_coins: pack?.bonus_coins || 0,
        is_active: pack?.is_active ?? true
    });

    // Update form data when pack prop changes
    useEffect(() => {
        if (pack) {
            setFormData({
                name: pack.name || '',
                price_euro: pack.price_euro || 0,
                base_coins: pack.base_coins || 0,
                bonus_coins: pack.bonus_coins || 0,
                is_active: pack.is_active ?? true
            });
        } else {
            setFormData({
                name: '',
                price_euro: 0,
                base_coins: 0,
                bonus_coins: 0,
                is_active: true
            });
        }
    }, [pack]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const totalCoins = formData.base_coins + formData.bonus_coins;
    const valueRatio = formData.price_euro > 0 ? totalCoins / formData.price_euro : 0;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name" className="text-gray-700">Pack Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Starter Pack"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="price" className="text-gray-700">Price (€)</Label>
                    <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price_euro}
                        onChange={(e) => setFormData({ ...formData, price_euro: parseFloat(e.target.value) || 0 })}
                        placeholder="1.99"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="baseCoins" className="text-gray-700">Base Coins</Label>
                    <Input
                        id="baseCoins"
                        type="number"
                        min="0"
                        value={formData.base_coins}
                        onChange={(e) => setFormData({ ...formData, base_coins: parseInt(e.target.value) || 0 })}
                        placeholder="350"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="bonusCoins" className="text-gray-700">Bonus Coins</Label>
                    <Input
                        id="bonusCoins"
                        type="number"
                        min="0"
                        value={formData.bonus_coins}
                        onChange={(e) => setFormData({ ...formData, bonus_coins: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        required
                    />
                </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="text-gray-900 font-semibold mb-3">Preview:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Total Coins:</span>
                        <div className="text-gray-900 font-bold">{totalCoins.toLocaleString()}</div>
                    </div>
                    <div>
                        <span className="text-gray-600">Value Ratio:</span>
                        <div className="text-gray-900 font-bold">{valueRatio.toFixed(2)} coins/€</div>
                    </div>
                    <div>
                        <span className="text-gray-600">Price in Cents:</span>
                        <div className="text-gray-900 font-bold">{(formData.price_euro * 100).toFixed(0)}</div>
                    </div>
                    <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={formData.is_active ? "default" : "secondary"}>
                            {formData.is_active ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {pack ? 'Update Pack' : 'Create Pack'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

// Coin Pack Card Component
function CoinPackCard({
    pack,
    onEdit,
    onToggleStatus,
    onDelete,
    valueRatio,
    isProcessing
}: {
    pack: CoinPack;
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
    valueRatio: number;
    isProcessing: boolean;
}) {
    const totalCoins = pack.base_coins + pack.bonus_coins;
    const priceInCents = Math.round(pack.price_euro * 100);

    return (
        <Card className={`group hover:shadow-xl transition-all duration-200 border-0 shadow-md ${!pack.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{pack.name}</span>
                            {!pack.is_active && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">Inactive</Badge>
                            )}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-3">
                            <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1">
                                €{pack.price_euro}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1">
                                {pack.base_coins.toLocaleString()} coins
                            </Badge>
                            {pack.bonus_coins > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1">
                                    +{pack.bonus_coins} Bonus
                                </Badge>
                            )}
                        </div>
                        <p className="text-gray-500 text-xs sm:text-sm">
                            Created: {new Date(pack.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            size="sm"
                            onClick={onEdit}
                            variant="outline"
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                            title="Edit pack"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            onClick={onToggleStatus}
                            variant={pack.is_active ? "outline" : "default"}
                            className={`h-8 w-8 p-0 ${pack.is_active
                                ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                                : 'hover:bg-green-50 hover:text-green-600'
                                }`}
                            title={pack.is_active ? 'Deactivate pack' : 'Activate pack'}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            size="sm"
                            onClick={onDelete}
                            variant="outline"
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                            title="Delete pack"
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                            ) : (
                                <Trash2 className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Euro className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 text-xs font-medium">Price</span>
                        </div>
                        <div className="text-gray-900 font-bold text-base sm:text-lg">€{pack.price_euro}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Coins className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 text-xs font-medium">Total Coins</span>
                        </div>
                        <div className="text-gray-900 font-bold text-base sm:text-lg">{totalCoins.toLocaleString()}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Star className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 text-xs font-medium">Value Ratio</span>
                        </div>
                        <div className="text-gray-900 font-bold text-base sm:text-lg">{valueRatio.toFixed(2)} coins/€</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-600 text-xs font-medium">Stripe Price</span>
                        </div>
                        <div className="text-gray-900 font-bold text-base sm:text-lg">{priceInCents}¢</div>
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-blue-800 text-xs mb-2 font-medium">Stripe Configuration:</div>
                    <div className="text-blue-900 text-xs font-mono bg-white p-2 rounded border">
                        {`{ name: "${pack.name}", price: ${priceInCents}, coins: ${totalCoins} }`}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 