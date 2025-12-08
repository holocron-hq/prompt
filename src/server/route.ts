import { SearchDataEntry, SearchEndpointBody } from '../types'

import { Tiktoken } from 'js-tiktoken/lite'
// @ts-ignore
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'
const tokenizer = new Tiktoken(cl100k_base)

import { streamText } from 'ai'
import type { CoreMessage } from 'ai'

function getTextContent(content: CoreMessage['content']): string {
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
import { oneLine, stripIndent } from 'common-tags'
import { Index } from '@upstash/vector'

import { openai as createOpenAI } from '@ai-sdk/openai'

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
    json,
    model = 'gpt-4o',
    updateMessages,
    onError = (e) => console.error(e),
}: {
    json: SearchEndpointBody
    updateMessages?: (x: {
        messages: CoreMessage[]
        sources: Partial<SearchDataEntry>[]
    }) => void

    index: Index
    openai: OpenAI
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
            const firstMessageText = getTextContent(firstUserMessage.content)
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
                return acc + tokenizer.encode(getTextContent(x.content)).length
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

                const originalContent = getTextContent(message.content)
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

        const result = streamText({
            model: createOpenAI(model) as any,
            messages,
            temperature: 0.5,
        })

        return result.toTextStreamResponse()
    } catch (e: any) {
        if (e.name === 'AbortError') {
            return new Response(null, { status: 204 })
        }
        throw e
    }
}

const modelToLimit = {
    'gpt-3.5-turbo-1106': {
        description:
            'Updated GPT 3.5 TurboNew - The latest GPT-3.5 Turbo model with improved instruction following, JSON mode, reproducible outputs, parallel function calling, and more. Returns a maximum of 4,096 output tokens.',
        contextWindow: 16385,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo': {
        description: 'Currently points to gpt-3.5-turbo-0613.',
        contextWindow: 4096,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo-16k': {
        description: 'Currently points to gpt-3.5-turbo-0613.',
        contextWindow: 16385,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo-instruct': {
        description:
            'Similar capabilities as text-davinci-003 but compatible with legacy Completions endpoint and not Chat Completions.',
        contextWindow: 4096,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo-0613': {
        description:
            'Legacy - Snapshot of gpt-3.5-turbo from June 13th 2023. Will be deprecated on June 13, 2024.',
        contextWindow: 4096,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo-16k-0613': {
        description:
            'Legacy - Snapshot of gpt-3.5-16k-turbo from June 13th 2023. Will be deprecated on June 13, 2024.',
        contextWindow: 16385,
        trainingData: 'Up to Sep 2021',
    },
    'gpt-3.5-turbo-0301': {
        description:
            'Legacy - Snapshot of gpt-3.5-turbo from March 1st 2023. Will be deprecated on June 13th 2024.',
        contextWindow: 4096,
        trainingData: 'Up to Sep 2021',
    },
}
