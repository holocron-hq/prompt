'use client'
import { Button, Modal, ModalContent, Spinner, cn } from '@nextui-org/react'
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
        className={cn(
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
        <Modal
            backdrop='opaque'
            size='3xl'
            hideCloseButton
            isOpen={isOpen}
            className={clsx(className)}
            onOpenChange={onOpenChange}
        >
            <ModalContent className=''>
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
            </ModalContent>
        </Modal>
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
                className={cn(
                    'placeholder:text-foreground-muted pr-3 grow flex h-16 rounded-md bg-transparent py-3 outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            />

            {showReturnButton && (
                <Button
                    onClick={onEnter}
                    isIconOnly
                    size='sm'
                    variant='light'
                    startContent={
                        isLoading ? (
                            <PauseIcon className='w-5' />
                        ) : (
                            <CornerDownLeft className='w-5' />
                        )
                    }
                    className='shrink-0 flex'
                ></Button>
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
        className={cn('h-[460px] overflow-y-auto overflow-x-hidden', className)}
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
        className={cn(
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
        className={cn('-mx-1 h-px bg-border', className)}
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
        className={cn(
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
            className={cn(
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
