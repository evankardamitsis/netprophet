"use client";

import { Check } from "lucide-react";
import { useDictionary } from "@/context/DictionaryContext";

interface StepIndicatorProps {
    currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    const { dict } = useDictionary();

    const steps = [
        { number: 1, title: dict.profileSetup?.steps?.lookup || "Lookup" },
        { number: 2, title: dict.profileSetup?.steps?.review || "Review" },
        { number: 3, title: dict.profileSetup?.steps?.complete || "Complete" },
    ];

    return (
        <div className="w-full py-2 sm:py-3">
            <div className="flex items-center justify-between max-w-xl mx-auto px-2 sm:px-4">
                {steps.map((step, index) => (
                    <div key={step.number} className="flex items-center flex-1">
                        {/* Step Circle */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`
                                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300
                                    ${currentStep > step.number
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                                        : currentStep === step.number
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50 ring-2 sm:ring-4 ring-purple-200'
                                            : 'bg-gray-200 text-gray-500'
                                    }
                                `}
                            >
                                {currentStep > step.number ? (
                                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                ) : (
                                    step.number
                                )}
                            </div>
                            <span
                                className={`
                                    mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-center whitespace-nowrap transition-all duration-300
                                    ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'}
                                `}
                            >
                                {step.title}
                            </span>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div
                                className={`
                                    flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 transition-all duration-500 rounded-full
                                    ${currentStep > step.number
                                        ? 'bg-green-500'
                                        : currentStep === step.number
                                            ? 'bg-gradient-to-r from-purple-600 to-gray-200'
                                            : 'bg-gray-200'
                                    }
                                `}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

