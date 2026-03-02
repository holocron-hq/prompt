import { SearchDataEntry, SearchEndpointBody } from '../types'

import { Tiktoken } from 'js-tiktoken/lite'
// @ts-ignore
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'
const tokenizer = new Tiktoken(cl100k_base)

import { streamText } from 'ai'
import type { ModelMessage } from 'ai'

function getTextContent(content: ModelMessage['content']): string {
    if (typeof content === 'string') {
        return content
    }
    if (Array.isArray(content)) {
        return content
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map((p) => p.text)
            .join('\n')
    }
    return ''
}

// Handle both old {content} and new {parts} message formats from AI SDK
function getMessageText(message: any): string {
    if (message.content !== undefined) {
        return getTextContent(message.content)
    }
    // AI SDK v4+ uses parts array instead of content
    if (message.parts && Array.isArray(message.parts)) {
        return message.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('\n')
    }
    return ''
}

// Convert UI messages (with parts) to model messages (with content) for streamText
function normalizeToModelMessages(messages: any[]): ModelMessage[] {
    return messages.map((msg) => {
        // If already has content, use it
        if (msg.content !== undefined) {
            return { role: msg.role, content: msg.content } as ModelMessage
        }
        // Convert parts to content
        const text = getMessageText(msg)
        return { role: msg.role, content: text } as ModelMessage
    })
}
import { oneLine, stripIndent } from 'common-tags'
import { Index } from '@upstash/vector'

import { createOpenAI } from '@ai-sdk/openai'

import { NextResponse } from 'next/server'
import OpenAI from 'openai'

async function semanticSearch({
    query,
    namespace,
    openai,
    index,
    onError = (e) => console.error(e),
}: {
    query: string
    namespace: string
    openai: OpenAI
    index: Index
    onError?: (e: Error) => void
}) {
    const embedding = await openai.embeddings.create({
        input: [query],
        model: 'text-embedding-ada-002',
    })

    const sections = await index
        .query({
            topK: 20,
            vector: embedding.data[0].embedding,
            includeMetadata: true,
            includeVectors: false,
            includeData: false,
            filter: `namespace = '${namespace}'`,

            // namespace,
            // distance_metric: 'cosine_distance',
            // include_attributes,
            // top_k: 20,
            // vector: embedding.data[0].embedding,
        })
        .catch((e) => {
            onError(e)
            return
        })
    if (!sections) {
        return []
    }
    console.log(`found ${sections?.length} sections`)

    const sources = sections?.map((x) => {
        const { slug, text, name, type } =
            (x.metadata as any as SearchDataEntry) || {}

        const source: Partial<SearchDataEntry> = {
            slug,
            name,
            text,
            type,
        }
        return source
    })
    return sources || []
}

export async function handleSearchAndChatRequest({
    index,
    openai,
    openaiApiKey,
    json,
    model = 'gpt-5-mini',
    updateMessages,
    onError = (e) => console.error(e),
}: {
    json: SearchEndpointBody
    updateMessages?: (x: {
        messages: ModelMessage[]
        sources: Partial<SearchDataEntry>[]
    }) => void

    index: Index
    openai: OpenAI
    openaiApiKey: string
    onError?: (e: any) => void
    model?: string
}) {
    if (json.type === 'semantic-search') {
        const sources = await semanticSearch({
            index,
            openai,
            query: json.query,
            namespace: json.namespace,
            onError,
        })
        return NextResponse.json(sources)
    }

    try {
        let { messages, namespace, additionalMessages = [] } = json

        // https://platform.openai.com/docs/models/gpt-3-5
        // https://openai.com/pricing
        const maxInputTokens = modelToLimit[model]?.contextWindow - 1 || 4096

        if (additionalMessages?.length) {
            messages = [
                {
                    content: oneLine`be super short and concise`,
                    role: 'system',
                },
                ...additionalMessages,
                ...messages,
            ]
            await updateMessages?.({ messages, sources: [] })
        } else {
            const isFirstMessage = messages.length === 1
            const firstUserMessage = messages.filter((x) => x.role === 'user')[0]
            const firstMessageText = getMessageText(firstUserMessage)
            const sources = await semanticSearch({
                index,
                openai,
                query: firstMessageText,
                namespace,
                onError,
            })

            // console.log('sources', sources)
            if (isFirstMessage) {
                await updateMessages?.({ messages, sources })
            }
            const firstPart = sources?.length
                ? oneLine`Given the following sections from the
            documentation, answer the question using only that information,
            outputted in markdown format (but not inside a code snippet). `
                : ''
            messages = [
                {
                    content: oneLine`${firstPart}If you are unsure and the answer
                    is not explicitly written in the documentation, say
                    "Sorry, I didn't find enough information to help you." Be super short and concise. If the question if not in english respond in the same language.`,
                    role: 'system',
                    // id: 'system-message',
                },

                ...messages,
            ]

            const userMessagesToWrap = messages
                .filter((x) => x.role === 'user')
                .slice(0, 1)
                .entries()

            const messagesTokens = messages.reduce((acc, x) => {
                return acc + tokenizer.encode(getMessageText(x)).length
            }, 0)
            let tokenCount = 0
            const sourcesMaxTokens = maxInputTokens - messagesTokens - 20 // 20 for the additional wrapping text
            out: for (const [index, message] of userMessagesToWrap) {
                let contextText = ''
                for (const pageSection of sources) {
                    const content = pageSection?.text || ''
                    if (!content) {
                        continue
                    }
                    const encoded = tokenizer.encode(content)
                    tokenCount += encoded.length

                    if (tokenCount >= sourcesMaxTokens) {
                        break out
                    }

                    contextText += `${content.trim()}\n---\n`
                }

                const originalContent = getMessageText(message)
                message.content = stripIndent`
                Question: """
                ${originalContent}
                """
                `
                if (contextText) {
                    message.content = `Context: """\n${contextText}\n"""\n${message.content}`
                }
            }
            await updateMessages?.({ messages, sources })
        }

        // console.log('messages', JSON.stringify(messages, null, 2))

        // Create a configured OpenAI provider with the API key
        const openaiProvider = createOpenAI({
            apiKey: openaiApiKey,
        })

        // Convert mixed messages (some with content, some with parts) to model format
        const modelMessages = normalizeToModelMessages(messages)

        const result = streamText({
            model: openaiProvider(model),
            messages: modelMessages,
            temperature: 0.5,
        })

        // DefaultChatTransport on frontend expects UI Message Stream format
        return result.toUIMessageStreamResponse({
            headers: {
                'Transfer-Encoding': 'chunked',
                'Connection': 'keep-alive',
            },
        })
    } catch (e: any) {
        if (e.name === 'AbortError') {
            return new Response(null, { status: 204 })
        }
        throw e
    }
}

const modelToLimit: Record<string, { contextWindow: number }> = {
    'gpt-5-mini': {
        contextWindow: 400000,
    },
    'gpt-5': {
        contextWindow: 400000,
    },
    'gpt-5-nano': {
        contextWindow: 400000,
    },
}
