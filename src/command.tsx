'use client'
import clsx from 'clsx'

import { Command as CommandPrimitive } from 'cmdk'
import { CornerDownLeft, PauseIcon, StopCircleIcon } from 'lucide-react'
import * as React from 'react'

const Command = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={clsx(
            'flex z-10 h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className,
        )}
        {...props}
    />
))
Command.displayName = CommandPrimitive.displayName

const CommandDialog = ({
    children,
    className = '',
    onChange,
    isOpen,
    onOpenChange,
}) => {
    return (
        <>
            {isOpen && (
                <div className='fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'></div>
            )}
            <CommandPrimitive.Dialog
                open={isOpen}
                onOpenChange={onOpenChange}
                className={clsx(
                    className,
                    'fixed rounded-lg z-10 border left-[50%] top-[50%] grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 bg-background shadow-lg duration-200 ',
                )}
                label='Global Command Menu'
            >
                <Command
                    // value={value}
                    tabIndex={-1}
                    onChange={onChange}
                    shouldFilter={false}
                    loop
                    className=''
                >
                    {children}
                </Command>
            </CommandPrimitive.Dialog>
        </>
    )
}

const CommandInput = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
        showReturnButton?: boolean
        onEnter?: () => void
        isLoading?: boolean
    }
>(({ className, isLoading, onEnter, showReturnButton, ...props }, ref) => {
    React.useEffect(() => {
        const fn = (e) => {
            if (e.key === 'Enter') {
                onEnter?.()
            }
        }
        window.addEventListener('keydown', fn)
        return () => window.removeEventListener('keydown', fn)
    }, [isLoading])

    return (
        <div
            className='flex items-center w-full border-b px-4'
            cmdk-input-wrapper=''
        >
            <CommandPrimitive.Input
                ref={ref}
                className={clsx(
                    'placeholder:text-foreground-muted pr-3 grow flex h-16 rounded-md bg-transparent py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            />

            {showReturnButton && (
                <button onClick={onEnter} className='shrink-0 flex'>
                    {isLoading ? (
                        <PauseIcon className='w-5' />
                    ) : (
                        <CornerDownLeft className='w-5' />
                    )}
                </button>
            )}
        </div>
    )
})

CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.List
        ref={ref}
        className={clsx(
            'h-[460px] overflow-y-auto overflow-x-hidden',
            className,
        )}
        {...props}
    />
))

CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
    <CommandPrimitive.Empty
        ref={ref}
        className='py-6 text-center text-sm'
        {...props}
    />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={clsx(
            'overflow-hidden  text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
            className,
        )}
        {...props}
    />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Separator
        ref={ref}
        className={clsx('-mx-1 h-px bg-border', className)}
        {...props}
    />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={clsx(
            'relative flex cursor-default select-none items-center data-[selected=true]:border-primary border-l-4 border-transparent px-4 pl-3 py-3 outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        {...props}
    />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
    return (
        <span
            className={clsx(
                'ml-auto text-xs tracking-widest text-muted-foreground',
                className,
            )}
            {...props}
        />
    )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
}
