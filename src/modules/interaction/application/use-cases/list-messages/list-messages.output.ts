import type { MessageCursor } from '../../../domain/repositories/message.repository.js';
import type { MessageView } from '../../views/message.view.js';

export interface ListMessagesOutput {
  messages: MessageView[];
  nextCursor: MessageCursor | null;
}
