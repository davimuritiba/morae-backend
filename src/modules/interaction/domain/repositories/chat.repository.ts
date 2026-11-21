import type { Chat } from '../entities/chat.entity.js';

export abstract class ChatRepository {
  abstract findById(id: string): Promise<Chat | null>;
  abstract findByDirectKey(directKey: string): Promise<Chat | null>;
  // Salva o agregado inteiro (Chat + participantes). directKey deve ser
  // única no banco para barrar duas conversas DIRECT criadas ao mesmo tempo.
  // lastMessageAt e lastReadAt só podem avançar (GREATEST), para um save
  // concorrente não desfazer a leitura ou a mensagem de outra requisição.
  abstract save(chat: Chat): Promise<void>;
}
