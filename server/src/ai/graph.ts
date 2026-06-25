import { StateGraph, StateSchema, MessagesValue, START, END } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import { createChatModel } from './openrouter.js';

const ChatState = new StateSchema({
  messages: MessagesValue,
});

const callModel: typeof ChatState.Node = async (state) => {
  const model = createChatModel();
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const graph = new StateGraph(ChatState)
  .addNode('callModel', callModel)
  .addEdge(START, 'callModel')
  .addEdge('callModel', END)
  .compile();

export async function* streamReply(messages: BaseMessage[]): AsyncGenerator<string> {
  const stream = await graph.stream({ messages }, { streamMode: 'messages' });

  for await (const [chunk] of stream) {
    if (chunk.content && typeof chunk.content === 'string') {
      yield chunk.content;
    }
  }
}
