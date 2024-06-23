'use client'
import clsx from 'clsx'
import colors from 'tailwindcss/colors'
import { Dialog, Transition } from '@headlessui/react'

import { Command as CommandPrimitive } from 'cmdk'
import { CornerDownLeft, PauseIcon, StopCircleIcon } from 'lucide-react'
import * as React from 'react'
import { DialogPosition } from './types'

const Command = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={clsx(
            'flex z-10 bg-[--background] h-full max-w-full flex-col overflow-hidden rounded-md  ',
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
    position,
    onOpenChange,
}: {
    children: React.ReactNode
    className?: string
    onChange
    isOpen: boolean
    position?: DialogPosition
    onOpenChange: any
}) => {
    return (
        <>
            {isOpen && (
                <div
                    onClick={() => onOpenChange(false)}
                    className='fixed z-10 inset-0 bg-gray-900/60 backdrop-blur data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
                ></div>
            )}

            <Dialog
                open={isOpen}
                onClose={onOpenChange}
                className={clsx(
                    className,
                    'holocron-prompt-scope fixed rounded-lg z-20 ring-[--accent] grid w-full gap-4 bg-[--background] shadow-lg duration-200 ',
                    !position &&
                        'max-w-[90%] lg:max-w-3xl left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
                )}
                style={position}
            >
                <Command
                    // value={value}
                    tabIndex={-1}
                    onChange={onChange}
                    shouldFilter={false}
                    loop
                    className='focus:outline-none focus:ring-0'
                >
                    {children}
                </Command>
            </Dialog>
        </>
    )
}

const CommandInput = React.forwardRef<
    any,
    React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
        endContent?: React.ReactNode
        onEnter?: () => void
        isLoading?: boolean
    }
>(({ className, isLoading, onEnter, endContent, ...props }, ref) => {
    const onEnterRef = React.useRef(onEnter)
    onEnterRef.current = onEnter
    React.useEffect(() => {
        const fn = (e) => {
            if (e.key === 'Enter') {
                onEnterRef.current?.()
            }
        }
        window.addEventListener('keydown', fn)
        return () => window.removeEventListener('keydown', fn)
    }, [isLoading])

    return (
        <div
            className={clsx(
                'flex relative items-center w-full border-b px-4',
                isLoading && 'search-loader',
            )}
            data-loading={isLoading}
            cmdk-input-wrapper=''
        >
            <CommandPrimitive.Input
                ref={ref}
                className={clsx(
                    ' placeholder:text-[--foreground]/80 !ring-0 pr-3 grow flex h-16 rounded-md bg-transparent py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            />

            {endContent && endContent}
            <style>{`
            .search-loader:after {
                content: "";
                width: 50%;
                left: 0;
                height: 2px;
                position: absolute;
                background: linear-gradient(90deg,transparent 0,var(--primary-color) 50%,transparent 100%);
                opacity: 0.6;
                bottom: 0;
                animation: loadingAnimation 1.1s cubic-bezier(.455,.03,.515,.955) infinite;
                
            }

            @keyframes loadingAnimation {
                0% {
                    opacity: 1;
                    transform: translateX(-100%)
                }
            
                to {
                    opacity: 1;
                    transform: translateX(300%)
                }
            }
            
            `}</style>
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
            'overflow-hidden [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:opacity-70',
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
        className={clsx('-mx-1 h-px bg-[--accent]', className)}
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
            'relative flex cursor-default select-none items-center data-[selected=true]:!border-[--primary-color] border-l-4  !border-transparent px-4 pl-3 py-3 outline-none aria-selected:bg-[--accent] data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
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
                'ml-auto text-xs tracking-widest opacity-80',
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
