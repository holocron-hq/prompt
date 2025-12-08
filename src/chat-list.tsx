import { v4 } from 'uuid'

import { Fragment } from 'react'
import { ChatMessageComponent } from './chat-message'
import { ChatMessage, SearchDataEntry } from './types'

export interface ChatList {
    messages: ChatMessage[]
    sources: SearchDataEntry[][]
}

export function ChatList({ sources, messages }: ChatList) {
    if (!messages.length) {
        return null
    }

    const userMessageIds = messages
        .filter((message) => message.role === 'user')
        .map((m) => m.id)

    return (
        <div className='relative px-4 pb-12 py-4 flex-col-reverse gap-4 flex w-full'>
            {messages.flatMap((message, index) => {
                const res = [
                    <Fragment key={message.id}>
                        <ChatMessageComponent message={message} />
                        {index < messages.length - 1 && <hr className='' />}
                    </Fragment>,
                ]

                let sections = sources?.[userMessageIds.indexOf(message.id)] || []
                sections = sections.slice(0, 4)
                if (sections.length) {
                    const content = `<Sources sources={${JSON.stringify(
                        sections,
                    )}} />`

                    res.push(
                        <Fragment key={'assistant sources' + message.id}>
                            <ChatMessageComponent
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
