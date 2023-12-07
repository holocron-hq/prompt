import { type Message } from 'ai'
import { v4 } from 'uuid'

import { Fragment } from 'react'
import { ChatMessage, MessageSource } from './chat-message'

export interface ChatList {
    messages: Message[]
    sources: MessageSource[][]
}

export function ChatList({ sources, messages }: ChatList) {
    if (!messages.length) {
        return null
    }

    const userMessages = messages.filter((message) => message.role === 'user')

    return (
        <div className='relative px-4 pb-12 py-4 flex-col-reverse gap-4 flex w-full'>
            {messages.flatMap((message, index) => {
                const res = [
                    <Fragment key={message.id}>
                        <ChatMessage message={message} />
                        {index < messages.length - 1 && <hr className='' />}
                    </Fragment>,
                ]

                let sections = sources?.[userMessages.indexOf(message)] || []
                sections = sections.slice(0, 4)
                if (sections.length) {
                    const content = `<Sources sources={${JSON.stringify(
                        sections,
                    )}} />`

                    res.push(
                        <Fragment key={'assistant sources' + message.id}>
                            <ChatMessage
                                message={{
                                    id: v4(),
                                    content,
                                    role: 'assistant',
                                }}
                            />
                            {index < messages.length - 1 && <hr className='' />}
                        </Fragment>,
                    )
                }

                return res
            })}
        </div>
    )
}
