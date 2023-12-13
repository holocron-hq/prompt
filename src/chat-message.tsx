import { Message } from 'ai'
import Link from 'next/link'
import { clsx } from 'clsx'

import { SafeMdxRenderer } from 'safe-mdx'
import { SearchDataEntry } from './types'
import { usePromptContext } from './hooks'
import { basename } from './utils'
import {
    CpuIcon,
    UserCircle2Icon,
    UserCircleIcon,
    UserIcon,
} from 'lucide-react'

export interface ChatMessageProps {
    message: Message
    className?: string
}

export function ChatMessage({
    className = '',
    message,
    ...props
}: ChatMessageProps) {
    const { chatbotName } = usePromptContext()
    const name = message.role === 'user' ? 'You' : chatbotName || 'AI'
    return (
        <div className={clsx('group relative flex items-start')} {...props}>
            <div
                className={clsx(
                    'flex h-10 w-10 mt-1 shrink-0 select-none items-center justify-center rounded-md border shadow',
                    'dark:bg-white bg-gray-800 text-gray-200 dark:text-gray-500',
                )}
            >
                {message.role === 'user' ? (
                    <UserIcon className={clsx('w-6')} />
                ) : (
                    <CpuIcon className={clsx('w-6')} />
                )}
            </div>
            <div className='flex-1 ml-4 flex flex-col overflow-x-hidden'>
                <div className='font-bold'>{name}</div>
                <Prose className={clsx('', className)}>
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
                                        className={clsx('dark', className)}
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
                'prose-a:font-semibold dark:prose-a:text-white',
                // link underline
                // pre
                'prose-pre:rounded-xl prose-pre:bg-gray-900 prose-pre:shadow-lg dark:prose-pre:bg-gray-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-gray-300/10',
                // hr
                'dark:prose-hr:border-gray-800',
            )}
            {...props}
        />
    )
}

function Sources({ sources }: { sources: SearchDataEntry[] }) {
    const { slugToHref } = usePromptContext()
    return (
        <div className='flex flex-col gap-2'>
            <div className=''>Using the following sources:</div>
            <div className='flex flex-col prose gap-1'>
                {sources?.map((x, i) => {
                    return (
                        <Link
                            key={i}
                            href={slugToHref!(x.slug) || ''}
                            className='text-sm'
                        >
                            {x.name || basename(x.slug)}
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

function IconUser({ className, ...props }: React.ComponentProps<'svg'>) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 256 256'
            fill='currentColor'
            className={clsx(className)}
            {...props}
        >
            <path d='M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8ZM72 96a56 56 0 1 1 56 56 56.06 56.06 0 0 1-56-56Z' />
        </svg>
    )
}
