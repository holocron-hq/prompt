'use client'
import { parse, formatRgb, filterBrightness, filterSaturate, wcagLuminance } from 'culori'
// @ts-ignore - types require bundler moduleResolution
import colors from 'tailwindcss/colors'
import type { ChatMessage } from './types'


import { findAll } from 'highlight-words-core'
import Link from 'next/link'

import {
    CornerDownLeft,
    FileTextIcon,
    HashIcon,
    Laptop,
    Moon,
    PauseIcon,
    ScanSearchIcon,
    SearchCheckIcon,
    SunMedium,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { memo, useCallback, useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
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

import { CreateMessage, useChat } from '@ai-sdk/react'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
import {
    promptContext,
    useDebouncedEffect,
    useMiniSearch,
    usePrevious,
    usePromptContext,
    useRouteChanged,
    useThrowingFn,
    useEvent,
} from './hooks'
import { DialogPosition, SearchDataEntry, SearchEndpointBody } from './types'
import { basename } from './utils'
import { SearchResult } from './hooks'

function uiMessageToChatMessage(msg: {
    id: string
    role: string
    parts?: Array<{ type: string; text?: string }>
}): ChatMessage | null {
    if (msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'system') {
        return null
    }
    const textContent = msg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n') || ''
    return {
        id: msg.id,
        role: msg.role,
        content: textContent,
    }
}

function Variables({ children }) {
    const { primaryColor: primaryColorString } = usePromptContext()
    const primaryColor = parse(primaryColorString!)
    const brightness = wcagLuminance(primaryColor)
    const brightenFactor = brightness < 0.7 ? (0.7 - brightness) / 0.7 : 0
    const primaryDark = filterSaturate(1.8, 'lch')(filterBrightness(1 + brightenFactor, 'lrgb')(primaryColor))

    return (
        <div className='holocron-prompt-scope'>
            {children}
            <style>
                {`
                .holocron-prompt-scope {
                    --accent: ${colors.neutral[100]};
                    --background: ${colors.neutral[50]};
                    --primary-foreground: ${formatRgb(filterBrightness(1 + Math.max(0, 0.4 - brightness), 'lrgb')(primaryColor))};
                    --primary-color: ${formatRgb(filterBrightness(1 + Math.max(0, 0.5 - brightness), 'lrgb')(primaryColor))};
                    --primary-highlight: ${formatRgb({ ...primaryColor, alpha: 0.2 })};
                }
                .dark .holocron-prompt-scope {
                    --accent: ${colors.neutral[700]};
                    --background: ${colors.neutral[800]};
                    --primary-foreground: ${formatRgb(filterBrightness(1 + Math.max(0, 0.8 - wcagLuminance(primaryDark)), 'lrgb')(primaryDark))};
                    --primary-color: ${formatRgb(primaryDark)};
                    --primary-highlight: ${formatRgb({ ...primaryDark, alpha: 0.1 })};
                }
                `}
            </style>
        </div>
    )
}

export type SearchAndChatProps = {
    className?: string
    namespace: string
    body?: any
    currentPageText?: string
    isOpen: boolean
    setOpen: Function
    getSearchData: () => Promise<{
        searchData: SearchDataEntry[]
    }>
    slugToHref?: (slug: string) => string
    initialResults?: SearchDataEntry[]
    api?: string
    position?: DialogPosition
    primaryColor?: string
    initialMessage?: string
    chatbotName?: string
    disableChat?: boolean

    uiOverrides?: Partial<Record<keyof typeof defaultUiOverrides, string>>
}

const defaultUiOverrides = {
    searchPlaceholder: 'Type a command or search...',
    askAI: 'Ask AI',
    semanticSearch: 'Semantic Search',
    semanticSearchPlaceholder:
        'Search using synonyms, concepts, or keywords...',
    askAiPlaceholder: 'Ask anything...',
    noResultsFound: 'No results found',
    lightMode: 'Light',
    darkMode: 'Dark',
    systemMode: 'System',
} as const

export type Mode = 'search' | 'chat' | 'semantic'

export function SearchAndChat({
    isOpen,
    setOpen,
    ...rest
}: SearchAndChatProps) {
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
    if (!isOpen) {
        return null
    }
    return <SearchAndChatInner {...rest} isOpen={isOpen} setOpen={setOpen} />
}

export function SearchAndChatInner({
    className = '',
    namespace,
    getSearchData,
    isOpen,
    setOpen,
    currentPageText = '',
    initialResults = [],
    api = '/api/docs-chat',
    slugToHref = (x) => x,
    position,
    initialMessage = '',
    chatbotName = '',
    primaryColor = colors.blue[500],
    disableChat,
    body: bodyProp,
    uiOverrides,
}: SearchAndChatProps) {
    uiOverrides = { ...defaultUiOverrides, ...uiOverrides }
    const context = {
        body: bodyProp,
        getSearchData,
        isOpen,
        namespace,
        setOpen,
        api,
        className,
        currentPageText,
        initialResults,
        slugToHref,
        primaryColor,
        chatbotName,
        disableChat,
        initialMessage,
        uiOverrides,
    }
    const [mode, setMode] = useState<Mode>('search')
    const [chatId, setChatId] = useState(() => v4())
    useRouteChanged(() => {
        setOpen(false)
        setMessages([])
    })
    const {
        results: localResults,
        isLoading: isMiniSearching,
        onQueryChange,
    } = useMiniSearch({
        getSearchData,
        searchDataKey: namespace,
        initialResults,
        isOpen,
    })

    const [semanticResults, setSemanticResults] = useState<SearchResult[]>()

    const { fn: semanticSearch, isLoading: isSemanticSearching } =
        useThrowingFn({
            async fn(value: string) {
                if (!value) {
                    return
                }
                const body: SearchEndpointBody = {
                    ...bodyProp,
                    type: 'semantic-search',
                    namespace,
                    query: value,
                }
                const res = await fetch(api, {
                    body: JSON.stringify(body),
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                const json: SearchResult[] = await res.json()
                if (!res.ok) {
                    console.error(json)
                    toast.error(`Semantic search failed: ${res.statusText}`)
                    return
                }
                // console.log({ json })
                setSemanticResults(json)
            },
        })

    const additionalMessages = useRef<CreateMessage[]>([])

    const input = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (isOpen) {
            input.current?.focus()
        }
    }, [isOpen])

    const body: Partial<SearchEndpointBody> = {
        ...bodyProp,
        additionalMessages: additionalMessages.current,
        namespace,
    }

    // TODO let user see previous chats, store them in localstorage

    const {
        messages,
        append,
        data,
        setMessages,
        stop,
        isLoading: isLoadingChat,
    } = useChat({
        initialMessages: initialMessage
            ? [
                  {
                      content: initialMessage,
                      role: 'assistant',
                      id: 'initial',
                  },
              ]
            : [],
        api,
        id: chatId,
        body,
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
        if (mode === 'semantic') {
            setSemanticResults(undefined)
        }
    }

    function reset() {
        console.log('resetting chat state')
        setMessages([])
        setMode('search')
        setValue('')
        setChatId(v4())
        setSemanticResults(undefined)
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

    const onEnter = useEvent(async () => {
        // console.log('onEnter', mode)
        if (mode === 'semantic') {
            semanticSearch(input.current?.value)
            return
        }
        if (mode === 'chat') {
            if (isLoadingChat) {
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
    })
    const isLoading = isMiniSearching || isLoadingChat || isSemanticSearching
    const showChatIdeas = !messages.length && !value && !isLoadingChat
    const terms = [value]
    const sources = data?.map((x: any) => x.sources) || []
    const results = mode === 'search' ? localResults : semanticResults
    const previousInitialMessage = usePrevious(initialMessage)
    useEffect(() => {
        if (initialMessage && previousInitialMessage !== initialMessage) {
            setChatId(v4())
        }
    }, [initialMessage])

    let placeholder = (() => {
        if (mode === 'search') return uiOverrides.searchPlaceholder
        if (mode === 'chat') {
            return uiOverrides.askAiPlaceholder
        }
        if (mode === 'semantic') {
            return uiOverrides.semanticSearchPlaceholder
        }
        return ''
    })()
    let emptyState = (() => {
        if (mode === 'search') {
            return uiOverrides.noResultsFound
        }

        if (mode !== 'semantic') {
            return ''
        }
        if (!value) {
            return uiOverrides.semanticSearchPlaceholder
        }
        if (!semanticResults) {
            return ''
        }
        return uiOverrides.noResultsFound
    })()

    const inputButton = (() => {
        if (mode === 'chat') {
            return (
                <button onClick={onEnter} className='shrink-0 flex'>
                    {isLoadingChat ? (
                        <PauseIcon className='w-5' />
                    ) : (
                        <CornerDownLeft className='w-5' />
                    )}
                </button>
            )
        }
        if (mode === 'semantic') {
            return (
                <button
                    onClick={() => {
                        semanticSearch(input.current?.value)
                    }}
                    className='shrink-0 flex'
                >
                    {isSemanticSearching ? (
                        <Spinner className='w-5' />
                    ) : (
                        <CornerDownLeft className='w-5' />
                    )}
                </button>
            )
        }
        if (mode === 'search' && isMiniSearching) {
            return <Spinner />
        }
        return null
    })()
    const scrollContainer = useRef<HTMLDivElement>(null)

    let hideAiButtons = disableChat || mode !== 'search'
    const isSearchMode = mode === 'search' || mode === 'semantic'

    useLayoutEffect(() => {
        // setTimeout needed because i need to wait before the scroll container is rendered by React. i could also use flushSync on results
        setTimeout(() => {
            if (!scrollContainer.current) {
                return
            }
            scrollContainer.current.scrollTop = 0
        })
    }, [results, hideAiButtons])
    return (
        <promptContext.Provider value={context}>
            <Variables>
                <CommandDialog
                    className=''
                    onChange={(e: any) => {
                        setValue(e.target.value)
                    }}
                    isOpen={isOpen}
                    onOpenChange={setOpen}
                    position={position}
                >
                    <CommandInput
                        ref={input}
                        autoFocus
                        value={value}
                        endContent={inputButton}
                        isLoading={isLoading}
                        onEnter={onEnter}
                        placeholder={placeholder}
                    />
                    {mode === 'chat' && (
                        <CommandList ref={scrollContainer} key='list'>
                            {showChatIdeas ? (
                                getMessageIdeas({
                                    additionalMessages,
                                    append,
                                    currentPageText,
                                }).map((msg, i) => {
                                    return (
                                        <CommandItem
                                            key={i}
                                            onSelect={msg.onSelect}
                                            className='flex items-center gap-2'
                                        >
                                            {msg.icon}
                                            <div className=''>
                                                {msg.content}
                                            </div>
                                        </CommandItem>
                                    )
                                })
                            ) : (
                                <ChatList
                                    sources={sources}
                                    messages={messages
                                        .map(uiMessageToChatMessage)
                                        .filter((x): x is ChatMessage => {
                                            if (!x) {
                                                return false
                                            }
                                            return !additionalMessages.current.some(
                                                (add) =>
                                                    add.content === x.content,
                                            )
                                        })}
                                />
                            )}
                        </CommandList>
                    )}
                    {isSearchMode && (
                        <CommandList ref={scrollContainer} key='list'>
                            <CommandEmpty>{emptyState}</CommandEmpty>
                            {!hideAiButtons && (
                                <div
                                    onClick={() => {
                                        flushSync(() => {
                                            setMode('chat')
                                        })
                                        input.current?.focus()
                                        onEnter()
                                    }}
                                    className=''
                                >
                                    <CommandItem
                                        onSelect={() => {
                                            flushSync(() => {
                                                setMode('chat')
                                            })
                                            input.current?.focus()
                                        }}
                                    >
                                        <StarsIcon className='w-5 mr-2' />
                                        <span className='font-bold'>
                                            {uiOverrides.askAI}
                                        </span>
                                        {value && ': '}
                                        {value}
                                    </CommandItem>
                                </div>
                            )}
                            {!hideAiButtons && (
                                <div
                                    onClick={() => {
                                        flushSync(() => {
                                            setMode('semantic')
                                        })
                                        input.current?.focus()
                                        onEnter()
                                    }}
                                    className=''
                                >
                                    <CommandItem
                                        onSelect={() => {
                                            flushSync(() => {
                                                setMode('semantic')
                                            })
                                            input.current?.focus()
                                        }}
                                    >
                                        <ScanSearchIcon className='w-5 mr-2' />
                                        <span className='font-bold'>
                                            {uiOverrides.semanticSearch}
                                        </span>
                                        {value && ': '}
                                        {value}
                                    </CommandItem>
                                </div>
                            )}
                            {results?.map((node, i) => {
                                const sections = node.sections
                                const href = slugToHref(node.slug)

                                const pageNode = (
                                    <SearchResultItem
                                        key={'page' + node.slug}
                                        title={node.name || basename(node.slug)}
                                        type={node.type}
                                        terms={terms}
                                        href={href}
                                        slug={node.slug}
                                        setOpen={setOpen}
                                        text=''
                                    />
                                )
                                if (!sections?.length) return pageNode

                                return (
                                    <div
                                        className='flex flex-col'
                                        key={'sections' + node.slug}
                                    >
                                        {pageNode}
                                        <div className=''>
                                            {sections.map((node) => {
                                                const href = slugToHref(
                                                    node.slug,
                                                )

                                                return (
                                                    <SearchResultItem
                                                        setOpen={setOpen}
                                                        pl
                                                        key={
                                                            'section' +
                                                            node.slug
                                                        }
                                                        title={
                                                            node.name ||
                                                            basename(node.slug)
                                                        }
                                                        type={node.type}
                                                        terms={terms}
                                                        href={href}
                                                        slug={node.slug}
                                                        text={node.text}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                            <CommandSeparator />
                            {!hideAiButtons && <DarkModeCommands />}
                        </CommandList>
                    )}
                </CommandDialog>
            </Variables>
        </promptContext.Provider>
    )
}

const getMessageIdeas = ({ additionalMessages, currentPageText, append }) => {
    if (!currentPageText) {
        return []
    }
    const getBodyOptions = () => {
        const body: Partial<SearchEndpointBody> = {
            additionalMessages: additionalMessages.current,
        }
        return {
            options: {
                body,
            },
        }
    }
    return [
        {
            content: 'Turn the following page into a diagram',
            icon: <SendToBackIcon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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
            icon: <FileBoxIcon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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
            icon: <ChevronsUpDownIcon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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
            icon: <CheckSquare2Icon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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
            icon: <BabyIcon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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
            icon: <Layers2Icon className='w-5' />,
            onSelect() {
                additionalMessages.current = [
                    {
                        content: `This is the markdown content of the current page:\n\n\`\`\`md\n${currentPageText}\n\`\`\`\n\n`,
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

export function SearchResultItem({
    slug,
    pl = false,
    text,
    type,
    title,
    href,
    terms,
    setOpen,
}) {
    const router = useRouter()
    return (
        <Link href={href}>
            <CommandItem
                key={slug}
                id={slug}
                value={slug}
                onSelect={() => {
                    router.push(href)
                    setOpen(false)
                }}
            >
                <div className='appearance-none flex flex-col gap-1'>
                    <div className='flex gap-3 items-stretch'>
                        {pl && (
                            <div className='w-5 flex -my-3 flex-col min-h-full shrink-0 items-center'>
                                <div className='w-px border-l min-h-full grow'></div>
                            </div>
                        )}
                        <div className='mt-px shrink-0 flex h-6 items-center justify-center'>
                            {type === 'page' ? (
                                <FileTextIcon className='shrink-0 w-5 opacity-70' />
                            ) : (
                                <HashIcon className='shrink-0 w-5 opacity-70' />
                            )}
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

                            <div className='opacity-70 text-xs max-w-full'>
                                {!!text && (
                                    <SearchedText
                                        terms={terms}
                                        textToHighlight={text}
                                    />
                                )}
                            </div>
                        </div>
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
                    <mark
                        key={i}
                        className=' inline bg-[--primary-highlight]  text-[--primary-foreground]'
                    >
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

export function DarkModeCommands({}) {
    const { setOpen, uiOverrides } = usePromptContext()
    const { setTheme } = useTheme()

    const runCommand = useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])
    return (
        <CommandGroup heading='Theme'>
            <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                <SunMedium className='mr-2 w-5' />
                {uiOverrides!.lightMode}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                <Moon className='mr-2 w-5' />
                {uiOverrides!.darkMode}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                <Laptop className='mr-2 w-5' />
                {uiOverrides!.systemMode}
            </CommandItem>
        </CommandGroup>
    )
}

function Spinner({ className = '' }) {
    return (
        <>
            <style>{`
                .spinner {
                    position: relative;
                    pointer-events: none;
                }

                .spinner::after {
                    content: '';
                    position: absolute !important;
                    top: calc(50% - (1em / 2));
                    left: calc(50% - (1em / 2));
                    display: block;
                    width: 1em;
                    height: 1em;
                    border: 2px solid currentColor;
                    border-radius: 9999px;
                    border-right-color: transparent;
                    border-top-color: transparent;
                    animation: spinAround 500ms infinite linear;
                }

                @keyframes spinAround {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>

            <div className={clsx('spinner w-5 h-5', className)} />
        </>
    )
}
