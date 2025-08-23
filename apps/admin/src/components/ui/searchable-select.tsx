"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react"
import { cn, normalizeText } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Label } from "./label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./popover"

interface SearchableSelectProps {
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    label?: string
    disabled?: boolean
    error?: string | null
    className?: string
    items: Array<{
        value: string
        label: string
    }>
    loading?: boolean
    loadingText?: string
    errorText?: string | null
}

export function SearchableSelect({
    value,
    onValueChange,
    placeholder = "Select an option",
    label,
    disabled = false,
    error,
    className,
    items,
    loading = false,
    loadingText = "Loading...",
    errorText,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")

    const filteredItems = React.useMemo(() => {
        if (!searchTerm) return items

        const normalizedSearchTerm = normalizeText(searchTerm);

        return items.filter(item => {
            const normalizedLabel = normalizeText(item.label);
            return normalizedLabel.includes(normalizedSearchTerm);
        });
    }, [items, searchTerm]);

    const selectedItem = React.useMemo(() => {
        return items.find(item => item.value === value)
    }, [items, value])

    const handleSelect = (selectedValue: string) => {
        onValueChange(selectedValue)
        setOpen(false)
        setSearchTerm("")
    }

    return (
        <div className="space-y-2">
            {label && (
                <Label className="text-base font-semibold">{label}</Label>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between h-12 text-base",
                            error && "border-red-500",
                            className
                        )}
                        disabled={disabled}
                    >
                        {selectedItem ? selectedItem.label : placeholder}
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        setOpen(false)
                                        setSearchTerm("")
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                                <span className="ml-2 text-sm text-gray-500">{loadingText}</span>
                            </div>
                        ) : errorText ? (
                            <div className="flex items-center justify-center py-4">
                                <span className="text-sm text-red-500">{errorText}</span>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex items-center justify-center py-4">
                                <span className="text-sm text-gray-500">
                                    {searchTerm ? "No results found" : "No options available"}
                                </span>
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <Button
                                    key={item.value}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-auto py-3 px-3",
                                        value === item.value && "bg-accent"
                                    )}
                                    onClick={() => handleSelect(item.value)}
                                >
                                    <CheckIcon
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </Button>
                            ))
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {error && (
                <div className="text-xs text-red-500">{error}</div>
            )}
        </div>
    )
}
