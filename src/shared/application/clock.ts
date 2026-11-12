// Fonte do horário atual. Os casos de uso pedem a data por aqui em vez de
// usar `new Date()`, para que os testes controlem o tempo (ex.: expiração).
export abstract class Clock {
  abstract now(): Date;
}
