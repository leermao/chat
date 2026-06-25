import ReactMarkdown from 'react-markdown';
import type { Character, Message } from '../api';
import { Avatar } from './Avatar';

export function MessageBubble({ message, character }: { message: Message; character: Character }) {
  return (
    <article className={`message-row ${message.role}`} key={message.id}>
      {message.role === 'assistant' ? <Avatar character={character} /> : null}
      <div className="message-bubble">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </article>
  );
}
