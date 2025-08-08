"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    className?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
    ({ defaultValue, value, onValueChange, children, className, ...props }, ref) => {
        const [activeTab, setActiveTab] = React.useState(value || defaultValue || "")

        React.useEffect(() => {
            if (value !== undefined) {
                setActiveTab(value)
            }
        }, [value])

        const handleTabChange = (newValue: string) => {
            setActiveTab(newValue)
            onValueChange?.(newValue)
        }

        return (
            <div ref={ref} className={cn("w-full", className)} {...props}>
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        return React.cloneElement(child, {
                            activeTab,
                            onTabChange: handleTabChange
                        } as any)
                    }
                    return child
                })}
            </div>
        )
    }
)
Tabs.displayName = "Tabs"

interface TabsListProps {
    children: React.ReactNode
    className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
    ({ children, className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
    activeTab?: string
    onTabChange?: (value: string) => void
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
    ({ value, children, className, activeTab, onTabChange, ...props }, ref) => {
        // Only pass valid HTML button attributes to the DOM
        const buttonProps = { ...props }
        delete (buttonProps as any).activeTab
        delete (buttonProps as any).onTabChange

        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    activeTab === value ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50",
                    className
                )}
                onClick={() => onTabChange?.(value)}
                {...buttonProps}
            >
                {children}
            </button>
        )
    }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
    activeTab?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
    ({ value, children, className, activeTab, ...props }, ref) => {
        if (activeTab !== value) return null

        // Only pass valid HTML div attributes to the DOM
        const divProps = { ...props }
        delete (divProps as any).activeTab

        return (
            <div
                ref={ref}
                className={cn(
                    "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    className
                )}
                {...divProps}
            >
                {children}
            </div>
        )
    }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent } 