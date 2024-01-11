import { SearchDataEntry, SearchEndpointBody } from '../types'

import { Tiktoken } from 'js-tiktoken/lite'
// @ts-ignore
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'
const tokenizer = new Tiktoken(cl100k_base)

import {
    OpenAIStream,
    StreamingTextResponse,
    experimental_StreamData,
} from 'ai'
import { CreateMessage } from 'ai/'
import { oneLine, stripIndent } from 'common-tags'

import OpenAI from 'openai'

import { TurboPufferApiClientV1 } from 'turbopuffer-sdk/src'

export async function handleSearchAndChatRequest({
    env,
    json,
    model = 'gpt-3.5-turbo-1106',
    updateMessages,
}: {
    json: SearchEndpointBody
    updateMessages?: (x: {
        messages: CreateMessage[]
        sources: Partial<SearchDataEntry>[]
    }) => void
    env: {
        OPENAI_KEY: string
        TURBOPUFFER_KEY: string
    }
    model?: string
}) {
    const openai = new OpenAI({
        apiKey: env.OPENAI_KEY,
    })
    if (json.type === 'semantic-search') {
        return new Response(null, { status: 204 })
    }
    try {
        let { messages, namespace, additionalMessages = [] } = json
        const data = new experimental_StreamData()

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
            const firstMessage = messages.filter((x) => x.role === 'user')[0]
                .content

            const puffer = new TurboPufferApiClientV1<SearchDataEntry>({
                token: env.TURBOPUFFER_KEY,
            })

            const embedding = await openai.embeddings.create({
                input: [firstMessage],
                model: 'text-embedding-ada-002',
            })

            const include_attributes: Array<keyof SearchDataEntry> = [
                'slug',
                'name',
                'text',
                'type',
            ]
            const sections = await puffer.queryVectors({
                namespace,
                distance_metric: 'cosine_distance',
                include_attributes,
                vector: embedding.data[0].embedding,
            })
            console.log(`found ${sections.length} sections`)

            let tokenCount = 0

            const sources = sections.map((x) => {
                const { slug, name, text, type } = x.attributes || {}
                const source: Partial<SearchDataEntry> = {
                    slug,
                    name,
                    text,
                    type,
                }
                return source
            })
            // console.log('sources', sources)
            if (isFirstMessage) {
                data.append({
                    sources,
                } as any)
            }
            const firstPart = sources.length
                ? oneLine`Given the following sections from the
            documentation, answer the question using only that information,
            outputted in markdown format (but not inside a code snippet). `
                : ''
            messages = [
                {
                    content: oneLine`${firstPart}If you are unsure and the answer
                    is not explicitly written in the documentation, say
                    "Sorry, I don't know how to help with that." Be super short and concise.`,
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
                return acc + tokenizer.encode(x.content).length
            }, 0)
            const sourcesMaxTokens = maxInputTokens - messagesTokens - 20 // 20 for the additional wrapping text
            out: for (const [index, message] of userMessagesToWrap) {
                let contextText = ''
                for (const pageSection of sections) {
                    const content = pageSection.attributes?.text || ''
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

                message.content = stripIndent`
                Question: """
                ${message.content}
                """
                `
                if (contextText) {
                    message.content = `Context: """\n${contextText}\n"""\n${message.content}`
                }
            }
            await updateMessages?.({ messages, sources })
        }

        // console.log('messages', JSON.stringify(messages, null, 2))

        const res = await openai.chat.completions.create({
            model,
            messages: messages.filter(Boolean) as any,
            temperature: 0.5,
            stream: true,
        })
        // console.log(messages)

        const stream = OpenAIStream(res, {
            experimental_streamData: true,

            onFinal(completion) {
                data.close()
            },
        })

        return new StreamingTextResponse(stream, {}, data)
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
