"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from "@netprophet/ui";
import { Loader2, User, CheckCircle, AlertCircle } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

interface ProfileClaimFormProps {
    onComplete: (data: {
        firstName: string;
        lastName: string;
        termsAccepted: boolean;
    }) => void;
    onCancel: () => void;
    loading?: boolean;
}

export function ProfileClaimForm({ onComplete, onCancel, loading = false }: ProfileClaimFormProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { dict } = useDictionary();

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim()) {
            newErrors.firstName = dict.profileSetup.form.errors.firstNameRequired;
        }

        if (!lastName.trim()) {
            newErrors.lastName = dict.profileSetup.form.errors.lastNameRequired;
        }

        if (!termsAccepted) {
            newErrors.terms = dict.profileSetup.form.errors.termsRequired;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onComplete({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                termsAccepted,
            });
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <User className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">{dict.profileSetup.form.title}</CardTitle>
                <CardDescription>
                    {dict.profileSetup.form.description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-500">
                            {dict.profileSetup.form.firstName}
                        </label>
                        <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                            placeholder={dict.profileSetup.form.firstNamePlaceholder}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.firstName ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {errors.firstName && (
                            <p className="text-sm text-red-500">{errors.firstName}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-500">
                            {dict.profileSetup.form.lastName}
                        </label>
                        <input
                            id="lastName"
                            type="text"
                            value={lastName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                            placeholder={dict.profileSetup.form.lastNamePlaceholder}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.lastName ? "border-red-500" : "border-gray-300"
                                }`}
                        />
                        {errors.lastName && (
                            <p className="text-sm text-red-500">{errors.lastName}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermsAccepted(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="terms" className="text-sm text-gray-400">
                                {dict.profileSetup.form.termsLabel}
                            </label>
                        </div>
                        {errors.terms && (
                            <p className="text-sm text-red-500">{errors.terms}</p>
                        )}
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {dict.profileSetup.form.termsDescription}
                        </AlertDescription>
                    </Alert>

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 hover:bg-gray-50"
                            disabled={loading}
                        >
                            {(dict as any)?.profileSetup?.skipForNow || "Skip for Now"}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {(dict as any)?.profileSetup?.processing || "Processing..."}
                                </>
                            ) : (
                                (dict as any)?.profileSetup?.continue || "Continue"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
