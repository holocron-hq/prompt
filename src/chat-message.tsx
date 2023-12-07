import { Message } from 'ai'
import Link from 'next/link'
import { clsx } from 'clsx'

import { cn } from '@nextui-org/react'
import { IconUser } from './icons'

import { SafeMdxRenderer } from 'safe-mdx/src'

export interface ChatMessageProps {
    message: Message
    className?: string
}

export type MessageSource = {
    href: string
    title: string
    content: string
}

export function ChatMessage({
    className = '',
    message,
    ...props
}: ChatMessageProps) {
    return (
        <div className={cn('group relative flex items-start')} {...props}>
            <div
                className={cn(
                    'flex h-10 w-10 mt-1 shrink-0 select-none items-center justify-center rounded-md border shadow',
                    message.role === 'user'
                        ? 'bg-background'
                        : 'dark:bg-white bg-white text-primary-foreground',
                )}
            >
                {message.role === 'user' ? (
                    <IconUser className={cn('w-6')} />
                ) : (
                    <img
                        className={cn('h-6 w-6 rounded dark:invert')}
                        src='https://holocron.so/favicon.png'
                    />
                )}
            </div>
            <div className='flex-1 ml-4 space-y-2 overflow-hidden'>
                <Prose className={cn('', className)}>
                    <SafeMdxRenderer
                        code={message.content}
                        // mdast={mdast}
                        components={{
                            p({ children }) {
                                return (
                                    <p className='mb-2 last:mb-0'>{children}</p>
                                )
                            },
                            Sources,
                            pre({ children, className, ...rest }) {
                                return (
                                    <pre
                                        className={cn('dark', className)}
                                        {...rest}
                                    >
                                        {children}
                                    </pre>
                                )
                            },
                        }}
                    />
                </Prose>
                {/* <div className='flex items-center'>
                    <div className='grow'></div>
                    <CopyButton message={message} />
                </div> */}
            </div>
        </div>
    )
}

export function Prose<T extends React.ElementType = 'div'>({
    as,
    className,
    ...props
}: React.ComponentPropsWithoutRef<T> & {
    as?: T
}) {
    let Component = as ?? 'div'

    return (
        <Component
            className={clsx(
                className,
                'prose prose-slate max-w-none dark:prose-invert dark:text-gray-50',
                // headings
                'prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-[8.5rem]',
                // lead
                'prose-lead:text-gray-500 dark:prose-lead:text-gray-400',
                // links
                'prose-a:font-semibold dark:prose-a:text-primary',
                // link underline
                'prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.primary/20))] hover:prose-a:[--tw-prose-underline-size:6px] dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.primary))] dark:hover:prose-a:[--tw-prose-underline-size:6px]',
                // pre
                'prose-pre:rounded-xl prose-pre:bg-gray-900 prose-pre:shadow-lg dark:prose-pre:bg-gray-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-gray-300/10',
                // hr
                'dark:prose-hr:border-gray-800',
            )}
            {...props}
        />
    )
}

function Sources({ sources }: { sources: MessageSource[] }) {
    return (
        <div className='flex flex-col gap-2'>
            <div className=''>Using the following sources:</div>
            <div className='flex flex-col prose gap-1'>
                {sources?.map((x, i) => {
                    return (
                        <Link key={i} href={x.href} className='text-sm'>
                            {x.title}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
