'use client'
import colors from 'tailwindcss/colors'

import { findAll } from 'highlight-words-core'
import Link from 'next/link'

import { Laptop, Moon, SunMedium } from 'lucide-react'
import { useTheme } from 'next-themes'
import { memo, useCallback } from 'react'
import { CommandGroup } from './command'

import { toast } from 'react-hot-toast'

import {
    BabyIcon,
    CheckSquare2Icon,
    ChevronsUpDownIcon,
    FileBoxIcon,
    Layers2Icon,
    SendToBackIcon,
    StarsIcon,
} from 'lucide-react'

import { CreateMessage, useChat } from 'ai/react'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { v4 } from 'uuid'
import { ChatList } from './chat-list'
import {
    CommandDialog,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from './command'
import { useMiniSearch, useRouteChanged } from './hooks'
import { PagesTree, SearchDataEntry } from './types'

function Variables({ children }) {
    return (
        <div className='holocron-prompt'>
            {children}
            <style>
                {`
                .holocron-prompt {
                    --accent: ${colors.neutral[100]};
                    --background: ${colors.neutral[50]};
                    --accent-foreground: ${colors.neutral[800]};
                    --primary-foreground: ${colors.neutral[800]};
                }
                .dark .holocron-prompt {
                    --accent: ${colors.neutral[700]};
                    --background: ${colors.neutral[800]};
                    --accent-foreground: ${colors.neutral[100]};
                    --primary-foreground: ${colors.neutral[100]};
                }
                `}
            </style>
        </div>
    )
}

export function SearchAndChat({
    pagesTree,
    className = '',
    namespace,
    getSearchData,
    searchDataKey,
    isOpen,
    setOpen,
    markdown,
    slugToHref,
}: {
    className?: string
    namespace: string
    searchDataKey: string
    markdown: string
    isOpen: boolean
    setOpen: Function
    getSearchData: () => Promise<{
        searchData: SearchDataEntry[]
    }>
    slugToHref: (slug: string) => string
    pagesTree: PagesTree[]
}) {
    const [mode, setMode] = useState<'search' | 'chat'>('search')
    const [chatId, setChatId] = useState(() => v4())
    useRouteChanged(() => {
        setOpen(false)
        setMessages([])
    })
    const { results, onQueryChange } = useMiniSearch({
        pagesTree,
        getSearchData,
        searchDataKey,
        isOpen,
    })
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
            if (e.key === 'Escape') {
                e.preventDefault()
                setOpen(false)
            }
        }

        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])
    const additionalMessages = useRef<CreateMessage[]>([])

    const input = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (isOpen) {
            input.current?.focus()
        }
    }, [isOpen])

    const { messages, append, data, setMessages, stop, isLoading } = useChat({
        initialMessages: [],
        api: '/api/docs-chat',
        id: chatId,
        body: {
            additionalMessages: additionalMessages.current,
            namespace,
        },
        onResponse(response) {
            if (response.status === 401) {
                toast.error(response.statusText)
            }
        },
        onError(error) {
            toast.error(error.message)
        },
    })

    const [value, _setValue] = useState('')

    function setValue(value: string) {
        _setValue(value)
        if (mode === 'search') {
            onQueryChange(value)
        }
    }

    function reset() {
        setMessages([])
        setMode('search')
        setValue('')
        setChatId(v4())
        additionalMessages.current = []
        stop()
    }

    useEffect(() => {
        if (isOpen) {
            input.current?.focus()
        } else {
            reset()
        }
    }, [isOpen])

    const onEnter = async () => {
        if (isLoading) {
            console.log('stopping generation')
            stop()
            return
        }
        const q = input.current?.value?.trim()
        if (!q) return

        setValue('')

        const messageId = v4()
        console.log(`sending message`, q)
        append({
            role: 'user',
            id: messageId,
            content: q,
        })
    }
    const showChatIdeas = !messages.length && !value && !isLoading

    return (
        <Variables>
            <CommandDialog
                className=''
                onChange={(e: any) => {
                    setValue(e.target.value)
                }}
                isOpen={isOpen}
                onOpenChange={setOpen}
            >
                <CommandInput
                    ref={input}
                    autoFocus
                    value={value}
                    showReturnButton={mode === 'chat'}
                    isLoading={isLoading}
                    onEnter={() => {
                        if (mode === 'chat') {
                            onEnter()
                        } else {
                            console.log('ignoring enter in non chat mode')
                        }
                    }}
                    placeholder={
                        mode === 'chat'
                            ? 'Ask anything...'
                            : 'Type a command or search...'
                    }
                />
                {mode === 'chat' && (
                    <CommandList key='list'>
                        {showChatIdeas ? (
                            getMessageIdeas({
                                additionalMessages,
                                append,
                                markdown,
                            }).map((msg, i) => {
                                return (
                                    <CommandItem
                                        key={i}
                                        onSelect={msg.onSelect}
                                        className='flex items-center gap-2'
                                    >
                                        {msg.icon}
                                        <div className=''>{msg.content}</div>
                                    </CommandItem>
                                )
                            })
                        ) : (
                            <ChatList
                                sources={
                                    data?.map((x: any) =>
                                        x.sources?.map((source) => {
                                            return {
                                                href: slugToHref(source.slug),
                                                title:
                                                    source.title || source.slug,
                                            }
                                        }),
                                    ) || []
                                }
                                messages={messages.filter(
                                    (x) =>
                                        !additionalMessages.current.some(
                                            (add) => add.content === x.content,
                                        ),
                                )}
                            />
                        )}
                    </CommandList>
                )}
                {mode === 'search' && (
                    <CommandList key='list'>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandItem
                            onSelect={() => {
                                setMode('chat')
                            }}
                        >
                            <StarsIcon className='w-7 mr-2' />
                            <span className='font-bold'>Ask AI</span>
                            {value && ': '}
                            {value}
                        </CommandItem>
                        {results.map(({ hit: node, terms }, i) => {
                            const href = slugToHref(node.slug)

                            return (
                                <SearchResultItem
                                    key={node.slug}
                                    title={node.name || basename(node.slug)}
                                    terms={terms}
                                    href={href}
                                    node={node}
                                />
                            )
                        })}
                        <CommandSeparator />
                        <DarkModeCommands setOpen={setOpen} />
                    </CommandList>
                )}
            </CommandDialog>
        </Variables>
    )
}



const getMessageIdeas = ({ additionalMessages, markdown, append }) => {
    const getBodyOptions = () => {
        return {
            options: {
                body: {
                    additionalMessages: additionalMessages.current,
                },
            },
        }
    }
    return [
        {
            content: 'Turn the following page into a diagram',
            icon: <SendToBackIcon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Turn the current page into a diagram`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        }, //
        {
            content: 'Summarize the current page',
            icon: <FileBoxIcon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Give me a short and concise summary`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        }, //
        {
            content: 'Pros and cons of the current page',
            icon: <ChevronsUpDownIcon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Create 2 ordered lists of cons and pros for the current page`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        }, //
        {
            content: 'Todo list for the current page',
            icon: <CheckSquare2Icon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Create a fgm markdown todo list for the current page, a list of tasks for the reader`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        }, //
        {
            content: 'Explain this page like i am 5',
            icon: <BabyIcon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Explain this page like i am 5 years old`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        }, //
        {
            content: 'Give me an outline of the current page',
            icon: <Layers2Icon className='w-7' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${markdown}\n\`\`\`\n\n`,
                        role: 'assistant',
                    },
                ]
                append(
                    {
                        content: `Give me an outline using markdown ordered lists, use headings and subheadings, if few headings are preset extrapolate them from the content`,
                        role: 'user',
                    },
                    getBodyOptions(),
                )
            },
        },
    ]
}

function basename(path) {
    return path.split(/[\\/]/).pop()
}

export function SearchResultItem({ node, title, href, terms }) {
    return (
        <Link href={href}>
            <CommandItem
                key={node.slug}
                id={node.slug}
                value={node.slug}
                onSelect={() => {}}
            >
                <div className='appearance-none flex flex-col gap-1'>
                    <div className='flex gap-3 items-center'>
                        <div className='mt-px shrink-0 flex h-6 items-center justify-center'>
                            <DocIcon className='shrink-0 h-7 opacity-70' />
                        </div>
                        <div className='flex flex-col gap-px'>
                            {/* <div className='text-xs font-semibold opacity-70'>
                                {node.slug}
                            </div> */}
                            <div className=''>
                                <SearchedText
                                    terms={terms}
                                    textToHighlight={title}
                                />
                            </div>
                        </div>
                    </div>
                    <div className='opacity-70 text-xs max-w-full'>
                        <SearchedText
                            terms={terms}
                            textToHighlight={node.text}
                        />
                    </div>
                </div>
            </CommandItem>
        </Link>
    )
}

export const SearchedText = memo<{ terms; textToHighlight: string }>(
    function OptionText({ terms, textToHighlight }) {
        let chunks = findAll({
            searchWords: terms,
            textToHighlight,

            autoEscape: true,
        })

        let len = 0
        let max = 300
        let shorten = 50
        let highlightedText = chunks.map((chunk, i) => {
            const { end, highlight, start } = chunk
            const newPart = end - start
            const text = textToHighlight.substr(start, end - start)
            if (newPart > 300 && !highlight) {
                if (chunks[i + 1]?.highlight) {
                    len += shorten
                    if (len > max) return ''
                    return '...' + text.slice(-shorten)
                }
                // if (chunks[i - 1]?.highlight) {
                //     len += shorten
                //     return text.slice(shorten) + '...'
                // }
                return ''
            }
            len += newPart
            if (len > max) return ''

            if (highlight) {
                return (
                    <mark key={i} className='inline bg-amber-200/80'>
                        {text}
                    </mark>
                )
            } else {
                return text
            }
        })

        highlightedText = highlightedText

        return highlightedText as any
    },
)

export function DocIcon(props) {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 512 512'
            {...props}
        >
            <path
                fill='none'
                stroke='currentColor'
                strokeLinejoin='round'
                strokeWidth='40'
                d='M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z'
            ></path>
            <path
                fill='none'
                stroke='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='40'
                d='M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160'
            ></path>
        </svg>
    )
}

export function DarkModeCommands({ setOpen }) {
    const { setTheme } = useTheme()

    const runCommand = useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])
    return (
        <CommandGroup heading='Theme'>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                <SunMedium className='mr-2 w-7' />
                Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                <Moon className='mr-2 w-7' />
                Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                <Laptop className='mr-2 w-7' />
                System
            </CommandItem>
        </CommandGroup>
    )
}
